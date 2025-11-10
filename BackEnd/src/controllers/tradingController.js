const TradingSimulation = require('../models/TradingSimulation');
const Trade = require('../models/Trade');
const tradingService = require('../services/tradingService');
const logger = require('../utils/logger');

/**
 * @desc    สร้างการจำลองการเทรดใหม่
 * @route   POST /api/trading/simulations
 * @access  Private
 */
const createSimulation = async (req, res, next) => {
  try {
    const { symbol = 'BTCUSDT', initialInvestment, settings = {} } = req.body;

    if (!initialInvestment || initialInvestment <= 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุจำนวนเงินลงทุน',
      });
    }

    // ตรวจสอบว่ามี simulation ที่ active อยู่แล้วหรือไม่
    const existingSimulation = await TradingSimulation.findOne({
      userId: req.user.id,
      symbol,
      status: 'active',
    });

    if (existingSimulation) {
      return res.status(400).json({
        success: false,
        message: 'คุณมีการจำลองการเทรดที่ active อยู่แล้ว',
        data: existingSimulation,
      });
    }

    // สร้าง simulation ใหม่
    const simulation = await TradingSimulation.create({
      userId: req.user.id,
      symbol,
      initialInvestment,
      currentBalance: initialInvestment,
      settings: {
        buyPercentage: settings.buyPercentage || 50,
        sellPercentage: settings.sellPercentage || 50,
        minConfidence: settings.minConfidence || 60,
        useStopLoss: settings.useStopLoss || false,
        stopLossPercentage: settings.stopLossPercentage || 5,
        useTakeProfit: settings.useTakeProfit || false,
        takeProfitPercentage: settings.takeProfitPercentage || 10,
      },
    });

    // ดึงราคาปัจจุบันและอัพเดท
    await tradingService.updatePriceAndCalculateSignal(symbol);

    res.status(201).json({
      success: true,
      message: 'สร้างการจำลองการเทรดสำเร็จ',
      data: simulation,
    });
  } catch (error) {
    logger.error('❌ Error creating simulation:', error.message);
    next(error);
  }
};

/**
 * @desc    ดึงการจำลองการเทรดทั้งหมด
 * @route   GET /api/trading/simulations
 * @access  Private
 */
const getSimulations = async (req, res, next) => {
  try {
    const { status, symbol } = req.query;
    const query = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }

    const simulations = await TradingSimulation.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: simulations,
      count: simulations.length,
    });
  } catch (error) {
    logger.error('❌ Error getting simulations:', error.message);
    next(error);
  }
};

/**
 * @desc    ดึงการจำลองการเทรดตาม ID
 * @route   GET /api/trading/simulations/:id
 * @access  Private
 */
const getSimulationById = async (req, res, next) => {
  try {
    const simulation = await TradingSimulation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการจำลองการเทรด',
      });
    }

    // ดึงราคาปัจจุบันและคำนวณกำไร/ขาดทุน
    const currentPrice = await tradingService.getCurrentPrice(simulation.symbol);
    const profit = simulation.calculateProfit(currentPrice);

    res.json({
      success: true,
      data: {
        ...simulation.toObject(),
        currentPrice,
        profit,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting simulation:', error.message);
    next(error);
  }
};

/**
 * @desc    อัพเดทการจำลองการเทรด (รันการเทรดอัตโนมัติ)
 * @route   POST /api/trading/simulations/:id/update
 * @access  Private
 */
const updateSimulation = async (req, res, next) => {
  try {
    const simulation = await TradingSimulation.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: 'active',
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการจำลองการเทรดที่ active',
      });
    }

    // ดึงราคาปัจจุบันและคำนวณสัญญาณ
    const { price, signal } = await tradingService.updatePriceAndCalculateSignal(simulation.symbol);

    // ตรวจสอบ stop loss / take profit
    if (simulation.holdings > 0) {
      const currentValue = simulation.currentBalance + (simulation.holdings * price);
      const profitPercentage = ((currentValue - simulation.initialInvestment) / simulation.initialInvestment) * 100;

      if (simulation.settings.useStopLoss && profitPercentage <= -simulation.settings.stopLossPercentage) {
        // Stop Loss - ขายทั้งหมด
        const sellAmount = simulation.holdings;
        const revenue = sellAmount * price;
        const profit = (price - simulation.averageBuyPrice) * sellAmount;

        simulation.sell(price, sellAmount);
        simulation.totalProfit += profit;

        await Trade.create({
          simulationId: simulation._id,
          type: 'sell',
          symbol: simulation.symbol,
          price,
          quantity: sellAmount,
          amount: revenue,
          profit,
          profitPercentage: ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100,
          signal,
          balanceAfter: simulation.currentBalance,
          holdingsAfter: simulation.holdings,
        });

        await simulation.save();

        return res.json({
          success: true,
          message: 'Stop Loss ถูกเรียก - ขายทั้งหมด',
          data: {
            simulation,
            action: 'stop_loss',
            price,
          },
        });
      }

      if (simulation.settings.useTakeProfit && profitPercentage >= simulation.settings.takeProfitPercentage) {
        // Take Profit - ขายบางส่วน
        const sellPercentage = simulation.settings.sellPercentage || 50;
        const sellAmount = (simulation.holdings * sellPercentage) / 100;
        const revenue = sellAmount * price;
        const profit = (price - simulation.averageBuyPrice) * sellAmount;

        simulation.sell(price, sellAmount);
        simulation.totalProfit += profit;

        await Trade.create({
          simulationId: simulation._id,
          type: 'sell',
          symbol: simulation.symbol,
          price,
          quantity: sellAmount,
          amount: revenue,
          profit,
          profitPercentage: ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100,
          signal,
          balanceAfter: simulation.currentBalance,
          holdingsAfter: simulation.holdings,
        });

        await simulation.save();

        return res.json({
          success: true,
          message: 'Take Profit ถูกเรียก - ขายบางส่วน',
          data: {
            simulation,
            action: 'take_profit',
            price,
          },
        });
      }
    }

    // ตรวจสอบสัญญาณการเทรด
    if (signal.confidence >= simulation.settings.minConfidence) {
      if (signal.signal === 'buy' && simulation.currentBalance > 0) {
        // ซื้อ
        const buyAmount = (simulation.currentBalance * simulation.settings.buyPercentage) / 100;
        const quantity = buyAmount / price;

        if (quantity > 0) {
          simulation.buy(price, quantity);

          await Trade.create({
            simulationId: simulation._id,
            type: 'buy',
            symbol: simulation.symbol,
            price,
            quantity,
            amount: buyAmount,
            signal,
            balanceAfter: simulation.currentBalance,
            holdingsAfter: simulation.holdings,
          });
        }
      } else if (signal.signal === 'sell' && simulation.holdings > 0) {
        // ขาย
        const sellPercentage = simulation.settings.sellPercentage || 50;
        const sellAmount = (simulation.holdings * sellPercentage) / 100;
        const revenue = sellAmount * price;
        const profit = (price - simulation.averageBuyPrice) * sellAmount;

        simulation.sell(price, sellAmount);
        simulation.totalProfit += profit;

        await Trade.create({
          simulationId: simulation._id,
          type: 'sell',
          symbol: simulation.symbol,
          price,
          quantity: sellAmount,
          amount: revenue,
          profit,
          profitPercentage: ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100,
          signal,
          balanceAfter: simulation.currentBalance,
          holdingsAfter: simulation.holdings,
        });
      }
    }

    // อัพเดทสถิติ
    simulation.updateStats(price);
    await simulation.save();

    res.json({
      success: true,
      message: 'อัพเดทการจำลองการเทรดสำเร็จ',
      data: {
        simulation,
        currentPrice: price,
        signal,
        profit: simulation.calculateProfit(price),
      },
    });
  } catch (error) {
    logger.error('❌ Error updating simulation:', error.message);
    next(error);
  }
};

