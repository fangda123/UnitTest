const BaseAlgorithm = require('./baseAlgorithm');

/**
 * Mean Reversion Algorithm
 * ใช้หลักการ Mean Reversion - ราคาจะกลับมาที่ค่าเฉลี่ย
 */
class MeanReversionAlgorithm extends BaseAlgorithm {
  constructor() {
    super(
      'Mean Reversion',
      'Mean reversion strategy - buy when price is below mean, sell when above mean'
    );
  }

  calculateSignal(priceHistory, indicators, marketData) {
    if (!priceHistory || priceHistory.length < 30) {
      return {
        signal: 'hold',
        confidence: 0,
        reasons: ['ข้อมูลไม่เพียงพอสำหรับการวิเคราะห์ Mean Reversion (ต้องการอย่างน้อย 30 จุด)'],
      };
    }

    const reasons = [];
    let buySignals = 0;
    let sellSignals = 0;

    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];

    // 1. Distance from Moving Average - 30 points
    const ma20 = this.calculateMA(prices, 20);
    const ma50 = this.calculateMA(prices, 50);
    const distanceFromMA20 = ((currentPrice - ma20) / ma20) * 100;
    const distanceFromMA50 = ((currentPrice - ma50) / ma50) * 100;

    if (distanceFromMA20 < -3 && distanceFromMA50 < -2) {
      buySignals += 3;
      reasons.push(`✅ Mean Reversion: Price ${distanceFromMA20.toFixed(2)}% below MA20, ${distanceFromMA50.toFixed(2)}% below MA50 (Oversold)`);
    } else if (distanceFromMA20 > 3 && distanceFromMA50 > 2) {
      sellSignals += 3;
      reasons.push(`❌ Mean Reversion: Price ${distanceFromMA20.toFixed(2)}% above MA20, ${distanceFromMA50.toFixed(2)}% above MA50 (Overbought)`);
    }

    // 2. Z-Score Analysis - 25 points
    const zScore = this.calculateZScore(prices, 20);
    if (zScore < -2) {
      buySignals += 2;
      reasons.push(`✅ Z-Score: ${zScore.toFixed(2)} (Price significantly below mean - Strong buy signal)`);
    } else if (zScore > 2) {
      sellSignals += 2;
      reasons.push(`❌ Z-Score: ${zScore.toFixed(2)} (Price significantly above mean - Strong sell signal)`);
    } else if (zScore < -1) {
      buySignals += 1;
      reasons.push(`✅ Z-Score: ${zScore.toFixed(2)} (Price below mean - Buy opportunity)`);
    } else if (zScore > 1) {
      sellSignals += 1;
      reasons.push(`❌ Z-Score: ${zScore.toFixed(2)} (Price above mean - Sell opportunity)`);
    }

    // 3. Bollinger Bands Position - 20 points
    if (indicators.bollinger) {
      const bbPosition = this.getBollingerPosition(currentPrice, indicators.bollinger);
      if (bbPosition < 0.1) {
        buySignals += 2;
        reasons.push('✅ Bollinger Bands: Price at lower band (Strong oversold)');
      } else if (bbPosition > 0.9) {
        sellSignals += 2;
        reasons.push('❌ Bollinger Bands: Price at upper band (Strong overbought)');
      } else if (bbPosition < 0.2) {
        buySignals += 1;
        reasons.push('✅ Bollinger Bands: Price near lower band (Oversold)');
      } else if (bbPosition > 0.8) {
        sellSignals += 1;
        reasons.push('❌ Bollinger Bands: Price near upper band (Overbought)');
      }
    }

    // 4. RSI Mean Reversion - 15 points
    if (indicators.rsi) {
      if (indicators.rsi < 25) {
        buySignals += 2;
        reasons.push(`✅ RSI: ${indicators.rsi.toFixed(2)} (Extremely oversold - Strong mean reversion buy)`);
      } else if (indicators.rsi > 75) {
        sellSignals += 2;
        reasons.push(`❌ RSI: ${indicators.rsi.toFixed(2)} (Extremely overbought - Strong mean reversion sell)`);
      } else if (indicators.rsi < 35) {
        buySignals += 1;
        reasons.push(`✅ RSI: ${indicators.rsi.toFixed(2)} (Oversold - Mean reversion opportunity)`);
      } else if (indicators.rsi > 65) {
        sellSignals += 1;
        reasons.push(`❌ RSI: ${indicators.rsi.toFixed(2)} (Overbought - Mean reversion opportunity)`);
      }
    }

    // 5. Price Reversion Probability - 10 points
    const reversionProbability = this.calculateReversionProbability(prices);
    if (reversionProbability > 0.7 && distanceFromMA20 < 0) {
      buySignals += 1;
      reasons.push(`✅ Reversion Probability: ${(reversionProbability * 100).toFixed(0)}% (High probability of mean reversion upward)`);
    } else if (reversionProbability > 0.7 && distanceFromMA20 > 0) {
      sellSignals += 1;
      reasons.push(`❌ Reversion Probability: ${(reversionProbability * 100).toFixed(0)}% (High probability of mean reversion downward)`);
    }

    // คำนวณสัญญาณและความมั่นใจ
    const maxPossibleSignals = 10;
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
      reasons.push('ไม่มีสัญญาณ Mean Reversion ชัดเจน');
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

  calculateMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    const recent = prices.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  calculateZScore(prices, period) {
    if (prices.length < period) return 0;

    const recent = prices.slice(-period);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const currentPrice = prices[prices.length - 1];
    return (currentPrice - mean) / stdDev;
  }

  getBollingerPosition(currentPrice, bollinger) {
    const { upper, lower } = bollinger;
    const bandWidth = upper - lower;
    if (bandWidth === 0) return 0.5;
    return (currentPrice - lower) / bandWidth;
  }

  calculateReversionProbability(prices) {
    if (prices.length < 30) return 0.5;

    // คำนวณความน่าจะเป็นที่ราคาจะกลับมาที่ค่าเฉลี่ย
    const ma20 = this.calculateMA(prices, 20);
    const currentPrice = prices[prices.length - 1];
    const distance = Math.abs(currentPrice - ma20) / ma20;

    // ยิ่งห่างจากค่าเฉลี่ยมาก ยิ่งมีโอกาสกลับมาที่ค่าเฉลี่ยมาก
    return Math.min(0.9, distance * 2);
  }
}

module.exports = MeanReversionAlgorithm;

