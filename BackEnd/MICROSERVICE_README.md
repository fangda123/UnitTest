# Binance Microservice Documentation

## ภาพรวม

ระบบ Binance Microservice ถูกออกแบบมาเพื่อรับข้อมูลจาก Binance และบันทึกลงฐานข้อมูลตลอดเวลา พร้อมระบบคำนวณและสรุปผลแยกตามหมวดหมู่เพื่อลดการประมวลผลของ server

## โครงสร้างระบบ

### 1. Binance Data Collector Microservice
**ตำแหน่ง:** `src/microservices/binance/dataCollector.js`

รับข้อมูลจาก Binance ทั้ง REST API และ WebSocket และบันทึกลงฐานข้อมูล `CryptoPrice` ตลอดเวลา

**คุณสมบัติ:**
- รองรับหลาย symbols พร้อมกัน
- ใช้ทั้ง REST API (periodic) และ WebSocket (real-time)
- Auto-reconnect เมื่อ WebSocket หลุด
- บันทึกข้อมูลลงฐานข้อมูลและ Redis cache

**Environment Variables:**
- `CRYPTO_SYMBOLS`: รายการ symbols แยกด้วย comma (เช่น `BTCUSDT,ETHUSDT`)
- `UPDATE_INTERVAL`: ช่วงเวลาอัพเดทข้อมูล (milliseconds, default: 60000)

### 2. Price Aggregator Service
**ตำแหน่ง:** `src/aggregators/priceAggregator.js`

คำนวณและสรุปผลราคาแยกตามหมวดหมู่ (hourly, daily, weekly, monthly)

**คุณสมบัติ:**
- สรุปผลรายชั่วโมง (hourly)
- สรุปผลรายวัน (daily)
- สรุปผลรายสัปดาห์ (weekly)
- สรุปผลรายเดือน (monthly)
- คำนวณอัตโนมัติตามช่วงเวลา

**Models:**
- `PriceSummary`: เก็บข้อมูลสรุปผลราคา
- `PriceAggregation`: เก็บข้อมูลการรวมกลุ่มราคา (minute, hour, day)

### 3. Market Stats Aggregator Service
**ตำแหน่ง:** `src/aggregators/marketStatsAggregator.js`

คำนวณสถิติตลาดแยกตามหมวดหมู่ (24h, 7d, 30d, all)

**คุณสมบัติ:**
- สถิติตลาด 24 ชั่วโมง
- สถิติตลาด 7 วัน
- สถิติตลาด 30 วัน
- สถิติตลาดทั้งหมด
- คำนวณ Volatility, Price Change, Volume, etc.

**Models:**
- `MarketStats`: เก็บสถิติตลาด

### 4. Aggregation Worker
**ตำแหน่ง:** `src/workers/aggregationWorker.js`

ประมวลผลข้อมูลราคาและสร้าง aggregations แบบ background

**คุณสมบัติ:**
- ประมวลผลข้อมูลราคาใหม่
- สร้าง aggregations (minute, hour, day)
- ประมวลผล aggregations ที่ยังไม่ได้ประมวลผล

**Environment Variables:**
- `AGGREGATION_INTERVAL`: ช่วงเวลาประมวลผล (milliseconds, default: 60000)

## Models

### PriceSummary
เก็บข้อมูลสรุปผลราคาตามหมวดหมู่

**Fields:**
- `symbol`: สัญลักษณ์คู่เทรด
- `category`: หมวดหมู่ (hourly, daily, weekly, monthly)
- `period`: ช่วงเวลาที่สรุปผล
- `openPrice`, `closePrice`, `highPrice`, `lowPrice`: ราคา
- `averagePrice`: ราคาเฉลี่ย
- `totalVolume`: ปริมาณการเทรดรวม
- `priceChangePercent`: การเปลี่ยนแปลงราคา (%)

### MarketStats
เก็บสถิติตลาด

**Fields:**
- `symbol`: สัญลักษณ์คู่เทรด
- `category`: หมวดหมู่ (24h, 7d, 30d, all)
- `currentPrice`: ราคาปัจจุบัน
- `highestPrice`, `lowestPrice`: ราคาสูงสุด/ต่ำสุด
- `averagePrice`: ราคาเฉลี่ย
- `volatility`: ความผันผวน (Standard Deviation)
- `priceChangePercent`: การเปลี่ยนแปลงราคา (%)

### PriceAggregation
เก็บข้อมูลการรวมกลุ่มราคา

**Fields:**
- `symbol`: สัญลักษณ์คู่เทรด
- `aggregationType`: ประเภท (minute, hour, day)
- `timeBucket`: ช่วงเวลาที่รวมกลุ่ม
- `openPrice`, `closePrice`, `highPrice`, `lowPrice`: ราคา
- `processed`: สถานะการประมวลผล

## API Endpoints

### Public Endpoints

#### 1. ดึงข้อมูลสรุปผลราคา
```
GET /api/aggregation/summary/:symbol
Query Parameters:
  - category: hourly, daily, weekly, monthly (optional)
  - startDate: วันที่เริ่มต้น (optional)
  - endDate: วันที่สิ้นสุด (optional)
  - limit: จำนวนข้อมูล (default: 100)
```

#### 2. ดึงข้อมูลสรุปผลราคาล่าสุด
```
GET /api/aggregation/summary/:symbol/latest
Query Parameters:
  - category: hourly, daily, weekly, monthly (optional)
```

#### 3. ดึงสถิติตลาด
```
GET /api/aggregation/stats/:symbol
Query Parameters:
  - category: 24h, 7d, 30d, all (optional)
```

