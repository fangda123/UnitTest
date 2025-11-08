const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @desc    ดึงข้อมูลผู้ใช้ทั้งหมด
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    // รองรับ pagination และ filter
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // นับจำนวนทั้งหมด
    const total = await User.countDocuments(filter);

    // ดึงข้อมูล
    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูลผู้ใช้รายคน
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    อัพเดทข้อมูลผู้ใช้
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUser = async (req, res, next) => {
  try {
    const { username, email, firstName, lastName, profile } = req.body;

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์แก้ไขหรือไม่
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้นี้',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    // ตรวจสอบว่า email หรือ username ซ้ำหรือไม่
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว',
        });
      }
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว',
        });
      }
    }

    // อัพเดทข้อมูล
    user.username = username || user.username;
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    await user.save();

    logger.info(`อัพเดทข้อมูลผู้ใช้: ${user.email}`);

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ลบผู้ใช้
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    // ไม่อนุญาตให้ลบตัวเอง
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'คุณไม่สามารถลบบัญชีของตัวเองได้',
      });
    }

    await user.deleteOne();

    logger.info(`ลบผู้ใช้: ${user.email}`);

    res.json({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ระงับ/เปิดใช้งานบัญชีผู้ใช้
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Private/Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    // สลับสถานะ
    user.isActive = !user.isActive;
    await user.save();

    logger.info(`เปลี่ยนสถานะผู้ใช้: ${user.email} -> ${user.isActive ? 'เปิดใช้งาน' : 'ระงับ'}`);

    res.json({
      success: true,
      message: `${user.isActive ? 'เปิดใช้งาน' : 'ระงับ'}บัญชีสำเร็จ`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
};

