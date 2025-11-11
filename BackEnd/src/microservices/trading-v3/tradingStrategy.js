const logger = require('../../utils/logger');

/**
 * Trading V3 Trading Strategy Service
 * Implements trading strategies based on ML predictions
 */
class TradingStrategyService {
  constructor() {
    this.strategies = new Map();
    this.riskPerTrade = 0.02; // 2% risk per trade
  }

  /**
   * Generate trading signal based on ML prediction and features
   */
  generateSignal(features, mlPrediction) {
    if (!features || !mlPrediction) {
      return {
        signal: 'hold',
        strength: 0,
        confidence: 0,
        indicators: {
          rsi: 50,
          macd: 0,
          bollinger: 0.5,
          volume: 1,
          marketRegime: 'neutral',
        },
      };
    }

    // Calculate signal strength based on prediction and confidence
    let signal = 'hold';
    let strength = 0;

    if (mlPrediction.signal === 'buy' && mlPrediction.confidence > 0.5) {
      signal = 'buy';
      strength = Math.min(1, mlPrediction.confidence * mlPrediction.prediction);
    } else if (mlPrediction.signal === 'sell' && mlPrediction.confidence > 0.5) {
      signal = 'sell';
      strength = Math.min(1, mlPrediction.confidence * Math.abs(mlPrediction.prediction));
    }

    // Adjust strength based on market regime
    if (features.marketRegime === 'bull' && signal === 'buy') {
      strength = Math.min(1, strength * 1.2);
    } else if (features.marketRegime === 'bear' && signal === 'sell') {
      strength = Math.min(1, strength * 1.2);
    }

    return {
      signal: signal,
      strength: Math.max(0, Math.min(1, strength)),
      confidence: mlPrediction.confidence,
      indicators: {
        rsi: features.rsi ?? 50,
        macd: features.macd ?? 0,
        bollinger: features.bollingerPosition ?? 0.5,
        volume: features.volumeRatio ?? 1,
        marketRegime: features.marketRegime ?? 'neutral',
      },
      mlPrediction: {
        predictedPrice: features.currentPrice * (1 + mlPrediction.predictedReturn / 100),
        confidence: mlPrediction.confidence,
        predictedProfit: 0, // Will be calculated separately
        predictedProfitPercent: mlPrediction.predictedReturn,
        riskLevel: this.getRiskLevel(features, mlPrediction),
        recommendedAction: mlPrediction.signal,
        timeframe: '1d',
        features: {
          rsi: features.rsi,
          macd: features.macd,
          bollinger: features.bollingerPosition,
          volume: features.volumeRatio,
          momentum: features.momentum,
        },
      },
    };
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculatePositionSize(portfolioValue, signalStrength, riskPerTrade = null) {
    const risk = riskPerTrade || this.riskPerTrade;
    const kellyFraction = Math.abs(signalStrength) * risk;
    return portfolioValue * kellyFraction * Math.sign(signalStrength);
  }

  /**
   * Get risk level
   */
  getRiskLevel(features, prediction) {
    if (!features || !prediction) {
      return 'medium';
    }

    const volatility = features.bollingerWidth || 0;
    const confidence = prediction.confidence || 0;

    if (volatility > 0.1 || confidence < 0.4) {
      return 'high';
    } else if (volatility < 0.05 && confidence > 0.7) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  /**
   * Calculate stop loss and take profit levels
   */
  calculateStopLossTakeProfit(currentPrice, signal, features) {
    const volatility = features.bollingerWidth || 0.02;
    
    let stopLoss = 0;
    let takeProfit = 0;

    if (signal === 'buy') {
      stopLoss = currentPrice * (1 - volatility * 2); // 2x volatility
      takeProfit = currentPrice * (1 + volatility * 3); // 3x volatility
    } else if (signal === 'sell') {
      stopLoss = currentPrice * (1 + volatility * 2);
      takeProfit = currentPrice * (1 - volatility * 3);
    }

    return {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
    };
  }
}

module.exports = TradingStrategyService;

