const TradingV4DataCollector = require('./dataCollector');
const PredictionService = require('./predictionService');
const logger = require('../../utils/logger');

/**
 * Trading V4 Microservices Index
 * Main entry point for all Trading V4 services
 */

let dataCollector = null;
let predictionService = null;

/**
 * Initialize Trading V4 services
 */
function initialize() {
  dataCollector = new TradingV4DataCollector();
  predictionService = new PredictionService();
  
  return {
    dataCollector,
    predictionService,
  };
}

/**
 * Start all services
 */
async function start() {
  if (!dataCollector || !predictionService) {
    initialize();
  }
  
  try {
    await dataCollector.start();
    logger.info('[Trading V4] All services started');
  } catch (error) {
    logger.error('[Trading V4] Error starting services:', error);
    throw error;
  }
}

/**
 * Stop all services
 */
function stop() {
  if (dataCollector) {
    dataCollector.stop();
  }
  logger.info('[Trading V4] All services stopped');
}

/**
 * Get services
 */
function getServices() {
  if (!dataCollector || !predictionService) {
    initialize();
  }
  
  return {
    dataCollector,
    predictionService,
  };
}

module.exports = {
  initialize,
  start,
  stop,
  getServices,
};

