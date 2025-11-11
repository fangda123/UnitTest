const mongoose = require('mongoose');

/**
 * Algorithm Performance Schema
 * เก็บประสิทธิภาพของแต่ละอัลกอริทึม
 */
const algorithmPerformanceSchema = new mongoose.Schema(
  {
    // ชื่ออัลกอริทึม
    algorithmName: {
      type: String,
      required: true,
      index: true,
    },

    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: true,
      index: true,
    },

    // สถิติการเทรด
    totalTrades: {
      type: Number,
      default: 0,
    },

    winningTrades: {
      type: Number,
      default: 0,
    },

    losingTrades: {
      type: Number,
      default: 0,
    },

    totalProfit: {
      type: Number,
      default: 0,
    },

    totalLoss: {
      type: Number,
      default: 0,
    },

    // สถิติประสิทธิภาพ
    winRate: {
      type: Number,
      default: 0, // เปอร์เซ็นต์
    },

    averageProfit: {
      type: Number,
      default: 0,
    },

    averageLoss: {
      type: Number,
      default: 0,
    },

    profitFactor: {
      type: Number,
      default: 0,
    },

    sharpeRatio: {
      type: Number,
      default: 0,
    },

    maxDrawdown: {
      type: Number,
      default: 0,
    },

    // ประวัติการเทรดล่าสุด (เก็บแค่ 100 รายการ)
    recentTrades: [
      {
        tradeType: {
          type: String,
          enum: ['buy', 'sell'],
        },
        profit: Number,
        profitPercentage: Number,
        price: Number,
        quantity: Number,
        timestamp: Date,
      },
    ],

    // ข้อมูลอัพเดทล่าสุด
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index สำหรับค้นหาอย่างรวดเร็ว
algorithmPerformanceSchema.index({ algorithmName: 1, symbol: 1 }, { unique: true });
algorithmPerformanceSchema.index({ winRate: -1 });
algorithmPerformanceSchema.index({ profitFactor: -1 });

module.exports = mongoose.model('AlgorithmPerformance', algorithmPerformanceSchema);

