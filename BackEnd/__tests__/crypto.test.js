const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const CryptoPrice = require('../src/models/CryptoPrice');

/**
 * Crypto Price API Tests
 * ทดสอบการทำงานของ Crypto Price API
 */

describe('Crypto Price API Tests', () => {
  // เชื่อมต่อ database ก่อนเริ่มทดสอบ
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://172.105.118.30:27017/backend_test_db';
    await mongoose.connect(mongoUri);
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  // สร้างข้อมูลทดสอบ
  beforeEach(async () => {
    await CryptoPrice.deleteMany({});

    // สร้างข้อมูลราคาทดสอบ
    await CryptoPrice.create([
      {
        symbol: 'BTCUSDT',
        price: 45000,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        priceChangePercent24h: 2.5,
        openPrice24h: 44500,
        source: 'api',
      },
      {
        symbol: 'ETHUSDT',
        price: 2800,
        highPrice24h: 2900,
        lowPrice24h: 2700,
        volume24h: 500000,
        priceChangePercent24h: 1.5,
        openPrice24h: 2780,
        source: 'api',
      },
    ]);
  });

  // ปิดการเชื่อมต่อหลังทดสอบเสร็จ
  afterAll(async () => {
    await mongoose.connection.close();
  }, 30000); // เพิ่ม timeout เป็น 30 วินาที

  describe('GET /api/crypto/prices', () => {
    test('ควรดึงข้อมูลราคาทั้งหมดได้', async () => {
      const response = await request(app)
        .get('/api/crypto/prices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/crypto/price/:symbol', () => {
    test('ควรดึงข้อมูลราคาตาม symbol ได้', async () => {
      const response = await request(app)
        .get('/api/crypto/price/BTCUSDT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('BTCUSDT');
      expect(response.body.data.price).toBe(45000);
    });

    test('ควรดึงข้อมูลได้แม้ใช้ตัวพิมพ์เล็ก', async () => {
      const response = await request(app)
        .get('/api/crypto/price/btcusdt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('BTCUSDT');
    });

    test('ควรคืนค่า 404 ถ้าไม่พบ symbol', async () => {
      const response = await request(app)
        .get('/api/crypto/price/INVALIDCOIN')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ไม่พบข้อมูลราคา');
    });
  });

  describe('GET /api/crypto/history/:symbol', () => {
    test('ควรดึงประวัติราคาได้', async () => {
      // สร้างข้อมูลประวัติเพิ่มเติม
      await CryptoPrice.create([
        {
          symbol: 'BTCUSDT',
          price: 44800,
          highPrice24h: 46000,
          lowPrice24h: 44000,
          volume24h: 1000000,
          priceChangePercent24h: 2.5,
          openPrice24h: 44500,
          source: 'api',
          createdAt: new Date(Date.now() - 60000),
        },
        {
          symbol: 'BTCUSDT',
          price: 44900,
          highPrice24h: 46000,
          lowPrice24h: 44000,
          volume24h: 1000000,
          priceChangePercent24h: 2.5,
          openPrice24h: 44500,
          source: 'api',
          createdAt: new Date(Date.now() - 120000),
        },
      ]);

      const response = await request(app)
        .get('/api/crypto/history/BTCUSDT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('ควรจำกัดจำนวนข้อมูลตาม limit', async () => {
      const response = await request(app)
        .get('/api/crypto/history/BTCUSDT?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/crypto/stats/:symbol', () => {
    test('ควรคำนวณสถิติได้', async () => {
      // สร้างข้อมูลเพิ่มเติมสำหรับการคำนวณสถิติ
      await CryptoPrice.create([
        {
          symbol: 'BTCUSDT',
          price: 44500,
          highPrice24h: 46000,
          lowPrice24h: 44000,
          volume24h: 1000000,
          priceChangePercent24h: 2.5,
          openPrice24h: 44500,
          source: 'api',
          createdAt: new Date(Date.now() - 3600000), // 1 ชั่วโมงที่แล้ว
        },
      ]);

      const response = await request(app)
        .get('/api/crypto/stats/BTCUSDT?period=24h')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('symbol');
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('high');
      expect(response.body.data).toHaveProperty('low');
      expect(response.body.data).toHaveProperty('average');
      expect(response.body.data).toHaveProperty('change');
      expect(response.body.data).toHaveProperty('changePercent');
    });
  });
});

