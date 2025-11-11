const mongoose = require('mongoose');

/**
 * Trading Data Schema
 * เก็บข้อมูลราคาและสถิติสำหรับการเทรด
 */
const tradingDataSchema = new mongoose.Schema(
  {
    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: true,
      default: 'BTCUSDT',
      uppercase: true,
      index: true,
    },

    // ราคาปัจจุบัน
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Technical Indicators
    indicators: {
      // Moving Averages
      ma20: Number,
      ma50: Number,
      ma100: Number,
      ema12: Number,
      ema26: Number,
      
      // RSI
      rsi: Number,
      
      // MACD
      macd: {
        macd: Number,
        signal: Number,
        histogram: Number,
      },
      
      // Bollinger Bands
      bollinger: {
        upper: Number,
        middle: Number,
        lower: Number,
      },
      
      // Volume
      volume24h: Number,
      
      // Price Change
      priceChange24h: Number,
      priceChangePercent24h: Number,
    },

    // สัญญาณการเทรด
    signal: {
      signal: {
        type: String,
        enum: ['buy', 'sell', 'hold'],
        default: 'hold',
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      buySignals: {
        type: Number,
        default: 0,
      },
      sellSignals: {
        type: Number,
        default: 0,
      },
      reasons: [String],
    },

    // สถิติการเทรด
    statistics: {
      // ราคาสูงสุด/ต่ำสุด
      high24h: Number,
      low24h: Number,
      high7d: Number,
      low7d: Number,
      
      // Volume
      volume24h: Number,
      volume7d: Number,
      
      // Volatility
      volatility24h: Number,
      volatility7d: Number,
      
      // Price Range
      priceRange24h: Number,
      priceRange7d: Number,
    },

    // เวลาที่อัพเดท
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tradingDataSchema.index({ symbol: 1, timestamp: -1 });
tradingDataSchema.index({ 'signal.signal': 1, timestamp: -1 });
tradingDataSchema.index({ timestamp: -1 });

// Method: ดึงข้อมูลล่าสุด
tradingDataSchema.statics.getLatest = async function (symbol = 'BTCUSDT', limit = 100) {
  return this.find({ symbol })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Method: ดึงข้อมูลในช่วงเวลา
tradingDataSchema.statics.getByTimeRange = async function (symbol, startTime, endTime) {
  return this.find({
    symbol,
    timestamp: {
      $gte: startTime,
      $lte: endTime,
    },
  })
    .sort({ timestamp: 1 })
    .lean();
};

const TradingData = mongoose.model('TradingData', tradingDataSchema);

module.exports = TradingData;

