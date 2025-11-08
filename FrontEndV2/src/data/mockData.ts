import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

/**
 * Mock Data สำหรับทดสอบ Dashboard
 * รวมข้อมูลทุกประเภทที่ใช้ในกราฟและตาราง
 */

// ข้อมูลสำหรับ Pie Chart - สัดส่วนการลงทุน
export const portfolioDistribution = {
  labels: ['Bitcoin', 'Ethereum', 'Binance Coin', 'Cardano', 'Solana', 'Others'],
  series: [35, 25, 15, 12, 8, 5]
};

// ข้อมูลสำหรับ Bar Chart - ปริมาณการเทรดรายเดือน
export const monthlyTradingVolume = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    {
      name: 'Buy Volume',
      data: [44000, 55000, 57000, 56000, 61000, 58000]
    },
    {
      name: 'Sell Volume',
      data: [35000, 41000, 36000, 26000, 45000, 48000]
    },
    {
      name: 'Net Volume',
      data: [9000, 14000, 21000, 30000, 16000, 10000]
    }
  ]
};

// ข้อมูลสำหรับ Line Chart - ยอดคงเหลือในบัญชี
export const accountBalance = {
  categories: [
    '01 Jan', '05 Jan', '10 Jan', '15 Jan', '20 Jan', '25 Jan', '30 Jan',
    '05 Feb', '10 Feb', '15 Feb', '20 Feb', '25 Feb', '28 Feb'
  ],
  series: [
    {
      name: 'Total Balance',
      data: [50000, 52000, 51500, 54000, 56000, 55500, 58000, 60000, 59500, 62000, 64000, 65500, 67000]
    },
    {
      name: 'Available Balance',
      data: [45000, 47000, 46500, 49000, 51000, 50500, 53000, 55000, 54500, 57000, 59000, 60500, 62000]
    },
    {
      name: 'In Orders',
      data: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]
    }
  ]
};

// ข้อมูลสำหรับ Column Chart - กำไร/ขาดทุนรายสัปดาห์
export const weeklyProfitLoss = {
  categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
  series: [
    {
      name: 'Profit',
      data: [3500, 4200, 3800, 5100, 4800, 5500]
    },
    {
      name: 'Loss',
      data: [-1200, -1800, -900, -1500, -1100, -800]
    },
    {
      name: 'Net',
      data: [2300, 2400, 2900, 3600, 3700, 4700]
    }
  ]
};

// ข้อมูลสำหรับ TradingView Chart - Candlestick Data
export const generateCandlestickData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  const startDate = new Date('2025-01-01');
  const days = 60;
  let basePrice = 45000;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // สร้างข้อมูลแบบสุ่มที่มีแนวโน้ม
    const volatility = 1000;
    const trend = (Math.random() - 0.5) * 500;
    basePrice += trend;
    
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = basePrice + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    data.push({
      time: Math.floor(date.getTime() / 1000) as UTCTimestamp,
      open,
      high,
      low,
      close,
    });
  }

  return data;
};

export const candlestickData = generateCandlestickData();

// ข้อมูลสำหรับตาราง - Transaction History
export interface Transaction {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  coin: string;
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  fee: number;
  expandedContent?: React.ReactNode;
}

export const transactionHistory: Transaction[] = [
  {
    id: 'TXN001',
    date: '2025-11-08 10:30:00',
    type: 'buy',
    coin: 'BTC',
    amount: 0.5,
    price: 45000,
    total: 22500,
    status: 'completed',
    fee: 22.5,
  },
  {
    id: 'TXN002',
    date: '2025-11-08 09:15:00',
    type: 'sell',
    coin: 'ETH',
    amount: 5,
    price: 2400,
    total: 12000,
    status: 'completed',
    fee: 12,
  },
  {
    id: 'TXN003',
    date: '2025-11-08 08:45:00',
    type: 'buy',
    coin: 'BNB',
    amount: 20,
    price: 310,
    total: 6200,
    status: 'pending',
    fee: 6.2,
  },
  {
    id: 'TXN004',
    date: '2025-11-07 18:20:00',
    type: 'buy',
    coin: 'ADA',
    amount: 1000,
    price: 0.45,
    total: 450,
    status: 'completed',
    fee: 0.45,
  },
  {
    id: 'TXN005',
    date: '2025-11-07 16:10:00',
    type: 'sell',
    coin: 'SOL',
    amount: 15,
    price: 98,
    total: 1470,
    status: 'completed',
    fee: 1.47,
  },
  {
    id: 'TXN006',
    date: '2025-11-07 14:30:00',
    type: 'buy',
    coin: 'BTC',
    amount: 0.25,
    price: 44800,
    total: 11200,
    status: 'completed',
    fee: 11.2,
  },
  {
    id: 'TXN007',
    date: '2025-11-07 12:00:00',
    type: 'sell',
    coin: 'ETH',
    amount: 3,
    price: 2380,
    total: 7140,
    status: 'cancelled',
    fee: 0,
  },
  {
    id: 'TXN008',
    date: '2025-11-07 10:45:00',
    type: 'buy',
    coin: 'DOGE',
    amount: 10000,
    price: 0.08,
    total: 800,
    status: 'completed',
    fee: 0.8,
  },
  {
    id: 'TXN009',
    date: '2025-11-06 20:30:00',
    type: 'buy',
    coin: 'XRP',
    amount: 500,
    price: 0.62,
    total: 310,
    status: 'completed',
    fee: 0.31,
  },
  {
    id: 'TXN010',
    date: '2025-11-06 18:15:00',
    type: 'sell',
    coin: 'BNB',
    amount: 10,
    price: 315,
    total: 3150,
    status: 'completed',
    fee: 3.15,
  },
  {
    id: 'TXN011',
    date: '2025-11-06 15:00:00',
    type: 'buy',
    coin: 'BTC',
    amount: 0.1,
    price: 44500,
    total: 4450,
    status: 'completed',
    fee: 4.45,
  },
  {
    id: 'TXN012',
    date: '2025-11-06 12:30:00',
    type: 'sell',
    coin: 'ETH',
    amount: 2,
    price: 2350,
    total: 4700,
    status: 'completed',
    fee: 4.7,
  },
];

// สถิติรวม Dashboard
export const dashboardStats = {
  totalBalance: 67000,
  totalProfit: 15200,
  totalTrades: 156,
  successRate: 87.5,
  todayChange: 3.24,
  weeklyChange: 8.67,
  monthlyChange: 15.32,
  bestPerformer: 'BTC (+12.5%)',
  worstPerformer: 'DOGE (-3.2%)',
};

// ข้อมูล Top Coins
export const topCoins = [
  { symbol: 'BTC', name: 'Bitcoin', price: 45000, change24h: 2.5, volume: '28.5B', marketCap: '875B' },
  { symbol: 'ETH', name: 'Ethereum', price: 2400, change24h: -1.2, volume: '15.2B', marketCap: '290B' },
  { symbol: 'BNB', name: 'Binance Coin', price: 310, change24h: 3.8, volume: '1.8B', marketCap: '47B' },
  { symbol: 'SOL', name: 'Solana', price: 98, change24h: -2.1, volume: '2.1B', marketCap: '42B' },
  { symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 1.5, volume: '890M', marketCap: '15B' },
];

// ข้อมูลสำหรับ Market Overview
export const marketOverview = {
  totalMarketCap: '1.85T',
  total24hVolume: '89.5B',
  btcDominance: 47.3,
  ethDominance: 15.7,
  totalCoins: 12589,
  activeExchanges: 583,
};

