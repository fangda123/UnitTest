const logger = require('../utils/logger');

/**
 * Error Handler Middleware
 * จัดการ error ทั้งหมดและส่ง response ที่เหมาะสม
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors,
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} นี้ถูกใช้งานแล้ว`,
    });
  }

  // Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ไม่พบข้อมูลที่ค้นหา',
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
    });
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
    });
  }

  // Default Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'เกิดข้อผิดพลาดในระบบ';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Not Found Handler
 * จัดการเมื่อเส้นทางไม่ถูกต้อง
 */
const notFound = (req, res, next) => {
  const error = new Error(`ไม่พบเส้นทาง - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };

