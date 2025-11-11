const logger = require('../../utils/logger');
const FeatureEngine = require('./featureEngine');
const MLModel = require('./mlModel');
const TradingStrategy = require('./tradingStrategy');
const PeriodOptimizer = require('./periodOptimizer');
const { getCache } = require('../../config/redis');

/**
 * Trading V4 Prediction Service
 * Main service that orchestrates all components for predictions and trading signals
 */
class PredictionService {
  constructor() {
    this.featureEngine = new FeatureEngine();
    this.mlModel = new MLModel();
    this.periodOptimizer = new PeriodOptimizer();
    this.tradingStrategy = new TradingStrategy(this.mlModel);
    this.isInitialized = false;
  }

  /**
   * Initialize service with historical data
   */
  async initialize(symbol) {
    try {
      logger.info(`[PredictionService] Initializing for ${symbol}...`);

      // Get historical data
      const historicalData = await this.getLatestData(symbol, 1000);
      
      if (historicalData.length < 100) {
        throw new Error('Insufficient historical data');
      }

      // Calculate features
      const features = await this.featureEngine.getFeatures(symbol, historicalData);

      // Train ML model
      await this.mlModel.train(symbol, historicalData, features);

      // Optimize periods (async, don't wait)
      this.periodOptimizer.optimizePeriods(historicalData).catch(err => {
        logger.error('[PredictionService] Period optimization error:', err);
      });

      this.isInitialized = true;
      logger.info(`[PredictionService] Initialized for ${symbol}`);
    } catch (error) {
      logger.error('[PredictionService] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Get latest OHLCV data
   */
  async getLatestData(symbol, limit = 1000) {
    try {
      const cached = await getCache(`trading-v4:historical:${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        return data.slice(-limit);
      }
      return [];
    } catch (error) {
      logger.error(`[PredictionService] Error getting data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get trading signal with ML prediction
   */
  async getTradingSignal(symbol) {
    try {
      // Ensure initialized
      if (!this.isInitialized) {
        await this.initialize(symbol);
      }

      // Get latest data
      const historicalData = await this.getLatestData(symbol, 200);
      if (historicalData.length < 50) {
        throw new Error('Insufficient data for signal generation');
      }

      // Calculate features
      const features = await this.featureEngine.getFeatures(symbol, historicalData);

      // Get ML predictions for different timeframes
      const mlPrediction1h = await this.mlModel.predict(symbol, features, '1h');
      const mlPrediction4h = await this.mlModel.predict(symbol, features, '4h');
      const mlPrediction24h = await this.mlModel.predict(symbol, features, '24h');

      // Generate trading signal
      const signal = await this.tradingStrategy.generateSignal(
        symbol,
        features,
        mlPrediction1h
      );

      return {
        ...signal,
        mlPrediction: {
          predictedPrice: historicalData[historicalData.length - 1].close * (1 + mlPrediction1h.predictedReturn),
          confidence: mlPrediction1h.confidence,
          predictedProfit: mlPrediction1h.predictedReturn,
          predictedProfitPercent: mlPrediction1h.predictedReturn * 100,
          riskLevel: this.determineRiskLevel(mlPrediction1h.confidence, features),
          recommendedAction: signal.signal,
          timeframe: '1h',
          features: {
            rsi: features.rsi,
            macd: features.macd?.macd || 0,
            bollinger: features.bollinger?.width || 0,
            volume: features.volumeRatio,
            momentum: features.momentum,
          },
          predictions: {
            '1h': mlPrediction1h,
            '4h': mlPrediction4h,
            '24h': mlPrediction24h,
          },
        },
      };
    } catch (error) {
      logger.error('[PredictionService] Error getting trading signal:', error);
      throw error;
    }
  }

  /**
   * Predict profit for different timeframes
   */
  async predictProfit(symbol, investment, timeframe = '1d') {
    try {
      // Ensure initialized
      if (!this.isInitialized) {
        await this.initialize(symbol);
      }

      // Get latest data
      const historicalData = await this.getLatestData(symbol, 200);
      if (historicalData.length < 50) {
        throw new Error('Insufficient data for profit prediction');
      }

      // Calculate features
      const features = await this.featureEngine.getFeatures(symbol, historicalData);

      // Get ML predictions
      const mlPrediction1h = await this.mlModel.predict(symbol, features, '1h');
      const mlPrediction4h = await this.mlModel.predict(symbol, features, '4h');
      const mlPrediction24h = await this.mlModel.predict(symbol, features, '24h');

      // Calculate profit predictions
      const oneDayProfit = this.calculateProfitPrediction(
        investment,
        mlPrediction24h,
        features,
        '1d'
      );

      const oneWeekProfit = this.calculateProfitPrediction(
        investment,
        mlPrediction24h,
        features,
        '7d',
        7
      );

      const oneMonthProfit = this.calculateProfitPrediction(
        investment,
        mlPrediction24h,
        features,
        '30d',
        30
      );

      return {
        oneDay: oneDayProfit,
        oneWeek: oneWeekProfit,
        oneMonth: oneMonthProfit,
        currentPrice: historicalData[historicalData.length - 1].close,
        predictions: {
          '1h': mlPrediction1h,
          '4h': mlPrediction4h,
          '24h': mlPrediction24h,
        },
      };
    } catch (error) {
      logger.error('[PredictionService] Error predicting profit:', error);
      throw error;
    }
  }

  /**
   * Calculate profit prediction for a timeframe
   */
  calculateProfitPrediction(investment, mlPrediction, features, timeframe, multiplier = 1) {
    // Base prediction from ML
    const baseReturn = mlPrediction.predictedReturn * multiplier;
    const confidence = mlPrediction.confidence;

    // Adjust based on market conditions
    let adjustedReturn = baseReturn;
    
    // Volatility adjustment
    if (features.priceVolatility) {
      const volatilityFactor = Math.min(features.priceVolatility * 10, 2);
      adjustedReturn = baseReturn * (1 - volatilityFactor * 0.1);
    }

    // Calculate predicted profit
    const predictedProfit = investment * adjustedReturn;
    const predictedProfitPercent = adjustedReturn * 100;

    // Calculate confidence intervals (min/max)
    const uncertainty = (1 - confidence) * 0.5;
    const minProfit = investment * (adjustedReturn - uncertainty);
    const maxProfit = investment * (adjustedReturn + uncertainty);

    return {
      predictedProfit,
      predictedProfitPercent,
      confidence,
      minProfit,
      maxProfit,
      timeframe,
    };
  }

  /**
   * Determine risk level
   */
  determineRiskLevel(confidence, features) {
    let riskScore = 0;

    // Lower confidence = higher risk
    riskScore += (1 - confidence) * 0.5;

    // High volatility = higher risk
    if (features.priceVolatility > 0.05) {
      riskScore += 0.3;
    }

    // Extreme RSI = higher risk
    if (features.rsi < 20 || features.rsi > 80) {
      riskScore += 0.2;
    }

    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.6) return 'medium';
    return 'high';
  }

  /**
   * Retrain model with latest data
   */
  async retrain(symbol) {
    try {
      logger.info(`[PredictionService] Retraining model for ${symbol}...`);
      
      const historicalData = await this.getLatestData(symbol, 1000);
      if (historicalData.length < 100) {
        throw new Error('Insufficient data for retraining');
      }

      const features = await this.featureEngine.getFeatures(symbol, historicalData);
      await this.mlModel.train(symbol, historicalData, features);

      logger.info(`[PredictionService] Model retrained for ${symbol}`);
    } catch (error) {
      logger.error('[PredictionService] Retraining error:', error);
      throw error;
    }
  }
}

module.exports = PredictionService;

