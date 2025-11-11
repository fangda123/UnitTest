require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const binanceService = require('./services/binanceService');
const binanceDataCollector = require('./microservices/binance/dataCollector');
const priceAggregator = require('./aggregators/priceAggregator');
const marketStatsAggregator = require('./aggregators/marketStatsAggregator');
const workersManager = require('./workers');
const tradingService = require('./services/tradingService');
const tradingDataCollector = require('./microservices/trading/dataCollector');
const tradingV4Service = require('./microservices/trading-v4');
const websocketService = require('./services/websocketService');
const logger = require('./utils/logger');

/**
 * Server Entry Point
 * จุดเริ่มต้นของ application
 */

const PORT = process.env.PORT || 1111;

// สร้าง HTTP Server
const server = http.createServer(app);

/**
 * เริ่มต้น Server และ Services ทั้งหมด
 */
const startServer = async () => {
  try {
    // เชื่อมต่อ MongoDB
    await connectDB();

    // เชื่อมต่อ Redis
    await connectRedis();

    // เริ่มต้น WebSocket Service (ยกเว้นใน test environment)
    if (process.env.NODE_ENV !== 'test') {
      websocketService.initialize(server);
    }

    // เริ่มต้น Binance Service (ดึงข้อมูลราคา crypto) (ยกเว้นใน test environment)
    // ใช้สำหรับ backward compatibility
    if (process.env.NODE_ENV !== 'test' && process.env.USE_OLD_BINANCE_SERVICE === 'true') {
      binanceService.start();
    }

    // เริ่มต้น Binance Data Collector Microservice (ยกเว้นใน test environment)
    if (process.env.NODE_ENV !== 'test') {
      const symbols = process.env.CRYPTO_SYMBOLS
        ? process.env.CRYPTO_SYMBOLS.split(',').map((s) => s.trim().toUpperCase())
        : ['BTCUSDT', 'ETHUSDT'];

      logger.info(`🚀 เริ่มต้น Binance Data Collector Microservice สำหรับ ${symbols.length} symbols`);
      binanceDataCollector.start();

      // โหลด symbols ทั้งหมดจาก Binance (ถ้าไม่ได้ตั้งค่า CRYPTO_SYMBOLS)
      if (!process.env.CRYPTO_SYMBOLS || process.env.AUTO_LOAD_ALL_SYMBOLS === 'true') {
        const symbolLoader = require('./microservices/binance/symbolLoader');
        const useTopOnly = process.env.USE_TOP_SYMBOLS_ONLY !== 'false'; // default true
        const topLimit = parseInt(process.env.TOP_SYMBOLS_LIMIT) || 100;
        
        // โหลด symbols แบบ async (ไม่รอ)
        setTimeout(async () => {
          try {
            if (useTopOnly) {
              logger.info(`📥 กำลังโหลด top ${topLimit} symbols จาก Binance...`);
              await symbolLoader.loadTopSymbols(topLimit);
            } else {
              logger.info('📥 กำลังโหลด symbols ทั้งหมดจาก Binance...');
              await symbolLoader.loadAllSymbols();
            }
            logger.info('✅ โหลด symbols สำเร็จ - ระบบพร้อมรับข้อมูล real-time สำหรับทุกเหรียญ');
          } catch (error) {
            logger.error('❌ ไม่สามารถโหลด symbols:', error.message);
          }
        }, 5000); // รอ 5 วินาทีให้ระบบเริ่มต้นเสร็จก่อน
      }

      // เริ่มต้น Price Aggregator
      logger.info('🚀 เริ่มต้น Price Aggregator');
      priceAggregator.start(symbols);

      // เริ่มต้น Market Stats Aggregator (อัพเดททุก 60 นาที)
      const statsInterval = parseInt(process.env.MARKET_STATS_INTERVAL) || 60;
      logger.info(`🚀 เริ่มต้น Market Stats Aggregator (อัพเดททุก ${statsInterval} นาที)`);
      marketStatsAggregator.start(symbols, statsInterval);

      // เริ่มต้น Workers
      logger.info('🚀 เริ่มต้น Workers');
      workersManager.start(symbols);

      // เริ่มต้น Trading Data Collector - เก็บข้อมูล BTC และคำนวณสถิติ
      logger.info('🚀 เริ่มต้น Trading Data Collector');
      tradingDataCollector.start();

      // เริ่มต้น Trading Service - อัพเดตราคา BTC อัตโนมัติ (backup)
      logger.info('🚀 เริ่มต้น Trading Service');
      setInterval(async () => {
        try {
          await tradingService.updatePriceAndCalculateSignal('BTCUSDT');
        } catch (error) {
          logger.error('❌ Error updating trading price:', error.message);
        }
      }, 5000); // อัพเดททุก 5 วินาที

      // เริ่มต้น Trading V4 Microservice (Advanced ML Trading)
      if (process.env.ENABLE_TRADING_V4 !== 'false') {
        logger.info('🚀 เริ่มต้น Trading V4 Microservice (Advanced ML Trading)');
        setTimeout(async () => {
          try {
            await tradingV4Service.start();
            logger.info('✅ Trading V4 Microservice started successfully');
          } catch (error) {
            logger.error('❌ Error starting Trading V4 Microservice:', error.message);
          }
        }, 10000); // รอ 10 วินาทีให้ระบบอื่นเริ่มต้นเสร็จก่อน
      }
    }

    // เริ่ม HTTP Server
    server.listen(PORT, () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🚀 Server เริ่มทำงานแล้ว!                        ║
║                                                       ║
║     📡 Port: ${PORT}                                  ║
║     🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║
║                                                       ║
║     📚 API Documentation: http://localhost:${PORT}/api-docs  ║
║     🔌 WebSocket: ws://localhost:${PORT}/ws          ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
      }
    });
  } catch (error) {
    logger.error('❌ ไม่สามารถเริ่มต้น server:', error);
    process.exit(1);
  }
};

/**
 * จัดการการปิด server อย่างถูกต้อง (Graceful Shutdown)
 */
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. กำลังปิด server...`);

  // ปิด HTTP Server
  server.close(async () => {
    logger.info('🔌 ปิด HTTP Server แล้ว');

    // หยุด Binance Service
    if (process.env.USE_OLD_BINANCE_SERVICE === 'true') {
    binanceService.stop();
    }

    // หยุด Binance Data Collector
    binanceDataCollector.stop();

    // หยุด Trading Data Collector
    tradingDataCollector.stop();

    // หยุด Trading V4 Microservice
    if (tradingV4Service) {
      tradingV4Service.stop();
    }

    // หยุด Aggregators
    priceAggregator.stop();
    marketStatsAggregator.stop();

    // หยุด Workers
    workersManager.stop();

    // ปิด WebSocket Service
    websocketService.close();

    // ปิดการเชื่อมต่อ Database
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('🔌 ปิดการเชื่อมต่อ MongoDB แล้ว');

    // ปิดการเชื่อมต่อ Redis
    const { getRedisClient } = require('./config/redis');
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.quit();
      logger.info('🔌 ปิดการเชื่อมต่อ Redis แล้ว');
    }

    logger.info('✅ ปิด server เรียบร้อยแล้ว');
    process.exit(0);
  });

  // บังคับปิดถ้าไม่สำเร็จภายใน 10 วินาที
  setTimeout(() => {
    logger.error('❌ ไม่สามารถปิด server ได้ทันเวลา บังคับปิด...');
    process.exit(1);
  }, 10000);
};

// จัดการ signals สำหรับปิด server
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// จัดการ unhandled errors
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// เริ่มต้น server
startServer();

