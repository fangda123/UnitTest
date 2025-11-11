const algorithmPerformanceTracker = require('./algorithmPerformanceTracker');
const logger = require('../utils/logger');

/**
 * Algorithm Selector
 * เลือกอัลกอริทึมที่ดีที่สุดตามประสิทธิภาพ
 */
class AlgorithmSelector {
  constructor() {
    this.selectionHistory = new Map(); // เก็บประวัติการเลือกอัลกอริทึม
  }

  /**
   * เลือกอัลกอริทึมที่ดีที่สุด
   * @param {Array} algorithmSignals - สัญญาณจากอัลกอริทึมทั้งหมด [{ algorithm, signal, confidence, ... }, ...]
   * @param {String} symbol - สัญลักษณ์คู่เทรด
   * @returns {Object} { selectedAlgorithm, signal, confidence, allSignals }
   */
  async selectBestAlgorithm(algorithmSignals, symbol) {
    try {
      if (!algorithmSignals || algorithmSignals.length === 0) {
        return {
          selectedAlgorithm: null,
          signal: 'hold',
          confidence: 0,
          reason: 'ไม่มีสัญญาณจากอัลกอริทึม',
          allSignals: [],
        };
      }

      // ดึงประสิทธิภาพของอัลกอริทึมทั้งหมด
      const performances = await Promise.all(
        algorithmSignals.map(async (algSignal) => {
          const performance = await algorithmPerformanceTracker.getPerformance(
            algSignal.algorithm,
            symbol
          );
          const performanceScore = algorithmPerformanceTracker.calculatePerformanceScore(performance);
          return {
            ...algSignal,
            performance,
            performanceScore,
          };
        })
      );

      // คำนวณ Weighted Score สำหรับแต่ละอัลกอริทึม
      const weightedScores = performances.map((alg) => {
        // Weighted Score = Signal Confidence * Performance Score
        let weightedScore = (alg.confidence / 100) * (alg.performanceScore / 100) * 100;
        
        // ให้ความสำคัญพิเศษกับ Profit Maximization Algorithm (เพิ่ม 20%)
        if (alg.algorithm === 'profitMaximization') {
          weightedScore = weightedScore * 1.2;
        }
        
        // ถ้ามี Risk-Reward Ratio สูง → เพิ่มคะแนน
        if (alg.riskReward && alg.riskReward >= 3.0) {
          weightedScore = weightedScore * 1.15; // เพิ่ม 15% สำหรับ R:R >= 3:1
        } else if (alg.riskReward && alg.riskReward >= 2.0) {
          weightedScore = weightedScore * 1.05; // เพิ่ม 5% สำหรับ R:R >= 2:1
        }
        
        return {
          ...alg,
          weightedScore,
        };
      });

      // เรียงตาม Weighted Score
      weightedScores.sort((a, b) => b.weightedScore - a.weightedScore);

      // เลือกอัลกอริทึมที่ดีที่สุด
      const selectedAlgorithm = weightedScores[0];

      // ถ้ามีหลายอัลกอริทึมที่ให้สัญญาณเดียวกัน ให้รวม confidence
      const sameSignalAlgorithms = weightedScores.filter(
        (alg) => alg.signal === selectedAlgorithm.signal && alg.signal !== 'hold'
      );

      let finalConfidence = selectedAlgorithm.confidence;
      let finalReasons = [...selectedAlgorithm.reasons];

      if (sameSignalAlgorithms.length > 1) {
        // คำนวณ weighted average confidence
        const totalWeight = sameSignalAlgorithms.reduce(
          (sum, alg) => sum + alg.performanceScore,
          0
        );
        const weightedConfidence = sameSignalAlgorithms.reduce(
          (sum, alg) => sum + (alg.confidence * alg.performanceScore),
          0
        ) / totalWeight;

        finalConfidence = Math.min(95, weightedConfidence + (sameSignalAlgorithms.length - 1) * 5);
        finalReasons.push(
          `✅ ${sameSignalAlgorithms.length} อัลกอริทึมให้สัญญาณเดียวกัน (${sameSignalAlgorithms.map(a => a.algorithm).join(', ')})`
        );
      }

      // เพิ่มข้อมูลเกี่ยวกับอัลกอริทึมที่เลือก
      finalReasons.push(
        `🏆 อัลกอริทึมที่เลือก: ${selectedAlgorithm.algorithm} (Performance Score: ${selectedAlgorithm.performanceScore.toFixed(1)}, Weighted Score: ${selectedAlgorithm.weightedScore.toFixed(1)})`
      );

      // เก็บประวัติการเลือก
      this.selectionHistory.set(`${symbol}_${Date.now()}`, {
        selectedAlgorithm: selectedAlgorithm.algorithm,
        signal: selectedAlgorithm.signal,
        confidence: finalConfidence,
        timestamp: new Date(),
      });

      logger.info(
        `[Algorithm Selector] Selected ${selectedAlgorithm.algorithm} for ${symbol}: ${selectedAlgorithm.signal} (${finalConfidence}% confidence)`
      );

      return {
        selectedAlgorithm: selectedAlgorithm.algorithm,
        signal: selectedAlgorithm.signal,
        confidence: Math.round(finalConfidence),
        reasons: finalReasons,
        allSignals: weightedScores.map((alg) => ({
          algorithm: alg.algorithm,
          signal: alg.signal,
          confidence: alg.confidence,
          performanceScore: alg.performanceScore,
          weightedScore: alg.weightedScore,
        })),
        performance: {
          winRate: selectedAlgorithm.performance.winRate,
          profitFactor: selectedAlgorithm.performance.profitFactor,
          totalTrades: selectedAlgorithm.performance.totalTrades,
        },
      };
    } catch (error) {
      logger.error(`[Algorithm Selector] Error selecting algorithm:`, error);
      // Fallback: ใช้สัญญาณแรก
      return {
        selectedAlgorithm: algorithmSignals[0]?.algorithm || 'Unknown',
        signal: algorithmSignals[0]?.signal || 'hold',
        confidence: algorithmSignals[0]?.confidence || 0,
        reason: 'Error selecting algorithm, using first signal',
        allSignals: algorithmSignals,
      };
    }
  }

  /**
   * ดึงประวัติการเลือกอัลกอริทึม
   * @param {String} symbol - สัญลักษณ์คู่เทรด
   * @param {Number} limit - จำนวนรายการ
   */
  getSelectionHistory(symbol, limit = 50) {
    const history = Array.from(this.selectionHistory.entries())
      .filter(([key]) => key.startsWith(`${symbol}_`))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return history;
  }
}

module.exports = new AlgorithmSelector();

