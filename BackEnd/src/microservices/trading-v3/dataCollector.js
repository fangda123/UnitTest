const axios = require('axios');
const WebSocket = require('ws');
const CryptoPrice = require('../../models/CryptoPrice');
const TradingData = require('../../models/TradingData');
const { setCache, getCache } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Trading V3 Data Collector Microservice
 * Enhanced data collection with historical data for ML training
 */
class TradingV3DataCollector {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443';
    this.symbols = this.parseSymbols(process.env.CRYPTO_SYMBOLS || 'BTCUSDT');
    this.updateInterval = parseInt(process.env.UPDATE_INTERVAL) || 60000; // 1 minute
    this.historicalDataLimit = 1000; // Keep last 1000 data points
    this.isRunning = false;
    this.dataBuffer = new Map(); // Buffer for recent data
  }

  parseSymbols(symbolsString) {
    return symbolsString.split(',').map((s) => s.trim().toUpperCase());
  }

  /**
   * Fetch historical OHLCV data for ML training
   */
  async fetchHistoricalData(symbol, interval = '1h', limit = 1000) {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v3/klines`, {
        params: {
          symbol: symbol,
          interval: interval,
          limit: limit,
        },
        timeout: 30000,
      });

      const klines = response.data.map((k) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
        quoteVolume: parseFloat(k[7]),
        trades: k[8],
        takerBuyBaseVolume: parseFloat(k[9]),
        takerBuyQuoteVolume: parseFloat(k[10]),
      }));

      return klines;
    } catch (error) {
      logger.error(`[TradingV3 DataCollector] Error fetching historical data for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Store historical data for ML processing
   */
  async storeHistoricalData(symbol, klines) {
    try {
      // Store in database - TradingData model uses price field, so we'll store close as price
      // For OHLCV data, we'll store it in a way that's compatible with the existing model
      for (const kline of klines) {
        await TradingData.findOneAndUpdate(
          {
            symbol: symbol,
            timestamp: new Date(kline.timestamp),
          },
          {
            symbol: symbol,
            timestamp: new Date(kline.timestamp),
            price: kline.close, // Store close price as main price
            // Store OHLCV in a way that can be retrieved later
            // We'll use the indicators field or create a custom field
            'statistics.high24h': kline.high,
            'statistics.low24h': kline.low,
            'indicators.volume24h': kline.volume,
          },
          { upsert: true, new: true }
        );
      }
      
      // Also store raw OHLCV data in cache for ML processing
      await setCache(
        `trading-v3:ohlcv:${symbol}`,
        JSON.stringify(klines),
        3600 // 1 hour
      );

      // Cache recent data in Redis
      await setCache(
        `trading-v3:historical:${symbol}`,
        JSON.stringify(klines.slice(-100)), // Cache last 100 points
        3600 // 1 hour
      );

      logger.info(`[TradingV3 DataCollector] Stored ${klines.length} historical data points for ${symbol}`);
    } catch (error) {
      logger.error(`[TradingV3 DataCollector] Error storing historical data:`, error.message);
    }
  }

  /**
   * Fetch current price and update buffer
   */
  async fetchCurrentPrice(symbol) {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/24hr`, {
        params: { symbol: symbol },
        timeout: 10000,
      });

      const data = response.data;
      const priceData = {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        highPrice24h: parseFloat(data.highPrice),
        lowPrice24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        priceChange24h: parseFloat(data.priceChange),
        priceChangePercent24h: parseFloat(data.priceChangePercent),
        timestamp: Date.now(),
      };

      // Update buffer
      if (!this.dataBuffer.has(symbol)) {
        this.dataBuffer.set(symbol, []);
      }
      const buffer = this.dataBuffer.get(symbol);
      buffer.push(priceData);
      if (buffer.length > this.historicalDataLimit) {
        buffer.shift();
      }

      // Cache current price
      await setCache(`trading-v3:price:${symbol}`, JSON.stringify(priceData), 60);

      return priceData;
    } catch (error) {
      logger.error(`[TradingV3 DataCollector] Error fetching price for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Start data collection
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[TradingV3 DataCollector] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[TradingV3 DataCollector] Starting data collection...');

    // Initial historical data fetch
    for (const symbol of this.symbols) {
      try {
        const klines = await this.fetchHistoricalData(symbol, '1h', 1000);
        await this.storeHistoricalData(symbol, klines);
      } catch (error) {
        logger.error(`[TradingV3 DataCollector] Failed to fetch initial data for ${symbol}:`, error.message);
      }
    }

    // Periodic updates
    this.updateIntervalId = setInterval(async () => {
      for (const symbol of this.symbols) {
        try {
          await this.fetchCurrentPrice(symbol);
          
          // Fetch latest klines every hour
          const now = new Date();
          if (now.getMinutes() === 0) {
            const klines = await this.fetchHistoricalData(symbol, '1h', 100);
            await this.storeHistoricalData(symbol, klines);
          }
        } catch (error) {
          logger.error(`[TradingV3 DataCollector] Error in periodic update for ${symbol}:`, error.message);
        }
      }
    }, this.updateInterval);

    logger.info('[TradingV3 DataCollector] Data collection started');
  }

  /**
   * Stop data collection
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }

    logger.info('[TradingV3 DataCollector] Data collection stopped');
  }

  /**
   * Get buffered data for a symbol
   */
  getBufferedData(symbol) {
    return this.dataBuffer.get(symbol) || [];
  }
}

module.exports = TradingV3DataCollector;

