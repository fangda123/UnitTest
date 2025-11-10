const express = require('express');
const {
  getPriceSummary,
  getLatestPriceSummary,
  getMarketStats,
  getPriceAggregation,
  calculatePriceSummary,
  calculateMarketStats,
} = require('../controllers/aggregationController');
const { protectInternalAPI } = require('../middleware/auth');

const router = express.Router();

/**
 * Aggregation Routes
 * เส้นทางสำหรับดึงข้อมูลสรุปผลและสถิติ
 */

// @route   GET /api/aggregation/summary/:symbol
// @desc    ดึงข้อมูลสรุปผลราคาตามหมวดหมู่
// @access  Public
router.get('/summary/:symbol', getPriceSummary);

// @route   GET /api/aggregation/summary/:symbol/latest
// @desc    ดึงข้อมูลสรุปผลราคาล่าสุด
// @access  Public
router.get('/summary/:symbol/latest', getLatestPriceSummary);

// @route   GET /api/aggregation/stats/:symbol
// @desc    ดึงสถิติตลาด
// @access  Public
router.get('/stats/:symbol', getMarketStats);

// @route   GET /api/aggregation/aggregation/:symbol
// @desc    ดึงข้อมูล aggregation
// @access  Public
router.get('/aggregation/:symbol', getPriceAggregation);

// @route   POST /api/aggregation/calculate/:symbol
// @desc    บังคับคำนวณสรุปผลราคา
// @access  Internal
router.post('/calculate/:symbol', protectInternalAPI, calculatePriceSummary);

// @route   POST /api/aggregation/calculate-stats/:symbol
// @desc    บังคับคำนวณสถิติตลาด
// @access  Internal
router.post('/calculate-stats/:symbol', protectInternalAPI, calculateMarketStats);

module.exports = router;

