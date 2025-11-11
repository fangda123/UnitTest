const express = require('express');
const {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  stopSimulation,
  getTrades,
  getTradingSignal,
  getTradingStatistics,
} = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');
// Rate limiting disabled
// const { tradingLimiter, tradingSimulationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Trading
 *   description: Trading simulation and signals endpoints
 */

// ทุก route ต้อง authenticate
router.use(protect);

// Rate limiting disabled
// router.use('/signal/:symbol', tradingLimiter);
// router.use('/simulations', tradingSimulationLimiter);

/**
 * @swagger
 * /api/trading/simulations:
 *   post:
 *     summary: สร้างการจำลองการเทรดใหม่
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initialInvestment
 *             properties:
 *               symbol:
 *                 type: string
 *                 default: BTCUSDT
 *               initialInvestment:
 *                 type: number
 *                 example: 1000
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: สร้าง simulation สำเร็จ
 */
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

/**
 * @swagger
 * /api/trading/signal/{symbol}:
 *   get:
 *     summary: ดึงสัญญาณการเทรดปัจจุบัน
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         example: BTCUSDT
 *     responses:
 *       200:
 *         description: ดึงสัญญาณสำเร็จ
 */
router.get('/signal/:symbol', getTradingSignal);

// @route   GET /api/trading/statistics/:symbol
// @desc    ดึงสถิติการเทรด
router.get('/statistics/:symbol', getTradingStatistics);

module.exports = router;

