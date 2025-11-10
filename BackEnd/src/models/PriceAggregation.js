const mongoose = require('mongoose');

/**
 * PriceAggregation Schema สำหรับจัดเก็บข้อมูลการรวมกลุ่มราคา
 * ใช้สำหรับการคำนวณและสรุปผลแบบ real-time
 */
const priceAggregationSchema = new mongoose.Schema(
  {
    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: [true, 'กรุณาระบุสัญลักษณ์คู่เทรด'],
      uppercase: true,
      trim: true,
      index: true,
    },
    // หมวดหมู่การรวมกลุ่ม (minute, hour, day)
    aggregationType: {
      type: String,
      enum: ['minute', 'hour', 'day'],
      required: [true, 'กรุณาระบุประเภทการรวมกลุ่ม'],
      index: true,
    },
    // ช่วงเวลาที่รวมกลุ่ม
    timeBucket: {
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
    // จำนวนข้อมูลที่รวม
    count: {
      type: Number,
      default: 0,
    },
    // ข้อมูลราคาทั้งหมด (สำหรับการคำนวณ)
    prices: [Number],
    // สถานะการประมวลผล
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index
priceAggregationSchema.index({ symbol: 1, aggregationType: 1, timeBucket: -1 });
priceAggregationSchema.index({ aggregationType: 1, timeBucket: -1 });
priceAggregationSchema.index({ processed: 1, createdAt: -1 });

// Method: ดึงข้อมูลการรวมกลุ่มล่าสุด
priceAggregationSchema.statics.getLatestAggregation = async function (
  symbol,
  aggregationType
) {
  return await this.findOne({
    symbol: symbol.toUpperCase(),
    aggregationType,
  })
    .sort({ timeBucket: -1 })
    .limit(1);
};

// Method: ดึงข้อมูลที่ยังไม่ได้ประมวลผล
priceAggregationSchema.statics.getUnprocessed = async function (limit = 100) {
  return await this.find({ processed: false })
    .sort({ createdAt: 1 })
    .limit(limit);
};

const PriceAggregation = mongoose.model('PriceAggregation', priceAggregationSchema);

module.exports = PriceAggregation;

