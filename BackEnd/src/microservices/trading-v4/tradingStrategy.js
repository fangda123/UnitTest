const logger = require('../../utils/logger');

/**
 * Trading V4 Trading Strategy Engine
 * Combines ML predictions with technical analysis for optimal trading signals
 */
class TradingStrategy {
  constructor(mlModel, riskPerTrade = 0.02) {
    this.mlModel = mlModel;
    this.riskPerTrade = riskPerTrade; // 2% risk per trade
    this.currentStrategy = null;
  }

  /**
   * Generate trading signal from features and ML predictions
   */
  async generateSignal(symbol, features, mlPredictions) {
    try {
      // Combine ML predictions with technical indicators
      const signal = this.combineSignals(features, mlPredictions);
      
      // Calculate position size using Kelly Criterion
      const positionSize = this.calculatePositionSize(signal.strength, signal.confidence);
      
      return {
        signal: signal.action, // 'buy', 'sell', 'hold'
        strength: signal.strength, // 0 to 1
        confidence: signal.confidence, // 0 to 1
        positionSize: positionSize, // Percentage of portfolio
        mlPrediction: mlPredictions,
        technicalIndicators: {
          rsi: features.rsi,
          macd: features.macd,
          bollinger: features.bollinger,
          volume: features.volumeRatio,
          momentum: features.momentum,
          marketRegime: this.determineMarketRegime(features),
        },
        reasoning: this.generateReasoning(features, mlPredictions, signal),
      };
    } catch (error) {
      logger.error('[TradingStrategy] Error generating signal:', error);
      throw error;
    }
  }

  /**
   * Combine ML predictions with technical analysis
   */
  combineSignals(features, mlPredictions) {
    let mlSignal = 0; // -1 to 1
    let mlConfidence = 0;
    let technicalSignal = 0; // -1 to 1
    let technicalConfidence = 0;

    // ML Signal (60% weight)
    if (mlPredictions && mlPredictions.predictedReturn !== undefined) {
      mlSignal = Math.tanh(mlPredictions.predictedReturn * 10); // Scale prediction
      mlConfidence = mlPredictions.confidence || 0.5;
    }

    // Technical Analysis Signal (40% weight)
    technicalSignal = this.calculateTechnicalSignal(features);
    technicalConfidence = this.calculateTechnicalConfidence(features);

    // Combine signals
    const combinedSignal = (mlSignal * 0.6 * mlConfidence) + (technicalSignal * 0.4 * technicalConfidence);
    const combinedConfidence = (mlConfidence * 0.6) + (technicalConfidence * 0.4);

    // Determine action
    let action = 'hold';
    if (combinedSignal > 0.1) {
      action = 'buy';
    } else if (combinedSignal < -0.1) {
      action = 'sell';
    }

    return {
      action,
      strength: Math.abs(combinedSignal),
      confidence: combinedConfidence,
      mlContribution: mlSignal * 0.6,
      technicalContribution: technicalSignal * 0.4,
    };
  }

