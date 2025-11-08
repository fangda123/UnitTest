const express = require('express');
const { getDashboard, getAdminDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Dashboard Routes
 * เส้นทางสำหรับดึงข้อมูล Dashboard (Frontend Integration)
 */

// ใช้ middleware protect กับทุก route
router.use(protect);

// @route   GET /api/dashboard
// @desc    ดึงข้อมูลสำหรับ Dashboard (ข้อมูลผู้ใช้ + ราคา crypto)
// @access  Private
router.get('/', getDashboard);

// @route   GET /api/dashboard/admin
// @desc    ดึงข้อมูลสรุปสำหรับ Admin Dashboard
// @access  Private/Admin
router.get('/admin', authorize('admin'), getAdminDashboard);

module.exports = router;

