const { getServices } = require('../microservices/trading-v3');
const logger = require('../utils/logger');

/**
 * Trading V3 Controller
 * Handles API requests for ML-powered trading features
 */

/**
 * Get trading signal with ML prediction
 */
async function getTradingSignal(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.params;
    
    const { predictionService } = getServices();
    const signal = await predictionService.getTradingSignal(symbol);
    
    res.json({
      success: true,
      data: signal,
    });
  } catch (error) {
    logger.error('[TradingV3 Controller] Error getting trading signal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trading signal',
      error: error.message,
    });
  }
}

/**
 * Predict profit for different timeframes
 */
async function predictProfit(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    const investment = parseFloat(req.query.investment) || 1000;
    const timeframe = req.query.timeframe || '1d';
    
    const { predictionService } = getServices();
    
    // Check if we have enough data first
    const ohlcvData = await predictionService.getLatestData(symbol, 200);
    if (ohlcvData.length < 50) {
      return res.status(400).json({
        success: false,
        message: `Insufficient data for prediction. Need at least 50 data points, but only have ${ohlcvData.length}. Please wait for more data to be collected.`,
        dataAvailable: ohlcvData.length,
        required: 50,
      });
    }
    
    const prediction = await predictionService.predictProfit(symbol, investment, timeframe);
    
    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('[TradingV3 Controller] Error predicting profit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict profit',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Get ML model features for a symbol
 */
async function getFeatures(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.params;
    
    const { predictionService } = getServices();
    const ohlcvData = await predictionService.getLatestData(symbol, 200);
    
    if (ohlcvData.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data for feature calculation',
      });
    }
    
    const FeatureEngine = require('../microservices/trading-v3/featureEngine');
    const featureEngine = new FeatureEngine();
    const features = await featureEngine.getFeatures(symbol, ohlcvData);
    
    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    logger.error('[TradingV3 Controller] Error getting features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get features',
      error: error.message,
    });
  }
}

/**
 * Get historical data for a symbol
 */
async function getHistoricalData(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.params;
    const limit = parseInt(req.query.limit) || 200;
    
    const { predictionService } = getServices();
    const data = await predictionService.getLatestData(symbol, limit);
    
    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error('[TradingV3 Controller] Error getting historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical data',
      error: error.message,
    });
  }
}

module.exports = {
  getTradingSignal,
  predictProfit,
  getFeatures,
  getHistoricalData,
};