  /**
   * Calculate technical analysis signal
   */
  calculateTechnicalSignal(features) {
    let signal = 0;

    // RSI signals
    if (features.rsi < 30) {
      signal += 0.3; // Oversold - bullish
    } else if (features.rsi > 70) {
      signal -= 0.3; // Overbought - bearish
    } else {
      signal += (50 - features.rsi) / 50 * 0.2; // Neutral zone
    }

    // MACD signals
    if (features.macd && features.macd.histogram) {
      if (features.macd.histogram > 0) {
        signal += 0.2; // Bullish
      } else {
        signal -= 0.2; // Bearish
      }
    }

    // Bollinger Bands
    if (features.bollinger && features.bollinger.width) {
      const pricePosition = (features.bollinger.upper - features.bollinger.lower) > 0 ?
        (features.bollinger.middle - features.bollinger.lower) / (features.bollinger.upper - features.bollinger.lower) : 0.5;
      
      if (pricePosition < 0.2) {
        signal += 0.2; // Near lower band - buy
      } else if (pricePosition > 0.8) {
        signal -= 0.2; // Near upper band - sell
      }
    }

    // Volume confirmation
    if (features.volumeRatio > 1.5) {
      signal *= 1.2; // High volume confirms signal
    } else if (features.volumeRatio < 0.5) {
      signal *= 0.8; // Low volume weakens signal
    }

    // Momentum
    if (features.momentum > 0.02) {
      signal += 0.1; // Positive momentum
    } else if (features.momentum < -0.02) {
      signal -= 0.1; // Negative momentum
    }

    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, signal));
  }

  /**
   * Calculate technical analysis confidence
   */
  calculateTechnicalConfidence(features) {
    let confidence = 0.5; // Base confidence

    // Higher confidence when multiple indicators agree
    const indicators = [];
    
    if (features.rsi < 30 || features.rsi > 70) indicators.push(1);
    if (features.macd && Math.abs(features.macd.histogram) > 0.001) indicators.push(1);
    if (features.bollinger && features.bollinger.width > 0.01) indicators.push(1);
    if (features.volumeRatio > 1.2 || features.volumeRatio < 0.8) indicators.push(1);
    if (Math.abs(features.momentum) > 0.01) indicators.push(1);

    confidence = 0.3 + (indicators.length / 5) * 0.5; // 0.3 to 0.8

    return Math.min(0.95, confidence);
  }

  /**
   * Determine market regime
   */
  determineMarketRegime(features) {
    if (!features.sma_20 || !features.sma_50) return 'neutral';

    const price = features.sma_20; // Approximate current price
    const sma20 = features.sma_20;
    const sma50 = features.sma_50;

    if (sma20 > sma50 * 1.02) {
      return 'bull';
    } else if (sma20 < sma50 * 0.98) {
      return 'bear';
    } else {
      return 'neutral';
    }
  }

  /**
   * Calculate position size using Kelly Criterion (simplified)
   */
  calculatePositionSize(signalStrength, confidence) {
    // Kelly fraction = (bp - q) / b
    // Where: b = odds, p = win probability, q = loss probability
    // Simplified: use signal strength and confidence
    
    const winProbability = 0.5 + (signalStrength * confidence * 0.3); // 0.5 to 0.8
    const lossProbability = 1 - winProbability;
    const avgWin = 0.05; // 5% average win
    const avgLoss = 0.02; // 2% average loss
    const odds = avgWin / avgLoss; // 2.5

    const kellyFraction = (odds * winProbability - lossProbability) / odds;
    
    // Apply risk management: cap at riskPerTrade and apply confidence
    const positionSize = Math.max(0, Math.min(
      kellyFraction * confidence * this.riskPerTrade * 10, // Scale up for trading
      this.riskPerTrade * 5 // Max 10% per trade
    ));

    return positionSize;
  }

  /**
   * Generate reasoning for the signal
   */
  generateReasoning(features, mlPredictions, signal) {
    const reasons = [];

    if (mlPredictions && mlPredictions.predictedReturn > 0.01) {
      reasons.push(`ML predicts ${(mlPredictions.predictedReturn * 100).toFixed(2)}% gain with ${(mlPredictions.confidence * 100).toFixed(0)}% confidence`);
    } else if (mlPredictions && mlPredictions.predictedReturn < -0.01) {
      reasons.push(`ML predicts ${(mlPredictions.predictedReturn * 100).toFixed(2)}% loss with ${(mlPredictions.confidence * 100).toFixed(0)}% confidence`);
    }

    if (features.rsi < 30) {
      reasons.push('RSI indicates oversold condition');
    } else if (features.rsi > 70) {
      reasons.push('RSI indicates overbought condition');
    }

    if (features.macd && features.macd.histogram > 0) {
      reasons.push('MACD shows bullish momentum');
    } else if (features.macd && features.macd.histogram < 0) {
      reasons.push('MACD shows bearish momentum');
    }

    if (features.volumeRatio > 1.5) {
      reasons.push('High volume confirms trend');
    }

    if (reasons.length === 0) {
      reasons.push('Mixed signals - holding position');
    }

    return reasons;
  }
}

module.exports = TradingStrategy;

