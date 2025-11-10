const express = require('express');
const { getCryptoPrice } = require('../controllers/cryptoController');
const {
  getMicroservicesStatus,
  loadAllSymbols,
  controlBinanceCollector,
  manageBinanceSymbol,
  controlPriceAggregator,
  controlMarketStatsAggregator,
  controlWorkers,
} = require('../controllers/microserviceController');
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

// @route   GET /api/internal/microservices/status
// @desc    ดึงสถานะ microservices ทั้งหมด
// @access  Internal (ต้องมี API Key)
router.get('/microservices/status', getMicroservicesStatus);

// @route   POST /api/internal/microservices/binance/load-all-symbols
// @desc    โหลด symbols ทั้งหมดจาก Binance
// @access  Internal (ต้องมี API Key)
router.post('/microservices/binance/load-all-symbols', loadAllSymbols);

// @route   POST /api/internal/microservices/binance/:action
// @desc    ควบคุม Binance Data Collector (start/stop)
// @access  Internal (ต้องมี API Key)
router.post('/microservices/binance/:action', controlBinanceCollector);

// @route   POST /api/internal/microservices/binance/symbol
// @desc    เพิ่ม/ลบ symbol ใน Binance Data Collector
// @access  Internal (ต้องมี API Key)
router.post('/microservices/binance/symbol', manageBinanceSymbol);

// @route   POST /api/internal/microservices/aggregator/:action
// @desc    ควบคุม Price Aggregator (start/stop)
// @access  Internal (ต้องมี API Key)
router.post('/microservices/aggregator/:action', controlPriceAggregator);

// @route   POST /api/internal/microservices/market-stats/:action
// @desc    ควบคุม Market Stats Aggregator (start/stop)
// @access  Internal (ต้องมี API Key)
router.post('/microservices/market-stats/:action', controlMarketStatsAggregator);

// @route   POST /api/internal/microservices/workers/:action
// @desc    ควบคุม Workers (start/stop)
// @access  Internal (ต้องมี API Key)
router.post('/microservices/workers/:action', controlWorkers);

module.exports = router;

