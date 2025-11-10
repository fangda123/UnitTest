const CryptoPrice = require('../models/CryptoPrice');
const PriceSummary = require('../models/PriceSummary');
const PriceAggregation = require('../models/PriceAggregation');
const logger = require('../utils/logger');

/**
 * Price Aggregator Service
 * คำนวณและสรุปผลราคาแยกตามหมวดหมู่ (hourly, daily, weekly, monthly)
 */
class PriceAggregator {
  constructor() {
    this.isRunning = false;
    this.intervalIds = new Map();
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
   * คำนวณ Standard Deviation (สำหรับ Volatility)
   */
  calculateStandardDeviation(prices, mean) {
    if (prices.length === 0) return 0;
    const squaredDiffs = prices.map((price) => Math.pow(price - mean, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * สรุปผลราคาตามหมวดหมู่
   */
  async aggregateByCategory(symbol, category, startDate, endDate) {
    try {
      logger.info(`[Price Aggregator] กำลังสรุปผล ${symbol} หมวดหมู่ ${category} ตั้งแต่ ${startDate} ถึง ${endDate}`);

      // ดึงข้อมูลราคาในช่วงเวลาที่กำหนด
      const prices = await CryptoPrice.find({
        symbol: symbol.toUpperCase(),
        createdAt: { $gte: startDate, $lte: endDate },
      }).sort({ createdAt: 1 });

      if (prices.length === 0) {
        logger.warn(`[Price Aggregator] ไม่พบข้อมูลราคา ${symbol} ในช่วงเวลาที่กำหนด`);
        return null;
      }

      // คำนวณค่าต่างๆ
      const priceValues = prices.map((p) => p.price);
      const openPrice = prices[0].price;
      const closePrice = prices[prices.length - 1].price;
      const highPrice = Math.max(...priceValues);
      const lowPrice = Math.min(...priceValues);
      const averagePrice = this.calculateAverage(priceValues);
      const totalVolume = prices.reduce((sum, p) => sum + (p.volume24h || 0), 0);
      const priceChange = closePrice - openPrice;
      const priceChangePercent = openPrice !== 0 ? (priceChange / openPrice) * 100 : 0;

      // สร้างข้อมูลสรุปผล
      const summary = {
        symbol: symbol.toUpperCase(),
        category,
        period: startDate,
        openPrice,
        closePrice,
        highPrice,
        lowPrice,
        averagePrice,
        totalVolume,
        dataCount: prices.length,
        priceChangePercent,
        priceChange,
        metadata: {
          startDate,
          endDate,
          calculatedAt: new Date(),
        },
      };

      // บันทึกลงฐานข้อมูล (upsert)
      await PriceSummary.findOneAndUpdate(
        { symbol: symbol.toUpperCase(), category, period: startDate },
        summary,
        { upsert: true, new: true }
      );

      logger.info(`[Price Aggregator] ✅ สรุปผล ${symbol} หมวดหมู่ ${category} สำเร็จ`);

      return summary;
    } catch (error) {
      logger.error(`[Price Aggregator] ❌ เกิดข้อผิดพลาดในการสรุปผล ${symbol} หมวดหมู่ ${category}:`, error.message);
      throw error;
    }
  }

  /**
   * สรุปผลรายชั่วโมง
   */
  async aggregateHourly(symbol) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMinutes(0, 0, 0); // เริ่มต้นชั่วโมง
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    return await this.aggregateByCategory(symbol, 'hourly', startDate, endDate);
  }

  /**
   * สรุปผลรายวัน
   */
  async aggregateDaily(symbol) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // เริ่มต้นวัน
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return await this.aggregateByCategory(symbol, 'daily', startDate, endDate);
  }

  /**
   * สรุปผลรายสัปดาห์
   */
  async aggregateWeekly(symbol) {
    const now = new Date();
    const startDate = new Date(now);
    // เริ่มต้นสัปดาห์ (วันจันทร์)
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return await this.aggregateByCategory(symbol, 'weekly', startDate, endDate);
  }

  /**
   * สรุปผลรายเดือน
   */
  async aggregateMonthly(symbol) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    return await this.aggregateByCategory(symbol, 'monthly', startDate, endDate);
  }

  /**
   * สรุปผลทั้งหมดสำหรับ symbol
   */
  async aggregateAll(symbol) {
    try {
      logger.info(`[Price Aggregator] กำลังสรุปผลทั้งหมดสำหรับ ${symbol}`);
      
      const results = {
        hourly: await this.aggregateHourly(symbol),
        daily: await this.aggregateDaily(symbol),
        weekly: await this.aggregateWeekly(symbol),
        monthly: await this.aggregateMonthly(symbol),
      };

      logger.info(`[Price Aggregator] ✅ สรุปผลทั้งหมดสำหรับ ${symbol} สำเร็จ`);
      return results;
    } catch (error) {
      logger.error(`[Price Aggregator] ❌ เกิดข้อผิดพลาดในการสรุปผลทั้งหมดสำหรับ ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * สร้างข้อมูลการรวมกลุ่มแบบ real-time (สำหรับ minute, hour, day)
   */
  async createAggregation(symbol, aggregationType, timeBucket, priceData) {
    try {
      const existing = await PriceAggregation.findOne({
        symbol: symbol.toUpperCase(),
        aggregationType,
        timeBucket,
      });

      if (existing) {
        // อัพเดทข้อมูลที่มีอยู่
        existing.prices.push(priceData.price);
        existing.highPrice = Math.max(existing.highPrice, priceData.price);
        existing.lowPrice = Math.min(existing.lowPrice, priceData.price);
        existing.closePrice = priceData.price;
        existing.averagePrice = this.calculateAverage(existing.prices);
        existing.totalVolume += priceData.volume24h || 0;
        existing.count += 1;
        existing.processed = false;

        await existing.save();
        return existing;
      } else {
        // สร้างใหม่
        const aggregation = await PriceAggregation.create({
          symbol: symbol.toUpperCase(),
          aggregationType,
          timeBucket,
          openPrice: priceData.price,
          closePrice: priceData.price,
          highPrice: priceData.price,
          lowPrice: priceData.price,
          averagePrice: priceData.price,
          totalVolume: priceData.volume24h || 0,
          count: 1,
          prices: [priceData.price],
          processed: false,
        });

        return aggregation;
      }
    } catch (error) {
      logger.error(`[Price Aggregator] ❌ เกิดข้อผิดพลาดในการสร้าง aggregation:`, error.message);
      throw error;
    }
  }

  /**
   * เริ่มต้นการสรุปผลอัตโนมัติ
   */
  start(symbols = []) {
    if (this.isRunning) {
      logger.warn('[Price Aggregator] ⚠️  Aggregator กำลังทำงานอยู่แล้ว');
      return;
    }

    logger.info('[Price Aggregator] 🚀 เริ่มต้น Price Aggregator');
    this.isRunning = true;

    // สรุปผลรายชั่วโมง (ทุกชั่วโมง)
    const hourlyInterval = setInterval(async () => {
      try {
        for (const symbol of symbols) {
          await this.aggregateHourly(symbol);
        }
      } catch (error) {
        logger.error('[Price Aggregator] เกิดข้อผิดพลาดในการสรุปผลรายชั่วโมง:', error.message);
      }
    }, 3600000); // 1 ชั่วโมง

    // สรุปผลรายวัน (ทุกวันเวลา 00:00)
    const dailyInterval = setInterval(async () => {
      try {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
          for (const symbol of symbols) {
            await this.aggregateDaily(symbol);
          }
        }
      } catch (error) {
        logger.error('[Price Aggregator] เกิดข้อผิดพลาดในการสรุปผลรายวัน:', error.message);
      }
    }, 60000); // ตรวจสอบทุกนาที

    // สรุปผลรายสัปดาห์ (ทุกวันจันทร์เวลา 00:00)
    const weeklyInterval = setInterval(async () => {
      try {
        const now = new Date();
        if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
          for (const symbol of symbols) {
            await this.aggregateWeekly(symbol);
          }
        }
      } catch (error) {
        logger.error('[Price Aggregator] เกิดข้อผิดพลาดในการสรุปผลรายสัปดาห์:', error.message);
      }
    }, 60000); // ตรวจสอบทุกนาที

    // สรุปผลรายเดือน (ทุกวันที่ 1 เวลา 00:00)
    const monthlyInterval = setInterval(async () => {
      try {
        const now = new Date();
        if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
          for (const symbol of symbols) {
            await this.aggregateMonthly(symbol);
          }
        }
      } catch (error) {
        logger.error('[Price Aggregator] เกิดข้อผิดพลาดในการสรุปผลรายเดือน:', error.message);
      }
    }, 60000); // ตรวจสอบทุกนาที

    this.intervalIds.set('hourly', hourlyInterval);
    this.intervalIds.set('daily', dailyInterval);
    this.intervalIds.set('weekly', weeklyInterval);
    this.intervalIds.set('monthly', monthlyInterval);
  }

  /**
   * หยุดการสรุปผลอัตโนมัติ
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[Price Aggregator] 🛑 หยุด Price Aggregator');
    this.isRunning = false;

    this.intervalIds.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervalIds.clear();
  }

  /**
   * ดึงสถานะการทำงาน
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.intervalIds.size,
    };
  }
}

// สร้าง instance เดียว (Singleton pattern)
const priceAggregator = new PriceAggregator();

module.exports = priceAggregator;