/**
 * @desc    หยุดการจำลองการเทรด
 * @route   POST /api/trading/simulations/:id/stop
 * @access  Private
 */
const stopSimulation = async (req, res, next) => {
  try {
    const simulation = await TradingSimulation.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: 'active',
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการจำลองการเทรดที่ active',
      });
    }

    // ขายทั้งหมด (ถ้ามี)
    if (simulation.holdings > 0) {
      const currentPrice = await tradingService.getCurrentPrice(simulation.symbol);
      const sellAmount = simulation.holdings;
      const revenue = sellAmount * currentPrice;
      const profit = (currentPrice - simulation.averageBuyPrice) * sellAmount;

      simulation.sell(currentPrice, sellAmount);
      simulation.totalProfit += profit;
    }

    simulation.status = 'completed';
    simulation.endedAt = new Date();
    simulation.updateStats(await tradingService.getCurrentPrice(simulation.symbol));
    await simulation.save();

    res.json({
      success: true,
      message: 'หยุดการจำลองการเทรดสำเร็จ',
      data: simulation,
    });
  } catch (error) {
    logger.error('❌ Error stopping simulation:', error.message);
    next(error);
  }
};

/**
 * @desc    ดึงประวัติการเทรด
 * @route   GET /api/trading/simulations/:id/trades
 * @access  Private
 */
const getTrades = async (req, res, next) => {
  try {
    const simulation = await TradingSimulation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการจำลองการเทรด',
      });
    }

    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const trades = await Trade.find({ simulationId: simulation._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Trade.countDocuments({ simulationId: simulation._id });

    res.json({
      success: true,
      data: trades,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('❌ Error getting trades:', error.message);
    next(error);
  }
};

/**
 * @desc    ดึงสัญญาณการเทรดปัจจุบัน
 * @route   GET /api/trading/signal/:symbol
 * @access  Private
 */
const getTradingSignal = async (req, res, next) => {
  try {
    const { symbol = 'BTCUSDT' } = req.params;

    // อัพเดทราคาและคำนวณสัญญาณ
    const { price, signal } = await tradingService.updatePriceAndCalculateSignal(symbol);

    // ดึงประวัติราคา
    const history = tradingService.getPriceHistory(symbol, 50);

    // ตรวจสอบว่า signal มี reasons หรือไม่
    if (!signal.reasons) {
      signal.reasons = [];
    }

    res.json({
      success: true,
      data: {
        symbol,
        currentPrice: price,
        signal: {
          ...signal,
          reasons: signal.reasons || [],
        },
        history: history.map(h => ({
          price: h.price,
          timestamp: h.timestamp,
        })),
      },
    });
  } catch (error) {
    logger.error('❌ Error getting trading signal:', error.message);
    next(error);
  }
};

module.exports = {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  stopSimulation,
  getTrades,
  getTradingSignal,
};

