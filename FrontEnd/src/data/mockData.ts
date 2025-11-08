/**
 * Mock Data สำหรับใช้ในการแสดงผลต่างๆ
 * ข้อมูลจริงที่เหมือนกับข้อมูลการเทรด
 */

// ข้อมูลสำหรับ Pie Chart - สัดส่วนการถือครอง Portfolio
export const portfolioData = [
  { name: 'Bitcoin (BTC)', value: 45.5, color: '#F7931A' },
  { name: 'Ethereum (ETH)', value: 28.3, color: '#627EEA' },
  { name: 'Binance Coin (BNB)', value: 12.7, color: '#F3BA2F' },
  { name: 'Cardano (ADA)', value: 8.2, color: '#0033AD' },
  { name: 'Solana (SOL)', value: 5.3, color: '#14F195' }
];

// ข้อมูลสำหรับ Bar Chart - ปริมาณการซื้อขายรายเดือน
export const monthlyVolumeData = [
  { month: 'ม.ค.', volume: 125000, trades: 450 },
  { month: 'ก.พ.', volume: 142000, trades: 520 },
  { month: 'มี.ค.', volume: 138000, trades: 495 },
  { month: 'เม.ย.', volume: 165000, trades: 580 },
  { month: 'พ.ค.', volume: 178000, trades: 620 },
  { month: 'มิ.ย.', volume: 192000, trades: 680 },
  { month: 'ก.ค.', volume: 188000, trades: 655 },
  { month: 'ส.ค.', volume: 205000, trades: 720 },
  { month: 'ก.ย.', volume: 198000, trades: 690 },
  { month: 'ต.ค.', volume: 215000, trades: 750 },
  { month: 'พ.ย.', volume: 228000, trades: 800 },
  { month: 'ธ.ค.', volume: 245000, trades: 850 }
];

// ข้อมูลสำหรับ Line Chart - ราคา Bitcoin ย้อนหลัง 30 วัน
export const bitcoinPriceData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const basePrice = 42000;
  const variation = Math.sin(i / 3) * 3000 + Math.random() * 2000;
  return {
    time: date.getTime() / 1000, // Unix timestamp in seconds
    value: basePrice + variation
  };
});

// ข้อมูลสำหรับ Column Chart - กำไร/ขาดทุนรายสัปดาห์
export const weeklyProfitData = [
  { week: 'สัปดาห์ 1', profit: 2500, loss: -800 },
  { week: 'สัปดาห์ 2', profit: 3200, loss: -1200 },
  { week: 'สัปดาห์ 3', profit: 2800, loss: -600 },
  { week: 'สัปดาห์ 4', profit: 4100, loss: -1500 },
  { week: 'สัปดาห์ 5', profit: 3600, loss: -900 },
  { week: 'สัปดาห์ 6', profit: 4500, loss: -1100 }
];

// ข้อมูลสำหรับ Table - ประวัติการซื้อขาย
export interface TradeHistory {
  id: string;
  date: string;
  pair: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  total: number;
  fee: number;
  status: 'completed' | 'pending' | 'cancelled';
  details: {
    orderId: string;
    exchange: string;
    wallet: string;
    txHash: string;
    notes: string;
  };
}

export const tradeHistoryData: TradeHistory[] = [
  {
    id: '1',
    date: '2024-11-08 14:23:15',
    pair: 'BTC/USDT',
    type: 'BUY',
    price: 43250.50,
    amount: 0.5,
    total: 21625.25,
    fee: 21.63,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110801',
      exchange: 'Binance',
      wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      txHash: '0x8f3d7e2c1b9a4f6e5d8c7b6a5e4d3c2b1a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d',
      notes: 'ซื้อเพิ่มตาม Strategy DCA'
    }
  },
  {
    id: '2',
    date: '2024-11-07 09:15:42',
    pair: 'ETH/USDT',
    type: 'SELL',
    price: 2285.75,
    amount: 2.5,
    total: 5714.38,
    fee: 5.71,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110702',
      exchange: 'Binance',
      wallet: '0x8a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      notes: 'ขายทำกำไร +15%'
    }
  },
  {
    id: '3',
    date: '2024-11-06 16:45:30',
    pair: 'BNB/USDT',
    type: 'BUY',
    price: 312.80,
    amount: 10,
    total: 3128.00,
    fee: 3.13,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110603',
      exchange: 'Binance',
      wallet: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      txHash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
      notes: 'เก็งกำไรระยะสั้น'
    }
  },
  {
    id: '4',
    date: '2024-11-05 11:20:18',
    pair: 'ADA/USDT',
    type: 'BUY',
    price: 0.3850,
    amount: 5000,
    total: 1925.00,
    fee: 1.93,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110504',
      exchange: 'Binance',
      wallet: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      txHash: '0x7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c',
      notes: 'Staking Pool'
    }
  },
  {
    id: '5',
    date: '2024-11-04 08:55:22',
    pair: 'SOL/USDT',
    type: 'SELL',
    price: 58.45,
    amount: 25,
    total: 1461.25,
    fee: 1.46,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110405',
      exchange: 'Binance',
      wallet: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      txHash: '0x5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
      notes: 'ตัด Loss -8%'
    }
  },
  {
    id: '6',
    date: '2024-11-03 13:40:55',
    pair: 'BTC/USDT',
    type: 'BUY',
    price: 42180.25,
    amount: 0.25,
    total: 10545.06,
    fee: 10.55,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110306',
      exchange: 'Binance',
      wallet: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      txHash: '0x3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a',
      notes: 'DCA ครั้งที่ 12'
    }
  },
  {
    id: '7',
    date: '2024-11-02 17:25:40',
    pair: 'ETH/USDT',
    type: 'BUY',
    price: 2245.30,
    amount: 1.5,
    total: 3367.95,
    fee: 3.37,
    status: 'completed',
    details: {
      orderId: 'ORD-2024110207',
      exchange: 'Binance',
      wallet: '0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      txHash: '0x1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
      notes: 'เพิ่ม Position หลังราคาปรับฐาน'
    }
  },
  {
    id: '8',
    date: '2024-11-01 10:10:33',
    pair: 'MATIC/USDT',
    type: 'BUY',
    price: 0.8520,
    amount: 2000,
    total: 1704.00,
    fee: 1.70,
    status: 'pending',
    details: {
      orderId: 'ORD-2024110108',
      exchange: 'Binance',
      wallet: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      txHash: 'pending',
      notes: 'รอการยืนยันจาก Network'
    }
  }
];

// ข้อมูลสำหรับ Candlestick Chart (Lightweight Charts)
export const candlestickData = Array.from({ length: 100 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (99 - i));
  const basePrice = 42000 + Math.sin(i / 10) * 5000;
  const open = basePrice + (Math.random() - 0.5) * 1000;
  const close = basePrice + (Math.random() - 0.5) * 1000;
  const high = Math.max(open, close) + Math.random() * 500;
  const low = Math.min(open, close) - Math.random() * 500;
  
  return {
    time: date.getTime() / 1000,
    open,
    high,
    low,
    close
  };
});

// ข้อมูล Volume สำหรับ Histogram
export const volumeData = candlestickData.map((candle) => ({
  time: candle.time,
  value: 1000000 + Math.random() * 5000000,
  color: candle.close >= candle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
}));

