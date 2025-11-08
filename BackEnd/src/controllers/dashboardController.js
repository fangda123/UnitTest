const User = require('../models/User');
const CryptoPrice = require('../models/CryptoPrice');
const Trade = require('../models/Trade');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @desc    ดึงข้อมูลสำหรับ Dashboard (ข้อมูลผู้ใช้ + ราคา crypto)
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cacheKey = `dashboard:${userId}`;

    // ลองดึงจาก cache ก่อน
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      logger.info(`ดึงข้อมูล dashboard จาก cache: ${userId}`);
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    // ดึงราคา crypto ล่าสุด (เช่น BTCUSDT)
    const cryptoSymbol = process.env.CRYPTO_SYMBOL || 'BTCUSDT';
    const cryptoPrice = await CryptoPrice.getLatestPrice(cryptoSymbol);

    // ดึงข้อมูลการเทรดของผู้ใช้ (ถ้ามี)
    const trades = await Trade.find({ userId }).sort({ createdAt: -1 }).limit(5);

    // รวมข้อมูล
    const dashboardData = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile,
        memberSince: user.createdAt,
      },
      crypto: cryptoPrice || null,
      recentTrades: trades,
      stats: {
        totalTrades: await Trade.countDocuments({ userId }),
        activeTrades: await Trade.countDocuments({ userId, status: 'pending' }),
      },
    };

    // เก็บใน cache (30 วินาที)
    await setCache(cacheKey, dashboardData, 30);

    res.json({
      success: true,
      data: dashboardData,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูลสรุปสำหรับ Admin
 * @route   GET /api/dashboard/admin
 * @access  Private/Admin
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:admin';

    // ลองดึงจาก cache ก่อน
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      logger.info('ดึงข้อมูล admin dashboard จาก cache');
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // รวบรวมสถิติต่างๆ
    const stats = {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true }),
        admins: await User.countDocuments({ role: 'admin' }),
        newThisMonth: await User.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        }),
      },
      trades: {
        total: await Trade.countDocuments(),
        pending: await Trade.countDocuments({ status: 'pending' }),
        completed: await Trade.countDocuments({ status: 'completed' }),
        todayCount: await Trade.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
      },
      crypto: {
        totalPriceRecords: await CryptoPrice.countDocuments(),
        symbols: await CryptoPrice.distinct('symbol'),
      },
    };

    // ดึงผู้ใช้ล่าสุด
    const recentUsers = await User.find()
      .select('username email firstName lastName createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // ดึงการเทรดล่าสุด
    const recentTrades = await Trade.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(5);

    const adminDashboard = {
      stats,
      recentUsers,
      recentTrades,
      timestamp: new Date(),
    };

    // เก็บใน cache (60 วินาที)
    await setCache(cacheKey, adminDashboard, 60);

    res.json({
      success: true,
      data: adminDashboard,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAdminDashboard,
};

