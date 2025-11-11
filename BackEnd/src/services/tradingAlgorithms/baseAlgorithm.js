/**
 * Base Algorithm Class
 * Base class สำหรับอัลกอริทึมการเทรดทั้งหมด
 */
class BaseAlgorithm {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.performance = {
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
      lastUpdated: null,
    };
  }

  /**
   * คำนวณสัญญาณการเทรด
   * @param {Array} priceHistory - ประวัติราคา
   * @param {Object} indicators - ตัวชี้วัดทางเทคนิค
   * @param {Object} marketData - ข้อมูลตลาด
   * @returns {Object} { signal: 'buy'|'sell'|'hold', confidence: 0-100, reasons: [] }
   */
  calculateSignal(priceHistory, indicators, marketData) {
    throw new Error('calculateSignal must be implemented by subclass');
  }

  /**
   * อัพเดทประสิทธิภาพของอัลกอริทึม
   * @param {Object} tradeResult - ผลลัพธ์การเทรด
   */
  updatePerformance(tradeResult) {
    this.performance.totalTrades += 1;
    
    if (tradeResult.profit > 0) {
      this.performance.winningTrades += 1;
      this.performance.totalProfit += tradeResult.profit;
    } else if (tradeResult.profit < 0) {
      this.performance.losingTrades += 1;
      this.performance.totalLoss += Math.abs(tradeResult.profit);
    }

    // คำนวณสถิติ
    this.performance.winRate = this.performance.totalTrades > 0
      ? (this.performance.winningTrades / this.performance.totalTrades) * 100
      : 0;

    this.performance.averageProfit = this.performance.winningTrades > 0
      ? this.performance.totalProfit / this.performance.winningTrades
      : 0;

    this.performance.averageLoss = this.performance.losingTrades > 0
      ? this.performance.totalLoss / this.performance.losingTrades
      : 0;

    this.performance.profitFactor = this.performance.totalLoss > 0
      ? this.performance.totalProfit / this.performance.totalLoss
      : this.performance.totalProfit > 0 ? Infinity : 0;

    this.performance.lastUpdated = new Date();
  }

  /**
   * คำนวณคะแนนประสิทธิภาพ (สำหรับเลือกอัลกอริทึม)
   * @returns {Number} Performance score (0-100)
   */
  calculatePerformanceScore() {
    // คำนวณคะแนนจากหลายปัจจัย
    let score = 0;

    // Win Rate (30%)
    score += (this.performance.winRate / 100) * 30;

    // Profit Factor (30%)
    const profitFactorScore = Math.min(this.performance.profitFactor / 2, 1) * 30;
    score += profitFactorScore;

    // Sharpe Ratio (20%) - ถ้ามี
    if (this.performance.sharpeRatio > 0) {
      score += Math.min(this.performance.sharpeRatio / 3, 1) * 20;
    } else {
      score += 10; // Default score
    }

    // Drawdown (20%) - ยิ่งน้อยยิ่งดี
    const drawdownScore = Math.max(0, 1 - (this.performance.maxDrawdown / 0.5)) * 20;
    score += drawdownScore;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Reset performance
   */
  resetPerformance() {
    this.performance = {
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
      lastUpdated: null,
    };
  }

  /**
   * Get algorithm info
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      performance: this.performance,
      performanceScore: this.calculatePerformanceScore(),
    };
  }
}

module.exports = BaseAlgorithm;

