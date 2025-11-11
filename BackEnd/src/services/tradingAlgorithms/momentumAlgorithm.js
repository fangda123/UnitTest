const BaseAlgorithm = require('./baseAlgorithm');

/**
 * Momentum Algorithm
 * ใช้การวิเคราะห์โมเมนตัมและแรงส่งของราคา
 */
class MomentumAlgorithm extends BaseAlgorithm {
  constructor() {
    super(
      'Momentum Trading',
      'Momentum and price momentum analysis with rate of change and acceleration'
    );
  }

  calculateSignal(priceHistory, indicators, marketData) {
    if (!priceHistory || priceHistory.length < 20) {
      return {
        signal: 'hold',
        confidence: 0,
        reasons: ['ข้อมูลไม่เพียงพอสำหรับการวิเคราะห์โมเมนตัม'],
      };
    }

    const reasons = [];
    let buySignals = 0;
    let sellSignals = 0;

    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];

    // 1. Rate of Change (ROC) - 30 points
    const roc5 = this.calculateROC(prices, 5);
    const roc10 = this.calculateROC(prices, 10);
    const roc20 = this.calculateROC(prices, 20);

    if (roc5 > 2 && roc10 > 1.5 && roc20 > 1) {
      buySignals += 3;
      reasons.push(`✅ Momentum: Strong positive momentum (ROC5: ${roc5.toFixed(2)}%, ROC10: ${roc10.toFixed(2)}%, ROC20: ${roc20.toFixed(2)}%)`);
    } else if (roc5 < -2 && roc10 < -1.5 && roc20 < -1) {
      sellSignals += 3;
      reasons.push(`❌ Momentum: Strong negative momentum (ROC5: ${roc5.toFixed(2)}%, ROC10: ${roc10.toFixed(2)}%, ROC20: ${roc20.toFixed(2)}%)`);
    }

    // 2. Price Acceleration - 25 points
    const acceleration = this.calculateAcceleration(prices);
    if (acceleration > 0.5) {
      buySignals += 2;
      reasons.push(`✅ Acceleration: Price accelerating upward (${acceleration.toFixed(4)})`);
    } else if (acceleration < -0.5) {
      sellSignals += 2;
      reasons.push(`❌ Acceleration: Price accelerating downward (${acceleration.toFixed(4)})`);
    }

    // 3. Momentum Divergence - 20 points
    if (indicators.rsi) {
      const divergence = this.checkMomentumDivergence(prices, indicators.rsi);
      if (divergence === 'bullish') {
        buySignals += 2;
        reasons.push('✅ Divergence: Bullish momentum divergence detected');
      } else if (divergence === 'bearish') {
        sellSignals += 2;
        reasons.push('❌ Divergence: Bearish momentum divergence detected');
      }
    }

    // 4. Breakout Detection - 15 points
    const breakout = this.detectBreakout(prices);
    if (breakout === 'upward') {
      buySignals += 1;
      reasons.push('✅ Breakout: Upward breakout from consolidation');
    } else if (breakout === 'downward') {
      sellSignals += 1;
      reasons.push('❌ Breakout: Downward breakdown from consolidation');
    }

    // 5. Volume Confirmation - 10 points
    if (indicators.volume) {
      const volumeConfirmation = this.checkVolumeConfirmation(priceHistory, indicators.volume);
      if (volumeConfirmation === 'buy') {
        buySignals += 1;
        reasons.push('✅ Volume: High volume confirms momentum');
      } else if (volumeConfirmation === 'sell') {
        sellSignals += 1;
        reasons.push('❌ Volume: High volume confirms downward momentum');
      }
    }

    // คำนวณสัญญาณและความมั่นใจ
    const maxPossibleSignals = 9;
    const signalDifference = Math.abs(buySignals - sellSignals);
    const signalRatio = signalDifference / maxPossibleSignals;

    let signal = 'hold';
    let confidence = 0;

    if (buySignals > sellSignals && buySignals >= 3) {
      signal = 'buy';
      confidence = Math.min(50 + (signalRatio * 50), 95);
    } else if (sellSignals > buySignals && sellSignals >= 3) {
      signal = 'sell';
      confidence = Math.min(50 + (signalRatio * 50), 95);
    } else {
      signal = 'hold';
      confidence = Math.max(0, 30 - (signalDifference * 10));
    }

    if (reasons.length === 0) {
      reasons.push('ไม่มีสัญญาณโมเมนตัมชัดเจน');
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reasons,
      algorithm: this.name,
      buySignals,
      sellSignals,
    };
  }

  calculateROC(prices, period) {
    if (prices.length < period + 1) return 0;
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  calculateAcceleration(prices) {
    if (prices.length < 10) return 0;

    const roc5_1 = this.calculateROC(prices.slice(0, -1), 5);
    const roc5_2 = this.calculateROC(prices, 5);

    return roc5_2 - roc5_1;
  }

  checkMomentumDivergence(prices, rsi) {
    if (prices.length < 20) return 'neutral';

    const recentPrices = prices.slice(-10);
    const recentRSI = []; // ต้องคำนวณ RSI สำหรับแต่ละจุด

    const priceHigh = Math.max(...recentPrices);
    const priceLow = Math.min(...recentPrices);
    const priceTrend = recentPrices[recentPrices.length - 1] - recentPrices[0];

    // Simplified divergence check
    if (priceTrend < 0 && rsi > 50) {
      return 'bullish'; // Price down but RSI up = bullish divergence
    } else if (priceTrend > 0 && rsi < 50) {
      return 'bearish'; // Price up but RSI down = bearish divergence
    }

    return 'neutral';
  }

  detectBreakout(prices) {
    if (prices.length < 20) return 'neutral';

    const recent20 = prices.slice(-20);
    const recent10 = prices.slice(-10);
    const currentPrice = prices[prices.length - 1];

    const avg20 = recent20.reduce((a, b) => a + b, 0) / recent20.length;
    const std20 = Math.sqrt(
      recent20.reduce((sum, price) => sum + Math.pow(price - avg20, 2), 0) / recent20.length
    );

    const upperBand = avg20 + (2 * std20);
    const lowerBand = avg20 - (2 * std20);

    // Check if price broke out of consolidation
    const inConsolidation = recent10.every(p => p >= lowerBand && p <= upperBand);

    if (!inConsolidation) {
      if (currentPrice > upperBand) {
        return 'upward';
      } else if (currentPrice < lowerBand) {
        return 'downward';
      }
    }

    return 'neutral';
  }

  checkVolumeConfirmation(priceHistory, currentVolume) {
    if (priceHistory.length < 10) return 'hold';

    const recentVolumes = priceHistory.slice(-10).map(h => h.volume || 0);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    const recentPrices = priceHistory.slice(-5).map(h => h.price);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    if (currentVolume > avgVolume * 1.5 && priceChange > 1) {
      return 'buy';
    } else if (currentVolume > avgVolume * 1.5 && priceChange < -1) {
      return 'sell';
    }

    return 'hold';
  }
}

module.exports = MomentumAlgorithm;

