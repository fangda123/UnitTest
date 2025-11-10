const CryptoPrice = require('../models/CryptoPrice');
const MarketStats = require('../models/MarketStats');
const logger = require('../utils/logger');

/**
 * Market Stats Aggregator Service
 * คำนวณสถิติตลาดแยกตามหมวดหมู่ (24h, 7d, 30d, all)
 */
class MarketStatsAggregator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * คำนวณราคาเฉลี่ย
   */
  calculateAverage(prices) {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / prices.length;
  }

  /**
   * คำนวณ Standard Deviation (Volatility)
   */
  calculateVolatility(prices, mean) {
    if (prices.length === 0) return 0;
    const squaredDiffs = prices.map((price) => Math.pow(price - mean, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * คำนวณสถิติตลาดตามหมวดหมู่
   */
  async calculateMarketStats(symbol, category) {
    try {
      logger.info(`[Market Stats Aggregator] กำลังคำนวณสถิติตลาด ${symbol} หมวดหมู่ ${category}`);

      // กำหนดช่วงเวลา
      const now = new Date();
      let startDate;

      switch (category) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0); // เริ่มต้นจากจุดเริ่มต้น
          break;
        default:
          throw new Error(`หมวดหมู่ไม่ถูกต้อง: ${category}`);
      }

      // ดึงข้อมูลราคาในช่วงเวลาที่กำหนด
      const prices = await CryptoPrice.find({
        symbol: symbol.toUpperCase(),
        createdAt: { $gte: startDate },
      }).sort({ createdAt: 1 });

      if (prices.length === 0) {
        logger.warn(`[Market Stats Aggregator] ไม่พบข้อมูลราคา ${symbol} ในช่วงเวลาที่กำหนด`);
        return null;
      }

      // ดึงราคาปัจจุบัน
      const currentPrice = prices[prices.length - 1].price;

      // คำนวณค่าต่างๆ
      const priceValues = prices.map((p) => p.price);
      const highestPrice = Math.max(...priceValues);
      const lowestPrice = Math.min(...priceValues);
      const averagePrice = this.calculateAverage(priceValues);
      const totalVolume = prices.reduce((sum, p) => sum + (p.volume24h || 0), 0);
      const volatility = this.calculateVolatility(priceValues, averagePrice);

      // คำนวณการเปลี่ยนแปลงราคา
      const firstPrice = prices[0].price;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;

      // นับจำนวนครั้งที่ราคาเพิ่มขึ้น/ลดลง
      let priceIncreaseCount = 0;
      let priceDecreaseCount = 0;

      for (let i = 1; i < prices.length; i++) {
        if (prices[i].price > prices[i - 1].price) {
          priceIncreaseCount++;
        } else if (prices[i].price < prices[i - 1].price) {
          priceDecreaseCount++;
        }
      }

      // สร้างข้อมูลสถิติ
      const stats = {
        symbol: symbol.toUpperCase(),
        category,
        calculatedAt: now,
        currentPrice,
        highestPrice,
        lowestPrice,
        averagePrice,
        totalVolume,
        priceChangePercent,
        priceChange,
        priceIncreaseCount,
        priceDecreaseCount,
        volatility,
        metadata: {
          startDate,
          endDate: now,
          dataCount: prices.length,
        },
      };

      // บันทึกลงฐานข้อมูล
      await MarketStats.create(stats);

      logger.info(`[Market Stats Aggregator] ✅ คำนวณสถิติตลาด ${symbol} หมวดหมู่ ${category} สำเร็จ`);

      return stats;
    } catch (error) {
      logger.error(`[Market Stats Aggregator] ❌ เกิดข้อผิดพลาดในการคำนวณสถิติตลาด ${symbol} หมวดหมู่ ${category}:`, error.message);
      throw error;
    }
  }

  /**
   * คำนวณสถิติทั้งหมดสำหรับ symbol
   */
  async calculateAllStats(symbol) {
    try {
      logger.info(`[Market Stats Aggregator] กำลังคำนวณสถิติทั้งหมดสำหรับ ${symbol}`);

      const results = {
        '24h': await this.calculateMarketStats(symbol, '24h'),
        '7d': await this.calculateMarketStats(symbol, '7d'),
        '30d': await this.calculateMarketStats(symbol, '30d'),
        all: await this.calculateMarketStats(symbol, 'all'),
      };

      logger.info(`[Market Stats Aggregator] ✅ คำนวณสถิติทั้งหมดสำหรับ ${symbol} สำเร็จ`);
      return results;
    } catch (error) {
      logger.error(`[Market Stats Aggregator] ❌ เกิดข้อผิดพลาดในการคำนวณสถิติทั้งหมดสำหรับ ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * เริ่มต้นการคำนวณสถิติอัตโนมัติ
   */
  start(symbols = [], intervalMinutes = 60) {
    if (this.isRunning) {
      logger.warn('[Market Stats Aggregator] ⚠️  Market Stats Aggregator กำลังทำงานอยู่แล้ว');
      return;
    }

    logger.info(`[Market Stats Aggregator] 🚀 เริ่มต้น Market Stats Aggregator (อัพเดททุก ${intervalMinutes} นาที)`);
    this.isRunning = true;

    // คำนวณทันที
    this.calculateForAllSymbols(symbols).catch((error) => {
      logger.error('[Market Stats Aggregator] เกิดข้อผิดพลาดในการคำนวณสถิติครั้งแรก:', error.message);
    });

    // ตั้ง interval
    this.intervalId = setInterval(async () => {
      try {
        await this.calculateForAllSymbols(symbols);
      } catch (error) {
        logger.error('[Market Stats Aggregator] เกิดข้อผิดพลาดในการคำนวณสถิติ:', error.message);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * คำนวณสถิติสำหรับทุก symbols
   */
  async calculateForAllSymbols(symbols) {
    for (const symbol of symbols) {
      try {
        await this.calculateAllStats(symbol);
      } catch (error) {
        logger.error(`[Market Stats Aggregator] เกิดข้อผิดพลาดในการคำนวณสถิติ ${symbol}:`, error.message);
      }
    }
  }

  /**
   * หยุดการคำนวณสถิติอัตโนมัติ
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[Market Stats Aggregator] 🛑 หยุด Market Stats Aggregator');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * ดึงสถานะการทำงาน
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
    };
  }
}

// สร้าง instance เดียว (Singleton pattern)
const marketStatsAggregator = new MarketStatsAggregator();

module.exports = marketStatsAggregator;

