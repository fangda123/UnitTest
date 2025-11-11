const logger = require('../utils/logger');

/**
 * Price Prediction Service
 * คำนวณราคาในอนาคตจากข้อมูลราคาปัจจุบัน
 */
class PricePredictionService {
  /**
   * คำนวณราคาในอนาคตด้วย Linear Regression
   */
  predictPriceLinearRegression(prices, futurePeriods = 10) {
    if (prices.length < 2) {
      return [];
    }

    const n = prices.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    // คำนวณ regression coefficients
    prices.forEach((price, index) => {
      const x = index;
      const y = price;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // คำนวณราคาในอนาคต
    const predictions = [];
    for (let i = 0; i < futurePeriods; i++) {
      const futureX = n + i;
      const predictedPrice = slope * futureX + intercept;
      predictions.push({
        period: i + 1,
        price: Math.max(0, predictedPrice), // ราคาต้องไม่เป็นลบ
        timestamp: Date.now() + (i * 5000), // 5 วินาทีต่อ period
      });
    }

    return predictions;
  }

  /**
   * คำนวณราคาในอนาคตด้วย Moving Average Projection
   */
  predictPriceMovingAverage(prices, period = 20, futurePeriods = 10) {
    if (prices.length < period) {
      return [];
    }

    // คำนวณ MA
    const recentPrices = prices.slice(-period);
    const ma = recentPrices.reduce((sum, p) => sum + p, 0) / period;

    // คำนวณ trend (slope)
    const firstHalf = recentPrices.slice(0, Math.floor(period / 2));
    const secondHalf = recentPrices.slice(Math.floor(period / 2));
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;
    const trend = (secondHalfAvg - firstHalfAvg) / (period / 2);

    // คำนวณราคาในอนาคต
    const predictions = [];
    for (let i = 0; i < futurePeriods; i++) {
      const predictedPrice = ma + (trend * (i + 1));
      predictions.push({
        period: i + 1,
        price: Math.max(0, predictedPrice),
        timestamp: Date.now() + (i * 5000),
      });
    }

    return predictions;
  }

  /**
   * คำนวณราคาในอนาคตด้วย Exponential Smoothing
   */
  predictPriceExponentialSmoothing(prices, alpha = 0.3, futurePeriods = 10) {
    if (prices.length < 2) {
      return [];
    }

    // คำนวณ exponential smoothing
    let smoothed = prices[0];
    const smoothedValues = [smoothed];

    for (let i = 1; i < prices.length; i++) {
      smoothed = alpha * prices[i] + (1 - alpha) * smoothed;
      smoothedValues.push(smoothed);
    }

    // คำนวณ trend
    const trend = smoothedValues.length > 1
      ? smoothedValues[smoothedValues.length - 1] - smoothedValues[smoothedValues.length - 2]
      : 0;

    // คำนวณราคาในอนาคต
    const predictions = [];
    for (let i = 0; i < futurePeriods; i++) {
      const predictedPrice = smoothed + (trend * (i + 1));
      predictions.push({
        period: i + 1,
        price: Math.max(0, predictedPrice),
        timestamp: Date.now() + (i * 5000),
      });
    }

    return predictions;
  }

  /**
   * ตรวจสอบว่ามีข้อมูลเพียงพอสำหรับการคำนวณหรือไม่
   */
  hasEnoughData(prices, minDataPoints = 30) {
    if (!prices || prices.length < minDataPoints) {
      return {
        hasEnough: false,
        current: prices ? prices.length : 0,
        required: minDataPoints,
        message: `ข้อมูลไม่เพียงพอ: มี ${prices ? prices.length : 0} จุด ต้องการอย่างน้อย ${minDataPoints} จุด`,
      };
    }

    // ตรวจสอบว่าข้อมูลมีความหลากหลายหรือไม่ (ไม่ใช่ราคาเดียวกันทั้งหมด)
    const uniquePrices = new Set(prices);
    if (uniquePrices.size < 3) {
      return {
        hasEnough: false,
        current: prices.length,
        required: minDataPoints,
        message: 'ข้อมูลไม่มีความหลากหลาย (ราคาเหมือนกันเกือบทั้งหมด)',
      };
    }

    return {
      hasEnough: true,
      current: prices.length,
      required: minDataPoints,
      message: 'ข้อมูลเพียงพอสำหรับการคำนวณ',
    };
  }

  /**
   * วิเคราะห์ Volatility Periods จากข้อมูลย้อนหลัง 1 ปี
   * หาช่วงเวลาที่มีความผันผวนสูง/ต่ำ เพื่อใช้ในการปรับ prediction
   */
  analyzeVolatilityPeriods(prices, windowSize = 30) {
    if (prices.length < windowSize * 2) {
      return {
        periods: [],
        avgVolatility: 0,
        highVolatilityThreshold: 0,
        lowVolatilityThreshold: 0,
      };
    }

    const periods = [];
    const volatilities = [];

    // แบ่งข้อมูลเป็นช่วงๆ และคำนวณ volatility ของแต่ละช่วง
    for (let i = 0; i <= prices.length - windowSize; i += Math.floor(windowSize / 2)) {
      const windowPrices = prices.slice(i, i + windowSize);
      if (windowPrices.length < windowSize) break;

      const mean = windowPrices.reduce((sum, p) => sum + p, 0) / windowPrices.length;
      const variance = windowPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / windowPrices.length;
      const stdDev = Math.sqrt(variance);
      const volatility = (stdDev / mean) * 100;

      volatilities.push(volatility);
      periods.push({
        startIndex: i,
        endIndex: i + windowSize - 1,
        volatility,
        mean,
        stdDev,
        regime: volatility > 5 ? 'high' : volatility < 2 ? 'low' : 'normal',
      });
    }

    // คำนวณ threshold
    const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    const sortedVolatilities = [...volatilities].sort((a, b) => a - b);
    const highVolatilityThreshold = sortedVolatilities[Math.floor(sortedVolatilities.length * 0.75)]; // 75th percentile
    const lowVolatilityThreshold = sortedVolatilities[Math.floor(sortedVolatilities.length * 0.25)]; // 25th percentile

    return {
      periods,
      avgVolatility,
      highVolatilityThreshold,
      lowVolatilityThreshold,
    };
  }

  /**
   * คำนวณราคาในอนาคตแบบรวม (ใช้หลายวิธี) + ปรับตาม Volatility Periods
   */
  predictPriceCombined(prices, futurePeriods = 10) {
    // ตรวจสอบข้อมูลก่อนคำนวณ (ต้องการอย่างน้อย 30 จุด)
    const dataCheck = this.hasEnoughData(prices, 30);
    if (!dataCheck.hasEnough) {
      logger.warn(`[Price Prediction] ⚠️ ${dataCheck.message}`);
      return {
        predictions: [],
        dataStatus: dataCheck,
        accuracy: null,
      };
    }

    // วิเคราะห์ Volatility Periods จากข้อมูลย้อนหลัง 1 ปี
    const volatilityAnalysis = this.analyzeVolatilityPeriods(prices, 30);
    logger.info(`[Price Prediction] 📊 Volatility Analysis: Avg=${volatilityAnalysis.avgVolatility.toFixed(2)}%, High Threshold=${volatilityAnalysis.highVolatilityThreshold.toFixed(2)}%, Low Threshold=${volatilityAnalysis.lowVolatilityThreshold.toFixed(2)}%`);

    // คำนวณ volatility ปัจจุบัน
    const currentVolatility = this.calculateCurrentVolatility(prices);
    const currentRegime = currentVolatility > volatilityAnalysis.highVolatilityThreshold ? 'high' :
                          currentVolatility < volatilityAnalysis.lowVolatilityThreshold ? 'low' : 'normal';

    logger.info(`[Price Prediction] 📊 Current Volatility: ${currentVolatility.toFixed(2)}% (${currentRegime} volatility)`);

    const linearPred = this.predictPriceLinearRegression(prices, futurePeriods);
    const maPred = this.predictPriceMovingAverage(prices, 20, futurePeriods);
    const expPred = this.predictPriceExponentialSmoothing(prices, 0.3, futurePeriods);

    // รวมผลลัพธ์ (weighted average) + ปรับตาม Volatility
    const predictions = [];
    for (let i = 0; i < futurePeriods; i++) {
      const linearPrice = linearPred[i]?.price || 0;
      const maPrice = maPred[i]?.price || 0;
      const expPrice = expPred[i]?.price || 0;

      // Weight: Linear 30%, MA 40%, Exponential 30%
      let combinedPrice = (linearPrice * 0.3) + (maPrice * 0.4) + (expPrice * 0.3);

      // ปรับราคาตาม Volatility Regime
      // ถ้าอยู่ในช่วง high volatility → เพิ่ม uncertainty (ขยายช่วงราคา)
      // ถ้าอยู่ในช่วง low volatility → ลด uncertainty (แคบช่วงราคา)
      if (currentRegime === 'high') {
        // ในช่วง high volatility → เพิ่มความผันผวนในการคาดการณ์ (เพิ่ม/ลดราคาได้มากขึ้น)
        const volatilityAdjustment = (currentVolatility / 100) * combinedPrice * 0.1; // ปรับ 10% ของ volatility
        // สุ่มว่าจะขึ้นหรือลง (แต่ใช้ trend เป็นหลัก)
        const trend = (combinedPrice - prices[prices.length - 1]) / prices[prices.length - 1];
        combinedPrice = combinedPrice + (volatilityAdjustment * (trend >= 0 ? 1 : -1));
      } else if (currentRegime === 'low') {
        // ในช่วง low volatility → ลดความผันผวนในการคาดการณ์ (ราคาเสถียรกว่า)
        const stabilityAdjustment = (1 - (currentVolatility / 100)) * combinedPrice * 0.05; // ปรับ 5% ของ stability
        // ลดการเปลี่ยนแปลง
        const trend = (combinedPrice - prices[prices.length - 1]) / prices[prices.length - 1];
        combinedPrice = combinedPrice - (stabilityAdjustment * Math.abs(trend));
      }

      // คำนวณ confidence โดยคำนึงถึง volatility
      const baseConfidence = this.calculateConfidence(prices, combinedPrice);
      // ลด confidence ในช่วง high volatility
      const volatilityAdjustedConfidence = currentRegime === 'high' 
        ? Math.max(0, baseConfidence - 15) // ลด 15% ใน high volatility
        : currentRegime === 'low'
        ? Math.min(100, baseConfidence + 10) // เพิ่ม 10% ใน low volatility
        : baseConfidence;

      predictions.push({
        period: i + 1,
        price: Math.max(0, combinedPrice),
        timestamp: Date.now() + (i * 5000),
        confidence: Math.round(volatilityAdjustedConfidence),
        volatility: currentVolatility,
        volatilityRegime: currentRegime,
        volatilityAdjusted: true, // บอกว่าได้ปรับตาม volatility แล้ว
      });
    }

    // คำนวณ accuracy จากข้อมูลย้อนหลัง (backtesting)
    const accuracy = this.calculatePredictionAccuracy(prices, predictions);

    return {
      predictions,
      dataStatus: dataCheck,
      accuracy,
      volatilityAnalysis: {
        currentVolatility,
        currentRegime,
        avgVolatility: volatilityAnalysis.avgVolatility,
        highVolatilityThreshold: volatilityAnalysis.highVolatilityThreshold,
        lowVolatilityThreshold: volatilityAnalysis.lowVolatilityThreshold,
      },
    };
  }

  /**
   * คำนวณ Volatility ปัจจุบัน
   */
  calculateCurrentVolatility(prices, period = 30) {
    if (prices.length < period) {
      return 0;
    }

    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / mean) * 100;

    return volatility;
  }

  /**
   * คำนวณความแม่นยำของการพยากรณ์ (backtesting)
   */
  calculatePredictionAccuracy(historicalPrices, predictions) {
    if (historicalPrices.length < 20 || predictions.length === 0) {
      return null;
    }

    // ใช้ข้อมูล 20 จุดสุดท้ายเป็น "actual" และคำนวณ prediction จากข้อมูลก่อนหน้า
    const testSize = Math.min(10, Math.floor(historicalPrices.length / 3));
    const testData = historicalPrices.slice(-testSize);
    const trainingData = historicalPrices.slice(0, -testSize);

    if (trainingData.length < 20) {
      return null;
    }

    // คำนวณ prediction จาก training data
    const testPredictions = this.predictPriceCombined(trainingData, testSize);
    if (!testPredictions.predictions || testPredictions.predictions.length === 0) {
      return null;
    }

    // เปรียบเทียบ prediction กับ actual
    let totalError = 0;
    let totalActual = 0;
    const errors = [];

    for (let i = 0; i < Math.min(testSize, testPredictions.predictions.length); i++) {
      const actual = testData[i];
      const predicted = testPredictions.predictions[i].price;
      const error = Math.abs(actual - predicted);
      const errorPercent = (error / actual) * 100;

      totalError += error;
      totalActual += actual;
      errors.push({
        period: i + 1,
        actual,
        predicted,
        error,
        errorPercent,
      });
    }

    const mae = totalError / errors.length; // Mean Absolute Error
    const mape = (totalError / totalActual) * 100; // Mean Absolute Percentage Error
    const accuracy = Math.max(0, 100 - mape); // Accuracy percentage

    return {
      mae,
      mape,
      accuracy: Math.round(accuracy),
      errors,
    };
  }

  /**
   * คำนวณความมั่นใจในการพยากรณ์
   */
  calculateConfidence(historicalPrices, predictedPrice) {
    if (historicalPrices.length < 2) {
      return 0;
    }

    // คำนวณ volatility
    const mean = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length;
    const variance = historicalPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / historicalPrices.length;
    const stdDev = Math.sqrt(variance);

    // ความมั่นใจลดลงเมื่อ volatility สูง
    const volatilityRatio = stdDev / mean;
    const confidence = Math.max(0, Math.min(100, 100 - (volatilityRatio * 100)));

    return Math.round(confidence);
  }
}

// สร้าง instance เดียว (Singleton pattern)
const pricePredictionService = new PricePredictionService();

module.exports = pricePredictionService;

