const CryptoPrice = require('../models/CryptoPrice');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @desc    ดึงข้อมูลราคา crypto ล่าสุด
 * @route   GET /api/crypto/price/:symbol
 * @access  Public
 */
const getCryptoPrice = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `crypto:price:${symbol.toUpperCase()}`;

    // ลองดึงจาก cache ก่อน
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      logger.info(`ดึงข้อมูลราคา ${symbol} จาก cache`);
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // ถ้าไม่มีใน cache ให้ดึงจาก database
    const price = await CryptoPrice.getLatestPrice(symbol);

    if (!price) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลราคาสำหรับสัญลักษณ์นี้',
      });
    }

    // เก็บใน cache (TTL จาก env หรือ 60 วินาทีตามค่าเริ่มต้น)
    await setCache(cacheKey, price, parseInt(process.env.REDIS_TTL) || 60);

    res.json({
      success: true,
      data: price,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูลราคา crypto ทั้งหมด
 * @route   GET /api/crypto/prices
 * @access  Public
 */
const getAllCryptoPrices = async (req, res, next) => {
  try {
    const cacheKey = 'crypto:prices:all';

    // ลองดึงจาก cache ก่อน
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      logger.info('ดึงข้อมูลราคาทั้งหมดจาก cache');
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // ดึงราคาล่าสุดของแต่ละสัญลักษณ์
    const prices = await CryptoPrice.aggregate([
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$symbol',
          latestPrice: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$latestPrice' },
      },
    ]);

    // เก็บใน cache
    await setCache(cacheKey, prices, parseInt(process.env.REDIS_TTL) || 60);

    res.json({
      success: true,
      data: prices,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงประวัติราคา crypto
 * @route   GET /api/crypto/history/:symbol
 * @access  Public
 */
const getCryptoPriceHistory = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const query = { symbol: symbol.toUpperCase() };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const history = await CryptoPrice.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงสถิติราคา crypto
 * @route   GET /api/crypto/stats/:symbol
 * @access  Public
 */
const getCryptoStats = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { period = '24h' } = req.query;

    // คำนวณช่วงเวลา
    const now = new Date();
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // ดึงข้อมูลและคำนวณสถิติ
    const prices = await CryptoPrice.find({
      symbol: symbol.toUpperCase(),
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    if (prices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสำหรับช่วงเวลานี้',
      });
    }

    // คำนวณสถิติ
    const priceValues = prices.map((p) => p.price);
    const stats = {
      symbol: symbol.toUpperCase(),
      period,
      current: priceValues[priceValues.length - 1],
      high: Math.max(...priceValues),
      low: Math.min(...priceValues),
      average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
      change: priceValues[priceValues.length - 1] - priceValues[0],
      changePercent: ((priceValues[priceValues.length - 1] - priceValues[0]) / priceValues[0]) * 100,
      dataPoints: prices.length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCryptoPrice,
  getAllCryptoPrices,
  getCryptoPriceHistory,
  getCryptoStats,
};

