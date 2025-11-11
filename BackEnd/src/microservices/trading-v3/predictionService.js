const logger = require('../../utils/logger');
const FeatureEngine = require('./featureEngine');
const MLModelService = require('./mlModel');
const TradingData = require('../../models/TradingData');
const { getCache } = require('../../config/redis');

/**
 * Trading V3 Prediction Service
 * Main service that combines all components for profit prediction
 */
class PredictionService {
  constructor() {
    this.featureEngine = new FeatureEngine();
    this.mlModel = new MLModelService();
  }

  /**
   * Get latest OHLCV data for a symbol
   */
  async getLatestData(symbol, limit = 200) {
    try {
      // Try OHLCV cache first (most accurate)
      const ohlcvCached = await getCache(`trading-v3:ohlcv:${symbol}`);
      if (ohlcvCached) {
        const data = JSON.parse(ohlcvCached);
        if (data && data.length > 0) {
          return data.slice(-limit); // Return last N items
        }
      }

      // Try historical cache
      const cached = await getCache(`trading-v3:historical:${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (data && data.length > 0) {
          return data.slice(-limit);
        }
      }

      // Fetch from database and convert to OHLCV format
      const data = await TradingData.find({ symbol: symbol })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Convert to OHLCV format
      // TradingData model uses price field, so we'll use price for all OHLC
      return data.map((d) => ({
        timestamp: d.timestamp ? new Date(d.timestamp).getTime() : Date.now(),
        open: d.price || 0,
        high: d.statistics?.high24h || d.price || 0,
        low: d.statistics?.low24h || d.price || 0,
        close: d.price || 0,
        volume: d.indicators?.volume24h || 0,
      })).reverse(); // Reverse to chronological order
    } catch (error) {
      logger.error(`[PredictionService] Error getting latest data for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Predict profit for different timeframes
   */
  async predictProfit(symbol, investment, timeframe = '1d') {
    try {
      // Get latest data
      const ohlcvData = await this.getLatestData(symbol, 200);
      
      if (ohlcvData.length < 50) {
        throw new Error('Insufficient data for prediction');
      }

      // Calculate features
      const features = await this.featureEngine.getFeatures(symbol, ohlcvData);
      
      if (!features) {
        throw new Error('Failed to calculate features');
      }

      // Get ML prediction
      const mlPrediction = this.mlModel.predict(features);

      // Predict profit for different timeframes
      const oneDay = this.mlModel.predictProfit(features, investment, '1d');
      const oneWeek = this.mlModel.predictProfit(features, investment, '1w');
      const oneMonth = this.mlModel.predictProfit(features, investment, '1M');

      return {
        oneDay: {
          predictedProfit: oneDay.predictedProfit,
          predictedProfitPercent: oneDay.predictedProfitPercent,
          confidence: oneDay.confidence,
          minProfit: oneDay.minProfit,
          maxProfit: oneDay.maxProfit,
        },
        oneWeek: {
          predictedProfit: oneWeek.predictedProfit,
          predictedProfitPercent: oneWeek.predictedProfitPercent,
          confidence: oneWeek.confidence,
        },
        oneMonth: {
          predictedProfit: oneMonth.predictedProfit,
          predictedProfitPercent: oneMonth.predictedProfitPercent,
          confidence: oneMonth.confidence,
        },
        features: features,
        mlPrediction: mlPrediction,
      };
    } catch (error) {
      logger.error(`[PredictionService] Error predicting profit:`, error.message);
      throw error;
    }
  }

  /**
   * Get trading signal with ML prediction
   */
  async getTradingSignal(symbol) {
    try {
      const TradingStrategyService = require('./tradingStrategy');
      const strategyService = new TradingStrategyService();

      // Get latest data
      const ohlcvData = await this.getLatestData(symbol, 200);
      
      if (ohlcvData.length < 50) {
        throw new Error('Insufficient data for signal');
      }

      // Calculate features
      const features = await this.featureEngine.getFeatures(symbol, ohlcvData);
      
      if (!features) {
        throw new Error('Failed to calculate features');
      }

      // Get ML prediction
      const mlPrediction = this.mlModel.predict(features);

      // Generate trading signal
      const signal = strategyService.generateSignal(features, mlPrediction);

      return signal;
    } catch (error) {
      logger.error(`[PredictionService] Error getting trading signal:`, error.message);
      throw error;
    }
  }
}

module.exports = PredictionService;

