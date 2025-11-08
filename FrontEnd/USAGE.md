# 📖 คู่มือการใช้งาน

## 🚀 เริ่มต้นใช้งาน

### 1. ติดตั้งและรันโปรเจค

```bash
# ติดตั้ง Dependencies
npm install

# รัน Development Server (จะเปิด Browser อัตโนมัติที่ http://localhost:3000)
npm run dev

# Build สำหรับ Production
npm run build

# Preview Production Build
npm run preview
```

### 2. การใช้งาน Dashboard

เมื่อเปิดแอพขึ้นมา คุณจะเห็น Dashboard ที่มี Panel ต่างๆ:

#### 🎯 Drag & Drop (ลากย้ายตำแหน่ง)
1. เลื่อนเมาส์ไปที่ด้านบนของ Panel ใดก็ได้
2. คลิกค้างและลากไปยังตำแหน่งที่ต้องการ
3. ปล่อยเมาส์เพื่อวาง Panel

#### 📏 Resize (ปรับขนาด)
1. เลื่อนเมาส์ไปที่มุมหรือขอบของ Panel
2. เมื่อเห็น Cursor เปลี่ยน ให้คลิกค้างและลาก
3. ปล่อยเมาส์เมื่อได้ขนาดที่ต้องการ

#### 🔄 Reset Layout
- คลิกปุ่ม "รีเซ็ต Layout" ที่มุมบนขวาเพื่อกลับสู่ Layout เริ่มต้น

---

## 📊 Chart Components

### 1. Candlestick Chart (กราฟแท่งเทียน)

แสดงข้อมูลราคา Bitcoin แบบ OHLC พร้อม Volume

**Features:**
- Zoom in/out ด้วยการ Scroll
- Pan ด้วยการลากเมาส์
- Crosshair แสดงข้อมูลเมื่อ Hover
- แสดงค่า Open, High, Low, Close

**การใช้งาน:**
```typescript
import { CandlestickChart } from './components/charts/CandlestickChart';

<CandlestickChart 
  candleData={candlestickData}
  volumeData={volumeData}
  title="BTC/USDT"
/>
```

### 2. Pie Chart (กราฟวงกลม)

แสดงสัดส่วน Portfolio การถือครองเหรียญต่างๆ

**Features:**
- Hover เพื่อดู Highlight
- แสดงเปอร์เซ็นต์บนกราฟ
- Legend แสดงรายละเอียด

**การใช้งาน:**
```typescript
import { PieChart } from './components/charts/PieChart';

const data = [
  { name: 'Bitcoin', value: 45.5, color: '#F7931A' },
  { name: 'Ethereum', value: 28.3, color: '#627EEA' },
];

<PieChart data={data} title="Portfolio Distribution" />
```

### 3. Bar Chart (กราฟแท่งแนวนอน)

แสดงปริมาณการซื้อขายรายเดือน

**Features:**
- Hover เพื่อดูรายละเอียด
- แสดงทั้งปริมาณและจำนวนรายการ
- Gradient สีสวยงาม

**การใช้งาน:**
```typescript
import { BarChart } from './components/charts/BarChart';

const data = [
  { month: 'ม.ค.', volume: 125000, trades: 450 },
  { month: 'ก.พ.', volume: 142000, trades: 520 },
];

<BarChart data={data} title="Monthly Volume" />
```

### 4. Line Chart (กราฟเส้น)

แสดงราคา Bitcoin ย้อนหลัง 30 วัน

**Features:**
- Zoom และ Pan ได้
- แสดงค่าสูงสุด/ต่ำสุด/เฉลี่ย
- Crosshair แสดงข้อมูล

**การใช้งาน:**
```typescript
import { LineChart } from './components/charts/LineChart';

const data = [
  { time: 1699401600, value: 42000 },
  { time: 1699488000, value: 43500 },
];

<LineChart 
  data={data}
  title="Bitcoin Price"
  color="#F7931A"
/>
```

### 5. Column Chart (กราฟแท่งแนวตั้ง)

แสดงกำไร/ขาดทุนรายสัปดาห์

