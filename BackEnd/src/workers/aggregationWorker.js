const CryptoPrice = require('../models/CryptoPrice');
const PriceAggregation = require('../models/PriceAggregation');
const priceAggregator = require('../aggregators/priceAggregator');
const logger = require('../utils/logger');

/**
 * Aggregation Worker
 * ประมวลผลข้อมูลราคาและสร้าง aggregations แบบ background
 */
class AggregationWorker {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.processingInterval = parseInt(process.env.AGGREGATION_INTERVAL) || 60000; // 1 นาที
  }

  /**
   * ประมวลผลข้อมูลราคาใหม่และสร้าง aggregations
   */
  async processNewPrices(symbol) {
    try {
      logger.info(`[Aggregation Worker] กำลังประมวลผลข้อมูลราคาใหม่สำหรับ ${symbol}`);

      // ดึงข้อมูลราคาล่าสุดที่ยังไม่ได้ประมวลผล (5 นาทีล่าสุด)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentPrices = await CryptoPrice.find({
        symbol: symbol.toUpperCase(),
        createdAt: { $gte: fiveMinutesAgo },
      }).sort({ createdAt: 1 });

      if (recentPrices.length === 0) {
        return;
      }

      // สร้าง aggregations สำหรับแต่ละช่วงเวลา
      for (const priceData of recentPrices) {
        const createdAt = new Date(priceData.createdAt);

        // Minute aggregation
        const minuteBucket = new Date(createdAt);
        minuteBucket.setSeconds(0, 0);
        await priceAggregator.createAggregation(symbol, 'minute', minuteBucket, priceData);

        // Hour aggregation
        const hourBucket = new Date(createdAt);
        hourBucket.setMinutes(0, 0, 0);
        await priceAggregator.createAggregation(symbol, 'hour', hourBucket, priceData);

        // Day aggregation
        const dayBucket = new Date(createdAt);
        dayBucket.setHours(0, 0, 0, 0);
        await priceAggregator.createAggregation(symbol, 'day', dayBucket, priceData);
      }

      logger.info(`[Aggregation Worker] ✅ ประมวลผลข้อมูลราคา ${symbol} สำเร็จ (${recentPrices.length} records)`);
    } catch (error) {
      logger.error(`[Aggregation Worker] ❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลราคา ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * ประมวลผล aggregations ที่ยังไม่ได้ประมวลผล
   */
  async processUnprocessedAggregations(limit = 100) {
    try {
      const unprocessed = await PriceAggregation.getUnprocessed(limit);

      if (unprocessed.length === 0) {
        return;
      }

      logger.info(`[Aggregation Worker] กำลังประมวลผล ${unprocessed.length} aggregations ที่ยังไม่ได้ประมวลผล`);

      for (const aggregation of unprocessed) {
        try {
          // ทำเครื่องหมายว่าประมวลผลแล้ว
          aggregation.processed = true;
          await aggregation.save();

          // สร้าง summary จาก aggregation
          if (aggregation.aggregationType === 'hour') {
            await priceAggregator.aggregateByCategory(
              aggregation.symbol,
              'hourly',
              aggregation.timeBucket,
              new Date(aggregation.timeBucket.getTime() + 60 * 60 * 1000)
            );
          } else if (aggregation.aggregationType === 'day') {
            await priceAggregator.aggregateByCategory(
              aggregation.symbol,
              'daily',
              aggregation.timeBucket,
              new Date(aggregation.timeBucket.getTime() + 24 * 60 * 60 * 1000)
            );
          }
        } catch (error) {
          logger.error(`[Aggregation Worker] เกิดข้อผิดพลาดในการประมวลผล aggregation ${aggregation._id}:`, error.message);
        }
      }

      logger.info(`[Aggregation Worker] ✅ ประมวลผล aggregations สำเร็จ`);
    } catch (error) {
      logger.error(`[Aggregation Worker] ❌ เกิดข้อผิดพลาดในการประมวลผล aggregations:`, error.message);
      throw error;
    }
  }

  /**
   * เริ่มต้น worker
   */
  start(symbols = []) {
    if (this.isRunning) {
      logger.warn('[Aggregation Worker] ⚠️  Worker กำลังทำงานอยู่แล้ว');
      return;
    }

    logger.info(`[Aggregation Worker] 🚀 เริ่มต้น Aggregation Worker (อัพเดททุก ${this.processingInterval / 1000} วินาที)`);
    this.isRunning = true;

    // ประมวลผลทันที
    this.process(symbols).catch((error) => {
      logger.error('[Aggregation Worker] เกิดข้อผิดพลาดในการประมวลผลครั้งแรก:', error.message);
    });

    // ตั้ง interval
    this.intervalId = setInterval(async () => {
      try {
        await this.process(symbols);
      } catch (error) {
        logger.error('[Aggregation Worker] เกิดข้อผิดพลาดในการประมวลผล:', error.message);
      }
    }, this.processingInterval);
  }

  /**
   * ประมวลผลข้อมูลทั้งหมด
   */
  async process(symbols) {
    // ประมวลผลข้อมูลราคาใหม่สำหรับทุก symbols
    for (const symbol of symbols) {
      try {
        await this.processNewPrices(symbol);
      } catch (error) {
        logger.error(`[Aggregation Worker] เกิดข้อผิดพลาดในการประมวลผล ${symbol}:`, error.message);
      }
    }

    // ประมวลผล aggregations ที่ยังไม่ได้ประมวลผล
    await this.processUnprocessedAggregations();
  }

  /**
   * หยุด worker
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[Aggregation Worker] 🛑 หยุด Aggregation Worker');
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
      processingInterval: this.processingInterval,
    };
  }
}

// สร้าง instance เดียว (Singleton pattern)
const aggregationWorker = new AggregationWorker();

module.exports = aggregationWorker;

