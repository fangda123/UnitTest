const axios = require('axios');
const TradingData = require('../../models/TradingData');
const tradingService = require('../../services/tradingService');
const { setCache } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Trading Data Collector Microservice
 * เก็บข้อมูลราคาและคำนวณสถิติเชิงลึกสำหรับเหรียญที่เลือก
 * รองรับหลาย symbols พร้อมกัน
 */
class TradingDataCollector {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.activeSymbols = new Set(['BTCUSDT']); // ใช้แค่ BTCUSDT เท่านั้น
    this.isRunning = false;
    this.intervalIds = new Map(); // เก็บ interval ID สำหรับแต่ละ symbol
    this.updateInterval = parseInt(process.env.TRADING_DATA_INTERVAL) || 10000; // เพิ่มเป็น 10 วินาทีเพื่อลด delay
    this.lastSaveTimes = new Map(); // เก็บเวลาบันทึกล่าสุดสำหรับแต่ละ symbol
  }

  /**
   * เพิ่ม symbol สำหรับเก็บข้อมูล
   */
  addSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (!this.activeSymbols.has(upperSymbol)) {
      this.activeSymbols.add(upperSymbol);
      logger.info(`[Trading Data Collector] ➕ เพิ่ม symbol: ${upperSymbol}`);
      
      // เริ่มเก็บข้อมูลสำหรับ symbol ใหม่
      if (this.isRunning) {
        this.startCollectingForSymbol(upperSymbol);
      }
    }
  }

  /**
   * ลบ symbol ออกจาก collection
   */
  removeSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (this.activeSymbols.has(upperSymbol)) {
      this.activeSymbols.delete(upperSymbol);
      logger.info(`[Trading Data Collector] ➖ ลบ symbol: ${upperSymbol}`);
      
      // หยุดเก็บข้อมูลสำหรับ symbol นี้
      this.stopCollectingForSymbol(upperSymbol);
    }
  }

  /**
   * เริ่มเก็บข้อมูลสำหรับ symbol หนึ่ง
   */
  startCollectingForSymbol(symbol) {
    if (this.intervalIds.has(symbol)) {
      return; // กำลังทำงานอยู่แล้ว
    }

    // เก็บข้อมูลทันที
    this.collectDataForSymbol(symbol);

    // ตั้ง interval สำหรับ symbol นี้
    const intervalId = setInterval(() => {
      this.collectDataForSymbol(symbol);
    }, this.updateInterval);

    this.intervalIds.set(symbol, intervalId);
  }

  /**
   * หยุดเก็บข้อมูลสำหรับ symbol หนึ่ง
   */
  stopCollectingForSymbol(symbol) {
    const intervalId = this.intervalIds.get(symbol);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(symbol);
    }
  }

  /**
   * เริ่มต้นการเก็บข้อมูลสำหรับทุก active symbols
   */
  start() {
    if (this.isRunning) {
      logger.warn('[Trading Data Collector] กำลังทำงานอยู่แล้ว');
      return;
    }

    this.isRunning = true;
    logger.info(`[Trading Data Collector] 🚀 เริ่มต้นการเก็บข้อมูลสำหรับ ${this.activeSymbols.size} symbols: ${Array.from(this.activeSymbols).join(', ')}`);

    // เริ่มเก็บข้อมูลสำหรับทุก symbol
    this.activeSymbols.forEach(symbol => {
      this.startCollectingForSymbol(symbol);
    });
  }

  /**
   * หยุดการเก็บข้อมูลทั้งหมด
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // หยุดทุก intervals
    this.intervalIds.forEach((intervalId, symbol) => {
      clearInterval(intervalId);
    });
    this.intervalIds.clear();

    logger.info('[Trading Data Collector] ⏹️ หยุดการเก็บข้อมูลทั้งหมด');
  }

  /**
   * เก็บข้อมูลราคาและคำนวณสถิติสำหรับ symbol หนึ่ง
   */
  async collectDataForSymbol(symbol) {
    try {
      // ดึงราคาปัจจุบันและคำนวณสัญญาณ
      const { price, signal } = await tradingService.updatePriceAndCalculateSignal(symbol);
      
      // ดึงข้อมูลเพิ่มเติมจาก Binance
      const tickerData = await this.getTickerData(symbol);
      
      // ดึงประวัติราคา
      const priceHistory = tradingService.getPriceHistory(symbol, 100);
      
      // คำนวณสถิติเชิงลึก
      const statistics = await this.calculateStatistics(priceHistory, tickerData);
      
      // ดึง indicators จาก trading service
      const history = tradingService.getPriceHistory(symbol, 50);
      const indicators = this.calculateIndicators(history, price);
      
      // เก็บข้อมูลลงฐานข้อมูล (เก็บทุก 30 วินาทีเพื่อไม่ให้ข้อมูลเยอะเกินไป)
      const now = Date.now();
      const lastSaveTime = this.lastSaveTimes.get(symbol) || 0;
      
      if (now - lastSaveTime >= 30000) { // เก็บทุก 30 วินาที
        const tradingData = await TradingData.create({
          symbol,
          price,
          indicators,
          signal: {
            signal: signal.signal,
            confidence: signal.confidence,
            buySignals: signal.buySignals || 0,
            sellSignals: signal.sellSignals || 0,
            reasons: signal.reasons || [],
          },
          statistics,
          timestamp: new Date(),
        });

        // เก็บใน cache
        const cacheKey = `trading:data:${symbol}:latest`;
        await setCache(cacheKey, tradingData.toObject(), 60);

        this.lastSaveTimes.set(symbol, now);
        logger.info(`[Trading Data Collector] ✅ เก็บข้อมูล ${symbol} สำเร็จ: $${price.toFixed(2)}`);
      } else {
        // อัพเดท cache เท่านั้น
        const cacheKey = `trading:data:${symbol}:latest`;
        await setCache(cacheKey, {
          symbol,
          price,
          indicators,
          signal: {
            signal: signal.signal,
            confidence: signal.confidence,
            buySignals: signal.buySignals || 0,
            sellSignals: signal.sellSignals || 0,
            reasons: signal.reasons || [],
          },
          statistics,
          timestamp: new Date(),
        }, 60);
      }
    } catch (error) {
      logger.error(`[Trading Data Collector] ❌ Error collecting data for ${symbol}:`, error.message);
    }
  }

  /**
   * ดึงข้อมูล ticker จาก Binance
   */
  async getTickerData(symbol) {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/24hr`, {
        params: { symbol },
        timeout: 5000,
      });

      return {
        high24h: parseFloat(response.data.highPrice),
        low24h: parseFloat(response.data.lowPrice),
        volume24h: parseFloat(response.data.volume),
        priceChange24h: parseFloat(response.data.priceChange),
        priceChangePercent24h: parseFloat(response.data.priceChangePercent),
      };
    } catch (error) {
      logger.error(`[Trading Data Collector] ❌ Error fetching ticker:`, error.message);
      return null;
    }
  }

  /**
   * คำนวณสถิติเชิงลึก
   */
  async calculateStatistics(priceHistory, tickerData) {
    if (priceHistory.length < 2) {
      return {};
    }

    const prices = priceHistory.map(h => h.price);
    const recentPrices = prices.slice(-24); // 24 ชั่วโมงล่าสุด
    const weekPrices = prices.slice(-168); // 7 วันล่าสุด

    // คำนวณ volatility
    const volatility24h = this.calculateVolatility(recentPrices);
    const volatility7d = weekPrices.length > 0 ? this.calculateVolatility(weekPrices) : null;

    // คำนวณ price range
    const priceRange24h = recentPrices.length > 0 
      ? Math.max(...recentPrices) - Math.min(...recentPrices)
      : null;
    const priceRange7d = weekPrices.length > 0
      ? Math.max(...weekPrices) - Math.min(...weekPrices)
      : null;

    // คำนวณ volume
    const volume24h = tickerData?.volume24h || 0;
    const volume7d = volume24h * 7; // ประมาณ

    return {
      high24h: tickerData?.high24h || Math.max(...recentPrices),
      low24h: tickerData?.low24h || Math.min(...recentPrices),
      high7d: weekPrices.length > 0 ? Math.max(...weekPrices) : null,
      low7d: weekPrices.length > 0 ? Math.min(...weekPrices) : null,
      volume24h,
      volume7d,
      volatility24h,
      volatility7d,
      priceRange24h,
      priceRange7d,
    };
  }

  /**
   * คำนวณ Volatility (Standard Deviation)
   */
  calculateVolatility(prices) {
    if (prices.length < 2) {
      return 0;
    }

    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  /**
   * คำนวณ Indicators
   */
  calculateIndicators(history, currentPrice) {
    if (history.length < 26) {
      return {};
    }

    const ma20 = tradingService.calculateMA(history, 20);
    const ma50 = tradingService.calculateMA(history, 50);
    const ma100 = history.length >= 100 ? tradingService.calculateMA(history, 100) : null;
    const ema12 = tradingService.calculateEMA(history, 12);
    const ema26 = tradingService.calculateEMA(history, 26);
    const rsi = tradingService.calculateRSI(history, 14);
    const macd = tradingService.calculateMACD(history);

    // Bollinger Bands
    const bollinger = this.calculateBollingerBands(history, 20);

    return {
      ma20: ma20 ? ma20.toFixed(2) : null,
      ma50: ma50 ? ma50.toFixed(2) : null,
      ma100: ma100 ? ma100.toFixed(2) : null,
      ema12: ema12 ? ema12.toFixed(2) : null,
      ema26: ema26 ? ema26.toFixed(2) : null,
      rsi: rsi ? rsi.toFixed(2) : null,
      macd: macd ? {
        macd: macd.macd.toFixed(4),
        signal: macd.signal.toFixed(4),
        histogram: macd.histogram.toFixed(4),
      } : null,
      bollinger: bollinger ? {
        upper: bollinger.upper.toFixed(2),
        middle: bollinger.middle.toFixed(2),
        lower: bollinger.lower.toFixed(2),
      } : null,
    };
  }

  /**
   * คำนวณ Bollinger Bands
   */
  calculateBollingerBands(history, period = 20, stdDev = 2) {
    if (history.length < period) {
      return null;
    }

    const ma = tradingService.calculateMA(history, period);
    if (!ma) {
      return null;
    }

    const recentPrices = history.slice(-period);
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p.price - ma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: ma + (standardDeviation * stdDev),
      middle: ma,
      lower: ma - (standardDeviation * stdDev),
    };
  }

  /**
   * ดึงข้อมูลล่าสุด
   */
  async getLatestData(symbol, limit = 100) {
    return TradingData.getLatest(symbol, limit);
  }

  /**
   * ดึงสถิติรวม
   */
  async getStatistics(symbol) {
    const latest = await TradingData.findOne({ symbol })
      .sort({ timestamp: -1 })
      .lean();

    const count = await TradingData.countDocuments({ symbol });

    return {
      latest,
      totalRecords: count,
    };
  }

  /**
   * รับรายการ active symbols
   */
  getActiveSymbols() {
    return Array.from(this.activeSymbols);
  }
}

// สร้าง instance เดียว (Singleton pattern)
const tradingDataCollector = new TradingDataCollector();

module.exports = tradingDataCollector;

