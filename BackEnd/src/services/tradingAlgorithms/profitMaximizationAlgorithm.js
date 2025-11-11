const BaseAlgorithm = require('./baseAlgorithm');

/**
 * Profit Maximization Algorithm
 * อัลกอริทึมที่ออกแบบมาเพื่อเพิ่มผลกำไรสูงสุดเท่าที่จะทำได้
 * ใช้เทคนิค:
 * - Kelly Criterion สำหรับ position sizing
 * - Multi-timeframe trend analysis
 * - Risk-reward ratio optimization
 * - Entry/exit timing optimization
 * - Volatility-adjusted entries
 */
class ProfitMaximizationAlgorithm extends BaseAlgorithm {
  constructor() {
    super(
      'Profit Maximization',
      'Advanced algorithm designed to maximize profits using Kelly Criterion, multi-timeframe analysis, and risk-reward optimization'
    );
  }

  calculateSignal(priceHistory, indicators, marketData) {
    if (!priceHistory || priceHistory.length < 30) {
      return {
        signal: 'hold',
        confidence: 0,
        reasons: ['ข้อมูลไม่เพียงพอสำหรับ Profit Maximization Algorithm (ต้องการอย่างน้อย 30 จุด)'],
      };
    }

    const reasons = [];
    let buyScore = 0;
    let sellScore = 0;
    let maxScore = 0;

    const currentPrice = marketData.currentPrice;
    const prices = priceHistory.map(h => h.price);

    // 1. Multi-Timeframe Trend Analysis (25 points)
    const trendAnalysis = this.analyzeMultiTimeframeTrend(priceHistory);
    if (trendAnalysis.strength > 0.7) {
      if (trendAnalysis.direction === 'up') {
        buyScore += 25;
        reasons.push(`📈 Strong Uptrend (${(trendAnalysis.strength * 100).toFixed(1)}% strength) - โอกาสซื้อสูง`);
      } else if (trendAnalysis.direction === 'down') {
        sellScore += 25;
        reasons.push(`📉 Strong Downtrend (${(trendAnalysis.strength * 100).toFixed(1)}% strength) - โอกาสขายสูง`);
      }
    }
    maxScore += 25;

    // 2. Risk-Reward Ratio Analysis (20 points)
    const riskReward = this.calculateRiskRewardRatio(priceHistory, indicators, currentPrice);
    if (riskReward.ratio >= 3.0) {
      if (riskReward.signal === 'buy') {
        buyScore += 20;
        reasons.push(`💰 Excellent Risk-Reward: ${riskReward.ratio.toFixed(2)}:1 (Stop Loss: ${riskReward.stopLoss.toFixed(2)}, Target: ${riskReward.target.toFixed(2)})`);
      } else if (riskReward.signal === 'sell') {
        sellScore += 20;
        reasons.push(`💰 Excellent Risk-Reward: ${riskReward.ratio.toFixed(2)}:1 (Stop Loss: ${riskReward.stopLoss.toFixed(2)}, Target: ${riskReward.target.toFixed(2)})`);
      }
    } else if (riskReward.ratio >= 2.0) {
      if (riskReward.signal === 'buy') {
        buyScore += 12;
        reasons.push(`✅ Good Risk-Reward: ${riskReward.ratio.toFixed(2)}:1`);
      } else if (riskReward.signal === 'sell') {
        sellScore += 12;
        reasons.push(`✅ Good Risk-Reward: ${riskReward.ratio.toFixed(2)}:1`);
      }
    }
    maxScore += 20;

    // 3. Entry Timing Optimization (15 points)
    const entryTiming = this.optimizeEntryTiming(priceHistory, indicators, currentPrice);
    if (entryTiming.score > 0.7) {
      if (entryTiming.signal === 'buy') {
        buyScore += 15;
        reasons.push(`⏰ Optimal Entry: ${(entryTiming.score * 100).toFixed(1)}% timing score - ราคาอยู่ในจุดที่ดีสำหรับการซื้อ`);
      } else if (entryTiming.signal === 'sell') {
        sellScore += 15;
        reasons.push(`⏰ Optimal Exit: ${(entryTiming.score * 100).toFixed(1)}% timing score - ราคาอยู่ในจุดที่ดีสำหรับการขาย`);
      }
    }
    maxScore += 15;

    // 4. Volatility-Adjusted Signals (15 points)
    const volatilitySignal = this.analyzeVolatilityAdjustedSignal(priceHistory, indicators, currentPrice);
    if (volatilitySignal.confidence > 0.7) {
      if (volatilitySignal.signal === 'buy') {
        buyScore += 15;
        reasons.push(`📊 Volatility-Adjusted Buy: Low volatility entry (${(volatilitySignal.confidence * 100).toFixed(1)}% confidence)`);
      } else if (volatilitySignal.signal === 'sell') {
        sellScore += 15;
        reasons.push(`📊 Volatility-Adjusted Sell: High volatility exit (${(volatilitySignal.confidence * 100).toFixed(1)}% confidence)`);
      }
    }
    maxScore += 15;

    // 5. Momentum Confirmation (10 points)
    const momentum = this.analyzeMomentum(priceHistory, indicators);
    if (momentum.strength > 0.6) {
      if (momentum.direction === 'up') {
        buyScore += 10;
        reasons.push(`🚀 Strong Momentum: ${(momentum.strength * 100).toFixed(1)}% upward momentum`);
      } else if (momentum.direction === 'down') {
        sellScore += 10;
        reasons.push(`⬇️ Strong Momentum: ${(momentum.strength * 100).toFixed(1)}% downward momentum`);
      }
    }
    maxScore += 10;

    // 6. Support/Resistance Breakout (10 points)
    const breakout = this.detectBreakout(priceHistory, currentPrice);
    if (breakout.detected) {
      if (breakout.direction === 'up') {
        buyScore += 10;
        reasons.push(`💥 Bullish Breakout: Price broke above resistance at $${breakout.level.toFixed(2)}`);
      } else if (breakout.direction === 'down') {
        sellScore += 10;
        reasons.push(`💥 Bearish Breakdown: Price broke below support at $${breakout.level.toFixed(2)}`);
      }
    }
    maxScore += 10;

    // 7. Indicator Confluence (5 points)
    const confluence = this.checkIndicatorConfluence(indicators, currentPrice);
    if (confluence.buySignals >= 3) {
      buyScore += 5;
      reasons.push(`✅ Indicator Confluence: ${confluence.buySignals} indicators showing buy signal`);
    } else if (confluence.sellSignals >= 3) {
      sellScore += 5;
      reasons.push(`❌ Indicator Confluence: ${confluence.sellSignals} indicators showing sell signal`);
    }
    maxScore += 5;

    // คำนวณสัญญาณและความมั่นใจ
    const totalScore = buyScore + sellScore;
    const buyRatio = totalScore > 0 ? buyScore / totalScore : 0;
    const sellRatio = totalScore > 0 ? sellScore / totalScore : 0;

    let signal = 'hold';
    let confidence = 0;

    if (buyScore > sellScore && buyScore >= maxScore * 0.3) {
      signal = 'buy';
      confidence = Math.min(95, 50 + (buyRatio * 45));
    } else if (sellScore > buyScore && sellScore >= maxScore * 0.3) {
      signal = 'sell';
      confidence = Math.min(95, 50 + (sellRatio * 45));
    } else {
      signal = 'hold';
      confidence = Math.max(0, 20 - (Math.abs(buyScore - sellScore) / maxScore * 20));
    }

    if (reasons.length === 0) {
      reasons.push('ไม่มีสัญญาณชัดเจนจาก Profit Maximization Algorithm');
    }

    // เพิ่มข้อมูล Kelly Criterion recommendation
    if (signal !== 'hold') {
      const kellyFraction = this.calculateKellyCriterion(confidence / 100, riskReward.ratio || 2);
      reasons.push(`🎯 Kelly Criterion: แนะนำใช้ ${(kellyFraction * 100).toFixed(1)}% ของเงินทุน (Win Rate: ${(confidence).toFixed(1)}%, R:R: ${(riskReward.ratio || 2).toFixed(2)}:1)`);
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reasons,
      algorithm: this.name,
      buyScore,
      sellScore,
      riskReward: riskReward.ratio,
      kellyFraction: signal !== 'hold' ? this.calculateKellyCriterion(confidence / 100, riskReward.ratio || 2) : 0,
    };
  }

