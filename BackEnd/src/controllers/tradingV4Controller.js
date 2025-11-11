const { getServices } = require('../microservices/trading-v4');
const logger = require('../utils/logger');

/**
 * Trading V4 Controller
 * Handles API requests for advanced ML-powered trading features
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
    logger.error('[TradingV4 Controller] Error getting trading signal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trading signal',
      error: error.message,
    });
  }
}

/**
 * Predict profit for different timeframes (with 1 day focus)
 */
async function predictProfit(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    const investment = parseFloat(req.query.investment) || 1000;
    const timeframe = req.query.timeframe || '1d';
    
    const { predictionService } = getServices();
    const prediction = await predictionService.predictProfit(symbol, investment, timeframe);
    
    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('[TradingV4 Controller] Error predicting profit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict profit',
      error: error.message,
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
    
    const FeatureEngine = require('../microservices/trading-v4/featureEngine');
    const featureEngine = new FeatureEngine();
    const features = await featureEngine.getFeatures(symbol, ohlcvData);
    
    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    logger.error('[TradingV4 Controller] Error getting features:', error);
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
    const limit = parseInt(req.query.limit) || 1000;
    
    const { predictionService } = getServices();
    const data = await predictionService.getLatestData(symbol, limit);
    
    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error('[TradingV4 Controller] Error getting historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical data',
      error: error.message,
    });
  }
}

/**
 * Retrain ML model
 */
async function retrainModel(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    
    const { predictionService } = getServices();
    await predictionService.retrain(symbol);
    
    res.json({
      success: true,
      message: 'Model retrained successfully',
    });
  } catch (error) {
    logger.error('[TradingV4 Controller] Error retraining model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrain model',
      error: error.message,
    });
  }
}

/**
 * Get optimal periods for indicators
 */
async function getOptimalPeriods(req, res) {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    
    const { predictionService, dataCollector } = getServices();
    const ohlcvData = await predictionService.getLatestData(symbol, 1000);
    
    if (ohlcvData.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data for period optimization',
      });
    }
    
    const PeriodOptimizer = require('../microservices/trading-v4/periodOptimizer');
    const periodOptimizer = new PeriodOptimizer();
    const results = await periodOptimizer.optimizePeriods(ohlcvData);
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('[TradingV4 Controller] Error getting optimal periods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get optimal periods',
      error: error.message,
    });
  }
}

module.exports = {
  getTradingSignal,
  predictProfit,
  getFeatures,
  getHistoricalData,
  retrainModel,
  getOptimalPeriods,
};

