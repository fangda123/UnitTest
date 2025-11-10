const mongoose = require('mongoose');

/**
 * Trade Schema
 * เก็บประวัติการเทรดแต่ละครั้ง
 */
const tradeSchema = new mongoose.Schema(
  {
    // การจำลองการเทรดที่เกี่ยวข้อง
    simulationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TradingSimulation',
      required: true,
      index: true,
    },

    // ประเภทการเทรด
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },

    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },

    // ราคาที่เทรด
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // จำนวน
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // จำนวนเงิน
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // กำไร/ขาดทุน (สำหรับการขาย)
    profit: {
      type: Number,
      default: 0,
    },

    // กำไร/ขาดทุนเป็นเปอร์เซ็นต์
    profitPercentage: {
      type: Number,
      default: 0,
    },

    // สัญญาณการเทรด
    signal: {
      type: {
        signal: String,
        confidence: Number,
        reasons: [String],
        indicators: mongoose.Schema.Types.Mixed,
      },
      required: true,
    },

    // ยอดเงินหลังการเทรด
    balanceAfter: {
      type: Number,
      required: true,
    },

    // จำนวนเหรียญหลังการเทรด
    holdingsAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tradeSchema.index({ simulationId: 1, createdAt: -1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;
