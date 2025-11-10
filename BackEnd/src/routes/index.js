const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const cryptoRoutes = require('./cryptoRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const internalRoutes = require('./internalRoutes');
const aggregationRoutes = require('./aggregationRoutes');

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

module.exports = router;

