const express = require('express');
const { getCryptoPrice } = require('../controllers/cryptoController');
const { protectInternalAPI } = require('../middleware/auth');

const router = express.Router();

/**
 * Internal API Routes
 * เส้นทางสำหรับ API ภายในที่เชื่อมต่อกับ Binance
 * ต้องมี API Key ในการเข้าถึง (x-api-key header)
 */

// ใช้ middleware protectInternalAPI กับทุก route
router.use(protectInternalAPI);

// @route   GET /api/internal/crypto/price/:symbol
// @desc    ดึงข้อมูลราคา crypto สำหรับ API ภายใน
// @access  Internal (ต้องมี API Key)
router.get('/crypto/price/:symbol', getCryptoPrice);

module.exports = router;

