const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const cryptoRoutes = require('./cryptoRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const internalRoutes = require('./internalRoutes');
const aggregationRoutes = require('./aggregationRoutes');
const tradingRoutes = require('./tradingRoutes');
const tradingV3Routes = require('./tradingV3Routes');
const tradingV4Routes = require('./tradingV4Routes');

const router = express.Router();

/**
 * Main Routes Configuration
 * รวม routes ทั้งหมดไว้ที่นี่
 */

// Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API กำลังทำงานปกติ',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/internal', internalRoutes);
router.use('/aggregation', aggregationRoutes);
router.use('/trading', tradingRoutes);
router.use('/trading-v3', tradingV3Routes);
router.use('/trading-v4', tradingV4Routes);

module.exports = router;

