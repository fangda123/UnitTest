const BaseAlgorithm = require('./baseAlgorithm');

/**
 * Volatility-Based Algorithm
 * ใช้การวิเคราะห์ความผันผวนและ Volatility Regime
 */
class VolatilityAlgorithm extends BaseAlgorithm {
  constructor() {
    super(
      'Volatility Trading',
      'Volatility regime detection and volatility-based trading strategy'
    );
  }

  calculateSignal(priceHistory, indicators, marketData) {
    if (!priceHistory || priceHistory.length < 20) {
      return {
        signal: 'hold',
        confidence: 0,
        reasons: ['ข้อมูลไม่เพียงพอสำหรับการวิเคราะห์ Volatility'],
      };
    }

    const reasons = [];
    let buySignals = 0;
    let sellSignals = 0;

    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];

    // 1. Volatility Regime Detection - 30 points
    const volatility = indicators.volatility?.volatility || this.calculateVolatility(prices, 20);
    const marketRegime = indicators.marketRegime || this.detectVolatilityRegime(volatility);

    if (marketRegime === 'low_volatility') {
      // ในช่วง low volatility - รอ breakout
      reasons.push(`📊 Volatility Regime: Low Volatility (${volatility.toFixed(2)}%) - รอ breakout`);
    } else if (marketRegime === 'high_volatility') {
      // ในช่วง high volatility - ระวังความเสี่ยง
      reasons.push(`⚠️ Volatility Regime: High Volatility (${volatility.toFixed(2)}%) - ระวังความเสี่ยง`);
    } else {
      reasons.push(`📊 Volatility Regime: Normal Volatility (${volatility.toFixed(2)}%)`);
    }

    // 2. Volatility Expansion/Contraction - 25 points
    const volExpansion = this.detectVolatilityExpansion(prices);
    if (volExpansion === 'expanding') {
      // Volatility กำลังขยาย - อาจมี breakout
      if (currentPrice > this.calculateMA(prices, 20)) {
        buySignals += 2;
        reasons.push('✅ Volatility Expansion: Expanding volatility with upward price movement (Potential breakout)');
      } else {
        sellSignals += 2;
        reasons.push('❌ Volatility Expansion: Expanding volatility with downward price movement (Potential breakdown)');
      }
    } else if (volExpansion === 'contracting') {
      // Volatility กำลังหดตัว - รอ breakout
      reasons.push('📊 Volatility Contraction: Volatility contracting - Consolidation phase');
    }

    // 3. ATR-based Position Sizing - 20 points
    const atr = this.calculateATR(priceHistory, 14);
    const atrPercent = (atr / currentPrice) * 100;

    if (atrPercent < 1) {
      // Low volatility - อาจมี breakout
      reasons.push(`📊 ATR: ${atrPercent.toFixed(2)}% (Low volatility - Watch for breakout)`);
    } else if (atrPercent > 5) {
      // High volatility - ระวังความเสี่ยง
      reasons.push(`⚠️ ATR: ${atrPercent.toFixed(2)}% (High volatility - Reduce position size)`);
    }

    // 4. Bollinger Bands Width - 15 points
    if (indicators.bollinger) {
      const bbWidth = this.calculateBollingerWidth(indicators.bollinger, currentPrice);
      if (bbWidth > 0.05) {
        // Wide bands = high volatility
        reasons.push(`⚠️ Bollinger Width: ${(bbWidth * 100).toFixed(2)}% (Wide bands - High volatility)`);
      } else if (bbWidth < 0.02) {
        // Narrow bands = low volatility, potential breakout
        if (currentPrice > indicators.bollinger.middle) {
          buySignals += 1;
          reasons.push(`✅ Bollinger Width: ${(bbWidth * 100).toFixed(2)}% (Narrow bands - Potential upward breakout)`);
        } else {
          sellSignals += 1;
          reasons.push(`❌ Bollinger Width: ${(bbWidth * 100).toFixed(2)}% (Narrow bands - Potential downward breakdown)`);
        }
      }
    }

