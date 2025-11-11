const express = require('express');
const {
  getAllSymbols,
  getCryptoPrice,
  getAllCryptoPrices,
  getCryptoPriceHistory,
  getCryptoKlines,
  getCryptoStats,
} = require('../controllers/cryptoController');
const { protectInternalAPI } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Crypto
 *   description: Cryptocurrency price data endpoints
 */

/**
 * @swagger
 * /api/crypto/symbols:
 *   get:
 *     summary: ดึงรายการ symbols ทั้งหมดจาก Binance
 *     tags: [Crypto]
 *     responses:
 *       200:
 *         description: ดึงรายการ symbols สำเร็จ
 */
router.get('/symbols', getAllSymbols);

// @route   GET /api/crypto/prices
// @desc    ดึงข้อมูลราคา crypto ทั้งหมด
// @access  Public
router.get('/prices', getAllCryptoPrices);

/**
 * @swagger
 * /api/crypto/price/{symbol}:
 *   get:
 *     summary: ดึงข้อมูลราคา crypto ล่าสุดตาม symbol
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         example: BTCUSDT
 *     responses:
 *       200:
 *         description: ดึงราคาสำเร็จ
 */
router.get('/price/:symbol', getCryptoPrice);

// @route   GET /api/crypto/history/:symbol
// @desc    ดึงประวัติราคา crypto จาก database
// @access  Public
router.get('/history/:symbol', getCryptoPriceHistory);

/**
 * @swagger
 * /api/crypto/klines/{symbol}:
 *   get:
 *     summary: ดึงประวัติราคา crypto ย้อนหลังจาก Binance API (klines/candlestick)
 *     description: ดึงข้อมูลย้อนหลังได้หลายปี ใช้ Binance klines API
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         example: BTCUSDT
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M]
 *         description: Time interval (default: 1d)
 *         example: 1d
 *       - in: query
 *         name: years
 *         schema:
 *           type: number
 *         description: จำนวนปีย้อนหลัง (เช่น 1 = 1 ปี, 2 = 2 ปี)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: จำนวนข้อมูล (default: 500, max: 1000)
 *         example: 500
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: number
 *         description: Unix timestamp (milliseconds) - เริ่มต้น
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: number
 *         description: Unix timestamp (milliseconds) - สิ้นสุด
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 */
// @route   GET /api/crypto/klines/:symbol
// @desc    ดึงประวัติราคา crypto ย้อนหลังจาก Binance API (klines/candlestick)
// @access  Public
router.get('/klines/:symbol', getCryptoKlines);

// @route   GET /api/crypto/stats/:symbol
// @desc    ดึงสถิติราคา crypto
// @access  Public
router.get('/stats/:symbol', getCryptoStats);

module.exports = router;

