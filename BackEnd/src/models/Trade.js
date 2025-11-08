const mongoose = require('mongoose');

/**
 * Trade Schema สำหรับจัดเก็บข้อมูลการเทรด
 * ใช้สำหรับตัวอย่างการออกแบบฐานข้อมูล
 */
const tradeSchema = new mongoose.Schema(
  {
    // ผู้ใช้ที่ทำการเทรด
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'กรุณาระบุผู้ใช้'],
      index: true,
    },
    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: [true, 'กรุณาระบุสัญลักษณ์คู่เทรด'],
      uppercase: true,
      trim: true,
    },
    // ประเภทการเทรด (buy หรือ sell)
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: [true, 'กรุณาระบุประเภทการเทรด'],
    },
    // ราคาที่ทำการเทรด
    price: {
      type: Number,
      required: [true, 'กรุณาระบุราคา'],
      min: [0, 'ราคาต้องมากกว่า 0'],
    },
    // จำนวนที่เทรด
    amount: {
      type: Number,
      required: [true, 'กรุณาระบุจำนวน'],
      min: [0, 'จำนวนต้องมากกว่า 0'],
    },
    // มูลค่ารวม
    total: {
      type: Number,
      required: true,
    },
    // สถานะการเทรด
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'failed'],
      default: 'pending',
    },
    // ค่าธรรมเนียม
    fee: {
      type: Number,
      default: 0,
    },
    // หมายเหตุ
    notes: {
      type: String,
      trim: true,
    },
    // เวลาที่ทำการเทรด
    tradeDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware: คำนวณมูลค่ารวมก่อนบันทึก
tradeSchema.pre('save', function (next) {
  this.total = this.price * this.amount;
  next();
});

// Index สำหรับการค้นหาที่เร็วขึ้น
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });
tradeSchema.index({ status: 1 });

// Method: ดึงประวัติการเทรดของผู้ใช้
tradeSchema.statics.getUserTrades = async function (userId, limit = 10) {
  return await this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;

