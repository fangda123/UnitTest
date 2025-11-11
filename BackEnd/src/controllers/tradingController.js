const TradingSimulation = require('../models/TradingSimulation');
const Trade = require('../models/Trade');
const TradingData = require('../models/TradingData');
const tradingService = require('../services/tradingService');
const pricePredictionService = require('../services/pricePredictionService');
const tradingDataCollector = require('../microservices/trading/dataCollector');
const algorithmPerformanceTracker = require('../services/algorithmPerformanceTracker');
const logger = require('../utils/logger');

// เก็บเวลาการเทรดล่าสุดเพื่อป้องกันการซื้อซ้ำ
const lastTradeTimes = new Map(); // Map<simulationId, lastTradeTime>
const TRADE_COOLDOWN = 3000; // 3 วินาที - ลดจาก 5 วินาทีเป็น 3 วินาทีเพื่อให้ตอบสนองเร็วกว่า

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

    // ตรวจสอบ validation ของ settings (ถ้ามีการส่งมา)
    logger.info(`[Trading] Create Simulation - Received data:`, {
      initialInvestment,
      settings,
      userId: req.user.id,
    });
    
    if (settings.minBuyAmount !== undefined || settings.maxBuyAmount !== undefined || 
        settings.minSellAmount !== undefined || settings.maxSellAmount !== undefined) {
      const minBuyAmount = settings.minBuyAmount;
      const maxBuyAmount = settings.maxBuyAmount;
      const minSellAmount = settings.minSellAmount;
      const maxSellAmount = settings.maxSellAmount;

      logger.info(`[Trading] Validation - Checking values:`, {
        minBuyAmount,
        maxBuyAmount,
        minSellAmount,
        maxSellAmount,
        initialInvestment,
      });

      // ตรวจสอบว่ามีค่าทั้งหมด
      if (minBuyAmount === undefined || maxBuyAmount === undefined || 
          minSellAmount === undefined || maxSellAmount === undefined) {
        logger.warn(`[Trading] Validation failed - Missing values:`, {
          minBuyAmount: minBuyAmount !== undefined,
          maxBuyAmount: maxBuyAmount !== undefined,
          minSellAmount: minSellAmount !== undefined,
          maxSellAmount: maxSellAmount !== undefined,
        });
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง: กรุณาระบุค่าทั้งหมด (minBuyAmount, maxBuyAmount, minSellAmount, maxSellAmount)',
        });
      }

      // ตรวจสอบว่าค่าต้องมากกว่า 0
      if (minBuyAmount <= 0 || maxBuyAmount <= 0 || minSellAmount <= 0 || maxSellAmount <= 0) {
        logger.warn(`[Trading] Validation failed - Values must be > 0:`, {
          minBuyAmount,
          maxBuyAmount,
          minSellAmount,
          maxSellAmount,
        });
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ถูกต้อง: ค่าต้องมากกว่า 0',
        });
      }

      // ตรวจสอบว่า Min < Max
      if (minBuyAmount >= maxBuyAmount) {
        logger.warn(`[Trading] Validation failed - Min Buy >= Max Buy:`, {
          minBuyAmount,
          maxBuyAmount,
        });
        return res.status(400).json({
          success: false,
          message: `ข้อมูลไม่ถูกต้อง: Min Buy Amount (${minBuyAmount}) ต้องน้อยกว่า Max Buy Amount (${maxBuyAmount})`,
        });
      }

      if (minSellAmount >= maxSellAmount) {
        logger.warn(`[Trading] Validation failed - Min Sell >= Max Sell:`, {
          minSellAmount,
          maxSellAmount,
        });
        return res.status(400).json({
          success: false,
          message: `ข้อมูลไม่ถูกต้อง: Min Sell Amount (${minSellAmount}) ต้องน้อยกว่า Max Sell Amount (${maxSellAmount})`,
        });
      }

      // ตรวจสอบว่า Buy Amount ไม่เกินเงินลงทุน
      if (minBuyAmount > initialInvestment || maxBuyAmount > initialInvestment) {
        logger.warn(`[Trading] Validation failed - Buy Amount > Investment:`, {
          minBuyAmount,
          maxBuyAmount,
          initialInvestment,
        });
        return res.status(400).json({
          success: false,
          message: `ข้อมูลไม่ถูกต้อง: Buy Amount ต้องไม่เกินเงินลงทุน (${initialInvestment})`,
        });
      }
      
      logger.info(`[Trading] Validation passed - All checks OK`);
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
        minBuyAmount: settings.minBuyAmount || 10,
        maxBuyAmount: settings.maxBuyAmount || 1000,
        sellPercentage: settings.sellPercentage || 50,
        minSellAmount: settings.minSellAmount || 0.0001,
        maxSellAmount: settings.maxSellAmount || 1,
        minConfidence: settings.minConfidence || 30,
        initialBuyPercentage: settings.initialBuyPercentage || 0, // เปอร์เซ็นต์การซื้อครั้งแรก
        useStopLoss: settings.useStopLoss || false,
        stopLossPercentage: settings.stopLossPercentage || 5,
        useTakeProfit: settings.useTakeProfit || false,
        takeProfitPercentage: settings.takeProfitPercentage || 10,
      },
    });

    // Force Buy: ถ้ามี initialBuyPercentage > 0 ให้ซื้อทันที
    if (simulation.settings.initialBuyPercentage > 0) {
      try {
        const { price } = await tradingService.updatePriceAndCalculateSignal(symbol);
        const buyAmount = (initialInvestment * simulation.settings.initialBuyPercentage) / 100;
        const quantity = buyAmount / price;
        
        // ตรวจสอบว่า buyAmount อยู่ในช่วง min/max
        const finalBuyAmount = Math.max(
          simulation.settings.minBuyAmount,
          Math.min(buyAmount, simulation.settings.maxBuyAmount, initialInvestment)
        );
        const finalQuantity = finalBuyAmount / price;
        
        if (finalQuantity > 0 && finalBuyAmount <= simulation.currentBalance) {
          simulation.buy(price, finalQuantity);
          
          await Trade.create({
            simulationId: simulation._id,
            type: 'buy',
            symbol: simulation.symbol,
            price,
            quantity: finalQuantity,
            amount: finalBuyAmount,
            profit: 0,
            profitPercentage: 0,
            signal: {
              signal: 'buy',
              confidence: 100,
              reasons: [
                `💰 Force Buy: ซื้อ ${simulation.settings.initialBuyPercentage}% ของเงินลงทุนในการลงทุนครั้งแรก`,
                `ซื้อ ${finalQuantity.toFixed(8)} ${symbol} ที่ราคา $${price.toFixed(2)}`,
                `ใช้เงิน $${finalBuyAmount.toFixed(2)}`,
              ],
            },
            balanceAfter: simulation.currentBalance,
            holdingsAfter: simulation.holdings,
          });
          
          await simulation.save();
          logger.info(`[Trading] ✅ Force Buy: ซื้อ ${finalQuantity.toFixed(8)} ${symbol} ที่ $${price.toFixed(2)} ใช้เงิน $${finalBuyAmount.toFixed(2)} (${simulation.settings.initialBuyPercentage}% ของเงินลงทุน)`);
        }
      } catch (error) {
        logger.error(`[Trading] ❌ Error in Force Buy:`, error.message);
      }
    }

    // เพิ่ม symbol ไปยัง trading data collector
    tradingDataCollector.addSymbol(symbol);

    // ดึงข้อมูลย้อนหลัง 1 ปีก่อนเริ่มเทรด (เพื่อให้มีข้อมูลเพียงพอสำหรับการคำนวณ indicators)
    try {
      logger.info(`[Trading] 📊 กำลังดึงข้อมูลย้อนหลัง 1 ปีสำหรับ ${symbol}...`);
      await tradingService.loadHistoricalData(symbol, 1, '1d'); // ดึงข้อมูล 1 ปี, interval 1 วัน
      logger.info(`[Trading] ✅ โหลดข้อมูลย้อนหลัง 1 ปีสำเร็จ`);
    } catch (error) {
      logger.warn(`[Trading] ⚠️ ไม่สามารถโหลดข้อมูลย้อนหลังได้: ${error.message} - จะใช้ข้อมูลที่ดึงมาใหม่แทน`);
    }

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

    // ดึงราคาปัจจุบันและคำนวณสัญญาณ (พร้อม predictions)
    const { price, signal, predictions } = await tradingService.updatePriceAndCalculateSignal(simulation.symbol);

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

    // ตรวจสอบ predictions เพื่อคำนวณโอกาสที่ราคาจะขึ้น/ลง
    let predictionOpportunity = 0; // 0-100% (โอกาสที่ราคาจะขึ้น/ลงตามสัญญาณ)
    let shouldTradeBasedOnPrediction = false;
    
    if (predictions && predictions.length > 0 && signal) {
      // คำนวณโอกาสจาก predictions (ดู 3-5 periods แรก)
      const shortTermPredictions = predictions.slice(0, 5);
      let upCount = 0;
      let downCount = 0;
      let totalConfidence = 0;
      
      shortTermPredictions.forEach((pred, index) => {
        if (pred.price > price) {
          upCount++;
        } else if (pred.price < price) {
          downCount++;
        }
        totalConfidence += pred.confidence || 0;
      });
      
      const avgConfidence = shortTermPredictions.length > 0 ? totalConfidence / shortTermPredictions.length : 0;
      
      // คำนวณโอกาสตามสัญญาณ
      if (signal.signal === 'buy') {
        // ถ้าสัญญาณเป็น BUY → ดูโอกาสที่ราคาจะขึ้น
        predictionOpportunity = (upCount / shortTermPredictions.length) * 100;
        // ถ้าโอกาสมากกว่า 70% และ confidence ของ prediction สูง → ซื้อทันที
        shouldTradeBasedOnPrediction = predictionOpportunity >= 70 && avgConfidence >= 60;
      } else if (signal.signal === 'sell') {
        // ถ้าสัญญาณเป็น SELL → ดูโอกาสที่ราคาจะลง
        predictionOpportunity = (downCount / shortTermPredictions.length) * 100;
        // ถ้าโอกาสมากกว่า 70% และ confidence ของ prediction สูง → ขายทันที
        shouldTradeBasedOnPrediction = predictionOpportunity >= 70 && avgConfidence >= 60;
      }
      
      if (shouldTradeBasedOnPrediction) {
        logger.info(`[Trading] 🚀 Prediction Opportunity: ${predictionOpportunity.toFixed(1)}% (${signal.signal.toUpperCase()}), Avg Confidence: ${avgConfidence.toFixed(1)}% - จะซื้อ/ขายทันที`);
      }
    }

    // ตรวจสอบสัญญาณการเทรด - เพิ่ม min confidence เพื่อลดการขาดทุน
    // ปรับ minConfidence: สำหรับการขายให้ใช้ threshold ต่ำกว่า (40%) เพื่อให้ขายได้บ่อยขึ้น
    // สำหรับการซื้อให้ใช้ threshold สูงกว่า (50%) เพื่อลดความเสี่ยง
    // แต่ถ้ามี prediction opportunity > 70% → ลด threshold ลง 20% เพื่อซื้อ/ขายทันที
    const defaultMinConfidence = simulation.settings.minConfidence || 50;
    let minConfidenceForBuy = defaultMinConfidence >= 50 ? defaultMinConfidence : 50;
    let minConfidenceForSell = Math.max(30, defaultMinConfidence - 10); // ต่ำกว่าการซื้อ 10% แต่ไม่ต่ำกว่า 30%
    
    // ถ้ามี prediction opportunity > 70% → ลด threshold เพื่อซื้อ/ขายทันที
    if (shouldTradeBasedOnPrediction) {
      minConfidenceForBuy = Math.max(30, minConfidenceForBuy - 20); // ลด 20%
      minConfidenceForSell = Math.max(20, minConfidenceForSell - 20); // ลด 20%
      logger.info(`[Trading] ⚡ ลด confidence threshold เนื่องจาก prediction opportunity สูง: Buy=${minConfidenceForBuy}%, Sell=${minConfidenceForSell}%`);
    }
    const minBuyAmount = simulation.settings.minBuyAmount || 10;
    const maxBuyAmount = simulation.settings.maxBuyAmount || 1000;
    const minSellAmount = simulation.settings.minSellAmount || 0.0001;
    const maxSellAmount = simulation.settings.maxSellAmount || 1;

    logger.info(`[Trading] ==========================================`);
    logger.info(`[Trading] 📊 Update Simulation: ${simulation._id}`);
    logger.info(`[Trading] 📊 Signal: ${signal.signal}, Confidence: ${signal.confidence}%, MinConfidence (Buy: ${minConfidenceForBuy}%, Sell: ${minConfidenceForSell}%)`);
    logger.info(`[Trading] 💰 Balance: $${simulation.currentBalance.toFixed(2)}, Holdings: ${simulation.holdings.toFixed(8)} BTC`);
    logger.info(`[Trading] 💵 Current Price: $${price.toFixed(2)}`);
    if (signal.reasons && signal.reasons.length > 0) {
      logger.info(`[Trading] 📝 Reasons: ${signal.reasons.join(', ')}`);
    }
    
    // Force trade สำหรับทดสอบ - เพิ่มเงื่อนไขให้เข้มงวดขึ้น
    const hasNoTrades = simulation.totalTrades === 0;
    // ต้องมี confidence สูงพอและสัญญาณเป็น buy จริงๆ
    const shouldForceBuy = hasNoTrades && 
                           simulation.currentBalance >= minBuyAmount && 
                           signal.signal === 'buy' && 
                           signal.confidence >= 60; // ต้องมี confidence อย่างน้อย 60% (เพิ่มจาก 50% เพื่อลดความเสี่ยง)
    
    if (shouldForceBuy) {
      logger.info(`[Trading] 🔧 Force Buy - ยังไม่มีการเทรดเลย แต่มีสัญญาณชัดเจน (Confidence: ${signal.confidence}%)`);
      signal.reasons = signal.reasons || [];
      signal.reasons.push('Force Buy - เริ่มต้นการเทรด (สัญญาณชัดเจน)');
    }

    // ตรวจสอบ cooldown เพื่อป้องกันการซื้อซ้ำ
    const lastTradeTime = lastTradeTimes.get(simulation._id.toString()) || 0;
    const now = Date.now();
    const timeSinceLastTrade = now - lastTradeTime;
    const isInCooldown = timeSinceLastTrade < TRADE_COOLDOWN;

    // ตรวจสอบว่าควรขายอัตโนมัติหรือไม่ (เมื่อราคาสูงกว่าราคาซื้อเฉลี่ยและมีกำไร)
    // เพื่อเพิ่ม Current Balance
    if (simulation.holdings > 0 && simulation.averageBuyPrice > 0) {
      const priceVsAvgBuy = ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100;
      const unrealizedProfit = (price - simulation.averageBuyPrice) * simulation.holdings;
      
      // ถ้าราคาสูงกว่าราคาซื้อเฉลี่ย 0.5% ขึ้นไป และมีกำไร → ขายอัตโนมัติเพื่อเพิ่ม Current Balance
      if (priceVsAvgBuy >= 0.5 && unrealizedProfit > 0 && !isInCooldown) {
        logger.info(`[Trading] 💰 Auto Sell: ราคาสูงกว่าราคาซื้อเฉลี่ย ${priceVsAvgBuy.toFixed(2)}% - ขายเพื่อเพิ่ม Current Balance`);
        
        // ขายบางส่วน (30% ของ holdings) เพื่อเพิ่ม Current Balance
        let autoSellAmount = simulation.holdings * 0.3;
        
        // ตรวจสอบ min/max
        if (autoSellAmount < minSellAmount) {
          autoSellAmount = Math.min(minSellAmount, simulation.holdings);
        } else if (autoSellAmount > maxSellAmount) {
          autoSellAmount = maxSellAmount;
        }
        
        if (autoSellAmount > 0 && autoSellAmount <= simulation.holdings) {
          try {
            const revenue = autoSellAmount * price;
            const profit = (price - simulation.averageBuyPrice) * autoSellAmount;
            const profitPercentage = ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100;
            
            simulation.sell(price, autoSellAmount);
            simulation.totalProfit += profit;
            
            await Trade.create({
              simulationId: simulation._id,
              type: 'sell',
              symbol: simulation.symbol,
              price,
              quantity: autoSellAmount,
              amount: revenue,
              profit,
              profitPercentage,
              signal: {
                signal: 'sell',
                confidence: 100,
                reasons: [
                  `💰 Auto Sell: ราคาสูงกว่าราคาซื้อเฉลี่ย ${priceVsAvgBuy.toFixed(2)}%`,
                  `ขายเพื่อเพิ่ม Current Balance`,
                  `✅ กำไร: $${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`,
                ],
              },
              balanceAfter: simulation.currentBalance,
              holdingsAfter: simulation.holdings,
            });
            
            lastTradeTimes.set(simulation._id.toString(), now);
            logger.info(`[Trading] ✅ Auto Sell: ขาย ${autoSellAmount.toFixed(8)} ${simulation.symbol} ที่ $${price.toFixed(2)} กำไร: $${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%) - Current Balance เพิ่มขึ้น`);
          } catch (error) {
            logger.error(`[Trading] ❌ Error auto selling:`, error.message);
          }
        }
      }
    }

    // ใช้ minConfidence ที่แตกต่างกันสำหรับการซื้อและขาย
    // ถ้ามี prediction opportunity > 70% → ใช้ threshold ที่ลดลงแล้ว
    const requiredConfidence = signal.signal === 'sell' ? minConfidenceForSell : minConfidenceForBuy;
    
    // 🚀 ซื้อ/ขายทันทีเมื่อ confidence > 70% - ข้าม cooldown และการตรวจสอบอื่นๆ
    const isHighConfidenceTrade = (signal.signal === 'buy' && signal.confidence > 70) || 
                                   (signal.signal === 'sell' && signal.confidence > 70);
    
    // ถ้ามี prediction opportunity > 70% หรือ confidence > 70% → ข้าม cooldown เพื่อซื้อ/ขายทันที
    const canTrade = signal.confidence >= requiredConfidence && (!isInCooldown || shouldTradeBasedOnPrediction || isHighConfidenceTrade);
    
    if (isHighConfidenceTrade) {
      logger.info(`[Trading] 🚀 HIGH CONFIDENCE TRADE: ${signal.signal.toUpperCase()} (${signal.confidence}% confidence) - ซื้อ/ขายทันทีโดยข้าม cooldown`);
    }
    
    if (canTrade) {
      if (signal.signal === 'buy' && simulation.currentBalance > 0) {
        // ตรวจสอบว่ามี holdings มากเกินไปหรือไม่ (มากกว่า 70% ของมูลค่ารวม)
        // ถ้ามี holdings มากเกินไป → ไม่ซื้อเพิ่ม เพื่อให้มี Current Balance เพียงพอ
        // แต่ถ้ามี prediction opportunity > 70% → ข้ามการตรวจสอบนี้เพื่อซื้อทันที
        const accountValue = simulation.currentBalance + (simulation.holdings * price);
        const holdingsValue = simulation.holdings * price;
        const holdingsPercentage = (holdingsValue / accountValue) * 100;
        
        // 🚀 ถ้า confidence > 70% → ข้ามการตรวจสอบ holdings percentage เพื่อซื้อทันที
        if (holdingsPercentage > 70 && !shouldTradeBasedOnPrediction && !isHighConfidenceTrade) {
          logger.info(`[Trading] ⚠️ ไม่ซื้อเพิ่ม - มี holdings ${holdingsPercentage.toFixed(2)}% ของมูลค่ารวม (มากกว่า 70%) - รอขายเพื่อเพิ่ม Current Balance`);
        } else {
          if ((shouldTradeBasedOnPrediction || isHighConfidenceTrade) && holdingsPercentage > 70) {
            logger.info(`[Trading] 🚀 ${isHighConfidenceTrade ? 'HIGH CONFIDENCE' : 'Prediction opportunity'} สูง - ข้ามการตรวจสอบ holdings percentage เพื่อซื้อทันที`);
          }
          // ซื้อ - คำนวณจำนวนเงินที่จะซื้อ (Advanced Position Sizing ตาม Risk Management)
          // เป้าหมาย: เพิ่ม Total Value → ซื้อเมื่อมีโอกาสที่ Total Value จะเพิ่มขึ้น
          
          // ใช้ Kelly Criterion ถ้ามี (จาก Profit Maximization Algorithm)
          let buyAmount = 0;
          if (signal.kellyFraction && signal.kellyFraction > 0) {
            // ใช้ Kelly Criterion สำหรับ position sizing
            buyAmount = accountValue * signal.kellyFraction;
            logger.info(`[Trading] 🎯 ใช้ Kelly Criterion: ${(signal.kellyFraction * 100).toFixed(1)}% ของบัญชี ($${buyAmount.toFixed(2)})`);
          } else {
            // Fallback: ใช้ Risk-Reward Ratio: ใช้เงิน 2% ของบัญชีต่อการเทรด
            const riskPerTrade = 0.02; // 2% ของบัญชี
            buyAmount = accountValue * riskPerTrade;
            
            // ปรับตาม confidence - confidence สูง = ใช้เงินมากขึ้น
            const confidenceMultiplier = signal.confidence / 100;
            buyAmount = buyAmount * confidenceMultiplier;
          }
          
          // ถ้ามี prediction opportunity สูง หรือ confidence > 70% → เพิ่ม position size เพื่อเพิ่ม Total Value
          if (shouldTradeBasedOnPrediction || isHighConfidenceTrade) {
            const multiplier = isHighConfidenceTrade ? 2.0 : 1.5; // confidence > 70% → เพิ่ม 100%, prediction opportunity → เพิ่ม 50%
            buyAmount = buyAmount * multiplier;
            logger.info(`[Trading] 🚀 เพิ่ม position size ${((multiplier - 1) * 100).toFixed(0)}% เนื่องจาก ${isHighConfidenceTrade ? 'HIGH CONFIDENCE' : 'prediction opportunity'} สูง - เพื่อเพิ่ม Total Value`);
          }
        
        // ปรับตาม market regime (Dynamic Risk Management)
        const marketRegime = signal.indicators?.marketRegime || 'unknown';
        let regimeMultiplier = 1.0;
        if (marketRegime === 'bull') {
          regimeMultiplier = 1.2; // เพิ่ม position ใน bull market
        } else if (marketRegime === 'bear') {
          regimeMultiplier = 0.5; // ลด position ใน bear market
        } else if (marketRegime === 'volatile') {
          regimeMultiplier = 0.3; // ลด position มากใน volatile market
        }
        buyAmount = buyAmount * regimeMultiplier;
        
        // ปรับตาม volatility
        const volatility = signal.indicators?.volatility?.volatility || 0;
        if (volatility > 5) {
          buyAmount = buyAmount * 0.5; // ลด position ถ้า volatility สูง
        } else if (volatility < 2) {
          buyAmount = buyAmount * 1.1; // เพิ่ม position ถ้า volatility ต่ำ
        }
        
        // ใช้ buyPercentage เป็น upper limit
        const maxBuyByPercentage = (simulation.currentBalance * simulation.settings.buyPercentage) / 100;
        buyAmount = Math.min(buyAmount, maxBuyByPercentage);
        
        // ตรวจสอบ min/max
        if (buyAmount < minBuyAmount) {
          logger.info(`[Trading] ⚠️ Buy amount ($${buyAmount.toFixed(2)}) ต่ำกว่า min ($${minBuyAmount}) - ข้าม`);
        } else if (buyAmount > maxBuyAmount) {
          buyAmount = maxBuyAmount;
          logger.info(`[Trading] ⚠️ Buy amount เกิน max - จำกัดเป็น $${maxBuyAmount}`);
        }

        const quantity = buyAmount / price;

        if (quantity > 0 && buyAmount >= minBuyAmount && buyAmount <= simulation.currentBalance) {
          try {
            simulation.buy(price, quantity);

            // สร้างเหตุผลในการซื้อ
            const buyReasons = [
              `สัญญาณ: ${signal.signal.toUpperCase()} (Confidence: ${signal.confidence}%)`,
              ...(signal.reasons || []),
              ...(shouldTradeBasedOnPrediction ? [
                `🚀 Prediction Opportunity: ${predictionOpportunity.toFixed(1)}% - ซื้อทันทีก่อนราคาเปลี่ยน`,
                `📊 Predictions แสดงว่าราคามีโอกาสขึ้น ${predictionOpportunity.toFixed(1)}% ในอนาคต`,
              ] : []),
              `ซื้อ ${quantity.toFixed(8)} BTC ที่ราคา $${price.toFixed(2)}`,
              `ใช้เงิน $${buyAmount.toFixed(2)} (${((buyAmount / simulation.initialInvestment) * 100).toFixed(2)}% ของเงินลงทุน)`,
            ];

            const trade = await Trade.create({
              simulationId: simulation._id,
              type: 'buy',
              symbol: simulation.symbol,
              price,
              quantity,
              amount: buyAmount,
              profit: 0, // การซื้อยังไม่มี profit
              profitPercentage: 0, // การซื้อยังไม่มี profit
              signal: {
                ...signal,
                reasons: buyReasons,
              },
              balanceAfter: simulation.currentBalance,
              holdingsAfter: simulation.holdings,
            });

            // บันทึกผลลัพธ์ของอัลกอริทึมที่เลือก (ถ้ามี)
            if (signal.selectedAlgorithm) {
              try {
                await algorithmPerformanceTracker.updatePerformance(
                  signal.selectedAlgorithm,
                  simulation.symbol,
                  {
                    profit: 0, // ยังไม่มี profit เพราะเพิ่งซื้อ
                    profitPercentage: 0,
                    tradeType: 'buy',
                    price,
                    quantity,
                  }
                );
              } catch (error) {
                logger.error(`[Trading] Error updating algorithm performance:`, error);
              }
            }

            // อัพเดทเวลาการเทรดล่าสุด
            lastTradeTimes.set(simulation._id.toString(), now);
            
            logger.info(`[Trading] ✅ ซื้อ ${quantity.toFixed(8)} ${simulation.symbol} ที่ $${price.toFixed(2)} ใช้เงิน $${buyAmount.toFixed(2)}`);
          } catch (error) {
            logger.error(`[Trading] ❌ Error buying:`, error.message);
          }
        } else {
          logger.info(`[Trading] ⚠️ ไม่สามารถซื้อได้: quantity=${quantity.toFixed(8)}, buyAmount=$${buyAmount.toFixed(2)}, balance=$${simulation.currentBalance.toFixed(2)}`);
        }
        }
      } else if (signal.signal === 'sell' && simulation.holdings > 0) {
        // ขาย - คำนวณจำนวนเหรียญที่จะขาย
        let sellAmount = (simulation.holdings * simulation.settings.sellPercentage) / 100;
        
        // ตรวจสอบ min/max
        if (sellAmount < minSellAmount) {
          logger.info(`[Trading] ⚠️ Sell amount (${sellAmount.toFixed(8)}) ต่ำกว่า min (${minSellAmount}) - ข้าม`);
        } else if (sellAmount > maxSellAmount) {
          sellAmount = maxSellAmount;
          logger.info(`[Trading] ⚠️ Sell amount เกิน max - จำกัดเป็น ${maxSellAmount}`);
        }

        const revenue = sellAmount * price;
        const profit = (price - simulation.averageBuyPrice) * sellAmount;
        const profitPercentage = ((price - simulation.averageBuyPrice) / simulation.averageBuyPrice) * 100;

        // คำนวณ Total Value ก่อนและหลังการขาย (เพื่อตรวจสอบว่ามูลค่ารวมเพิ่มขึ้นหรือไม่)
        const currentTotalValue = simulation.currentBalance + (simulation.holdings * price);
        const newTotalValue = (simulation.currentBalance + revenue) + ((simulation.holdings - sellAmount) * price);
        const totalValueIncrease = newTotalValue - currentTotalValue;
        const totalValueIncreasePercent = currentTotalValue > 0 ? (totalValueIncrease / currentTotalValue) * 100 : 0;

        // ตรวจสอบว่ามีกำไรหรือไม่
        const isProfitable = profit > 0;
        
        // ตรวจสอบว่า Total Value เพิ่มขึ้นหรือไม่ (เป้าหมายหลัก)
        const isTotalValueIncreasing = totalValueIncrease > 0;
        
        // ปรับเงื่อนไขการขายให้เน้นกำไร: ขายได้บ่อยขึ้นแต่ยังคงเน้นกำไร
        // กลยุทธ์: ขายเมื่อมีโอกาสได้กำไร หรือขายเพื่อลดความเสี่ยงเมื่อราคาลงมาก
        const signalConfidence = signal.confidence || 0;
        let shouldSell = false;
        let sellReason = '';

        // ถ้ามี prediction opportunity > 70% → ขายทันที (ข้ามเงื่อนไขอื่นๆ)
        if (shouldTradeBasedOnPrediction && signal.signal === 'sell') {
          shouldSell = true;
          sellReason = `🚀 Prediction Opportunity: ${predictionOpportunity.toFixed(1)}% - ขายทันทีก่อนราคาเปลี่ยน`;
          logger.info(`[Trading] 🚀 Prediction-based Sell: ${sellReason}`);
        }

        // ตรวจสอบว่ามีความเสี่ยงสูงหรือไม่ (ราคาลงมากจากราคาซื้อเฉลี่ย)
        const priceDropFromAvg = ((simulation.averageBuyPrice - price) / simulation.averageBuyPrice) * 100;
        const isHighRisk = priceDropFromAvg > 3.0; // ราคาลงมากกว่า 3% จากราคาซื้อเฉลี่ย

        // ถ้ายังไม่ได้ตัดสินใจจาก prediction → ตรวจสอบเงื่อนไขอื่นๆ
        if (!shouldSell) {
          // เป้าหมายหลัก: เพิ่ม Total Value → ถ้า Total Value เพิ่มขึ้น → ขายได้ (แม้ขาดทุนเล็กน้อย)
          if (isTotalValueIncreasing && totalValueIncreasePercent > 0.1) {
            // Total Value เพิ่มขึ้น → ขายเพื่อเพิ่มมูลค่ารวม
            shouldSell = true;
            sellReason = `📈 Total Value เพิ่มขึ้น ${totalValueIncreasePercent.toFixed(2)}% (+$${totalValueIncrease.toFixed(2)}) - ขายเพื่อเพิ่มมูลค่ารวม`;
          } else if (isProfitable) {
          // ถ้ามีกำไร → ขายได้เสมอ (แต่ต้องมีกำไรอย่างน้อย 0.3% เพื่อลด transaction cost)
          shouldSell = profitPercentage >= 0.3;
          sellReason = shouldSell 
            ? `✅ มีกำไร ${profitPercentage.toFixed(2)}% - ขายเพื่อเพิ่ม Current Balance และ Total Value`
            : `กำไรน้อยเกินไป (${profitPercentage.toFixed(2)}% < 0.3%) - ไม่คุ้มค่ากับ transaction cost`;
        } else if (isHighRisk && signalConfidence >= 60) {
          // ถ้ามีความเสี่ยงสูง (ราคาลงมาก) และ signal confidence สูง → ขายเพื่อลดความเสี่ยง
          // แต่ต้องไม่ขาดทุนมากเกินไป (ไม่เกิน -2%)
          shouldSell = profitPercentage >= -2.0;
          sellReason = shouldSell 
            ? `⚠️ Stop Loss: ราคาลง ${priceDropFromAvg.toFixed(2)}% จากราคาซื้อเฉลี่ย - ขายเพื่อลดความเสี่ยง (ขาดทุน: ${profitPercentage.toFixed(2)}%)`
            : `ขาดทุนมากเกินไป (${profitPercentage.toFixed(2)}% < -2%) - ไม่ขายเพื่อรอโอกาสดีขึ้น`;
        } else if (signalConfidence > 70) {
          // 🚀 Signal confidence > 70% → ขายทันทีโดยไม่ต้องตรวจสอบกำไร/ขาดทุน
          shouldSell = true;
          sellReason = `🚀 HIGH CONFIDENCE SELL: Signal confidence สูงมาก (${signalConfidence}%) - ขายทันที (กำไร/ขาดทุน: ${profitPercentage.toFixed(2)}%)`;
        } else if (signalConfidence >= 70 && profitPercentage >= -1.0) {
          // Signal confidence = 70% → ขายได้แม้ขาดทุนเล็กน้อย (ไม่เกิน -1%)
          shouldSell = true;
          sellReason = `Signal confidence สูงมาก (${signalConfidence}%) - ขายแม้ขาดทุนเล็กน้อย (${profitPercentage.toFixed(2)}%) เพื่อรอโอกาสดีขึ้น`;
        } else {
          // กรณีอื่นๆ → ไม่ขายถ้าขาดทุน
          shouldSell = false;
          sellReason = `ไม่ขาย - ${isProfitable ? 'กำไรน้อยเกินไป' : `ขาดทุน ${profitPercentage.toFixed(2)}% และ signal confidence ต่ำ (${signalConfidence}%)`}`;
          }
        }

        // ถ้าไม่ควรขาย ให้ข้าม
        if (!shouldSell) {
          logger.info(`[Trading] ⚠️ ข้ามการขาย - ${sellReason} (กำไร/ขาดทุน: ${profitPercentage.toFixed(2)}%, ราคาขาย: $${price.toFixed(2)}, ราคาซื้อเฉลี่ย: $${simulation.averageBuyPrice.toFixed(2)})`);
        } else if (sellAmount >= minSellAmount && sellAmount <= simulation.holdings) {
          try {
            simulation.sell(price, sellAmount);
            simulation.totalProfit += profit;

            // สร้างเหตุผลในการขาย
            const sellReasons = [
              `สัญญาณ: ${signal.signal.toUpperCase()} (Confidence: ${signal.confidence}%)`,
              ...(signal.reasons || []),
              ...(shouldTradeBasedOnPrediction ? [
                `🚀 Prediction Opportunity: ${predictionOpportunity.toFixed(1)}% - ขายทันทีก่อนราคาเปลี่ยน`,
                `📊 Predictions แสดงว่าราคามีโอกาสลง ${predictionOpportunity.toFixed(1)}% ในอนาคต`,
              ] : []),
              `ขาย ${sellAmount.toFixed(8)} BTC ที่ราคา $${price.toFixed(2)}`,
              `ราคาซื้อเฉลี่ย: $${simulation.averageBuyPrice.toFixed(2)}`,
              isProfitable 
                ? `✅ กำไร: $${profit.toFixed(2)} (${profitPercentage >= 0 ? '+' : ''}${profitPercentage.toFixed(2)}%)`
                : `⚠️ ขาดทุน: $${Math.abs(profit).toFixed(2)} (${profitPercentage.toFixed(2)}%) - ขายเพื่อลดความเสี่ยง`,
            ];

            await Trade.create({
              simulationId: simulation._id,
              type: 'sell',
              symbol: simulation.symbol,
              price,
              quantity: sellAmount,
              amount: revenue,
              profit,
              profitPercentage,
              signal: {
                ...signal,
                reasons: sellReasons,
              },
              balanceAfter: simulation.currentBalance,
              holdingsAfter: simulation.holdings,
            });

                    // อัพเดทเวลาการเทรดล่าสุด
                    lastTradeTimes.set(simulation._id.toString(), now);
                    
                    if (isProfitable) {
                      logger.info(`[Trading] ✅ ขาย ${sellAmount.toFixed(8)} ${simulation.symbol} ที่ $${price.toFixed(2)} กำไร: $${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
                    } else {
                      logger.info(`[Trading] ⚠️ ขาย ${sellAmount.toFixed(8)} ${simulation.symbol} ที่ $${price.toFixed(2)} ขาดทุน: $${Math.abs(profit).toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
                    }
                  } catch (error) {
                    logger.error(`[Trading] ❌ Error selling:`, error.message);
                  }
        } else {
          logger.info(`[Trading] ⚠️ ไม่สามารถขายได้: sellAmount=${sellAmount.toFixed(8)}, holdings=${simulation.holdings.toFixed(8)}`);
        }
              } else {
                logger.info(`[Trading] ⏸️ Signal: ${signal.signal}, Balance: $${simulation.currentBalance.toFixed(2)}, Holdings: ${simulation.holdings.toFixed(8)}`);
              }
            } else if (isInCooldown) {
              const remainingCooldown = Math.ceil((TRADE_COOLDOWN - timeSinceLastTrade) / 1000);
              logger.info(`[Trading] ⏸️ อยู่ใน Cooldown: รออีก ${remainingCooldown} วินาที`);
            } else {
              const requiredConfidence = signal.signal === 'sell' ? minConfidenceForSell : minConfidenceForBuy;
              logger.info(`[Trading] ⏸️ Confidence ไม่ถึง threshold: ${signal.confidence}% < ${requiredConfidence}% (${signal.signal === 'sell' ? 'Sell' : 'Buy'})`);
            }

    // อัพเดทสถิติ
    simulation.updateStats(price);
    await simulation.save();

    // ดึงประวัติราคาและ predictions สำหรับส่งกลับไปยัง frontend
    const history = tradingService.getPriceHistory(simulation.symbol, 1000);
    const priceHistory = history.map(h => h.price);
    const predictionResult = priceHistory.length >= 30
      ? pricePredictionService.predictPriceCombined(priceHistory, 20)
      : { predictions: [] };
    const pricePredictions = predictionResult.predictions || [];

    res.json({
      success: true,
      message: 'อัพเดทการจำลองการเทรดสำเร็จ',
      data: {
        simulation,
        currentPrice: price,
        signal,
        profit: simulation.calculateProfit(price),
        history: history.map(h => ({
          price: h.price,
          timestamp: h.timestamp,
        })),
        predictions: pricePredictions,
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

    // ดึงข้อมูลล่าสุดจากฐานข้อมูล (ถ้ามี)
    const latestData = await TradingData.findOne({ symbol })
      .sort({ timestamp: -1 })
      .lean();

    if (latestData) {
      // ดึงประวัติราคาจาก trading service - ดึงทั้งหมด (ไม่จำกัด 50) เพื่อให้เห็นข้อมูล 1 ปี
      // ถ้ายังไม่มีข้อมูล 1 ปี ให้ดึงก่อน
      let history = tradingService.getPriceHistory(symbol, 1000);
      if (history.length < 100) {
        // ถ้ามีข้อมูลน้อยกว่า 100 จุด ให้ดึงข้อมูล 1 ปีก่อน
        logger.info(`[Trading Controller] 📊 ข้อมูลมีเพียง ${history.length} จุด - กำลังดึงข้อมูลย้อนหลัง 1 ปี...`);
        try {
          await tradingService.loadHistoricalData(symbol, 1, '1d');
          history = tradingService.getPriceHistory(symbol, 1000); // ดึงใหม่หลังจากโหลดข้อมูล
          logger.info(`[Trading Controller] ✅ ดึงข้อมูลย้อนหลัง 1 ปีสำเร็จ - ตอนนี้มี ${history.length} จุด`);
        } catch (error) {
          logger.warn(`[Trading Controller] ⚠️ ไม่สามารถโหลดข้อมูลย้อนหลังได้: ${error.message}`);
        }
      }
      const priceHistory = history.map(h => h.price);

      // คำนวณราคาในอนาคต (พร้อมตรวจสอบข้อมูล)
      const predictionResult = priceHistory.length >= 30
        ? pricePredictionService.predictPriceCombined(priceHistory, 20)
        : { predictions: [], dataStatus: { hasEnough: false, current: priceHistory.length, required: 30, message: `ข้อมูลไม่เพียงพอ: มี ${priceHistory.length} จุด ต้องการอย่างน้อย 30 จุด` }, accuracy: null };
      
      const predictions = predictionResult.predictions || [];

      // วิเคราะห์ prediction trend
      let predictionTrend = 'neutral';
      let predictionChange = 0;
      if (predictions.length > 0) {
        const firstPred = predictions[0].price;
        const lastPred = predictions[predictions.length - 1].price;
        predictionChange = ((lastPred - firstPred) / firstPred) * 100;
        
        if (predictionChange > 1) {
          predictionTrend = 'up'; // ราคาจะขึ้น
        } else if (predictionChange < -1) {
          predictionTrend = 'down'; // ราคาจะลง
        }
      }

      // เพิ่ม prediction info เข้าไปใน signal reasons
      const signalWithPrediction = { ...latestData.signal };
      if (predictionTrend === 'up' && !signalWithPrediction.reasons) {
        signalWithPrediction.reasons = [];
      }
      if (predictionTrend === 'up') {
        const predictionReason = `📈 Price Prediction: ราคามีแนวโน้มจะขึ้น ${predictionChange.toFixed(2)}% ในอนาคต → ควรซื้อ (ซื้อตอนราคาต่ำ → ขายตอนราคาสูง)`;
        if (!signalWithPrediction.reasons.includes(predictionReason)) {
          signalWithPrediction.reasons.push(predictionReason);
        }
      } else if (predictionTrend === 'down') {
        const predictionReason = `📉 Price Prediction: ราคามีแนวโน้มจะลง ${Math.abs(predictionChange).toFixed(2)}% ในอนาคต → ควรขาย (ขายก่อนราคาลง)`;
        if (!signalWithPrediction.reasons.includes(predictionReason)) {
          signalWithPrediction.reasons.push(predictionReason);
        }
      }

      // ใช้ข้อมูลจากฐานข้อมูล
      res.json({
        success: true,
        data: {
          symbol,
          currentPrice: latestData.price,
          signal: signalWithPrediction,
          indicators: latestData.indicators,
          statistics: latestData.statistics,
          history: history.map(h => ({
            price: h.price,
            timestamp: h.timestamp,
          })),
          predictions,
          predictionTrend,
          predictionChange,
        },
      });
    } else {
      // ถ้ายังไม่มีข้อมูลในฐานข้อมูล ให้คำนวณใหม่
      // ตรวจสอบว่ามีข้อมูล 1 ปีหรือไม่ ถ้าไม่มีให้ดึงก่อน
      let history = tradingService.getPriceHistory(symbol, 1000);
      if (history.length < 100) {
        // ถ้ามีข้อมูลน้อยกว่า 100 จุด ให้ดึงข้อมูล 1 ปีก่อน
        logger.info(`[Trading Controller] 📊 ข้อมูลมีเพียง ${history.length} จุด - กำลังดึงข้อมูลย้อนหลัง 1 ปี...`);
        try {
          await tradingService.loadHistoricalData(symbol, 1, '1d');
          history = tradingService.getPriceHistory(symbol, 1000); // ดึงใหม่หลังจากโหลดข้อมูล
          logger.info(`[Trading Controller] ✅ ดึงข้อมูลย้อนหลัง 1 ปีสำเร็จ - ตอนนี้มี ${history.length} จุด`);
        } catch (error) {
          logger.warn(`[Trading Controller] ⚠️ ไม่สามารถโหลดข้อมูลย้อนหลังได้: ${error.message}`);
        }
      }
      
      const { price, signal } = await tradingService.updatePriceAndCalculateSignal(symbol);
      // ดึง history อีกครั้งหลังจาก update (อาจมีข้อมูลเพิ่ม)
      history = tradingService.getPriceHistory(symbol, 1000);
      const priceHistory = history.map(h => h.price);

      // คำนวณราคาในอนาคต
      const predictions = priceHistory.length >= 20
        ? pricePredictionService.predictPriceCombined(priceHistory, 20)
        : [];

      // วิเคราะห์ prediction trend
      let predictionTrend = 'neutral';
      let predictionChange = 0;
      if (predictions.length > 0) {
        const firstPred = predictions[0].price;
        const lastPred = predictions[predictions.length - 1].price;
        predictionChange = ((lastPred - firstPred) / firstPred) * 100;
        
        if (predictionChange > 1) {
          predictionTrend = 'up'; // ราคาจะขึ้น
        } else if (predictionChange < -1) {
          predictionTrend = 'down'; // ราคาจะลง
        }
      }

      // เพิ่ม prediction info เข้าไปใน signal reasons
      if (!signal.reasons) {
        signal.reasons = [];
      }
      
      if (predictionTrend === 'up') {
        const predictionReason = `📈 Price Prediction: ราคามีแนวโน้มจะขึ้น ${predictionChange.toFixed(2)}% ในอนาคต → ควรซื้อ (ซื้อตอนราคาต่ำ → ขายตอนราคาสูง)`;
        if (!signal.reasons.includes(predictionReason)) {
          signal.reasons.push(predictionReason);
        }
      } else if (predictionTrend === 'down') {
        const predictionReason = `📉 Price Prediction: ราคามีแนวโน้มจะลง ${Math.abs(predictionChange).toFixed(2)}% ในอนาคต → ควรขาย (ขายก่อนราคาลง)`;
        if (!signal.reasons.includes(predictionReason)) {
          signal.reasons.push(predictionReason);
        }
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
          predictions,
          predictionTrend,
          predictionChange,
          predictionDataStatus: predictionResult.dataStatus,
          predictionAccuracy: predictionResult.accuracy,
        },
      });
    }
  } catch (error) {
    logger.error('❌ Error getting trading signal:', error.message);
    next(error);
  }
};

/**
 * @desc    ดึงสถิติการเทรด
 * @route   GET /api/trading/statistics/:symbol
 * @access  Private
 */
const getTradingStatistics = async (req, res, next) => {
  try {
    const { symbol = 'BTCUSDT' } = req.params;
    const { limit = 100 } = req.query;

    // ดึงข้อมูลล่าสุด
    const latestData = await TradingData.find({ symbol })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    // คำนวณสถิติรวม
    const totalRecords = await TradingData.countDocuments({ symbol });
    const buySignals = await TradingData.countDocuments({ 
      symbol, 
      'signal.signal': 'buy' 
    });
    const sellSignals = await TradingData.countDocuments({ 
      symbol, 
      'signal.signal': 'sell' 
    });

    res.json({
      success: true,
      data: {
        symbol,
        totalRecords,
        buySignals,
        sellSignals,
        latestData: latestData[0] || null,
        history: latestData,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting trading statistics:', error.message);
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
  getTradingStatistics,
};

