const logger = require('../../utils/logger');

/**
 * Trading V4 Period Optimizer
 * Dynamically optimizes indicator periods using walk-forward optimization
 */
class PeriodOptimizer {
  constructor() {
    this.optimalPeriods = {};
    this.lastOptimization = {};
  }

  /**
   * Find optimal period for an indicator
   */
  async findOptimalPeriod(ohlcvData, indicatorType, targetColumn = 'futureReturn24h', periodRange = [5, 100], step = 5) {
    try {
      const prices = ohlcvData.map(d => d.close);
      const highs = ohlcvData.map(d => d.high);
      const lows = ohlcvData.map(d => d.low);
      
      // Calculate future returns
      const futureReturns = [];
      for (let i = 0; i < prices.length - 24; i++) {
        if (i + 24 < prices.length) {
          futureReturns.push((prices[i + 24] - prices[i]) / prices[i]);
        }
      }

      let bestPeriod = periodRange[0];
      let bestScore = -Infinity;
      const scores = [];

      for (let period = periodRange[0]; period <= periodRange[1]; period += step) {
        try {
          let indicatorValues = [];
          
          switch (indicatorType) {
            case 'rsi':
              indicatorValues = this.calculateRSIForPeriod(prices, period);
              break;
            case 'sma':
              indicatorValues = this.calculateSMAForPeriod(prices, period);
              break;
            case 'ema':
              indicatorValues = this.calculateEMAForPeriod(prices, period);
              break;
            case 'atr':
              indicatorValues = this.calculateATRForPeriod(highs, lows, prices, period);
              break;
            default:
              continue;
          }

          if (indicatorValues.length === 0) continue;

          // Calculate correlation with future returns
          const minLength = Math.min(indicatorValues.length, futureReturns.length);
          if (minLength < 20) continue; // Need at least 20 data points

          const indicatorSlice = indicatorValues.slice(-minLength);
          const returnsSlice = futureReturns.slice(-minLength);

          const correlation = this.calculateCorrelation(indicatorSlice, returnsSlice);
          const score = Math.abs(correlation); // Use absolute correlation as score

          scores.push({ period, score, correlation });

          if (score > bestScore) {
            bestScore = score;
            bestPeriod = period;
          }
        } catch (error) {
          // Skip this period if calculation fails
          continue;
        }
      }

      const result = {
        period: bestPeriod,
        score: bestScore,
        scores: scores.sort((a, b) => b.score - a.score).slice(0, 5), // Top 5 periods
        lastUpdated: new Date(),
      };

      this.optimalPeriods[indicatorType] = result;
      return result;
    } catch (error) {
      logger.error(`[PeriodOptimizer] Error finding optimal period for ${indicatorType}:`, error);
      throw error;
    }
  }

  /**
   * Calculate RSI for a specific period
   */
  calculateRSIForPeriod(prices, period) {
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
      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsiValues.push(100 - (100 / (1 + rs)));
      }
    }
    return rsiValues;
  }

  /**
   * Calculate SMA for a specific period
   */
  calculateSMAForPeriod(prices, period) {
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      smaValues.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return smaValues;
  }

  /**
   * Calculate EMA for a specific period
   */
  calculateEMAForPeriod(prices, period) {
    if (prices.length < period) return [];
    
    const multiplier = 2 / (period + 1);
    const ema = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period];

    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  /**
   * Calculate ATR for a specific period
   */
  calculateATRForPeriod(highs, lows, closes, period) {
    if (highs.length < period + 1) return [];

    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    const atrValues = [];
    for (let i = period - 1; i < trueRanges.length; i++) {
      const slice = trueRanges.slice(i - period + 1, i + 1);
      atrValues.push(slice.reduce((a, b) => a + b, 0) / period);
    }

    return atrValues;
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
   * Optimize periods for multiple indicators
   */
  async optimizePeriods(ohlcvData, indicators = ['rsi', 'sma', 'ema', 'atr']) {
    try {
      logger.info('[PeriodOptimizer] Starting period optimization...');
      
      const results = {};
      
      for (const indicator of indicators) {
        try {
          const result = await this.findOptimalPeriod(ohlcvData, indicator);
          results[indicator] = result;
          logger.info(`[PeriodOptimizer] ${indicator}: optimal period = ${result.period} (score: ${result.score.toFixed(4)})`);
        } catch (error) {
          logger.error(`[PeriodOptimizer] Failed to optimize ${indicator}:`, error.message);
        }
      }

      this.lastOptimization = {
        timestamp: new Date(),
        results,
      };

      return results;
    } catch (error) {
      logger.error('[PeriodOptimizer] Optimization error:', error);
      throw error;
    }
  }

  /**
   * Get optimal period for an indicator
   */
  getOptimalPeriod(indicatorType) {
    return this.optimalPeriods[indicatorType]?.period || null;
  }

  /**
   * Get all optimal periods
   */
  getAllOptimalPeriods() {
    return this.optimalPeriods;
  }
}

module.exports = PeriodOptimizer;