**Features:**
- แสดง 2 ชุดข้อมูล (กำไร/ขาดทุน)
- สีเขียว (กำไร) และสีแดง (ขาดทุน)
- Hover เพื่อดูรายละเอียดและยอดสุทธิ

**การใช้งาน:**
```typescript
import { ColumnChart } from './components/charts/ColumnChart';

const data = [
  { week: 'สัปดาห์ 1', profit: 2500, loss: -800 },
  { week: 'สัปดาห์ 2', profit: 3200, loss: -1200 },
];

<ColumnChart data={data} title="Weekly Profit/Loss" />
```

---

## 📋 Table Component

### Features

#### 1. Resizable Columns (ปรับขนาดคอลัมน์)
- เลื่อนเมาส์ไปที่ขอบขวาของ Header
- เมื่อเห็นเส้นสีฟ้า ให้คลิกค้างและลาก
- ปล่อยเมาส์เมื่อได้ขนาดที่ต้องการ

#### 2. Expandable Rows (ขยายแถว)
- คลิกที่แถวใดก็ได้เพื่อดูรายละเอียด
- จะแสดง Order ID, Exchange, Wallet, TX Hash, หมายเหตุ
- คลิกอีกครั้งเพื่อปิด

#### 3. Status & Type Badges
- **BUY** = สีเขียว
- **SELL** = สีแดง
- **สำเร็จ** = สีน้ำเงิน
- **รอดำเนินการ** = สีเหลือง
- **ยกเลิก** = สีเทา

#### 4. Summary Footer
- แสดงจำนวนรายการทั้งหมด
- รวมมูลค่าทั้งหมด
- รวมค่าธรรมเนียมทั้งหมด

**การใช้งาน:**
```typescript
import { Table } from './components/Table';
import { tradeHistoryData } from './data/mockData';

<Table 
  data={tradeHistoryData}
  title="Trade History"
/>
```

---

## 🗓️ Date Range Calculator

### Utility Function

```typescript
import { getDateRange, formatDateRange } from './utils/dateRange';
```

### รองรับ Types

| Type | คำอธิบาย | ตัวอย่าง |
|------|---------|---------|
| `lastday` | เมื่อวาน | 7 พ.ย. 2568 |
| `last7day` | 7 วันล่าสุด (รวมวันนี้) | 1-8 พ.ย. 2568 |
| `lastweek` | สัปดาห์ก่อนหน้า (จันทร์-อาทิตย์) | 28 ต.ค. - 3 พ.ย. 2568 |
| `lastmonth` | เดือนก่อนหน้า | 1-31 ต.ค. 2568 |
| `last3month` | 3 เดือนล่าสุด | 1 ก.ย. - 8 พ.ย. 2568 |
| `last6month` | 6 เดือนล่าสุด | 1 มิ.ย. - 8 พ.ย. 2568 |
| `last12month` | 12 เดือนล่าสุด | 1 ธ.ค. 2567 - 8 พ.ย. 2568 |

### ตัวอย่างการใช้งาน

```typescript
// ตัวอย่างที่ 1: คำนวณ 7 วันล่าสุด
const now = new Date().toISOString();
const range = getDateRange(now, 'last7day');

console.log(range);
// Output:
// {
//   start: "2025-11-01T00:00:00.000Z",
//   end: "2025-11-08T23:59:59.999Z"
// }

// ตัวอย่างที่ 2: Format เป็นข้อความที่อ่านง่าย
const formatted = formatDateRange(range.start, range.end);
console.log(formatted);
// Output: "1 พ.ย. 2568 - 8 พ.ย. 2568"

// ตัวอย่างที่ 3: คำนวณเดือนก่อนหน้า
const lastMonth = getDateRange(now, 'lastmonth');
console.log(lastMonth);
// Output:
// {
//   start: "2025-10-01T00:00:00.000Z",
//   end: "2025-10-31T23:59:59.999Z"
// }

// ตัวอย่างที่ 4: ใช้กับ API Request
async function fetchTradeHistory(type: string) {
  const range = getDateRange(new Date().toISOString(), type);
  
  const response = await fetch('/api/trades', {
    method: 'POST',
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end
    })
  });
  
  return response.json();
}

// เรียกใช้
const trades = await fetchTradeHistory('last7day');
```

