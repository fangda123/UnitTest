const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate, updateUserSchema } = require('../middleware/validator');
const websocketService = require('../services/websocketService');

const router = express.Router();

/**
 * User Management Routes
 * เส้นทางสำหรับจัดการข้อมูลผู้ใช้ (CRUD)
 */

// ใช้ middleware protect กับทุก route
router.use(protect);

// @route   GET /api/users
// @desc    ดึงข้อมูลผู้ใช้ทั้งหมด (Admin เท่านั้น)
// @access  Private/Admin
router.get('/', authorize('admin'), getUsers);

// @route   GET /api/users/:id
// @desc    ดึงข้อมูลผู้ใช้รายคน
// @access  Private
router.get('/:id', getUser);

// @route   PUT /api/users/:id
// @desc    อัพเดทข้อมูลผู้ใช้
// @access  Private
router.put('/:id', validate(updateUserSchema), async (req, res, next) => {
  // เรียก controller
  await updateUser(req, res, next);
  
  // ถ้าอัพเดทสำเร็จ ส่งการแจ้งเตือนผ่าน WebSocket
  if (res.statusCode === 200) {
    websocketService.notifyUserUpdated(req.user);
  }
});

// @route   DELETE /api/users/:id
// @desc    ลบผู้ใช้ (Admin เท่านั้น)
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  const user = req.user;
  await deleteUser(req, res, next);
  
  // ถ้าลบสำเร็จ ส่งการแจ้งเตือนผ่าน WebSocket
  if (res.statusCode === 200) {
    websocketService.notifyUserDeleted(user._id, user.username);
  }
});

// @route   PATCH /api/users/:id/toggle-status
// @desc    ระงับ/เปิดใช้งานบัญชีผู้ใช้ (Admin เท่านั้น)
// @access  Private/Admin
router.patch('/:id/toggle-status', authorize('admin'), toggleUserStatus);

module.exports = router;

