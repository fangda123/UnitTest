const logger = require('../../utils/logger');

/**
 * Trading V3 Feature Engineering Service
 * Calculates technical indicators and features for ML models
 */
class FeatureEngine {
  constructor() {
    this.featureCache = new Map();
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return null;
    }

    const deltas = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < period; i++) {
      if (deltas[i] > 0) {
        gains += deltas[i];
      } else {
        losses += Math.abs(deltas[i]);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    const rsiValues = [100 - (100 / (1 + avgGain / avgLoss))];

    for (let i = period; i < deltas.length; i++) {
      const delta = deltas[i];
      const gain = delta > 0 ? delta : 0;
      const loss = delta < 0 ? Math.abs(delta) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }

    return rsiValues[rsiValues.length - 1];
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) {
      return { macd: null, signal: null, histogram: null };
    }

    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);

    const macdLine = [];
    for (let i = 0; i < emaFast.length; i++) {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }

    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];

    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram,
    };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return [];
    }

    const multiplier = 2 / (period + 1);
    const ema = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period];

    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return { upper: null, middle: null, lower: null, width: null };
    }

    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    const upper = sma + (standardDeviation * stdDev);
    const lower = sma - (standardDeviation * stdDev);
    const width = (upper - lower) / sma;

    return {
      upper: upper,
      middle: sma,
      lower: lower,
      width: width,
    };
  }

  /**
   * Calculate volume indicators
   */
  calculateVolumeIndicators(volumes, period = 20) {
    if (volumes.length < period) {
      return { volumeSMA: null, volumeRatio: null };
    }

    const volumeSMA = this.calculateSMA(volumes, period);
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = volumeSMA > 0 ? currentVolume / volumeSMA : 1;

    return {
      volumeSMA: volumeSMA,
      volumeRatio: volumeRatio,
    };
  }

  /**
   * Calculate momentum
   */
  calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) {
      return null;
    }

    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  /**
   * Calculate all features for ML model
   */
  calculateAllFeatures(ohlcvData) {
    if (!ohlcvData || ohlcvData.length < 50) {
      return null;
    }

    const closes = ohlcvData.map((d) => d.close);
    const highs = ohlcvData.map((d) => d.high);
    const lows = ohlcvData.map((d) => d.low);
    const volumes = ohlcvData.map((d) => d.volume);

    // Price-based features
    const returns = closes.length > 1 ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
    const logReturns = closes.length > 1 ? Math.log(closes[closes.length - 1] / closes[closes.length - 2]) : 0;

    // Momentum indicators
    const rsi = this.calculateRSI(closes, 14);
    const rsi7 = this.calculateRSI(closes, 7);
    const rsi21 = this.calculateRSI(closes, 21);

    // Trend indicators
    const macd = this.calculateMACD(closes);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const smaCross = sma20 && sma50 ? (sma20 > sma50 ? 1 : -1) : 0;

    // Volatility indicators
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const bbPosition = bb.middle ? ((closes[closes.length - 1] - bb.lower) / (bb.upper - bb.lower)) : 0.5;

    // Volume indicators
    const volumeIndicators = this.calculateVolumeIndicators(volumes, 20);

    // Momentum
    const momentum = this.calculateMomentum(closes, 10);

    // Market regime (simplified)
    let marketRegime = 'neutral';
    if (sma20 && sma50) {
      if (sma20 > sma50 && rsi && rsi > 50) {
        marketRegime = 'bull';
      } else if (sma20 < sma50 && rsi && rsi < 50) {
        marketRegime = 'bear';
      }
    }

    return {
      // Price features
      returns: returns,
      logReturns: logReturns,
      currentPrice: closes[closes.length - 1],

      // Momentum
      rsi: rsi || 50,
      rsi7: rsi7 || 50,
      rsi21: rsi21 || 50,

      // Trend
      macd: macd.macd || 0,
      macdSignal: macd.signal || 0,
      macdHistogram: macd.histogram || 0,
      sma20: sma20 || closes[closes.length - 1],
      sma50: sma50 || closes[closes.length - 1],
      smaCross: smaCross,

      // Volatility
      bollingerUpper: bb.upper || closes[closes.length - 1],
      bollingerLower: bb.lower || closes[closes.length - 1],
      bollingerMiddle: bb.middle || closes[closes.length - 1],
      bollingerWidth: bb.width || 0,
      bollingerPosition: bbPosition,

      // Volume
      volume: volumes[volumes.length - 1],
      volumeSMA: volumeIndicators.volumeSMA || volumes[volumes.length - 1],
      volumeRatio: volumeIndicators.volumeRatio || 1,

      // Momentum
      momentum: momentum || 0,

      // Market regime
      marketRegime: marketRegime,

      // Additional features
      highLowRatio: highs.length > 0 && lows.length > 0 ? (highs[highs.length - 1] / lows[lows.length - 1]) : 1,
      priceRange: highs.length > 0 && lows.length > 0 ? (highs[highs.length - 1] - lows[lows.length - 1]) : 0,
    };
  }

  /**
   * Get cached features or calculate new ones
   */
  async getFeatures(symbol, ohlcvData) {
    const cacheKey = `trading-v3:features:${symbol}`;
    
    // For now, always calculate fresh (can add caching later)
    const features = this.calculateAllFeatures(ohlcvData);
    
    if (features) {
      this.featureCache.set(cacheKey, {
        features: features,
        timestamp: Date.now(),
      });
    }

    return features;
  }
}

module.exports = FeatureEngine;

