const binanceDataCollector = require('../microservices/binance/dataCollector');
const symbolLoader = require('../microservices/binance/symbolLoader');
const priceAggregator = require('../aggregators/priceAggregator');
const marketStatsAggregator = require('../aggregators/marketStatsAggregator');
const workersManager = require('../workers');
const logger = require('../utils/logger');

/**
 * @desc    ดึงสถานะ microservices
 * @route   GET /api/microservices/status
 * @access  Internal (ต้องมี API Key)
 */
const getMicroservicesStatus = async (req, res, next) => {
  try {
    const status = {
      binanceDataCollector: binanceDataCollector.getStatus(),
      priceAggregator: priceAggregator.getStatus(),
      marketStatsAggregator: marketStatsAggregator.getStatus(),
      workers: workersManager.getStatus(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    โหลด symbols ทั้งหมดจาก Binance
 * @route   POST /api/microservices/binance/load-all-symbols
 * @access  Internal (ต้องมี API Key)
 */
const loadAllSymbols = async (req, res, next) => {
  try {
    const { useTopOnly, limit } = req.body;

    logger.info('[API] เริ่มโหลด symbols จาก Binance');

    let symbols;

    if (useTopOnly) {
      // โหลดเฉพาะ top symbols
      const topLimit = limit || 50;
      symbols = await symbolLoader.loadTopSymbols(topLimit);
    } else {
      // โหลด symbols ทั้งหมด
      symbols = await symbolLoader.loadAllSymbols();
    }

    res.json({
      success: true,
      message: `โหลด symbols สำเร็จ: ${symbols.length} symbols`,
      data: {
        symbols,
        count: symbols.length,
      },
    });
  } catch (error) {
    logger.error('[API] เกิดข้อผิดพลาดในการโหลด symbols:', error.message);
    next(error);
  }
};

/**
 * @desc    เริ่มต้น/หยุด Binance Data Collector
 * @route   POST /api/microservices/binance/:action
 * @access  Internal (ต้องมี API Key)
 */
const controlBinanceCollector = async (req, res, next) => {
  try {
    const { action } = req.params;

    if (action === 'start') {
      binanceDataCollector.start();
      res.json({
        success: true,
        message: 'Binance Data Collector เริ่มทำงานแล้ว',
        status: binanceDataCollector.getStatus(),
      });
    } else if (action === 'stop') {
      binanceDataCollector.stop();
      res.json({
        success: true,
        message: 'Binance Data Collector หยุดทำงานแล้ว',
        status: binanceDataCollector.getStatus(),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action ไม่ถูกต้อง ต้องเป็น start หรือ stop',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เพิ่ม/ลบ symbol ใน Binance Data Collector
 * @route   POST /api/microservices/binance/symbol
 * @access  Internal (ต้องมี API Key)
 */
const manageBinanceSymbol = async (req, res, next) => {
  try {
    const { symbol, action } = req.body;

    if (!symbol || !action) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ symbol และ action (add/remove)',
      });
    }

    if (action === 'add') {
      binanceDataCollector.addSymbol(symbol);
      res.json({
        success: true,
        message: `เพิ่ม symbol ${symbol} สำเร็จ`,
        status: binanceDataCollector.getStatus(),
      });
    } else if (action === 'remove') {
      binanceDataCollector.removeSymbol(symbol);
      res.json({
        success: true,
        message: `ลบ symbol ${symbol} สำเร็จ`,
        status: binanceDataCollector.getStatus(),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action ไม่ถูกต้อง ต้องเป็น add หรือ remove',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เริ่มต้น/หยุด Price Aggregator
 * @route   POST /api/microservices/aggregator/:action
 * @access  Internal (ต้องมี API Key)
 */
const controlPriceAggregator = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { symbols } = req.body;

    if (action === 'start') {
      const symbolsArray = symbols ? symbols.split(',') : binanceDataCollector.getStatus().symbols;
      priceAggregator.start(symbolsArray);
      res.json({
        success: true,
        message: 'Price Aggregator เริ่มทำงานแล้ว',
        status: priceAggregator.getStatus(),
      });
    } else if (action === 'stop') {
      priceAggregator.stop();
      res.json({
        success: true,
        message: 'Price Aggregator หยุดทำงานแล้ว',
        status: priceAggregator.getStatus(),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action ไม่ถูกต้อง ต้องเป็น start หรือ stop',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เริ่มต้น/หยุด Market Stats Aggregator
 * @route   POST /api/microservices/market-stats/:action
 * @access  Internal (ต้องมี API Key)
 */
const controlMarketStatsAggregator = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { symbols, intervalMinutes } = req.body;

    if (action === 'start') {
      const symbolsArray = symbols ? symbols.split(',') : binanceDataCollector.getStatus().symbols;
      const interval = intervalMinutes ? parseInt(intervalMinutes) : 60;
      marketStatsAggregator.start(symbolsArray, interval);
      res.json({
        success: true,
        message: 'Market Stats Aggregator เริ่มทำงานแล้ว',
        status: marketStatsAggregator.getStatus(),
      });
    } else if (action === 'stop') {
      marketStatsAggregator.stop();
      res.json({
        success: true,
        message: 'Market Stats Aggregator หยุดทำงานแล้ว',
        status: marketStatsAggregator.getStatus(),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action ไม่ถูกต้อง ต้องเป็น start หรือ stop',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    เริ่มต้น/หยุด Workers
 * @route   POST /api/microservices/workers/:action
 * @access  Internal (ต้องมี API Key)
 */
const controlWorkers = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { symbols } = req.body;

    if (action === 'start') {
      const symbolsArray = symbols ? symbols.split(',') : binanceDataCollector.getStatus().symbols;
      workersManager.start(symbolsArray);
      res.json({
        success: true,
        message: 'Workers เริ่มทำงานแล้ว',
        status: workersManager.getStatus(),
      });
    } else if (action === 'stop') {
      workersManager.stop();
      res.json({
        success: true,
        message: 'Workers หยุดทำงานแล้ว',
        status: workersManager.getStatus(),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action ไม่ถูกต้อง ต้องเป็น start หรือ stop',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMicroservicesStatus,
  loadAllSymbols,
  controlBinanceCollector,
  manageBinanceSymbol,
  controlPriceAggregator,
  controlMarketStatsAggregator,
  controlWorkers,
};
