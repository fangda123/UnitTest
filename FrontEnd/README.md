# 🧩 Frontend Developer Test - Trading Dashboard

Dashboard แบบ Professional ที่สามารถปรับแต่งได้เอง พร้อมฟีเจอร์ Drag & Drop, Resize, Charts และ Tables

## ✨ Features

### 1. 📊 Dashboard Layout (Drag & Drop + Resize)
- ✅ **Drag & Drop** - ลากย้ายตำแหน่ง Panel ได้อย่างอิสระ
- ✅ **Resize** - ปรับขนาด Panel ได้ทุกด้าน (บน/ล่าง/ซ้าย/ขวา)
- ✅ **Responsive** - ปรับตัวตามขนาดหน้าจอ
- ✅ **Layout แบบ Binance** - ออกแบบตาม Trading Platform มืออาชีพ
- ✅ **Reset Layout** - กดปุ่มเดียวกลับสู่ Layout เริ่มต้น

### 2. 📈 Chart Components (TradingView Lightweight Charts)

#### Candlestick Chart
- แสดงกราฟแท่งเทียนพร้อม Volume
- ใช้ TradingView Lightweight Charts
- แสดงข้อมูล OHLC (Open, High, Low, Close)
- Theme สีเข้ม เหมือน Trading Platform จริง

#### Pie Chart
- แสดงสัดส่วน Portfolio
- วาดด้วย Canvas API (เบาและรวดเร็ว)
- มี Hover Effect
- แสดง Legend พร้อมสี

#### Bar Chart
- แสดงปริมาณการซื้อขายรายเดือน
- กราฟแท่งแนวนอน
- แสดงข้อมูลเมื่อ Hover

#### Line Chart
- แสดงราคา Bitcoin ย้อนหลัง 30 วัน
- ใช้ TradingView Lightweight Charts
- แสดงค่าสูงสุด/ต่ำสุด/เฉลี่ย

#### Column Chart
- แสดงกำไร/ขาดทุนรายสัปดาห์
- กราฟแท่งแนวตั้ง 2 ชุดข้อมูล
- สีเขียว (กำไร) และสีแดง (ขาดทุน)

### 3. 📋 Table Component

#### Resizable Columns
- ลากขอบคอลัมน์เพื่อปรับขนาด
- กำหนด Min Width ได้
- Smooth Animation

#### Expandable Rows
- คลิกแถวเพื่อดูรายละเอียดเพิ่มเติม
- แสดง Order ID, Exchange, Wallet, TX Hash
- แสดงหมายเหตุและข้อมูลเพิ่มเติม

#### Features เพิ่มเติม
- Status Badge (สำเร็จ/รอดำเนินการ/ยกเลิก)
- Type Badge (BUY/SELL)
- Format ตัวเลขแบบ Currency
- Summary Footer (รวมมูลค่า, ค่าธรรมเนียม)

### 4. 🗓️ Date Range Calculator

Utility Function: `getDateRange(date: string, type: string)`

รองรับ Type:
- `lastday` - เมื่อวาน
- `last7day` - 7 วันล่าสุด
- `lastweek` - สัปดาห์ก่อนหน้า
- `lastmonth` - เดือนก่อนหน้า
- `last3month` - 3 เดือนล่าสุด
- `last6month` - 6 เดือนล่าสุด
- `last12month` - 12 เดือนล่าสุด

Output:
```typescript
{
  start: "2025-10-01T00:00:00.000Z",
  end: "2025-10-15T23:59:59.999Z"
}
```

## 🚀 Installation

```bash
# ติดตั้ง Dependencies
npm install

# รัน Development Server
npm run dev

# Build สำหรับ Production
npm run build

# Preview Production Build
npm run preview
```

## 📦 Tech Stack

- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool (รวดเร็วมาก)
- **TailwindCSS** - Utility-First CSS
- **TradingView Lightweight Charts** - Professional Charts
- **react-grid-layout** - Drag & Drop + Resize
- **Lucide React** - Modern Icons

## 📁 Project Structure

