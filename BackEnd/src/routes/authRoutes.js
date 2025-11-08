const express = require('express');
const {
  register,
  login,
  getMe,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../middleware/validator');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Authentication Routes
 * เส้นทางสำหรับการจัดการ authentication
 */

// @route   POST /api/auth/register
// @desc    สมัครสมาชิกใหม่
// @access  Public
router.post('/register', registerLimiter, validate(registerSchema), register);

// @route   POST /api/auth/login
// @desc    เข้าสู่ระบบ
// @access  Public
router.post('/login', authLimiter, validate(loginSchema), login);

// @route   GET /api/auth/me
// @desc    ดึงข้อมูลผู้ใช้ปัจจุบัน
// @access  Private
router.get('/me', protect, getMe);

// @route   PUT /api/auth/change-password
// @desc    เปลี่ยนรหัสผ่าน
// @access  Private
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);

module.exports = router;

