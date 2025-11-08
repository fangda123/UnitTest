# 💻 ตัวอย่างการใช้งาน (Code Examples)

## 📊 Chart Examples

### 1. Pie Chart - Portfolio Distribution

```typescript
import { PieChart } from './components/charts/PieChart';

// ข้อมูลสัดส่วน Portfolio
const portfolioData = [
  { name: 'Bitcoin (BTC)', value: 45.5, color: '#F7931A' },
  { name: 'Ethereum (ETH)', value: 28.3, color: '#627EEA' },
  { name: 'Binance Coin (BNB)', value: 12.7, color: '#F3BA2F' },
  { name: 'Cardano (ADA)', value: 8.2, color: '#0033AD' },
  { name: 'Solana (SOL)', value: 5.3, color: '#14F195' }
];

// ใช้งาน
function MyComponent() {
  return (
    <PieChart 
      data={portfolioData}
      title="สัดส่วน Portfolio"
    />
  );
}
```

### 2. Bar Chart - Monthly Trading Volume

```typescript
import { BarChart } from './components/charts/BarChart';

// ข้อมูลปริมาณการซื้อขายรายเดือน
const volumeData = [
  { month: 'ม.ค.', volume: 125000, trades: 450 },
  { month: 'ก.พ.', volume: 142000, trades: 520 },
  { month: 'มี.ค.', volume: 138000, trades: 495 },
  { month: 'เม.ย.', volume: 165000, trades: 580 },
  { month: 'พ.ค.', volume: 178000, trades: 620 },
  { month: 'มิ.ย.', volume: 192000, trades: 680 }
];

// ใช้งาน
function MyComponent() {
  return (
    <BarChart 
      data={volumeData}
      title="ปริมาณการซื้อขายรายเดือน"
    />
  );
}
```

### 3. Line Chart - Bitcoin Price History

```typescript
import { LineChart } from './components/charts/LineChart';

// สร้างข้อมูลราคา Bitcoin 30 วัน
const bitcoinPriceData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const basePrice = 42000;
  const variation = Math.sin(i / 3) * 3000 + Math.random() * 2000;
  
  return {
    time: date.getTime() / 1000, // Unix timestamp (seconds)
    value: basePrice + variation
  };
});

// ใช้งาน
function MyComponent() {
  return (
    <LineChart 
      data={bitcoinPriceData}
      title="ราคา Bitcoin (30 วัน)"
      color="#F7931A"
    />
  );
}
```

### 4. Column Chart - Weekly Profit/Loss

```typescript
import { ColumnChart } from './components/charts/ColumnChart';

// ข้อมูลกำไร/ขาดทุนรายสัปดาห์
const profitLossData = [
  { week: 'สัปดาห์ 1', profit: 2500, loss: -800 },
  { week: 'สัปดาห์ 2', profit: 3200, loss: -1200 },
  { week: 'สัปดาห์ 3', profit: 2800, loss: -600 },
  { week: 'สัปดาห์ 4', profit: 4100, loss: -1500 },
  { week: 'สัปดาห์ 5', profit: 3600, loss: -900 },
  { week: 'สัปดาห์ 6', profit: 4500, loss: -1100 }
];

// ใช้งาน
function MyComponent() {
  return (
    <ColumnChart 
      data={profitLossData}
      title="กำไร/ขาดทุนรายสัปดาห์"
    />
  );
}
```

### 5. Candlestick Chart - Professional Trading View

```typescript
import { CandlestickChart } from './components/charts/CandlestickChart';

// สร้างข้อมูล Candlestick
const candlestickData = Array.from({ length: 100 }, (_, i) => {
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

// สร้างข้อมูล Volume
const volumeData = candlestickData.map((candle) => ({
  time: candle.time,
  value: 1000000 + Math.random() * 5000000,
  color: candle.close >= candle.open 
    ? 'rgba(34, 197, 94, 0.5)' 
    : 'rgba(239, 68, 68, 0.5)'
}));

// ใช้งาน
function MyComponent() {
  return (
    <CandlestickChart 
      candleData={candlestickData}
      volumeData={volumeData}
      title="BTC/USDT"
    />
  );
}
```

---

## 📋 Table Examples

### 1. Basic Table Usage

```typescript
import { Table } from './components/Table';
import { TradeHistory } from './data/mockData';

// ข้อมูลตัวอย่าง
const tradeData: TradeHistory[] = [
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
  // ... more data
];

// ใช้งาน
function MyComponent() {
  return (
    <Table 
      data={tradeData}
      title="ประวัติการซื้อขาย"
    />
  );
}
```

### 2. Table with Filtering

