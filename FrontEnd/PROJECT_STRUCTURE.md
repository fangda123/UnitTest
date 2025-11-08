# 📁 โครงสร้างโปรเจค

## 🌳 File Tree

```
FrontEnd/
│
├── 📄 package.json                 # Dependencies และ Scripts
├── 📄 tsconfig.json                # TypeScript Configuration
├── 📄 vite.config.ts               # Vite Configuration
├── 📄 tailwind.config.js           # TailwindCSS Configuration
├── 📄 postcss.config.js            # PostCSS Configuration
├── 📄 .eslintrc.cjs                # ESLint Configuration
├── 📄 .gitignore                   # Git Ignore Rules
│
├── 📄 README.md                    # ภาพรวมโปรเจค
├── 📄 QUICKSTART.md                # คู่มือเริ่มต้นใช้งาน
├── 📄 USAGE.md                     # คู่มือการใช้งานละเอียด
├── 📄 EXAMPLES.md                  # ตัวอย่าง Code
├── 📄 TEST_RESULTS.md              # ผลการทดสอบ
├── 📄 PROJECT_STRUCTURE.md         # โครงสร้างโปรเจค (ไฟล์นี้)
│
├── 📄 index.html                   # HTML Entry Point
│
├── 📂 src/                         # Source Code
│   │
│   ├── 📄 main.tsx                 # React Entry Point
│   ├── 📄 App.tsx                  # Main App Component
│   ├── 📄 index.css                # Global Styles
│   ├── 📄 vite-env.d.ts            # Vite Type Definitions
│   │
│   ├── 📂 components/              # React Components
│   │   │
│   │   ├── 📄 Dashboard.tsx        # Main Dashboard Layout
│   │   │                           # - Drag & Drop
│   │   │                           # - Resize
│   │   │                           # - Grid Layout
│   │   │
│   │   ├── 📄 Table.tsx            # Advanced Table Component
│   │   │                           # - Resizable Columns
│   │   │                           # - Expandable Rows
│   │   │                           # - Summary Footer
│   │   │
│   │   └── 📂 charts/              # Chart Components
│   │       │
│   │       ├── 📄 PieChart.tsx     # Pie Chart (Canvas API)
│   │       │                       # - แสดงสัดส่วนข้อมูล
│   │       │                       # - Hover Effect
│   │       │                       # - Legend
│   │       │
│   │       ├── 📄 BarChart.tsx     # Bar Chart (Canvas API)
│   │       │                       # - แสดงกราฟแท่งแนวนอน
│   │       │                       # - Tooltip
│   │       │                       # - Gradient Colors
│   │       │
│   │       ├── 📄 LineChart.tsx    # Line Chart (Lightweight Charts)
│   │       │                       # - แสดงข้อมูลตามเวลา
│   │       │                       # - Zoom & Pan
│   │       │                       # - Crosshair
│   │       │
│   │       ├── 📄 ColumnChart.tsx  # Column Chart (Canvas API)
│   │       │                       # - แสดงกราฟแท่งแนวตั้ง
│   │       │                       # - 2 Series (กำไร/ขาดทุน)
│   │       │                       # - Tooltip
│   │       │
│   │       └── 📄 CandlestickChart.tsx  # Candlestick Chart
│   │                               # - TradingView Lightweight Charts
│   │                               # - แสดง OHLC
│   │                               # - Volume Histogram
│   │                               # - Professional Theme
│   │
│   ├── 📂 data/                    # Mock Data
│   │   │
│   │   └── 📄 mockData.ts          # ข้อมูลทดสอบ
│   │                               # - portfolioData (Pie Chart)
│   │                               # - monthlyVolumeData (Bar Chart)
│   │                               # - bitcoinPriceData (Line Chart)
│   │                               # - weeklyProfitData (Column Chart)
│   │                               # - tradeHistoryData (Table)
│   │                               # - candlestickData (Candlestick)
│   │                               # - volumeData (Volume)
│   │
│   └── 📂 utils/                   # Utility Functions
│       │
│       └── 📄 dateRange.ts         # Date Range Calculator
│                                   # - getDateRange()
│                                   # - formatDateRange()
│                                   # - รองรับ 7 Types
│
└── 📂 dist/                        # Build Output (หลัง npm run build)
    ├── 📄 index.html
    └── 📂 assets/
        ├── 📄 index.css
        └── 📄 index.js
```

