const axios = require('axios');
const WebSocket = require('ws');
const CryptoPrice = require('../models/CryptoPrice');
const { setCache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Binance Service สำหรับดึงข้อมูลราคาสกุลเงินดิจิทัล
 * ใช้ทั้ง REST API และ WebSocket
 */
class BinanceService {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443';
    this.symbol = process.env.CRYPTO_SYMBOL || 'BTCUSDT';
    this.updateInterval = parseInt(process.env.UPDATE_INTERVAL) || 60000; // 1 นาที
    this.ws = null;
    this.intervalId = null;
  }

  /**
   * ดึงข้อมูลราคาจาก Binance REST API
   */
  async fetchPriceFromAPI(symbol = this.symbol) {
    try {
      logger.info(`กำลังดึงข้อมูลราคา ${symbol} จาก Binance API`);

      // ดึงข้อมูล 24hr ticker price change statistics
      const response = await axios.get(`${this.apiUrl}/api/v3/ticker/24hr`, {
        params: { symbol: symbol.toUpperCase() },
        timeout: 10000, // timeout 10 วินาที
      });

      const data = response.data;

      // สร้างข้อมูลราคาในรูปแบบของเรา
      const priceData = {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        highPrice24h: parseFloat(data.highPrice),
        lowPrice24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        priceChangePercent24h: parseFloat(data.priceChangePercent),
        openPrice24h: parseFloat(data.openPrice),
        lastUpdate: new Date(),
        source: 'api',
      };

      // บันทึกลง database
      await CryptoPrice.create(priceData);

      // บันทึกใน cache
      const cacheKey = `crypto:price:${symbol.toUpperCase()}`;
      await setCache(cacheKey, priceData, 60);

      logger.info(`✅ บันทึกข้อมูลราคา ${symbol} สำเร็จ: $${priceData.price}`);

      return priceData;
    } catch (error) {
      logger.error(`❌ ไม่สามารถดึงข้อมูลจาก Binance API:`, error.message);
      throw error;
    }
  }

  /**
   * เริ่มการอัพเดทราคาด้วย REST API แบบ interval
   */
  startPeriodicUpdate() {
    logger.info(`🔄 เริ่มการอัพเดทราคาทุก ${this.updateInterval / 1000} วินาที`);

    // ดึงข้อมูลทันทีก่อน
    this.fetchPriceFromAPI(this.symbol).catch((err) => {
      logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลครั้งแรก:', err.message);
    });

    // ตั้ง interval สำหรับอัพเดทข้อมูล
    this.intervalId = setInterval(async () => {
      try {
        await this.fetchPriceFromAPI(this.symbol);
      } catch (error) {
        logger.error('เกิดข้อผิดพลาดในการอัพเดทราคา:', error.message);
      }
    }, this.updateInterval);
  }

  /**
   * หยุดการอัพเดทราคาแบบ interval
   */
  stopPeriodicUpdate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('⏸️  หยุดการอัพเดทราคาแบบ interval');
    }
  }

  /**
   * เชื่อมต่อ Binance WebSocket สำหรับอัพเดทราคา real-time
   */
  connectWebSocket(symbol = this.symbol) {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const wsUrl = `${this.wsUrl}/ws/${streamName}`;

    logger.info(`🔌 กำลังเชื่อมต่อ Binance WebSocket: ${streamName}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      logger.info('✅ เชื่อมต่อ Binance WebSocket สำเร็จ');
    });

    this.ws.on('message', async (data) => {
      try {
        const ticker = JSON.parse(data);

        // สร้างข้อมูลราคา
        const priceData = {
          symbol: ticker.s,
          price: parseFloat(ticker.c), // ราคาปัจจุบัน
          highPrice24h: parseFloat(ticker.h),
          lowPrice24h: parseFloat(ticker.l),
          volume24h: parseFloat(ticker.v),
          priceChangePercent24h: parseFloat(ticker.P),
          openPrice24h: parseFloat(ticker.o),
          lastUpdate: new Date(),
          source: 'websocket',
        };

        // บันทึกลง database (แต่ละนาทีเพื่อไม่ให้ข้อมูลเยอะเกินไป)
        const now = Date.now();
        if (!this.lastSaveTime || now - this.lastSaveTime >= 60000) {
          await CryptoPrice.create(priceData);
          this.lastSaveTime = now;
          logger.info(`📊 อัพเดทราคา ${ticker.s} จาก WebSocket: $${priceData.price}`);
        }

        // บันทึกใน cache (อัพเดททุกครั้ง)
        const cacheKey = `crypto:price:${ticker.s}`;
        await setCache(cacheKey, priceData, 60);
      } catch (error) {
        logger.error('❌ เกิดข้อผิดพลาดในการประมวลผล WebSocket message:', error.message);
      }
    });

    this.ws.on('error', (error) => {
      logger.error('❌ WebSocket Error:', error.message);
    });

    this.ws.on('close', () => {
      logger.warn('⚠️  การเชื่อมต่อ WebSocket ปิด, พยายามเชื่อมต่อใหม่ใน 5 วินาที...');
      setTimeout(() => {
        this.connectWebSocket(symbol);
      }, 5000);
    });
  }

  /**
   * ปิดการเชื่อมต่อ WebSocket
   */
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      logger.info('🔌 ปิดการเชื่อมต่อ Binance WebSocket');
    }
  }

  /**
   * เริ่มต้นการดึงข้อมูลทั้ง REST API และ WebSocket
   */
  start() {
    logger.info('🚀 เริ่มต้น Binance Service');
    this.startPeriodicUpdate();
    this.connectWebSocket(this.symbol);
  }

  /**
   * หยุดการทำงานทั้งหมด
   */
  stop() {
    logger.info('🛑 หยุด Binance Service');
    this.stopPeriodicUpdate();
    this.disconnectWebSocket();
  }
}

// สร้าง instance เดียว (Singleton pattern)
const binanceService = new BinanceService();

module.exports = binanceService;

