const AlgorithmPerformance = require('../models/AlgorithmPerformance');
const logger = require('../utils/logger');

/**
 * Algorithm Performance Tracker
 * ติดตามประสิทธิภาพของแต่ละอัลกอริทึม
 */
class AlgorithmPerformanceTracker {
  constructor() {
    this.performanceCache = new Map(); // Cache สำหรับเก็บ performance ล่าสุด
  }

  /**
   * อัพเดทประสิทธิภาพของอัลกอริทึม
   * @param {String} algorithmName - ชื่ออัลกอริทึม
   * @param {String} symbol - สัญลักษณ์คู่เทรด
   * @param {Object} tradeResult - ผลลัพธ์การเทรด
   */
  async updatePerformance(algorithmName, symbol, tradeResult) {
    try {
      const { profit, profitPercentage, tradeType, price, quantity } = tradeResult;

      // หาหรือสร้าง performance record
      let performance = await AlgorithmPerformance.findOne({
        algorithmName,
        symbol,
      });

      if (!performance) {
        performance = await AlgorithmPerformance.create({
          algorithmName,
          symbol,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          winRate: 0,
          averageProfit: 0,
          averageLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          recentTrades: [],
        });
      }

      // อัพเดทสถิติ
      performance.totalTrades += 1;

      if (profit > 0) {
        performance.winningTrades += 1;
        performance.totalProfit += profit;
      } else if (profit < 0) {
        performance.losingTrades += 1;
        performance.totalLoss += Math.abs(profit);
      }

      // คำนวณสถิติใหม่
      performance.winRate = performance.totalTrades > 0
        ? (performance.winningTrades / performance.totalTrades) * 100
        : 0;

      performance.averageProfit = performance.winningTrades > 0
        ? performance.totalProfit / performance.winningTrades
        : 0;

      performance.averageLoss = performance.losingTrades > 0
        ? performance.totalLoss / performance.losingTrades
        : 0;

      performance.profitFactor = performance.totalLoss > 0
        ? performance.totalProfit / performance.totalLoss
        : performance.totalProfit > 0 ? Infinity : 0;

      // เพิ่ม trade ลงใน recentTrades (เก็บแค่ 100 รายการล่าสุด)
      performance.recentTrades.push({
        tradeType,
        profit,
        profitPercentage,
        price,
        quantity,
        timestamp: new Date(),
      });

      if (performance.recentTrades.length > 100) {
        performance.recentTrades.shift();
      }

      // คำนวณ Sharpe Ratio (ถ้ามีข้อมูลเพียงพอ)
      if (performance.recentTrades.length >= 30) {
        performance.sharpeRatio = this.calculateSharpeRatio(performance.recentTrades);
      }

      // คำนวณ Max Drawdown
      performance.maxDrawdown = this.calculateMaxDrawdown(performance.recentTrades);

      performance.lastUpdated = new Date();
      await performance.save();

      // อัพเดท cache
      this.performanceCache.set(`${algorithmName}_${symbol}`, performance);

      logger.info(`[Algorithm Performance] Updated ${algorithmName} for ${symbol}: WinRate=${performance.winRate.toFixed(2)}%, ProfitFactor=${performance.profitFactor.toFixed(2)}`);

      return performance;
    } catch (error) {
      logger.error(`[Algorithm Performance] Error updating performance:`, error);
      throw error;
    }
  }

  /**
   * ดึงประสิทธิภาพของอัลกอริทึม
   * @param {String} algorithmName - ชื่ออัลกอริทึม
   * @param {String} symbol - สัญลักษณ์คู่เทรด
   */
  async getPerformance(algorithmName, symbol) {
    try {
      const cacheKey = `${algorithmName}_${symbol}`;

      // ตรวจสอบ cache ก่อน
      if (this.performanceCache.has(cacheKey)) {
        return this.performanceCache.get(cacheKey);
      }

      // ดึงจาก database
      let performance = await AlgorithmPerformance.findOne({
        algorithmName,
        symbol,
      });

      if (!performance) {
        // สร้างใหม่ถ้ายังไม่มี
        performance = await AlgorithmPerformance.create({
          algorithmName,
          symbol,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          winRate: 0,
          averageProfit: 0,
          averageLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          recentTrades: [],
        });
      }

      // เก็บใน cache
      this.performanceCache.set(cacheKey, performance);

      return performance;
    } catch (error) {
      logger.error(`[Algorithm Performance] Error getting performance:`, error);
      throw error;
    }
  }

  /**
   * ดึงประสิทธิภาพของอัลกอริทึมทั้งหมดสำหรับ symbol
   * @param {String} symbol - สัญลักษณ์คู่เทรด
   */
  async getAllPerformances(symbol) {
    try {
      const performances = await AlgorithmPerformance.find({ symbol }).sort({ winRate: -1 });
      return performances;
    } catch (error) {
      logger.error(`[Algorithm Performance] Error getting all performances:`, error);
      throw error;
    }
  }

  /**
   * คำนวณ Sharpe Ratio
   */
  calculateSharpeRatio(trades) {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.profitPercentage || 0);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe Ratio (assuming daily returns)
    return (mean / stdDev) * Math.sqrt(365);
  }

  /**
   * คำนวณ Max Drawdown
   */
  calculateMaxDrawdown(trades) {
    if (trades.length === 0) return 0;

    let cumulativeProfit = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const trade of trades) {
      cumulativeProfit += trade.profit || 0;
      if (cumulativeProfit > peak) {
        peak = cumulativeProfit;
      }
      const drawdown = peak - cumulativeProfit;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * คำนวณ Performance Score สำหรับอัลกอริทึม
   */
  calculatePerformanceScore(performance) {
    let score = 0;

    // Win Rate (30%)
    score += (performance.winRate / 100) * 30;

    // Profit Factor (30%)
    const profitFactorScore = Math.min(performance.profitFactor / 2, 1) * 30;
    score += profitFactorScore;

    // Sharpe Ratio (20%)
    if (performance.sharpeRatio > 0) {
      score += Math.min(performance.sharpeRatio / 3, 1) * 20;
    } else {
      score += 10; // Default score
    }

    // Drawdown (20%) - ยิ่งน้อยยิ่งดี
    const drawdownScore = Math.max(0, 1 - (performance.maxDrawdown / 0.5)) * 20;
    score += drawdownScore;

    return Math.min(100, Math.max(0, score));
  }
}

module.exports = new AlgorithmPerformanceTracker();