### Error Handling

```typescript
try {
  const range = getDateRange('invalid-date', 'last7day');
} catch (error) {
  console.error(error.message); // "Invalid date format"
}

try {
  const range = getDateRange(new Date().toISOString(), 'invalid-type');
} catch (error) {
  console.error(error.message); // "Unsupported type: invalid-type"
}
```

---

## 🎨 Customization

### เปลี่ยนสี Theme

แก้ไขไฟล์ `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#YOUR_COLOR',
        600: '#YOUR_COLOR',
        // ...
      },
    },
  },
}
```

### เพิ่ม Chart ใหม่

1. สร้างไฟล์ใน `src/components/charts/YourChart.tsx`
2. Import และใช้งานใน `Dashboard.tsx`
3. เพิ่ม Layout configuration

```typescript
const [layout, setLayout] = useState<Layout[]>([
  // ... existing layouts
  { i: 'your-chart', x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
]);
```

### เพิ่มข้อมูลใน Table

แก้ไขไฟล์ `src/data/mockData.ts`:

```typescript
export const tradeHistoryData: TradeHistory[] = [
  {
    id: '9',
    date: '2024-11-09 10:30:00',
    pair: 'XRP/USDT',
    type: 'BUY',
    // ... ข้อมูลอื่นๆ
  },
  // ... existing data
];
```

---

## 🔧 Troubleshooting

### ปัญหา: Charts ไม่แสดงผล
**วิธีแก้:**
1. ตรวจสอบว่าติดตั้ง `lightweight-charts` แล้ว
2. ตรวจสอบว่าข้อมูลมี format ถูกต้อง
3. เปิด Console ดู Error

### ปัญหา: Drag & Drop ไม่ทำงาน
**วิธีแก้:**
1. ตรวจสอบว่าลากจากพื้นที่ drag handle (ด้านบนของ Panel)
2. ตรวจสอบว่า `react-grid-layout` ติดตั้งถูกต้อง

### ปัญหา: Table Columns ปรับขนาดไม่ได้
**วิธีแก้:**
1. ลองเลื่อนเมาส์ช้าๆ ที่ขอบขวาของ Header
2. ดูว่ามี Cursor เปลี่ยนเป็น `col-resize` หรือไม่

### ปัญหา: Date Range ผิดพลาด
**วิธีแก้:**
1. ตรวจสอบว่าส่ง Date เป็น ISO String format
2. ตรวจสอบว่า Type ถูกต้อง (ต้องเป็น 1 ใน 7 types)

---

## 💡 Tips & Tricks

### 1. Keyboard Shortcuts
- **Ctrl/Cmd + R** - Reload หน้า
- **F12** - เปิด DevTools
- **Ctrl/Cmd + Shift + I** - เปิด Inspector

### 2. Performance
- Charts ใช้ Canvas API จึงเร็วมาก
- Lightweight Charts รองรับข้อมูลหลายพันจุด
- Table ใช้ Virtual Scrolling (ถ้าข้อมูลเยอะ)

### 3. Mobile Support
- Dashboard ปรับตัวตามหน้าจอ
- บน Mobile แนะนำให้ใช้ Landscape Mode
- Touch Drag & Drop ทำงานได้ปกติ

### 4. Data Updates
- Charts รองรับ Real-time Updates
- เพียงแค่ส่งข้อมูลใหม่ผ่าน Props
- Component จะ Re-render อัตโนมัติ

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TradingView Lightweight Charts Docs](https://tradingview.github.io/lightweight-charts/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [react-grid-layout GitHub](https://github.com/react-grid-layout/react-grid-layout)

---

## 🎓 Best Practices

1. **Component Reusability** - สร้าง Component ที่ใช้ซ้ำได้
2. **Type Safety** - ใช้ TypeScript เต็มรูปแบบ
3. **Performance** - ใช้ useMemo, useCallback เมื่อจำเป็น
4. **Code Organization** - แยกไฟล์ตาม Feature
5. **Comments** - เขียน Comments ภาษาไทยอย่างละเอียด

---

**Happy Coding! 🚀**

