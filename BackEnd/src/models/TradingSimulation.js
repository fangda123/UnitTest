const mongoose = require('mongoose');

/**
 * Trading Simulation Schema
 * เก็บข้อมูลการจำลองการเทรด
 */
const tradingSimulationSchema = new mongoose.Schema(
  {
    // ผู้ใช้ที่ทำการจำลอง
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // สัญลักษณ์คู่เทรด
    symbol: {
      type: String,
      required: true,
      default: 'BTCUSDT',
      uppercase: true,
    },

    // จำนวนเงินลงทุนเริ่มต้น
    initialInvestment: {
      type: Number,
      required: true,
      min: 0,
    },

    // จำนวนเงินปัจจุบัน
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    // จำนวนเหรียญที่ถือ
    holdings: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ราคาเฉลี่ยที่ซื้อ
    averageBuyPrice: {
      type: Number,
      default: 0,
    },

    // จำนวนการเทรด
    totalTrades: {
      type: Number,
      default: 0,
    },

    // จำนวนการซื้อ
    buyCount: {
      type: Number,
      default: 0,
    },

    // จำนวนการขาย
    sellCount: {
      type: Number,
      default: 0,
    },

    // กำไร/ขาดทุนรวม
    totalProfit: {
      type: Number,
      default: 0,
    },

    // กำไร/ขาดทุนเป็นเปอร์เซ็นต์
    profitPercentage: {
      type: Number,
      default: 0,
    },

    // ราคาสูงสุดที่เคยได้
    highestBalance: {
      type: Number,
      default: 0,
    },

    // ราคาต่ำสุดที่เคยได้
    lowestBalance: {
      type: Number,
      default: 0,
    },

    // สถานะ (active, paused, completed)
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },

    // เริ่มต้นเมื่อ
    startedAt: {
      type: Date,
      default: Date.now,
    },

    // อัพเดทล่าสุด
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    // สิ้นสุดเมื่อ
    endedAt: {
      type: Date,
    },

    // ตั้งค่าการเทรด
    settings: {
      // เปอร์เซ็นต์ของเงินที่จะใช้ซื้อต่อครั้ง
      buyPercentage: {
        type: Number,
        default: 50, // 50% ของเงินที่มี
        min: 1,
        max: 100,
      },
      // เปอร์เซ็นต์ของเหรียญที่จะขายต่อครั้ง
      sellPercentage: {
        type: Number,
        default: 50, // 50% ของเหรียญที่มี
        min: 1,
        max: 100,
      },
      // ระดับความมั่นใจขั้นต่ำในการเทรด
      minConfidence: {
        type: Number,
        default: 60, // 60%
        min: 0,
        max: 100,
      },
      // ใช้ stop loss หรือไม่
      useStopLoss: {
        type: Boolean,
        default: false,
      },
      // เปอร์เซ็นต์ stop loss
      stopLossPercentage: {
        type: Number,
        default: 5, // -5%
        min: 0,
        max: 50,
      },
      // ใช้ take profit หรือไม่
      useTakeProfit: {
        type: Boolean,
        default: false,
      },
      // เปอร์เซ็นต์ take profit
      takeProfitPercentage: {
        type: Number,
        default: 10, // +10%
        min: 0,
        max: 100,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tradingSimulationSchema.index({ userId: 1, status: 1 });
tradingSimulationSchema.index({ symbol: 1, status: 1 });

// Method: คำนวณกำไร/ขาดทุน
tradingSimulationSchema.methods.calculateProfit = function (currentPrice) {
  const currentValue = this.currentBalance + (this.holdings * currentPrice);
  const profit = currentValue - this.initialInvestment;
  const profitPercentage = (profit / this.initialInvestment) * 100;

  return {
    profit,
    profitPercentage,
    currentValue,
  };
};

// Method: อัพเดทสถิติ
tradingSimulationSchema.methods.updateStats = function (currentPrice) {
  const { currentValue, profit, profitPercentage } = this.calculateProfit(currentPrice);
  
  this.currentBalance = currentValue - (this.holdings * currentPrice);
  this.totalProfit = profit;
  this.profitPercentage = profitPercentage;
  
  if (currentValue > this.highestBalance || this.highestBalance === 0) {
    this.highestBalance = currentValue;
  }
  
  if (currentValue < this.lowestBalance || this.lowestBalance === 0) {
    this.lowestBalance = currentValue;
  }
  
  this.lastUpdated = new Date();
};

// Method: ซื้อ
tradingSimulationSchema.methods.buy = function (price, amount) {
  const cost = amount * price;
  
  if (cost > this.currentBalance) {
    throw new Error('เงินไม่พอ');
  }

  const newHoldings = this.holdings + amount;
  const totalCost = (this.averageBuyPrice * this.holdings) + cost;
  
  this.currentBalance -= cost;
  this.holdings = newHoldings;
  this.averageBuyPrice = totalCost / newHoldings;
  this.buyCount += 1;
  this.totalTrades += 1;
  this.lastUpdated = new Date();
};

// Method: ขาย
tradingSimulationSchema.methods.sell = function (price, amount) {
  if (amount > this.holdings) {
    throw new Error('เหรียญไม่พอ');
  }

  const revenue = amount * price;
  const profit = (price - this.averageBuyPrice) * amount;
  
  this.currentBalance += revenue;
  this.holdings -= amount;
  this.totalProfit += profit;
  this.sellCount += 1;
  this.totalTrades += 1;
  this.lastUpdated = new Date();
};

const TradingSimulation = mongoose.model('TradingSimulation', tradingSimulationSchema);

module.exports = TradingSimulation;

