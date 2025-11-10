const mongoose = require('mongoose');

/**
 * PriceSummary Schema สำหรับจัดเก็บข้อมูลสรุปผลราคา
 * คำนวณจากข้อมูล CryptoPrice และจัดเก็บแยกตามหมวดหมู่
 */
const priceSummarySchema = new mongoose.Schema(
  {
    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: [true, 'กรุณาระบุสัญลักษณ์คู่เทรด'],
      uppercase: true,
      trim: true,
      index: true,
    },
    // หมวดหมู่การสรุปผล (hourly, daily, weekly, monthly)
    category: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      required: [true, 'กรุณาระบุหมวดหมู่'],
      index: true,
    },
    // ช่วงเวลาที่สรุปผล
    period: {
      type: Date,
      required: [true, 'กรุณาระบุช่วงเวลา'],
      index: true,
    },
    // ราคาเปิด
    openPrice: {
      type: Number,
      required: true,
    },
    // ราคาปิด
    closePrice: {
      type: Number,
      required: true,
    },
    // ราคาสูงสุด
    highPrice: {
      type: Number,
      required: true,
    },
    // ราคาต่ำสุด
    lowPrice: {
      type: Number,
      required: true,
    },
    // ราคาเฉลี่ย
    averagePrice: {
      type: Number,
      required: true,
    },
    // ปริมาณการเทรดรวม
    totalVolume: {
      type: Number,
      default: 0,
    },
    // จำนวนข้อมูลที่ใช้ในการคำนวณ
    dataCount: {
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

// Compound Index สำหรับการค้นหาที่เร็วขึ้น
priceSummarySchema.index({ symbol: 1, category: 1, period: -1 });
priceSummarySchema.index({ category: 1, period: -1 });
priceSummarySchema.index({ createdAt: -1 });

// Method: ดึงข้อมูลสรุปผลล่าสุด
priceSummarySchema.statics.getLatestSummary = async function (symbol, category) {
  return await this.findOne({ symbol: symbol.toUpperCase(), category })
    .sort({ period: -1 })
    .limit(1);
};

// Method: ดึงข้อมูลสรุปผลตามช่วงเวลา
priceSummarySchema.statics.getSummaryByPeriod = async function (
  symbol,
  category,
  startDate,
  endDate
) {
  return await this.find({
    symbol: symbol.toUpperCase(),
    category,
    period: { $gte: startDate, $lte: endDate },
  }).sort({ period: 1 });
};

// Method: ดึงข้อมูลสรุปผลทั้งหมดของ symbol
priceSummarySchema.statics.getAllSummaries = async function (symbol, limit = 100) {
  return await this.find({ symbol: symbol.toUpperCase() })
    .sort({ period: -1 })
    .limit(limit);
};

const PriceSummary = mongoose.model('PriceSummary', priceSummarySchema);

module.exports = PriceSummary;

