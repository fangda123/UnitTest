const express = require('express');
const router = express.Router();
const tradingV3Controller = require('../controllers/tradingV3Controller');
const { authenticate } = require('../middleware/auth');

/**
 * Trading V3 Routes
 * ML-powered trading endpoints
 */

// Get trading signal with ML prediction
router.get('/signal/:symbol?', authenticate, tradingV3Controller.getTradingSignal);

// Predict profit for different timeframes
router.get('/predict-profit', authenticate, tradingV3Controller.predictProfit);

// Get ML model features
router.get('/features/:symbol?', authenticate, tradingV3Controller.getFeatures);

// Get historical data
router.get('/historical/:symbol?', authenticate, tradingV3Controller.getHistoricalData);

module.exports = router;

