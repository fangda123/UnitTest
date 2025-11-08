const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * เชื่อมต่อกับ Redis สำหรับ caching
 * ใช้สำหรับแคชข้อมูลราคา crypto เพื่อลดการเรียก API
 */
const connectRedis = async () => {
  try {
    // สร้าง Redis client
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // จัดการ error events
    redisClient.on('error', (err) => {
      logger.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('🔄 กำลังเชื่อมต่อ Redis...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ เชื่อมต่อ Redis สำเร็จ');
    });

    // เชื่อมต่อ
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error('❌ ไม่สามารถเชื่อมต่อ Redis:', error.message);
    logger.warn('⚠️  ระบบจะทำงานต่อโดยไม่มี cache');
    return null;
  }
};

/**
 * ดึง Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * ตั้งค่า cache ด้วย TTL
 */
const setCache = async (key, value, ttl = 60) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('❌ ไม่สามารถตั้งค่า cache:', error.message);
    return false;
  }
};

/**
 * ดึงข้อมูลจาก cache
 */
const getCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return null;
    }
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('❌ ไม่สามารถดึงข้อมูลจาก cache:', error.message);
    return null;
  }
};

/**
 * ลบข้อมูลจาก cache
 */
const deleteCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('❌ ไม่สามารถลบข้อมูลจาก cache:', error.message);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
};

