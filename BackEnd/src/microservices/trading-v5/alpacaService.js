const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Alpaca API Service
 * Handles all interactions with Alpaca Paper Trading API
 */
class AlpacaService {
  constructor() {
    this.baseURL = 'https://paper-api.alpaca.markets/v2';
    this.apiKey = 'PKMBUJFT2AH25MQROH67HJNKEI';
    this.apiSecret = 'CTV26FrU65K4djHWKoPCVSpJYufr9TF18aCuRu63vnDg';
    
    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'APCA-API-KEY-ID': this.apiKey,
        'APCA-API-SECRET-KEY': this.apiSecret,
      },
    });
  }

  /**
   * Get account information
   */
  async getAccount() {
    try {
      const response = await this.client.get('/account');
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error getting account:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get positions
   */
  async getPositions() {
    try {
      const response = await this.client.get('/positions');
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error getting positions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get position for a specific symbol
   */
  async getPosition(symbol) {
    try {
      const response = await this.client.get(`/positions/${symbol}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No position
      }
      logger.error(`[AlpacaService] Error getting position for ${symbol}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get orders
   */
  async getOrders(params = {}) {
    try {
      const response = await this.client.get('/orders', { params });
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error getting orders:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(symbol, qty, side = 'buy') {
    try {
      const order = {
        symbol: symbol,
        qty: qty,
        side: side, // 'buy' or 'sell'
        type: 'market',
        time_in_force: 'day',
      };

      const response = await this.client.post('/orders', order);
      logger.info(`[AlpacaService] Market order placed: ${side} ${qty} ${symbol}`);
      return response.data;
    } catch (error) {
      logger.error(`[AlpacaService] Error placing market order:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(symbol, qty, limitPrice, side = 'buy') {
    try {
      const order = {
        symbol: symbol,
        qty: qty,
        side: side,
        type: 'limit',
        time_in_force: 'day',
        limit_price: limitPrice,
      };

      const response = await this.client.post('/orders', order);
      logger.info(`[AlpacaService] Limit order placed: ${side} ${qty} ${symbol} @ ${limitPrice}`);
      return response.data;
    } catch (error) {
      logger.error(`[AlpacaService] Error placing limit order:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    try {
      await this.client.delete(`/orders/${orderId}`);
      logger.info(`[AlpacaService] Order ${orderId} cancelled`);
      return true;
    } catch (error) {
      logger.error(`[AlpacaService] Error cancelling order:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders() {
    try {
      await this.client.delete('/orders');
      logger.info('[AlpacaService] All orders cancelled');
      return true;
    } catch (error) {
      logger.error('[AlpacaService] Error cancelling all orders:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get bars (OHLCV data) for a symbol
   */
  async getBars(symbol, timeframe = '1Hour', start, end, limit = 1000) {
    try {
      const params = {
        symbols: symbol,
        timeframe: timeframe, // '1Min', '5Min', '15Min', '30Min', '1Hour', '1Day'
        limit: limit,
      };

      if (start) params.start = start;
      if (end) params.end = end;

      const response = await this.client.get('/bars', { params });
      
      // Alpaca returns data in format: { symbol: [{ t, o, h, l, c, v, n, vw }] }
      const bars = response.data[symbol] || [];
      
      // Convert to our format
      return bars.map(bar => ({
        timestamp: new Date(bar.t).getTime(),
        open: parseFloat(bar.o),
        high: parseFloat(bar.h),
        low: parseFloat(bar.l),
        close: parseFloat(bar.c),
        volume: parseFloat(bar.v),
        time: bar.t,
      }));
    } catch (error) {
      logger.error(`[AlpacaService] Error getting bars for ${symbol}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get latest bar (current price)
   */
  async getLatestBar(symbol, timeframe = '1Hour') {
    try {
      const bars = await this.getBars(symbol, timeframe, null, null, 1);
      return bars.length > 0 ? bars[0] : null;
    } catch (error) {
      logger.error(`[AlpacaService] Error getting latest bar for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get latest quote
   */
  async getLatestQuote(symbol) {
    try {
      const response = await this.client.get('/stocks/quotes/latest', {
        params: { symbols: symbol },
      });
      
      const quote = response.data[symbol];
      if (!quote) return null;

      return {
        symbol: symbol,
        bid: parseFloat(quote.bp), // bid price
        ask: parseFloat(quote.ap), // ask price
        bidSize: parseFloat(quote.bs),
        askSize: parseFloat(quote.as),
        timestamp: new Date(quote.t).getTime(),
      };
    } catch (error) {
      logger.error(`[AlpacaService] Error getting latest quote for ${symbol}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get latest trade
   */
  async getLatestTrade(symbol) {
    try {
      const response = await this.client.get('/stocks/trades/latest', {
        params: { symbols: symbol },
      });
      
      const trade = response.data[symbol];
      if (!trade) return null;

      return {
        symbol: symbol,
        price: parseFloat(trade.p),
        size: parseFloat(trade.s),
        timestamp: new Date(trade.t).getTime(),
      };
    } catch (error) {
      logger.error(`[AlpacaService] Error getting latest trade for ${symbol}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get portfolio history
   */
  async getPortfolioHistory(period = '1D', timeframe = '1Min') {
    try {
      const response = await this.client.get('/account/portfolio/history', {
        params: {
          period: period, // '1D', '1W', '1M', '3M', '1A', 'all'
          timeframe: timeframe, // '1Min', '5Min', '15Min', '1H', '1D'
        },
      });
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error getting portfolio history:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(symbol) {
    try {
      const response = await this.client.delete(`/positions/${symbol}`);
      logger.info(`[AlpacaService] Position ${symbol} closed`);
      return response.data;
    } catch (error) {
      logger.error(`[AlpacaService] Error closing position ${symbol}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions() {
    try {
      const response = await this.client.delete('/positions');
      logger.info('[AlpacaService] All positions closed');
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error closing all positions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get assets (available symbols)
   */
  async getAssets(status = 'active', assetClass = 'us_equity') {
    try {
      const response = await this.client.get('/assets', {
        params: { status, asset_class: assetClass },
      });
      return response.data;
    } catch (error) {
      logger.error('[AlpacaService] Error getting assets:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = AlpacaService;


