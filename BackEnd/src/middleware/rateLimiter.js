const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter สำหรับป้องกัน API Abuse
 * จำกัดจำนวน request ต่อช่วงเวลา
 * หมายเหตุ: ปิดการทำงานใน test environment
 */

// ตรวจสอบว่าอยู่ใน test environment หรือไม่
const isTestEnv = process.env.NODE_ENV === 'test';

// สำหรับ API ทั่วไป
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: isTestEnv ? 10000 : 100, // ปิด rate limit ใน test environment
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
  max: isTestEnv ? 10000 : 5, // ปิด rate limit ใน test environment
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
  max: isTestEnv ? 10000 : 3, // ปิด rate limit ใน test environment
  message: {
    success: false,
    message: 'คุณสมัครสมาชิกมากเกินไป กรุณาลองใหม่ภายหลัง',
  },
  skip: () => isTestEnv, // ข้าม rate limit ใน test environment
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
};

