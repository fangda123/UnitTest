const mongoose = require('mongoose');

/**
 * CryptoPrice Schema สำหรับจัดเก็บข้อมูลราคาสกุลเงินดิจิทัล
 * ดึงข้อมูลจาก Binance API และ WebSocket
 */
const cryptoPriceSchema = new mongoose.Schema(
  {
    // สัญลักษณ์คู่เทรด (เช่น BTCUSDT)
    symbol: {
      type: String,
      required: [true, 'กรุณาระบุสัญลักษณ์คู่เทรด'],
      uppercase: true,
      trim: true,
      index: true,
    },
    // ราคาปัจจุบัน
    price: {
      type: Number,
      required: [true, 'กรุณาระบุราคา'],
    },
    // ราคาสูงสุดใน 24 ชั่วโมง
    highPrice24h: {
      type: Number,
    },
    // ราคาต่ำสุดใน 24 ชั่วโมง
    lowPrice24h: {
      type: Number,
    },
    // ปริมาณการเทรดใน 24 ชั่วโมง
    volume24h: {
      type: Number,
    },
    // การเปลี่ยนแปลงราคาใน 24 ชั่วโมง (%)
    priceChangePercent24h: {
      type: Number,
    },
    // ราคาเปิดใน 24 ชั่วโมง
    openPrice24h: {
      type: Number,
    },
    // เวลาที่อัพเดทข้อมูล
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    // แหล่งข้อมูล (api หรือ websocket)
    source: {
      type: String,
      enum: ['api', 'websocket'],
      default: 'api',
    },
  },
  {
    timestamps: true,
  }
);

// Index สำหรับการค้นหาที่เร็วขึ้น
cryptoPriceSchema.index({ symbol: 1, createdAt: -1 });

// Method: ดึงราคาล่าสุดของ symbol
cryptoPriceSchema.statics.getLatestPrice = async function (symbol) {
  return await this.findOne({ symbol: symbol.toUpperCase() })
    .sort({ createdAt: -1 })
    .limit(1);
};

// Method: ดึงประวัติราคาตามช่วงเวลา
cryptoPriceSchema.statics.getPriceHistory = async function (symbol, startDate, endDate) {
  return await this.find({
    symbol: symbol.toUpperCase(),
    createdAt: { $gte: startDate, $lte: endDate },
  }).sort({ createdAt: -1 });
};

const CryptoPrice = mongoose.model('CryptoPrice', cryptoPriceSchema);

module.exports = CryptoPrice;