#### 4. ดึงข้อมูล aggregation
```
GET /api/aggregation/aggregation/:symbol
Query Parameters:
  - aggregationType: minute, hour, day (optional)
  - startDate: วันที่เริ่มต้น (optional)
  - endDate: วันที่สิ้นสุด (optional)
  - limit: จำนวนข้อมูล (default: 100)
```

### Internal Endpoints (ต้องมี API Key)

#### 1. ดึงสถานะ microservices
```
GET /api/internal/microservices/status
Headers:
  - x-api-key: YOUR_API_KEY
```

#### 2. ควบคุม Binance Data Collector
```
POST /api/internal/microservices/binance/:action
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - action: start หรือ stop
```

#### 3. เพิ่ม/ลบ symbol
```
POST /api/internal/microservices/binance/symbol
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - symbol: BTCUSDT
  - action: add หรือ remove
```

#### 4. ควบคุม Price Aggregator
```
POST /api/internal/microservices/aggregator/:action
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - action: start หรือ stop
  - symbols: BTCUSDT,ETHUSDT (optional)
```

#### 5. ควบคุม Market Stats Aggregator
```
POST /api/internal/microservices/market-stats/:action
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - action: start หรือ stop
  - symbols: BTCUSDT,ETHUSDT (optional)
  - intervalMinutes: 60 (optional)
```

#### 6. ควบคุม Workers
```
POST /api/internal/microservices/workers/:action
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - action: start หรือ stop
  - symbols: BTCUSDT,ETHUSDT (optional)
```

#### 7. บังคับคำนวณสรุปผลราคา
```
POST /api/aggregation/calculate/:symbol
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - category: hourly, daily, weekly, monthly (optional)
```

#### 8. บังคับคำนวณสถิติตลาด
```
POST /api/aggregation/calculate-stats/:symbol
Headers:
  - x-api-key: YOUR_API_KEY
Body:
  - category: 24h, 7d, 30d, all (optional)
```

## การใช้งาน

### 1. ตั้งค่า Environment Variables

```env
# Binance Configuration
CRYPTO_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT
UPDATE_INTERVAL=60000

# Aggregation Configuration
AGGREGATION_INTERVAL=60000
MARKET_STATS_INTERVAL=60

# API Key สำหรับ Internal Endpoints
INTERNAL_API_KEY=your-secret-api-key
```

### 2. เริ่มต้น Server

```bash
npm start
```

ระบบจะเริ่มต้น microservices และ workers อัตโนมัติ

### 3. ตรวจสอบสถานะ

```bash
curl -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/internal/microservices/status
```

### 4. ตัวอย่างการใช้งาน API

#### ดึงข้อมูลสรุปผลราคา
```bash
curl http://localhost:3000/api/aggregation/summary/BTCUSDT?category=daily&limit=10
```

#### ดึงสถิติตลาด
```bash
curl http://localhost:3000/api/aggregation/stats/BTCUSDT?category=24h
```

## ข้อดีของระบบ

1. **แยกการประมวลผล**: ข้อมูลดิบถูกบันทึกแยกจากข้อมูลสรุปผล ลดการประมวลผลของ server
2. **หมวดหมู่ชัดเจน**: แยกข้อมูลตามหมวดหมู่ (hourly, daily, weekly, monthly) ทำให้ค้นหาและวิเคราะห์ง่าย
3. **Real-time และ Batch**: ใช้ทั้ง WebSocket (real-time) และ REST API (periodic) เพื่อความแม่นยำ
4. **Scalable**: รองรับหลาย symbols พร้อมกัน และสามารถเพิ่ม/ลบได้ตามต้องการ
5. **Background Processing**: ใช้ workers ประมวลผลข้อมูลแบบ background ไม่กระทบ performance ของ API
6. **Caching**: ใช้ Redis cache เพื่อเพิ่มความเร็วในการดึงข้อมูล

## การดูแลระบบ

### ตรวจสอบ Logs
```bash
tail -f logs/combined.log
```

### ตรวจสอบสถานะ Services
```bash
curl -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/internal/microservices/status
```

### Restart Services
```bash
# หยุด Binance Collector
curl -X POST -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/internal/microservices/binance/stop

# เริ่มต้นใหม่
curl -X POST -H "x-api-key: your-secret-api-key" \
  http://localhost:3000/api/internal/microservices/binance/start
```

## Troubleshooting

### 1. WebSocket หลุดบ่อย
- ตรวจสอบ network connection
- ตรวจสอบ Binance API status
- ระบบจะ reconnect อัตโนมัติภายใน 5 วินาที

### 2. ข้อมูลไม่ถูกบันทึก
- ตรวจสอบ MongoDB connection
- ตรวจสอบ logs สำหรับ errors
- ตรวจสอบว่า microservice กำลังทำงานอยู่

### 3. Aggregation ไม่ทำงาน
- ตรวจสอบว่า Price Aggregator เริ่มทำงานแล้ว
- ตรวจสอบว่ามีข้อมูลราคาในฐานข้อมูล
- ตรวจสอบ logs สำหรับ errors

## สรุป

ระบบ Binance Microservice ถูกออกแบบมาเพื่อรับข้อมูลจาก Binance และบันทึกลงฐานข้อมูลตลอดเวลา พร้อมระบบคำนวณและสรุปผลแยกตามหมวดหมู่เพื่อลดการประมวลผลของ server และเพิ่มประสิทธิภาพในการดึงข้อมูล