---

## 📦 Components Overview

### 1. Dashboard.tsx
**หน้าที่:** Main Container สำหรับ Dashboard

**Features:**
- Grid Layout ด้วย react-grid-layout
- Drag & Drop Panels
- Resize Panels
- Reset Layout Button
- Date Range Selector

**Props:** ไม่มี (Root Component)

**State:**
- `layout` - Grid Layout Configuration
- `selectedDateType` - ประเภทช่วงเวลาที่เลือก
- `dateRange` - ช่วงเวลาปัจจุบัน

---

### 2. Table.tsx
**หน้าที่:** แสดงตารางข้อมูลพร้อมฟีเจอร์ขั้นสูง

**Features:**
- Resizable Columns (ลากขอบเพื่อปรับขนาด)
- Expandable Rows (คลิกเพื่อดูรายละเอียด)
- Status & Type Badges
- Summary Footer
- Hover Effects

**Props:**
```typescript
interface TableProps {
  data: TradeHistory[];
  title?: string;
}
```

**State:**
- `columns` - Configuration ของคอลัมน์
- `expandedRows` - Set ของแถวที่ขยาย
- `resizingColumn` - คอลัมน์ที่กำลัง Resize

---

### 3. Charts Components

#### PieChart.tsx
**หน้าที่:** แสดงกราฟวงกลมสัดส่วน

**Technology:** Canvas API

**Props:**
```typescript
interface PieChartProps {
  data: PieChartData[];
  title?: string;
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}
```

**Features:**
- วาดด้วย Canvas (เร็วและเบา)
- Hover Effect
- แสดงเปอร์เซ็นต์
- Legend พร้อมสี

---

#### BarChart.tsx
**หน้าที่:** แสดงกราฟแท่งแนวนอน

**Technology:** Canvas API

**Props:**
```typescript
interface BarChartProps {
  data: BarChartData[];
  title?: string;
}

interface BarChartData {
  month: string;
  volume: number;
  trades: number;
}
```

**Features:**
- Gradient Colors
- Hover Tooltip
- Grid Lines
- Responsive

---

#### LineChart.tsx
**หน้าที่:** แสดงกราฟเส้นตามเวลา

**Technology:** TradingView Lightweight Charts

**Props:**
```typescript
interface LineChartProps {
  data: LineData[];
  title?: string;
  color?: string;
}
```

**Features:**
- Zoom & Pan
- Crosshair
- แสดงค่าสูงสุด/ต่ำสุด/เฉลี่ย
- Professional Look

---

#### ColumnChart.tsx
**หน้าที่:** แสดงกราฟแท่งแนวตั้ง 2 ชุด

**Technology:** Canvas API

**Props:**
```typescript
interface ColumnChartProps {
  data: ColumnChartData[];
  title?: string;
}

interface ColumnChartData {
  week: string;
  profit: number;
  loss: number;
}
```

**Features:**
- 2 Series (กำไร/ขาดทุน)
- สีเขียว/แดง
- Hover Tooltip
- แสดงยอดสุทธิ

---

#### CandlestickChart.tsx
**หน้าที่:** แสดงกราฟแท่งเทียนพร้อม Volume

**Technology:** TradingView Lightweight Charts

**Props:**
```typescript
interface CandlestickChartProps {
  candleData: CandlestickData[];
  volumeData: HistogramData[];
  title?: string;
}
```

**Features:**
- แสดง OHLC
- Volume Histogram
- Dark Theme
- Zoom & Pan
- Time Buttons (1D, 1W, 1M, 1Y)

