require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const binanceService = require('./services/binanceService');
const websocketService = require('./services/websocketService');
const logger = require('./utils/logger');

/**
 * Server Entry Point
 * จุดเริ่มต้นของ application
 */

const PORT = process.env.PORT || 3000;

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
    if (process.env.NODE_ENV !== 'test') {
      binanceService.start();
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
    binanceService.stop();

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

