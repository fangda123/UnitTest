const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter สำหรับป้องกัน API Abuse
 * จำกัดจำนวน request ต่อช่วงเวลา
 * หมายเหตุ: ปิดการทำงานใน test environment
 */

// ตรวจสอบว่าอยู่ใน test environment หรือไม่
const isTestEnv = process.env.NODE_ENV === 'test';
const isDevEnv = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// สำหรับ API ทั่วไป
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: isTestEnv ? 10000 : (isDevEnv ? 1000 : 100), // เพิ่ม limit ใน development
  message: {
    success: false,
    message: 'คุณส่ง request มากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  standardHeaders: true, // แสดงข้อมูล rate limit ใน header
  legacyHeaders: false,
  skip: () => isTestEnv, // ข้าม rate limit ใน test environment
});

// สำหรับการเข้าสู่ระบบ (เข้มงวดกว่า)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: isTestEnv ? 10000 : (isDevEnv ? 50 : 5), // เพิ่ม limit ใน development เป็น 50
  message: {
    success: false,
    message: 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  skipSuccessfulRequests: true, // ไม่นับ request ที่สำเร็จ
  skip: () => isTestEnv, // ข้าม rate limit ใน test environment
});

// สำหรับการสมัครสมาชิก
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: isTestEnv ? 10000 : (isDevEnv ? 20 : 3), // เพิ่ม limit ใน development เป็น 20
  message: {
    success: false,
    message: 'คุณสมัครสมาชิกมากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  skip: () => isTestEnv, // ข้าม rate limit ใน test environment
});

// สำหรับ Trading API (ต้องอัพเดทบ่อย)
const tradingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: isTestEnv ? 10000 : (isDevEnv ? 500 : 100), // เพิ่ม limit เป็น 500 ใน development
  message: {
    success: false,
    message: 'คุณส่ง request มากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// สำหรับ Trading Simulations (ต้องอัพเดทบ่อย)
const tradingSimulationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: isTestEnv ? 10000 : (isDevEnv ? 300 : 100), // อนุญาตให้ request บ่อยขึ้น
  message: {
    success: false,
    message: 'คุณส่ง request มากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  tradingLimiter,
  tradingSimulationLimiter,
};

