const axios = require('axios');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const pricePredictionService = require('./pricePredictionService');

// Import algorithms
const TechnicalAlgorithm = require('./tradingAlgorithms/technicalAlgorithm');
const MomentumAlgorithm = require('./tradingAlgorithms/momentumAlgorithm');
const MeanReversionAlgorithm = require('./tradingAlgorithms/meanReversionAlgorithm');
const VolatilityAlgorithm = require('./tradingAlgorithms/volatilityAlgorithm');
const ProfitMaximizationAlgorithm = require('./tradingAlgorithms/profitMaximizationAlgorithm');
const algorithmSelector = require('./algorithmSelector');

/**
 * Trading Service
 * คำนวณสัญญาณการเทรดอัตโนมัติจากข้อมูลราคา (Multi-Algorithm System)
 */
class TradingService {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.priceHistory = new Map(); // เก็บประวัติราคา
    this.maxHistorySize = 1000; // เพิ่มเป็น 1000 เพื่อรองรับข้อมูลย้อนหลัง 1 ปี (365 วัน)
    
    // Initialize algorithms
    this.algorithms = {
      technical: new TechnicalAlgorithm(),
      momentum: new MomentumAlgorithm(),
      meanReversion: new MeanReversionAlgorithm(),
      volatility: new VolatilityAlgorithm(),
      profitMaximization: new ProfitMaximizationAlgorithm(), // อัลกอริทึมใหม่ที่เน้นกำไรสูงสุด
    };
  }

  /**
   * ดึงข้อมูลราคาปัจจุบัน
   */
  async getCurrentPrice(symbol = 'BTCUSDT') {
    try {
      const cacheKey = `crypto:price:${symbol}`;
      const cached = await getCache(cacheKey);
      
      if (cached) {
        return cached.price;
      }

      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/price`, {
        params: { symbol },
        timeout: 5000,
      });

      return parseFloat(response.data.price);
    } catch (error) {
      logger.error(`[Trading Service] ❌ ไม่สามารถดึงราคา ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * เพิ่มราคาเข้า history
   */
  addPriceToHistory(symbol, price) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol);
    history.push({
      price,
      timestamp: Date.now(),
    });

    // เก็บแค่ maxHistorySize ล่าสุด
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * คำนวณ Moving Average (MA)
   */
  calculateMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, p) => acc + p.price, 0);
    return sum / period;
  }

  /**
   * คำนวณ RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return null;
    }

    const recentPrices = prices.slice(-period - 1);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < recentPrices.length; i++) {
      const change = recentPrices[i].price - recentPrices[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * คำนวณ MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices) {
    if (prices.length < 26) {
      return null;
    }

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    if (!ema12 || !ema26) {
      return null;
    }

    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMAFromValue(prices, macdLine, 9);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - (signalLine || 0),
    };
  }

  /**
   * คำนวณ EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    const recentPrices = prices.slice(-period);
    
    // เริ่มต้นด้วย SMA
    let ema = recentPrices.slice(0, period).reduce((sum, p) => sum + p.price, 0) / period;

    // คำนวณ EMA
    for (let i = period; i < recentPrices.length; i++) {
      ema = (recentPrices[i].price * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * คำนวณ EMA จากค่าเริ่มต้น
   */
  calculateEMAFromValue(prices, startValue, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    let ema = startValue;

    const recentPrices = prices.slice(-period);
    for (const price of recentPrices) {
      ema = (price.price * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * คำนวณ Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return null;
    }

    const ma = this.calculateMA(prices, period);
    if (!ma) {
      return null;
    }

    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p.price - ma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: ma + (standardDeviation * stdDev),
      middle: ma,
      lower: ma - (standardDeviation * stdDev),
      stdDev: standardDeviation,
    };
  }

  /**
   * คำนวณ Volatility (Standard Deviation)
   */
  calculateVolatility(prices, period = 20) {
    if (prices.length < period) {
      return null;
    }

    const recentPrices = prices.slice(-period).map(p => p.price);
    const mean = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      stdDev,
      volatility: (stdDev / mean) * 100, // Volatility as percentage
      mean,
    };
  }

  /**
   * ตรวจสอบ Market Regime (Bull, Bear, Sideways)
   */
  detectMarketRegime(history) {
    if (history.length < 20) {
      return 'unknown';
    }

    const prices = history.slice(-20).map(p => p.price);
    const ma20 = this.calculateMA(history, 20);
    const currentPrice = prices[prices.length - 1];
    
    // คำนวณ volatility
    const volatility = this.calculateVolatility(history, 20);
    const isHighVolatility = volatility && volatility.volatility > 3; // > 3%
    
    // ตรวจสอบ trend
    const priceChange = ((currentPrice - prices[0]) / prices[0]) * 100;
    const aboveMA = currentPrice > ma20;
    
    if (priceChange > 5 && aboveMA && !isHighVolatility) {
      return 'bull'; // Bull market
    } else if (priceChange < -5 && !aboveMA && !isHighVolatility) {
      return 'bear'; // Bear market
    } else if (Math.abs(priceChange) < 2) {
      return 'sideways'; // Sideways/Range-bound
    } else {
      return 'volatile'; // High volatility
    }
  }

  /**
   * คำนวณสัญญาณการเทรดด้วยหลายอัลกอริทึมและเลือกที่ดีที่สุด
   * @returns {Object} { signal: 'buy'|'sell'|'hold', confidence: 0-100, indicators: {...}, selectedAlgorithm: '...', allSignals: [...] }
   */
  async calculateTradingSignal(symbol = 'BTCUSDT') {
    const history = this.priceHistory.get(symbol) || [];
    
    // ลด requirement เป็น 10 จุดเพื่อให้เทรดได้เร็วขึ้น
    if (history.length < 10) {
      logger.info(`[Trading Service] ⚠️ ข้อมูลไม่เพียงพอ: ${history.length}/10`);
      return {
        signal: 'hold',
        confidence: 0,
        reasons: [`ข้อมูลไม่เพียงพอ (${history.length}/10)`],
        buySignals: 0,
        sellSignals: 0,
        indicators: {},
        selectedAlgorithm: null,
        allSignals: [],
      };
    }
    
    logger.info(`[Trading Service] 📊 Calculating signal for ${symbol} using Multi-Algorithm System, History: ${history.length} points`);

    const currentPrice = history[history.length - 1].price;
    
    // คำนวณ indicators สำหรับใช้กับทุกอัลกอริทึม
    const indicators = this.calculateAllIndicators(history);
    const marketData = {
      currentPrice,
      symbol,
      timestamp: Date.now(),
    };

    // เรียกทุกอัลกอริทึมให้คำนวณสัญญาณ
    const algorithmSignals = [];
    
    for (const [algorithmName, algorithm] of Object.entries(this.algorithms)) {
      try {
        const signal = algorithm.calculateSignal(history, indicators, marketData);
        algorithmSignals.push({
          algorithm: algorithmName,
          ...signal,
        });
        logger.info(`[Trading Service] ${algorithmName}: ${signal.signal} (${signal.confidence}%)`);
      } catch (error) {
        logger.error(`[Trading Service] Error in ${algorithmName}:`, error);
      }
    }

    // เลือกอัลกอริทึมที่ดีที่สุด
    const selectedSignal = await algorithmSelector.selectBestAlgorithm(algorithmSignals, symbol);

    // รวม indicators เข้าไปในผลลัพธ์
    const result = {
      ...selectedSignal,
      indicators,
      history: history.slice(-20), // เก็บแค่ 20 จุดล่าสุด
    };

    logger.info(`[Trading Service] ✅ Selected Algorithm: ${selectedSignal.selectedAlgorithm}, Signal: ${selectedSignal.signal}, Confidence: ${selectedSignal.confidence}%`);
    
    return result;
  }

  /**
   * คำนวณ indicators ทั้งหมด
   */
  calculateAllIndicators(history) {
    const indicators = {};

    // Moving Averages
    if (history.length >= 10) {
      indicators.ma10 = this.calculateMA(history, 10);
    }
    if (history.length >= 20) {
      indicators.ma20 = this.calculateMA(history, 20);
    }
    if (history.length >= 50) {
      indicators.ma50 = this.calculateMA(history, 50);
    }

    // RSI
    if (history.length >= 15) {
      indicators.rsi = this.calculateRSI(history, 14);
    }

    // MACD
    if (history.length >= 26) {
      const macdResult = this.calculateMACD(history);
      indicators.macd = macdResult.macd;
      indicators.macdSignal = macdResult.signal;
      indicators.macdHistogram = macdResult.histogram;
    }

    // Bollinger Bands
    if (history.length >= 20) {
      indicators.bollinger = this.calculateBollingerBands(history, 20, 2);
    }

    // Volatility
    if (history.length >= 20) {
      indicators.volatility = this.calculateVolatility(history, 20);
    }

    // Market Regime
    if (history.length >= 20) {
      indicators.marketRegime = this.detectMarketRegime(history);
    }

    // Volume
    if (history.length > 0) {
      const recentVolumes = history.slice(-10).map(h => h.volume || 0);
      indicators.volume = recentVolumes[recentVolumes.length - 1] || 0;
      indicators.avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    }

    return indicators;
  }

  /**
   * คำนวณสัญญาณการเทรด (Legacy method - ใช้สำหรับ backward compatibility)
   * @returns {Object} { signal: 'buy'|'sell'|'hold', confidence: 0-100, indicators: {...} }
   */
  calculateTradingSignalLegacy(symbol = 'BTCUSDT') {
    const history = this.priceHistory.get(symbol) || [];
    
    // ลด requirement เป็น 10 จุดเพื่อให้เทรดได้เร็วขึ้น
    if (history.length < 10) {
      logger.info(`[Trading Service] ⚠️ ข้อมูลไม่เพียงพอ: ${history.length}/10`);
      return {
        signal: 'hold',
        confidence: 0,
        reasons: [`ข้อมูลไม่เพียงพอ (${history.length}/10)`],
        buySignals: 0,
        sellSignals: 0,
        indicators: {},
      };
    }
    
    logger.info(`[Trading Service] 📊 Calculating signal for ${symbol}, History: ${history.length} points`);

    const currentPrice = history[history.length - 1].price;
    
    // ถ้ามีข้อมูลน้อยกว่า 20 จุด ให้ใช้ MA ที่สั้นลง
    const ma20 = history.length >= 20 ? this.calculateMA(history, 20) : null;
    const ma50 = history.length >= 50 ? this.calculateMA(history, 50) : null;
    const rsi = history.length >= 15 ? this.calculateRSI(history, 14) : null;
    const macd = history.length >= 26 ? this.calculateMACD(history) : null;
    const bollinger = history.length >= 20 ? this.calculateBollingerBands(history, 20, 2) : null;
    const volatility = history.length >= 20 ? this.calculateVolatility(history, 20) : null;
    const marketRegime = history.length >= 20 ? this.detectMarketRegime(history) : 'unknown';
    
    // ถ้าไม่มี MA50 ให้ใช้ MA ที่สั้นกว่า
    const maShort = history.length >= 10 ? this.calculateMA(history, 10) : null;
    const maMedium = history.length >= 20 ? this.calculateMA(history, 20) : maShort;

    let buySignals = 0;
    let sellSignals = 0;
    const reasons = [];

    // สัญญาณ 1: Golden Cross / Death Cross (Moving Average Crossover)
    // ตรวจสอบ previous MA เพื่อหา crossover
    let previousMa20 = null;
    let previousMa50 = null;
    if (history.length >= 21) {
      const prevHistory = history.slice(0, -1);
      previousMa20 = this.calculateMA(prevHistory, 20);
      if (history.length >= 51) {
        previousMa50 = this.calculateMA(prevHistory, 50);
      }
    }

    if (ma20 && ma50 && previousMa20 && previousMa50) {
      // Golden Cross: MA20 ข้ามขึ้นเหนือ MA50
      if (ma20 > ma50 && previousMa20 <= previousMa50 && currentPrice > ma20) {
        buySignals += 3; // ให้คะแนนสูงสำหรับ Golden Cross
        reasons.push('✅ Golden Cross: MA20 ข้ามขึ้นเหนือ MA50 - สัญญาณซื้อที่แข็งแกร่ง');
      } 
      // Death Cross: MA20 ข้ามลงใต้ MA50
      else if (ma20 < ma50 && previousMa20 >= previousMa50 && currentPrice < ma20) {
        sellSignals += 3; // ให้คะแนนสูงสำหรับ Death Cross
        reasons.push('❌ Death Cross: MA20 ข้ามลงใต้ MA50 - สัญญาณขายที่แข็งแกร่ง');
      }
      // Trend Following
      else if (ma20 > ma50 && currentPrice > ma20) {
        buySignals += 2;
        reasons.push('MA20 อยู่เหนือ MA50 และราคาอยู่เหนือ MA20 - แนวโน้มขาขึ้น');
      } else if (ma20 < ma50 && currentPrice < ma20) {
        sellSignals += 2;
        reasons.push('MA20 อยู่ใต้ MA50 และราคาอยู่ใต้ MA20 - แนวโน้มขาลง');
      }
    } else if (maShort && maMedium) {
      // ใช้ MA ที่สั้นกว่าเมื่อไม่มีข้อมูลเพียงพอ
      if (maShort > maMedium && currentPrice > maShort) {
        buySignals += 1;
        reasons.push('MA10 อยู่เหนือ MA20 และราคาอยู่เหนือ MA10');
      } else if (maShort < maMedium && currentPrice < maShort) {
        sellSignals += 1;
        reasons.push('MA10 อยู่ใต้ MA20 และราคาอยู่ใต้ MA10');
      }
    }

    // สัญญาณ 2: RSI (Relative Strength Index)
    if (rsi !== null) {
      // Oversold - โอกาสซื้อ (RSI < 30)
      if (rsi < 30) {
        buySignals += 3; // ให้คะแนนสูงสำหรับ oversold
        reasons.push(`✅ RSI Oversold (${rsi.toFixed(2)}) - โอกาสซื้อที่ดี`);
      } 
      // Overbought - โอกาสขาย (RSI > 70)
      else if (rsi > 70) {
        sellSignals += 3; // ให้คะแนนสูงสำหรับ overbought
        reasons.push(`❌ RSI Overbought (${rsi.toFixed(2)}) - โอกาสขายที่ดี`);
      } 
      // RSI อยู่ในช่วงต่ำ (30-50) - แนวโน้มซื้อ
      else if (rsi < 50 && rsi >= 30) {
        buySignals += 1;
        reasons.push(`RSI อยู่ในช่วงต่ำ (${rsi.toFixed(2)}) - แนวโน้มซื้อ`);
      } 
      // RSI อยู่ในช่วงสูง (50-70) - แนวโน้มขาย
      else if (rsi > 50 && rsi <= 70) {
        sellSignals += 1;
        reasons.push(`RSI อยู่ในช่วงสูง (${rsi.toFixed(2)}) - แนวโน้มขาย`);
      }
    }

    // สัญญาณ 3: MACD Crossover
    if (macd) {
      // ตรวจสอบ previous MACD เพื่อหา crossover
      let previousMacd = null;
      let previousSignal = null;
      if (history.length >= 27) {
        const prevHistory = history.slice(0, -1);
        const prevMacdData = this.calculateMACD(prevHistory);
        if (prevMacdData) {
          previousMacd = prevMacdData.macd;
          previousSignal = prevMacdData.signal;
        }
      }

      // MACD Crossover ขึ้น - สัญญาณซื้อที่แข็งแกร่ง
      if (macd.macd > macd.signal && macd.histogram > 0) {
        if (previousMacd && previousSignal && previousMacd <= previousSignal) {
          buySignals += 3; // MACD crossover ขึ้น
          reasons.push('✅ MACD Crossover ขึ้น - MACD ข้ามขึ้นเหนือ Signal Line (สัญญาณซื้อแข็งแกร่ง)');
        } else {
          buySignals += 2; // MACD อยู่เหนือ Signal
          reasons.push('MACD อยู่เหนือ Signal Line และ Histogram เป็นบวก');
        }
      } 
      // MACD Crossover ลง - สัญญาณขายที่แข็งแกร่ง
      else if (macd.macd < macd.signal && macd.histogram < 0) {
        if (previousMacd && previousSignal && previousMacd >= previousSignal) {
          sellSignals += 3; // MACD crossover ลง
          reasons.push('❌ MACD Crossover ลง - MACD ข้ามลงใต้ Signal Line (สัญญาณขายแข็งแกร่ง)');
        } else {
          sellSignals += 2; // MACD อยู่ใต้ Signal
          reasons.push('MACD อยู่ใต้ Signal Line และ Histogram เป็นลบ');
        }
      }
    }

    // สัญญาณ 4: Price Trend (ใช้หลายช่วงเวลา)
    if (history.length >= 10) {
      // ตรวจสอบ trend ในหลายช่วงเวลา
      const shortTrend = history.slice(-5).map(p => p.price);
      const mediumTrend = history.slice(-10).map(p => p.price);
      
      const shortUptrend = shortTrend.every((price, i) => i === 0 || price >= shortTrend[i - 1]);
      const shortDowntrend = shortTrend.every((price, i) => i === 0 || price <= shortTrend[i - 1]);
      
      const mediumUptrend = mediumTrend[mediumTrend.length - 1] > mediumTrend[0];
      const mediumDowntrend = mediumTrend[mediumTrend.length - 1] < mediumTrend[0];

      // Trend ที่ชัดเจนในหลายช่วงเวลา
      if (shortUptrend && mediumUptrend) {
        buySignals += 2;
        reasons.push('✅ แนวโน้มขาขึ้นชัดเจนทั้งระยะสั้นและระยะกลาง');
      } else if (shortDowntrend && mediumDowntrend) {
        sellSignals += 2;
        reasons.push('❌ แนวโน้มขาลงชัดเจนทั้งระยะสั้นและระยะกลาง');
      } else if (shortUptrend || mediumUptrend) {
        buySignals += 1;
        reasons.push('ราคามีแนวโน้มขึ้น');
      } else if (shortDowntrend || mediumDowntrend) {
        sellSignals += 1;
        reasons.push('ราคามีแนวโน้มลง');
      }
    }

    // สัญญาณ 5: Bollinger Bands (Range Trading Strategy)
    if (bollinger) {
      const bbPercent = ((currentPrice - bollinger.lower) / (bollinger.upper - bollinger.lower)) * 100;
      
      // ราคาอยู่ที่ lower band (support) - โอกาสซื้อ
      if (currentPrice <= bollinger.lower) {
        buySignals += 3; // ให้คะแนนสูงสำหรับ support level
        reasons.push(`✅ Bollinger Bands: ราคาอยู่ที่ Lower Band (Support) - โอกาสซื้อที่ดี`);
      } 
      // ราคาอยู่ที่ upper band (resistance) - โอกาสขาย
      else if (currentPrice >= bollinger.upper) {
        sellSignals += 3; // ให้คะแนนสูงสำหรับ resistance level
        reasons.push(`❌ Bollinger Bands: ราคาอยู่ที่ Upper Band (Resistance) - โอกาสขายที่ดี`);
      }
      // ราคาอยู่ใกล้ lower band (< 20%)
      else if (bbPercent < 20) {
        buySignals += 1;
        reasons.push(`Bollinger Bands: ราคาอยู่ใกล้ Lower Band (${bbPercent.toFixed(1)}%)`);
      }
      // ราคาอยู่ใกล้ upper band (> 80%)
      else if (bbPercent > 80) {
        sellSignals += 1;
        reasons.push(`Bollinger Bands: ราคาอยู่ใกล้ Upper Band (${bbPercent.toFixed(1)}%)`);
      }
    }

    // สัญญาณ 6: Volatility และ Market Regime
    if (volatility) {
      // ในตลาดที่มี volatility ต่ำ = โอกาสเทรดดีกว่า
      if (volatility.volatility < 2 && marketRegime !== 'volatile') {
        // เพิ่ม confidence สำหรับสัญญาณที่มีอยู่
        if (buySignals > sellSignals) {
          buySignals += 1;
          reasons.push(`Volatility ต่ำ (${volatility.volatility.toFixed(2)}%) - สภาวะตลาดเหมาะสำหรับเทรด`);
        } else if (sellSignals > buySignals) {
          sellSignals += 1;
          reasons.push(`Volatility ต่ำ (${volatility.volatility.toFixed(2)}%) - สภาวะตลาดเหมาะสำหรับเทรด`);
        }
      }
      // ในตลาดที่มี volatility สูง = ระวัง
      else if (volatility.volatility > 5) {
        reasons.push(`⚠️ Volatility สูง (${volatility.volatility.toFixed(2)}%) - ตลาดมีความเสี่ยงสูง`);
      }
    }

    // Market Regime Adjustment
    if (marketRegime === 'bull' && buySignals > sellSignals) {
      buySignals += 1; // เพิ่มสัญญาณซื้อในตลาดขาขึ้น
      reasons.push('📈 Bull Market - แนวโน้มขาขึ้น');
    } else if (marketRegime === 'bear' && sellSignals > buySignals) {
      sellSignals += 1; // เพิ่มสัญญาณขายในตลาดขาลง
      reasons.push('📉 Bear Market - แนวโน้มขาลง');
    } else if (marketRegime === 'sideways') {
      // ในตลาด sideways ให้ใช้ range trading (Bollinger Bands)
      reasons.push('↔️ Sideways Market - ใช้ Range Trading Strategy');
    } else if (marketRegime === 'volatile') {
      // ในตลาด volatile ให้ระวัง
      reasons.push('⚡ Volatile Market - ตลาดมีความผันผวนสูง');
    }

    // กำหนดสัญญาณ - ใช้ Multiple Confirmation (ตามหลักการในคู่มือ)
    let signal = 'hold';
    let confidence = 0;

    // คำนวณ total possible signals (สูงสุดประมาณ 11-12)
    const maxPossibleSignals = 12;
    const signalRatio = Math.max(buySignals, sellSignals) / maxPossibleSignals;

    // ต้องมีสัญญาณอย่างน้อย 4 ตัว (Multiple Confirmation) และต้องมากกว่าฝั่งตรงข้ามอย่างชัดเจน
    if (buySignals > sellSignals && buySignals >= 4 && (buySignals - sellSignals) >= 2) {
      signal = 'buy';
      // Confidence = base 50% + (signal ratio * 40%) + bonus สำหรับ strong signals
      const baseConfidence = 50;
      const ratioBonus = signalRatio * 40;
      const strongSignalBonus = buySignals >= 6 ? 10 : 0; // Bonus ถ้ามีสัญญาณแข็งแกร่งมาก
      confidence = Math.min(100, baseConfidence + ratioBonus + strongSignalBonus);
    } else if (sellSignals > buySignals && sellSignals >= 4 && (sellSignals - buySignals) >= 2) {
      signal = 'sell';
      const baseConfidence = 50;
      const ratioBonus = signalRatio * 40;
      const strongSignalBonus = sellSignals >= 6 ? 10 : 0;
      confidence = Math.min(100, baseConfidence + ratioBonus + strongSignalBonus);
    } else {
      signal = 'hold';
      confidence = Math.max(0, 20 - Math.abs(buySignals - sellSignals) * 5); // ลด confidence ถ้ามีสัญญาณขัดแย้ง
    }

    // ถ้าไม่มีสัญญาณชัดเจน ให้ลองเทรดตาม trend (Trend Following Strategy)
    // แต่ต้องมี confirmation จาก indicators ด้วย
    if (signal === 'hold' && history.length >= 20) {
      const recentPrices = history.slice(-20).map(h => h.price);
      const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
      
      // ต้องมี trend ชัดเจน (3%+) และมี confirmation จาก indicators
      if (priceChange > 3.0 && buySignals >= 2) { // ราคาขึ้น > 3% และมี buy signals อย่างน้อย 2
        signal = 'buy';
        confidence = 60;
        reasons.push(`✅ Trend Following: ราคาขึ้น ${priceChange.toFixed(2)}% ใน 20 จุดล่าสุด + มี confirmation จาก indicators`);
      } else if (priceChange < -3.0 && sellSignals >= 2) { // ราคาลง > 3% และมี sell signals อย่างน้อย 2
        signal = 'sell';
        confidence = 60;
        reasons.push(`❌ Trend Following: ราคาลง ${Math.abs(priceChange).toFixed(2)}% ใน 20 จุดล่าสุด + มี confirmation จาก indicators`);
      }
      // ถ้า trend ไม่ชัดเจนหรือไม่มี confirmation ให้ hold
    }

    const result = {
      signal,
      confidence: Math.round(confidence),
      reasons: reasons.length > 0 ? reasons : ['ไม่มีสัญญาณชัดเจน'],
      indicators: {
        currentPrice,
        ma20: ma20 ? ma20.toFixed(2) : null,
        ma50: ma50 ? ma50.toFixed(2) : null,
        rsi: rsi ? rsi.toFixed(2) : null,
        macd: macd ? {
          macd: macd.macd.toFixed(4),
          signal: macd.signal.toFixed(4),
          histogram: macd.histogram.toFixed(4),
        } : null,
        bollinger: bollinger ? {
          upper: bollinger.upper.toFixed(2),
          middle: bollinger.middle.toFixed(2),
          lower: bollinger.lower.toFixed(2),
        } : null,
        volatility: volatility ? {
          stdDev: volatility.stdDev.toFixed(2),
          volatility: volatility.volatility.toFixed(2),
        } : null,
        marketRegime,
      },
      buySignals,
      sellSignals,
    };
    
    logger.info(`[Trading Service] ✅ Signal calculated: ${result.signal}, Confidence: ${result.confidence}%, Buy: ${buySignals}, Sell: ${sellSignals}`);
    
    return result;
  }

  /**
   * อัพเดทราคาและคำนวณสัญญาณ
   */
  async updatePriceAndCalculateSignal(symbol = 'BTCUSDT') {
    try {
      const price = await this.getCurrentPrice(symbol);
      this.addPriceToHistory(symbol, price);
      
      const signal = await this.calculateTradingSignal(symbol);
      
      // คำนวณ predictions เพื่อใช้ในการตัดสินใจซื้อ/ขาย
      const history = this.getPriceHistory(symbol, 1000);
      const priceArray = history.map(h => h.price);
      let predictions = [];
      
      if (priceArray.length >= 30) {
        try {
          const predictionResult = pricePredictionService.predictPriceCombined(priceArray, 10);
          predictions = predictionResult.predictions || [];
          logger.info(`[Trading Service] 📊 Predictions: ${predictions.length} periods calculated`);
        } catch (error) {
          logger.warn(`[Trading Service] ⚠️ Error calculating predictions: ${error.message}`);
        }
      }
      
      return {
        price,
        signal,
        predictions,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`[Trading Service] ❌ Error updating price:`, error.message);
      throw error;
    }
  }

  /**
   * ดึงประวัติราคา
   */
  getPriceHistory(symbol = 'BTCUSDT', limit = 50) {
    const history = this.priceHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  /**
   * รีเซ็ตประวัติราคา
   */
  resetHistory(symbol = 'BTCUSDT') {
    this.priceHistory.set(symbol, []);
  }

  /**
   * ดึงข้อมูลราคาย้อนหลัง 1 ปีจาก Binance API และโหลดเข้า priceHistory
   * @param {string} symbol - Symbol เช่น BTCUSDT
   * @param {number} years - จำนวนปีย้อนหลัง (default: 1)
   * @param {string} interval - Time interval (default: '1d' = 1 วัน)
   */
  async loadHistoricalData(symbol = 'BTCUSDT', years = 1, interval = '1d') {
    try {
      logger.info(`[Trading Service] 📊 กำลังดึงข้อมูลย้อนหลัง ${years} ปีสำหรับ ${symbol} (interval: ${interval})...`);
      
      const now = Date.now();
      const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
      const startTime = now - (years * oneYearInMs);
      
      // ดึงข้อมูลจาก Binance klines API
      const response = await axios.get(`${this.apiUrl}/api/v3/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval: interval, // 1d = 1 วัน, 1h = 1 ชั่วโมง, 1w = 1 สัปดาห์
          startTime: startTime,
          endTime: now,
          limit: 1000, // Binance max limit
        },
        timeout: 30000, // 30 seconds
      });

      if (!response.data || response.data.length === 0) {
        logger.warn(`[Trading Service] ⚠️ ไม่พบข้อมูลย้อนหลังสำหรับ ${symbol}`);
        return;
      }

      // แปลงข้อมูลจาก Binance format เป็น format ของเรา
      // Binance klines format: [Open time, Open, High, Low, Close, Volume, ...]
      const klines = response.data.map((kline) => ({
        price: parseFloat(kline[4]), // Close price
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        open: parseFloat(kline[1]),
        volume: parseFloat(kline[5]),
        timestamp: kline[0],
        date: new Date(kline[0]),
      }));

      // ถ้ามีข้อมูลมากกว่า 1000 จุด (Binance limit) ต้องดึงหลายครั้ง
      // แต่สำหรับ 1 ปีกับ interval 1d จะได้ประมาณ 365 จุด ซึ่งไม่เกิน 1000
      // ถ้าใช้ interval เล็กกว่า (เช่น 1h) อาจต้องดึงหลายครั้ง
      
      // โหลดข้อมูลเข้า priceHistory
      if (!this.priceHistory.has(symbol)) {
        this.priceHistory.set(symbol, []);
      }

      // เพิ่มข้อมูลทั้งหมดเข้า history (เรียงตาม timestamp)
      const existingHistory = this.priceHistory.get(symbol);
      const combinedHistory = [...existingHistory, ...klines];
      
      // เรียงตาม timestamp และลบข้อมูลซ้ำ
      const uniqueHistory = combinedHistory
        .sort((a, b) => a.timestamp - b.timestamp)
        .filter((item, index, self) => 
          index === self.findIndex((t) => t.timestamp === item.timestamp)
        );

      // เก็บแค่ maxHistorySize ล่าสุด (แต่ถ้าเป็นข้อมูลย้อนหลัง ให้เก็บทั้งหมด)
      // สำหรับข้อมูลย้อนหลัง 1 ปี (365 วัน) จะเก็บทั้งหมด
      if (uniqueHistory.length > this.maxHistorySize) {
        // เก็บข้อมูลล่าสุด maxHistorySize จุด
        this.priceHistory.set(symbol, uniqueHistory.slice(-this.maxHistorySize));
      } else {
        this.priceHistory.set(symbol, uniqueHistory);
      }

      logger.info(`[Trading Service] ✅ โหลดข้อมูลย้อนหลัง ${years} ปีสำเร็จ: ${klines.length} จุด (รวมทั้งหมด: ${this.priceHistory.get(symbol).length} จุด)`);
      
      return {
        loaded: klines.length,
        total: this.priceHistory.get(symbol).length,
        symbol,
        interval,
        years,
      };
    } catch (error) {
      logger.error(`[Trading Service] ❌ Error loading historical data for ${symbol}:`, error.message);
      throw error;
    }
  }
}

// สร้าง instance เดียว (Singleton pattern)
const tradingService = new TradingService();

module.exports = tradingService;