    // 5. Volatility Clustering - 10 points
    const volClustering = this.detectVolatilityClustering(prices);
    if (volClustering === 'increasing') {
      reasons.push('⚠️ Volatility Clustering: Volatility increasing (Risk increasing)');
    } else if (volClustering === 'decreasing') {
      reasons.push('✅ Volatility Clustering: Volatility decreasing (Risk decreasing)');
    }

    // คำนวณสัญญาณและความมั่นใจ
    // Volatility algorithm มักจะให้สัญญาณน้อยกว่า แต่มีความแม่นยำสูง
    const maxPossibleSignals = 7;
    const signalDifference = Math.abs(buySignals - sellSignals);
    const signalRatio = signalDifference / maxPossibleSignals;

    let signal = 'hold';
    let confidence = 0;

    if (buySignals > sellSignals && buySignals >= 2) {
      signal = 'buy';
      confidence = Math.min(50 + (signalRatio * 50), 90);
    } else if (sellSignals > buySignals && sellSignals >= 2) {
      signal = 'sell';
      confidence = Math.min(50 + (signalRatio * 50), 90);
    } else {
      signal = 'hold';
      confidence = Math.max(0, 30 - (signalDifference * 10));
    }

    // ปรับ confidence ตาม volatility regime
    if (marketRegime === 'high_volatility') {
      confidence = Math.max(0, confidence - 10); // ลด confidence ในช่วง high volatility
    }

    if (reasons.length === 0) {
      reasons.push('ไม่มีสัญญาณ Volatility ชัดเจน');
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reasons,
      algorithm: this.name,
      buySignals,
      sellSignals,
      volatility,
      marketRegime,
    };
  }

  calculateVolatility(prices, period) {
    if (prices.length < period + 1) return 0;

    const returns = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      if (i > 0) {
        const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(ret);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev * 100; // แปลงเป็นเปอร์เซ็นต์
  }

  detectVolatilityRegime(volatility) {
    if (volatility < 1) {
      return 'low_volatility';
    } else if (volatility > 5) {
      return 'high_volatility';
    } else {
      return 'normal_volatility';
    }
  }

  detectVolatilityExpansion(prices) {
    if (prices.length < 30) return 'neutral';

    const vol10 = this.calculateVolatility(prices.slice(-10), 10);
    const vol20 = this.calculateVolatility(prices.slice(-20), 20);

    if (vol10 > vol20 * 1.2) {
      return 'expanding';
    } else if (vol10 < vol20 * 0.8) {
      return 'contracting';
    }

    return 'neutral';
  }

  calculateATR(priceHistory, period) {
    if (priceHistory.length < period + 1) return 0;

    const trueRanges = [];
    for (let i = priceHistory.length - period; i < priceHistory.length; i++) {
      if (i > 0) {
        const high = priceHistory[i].high || priceHistory[i].price;
        const low = priceHistory[i].low || priceHistory[i].price;
        const prevClose = priceHistory[i - 1].price;

        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
      }
    }

    if (trueRanges.length === 0) return 0;
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  calculateBollingerWidth(bollinger, currentPrice) {
    const { upper, lower } = bollinger;
    const bandWidth = upper - lower;
    return bandWidth / currentPrice;
  }

  detectVolatilityClustering(prices) {
    if (prices.length < 20) return 'neutral';

    const recent10 = prices.slice(-10);
    const previous10 = prices.slice(-20, -10);

    const volRecent = this.calculateVolatility(recent10, 10);
    const volPrevious = this.calculateVolatility(previous10, 10);

    if (volRecent > volPrevious * 1.1) {
      return 'increasing';
    } else if (volRecent < volPrevious * 0.9) {
      return 'decreasing';
    }

    return 'neutral';
  }

  calculateMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    const recent = prices.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }
}

module.exports = VolatilityAlgorithm;

