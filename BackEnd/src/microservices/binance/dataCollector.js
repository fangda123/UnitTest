const axios = require('axios');
const WebSocket = require('ws');
const CryptoPrice = require('../../models/CryptoPrice');
const { setCache } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Binance Data Collector Microservice
 * รับข้อมูลจาก Binance และบันทึกลงฐานข้อมูลตลอดเวลา
 */
class BinanceDataCollector {
  constructor() {
    this.apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443';
    this.symbols = this.parseSymbols(process.env.CRYPTO_SYMBOLS || 'BTCUSDT,ETHUSDT');
    this.updateInterval = parseInt(process.env.UPDATE_INTERVAL) || 60000; // 1 นาที
    this.wsConnections = new Map(); // เก็บ WebSocket connections สำหรับแต่ละ symbol
    this.intervalIds = new Map(); // เก็บ interval IDs
    this.lastSaveTimes = new Map(); // เก็บเวลาบันทึกล่าสุดสำหรับแต่ละ symbol
    this.lastNotifyTimes = new Map(); // เก็บเวลาส่ง notification ล่าสุดสำหรับแต่ละ symbol
    this.isRunning = false;
  }

  /**
   * แปลง string ของ symbols เป็น array
   */
  parseSymbols(symbolsString) {
    return symbolsString.split(',').map((s) => s.trim().toUpperCase());
  }

