const axios = require('axios');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');

/**
 * Trading Service
 * คำนวณสัญญาณการเทรดอัตโนมัติจากข้อมูลราคา
 */
class TradingService {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.priceHistory = new Map(); // เก็บประวัติราคา
    this.maxHistorySize = 100; // เก็บราคา 100 ครั้งล่าสุด
  }

  /**
   * ดึงข้อมูลราคาปัจจุบัน
   */
  async getCurrentPrice(symbol = 'BTCUSDT') {
    try {
      const cacheKey = `crypto:price:${symbol}`;
      const cached = await getCache(cacheKey);
      
      if (cached) {
        return cached.price;
      }

      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/price`, {
        params: { symbol },
        timeout: 5000,
      });

      return parseFloat(response.data.price);
    } catch (error) {
      logger.error(`[Trading Service] ❌ ไม่สามารถดึงราคา ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * เพิ่มราคาเข้า history
   */
  addPriceToHistory(symbol, price) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol);
    history.push({
      price,
      timestamp: Date.now(),
    });

    // เก็บแค่ maxHistorySize ล่าสุด
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * คำนวณ Moving Average (MA)
   */
  calculateMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, p) => acc + p.price, 0);
    return sum / period;
  }

  /**
   * คำนวณ RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return null;
    }

    const recentPrices = prices.slice(-period - 1);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < recentPrices.length; i++) {
      const change = recentPrices[i].price - recentPrices[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * คำนวณ MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices) {
    if (prices.length < 26) {
      return null;
    }

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    if (!ema12 || !ema26) {
      return null;
    }

    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMAFromValue(prices, macdLine, 9);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - (signalLine || 0),
    };
  }

  /**
   * คำนวณ EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    const recentPrices = prices.slice(-period);
    
    // เริ่มต้นด้วย SMA
    let ema = recentPrices.slice(0, period).reduce((sum, p) => sum + p.price, 0) / period;

    // คำนวณ EMA
    for (let i = period; i < recentPrices.length; i++) {
      ema = (recentPrices[i].price * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * คำนวณ EMA จากค่าเริ่มต้น
   */
  calculateEMAFromValue(prices, startValue, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    let ema = startValue;

    const recentPrices = prices.slice(-period);
    for (const price of recentPrices) {
      ema = (price.price * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * คำนวณสัญญาณการเทรด
   * @returns {Object} { signal: 'buy'|'sell'|'hold', confidence: 0-100, indicators: {...} }
   */
  calculateTradingSignal(symbol = 'BTCUSDT') {
    const history = this.priceHistory.get(symbol) || [];
    
    if (history.length < 26) {
      return {
        signal: 'hold',
        confidence: 0,
        reason: 'ข้อมูลไม่เพียงพอ',
        indicators: {},
      };
    }

    const currentPrice = history[history.length - 1].price;
    const ma20 = this.calculateMA(history, 20);
    const ma50 = this.calculateMA(history, 50);
    const rsi = this.calculateRSI(history, 14);
    const macd = this.calculateMACD(history);

    let buySignals = 0;
    let sellSignals = 0;
    const reasons = [];

    // สัญญาณ 1: Moving Average Crossover
    if (ma20 && ma50) {
      if (ma20 > ma50 && currentPrice > ma20) {
        buySignals += 2;
        reasons.push('MA20 อยู่เหนือ MA50 และราคาอยู่เหนือ MA20');
      } else if (ma20 < ma50 && currentPrice < ma20) {
        sellSignals += 2;
        reasons.push('MA20 อยู่ใต้ MA50 และราคาอยู่ใต้ MA20');
      }
    }

    // สัญญาณ 2: RSI
    if (rsi !== null) {
      if (rsi < 30) {
        buySignals += 2;
        reasons.push(`RSI ต่ำเกินไป (${rsi.toFixed(2)}) - อาจจะ oversold`);
      } else if (rsi > 70) {
        sellSignals += 2;
        reasons.push(`RSI สูงเกินไป (${rsi.toFixed(2)}) - อาจจะ overbought`);
      } else if (rsi < 50 && rsi > 30) {
        buySignals += 1;
        reasons.push(`RSI อยู่ในช่วงต่ำ (${rsi.toFixed(2)})`);
      } else if (rsi > 50 && rsi < 70) {
        sellSignals += 1;
        reasons.push(`RSI อยู่ในช่วงสูง (${rsi.toFixed(2)})`);
      }
    }

    // สัญญาณ 3: MACD
    if (macd) {
      if (macd.macd > macd.signal && macd.histogram > 0) {
        buySignals += 2;
        reasons.push('MACD อยู่เหนือ Signal Line');
      } else if (macd.macd < macd.signal && macd.histogram < 0) {
        sellSignals += 2;
        reasons.push('MACD อยู่ใต้ Signal Line');
      }
    }

    // สัญญาณ 4: Price Trend
    if (history.length >= 5) {
      const recentPrices = history.slice(-5).map(p => p.price);
      const isUptrend = recentPrices.every((price, i) => i === 0 || price >= recentPrices[i - 1]);
      const isDowntrend = recentPrices.every((price, i) => i === 0 || price <= recentPrices[i - 1]);

      if (isUptrend) {
        buySignals += 1;
        reasons.push('ราคามีแนวโน้มขึ้น');
      } else if (isDowntrend) {
        sellSignals += 1;
        reasons.push('ราคามีแนวโน้มลง');
      }
    }

    // กำหนดสัญญาณ
    let signal = 'hold';
    let confidence = 0;

    if (buySignals > sellSignals && buySignals >= 3) {
      signal = 'buy';
      confidence = Math.min(100, (buySignals / 7) * 100);
    } else if (sellSignals > buySignals && sellSignals >= 3) {
      signal = 'sell';
      confidence = Math.min(100, (sellSignals / 7) * 100);
    } else {
      signal = 'hold';
      confidence = 50;
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reasons,
      indicators: {
        currentPrice,
        ma20: ma20 ? ma20.toFixed(2) : null,
        ma50: ma50 ? ma50.toFixed(2) : null,
        rsi: rsi ? rsi.toFixed(2) : null,
        macd: macd ? {
          macd: macd.macd.toFixed(4),
          signal: macd.signal.toFixed(4),
          histogram: macd.histogram.toFixed(4),
        } : null,
      },
      buySignals,
      sellSignals,
    };
  }

  /**
   * อัพเดทราคาและคำนวณสัญญาณ
   */
  async updatePriceAndCalculateSignal(symbol = 'BTCUSDT') {
    try {
      const price = await this.getCurrentPrice(symbol);
      this.addPriceToHistory(symbol, price);
      
      const signal = this.calculateTradingSignal(symbol);
      
      return {
        price,
        signal,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`[Trading Service] ❌ Error updating price:`, error.message);
      throw error;
    }
  }

  /**
   * ดึงประวัติราคา
   */
  getPriceHistory(symbol = 'BTCUSDT', limit = 50) {
    const history = this.priceHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  /**
   * รีเซ็ตประวัติราคา
   */
  resetHistory(symbol = 'BTCUSDT') {
    this.priceHistory.set(symbol, []);
  }
}

// สร้าง instance เดียว (Singleton pattern)
const tradingService = new TradingService();

module.exports = tradingService;

