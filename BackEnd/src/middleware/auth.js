const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware สำหรับตรวจสอบ JWT Token
 * ใช้ป้องกันเส้นทางที่ต้องการการ authenticate
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // ตรวจสอบว่ามี token ใน header หรือไม่
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // ดึง token จาก header (format: "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];
    }

    // ถ้าไม่มี token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลนี้',
      });
    }

    try {
      // ตรวจสอบ token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ดึงข้อมูลผู้ใช้จาก database
      req.user = await User.findById(decoded.id);

      // ถ้าไม่พบผู้ใช้
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ',
        });
      }

      // ตรวจสอบว่าบัญชียังใช้งานได้
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'บัญชีของคุณถูกระงับการใช้งาน',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware สำหรับตรวจสอบสิทธิ์ (Role-based)
 * ใช้จำกัดการเข้าถึงตามบทบาทของผู้ใช้
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (ต้องการสิทธิ์: ${roles.join(', ')})`,
      });
    }
    next();
  };
};

/**
 * Middleware สำหรับตรวจสอบ Internal API Key
 * ใช้สำหรับ API ภายในที่เชื่อมต่อกับ Binance
 */
const protectInternalAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาระบุ API Key ใน header',
    });
  }

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'API Key ไม่ถูกต้อง',
    });
  }

  next();
};

module.exports = { protect, authorize, protectInternalAPI };

