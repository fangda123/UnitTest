const logger = require('../../utils/logger');

/**
 * Trading V4 ML Model Service
 * Simplified ML model for price prediction (without gplearn dependency)
 * Uses ensemble of technical indicators with weighted scoring
 */
class MLModel {
  constructor() {
    this.models = {};
    this.featureWeights = {};
    this.isTrained = false;
  }

  /**
   * Train model using historical data
   * Simplified version that learns optimal weights for features
   */
  async train(symbol, historicalData, features) {
    try {
      logger.info(`[MLModel] Training model for ${symbol}...`);

      // Calculate feature importance based on correlation with future returns
      const featureImportance = this.calculateFeatureImportance(historicalData, features);
      
      // Store model
      this.models[symbol] = {
        featureImportance,
        trainedAt: new Date(),
        dataPoints: historicalData.length,
      };

      this.isTrained = true;
      logger.info(`[MLModel] Model trained for ${symbol} with ${historicalData.length} data points`);
      
      return this.models[symbol];
    } catch (error) {
      logger.error(`[MLModel] Training error:`, error);
      throw error;
    }
  }

  /**
   * Calculate feature importance based on correlation
   */
  calculateFeatureImportance(historicalData, features) {
    const importance = {};
    
    // Calculate correlations between features and future returns
    const prices = historicalData.map(d => d.close);
    const futureReturns1h = [];
    const futureReturns4h = [];
    const futureReturns24h = [];
    
    for (let i = 0; i < prices.length - 24; i++) {
      if (i + 1 < prices.length) {
        futureReturns1h.push((prices[i + 1] - prices[i]) / prices[i]);
      }
      if (i + 4 < prices.length) {
        futureReturns4h.push((prices[i + 4] - prices[i]) / prices[i]);
      }
      if (i + 24 < prices.length) {
        futureReturns24h.push((prices[i + 24] - prices[i]) / prices[i]);
      }
    }

    // Calculate importance for each feature
    const featureNames = Object.keys(features).filter(k => !k.startsWith('future'));
    
    for (const featureName of featureNames) {
      const featureValues = this.extractFeatureValues(historicalData, featureName);
      
      if (featureValues.length > 0) {
        const corr1h = this.calculateCorrelation(
          featureValues.slice(0, futureReturns1h.length),
          futureReturns1h
        );
        const corr4h = this.calculateCorrelation(
          featureValues.slice(0, futureReturns4h.length),
          futureReturns4h
        );
        const corr24h = this.calculateCorrelation(
          featureValues.slice(0, futureReturns24h.length),
          futureReturns24h
        );
        
        // Weighted average (more weight on shorter timeframes)
        importance[featureName] = {
          weight1h: Math.abs(corr1h) * 0.5,
          weight4h: Math.abs(corr4h) * 0.3,
          weight24h: Math.abs(corr24h) * 0.2,
          correlation1h: corr1h,
          correlation4h: corr4h,
          correlation24h: corr24h,
          totalWeight: Math.abs(corr1h) * 0.5 + Math.abs(corr4h) * 0.3 + Math.abs(corr24h) * 0.2,
        };
      }
    }

    return importance;
  }

  /**
   * Extract feature values from historical data
   */
  extractFeatureValues(historicalData, featureName) {
    // This is a simplified version - in reality, we'd recalculate features for each point
    // For now, we'll use price-based approximations
    const prices = historicalData.map(d => d.close);
    
    switch (featureName) {
      case 'rsi':
        return this.calculateRSIArray(prices, 14);
      case 'returns':
        return this.calculateReturnsArray(prices);
      case 'momentum':
        return this.calculateMomentumArray(prices, 10);
      default:
        return prices.map(() => 0);
    }
  }

  /**
   * Calculate RSI array
   */
  calculateRSIArray(prices, period) {
    const rsiValues = [];
    for (let i = period; i < prices.length; i++) {
      const slice = prices.slice(i - period, i + 1);
      const deltas = [];
      for (let j = 1; j < slice.length; j++) {
        deltas.push(slice[j] - slice[j - 1]);
      }
      
      let gains = 0, losses = 0;
      deltas.forEach(d => {
        if (d > 0) gains += d;
        else losses += Math.abs(d);
      });
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
    return rsiValues;
  }

  /**
   * Calculate returns array
   */
  calculateReturnsArray(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Calculate momentum array
   */
  calculateMomentumArray(prices, period) {
    const momentum = [];
    for (let i = period; i < prices.length; i++) {
      momentum.push((prices[i] - prices[i - period]) / prices[i - period]);
    }
    return momentum;
  }

  /**
   * Calculate correlation coefficient
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Predict future returns using trained model
   */
  async predict(symbol, currentFeatures, timeframe = '1h') {
    try {
      if (!this.models[symbol] || !this.isTrained) {
        throw new Error(`Model not trained for ${symbol}`);
      }

      const model = this.models[symbol];
      const featureImportance = model.featureImportance;
      
      let prediction = 0;
      let totalWeight = 0;
      let confidence = 0;

      // Calculate weighted prediction based on feature importance
      for (const [featureName, importance] of Object.entries(featureImportance)) {
        const featureValue = currentFeatures[featureName];
        if (featureValue === undefined || featureValue === null) continue;

        // Normalize feature value
        const normalizedValue = this.normalizeFeature(featureName, featureValue);
        
        // Get weight for timeframe
        const weight = timeframe === '1h' ? importance.weight1h :
                      timeframe === '4h' ? importance.weight4h :
                      importance.weight24h;
        
        const correlation = timeframe === '1h' ? importance.correlation1h :
                           timeframe === '4h' ? importance.correlation4h :
                           importance.correlation24h;

        // Contribution to prediction
        prediction += normalizedValue * correlation * weight;
        totalWeight += weight;
        confidence += weight;
      }

      // Normalize prediction
      if (totalWeight > 0) {
        prediction = prediction / totalWeight;
        confidence = Math.min(confidence / totalWeight, 1);
      }

      return {
        predictedReturn: prediction,
        confidence: confidence,
        timeframe: timeframe,
      };
    } catch (error) {
      logger.error(`[MLModel] Prediction error:`, error);
      throw error;
    }
  }

  /**
   * Normalize feature value to [-1, 1] range
   */
  normalizeFeature(featureName, value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    
    // Feature-specific normalization
    switch (featureName) {
      case 'rsi':
      case 'rsi_7':
      case 'rsi_21':
        return (value - 50) / 50; // RSI is 0-100, normalize to -1 to 1
      case 'returns':
      case 'logReturns':
      case 'momentum':
        return Math.tanh(value * 100); // Tanh normalization for returns
      case 'volumeRatio':
        return Math.tanh((value - 1) * 2); // Normalize around 1
      default:
        return Math.tanh(value); // Default tanh normalization
    }
  }

  /**
   * Get model info
   */
  getModelInfo(symbol) {
    return this.models[symbol] || null;
  }
}

module.exports = MLModel;

