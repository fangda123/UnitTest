const BaseAlgorithm = require('./baseAlgorithm');

/**
 * Technical Analysis Algorithm
 * ใช้การวิเคราะห์ทางเทคนิคแบบ Multi-Timeframe และ Multiple Indicators
 */
class TechnicalAlgorithm extends BaseAlgorithm {
  constructor() {
    super(
      'Technical Analysis',
      'Multi-timeframe technical analysis with MA, RSI, MACD, Bollinger Bands confluence'
    );
  }

  calculateSignal(priceHistory, indicators, marketData) {
    if (!priceHistory || priceHistory.length < 20) {
      return {
        signal: 'hold',
        confidence: 0,
        reasons: ['ข้อมูลไม่เพียงพอสำหรับการวิเคราะห์ทางเทคนิค'],
      };
    }

    const reasons = [];
    let buySignals = 0;
    let sellSignals = 0;
    let totalConfidence = 0;

    // 1. Moving Average Alignment (20 points)
    if (indicators.ma10 && indicators.ma20 && indicators.ma50) {
      const maAlignment = this.checkMAAlignment(indicators);
      if (maAlignment === 'bullish') {
        buySignals += 3;
        reasons.push('✅ MA Alignment: Bullish (MA10 > MA20 > MA50)');
      } else if (maAlignment === 'bearish') {
        sellSignals += 3;
        reasons.push('❌ MA Alignment: Bearish (MA10 < MA20 < MA50)');
      }
    }

    // 2. RSI Analysis (15 points)
    if (indicators.rsi) {
      const rsiSignal = this.analyzeRSI(indicators.rsi);
      if (rsiSignal === 'buy') {
        buySignals += 2;
        reasons.push(`✅ RSI: ${indicators.rsi.toFixed(2)} (Oversold - โอกาสซื้อ)`);
      } else if (rsiSignal === 'sell') {
        sellSignals += 2;
        reasons.push(`❌ RSI: ${indicators.rsi.toFixed(2)} (Overbought - โอกาสขาย)`);
      }
    }

    // 3. MACD Analysis (15 points)
    if (indicators.macd && indicators.macdSignal) {
      const macdSignal = this.analyzeMACD(indicators.macd, indicators.macdSignal);
      if (macdSignal === 'buy') {
        buySignals += 2;
        reasons.push('✅ MACD: Bullish crossover');
      } else if (macdSignal === 'sell') {
        sellSignals += 2;
        reasons.push('❌ MACD: Bearish crossover');
      }
    }

    // 4. Bollinger Bands (10 points)
    if (indicators.bollinger) {
      const bbSignal = this.analyzeBollingerBands(
        priceHistory[priceHistory.length - 1].price,
        indicators.bollinger
      );
      if (bbSignal === 'buy') {
        buySignals += 1;
        reasons.push('✅ Bollinger Bands: Price near lower band (Oversold)');
      } else if (bbSignal === 'sell') {
        sellSignals += 1;
        reasons.push('❌ Bollinger Bands: Price near upper band (Overbought)');
      }
    }

    // 5. Volume Analysis (10 points)
    if (indicators.volume) {
      const volumeSignal = this.analyzeVolume(priceHistory, indicators.volume);
      if (volumeSignal === 'buy') {
        buySignals += 1;
        reasons.push('✅ Volume: Increasing volume on uptrend');
      } else if (volumeSignal === 'sell') {
        sellSignals += 1;
        reasons.push('❌ Volume: Increasing volume on downtrend');
      }
    }

    // 6. Price Action - Trend (10 points)
    const trendSignal = this.analyzeTrend(priceHistory);
    if (trendSignal === 'buy') {
      buySignals += 1;
      reasons.push('✅ Trend: Strong uptrend detected');
    } else if (trendSignal === 'sell') {
      sellSignals += 1;
      reasons.push('❌ Trend: Strong downtrend detected');
    }

    // 7. Support/Resistance Levels (10 points)
    const srSignal = this.analyzeSupportResistance(priceHistory);
    if (srSignal === 'buy') {
      buySignals += 1;
      reasons.push('✅ Support/Resistance: Price near support level');
    } else if (srSignal === 'sell') {
      sellSignals += 1;
      reasons.push('❌ Support/Resistance: Price near resistance level');
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
      reasons.push('ไม่มีสัญญาณชัดเจนจาก Technical Analysis');
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

  checkMAAlignment(indicators) {
    if (indicators.ma10 > indicators.ma20 && indicators.ma20 > indicators.ma50) {
      return 'bullish';
    } else if (indicators.ma10 < indicators.ma20 && indicators.ma20 < indicators.ma50) {
      return 'bearish';
    }
    return 'neutral';
  }

  analyzeRSI(rsi) {
    if (rsi < 30) {
      return 'buy';
    } else if (rsi > 70) {
      return 'sell';
    }
    return 'hold';
  }

  analyzeMACD(macd, macdSignal) {
    if (macd > macdSignal && macd > 0) {
      return 'buy';
    } else if (macd < macdSignal && macd < 0) {
      return 'sell';
    }
    return 'hold';
  }

  analyzeBollingerBands(currentPrice, bollinger) {
    const { upper, middle, lower } = bollinger;
    const bandWidth = upper - lower;
    const pricePosition = (currentPrice - lower) / bandWidth;

    if (pricePosition < 0.2) {
      return 'buy';
    } else if (pricePosition > 0.8) {
      return 'sell';
    }
    return 'hold';
  }

  analyzeVolume(priceHistory, currentVolume) {
    if (priceHistory.length < 10) return 'hold';

    const recentVolumes = priceHistory.slice(-10).map(h => h.volume || 0);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    const recentPrices = priceHistory.slice(-5).map(h => h.price);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    if (currentVolume > avgVolume * 1.2 && priceChange > 0) {
      return 'buy';
    } else if (currentVolume > avgVolume * 1.2 && priceChange < 0) {
      return 'sell';
    }
    return 'hold';
  }

  analyzeTrend(priceHistory) {
    if (priceHistory.length < 10) return 'hold';

    const recentPrices = priceHistory.slice(-10).map(h => h.price);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (changePercent > 2) {
      return 'buy';
    } else if (changePercent < -2) {
      return 'sell';
    }
    return 'hold';
  }

  analyzeSupportResistance(priceHistory) {
    if (priceHistory.length < 20) return 'hold';

    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];
    const recentHigh = Math.max(...prices.slice(-20));
    const recentLow = Math.min(...prices.slice(-20));

    const distanceToHigh = (recentHigh - currentPrice) / recentHigh;
    const distanceToLow = (currentPrice - recentLow) / recentLow;

    if (distanceToLow < 0.01) {
      return 'buy';
    } else if (distanceToHigh < 0.01) {
      return 'sell';
    }
    return 'hold';
  }
}

module.exports = TechnicalAlgorithm;

