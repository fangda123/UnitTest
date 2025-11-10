const axios = require('axios');
const binanceDataCollector = require('./dataCollector');
const logger = require('../../utils/logger');

/**
 * Symbol Loader
 * ดึงรายการ symbols ทั้งหมดจาก Binance และเพิ่มเข้าไปใน Data Collector
 */
class SymbolLoader {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
  }

  /**
   * ดึงรายการ symbols ทั้งหมดจาก Binance
   */
  async getAllSymbols() {
    try {
      logger.info('[Symbol Loader] กำลังดึงรายการ symbols จาก Binance...');

      const response = await axios.get(`${this.apiUrl}/api/v3/exchangeInfo`, {
        timeout: 10000,
      });

      // กรองเฉพาะ USDT pairs ที่กำลังเทรด
      const usdtPairs = response.data.symbols
        .filter((symbol) => symbol.symbol.endsWith('USDT') && symbol.status === 'TRADING')
        .map((symbol) => symbol.symbol)
        .sort();

      logger.info(`[Symbol Loader] ✅ ดึงรายการ symbols สำเร็จ: ${usdtPairs.length} symbols`);

      return usdtPairs;
    } catch (error) {
      logger.error('[Symbol Loader] ❌ ไม่สามารถดึงรายการ symbols:', error.message);
      throw error;
    }
  }

  /**
   * เพิ่ม symbols ทั้งหมดเข้าไปใน Data Collector
   */
  async loadAllSymbols() {
    try {
      const symbols = await this.getAllSymbols();

      // เพิ่ม symbols ทั้งหมดเข้าไปใน Data Collector
      symbols.forEach((symbol) => {
        binanceDataCollector.addSymbol(symbol);
      });

      logger.info(`[Symbol Loader] ✅ เพิ่ม symbols ทั้งหมดเข้าไปใน Data Collector: ${symbols.length} symbols`);

      return symbols;
    } catch (error) {
      logger.error('[Symbol Loader] ❌ ไม่สามารถเพิ่ม symbols:', error.message);
      throw error;
    }
  }

  /**
   * เพิ่มเฉพาะ top symbols (top 50 by volume)
   */
  async loadTopSymbols(limit = 50) {
    try {
      logger.info(`[Symbol Loader] กำลังดึง top ${limit} symbols...`);

      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/24hr`, {
        timeout: 10000,
      });

      // กรองเฉพาะ USDT pairs และเรียงตาม volume
      const topSymbols = response.data
        .filter((ticker) => ticker.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((ticker) => ticker.symbol)
        .sort();

      // เพิ่ม symbols เข้าไปใน Data Collector
      topSymbols.forEach((symbol) => {
        binanceDataCollector.addSymbol(symbol);
      });

      logger.info(`[Symbol Loader] ✅ เพิ่ม top ${limit} symbols สำเร็จ`);

      return topSymbols;
    } catch (error) {
      logger.error('[Symbol Loader] ❌ ไม่สามารถเพิ่ม top symbols:', error.message);
      throw error;
    }
  }
}

// สร้าง instance เดียว (Singleton pattern)
const symbolLoader = new SymbolLoader();

module.exports = symbolLoader;

