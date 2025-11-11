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
// Rate limiting disabled
// const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: สมัครสมาชิกใหม่
 *     tags: [Auth]
 *     description: สร้างบัญชีผู้ใช้ใหม่ (role: user)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: normaluser
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: User123!
 *               firstName:
 *                 type: string
 *                 example: สมชาย
 *               lastName:
 *                 type: string
 *                 example: ใจดี
 *     responses:
 *       201:
 *         description: สร้างบัญชีสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 */
router.post('/register', validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     tags: [Auth]
 *     description: Login และรับ JWT Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: User123!
 *     responses:
 *       200:
 *         description: Login สำเร็จ
 *       401:
 *         description: Email หรือ Password ไม่ถูกต้อง
 */
router.post('/login', validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ปัจจุบัน
 *     tags: [Auth]
 *     description: ดึงข้อมูลผู้ใช้ที่ login อยู่
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *       401:
 *         description: ไม่ได้ login หรือ token ไม่ถูกต้อง
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: เปลี่ยนรหัสผ่าน
 *     tags: [Auth]
 *     description: เปลี่ยนรหัสผ่านของผู้ใช้ปัจจุบัน
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *       400:
 *         description: รหัสผ่านปัจจุบันไม่ถูกต้อง
 */
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);

module.exports = router;

