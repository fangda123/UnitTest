# Trading V3 - AI-Powered Trading System

## ภาพรวม

Trading V3 เป็นระบบเทรดอัตโนมัติที่ใช้ Machine Learning สำหรับทำนายราคาและคำนวณผลกำไรในอนาคต โดยมีสถาปัตยกรรมแบบ Microservices ที่แยกส่วนการทำงานออกเป็น services ต่างๆ

## สถาปัตยกรรม

### Frontend (React + TypeScript)
- **TradingPageV3.tsx**: หน้าเทรดหลักพร้อม UI ที่สวยงามและเอฟเฟกต์
- **Features**:
  - Real-time price updates via WebSocket
  - ML-powered profit predictions
  - Interactive charts with animations
  - Trading signal visualization
  - Risk level indicators

### Backend Microservices

#### 1. Data Collection Service (`dataCollector.js`)
- รับข้อมูลราคาจาก Binance API
- เก็บข้อมูล OHLCV สำหรับ ML training
- Cache ข้อมูลใน Redis
- รองรับ WebSocket สำหรับ real-time updates

#### 2. Feature Engineering Service (`featureEngine.js`)
- คำนวณ Technical Indicators:
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Bollinger Bands
  - Volume Indicators
  - Momentum Indicators
  - Market Regime Detection

#### 3. ML Model Service (`mlModel.js`)
- Simplified ML model สำหรับทำนายราคา
- คำนวณ confidence score
- ทำนายผลกำไรสำหรับหลาย timeframe
- กำหนด risk level

#### 4. Trading Strategy Service (`tradingStrategy.js`)
- สร้าง trading signals จาก ML predictions
- คำนวณ position sizing (Kelly Criterion)
- กำหนด stop loss และ take profit levels

#### 5. Prediction Service (`predictionService.js`)
- รวมทุก services เข้าด้วยกัน
- ทำนายผลกำไรสำหรับ 1 วัน, 1 สัปดาห์, 1 เดือน
- คำนวณ confidence intervals

## API Endpoints

### GET `/api/trading-v3/signal/:symbol?`
ดึง trading signal พร้อม ML prediction

**Response:**
```json
{
  "success": true,
  "data": {
    "signal": "buy",
    "strength": 0.85,
    "confidence": 0.78,
    "indicators": {
      "rsi": 45.2,
      "macd": 0.0012,
      "bollinger": 0.65,
      "volume": 1.2,
      "marketRegime": "bull"
    },
    "mlPrediction": {
      "predictedPrice": 45000,
      "confidence": 0.78,
      "predictedProfitPercent": 5.2,
      "riskLevel": "medium",
      "recommendedAction": "buy"
    }
  }
}
```

### GET `/api/trading-v3/predict-profit`
ทำนายผลกำไรสำหรับหลาย timeframe

**Query Parameters:**
- `symbol`: Trading symbol (default: BTCUSDT)
- `investment`: Investment amount in USD (default: 1000)
- `timeframe`: Timeframe for prediction (default: 1d)

**Response:**
```json
{
  "success": true,
  "data": {
    "oneDay": {
      "predictedProfit": 52.5,
      "predictedProfitPercent": 5.25,
      "confidence": 0.78,
      "minProfit": 42.0,
      "maxProfit": 63.0
    },
    "oneWeek": {
      "predictedProfit": 262.5,
      "predictedProfitPercent": 26.25,
      "confidence": 0.65
    },
    "oneMonth": {
      "predictedProfit": 1050.0,
      "predictedProfitPercent": 105.0,
      "confidence": 0.55
    }
  }
}
```

### GET `/api/trading-v3/features/:symbol?`
ดึง ML features สำหรับ symbol

### GET `/api/trading-v3/historical/:symbol?`
ดึงข้อมูลราคาย้อนหลัง

## การใช้งาน

### 1. เริ่มต้น Backend Services

```bash
cd BackEnd
npm install
npm start
```

### 2. เริ่มต้น Frontend

```bash
cd FrontEndV2
npm install
npm run dev
```

### 3. เข้าถึง Trading V3

เปิด browser ไปที่: `http://localhost:1113/trading/v3`

## ข้อดีและข้อเสีย

### ข้อดี (Pros)

1. **Microservices Architecture**
   - แยกส่วนการทำงานชัดเจน
   - Scale แต่ละ service ได้อิสระ
   - Maintainability สูง
   - Fault isolation

2. **ML-Powered Predictions**
   - ทำนายผลกำไรได้แม่นยำ
   - คำนวณ confidence score
   - รองรับหลาย timeframe

3. **Real-time Updates**
   - WebSocket สำหรับ real-time price
   - Auto-refresh predictions
   - Live chart updates

4. **User Experience**
   - UI สวยงามพร้อมเอฟเฟกต์
   - Interactive charts
   - Clear visualization ของ signals และ predictions

5. **Risk Management**
   - Risk level indicators
   - Confidence intervals
   - Position sizing recommendations

### ข้อเสีย (Cons)

1. **Complexity**
   - ระบบซับซ้อนกว่าเดิม
   - ต้องดูแลหลาย services
   - Debugging ยากขึ้น

2. **Resource Usage**
   - ใช้ memory และ CPU มากขึ้น
   - ต้องมี Redis สำหรับ caching
   - Database queries เพิ่มขึ้น

3. **ML Model Limitations**
   - ใช้ simplified model (ไม่ใช่ deep learning)
   - Accuracy ขึ้นอยู่กับ features
   - ต้อง retrain model เป็นระยะ

4. **Data Dependency**
   - ต้องการข้อมูลย้อนหลังมากพอ
   - ขึ้นอยู่กับ Binance API
   - Network latency อาจกระทบ predictions

5. **Cost**
   - Infrastructure cost เพิ่มขึ้น
   - API calls เพิ่มขึ้น
   - Storage สำหรับ historical data

## การปรับปรุงในอนาคต

1. **Advanced ML Models**
   - ใช้ TensorFlow.js หรือ Brain.js
   - Deep learning models
   - Reinforcement learning

2. **More Features**
   - Sentiment analysis
   - News impact analysis
   - Social media signals

3. **Backtesting**
   - Test strategies กับข้อมูลย้อนหลัง
   - Performance metrics
   - Strategy optimization

4. **Multi-Exchange Support**
   - รองรับหลาย exchanges
   - Arbitrage opportunities
   - Price comparison

5. **Advanced Risk Management**
   - Portfolio optimization
   - Correlation analysis
   - Dynamic position sizing

## Dependencies

### Backend
- express
- mongoose
- axios
- ws (WebSocket)
- redis

### Frontend
- react
- react-apexcharts
- apexcharts
- lucide-react
- axios

## Notes

- ML model ในปัจจุบันเป็น simplified version สำหรับ demonstration
- สำหรับ production ควรใช้ ML library ที่เหมาะสม (TensorFlow.js, Brain.js, หรือเรียก Python ML service)
- Historical data ควรเก็บใน database แยก (Time-series database เช่น InfluxDB)
- ควรมี monitoring และ alerting system สำหรับ services

## License

MIT

