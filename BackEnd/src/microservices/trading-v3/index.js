const TradingV3DataCollector = require('./dataCollector');
const PredictionService = require('./predictionService');
const logger = require('../../utils/logger');

/**
 * Trading V3 Microservices Index
 * Main entry point for all Trading V3 services
 */

let dataCollector = null;
let predictionService = null;

/**
 * Initialize Trading V3 services
 */
function initialize() {
  dataCollector = new TradingV3DataCollector();
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
  if (!dataCollector) {
    initialize();
  }
  
  await dataCollector.start();
  logger.info('[Trading V3] All services started');
}

/**
 * Stop all services
 */
function stop() {
  if (dataCollector) {
    dataCollector.stop();
  }
  logger.info('[Trading V3] All services stopped');
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