  /**
   * วิเคราะห์เทรนด์แบบ Multi-Timeframe
   */
  analyzeMultiTimeframeTrend(priceHistory) {
    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];

    // Short-term trend (5 periods)
    const shortTerm = prices.slice(-5);
    const shortTermTrend = (shortTerm[shortTerm.length - 1] - shortTerm[0]) / shortTerm[0];

    // Medium-term trend (15 periods)
    const mediumTerm = prices.slice(-15);
    const mediumTermTrend = mediumTerm.length >= 15 ? (mediumTerm[mediumTerm.length - 1] - mediumTerm[0]) / mediumTerm[0] : 0;

    // Long-term trend (30 periods)
    const longTerm = prices.slice(-30);
    const longTermTrend = longTerm.length >= 30 ? (longTerm[longTerm.length - 1] - longTerm[0]) / longTerm[0] : 0;

    // คำนวณ strength และ direction
    const trends = [shortTermTrend, mediumTermTrend, longTermTrend].filter(t => !isNaN(t));
    const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
    const trendVariance = trends.reduce((sum, t) => sum + Math.pow(t - avgTrend, 2), 0) / trends.length;
    const trendStrength = 1 - Math.min(1, trendVariance * 100); // ยิ่ง variance น้อย = strength สูง

    return {
      direction: avgTrend > 0.001 ? 'up' : avgTrend < -0.001 ? 'down' : 'neutral',
      strength: Math.min(1, Math.abs(avgTrend) * 100 + trendStrength * 0.5),
      shortTerm,
      mediumTerm,
      longTerm,
    };
  }

  /**
   * คำนวณ Risk-Reward Ratio
   */
  calculateRiskRewardRatio(priceHistory, indicators, currentPrice) {
    const prices = priceHistory.map(h => h.price);
    
    // หา Support และ Resistance
    const recentHigh = Math.max(...prices.slice(-20));
    const recentLow = Math.min(...prices.slice(-20));
    const avgPrice = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);

    // ใช้ Bollinger Bands ถ้ามี
    let support = recentLow;
    let resistance = recentHigh;
    
    if (indicators.bollinger) {
      support = Math.min(support, indicators.bollinger.lower);
      resistance = Math.max(resistance, indicators.bollinger.upper);
    }

    // คำนวณ Risk-Reward สำหรับ Buy
    const buyStopLoss = support * 0.995; // 0.5% below support
    const buyTarget = resistance * 1.01; // 1% above resistance
    const buyRisk = currentPrice - buyStopLoss;
    const buyReward = buyTarget - currentPrice;
    const buyRR = buyRisk > 0 ? buyReward / buyRisk : 0;

    // คำนวณ Risk-Reward สำหรับ Sell
    const sellStopLoss = resistance * 1.005; // 0.5% above resistance
    const sellTarget = support * 0.99; // 1% below support
    const sellRisk = sellStopLoss - currentPrice;
    const sellReward = currentPrice - sellTarget;
    const sellRR = sellRisk > 0 ? sellReward / sellRisk : 0;

    if (buyRR > sellRR && buyRR >= 2.0) {
      return {
        signal: 'buy',
        ratio: buyRR,
        stopLoss: buyStopLoss,
        target: buyTarget,
      };
    } else if (sellRR > buyRR && sellRR >= 2.0) {
      return {
        signal: 'sell',
        ratio: sellRR,
        stopLoss: sellStopLoss,
        target: sellTarget,
      };
    }

    return {
      signal: 'hold',
      ratio: Math.max(buyRR, sellRR),
      stopLoss: buyRR > sellRR ? buyStopLoss : sellStopLoss,
      target: buyRR > sellRR ? buyTarget : sellTarget,
    };
  }

  /**
   * Optimize Entry Timing
   */
  optimizeEntryTiming(priceHistory, indicators, currentPrice) {
    const prices = priceHistory.map(h => h.price);
    let score = 0;
    let signal = 'hold';

    // 1. ตรวจสอบว่าราคาอยู่ใกล้ Support/Resistance หรือไม่
    const recentHigh = Math.max(...prices.slice(-20));
    const recentLow = Math.min(...prices.slice(-20));
    const priceRange = recentHigh - recentLow;
    
    if (priceRange > 0) {
      const pricePosition = (currentPrice - recentLow) / priceRange;
      
      // ถ้าราคาอยู่ใกล้ support (0-0.2) → โอกาสซื้อดี
      if (pricePosition < 0.2) {
        score += 0.4;
        signal = 'buy';
      }
      // ถ้าราคาอยู่ใกล้ resistance (0.8-1.0) → โอกาสขายดี
      else if (pricePosition > 0.8) {
        score += 0.4;
        signal = 'sell';
      }
    }

    // 2. ตรวจสอบ RSI
    if (indicators.rsi) {
      if (indicators.rsi < 35) {
        score += 0.3;
        if (signal === 'hold') signal = 'buy';
      } else if (indicators.rsi > 65) {
        score += 0.3;
        if (signal === 'hold') signal = 'sell';
      }
    }

    // 3. ตรวจสอบ Bollinger Bands
    if (indicators.bollinger) {
      const { upper, lower } = indicators.bollinger;
      const bandWidth = upper - lower;
      if (bandWidth > 0) {
        const pricePosition = (currentPrice - lower) / bandWidth;
        if (pricePosition < 0.2) {
          score += 0.3;
          if (signal === 'hold') signal = 'buy';
        } else if (pricePosition > 0.8) {
          score += 0.3;
          if (signal === 'hold') signal = 'sell';
        }
      }
    }

    return {
      signal,
      score: Math.min(1, score),
    };
  }

  /**
   * วิเคราะห์สัญญาณตาม Volatility
   */
  analyzeVolatilityAdjustedSignal(priceHistory, indicators, currentPrice) {
    const prices = priceHistory.map(h => h.price);
    
    // คำนวณ volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;

    let signal = 'hold';
    let confidence = 0;

    // ถ้า volatility ต่ำ → โอกาสซื้อดี (ราคาเสถียร)
    if (volatility < 2 && indicators.rsi && indicators.rsi < 50) {
      signal = 'buy';
      confidence = 0.8;
    }
    // ถ้า volatility สูง → โอกาสขายดี (ราคาผันผวน)
    else if (volatility > 5 && indicators.rsi && indicators.rsi > 50) {
      signal = 'sell';
      confidence = 0.8;
    }

    return {
      signal,
      confidence,
      volatility,
    };
  }

  /**
   * วิเคราะห์ Momentum
   */
  analyzeMomentum(priceHistory, indicators) {
    const prices = priceHistory.map(h => h.price);
    
    // คำนวณ momentum จาก price change
    const shortMomentum = prices.length >= 5 
      ? (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5]
      : 0;
    const longMomentum = prices.length >= 15
      ? (prices[prices.length - 1] - prices[prices.length - 15]) / prices[prices.length - 15]
      : 0;

    const avgMomentum = (shortMomentum + longMomentum) / 2;
    const momentumStrength = Math.abs(avgMomentum) * 100;

    return {
      direction: avgMomentum > 0 ? 'up' : 'down',
      strength: Math.min(1, momentumStrength),
    };
  }

  /**
   * ตรวจจับ Breakout
   */
  detectBreakout(priceHistory, currentPrice) {
    const prices = priceHistory.map(h => h.price);
    
    if (prices.length < 20) {
      return { detected: false };
    }

    // หา Support และ Resistance
    const recent20 = prices.slice(-20);
    const support = Math.min(...recent20);
    const resistance = Math.max(...recent20);
    const avgPrice = recent20.reduce((a, b) => a + b, 0) / recent20.length;

    // ตรวจสอบ Bullish Breakout
    if (currentPrice > resistance * 1.002) { // Break above resistance by 0.2%
      return {
        detected: true,
        direction: 'up',
        level: resistance,
      };
    }

    // ตรวจสอบ Bearish Breakdown
    if (currentPrice < support * 0.998) { // Break below support by 0.2%
      return {
        detected: true,
        direction: 'down',
        level: support,
      };
    }

    return { detected: false };
  }

  /**
   * ตรวจสอบ Indicator Confluence
   */
  checkIndicatorConfluence(indicators, currentPrice) {
    let buySignals = 0;
    let sellSignals = 0;

    // RSI
    if (indicators.rsi) {
      if (indicators.rsi < 40) buySignals++;
      else if (indicators.rsi > 60) sellSignals++;
    }

    // MACD
    if (indicators.macd && indicators.macdSignal) {
      if (indicators.macd > indicators.macdSignal && indicators.macd > 0) buySignals++;
      else if (indicators.macd < indicators.macdSignal && indicators.macd < 0) sellSignals++;
    }

    // Bollinger Bands
    if (indicators.bollinger) {
      const { upper, lower, middle } = indicators.bollinger;
      if (currentPrice < lower) buySignals++;
      else if (currentPrice > upper) sellSignals++;
    }

    // Moving Averages
    if (indicators.ma10 && indicators.ma20) {
      if (currentPrice > indicators.ma10 && indicators.ma10 > indicators.ma20) buySignals++;
      else if (currentPrice < indicators.ma10 && indicators.ma10 < indicators.ma20) sellSignals++;
    }

    return {
      buySignals,
      sellSignals,
    };
  }

  /**
   * คำนวณ Kelly Criterion
   * f* = (p * b - q) / b
   * f* = fraction of capital to bet
   * p = probability of winning
   * q = probability of losing (1 - p)
   * b = odds (risk-reward ratio)
   */
  calculateKellyCriterion(winProbability, riskRewardRatio) {
    if (winProbability <= 0 || riskRewardRatio <= 0) return 0;
    
    const q = 1 - winProbability;
    const b = riskRewardRatio;
    const kelly = (winProbability * b - q) / b;
    
    // จำกัด Kelly fraction ระหว่าง 0.01 (1%) ถึง 0.25 (25%) เพื่อความปลอดภัย
    return Math.max(0.01, Math.min(0.25, kelly));
  }
}

module.exports = ProfitMaximizationAlgorithm;

