const mongoose = require('mongoose');

/**
 * MarketStats Schema สำหรับจัดเก็บสถิติตลาด
 * สรุปผลข้อมูลตลาดแยกตามหมวดหมู่
 */
const marketStatsSchema = new mongoose.Schema(
  {
    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: [true, 'กรุณาระบุสัญลักษณ์คู่เทรด'],
      uppercase: true,
      trim: true,
      index: true,
    },
    // หมวดหมู่สถิติ (24h, 7d, 30d, all)
    category: {
      type: String,
      enum: ['24h', '7d', '30d', 'all'],
      required: [true, 'กรุณาระบุหมวดหมู่'],
      index: true,
    },
    // ช่วงเวลาที่คำนวณ
    calculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // ราคาปัจจุบัน
    currentPrice: {
      type: Number,
      required: true,
    },
    // ราคาสูงสุดในช่วงเวลา
    highestPrice: {
      type: Number,
      required: true,
    },
    // ราคาต่ำสุดในช่วงเวลา
    lowestPrice: {
      type: Number,
      required: true,
    },
    // ราคาเฉลี่ยในช่วงเวลา
    averagePrice: {
      type: Number,
      required: true,
    },
    // ปริมาณการเทรดรวม
    totalVolume: {
      type: Number,
      default: 0,
    },
    // การเปลี่ยนแปลงราคา (%)
    priceChangePercent: {
      type: Number,
      default: 0,
    },
    // การเปลี่ยนแปลงราคา (absolute)
    priceChange: {
      type: Number,
      default: 0,
    },
    // จำนวนครั้งที่ราคาเพิ่มขึ้น
    priceIncreaseCount: {
      type: Number,
      default: 0,
    },
    // จำนวนครั้งที่ราคาลดลง
    priceDecreaseCount: {
      type: Number,
      default: 0,
    },
    // ความผันผวน (Volatility) - Standard Deviation
    volatility: {
      type: Number,
      default: 0,
    },
    // ข้อมูลเพิ่มเติม
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index
marketStatsSchema.index({ symbol: 1, category: 1, calculatedAt: -1 });
marketStatsSchema.index({ category: 1, calculatedAt: -1 });

// Method: ดึงสถิติล่าสุด
marketStatsSchema.statics.getLatestStats = async function (symbol, category) {
  return await this.findOne({ symbol: symbol.toUpperCase(), category })
    .sort({ calculatedAt: -1 })
    .limit(1);
};

// Method: ดึงสถิติทั้งหมดของ symbol
marketStatsSchema.statics.getAllStats = async function (symbol) {
  return await this.find({ symbol: symbol.toUpperCase() })
    .sort({ calculatedAt: -1 });
};

const MarketStats = mongoose.model('MarketStats', marketStatsSchema);

module.exports = MarketStats;