  /**
   * ดึงข้อมูลราคาจาก Binance REST API
   */
  async fetchPriceFromAPI(symbol) {
    try {
      logger.info(`[Binance Collector] กำลังดึงข้อมูลราคา ${symbol} จาก Binance API`);

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
        priceChangePercent24h: parseFloat(data.priceChangePercent),
        openPrice24h: parseFloat(data.openPrice),
        lastUpdate: new Date(),
        source: 'api',
      };

      // บันทึกลง database
      await CryptoPrice.create(priceData);

      // บันทึกใน cache
      const cacheKey = `crypto:price:${symbol}`;
      await setCache(cacheKey, priceData, 60);

      logger.info(`[Binance Collector] ✅ บันทึกข้อมูลราคา ${symbol} สำเร็จ: $${priceData.price}`);

      return priceData;
    } catch (error) {
      logger.error(`[Binance Collector] ❌ ไม่สามารถดึงข้อมูล ${symbol} จาก Binance API:`, error.message);
      throw error;
    }
  }

  /**
   * เริ่มการอัพเดทราคาด้วย REST API แบบ interval สำหรับ symbol
   */
  startPeriodicUpdate(symbol) {
    logger.info(`[Binance Collector] 🔄 เริ่มการอัพเดทราคา ${symbol} ทุก ${this.updateInterval / 1000} วินาที`);

    // ดึงข้อมูลทันทีก่อน
    this.fetchPriceFromAPI(symbol).catch((err) => {
      logger.error(`[Binance Collector] เกิดข้อผิดพลาดในการดึงข้อมูล ${symbol} ครั้งแรก:`, err.message);
    });

    // ตั้ง interval สำหรับอัพเดทข้อมูล
    const intervalId = setInterval(async () => {
      try {
        await this.fetchPriceFromAPI(symbol);
      } catch (error) {
        logger.error(`[Binance Collector] เกิดข้อผิดพลาดในการอัพเดทราคา ${symbol}:`, error.message);
      }
    }, this.updateInterval);

    this.intervalIds.set(symbol, intervalId);
  }

  /**
   * หยุดการอัพเดทราคาแบบ interval สำหรับ symbol
   */
  stopPeriodicUpdate(symbol) {
    const intervalId = this.intervalIds.get(symbol);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(symbol);
      logger.info(`[Binance Collector] ⏸️  หยุดการอัพเดทราคา ${symbol} แบบ interval`);
    }
  }

  /**
   * เชื่อมต่อ Binance WebSocket แบบ Combined Stream สำหรับหลาย symbols
   * ใช้ Combined Stream เพื่อลดจำนวน connections
   */
  connectCombinedWebSocket() {
    // แบ่ง symbols เป็นหลาย groups (สูงสุด 200 streams ต่อ connection)
    const maxStreamsPerConnection = 200;
    const symbolGroups = [];
    
    for (let i = 0; i < this.symbols.length; i += maxStreamsPerConnection) {
      symbolGroups.push(this.symbols.slice(i, i + maxStreamsPerConnection));
    }

    // เชื่อมต่อแต่ละ group
    symbolGroups.forEach((group, index) => {
      const streamNames = group
        .map((symbol) => `${symbol.toLowerCase()}@ticker`)
        .join('/');

      // Binance Combined Stream format: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker
      const wsUrl = `${this.wsUrl}/stream?streams=${streamNames}`;

      logger.info(`[Binance Collector] 🔌 กำลังเชื่อมต่อ Binance Combined WebSocket Group ${index + 1}/${symbolGroups.length} (${group.length} symbols)`);

      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        logger.info(`[Binance Collector] ✅ เชื่อมต่อ Binance Combined WebSocket Group ${index + 1} สำเร็จ (${group.length} symbols)`);
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          
          // Combined stream format: { stream: "btcusdt@ticker", data: {...} }
          if (message.stream && message.data) {
            const ticker = message.data;
            const symbol = ticker.s;

            const priceData = {
              symbol: ticker.s,
              price: parseFloat(ticker.c),
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
            const lastSaveTime = this.lastSaveTimes.get(symbol) || 0;
            
            if (now - lastSaveTime >= 60000) {
              await CryptoPrice.create(priceData);
              this.lastSaveTimes.set(symbol, now);
              logger.info(`[Binance Collector] 📊 อัพเดทราคา ${ticker.s} จาก WebSocket: $${priceData.price}`);
            }

            // บันทึกใน cache (อัพเดททุกครั้ง)
            const cacheKey = `crypto:price:${ticker.s}`;
            await setCache(cacheKey, priceData, 60);
          }
        } catch (error) {
          logger.error(`[Binance Collector] ❌ เกิดข้อผิดพลาดในการประมวลผล WebSocket message:`, error.message);
        }
      });

      ws.on('error', (error) => {
        logger.error(`[Binance Collector] ❌ Combined WebSocket Group ${index + 1} Error:`, error.message);
      });

      ws.on('close', () => {
        logger.warn(`[Binance Collector] ⚠️  การเชื่อมต่อ Combined WebSocket Group ${index + 1} ปิด, พยายามเชื่อมต่อใหม่ใน 5 วินาที...`);
        this.wsConnections.delete(`combined-${index}`);
        
        if (this.isRunning) {
          setTimeout(() => {
            this.connectCombinedWebSocket();
          }, 5000);
        }
      });

      this.wsConnections.set(`combined-${index}`, ws);
    });
  }

  /**
   * เชื่อมต่อ Binance WebSocket สำหรับอัพเดทราคา real-time (แบบเก่า - สำหรับ symbols น้อย)
   */
  connectWebSocket(symbol) {
    // ถ้ามี symbols มากกว่า 50 ตัว ให้ใช้ Combined Stream แทน
    if (this.symbols.length > 50) {
      // ตรวจสอบว่ามี combined connection อยู่แล้วหรือไม่
      const hasCombined = Array.from(this.wsConnections.keys()).some(key => key.startsWith('combined-'));
      if (!hasCombined) {
        this.connectCombinedWebSocket();
      }
      return;
    }

    const streamName = `${symbol.toLowerCase()}@ticker`;
    const wsUrl = `${this.wsUrl}/ws/${streamName}`;

    logger.info(`[Binance Collector] 🔌 กำลังเชื่อมต่อ Binance WebSocket: ${streamName}`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      logger.info(`[Binance Collector] ✅ เชื่อมต่อ Binance WebSocket สำเร็จ: ${symbol}`);
    });

    ws.on('message', async (data) => {
      try {
        const ticker = JSON.parse(data);

        const priceData = {
          symbol: ticker.s,
          price: parseFloat(ticker.c),
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
        const lastSaveTime = this.lastSaveTimes.get(symbol) || 0;
        
        if (now - lastSaveTime >= 60000) {
          await CryptoPrice.create(priceData);
          this.lastSaveTimes.set(symbol, now);
          logger.info(`[Binance Collector] 📊 อัพเดทราคา ${ticker.s} จาก WebSocket: $${priceData.price}`);
        }

        // บันทึกใน cache (อัพเดททุกครั้ง)
        const cacheKey = `crypto:price:${ticker.s}`;
        await setCache(cacheKey, priceData, 60);

        // ส่ง WebSocket notification ให้ frontend (ทุก 5 วินาทีต่อ symbol เพื่อไม่ให้ส่งบ่อยเกินไป)
        const lastNotifyTime = this.lastNotifyTimes.get(symbol) || 0;
        if (now - lastNotifyTime >= 5000) {
          const websocketService = require('../../services/websocketService');
          logger.info(`📡 ส่ง WebSocket notification สำหรับ ${ticker.s}`);
          websocketService.notifyCryptoPriceUpdate(priceData);
          this.lastNotifyTimes.set(symbol, now);
        }
      } catch (error) {
        logger.error(`[Binance Collector] ❌ เกิดข้อผิดพลาดในการประมวลผล WebSocket message ${symbol}:`, error.message);
      }
    });

    ws.on('error', (error) => {
      logger.error(`[Binance Collector] ❌ WebSocket Error ${symbol}:`, error.message);
    });

    ws.on('close', () => {
      logger.warn(`[Binance Collector] ⚠️  การเชื่อมต่อ WebSocket ${symbol} ปิด, พยายามเชื่อมต่อใหม่ใน 5 วินาที...`);
      this.wsConnections.delete(symbol);
      
      if (this.isRunning) {
        setTimeout(() => {
          this.connectWebSocket(symbol);
        }, 5000);
      }
    });

    this.wsConnections.set(symbol, ws);
  }

  /**
   * ปิดการเชื่อมต่อ WebSocket สำหรับ symbol
   */
  disconnectWebSocket(symbol) {
    const ws = this.wsConnections.get(symbol);
    if (ws) {
      ws.close();
      this.wsConnections.delete(symbol);
      logger.info(`[Binance Collector] 🔌 ปิดการเชื่อมต่อ Binance WebSocket: ${symbol}`);
    }
  }

  /**
   * เริ่มต้นการดึงข้อมูลทั้ง REST API และ WebSocket สำหรับทุก symbols
   */
  start() {
    if (this.isRunning) {
      logger.warn('[Binance Collector] ⚠️  Data Collector กำลังทำงานอยู่แล้ว');
      return;
    }

    logger.info(`[Binance Collector] 🚀 เริ่มต้น Binance Data Collector สำหรับ ${this.symbols.length} symbols`);
    this.isRunning = true;

    // เริ่มต้นสำหรับทุก symbol
    this.symbols.forEach((symbol) => {
      this.startPeriodicUpdate(symbol);
    });

    // ใช้ Combined WebSocket ถ้ามี symbols มากกว่า 50 ตัว
    if (this.symbols.length > 50) {
      this.connectCombinedWebSocket();
    } else {
      // ใช้ WebSocket แยกสำหรับแต่ละ symbol ถ้ามีน้อย
      this.symbols.forEach((symbol) => {
        this.connectWebSocket(symbol);
      });
    }
  }

  /**
   * หยุดการทำงานทั้งหมด
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[Binance Collector] 🛑 หยุด Binance Data Collector');
    this.isRunning = false;

    // หยุดทุก interval
    this.symbols.forEach((symbol) => {
      this.stopPeriodicUpdate(symbol);
    });

    // ปิด WebSocket connections ทั้งหมด (รวม combined connections)
    this.wsConnections.forEach((ws, key) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    // Clear maps
    this.intervalIds.clear();
    this.wsConnections.clear();
    this.lastSaveTimes.clear();
  }

  /**
   * เพิ่ม symbol ใหม่
   */
  addSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (!this.symbols.includes(upperSymbol)) {
      this.symbols.push(upperSymbol);
      if (this.isRunning) {
        this.startPeriodicUpdate(upperSymbol);
        this.connectWebSocket(upperSymbol);
      }
      logger.info(`[Binance Collector] ➕ เพิ่ม symbol ใหม่: ${upperSymbol}`);
    }
  }

  /**
   * ลบ symbol
   */
  removeSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    const index = this.symbols.indexOf(upperSymbol);
    if (index > -1) {
      this.symbols.splice(index, 1);
      this.stopPeriodicUpdate(upperSymbol);
      this.disconnectWebSocket(upperSymbol);
      logger.info(`[Binance Collector] ➖ ลบ symbol: ${upperSymbol}`);
    }
  }

  /**
   * ดึงสถานะการทำงาน
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      symbols: this.symbols,
      activeConnections: this.wsConnections.size,
      activeIntervals: this.intervalIds.size,
    };
  }
}

// สร้าง instance เดียว (Singleton pattern)
const binanceDataCollector = new BinanceDataCollector();

module.exports = binanceDataCollector;

