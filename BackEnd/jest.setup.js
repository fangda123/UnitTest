// โหลด environment variables ก่อนรัน tests
require('dotenv').config();

// ตั้งค่า JWT_SECRET สำหรับ testing (ถ้ายังไม่มี)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

// ตั้งค่า environment เป็น test
process.env.NODE_ENV = 'test';

