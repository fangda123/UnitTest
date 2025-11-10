const PriceSummary = require('../models/PriceSummary');
const MarketStats = require('../models/MarketStats');
const PriceAggregation = require('../models/PriceAggregation');
const priceAggregator = require('../aggregators/priceAggregator');
const marketStatsAggregator = require('../aggregators/marketStatsAggregator');
const logger = require('../utils/logger');

/**
 * @desc    ดึงข้อมูลสรุปผลราคาตามหมวดหมู่
 * @route   GET /api/aggregation/summary/:symbol
 * @access  Public
 */
const getPriceSummary = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { category, startDate, endDate, limit = 100 } = req.query;

    let summaries;

    if (category) {
      // ดึงตามหมวดหมู่
      if (startDate && endDate) {
        summaries = await PriceSummary.getSummaryByPeriod(
          symbol,
          category,
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        summaries = await PriceSummary.find({
          symbol: symbol.toUpperCase(),
          category,
        })
          .sort({ period: -1 })
          .limit(parseInt(limit));
      }
    } else {
      // ดึงทั้งหมด
      summaries = await PriceSummary.getAllSummaries(symbol, parseInt(limit));
    }

    res.json({
      success: true,
      data: summaries,
      count: summaries.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูลสรุปผลราคาล่าสุด
 * @route   GET /api/aggregation/summary/:symbol/latest
 * @access  Public
 */
const getLatestPriceSummary = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { category } = req.query;

    if (category) {
      const summary = await PriceSummary.getLatestSummary(symbol, category);
      if (!summary) {
        return res.status(404).json({
          success: false,
          message: `ไม่พบข้อมูลสรุปผล ${category} สำหรับ ${symbol}`,
        });
      }
      return res.json({
        success: true,
        data: summary,
      });
    }

    // ดึงทุกหมวดหมู่
    const categories = ['hourly', 'daily', 'weekly', 'monthly'];
    const summaries = {};

    for (const cat of categories) {
      const summary = await PriceSummary.getLatestSummary(symbol, cat);
      if (summary) {
        summaries[cat] = summary;
      }
    }

    res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงสถิติตลาด
 * @route   GET /api/aggregation/stats/:symbol
 * @access  Public
 */
const getMarketStats = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { category } = req.query;

    if (category) {
      const stats = await MarketStats.getLatestStats(symbol, category);
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: `ไม่พบสถิติตลาด ${category} สำหรับ ${symbol}`,
        });
      }
      return res.json({
        success: true,
        data: stats,
      });
    }

    // ดึงทุกหมวดหมู่
    const categories = ['24h', '7d', '30d', 'all'];
    const stats = {};

    for (const cat of categories) {
      const stat = await MarketStats.getLatestStats(symbol, cat);
      if (stat) {
        stats[cat] = stat;
      }
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    ดึงข้อมูล aggregation
 * @route   GET /api/aggregation/aggregation/:symbol
 * @access  Public
 */
const getPriceAggregation = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { aggregationType, startDate, endDate, limit = 100 } = req.query;

    const query = { symbol: symbol.toUpperCase() };

    if (aggregationType) {
      query.aggregationType = aggregationType;
    }

    if (startDate || endDate) {
      query.timeBucket = {};
      if (startDate) query.timeBucket.$gte = new Date(startDate);
      if (endDate) query.timeBucket.$lte = new Date(endDate);
    }

    const aggregations = await PriceAggregation.find(query)
      .sort({ timeBucket: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: aggregations,
      count: aggregations.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    บังคับคำนวณสรุปผลราคา
 * @route   POST /api/aggregation/calculate/:symbol
 * @access  Internal (ต้องมี API Key)
 */
const calculatePriceSummary = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { category } = req.body;

    logger.info(`[API] เริ่มคำนวณสรุปผลราคา ${symbol} หมวดหมู่ ${category || 'all'}`);

    let result;

    if (category) {
      switch (category) {
        case 'hourly':
          result = await priceAggregator.aggregateHourly(symbol);
          break;
        case 'daily':
          result = await priceAggregator.aggregateDaily(symbol);
          break;
        case 'weekly':
          result = await priceAggregator.aggregateWeekly(symbol);
          break;
        case 'monthly':
          result = await priceAggregator.aggregateMonthly(symbol);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'หมวดหมู่ไม่ถูกต้อง ต้องเป็น hourly, daily, weekly, หรือ monthly',
          });
      }
    } else {
      result = await priceAggregator.aggregateAll(symbol);
    }

    res.json({
      success: true,
      message: `คำนวณสรุปผลราคา ${symbol} สำเร็จ`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    บังคับคำนวณสถิติตลาด
 * @route   POST /api/aggregation/calculate-stats/:symbol
 * @access  Internal (ต้องมี API Key)
 */
const calculateMarketStats = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { category } = req.body;

    logger.info(`[API] เริ่มคำนวณสถิติตลาด ${symbol} หมวดหมู่ ${category || 'all'}`);

    let result;

    if (category) {
      result = await marketStatsAggregator.calculateMarketStats(symbol, category);
    } else {
      result = await marketStatsAggregator.calculateAllStats(symbol);
    }

    res.json({
      success: true,
      message: `คำนวณสถิติตลาด ${symbol} สำเร็จ`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPriceSummary,
  getLatestPriceSummary,
  getMarketStats,
  getPriceAggregation,
  calculatePriceSummary,
  calculateMarketStats,
};