```
FrontEnd/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── PieChart.tsx          # Pie Chart Component
│   │   │   ├── BarChart.tsx          # Bar Chart Component
│   │   │   ├── LineChart.tsx         # Line Chart Component
│   │   │   ├── ColumnChart.tsx       # Column Chart Component
│   │   │   └── CandlestickChart.tsx  # Candlestick Chart Component
│   │   ├── Dashboard.tsx             # Main Dashboard Layout
│   │   └── Table.tsx                 # Advanced Table Component
│   ├── data/
│   │   └── mockData.ts               # Mock Data (ข้อมูลจริง)
│   ├── utils/
│   │   └── dateRange.ts              # Date Range Utility
│   ├── App.tsx                       # Main App Component
│   ├── main.tsx                      # Entry Point
│   └── index.css                     # Global Styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 🎯 Key Features Implementation

### Drag & Drop
ใช้ `react-grid-layout` พร้อม Custom Drag Handle
- ลากได้จากพื้นที่ด้านบนของแต่ละ Panel
- มี Visual Feedback เมื่อ Hover
- ไม่ชนกัน (Collision Detection)

### Resize
รองรับการ Resize ทุกด้าน:
- มุม: NW, NE, SW, SE
- ด้าน: N, S, E, W
- กำหนด Min Width/Height ได้

### Charts
ใช้ 2 แนวทาง:
1. **Canvas API** - สำหรับ Pie, Bar, Column (เบา รวดเร็ว)
2. **Lightweight Charts** - สำหรับ Line, Candlestick (Professional)

### Table
พัฒนาเอง 100% ไม่ใช้ Library:
- Resizable Columns ด้วย Mouse Events
- Expandable Rows ด้วย State Management
- Responsive Design

## 💡 Usage Examples

### Date Range Calculator

```typescript
import { getDateRange, formatDateRange } from './utils/dateRange';

// คำนวณช่วงเวลา 7 วันล่าสุด
const range = getDateRange(new Date().toISOString(), 'last7day');
console.log(range);
// { start: "2025-11-01T00:00:00.000Z", end: "2025-11-08T23:59:59.999Z" }

// Format เป็นข้อความที่อ่านง่าย
const formatted = formatDateRange(range.start, range.end);
console.log(formatted);
// "1 พ.ย. 2568 - 8 พ.ย. 2568"
```

### Custom Chart

```typescript
import { LineChart } from './components/charts/LineChart';

const data = [
  { time: 1699401600, value: 42000 },
  { time: 1699488000, value: 43500 },
  // ...
];

<LineChart 
  data={data}
  title="Custom Chart"
  color="#FF6B6B"
/>
```

## 🎨 Design Principles

1. **ใช้งานง่าย** - UI/UX ที่เข้าใจง่าย ไม่ซับซ้อน
2. **Performance** - ใช้ Canvas API และ Lightweight Charts เพื่อประสิทธิภาพสูงสุด
3. **Responsive** - ทำงานได้ดีทุกขนาดหน้าจอ
4. **Professional** - ดีไซน์เหมือน Trading Platform จริง
5. **Customizable** - ปรับแต่งได้ทุกอย่าง

## 📝 Comments

โค้ดทั้งหมดมีคอมเม้นท์ภาษาไทยอย่างละเอียด:
- อธิบายการทำงานของแต่ละฟังก์ชัน
- อธิบาย Algorithm และ Logic
- อธิบาย Props และ Parameters
- มี JSDoc สำหรับ TypeScript

## 🔥 Advanced Features

- **Auto-fit Content** - Charts ปรับขนาดอัตโนมัติ
- **Hover Effects** - แสดงข้อมูลเพิ่มเติมเมื่อ Hover
- **Smooth Animations** - Transition ที่นุ่มนวล
- **Dark/Light Theme** - Charts รองรับทั้ง 2 Theme
- **Real-time Updates** - พร้อมรองรับข้อมูล Real-time

## 🎓 Learning Points

1. **Component Architecture** - แยก Component อย่างเป็นระบบ
2. **State Management** - จัดการ State อย่างมีประสิทธิภาพ
3. **Performance Optimization** - ใช้ useRef, useMemo, useCallback
4. **TypeScript** - Type Safety ทั้งหมด
5. **Canvas API** - วาดกราฟด้วย Canvas
6. **Grid Layout** - ใช้ react-grid-layout อย่างมืออาชีพ

## 📞 Support

หากมีคำถามหรือต้องการความช่วยเหลือ:
- อ่าน Comments ในโค้ด (อธิบายละเอียดมาก)
- ดูตัวอย่างใน `mockData.ts`
- ทดลองปรับแต่งใน Dashboard

## 🏆 Test Results

✅ Dashboard Layout - Drag & Drop + Resize  
✅ Pie Chart - แสดงสัดส่วนข้อมูล  
✅ Bar Chart - แสดงการเปรียบเทียบ  
✅ Line Chart - แสดงข้อมูลตามเวลา  
✅ Column Chart - แสดงข้อมูลแนวตั้ง  
✅ Candlestick Chart - แสดงกราฟแท่งเทียน  
✅ Table - Resizable Columns + Expandable Rows  
✅ Date Range Calculator - ครบทุก Type  
✅ ใช้ TailwindCSS  
✅ Component-based Architecture  
✅ TypeScript  
✅ Comments ภาษาไทยทั้งหมด  
✅ ใช้ข้อมูลจริง (Mock Data)  

---

**Made with ❤️ for Frontend Developer Test**

