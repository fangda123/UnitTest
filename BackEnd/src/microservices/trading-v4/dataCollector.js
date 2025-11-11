const axios = require('axios');
const WebSocket = require('ws');
const TradingData = require('../../models/TradingData');
const { setCache, getCache } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Trading V4 Data Collector Microservice
 * Enhanced data collection with 1 year historical data for ML training
 */
class TradingV4DataCollector {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443';
    this.symbols = this.parseSymbols(process.env.CRYPTO_SYMBOLS || 'BTCUSDT');
    this.updateInterval = parseInt(process.env.UPDATE_INTERVAL) || 60000; // 1 minute
    this.historicalDataLimit = 8760; // 1 year of hourly data (365 * 24)
    this.isRunning = false;
    this.dataBuffer = new Map();
    this.wsConnections = new Map();
  }

  parseSymbols(symbolsString) {
    return symbolsString.split(',').map((s) => s.trim().toUpperCase());
  }

  /**
   * Fetch 1 year of historical OHLCV data for ML training
   */
  async fetchOneYearHistoricalData(symbol, interval = '1h') {
    try {
      logger.info(`[TradingV4] Fetching 1 year historical data for ${symbol}...`);
      
      // Calculate timestamps for 1 year ago
      const endTime = Date.now();
      const startTime = endTime - (365 * 24 * 60 * 60 * 1000); // 1 year in milliseconds
      
      const allKlines = [];
      let currentStartTime = startTime;
      const batchSize = 1000; // Binance limit per request
      
      while (currentStartTime < endTime) {
        const response = await axios.get(`${this.apiUrl}/api/v3/klines`, {
          params: {
            symbol: symbol,
            interval: interval,
            limit: batchSize,
            startTime: currentStartTime,
            endTime: Math.min(currentStartTime + (batchSize * 60 * 60 * 1000), endTime),
          },
          timeout: 60000,
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

        allKlines.push(...klines);
        
        if (klines.length < batchSize) break;
        
        currentStartTime = klines[klines.length - 1].timestamp + 1;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`[TradingV4] Fetched ${allKlines.length} data points for ${symbol}`);
      return allKlines;
    } catch (error) {
      logger.error(`[TradingV4 DataCollector] Error fetching historical data for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Store historical data for ML processing
   */
  async storeHistoricalData(symbol, klines) {
    try {
      // Store in cache for fast access
      await setCache(
        `trading-v4:ohlcv:${symbol}`,
        JSON.stringify(klines),
        86400 // 24 hours
      );

      // Store recent data in Redis for real-time access
      await setCache(
        `trading-v4:historical:${symbol}`,
        JSON.stringify(klines.slice(-1000)), // Cache last 1000 points
        3600 // 1 hour
      );

      logger.info(`[TradingV4] Stored ${klines.length} data points for ${symbol}`);
    } catch (error) {
      logger.error(`[TradingV4 DataCollector] Error storing historical data:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch real-time price data
   */
  async fetchRealtimeData(symbol) {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/24hr`, {
        params: { symbol },
        timeout: 10000,
      });

      const data = response.data;
      return {
        timestamp: Date.now(),
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        open: parseFloat(data.openPrice),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
      };
    } catch (error) {
      logger.error(`[TradingV4 DataCollector] Error fetching realtime data:`, error.message);
      throw error;
    }
  }

  /**
   * Get cached historical data
   */
  async getHistoricalData(symbol, limit = 1000) {
    try {
      const cached = await getCache(`trading-v4:historical:${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        return data.slice(-limit);
      }
      return [];
    } catch (error) {
      logger.error(`[TradingV4 DataCollector] Error getting cached data:`, error.message);
      return [];
    }
  }

  /**
   * Initialize with 1 year historical data
   */
  async initialize() {
    try {
      logger.info('[TradingV4] Initializing data collector with 1 year historical data...');
      
      for (const symbol of this.symbols) {
        const historicalData = await this.fetchOneYearHistoricalData(symbol);
        await this.storeHistoricalData(symbol, historicalData);
      }
      
      logger.info('[TradingV4] Data collector initialized successfully');
    } catch (error) {
      logger.error('[TradingV4 DataCollector] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Start real-time data collection
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[TradingV4] Data collector is already running');
      return;
    }

    try {
      // Initialize with historical data
      await this.initialize();

      this.isRunning = true;
      logger.info('[TradingV4] Data collector started');

      // Start periodic updates
      this.updateIntervalId = setInterval(async () => {
        for (const symbol of this.symbols) {
          try {
            const realtimeData = await this.fetchRealtimeData(symbol);
            
            // Update cache
            const historical = await this.getHistoricalData(symbol, 1000);
            historical.push({
              timestamp: realtimeData.timestamp,
              open: realtimeData.open,
              high: realtimeData.high,
              low: realtimeData.low,
              close: realtimeData.price,
              volume: realtimeData.volume,
            });
            
            await setCache(
              `trading-v4:historical:${symbol}`,
              JSON.stringify(historical.slice(-1000)),
              3600
            );
          } catch (error) {
            logger.error(`[TradingV4] Error updating data for ${symbol}:`, error.message);
          }
        }
      }, this.updateInterval);

    } catch (error) {
      logger.error('[TradingV4 DataCollector] Start error:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop data collection
   */
  stop() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
    
    for (const [symbol, ws] of this.wsConnections) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    
    this.wsConnections.clear();
    this.isRunning = false;
    logger.info('[TradingV4] Data collector stopped');
  }
}

module.exports = TradingV4DataCollector;

