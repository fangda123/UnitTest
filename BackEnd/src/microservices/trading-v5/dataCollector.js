const AlpacaService = require('./alpacaService');
const logger = require('../../utils/logger');
const { getCache, setCache } = require('../../config/redis');

/**
 * Trading V5 Data Collector
 * Collects market data from Alpaca API
 */
class TradingV5DataCollector {
  constructor() {
    this.alpacaService = new AlpacaService();
    this.isRunning = false;
    this.updateInterval = null;
    this.symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA']; // Popular stocks
  }

  /**
   * Start data collection
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[TradingV5DataCollector] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[TradingV5DataCollector] Starting data collection...');

    // Initial data fetch
    await this.collectAllData();

    // Set up periodic updates (every 5 minutes)
    this.updateInterval = setInterval(() => {
      this.collectAllData().catch(err => {
        logger.error('[TradingV5DataCollector] Error in periodic update:', err);
      });
    }, 5 * 60 * 1000);

    logger.info('[TradingV5DataCollector] Data collection started');
  }

  /**
   * Stop data collection
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    logger.info('[TradingV5DataCollector] Data collection stopped');
  }

  /**
   * Collect data for all symbols
   */
  async collectAllData() {
    try {
      for (const symbol of this.symbols) {
        await this.collectSymbolData(symbol);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error('[TradingV5DataCollector] Error collecting data:', error);
    }
  }

  /**
   * Collect data for a specific symbol
   */
  async collectSymbolData(symbol) {
    try {
      // Get historical bars (last 1000 hours = ~42 days)
      const end = new Date();
      const start = new Date(end.getTime() - 42 * 24 * 60 * 60 * 1000); // 42 days ago

      const bars = await this.alpacaService.getBars(
        symbol,
        '1Hour',
        start.toISOString(),
        end.toISOString(),
        1000
      );

      if (bars.length > 0) {
        // Cache the data
        await setCache(
          `trading-v5:historical:${symbol}`,
          JSON.stringify(bars),
          3600 // 1 hour cache
        );

        // Also cache latest price
        const latestBar = bars[bars.length - 1];
        await setCache(
          `trading-v5:price:${symbol}`,
          JSON.stringify({
            symbol,
            price: latestBar.close,
            timestamp: latestBar.timestamp,
            volume: latestBar.volume,
          }),
          60 // 1 minute cache
        );

        logger.debug(`[TradingV5DataCollector] Collected ${bars.length} bars for ${symbol}`);
      }
    } catch (error) {
      logger.error(`[TradingV5DataCollector] Error collecting data for ${symbol}:`, error);
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(symbol, limit = 1000) {
    try {
      // Try cache first
      const cached = await getCache(`trading-v5:historical:${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        return data.slice(-limit);
      }

      // If not cached, fetch from Alpaca
      const end = new Date();
      const start = new Date(end.getTime() - Math.ceil(limit / 24) * 24 * 60 * 60 * 1000);

      const bars = await this.alpacaService.getBars(
        symbol,
        '1Hour',
        start.toISOString(),
        end.toISOString(),
        limit
      );

      // Cache it
      if (bars.length > 0) {
        await setCache(
          `trading-v5:historical:${symbol}`,
          JSON.stringify(bars),
          3600
        );
      }

      return bars;
    } catch (error) {
      logger.error(`[TradingV5DataCollector] Error getting historical data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol) {
    try {
      // Try cache first
      const cached = await getCache(`trading-v5:price:${symbol}`);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is fresh (less than 1 minute old)
        if (Date.now() - data.timestamp < 60000) {
          return data.price;
        }
      }

      // Fetch latest trade
      const trade = await this.alpacaService.getLatestTrade(symbol);
      if (trade) {
        // Cache it
        await setCache(
          `trading-v5:price:${symbol}`,
          JSON.stringify({
            symbol,
            price: trade.price,
            timestamp: Date.now(),
            volume: trade.size,
          }),
          60
        );
        return trade.price;
      }

      // Fallback to latest bar
      const bar = await this.alpacaService.getLatestBar(symbol, '1Hour');
      if (bar) {
        return bar.close;
      }

      return null;
    } catch (error) {
      logger.error(`[TradingV5DataCollector] Error getting current price for ${symbol}:`, error);
      return null;
    }
  }
}

module.exports = TradingV5DataCollector;