```typescript
import { Table } from './components/Table';
import { useState } from 'react';

function MyComponent() {
  const [filter, setFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
  
  // กรองข้อมูลตาม Type
  const filteredData = tradeData.filter(trade => 
    filter === 'all' ? true : trade.type === filter
  );
  
  return (
    <div>
      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          ทั้งหมด
        </button>
        <button 
          onClick={() => setFilter('BUY')}
          className={`px-4 py-2 rounded ${filter === 'BUY' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          ซื้อ
        </button>
        <button 
          onClick={() => setFilter('SELL')}
          className={`px-4 py-2 rounded ${filter === 'SELL' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          ขาย
        </button>
      </div>
      
      {/* Table */}
      <Table 
        data={filteredData}
        title={`ประวัติการซื้อขาย (${filter === 'all' ? 'ทั้งหมด' : filter})`}
      />
    </div>
  );
}
```

---

## 🗓️ Date Range Calculator Examples

### 1. Basic Usage

```typescript
import { getDateRange, formatDateRange } from './utils/dateRange';

// ตัวอย่างที่ 1: เมื่อวาน
const yesterday = getDateRange(new Date().toISOString(), 'lastday');
console.log(yesterday);
// {
//   start: "2025-11-07T00:00:00.000Z",
//   end: "2025-11-07T23:59:59.999Z"
// }

// ตัวอย่างที่ 2: 7 วันล่าสุด
const last7Days = getDateRange(new Date().toISOString(), 'last7day');
console.log(last7Days);
// {
//   start: "2025-11-01T00:00:00.000Z",
//   end: "2025-11-08T23:59:59.999Z"
// }

// ตัวอย่างที่ 3: สัปดาห์ก่อนหน้า
const lastWeek = getDateRange(new Date().toISOString(), 'lastweek');
console.log(lastWeek);
// {
//   start: "2025-10-28T00:00:00.000Z",
//   end: "2025-11-03T23:59:59.999Z"
// }

// ตัวอย่างที่ 4: เดือนก่อนหน้า
const lastMonth = getDateRange(new Date().toISOString(), 'lastmonth');
console.log(lastMonth);
// {
//   start: "2025-10-01T00:00:00.000Z",
//   end: "2025-10-31T23:59:59.999Z"
// }
```

### 2. Format Date Range

```typescript
import { getDateRange, formatDateRange } from './utils/dateRange';

const range = getDateRange(new Date().toISOString(), 'last7day');
const formatted = formatDateRange(range.start, range.end);

console.log(formatted);
// "1 พ.ย. 2568 - 8 พ.ย. 2568"
```

### 3. Date Range Selector Component

```typescript
import { useState } from 'react';
import { getDateRange } from './utils/dateRange';

function DateRangeSelector() {
  const [selectedType, setSelectedType] = useState('last7day');
  const [dateRange, setDateRange] = useState(() => {
    return getDateRange(new Date().toISOString(), 'last7day');
  });
  
  const handleChange = (type: string) => {
    setSelectedType(type);
    const range = getDateRange(new Date().toISOString(), type as any);
    setDateRange(range);
  };
  
  const options = [
    { value: 'lastday', label: 'เมื่อวาน' },
    { value: 'last7day', label: '7 วันล่าสุด' },
    { value: 'lastweek', label: 'สัปดาห์ก่อน' },
    { value: 'lastmonth', label: 'เดือนก่อน' },
    { value: 'last3month', label: '3 เดือน' },
    { value: 'last6month', label: '6 เดือน' },
    { value: 'last12month', label: '12 เดือน' },
  ];
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">เลือกช่วงเวลา</h3>
      
      {/* Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            className={`px-4 py-2 rounded transition-colors ${
              selectedType === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      {/* Display Range */}
      <div className="p-4 bg-gray-50 rounded">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Start Date</div>
            <div className="font-mono text-sm">
              {new Date(dateRange.start).toLocaleString('th-TH')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">End Date</div>
            <div className="font-mono text-sm">
              {new Date(dateRange.end).toLocaleString('th-TH')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. Use with API Requests

```typescript
import { getDateRange } from './utils/dateRange';

// ฟังก์ชันดึงข้อมูลจาก API
async function fetchTradeHistory(dateType: string) {
  // คำนวณช่วงเวลา
  const range = getDateRange(new Date().toISOString(), dateType as any);
  
  // เรียก API
  const response = await fetch('/api/trades', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end
    })
  });
  
  return response.json();
}

// ใช้งาน
async function loadData() {
  try {
    const trades = await fetchTradeHistory('last7day');
    console.log('Trades:', trades);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### 5. Date Range with Chart

```typescript
import { useState, useEffect } from 'react';
import { LineChart } from './components/charts/LineChart';
import { getDateRange } from './utils/dateRange';

function ChartWithDateRange() {
  const [dateType, setDateType] = useState('last7day');
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    // คำนวณช่วงเวลา
    const range = getDateRange(new Date().toISOString(), dateType as any);
    
    // สร้างข้อมูลตามช่วงเวลา
    const startTime = new Date(range.start).getTime() / 1000;
    const endTime = new Date(range.end).getTime() / 1000;
    const days = Math.ceil((endTime - startTime) / 86400);
    
    const data = Array.from({ length: days }, (_, i) => ({
      time: startTime + (i * 86400),
      value: 42000 + Math.random() * 5000
    }));
    
    setChartData(data);
  }, [dateType]);
  
  return (
    <div>
      {/* Date Range Selector */}
      <div className="mb-4 flex gap-2">
        {['last7day', 'lastmonth', 'last3month'].map(type => (
          <button
            key={type}
            onClick={() => setDateType(type)}
            className={`px-4 py-2 rounded ${
              dateType === type ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {type === 'last7day' ? '7 วัน' : 
             type === 'lastmonth' ? '1 เดือน' : '3 เดือน'}
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <LineChart 
        data={chartData}
        title={`Bitcoin Price (${dateType})`}
        color="#F7931A"
      />
    </div>
  );
}
```

---

## 🎯 Dashboard Layout Examples

### 1. Custom Layout Configuration

```typescript
import { useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';

function CustomDashboard() {
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'chart1', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'chart2', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'table', x: 0, y: 4, w: 12, h: 6, minW: 8, minH: 4 },
  ]);
  
  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={50}
      width={1800}
      onLayoutChange={(newLayout) => setLayout(newLayout)}
      draggableHandle=".drag-handle"
    >
      <div key="chart1" className="bg-white rounded-lg shadow p-4">
        <div className="drag-handle cursor-move h-8 bg-gray-100 rounded mb-2" />
        {/* Your Chart Component */}
      </div>
      
      <div key="chart2" className="bg-white rounded-lg shadow p-4">
        <div className="drag-handle cursor-move h-8 bg-gray-100 rounded mb-2" />
        {/* Your Chart Component */}
      </div>
      
      <div key="table" className="bg-white rounded-lg shadow p-4">
        <div className="drag-handle cursor-move h-8 bg-gray-100 rounded mb-2" />
        {/* Your Table Component */}
      </div>
    </GridLayout>
  );
}
```

### 2. Save/Load Layout from LocalStorage

```typescript
import { useState, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';

function DashboardWithPersistence() {
  const defaultLayout: Layout[] = [
    { i: 'chart1', x: 0, y: 0, w: 6, h: 4 },
    { i: 'chart2', x: 6, y: 0, w: 6, h: 4 },
  ];
  
  // โหลด Layout จาก LocalStorage
  const [layout, setLayout] = useState<Layout[]>(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });
  
  // บันทึก Layout เมื่อมีการเปลี่ยนแปลง
  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  };
  
  // Reset Layout
  const resetLayout = () => {
    setLayout(defaultLayout);
    localStorage.removeItem('dashboard-layout');
  };
  
  return (
    <div>
      <button 
        onClick={resetLayout}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Reset Layout
      </button>
      
      <GridLayout
        layout={layout}
        cols={12}
        rowHeight={50}
        width={1800}
        onLayoutChange={handleLayoutChange}
      >
        {/* Your components */}
      </GridLayout>
    </div>
  );
}
```

---

## 🎨 Styling Examples

### 1. Custom Chart Colors

```typescript
// สีสำหรับ Crypto ต่างๆ
const cryptoColors = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  BNB: '#F3BA2F',
  ADA: '#0033AD',
  SOL: '#14F195',
  XRP: '#23292F',
  DOT: '#E6007A',
  DOGE: '#C2A633',
};

// ใช้งาน
<LineChart 
  data={data}
  title="Ethereum Price"
  color={cryptoColors.ETH}
/>
```

### 2. Custom Table Styling

```typescript
// เพิ่ม Custom CSS
const customTableStyles = {
  header: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
  row: 'hover:bg-blue-50 transition-colors',
  cell: 'px-4 py-3 text-sm',
};

// ใช้ Tailwind Classes
<table className="w-full">
  <thead className={customTableStyles.header}>
    <tr>
      <th className={customTableStyles.cell}>Column 1</th>
      <th className={customTableStyles.cell}>Column 2</th>
    </tr>
  </thead>
  <tbody>
    {data.map(row => (
      <tr key={row.id} className={customTableStyles.row}>
        <td className={customTableStyles.cell}>{row.value1}</td>
        <td className={customTableStyles.cell}>{row.value2}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

**Happy Coding! 🚀**