---

## 🛠️ Utilities

### dateRange.ts

**Functions:**

#### getDateRange()
```typescript
function getDateRange(
  date: string,
  type: 'lastday' | 'last7day' | 'lastweek' | 'lastmonth' | 
        'last3month' | 'last6month' | 'last12month'
): { start: string; end: string }
```

**หน้าที่:** คำนวณช่วงเวลาตามประเภท

**Returns:**
```typescript
{
  start: "2025-11-01T00:00:00.000Z",
  end: "2025-11-08T23:59:59.999Z"
}
```

---

#### formatDateRange()
```typescript
function formatDateRange(
  start: string,
  end: string
): string
```

**หน้าที่:** แปลงช่วงเวลาเป็นข้อความที่อ่านง่าย

**Returns:** `"1 พ.ย. 2568 - 8 พ.ย. 2568"`

---

## 📊 Data Structure

### TradeHistory (Table Data)
```typescript
interface TradeHistory {
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
```

---

## 🎨 Styling

### TailwindCSS Configuration
```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f0f9ff',
        // ... more shades
        900: '#0c4a6e',
      },
    },
  },
}
```

### Custom CSS
```css
/* src/index.css */
- Global Styles
- React Grid Layout Styles
- Custom Scrollbar
- Animations
- Utility Classes
```

---

## 🔧 Configuration Files

### package.json
**Scripts:**
- `dev` - รัน Development Server
- `build` - Build สำหรับ Production
- `preview` - Preview Production Build
- `lint` - รัน ESLint

**Dependencies:**
- React 18.3.1
- TypeScript 5.4.5
- Vite 5.2.11
- TailwindCSS 3.4.3
- Lightweight Charts 4.1.3
- react-grid-layout 1.4.4

---

### tsconfig.json
**Configuration:**
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict Mode: true

---

### vite.config.ts
**Configuration:**
- Port: 3000
- Auto Open Browser
- React Plugin

---

## 📝 Documentation Files

| ไฟล์ | หน้าที่ |
|------|---------|
| README.md | ภาพรวมโปรเจค, Features, Installation |
| QUICKSTART.md | เริ่มต้นใช้งานภายใน 3 นาที |
| USAGE.md | คู่มือการใช้งานละเอียด |
| EXAMPLES.md | ตัวอย่าง Code ทุก Component |
| TEST_RESULTS.md | ผลการทดสอบและคะแนน |
| PROJECT_STRUCTURE.md | โครงสร้างโปรเจค (ไฟล์นี้) |

---

## 🚀 Build Process

### Development
```bash
npm run dev
```
1. Vite starts dev server
2. Hot Module Replacement enabled
3. TypeScript compilation
4. TailwindCSS processing
5. Browser opens at localhost:3000

### Production
```bash
npm run build
```
1. TypeScript compilation (tsc)
2. Vite build
3. TailwindCSS purge unused styles
4. Minification
5. Output to `dist/`

**Output:**
```
dist/
├── index.html (0.47 kB)
└── assets/
    ├── index.css (15.76 kB)
    └── index.js (419.07 kB)
```

---

## 🎯 Code Organization Principles

1. **Component-based Architecture**
   - แยก Component ตาม Feature
   - Reusable Components
   - Single Responsibility

2. **Type Safety**
   - TypeScript ทุกไฟล์
   - Interface สำหรับ Props
   - Type สำหรับ Data

3. **Separation of Concerns**
   - Components (UI)
   - Data (Mock Data)
   - Utils (Business Logic)
   - Styles (CSS)

4. **Performance**
   - Canvas API สำหรับ Charts
   - Lightweight Charts Library
   - Lazy Loading
   - Memoization

5. **Maintainability**
   - Comments ภาษาไทย
   - Clear Naming
   - Consistent Structure
   - Documentation

---

**โครงสร้างที่ชัดเจน ใช้งานง่าย พัฒนาต่อได้! 🚀**

