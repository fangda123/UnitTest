const express = require('express');
const {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  stopSimulation,
  getTrades,
  getTradingSignal,
} = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ทุก route ต้อง authenticate
router.use(protect);

// @route   POST /api/trading/simulations
// @desc    สร้างการจำลองการเทรดใหม่
router.post('/simulations', createSimulation);

// @route   GET /api/trading/simulations
// @desc    ดึงการจำลองการเทรดทั้งหมด
router.get('/simulations', getSimulations);

// @route   GET /api/trading/simulations/:id
// @desc    ดึงการจำลองการเทรดตาม ID
router.get('/simulations/:id', getSimulationById);

// @route   POST /api/trading/simulations/:id/update
// @desc    อัพเดทการจำลองการเทรด (รันการเทรดอัตโนมัติ)
router.post('/simulations/:id/update', updateSimulation);

// @route   POST /api/trading/simulations/:id/stop
// @desc    หยุดการจำลองการเทรด
router.post('/simulations/:id/stop', stopSimulation);

// @route   GET /api/trading/simulations/:id/trades
// @desc    ดึงประวัติการเทรด
router.get('/simulations/:id/trades', getTrades);

// @route   GET /api/trading/signal/:symbol
// @desc    ดึงสัญญาณการเทรดปัจจุบัน
router.get('/signal/:symbol', getTradingSignal);

module.exports = router;

