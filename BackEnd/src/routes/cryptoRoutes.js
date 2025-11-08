const express = require('express');
const {
  getCryptoPrice,
  getAllCryptoPrices,
  getCryptoPriceHistory,
  getCryptoStats,
} = require('../controllers/cryptoController');
const { protectInternalAPI } = require('../middleware/auth');

const router = express.Router();

/**
 * Crypto Price Routes
 * เส้นทางสำหรับดึงข้อมูลราคาสกุลเงินดิจิทัล
 */

// @route   GET /api/crypto/prices
// @desc    ดึงข้อมูลราคา crypto ทั้งหมด
// @access  Public
router.get('/prices', getAllCryptoPrices);

// @route   GET /api/crypto/price/:symbol
// @desc    ดึงข้อมูลราคา crypto ล่าสุดตาม symbol
// @access  Public
router.get('/price/:symbol', getCryptoPrice);

// @route   GET /api/crypto/history/:symbol
// @desc    ดึงประวัติราคา crypto
// @access  Public
router.get('/history/:symbol', getCryptoPriceHistory);

// @route   GET /api/crypto/stats/:symbol
// @desc    ดึงสถิติราคา crypto
// @access  Public
router.get('/stats/:symbol', getCryptoStats);

module.exports = router;

