const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * สร้าง JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @desc    สมัครสมาชิกใหม่
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, profile } = req.body;

    // ตรวจสอบว่ามี email หรือ username นี้แล้วหรือไม่
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว',
      });
    }

    // สร้างผู้ใช้ใหม่
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      profile,
    });

    // สร้าง token
    const token = generateToken(user._id);

    logger.info(`ผู้ใช้ใหม่สมัครสมาชิก: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เข้าสู่ระบบ
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ค้นหาผู้ใช้และดึง password field ด้วย
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    // ตรวจสอบว่าบัญชียังใช้งานได้
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'บัญชีของคุณถูกระงับการใช้งาน',
      });
    }

    // สร้าง token
    const token = generateToken(user._id);

    logger.info(`ผู้ใช้เข้าสู่ระบบ: ${user.email}`);

    // ลบ password ออกจาก response
    user.password = undefined;

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูลผู้ใช้ปัจจุบัน
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เปลี่ยนรหัสผ่าน
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ดึงข้อมูลผู้ใช้พร้อม password
    const user = await User.findById(req.user._id).select('+password');

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      });
    }

    // เปลี่ยนรหัสผ่าน
    user.password = newPassword;
    await user.save();

    logger.info(`ผู้ใช้เปลี่ยนรหัสผ่าน: ${user.email}`);

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
};

