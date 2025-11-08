const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * เชื่อมต่อกับ MongoDB Database
 * ใช้ mongoose สำหรับจัดการการเชื่อมต่อและ schema
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // ตัวเลือกการเชื่อมต่อที่แนะนำ
      // useNewUrlParser และ useUnifiedTopology จะเป็น default ใน mongoose 6+
    });

    logger.info(`✅ เชื่อมต่อ MongoDB สำเร็จ: ${conn.connection.host}`);
    
    // จัดการ connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB ตัดการเชื่อมต่อ');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB เกิดข้อผิดพลาด:', err);
    });

    return conn;
  } catch (error) {
    logger.error('❌ ไม่สามารถเชื่อมต่อ MongoDB:', error.message);
    process.exit(1); // ออกจากโปรแกรมถ้าเชื่อมต่อไม่ได้
  }
};

module.exports = connectDB;

