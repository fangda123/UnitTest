const logger = require('../../utils/logger');

/**
 * Trading V4 Feature Engineering Service
 * Comprehensive technical indicators calculation for ML models
 */
class FeatureEngine {
  constructor() {
    this.featureCache = new Map();
  }

  /**
   * Calculate all technical indicators
   */
  calculateAllIndicators(ohlcvData) {
    if (!ohlcvData || ohlcvData.length < 50) {
      throw new Error('Insufficient data for feature calculation');
    }

    const prices = ohlcvData.map(d => d.close);
    const highs = ohlcvData.map(d => d.high);
    const lows = ohlcvData.map(d => d.low);
    const volumes = ohlcvData.map(d => d.volume);

    const features = {
      // Price-based features
      returns: this.calculateReturns(prices),
      logReturns: this.calculateLogReturns(prices),
      priceVolatility: this.calculateVolatility(prices, 24),
      
      // Momentum indicators
      rsi: this.calculateRSI(prices, 14),
      rsi_7: this.calculateRSI(prices, 7),
      rsi_21: this.calculateRSI(prices, 21),
      
      // Trend indicators
      macd: this.calculateMACD(prices),
      sma_20: this.calculateSMA(prices, 20),
      sma_50: this.calculateSMA(prices, 50),
      sma_100: this.calculateSMA(prices, 100),
      ema_12: this.calculateEMA(prices, 12),
      ema_26: this.calculateEMA(prices, 26),
      
      // Volatility indicators
      bollinger: this.calculateBollingerBands(prices, 20, 2),
      atr: this.calculateATR(highs, lows, prices, 14),
      
      // Volume indicators
      volumeSMA: this.calculateSMA(volumes, 20),
      volumeRatio: volumes[volumes.length - 1] / (this.calculateSMA(volumes, 20) || 1),
      
      // Price patterns
      smaCross: this.detectSMACross(prices, 20, 50),
      pricePosition: this.calculatePricePosition(prices, highs, lows),
      
      // Additional features
      momentum: this.calculateMomentum(prices, 10),
      stochastic: this.calculateStochastic(highs, lows, prices, 14),
      williamsR: this.calculateWilliamsR(highs, lows, prices, 14),
    };

    return features;
  }

  /**
   * Calculate returns
   */
  calculateReturns(prices) {
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];
  }

  /**
   * Calculate log returns
   */
  calculateLogReturns(prices) {
    if (prices.length < 2) return 0;
    return Math.log(prices[prices.length - 1] / prices[prices.length - 2]);
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(prices, period) {
    if (prices.length < period + 1) return 0;
    
    const returns = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      if (i > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate RSI
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    const deltas = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }

    let gains = 0;
    let losses = 0;

    for (let i = deltas.length - period; i < deltas.length; i++) {
      if (deltas[i] > 0) {
        gains += deltas[i];
      } else {
        losses += Math.abs(deltas[i]);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);

    const macdLine = [];
    const minLength = Math.min(emaFast.length, emaSlow.length);
    for (let i = 0; i < minLength; i++) {
      macdLine.push(emaFast[emaFast.length - minLength + i] - emaSlow[emaSlow.length - minLength + i]);
    }

    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const macd = macdLine[macdLine.length - 1] || 0;
    const signal = signalLine[signalLine.length - 1] || 0;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate EMA
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return [];

    const multiplier = 2 / (period + 1);
    const ema = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period];

    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  /**
   * Calculate SMA
   */
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return { upper: null, middle: null, lower: null, width: null };
    }

    const slice = prices.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    const upper = sma + (std * stdDev);
    const lower = sma - (std * stdDev);
    const width = (upper - lower) / sma;

    return { upper, middle: sma, lower, width };
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return 0;

    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    const slice = trueRanges.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Detect SMA Cross
   */
  detectSMACross(prices, fastPeriod, slowPeriod) {
    if (prices.length < slowPeriod + 1) return 0;
    
    const fastSMA = this.calculateSMA(prices, fastPeriod);
    const slowSMA = this.calculateSMA(prices, slowPeriod);
    
    if (!fastSMA || !slowSMA) return 0;
    
    // Previous values
    const prevFastSMA = this.calculateSMA(prices.slice(0, -1), fastPeriod);
    const prevSlowSMA = this.calculateSMA(prices.slice(0, -1), slowPeriod);
    
    if (!prevFastSMA || !prevSlowSMA) return 0;
    
    // Bullish cross
    if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) return 1;
    // Bearish cross
    if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) return -1;
    
    return 0;
  }

  /**
   * Calculate price position within recent range
   */
  calculatePricePosition(prices, highs, lows, period = 20) {
    if (prices.length < period) return 0.5;
    
    const recentHigh = Math.max(...highs.slice(-period));
    const recentLow = Math.min(...lows.slice(-period));
    const currentPrice = prices[prices.length - 1];
    
    if (recentHigh === recentLow) return 0.5;
    
    return (currentPrice - recentLow) / (recentHigh - recentLow);
  }

  /**
   * Calculate momentum
   */
  calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) return 0;
    return (prices[prices.length - 1] - prices[prices.length - 1 - period]) / prices[prices.length - 1 - period];
  }

  /**
   * Calculate Stochastic Oscillator
   */
  calculateStochastic(highs, lows, closes, period = 14) {
    if (highs.length < period) return 50;
    
    const recentHigh = Math.max(...highs.slice(-period));
    const recentLow = Math.min(...lows.slice(-period));
    const currentClose = closes[closes.length - 1];
    
    if (recentHigh === recentLow) return 50;
    
    return ((currentClose - recentLow) / (recentHigh - recentLow)) * 100;
  }

  /**
   * Calculate Williams %R
   */
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period) return -50;
    
    const recentHigh = Math.max(...highs.slice(-period));
    const recentLow = Math.min(...lows.slice(-period));
    const currentClose = closes[closes.length - 1];
    
    if (recentHigh === recentLow) return -50;
    
    return ((recentHigh - currentClose) / (recentHigh - recentLow)) * -100;
  }

  /**
   * Get features for ML model
   */
  async getFeatures(symbol, ohlcvData) {
    try {
      const features = this.calculateAllIndicators(ohlcvData);
      
      // Add future returns as target variables
      const prices = ohlcvData.map(d => d.close);
      features.futureReturn1h = prices.length >= 2 ? (prices[prices.length - 1] / prices[prices.length - 2] - 1) : 0;
      features.futureReturn4h = prices.length >= 5 ? (prices[prices.length - 1] / prices[prices.length - 5] - 1) : 0;
      features.futureReturn24h = prices.length >= 25 ? (prices[prices.length - 1] / prices[prices.length - 25] - 1) : 0;
      
      return features;
    } catch (error) {
      logger.error(`[FeatureEngine] Error calculating features:`, error);
      throw error;
    }
  }
}

module.exports = FeatureEngine;

