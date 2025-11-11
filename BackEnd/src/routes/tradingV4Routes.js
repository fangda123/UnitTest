const express = require('express');
const router = express.Router();
const tradingV4Controller = require('../controllers/tradingV4Controller');
const { authenticate } = require('../middleware/auth');

/**
 * Trading V4 Routes
 * Advanced ML-powered trading endpoints with genetic programming
 */

// Get trading signal with ML prediction
router.get('/signal/:symbol?', authenticate, tradingV4Controller.getTradingSignal);

// Predict profit for different timeframes (focus on 1 day)
router.get('/predict-profit', authenticate, tradingV4Controller.predictProfit);

// Get ML model features
router.get('/features/:symbol?', authenticate, tradingV4Controller.getFeatures);

// Get historical data
router.get('/historical/:symbol?', authenticate, tradingV4Controller.getHistoricalData);

// Retrain ML model
router.post('/retrain', authenticate, tradingV4Controller.retrainModel);

// Get optimal periods for indicators
router.get('/optimal-periods', authenticate, tradingV4Controller.getOptimalPeriods);

module.exports = router;

