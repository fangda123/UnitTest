# 🚀 Crypto Trading Dashboard - Frontend V2

Dashboard แบบ Professional สำหรับเทรด Cryptocurrency พร้อมฟีเจอร์ครบครัน

## ✨ ฟีเจอร์หลัก

### 📊 Chart Components (4 ประเภท + TradingView)
- **Pie Chart** - แสดงสัดส่วนการกระจายพอร์ตโฟลิโอ
- **Bar Chart** - แสดงปริมาณการเทรดรายเดือน
- **Line Chart** - แสดงประวัติยอดคงเหลือในบัญชี
- **Column Chart** - แสดงกำไร/ขาดทุนรายสัปดาห์
- **TradingView Lightweight Chart** - แสดงข้อมูล Candlestick แบบ Real-time

### 📋 Table Component
- ✅ **Resizable Columns** - ปรับขนาดคอลัมน์ได้
- ✅ **Expandable Rows** - ขยายแถวเพื่อดูรายละเอียดเพิ่มเติม
- ✅ **Sorting** - เรียงข้อมูลได้
- ✅ **Pagination** - แบ่งหน้าอัตโนมัติ

### 🎨 Dashboard Layout
- ✅ **Drag & Drop** - ย้ายตำแหน่ง Widget ได้อย่างอิสระ
- ✅ **Resize** - ปรับขนาด Widget ได้ทุกด้าน
- ✅ **Responsive** - รองรับทุกขนาดหน้าจอ
- ✅ **Layout คล้าย Binance** - ออกแบบตาม Trading Platform มืออาชีพ

### 🛠️ Utility Functions
- `getDateRange()` - คำนวณช่วงเวลา (lastday, last7day, lastweek, lastmonth, etc.)
- `formatDate()` - จัดรูปแบบวันที่
- `getDaysDifference()` - คำนวณจำนวนวันระหว่างวันที่
- `isDateInRange()` - ตรวจสอบว่าวันที่อยู่ในช่วงหรือไม่

## 🏗️ Tech Stack

- **React 19** - UI Library
- **TypeScript** - Type Safety
- **TailwindCSS** - Styling Framework
- **ApexCharts** - Charts Library
- **TradingView Lightweight Charts** - Professional Trading Charts
- **react-grid-layout** - Drag & Drop Layout System
- **Vite** - Build Tool
- **Lucide React** - Icons

## 📦 Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>

# Navigate to FrontEndV2
cd FrontEndV2

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## 🎯 การใช้งาน

### 1. Date Range Selector
เลือกช่วงเวลาที่ต้องการดูข้อมูล:
- Yesterday (เมื่อวาน)
- Last 7 Days (7 วันล่าสุด)
- Last Week (สัปดาห์ก่อนหน้า)
- Last Month (เดือนก่อนหน้า)
- Last 3/6/12 Months

### 2. Drag & Drop Layout
- คลิกที่ header ของ Widget เพื่อเลื่อนย้ายตำแหน่ง
- ลากจากมุมของ Widget เพื่อปรับขนาด
- Layout จะบันทึกอัตโนมัติ

### 3. Interactive Tables
- คลิกที่หัวคอลัมน์เพื่อเรียงข้อมูล
- ลากขอบคอลัมน์เพื่อปรับขนาด
- คลิกที่ลูกศรเพื่อดูรายละเอียดเพิ่มเติม

### 4. Charts
- Zoom ด้วยการ scroll บน TradingView Chart
- Pan ด้วยการลาก
- Download เป็นรูปภาพได้จากเมนูกราฟ

## 📁 โครงสร้างโปรเจค

\`\`\`
FrontEndV2/
├── src/
│   ├── components/
│   │   ├── Charts/
│   │   │   ├── PieChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   ├── ColumnChart.tsx
│   │   │   └── TradingViewChart.tsx
│   │   ├── Table/
│   │   │   └── DataTable.tsx
│   │   ├── Dashboard/
│   │   │   └── DashboardLayout.tsx
│   │   └── Stats/
│   │       └── StatsCard.tsx
│   ├── data/
│   │   └── mockData.ts
│   ├── utils/
│   │   └── dateUtils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
\`\`\`

## 🎨 การ Customize

### เปลี่ยนสี Theme
แก้ไขไฟล์ \`tailwind.config.js\`:

\`\`\`javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9', // เปลี่ยนสีหลัก
      },
      // ... เพิ่มสีอื่นๆ
    }
  }
}
\`\`\`

### เพิ่ม Widget ใหม่
แก้ไขไฟล์ \`App.tsx\`:

\`\`\`typescript
const widgets = [
  // ... widgets เดิม
  {
    id: 'new-widget',
    title: 'Widget ใหม่',
    component: <YourComponent />
  }
];
\`\`\`

### เชื่อมต่อ Backend API
แก้ไขไฟล์ \`mockData.ts\` เป็นการเรียก API จริง:

\`\`\`typescript
// Before (Mock)
export const transactionHistory = [...];

// After (Real API)
export const fetchTransactions = async () => {
  const response = await fetch('http://your-api.com/transactions');
  return response.json();
};
\`\`\`

## 🔧 Available Scripts

\`\`\`bash
npm run dev      # รัน development server
npm run build    # Build สำหรับ production
npm run preview  # Preview production build
npm run lint     # ตรวจสอบ code ด้วย ESLint
\`\`\`

## 📊 Mock Data

โปรเจคมาพร้อมกับ Mock Data ที่พร้อมใช้งาน:

- **Portfolio Distribution** - สัดส่วนการลงทุน 6 เหรียญ
- **Monthly Trading Volume** - ปริมาณการเทรด 6 เดือน
- **Account Balance** - ประวัติยอดคงเหลือ
- **Weekly Profit/Loss** - กำไร/ขาดทุน 6 สัปดาห์
- **Candlestick Data** - ข้อมูลแท่งเทียน 60 วัน
- **Transaction History** - ประวัติการทำรายการ 12 รายการ
- **Top Coins** - เหรียญ Top 5
- **Market Overview** - ภาพรวมตลาด

## 🎯 Date Range Utility

ฟังก์ชัน \`getDateRange()\` รองรับการคำนวณช่วงเวลาดังนี้:

| Type | Description | Example |
|------|-------------|---------|
| \`lastday\` | วันที่ผ่านมา | Yesterday 00:00 - 23:59 |
| \`last7day\` | ย้อนหลัง 7 วัน | Today - 6 days ago |
| \`lastweek\` | สัปดาห์ก่อนหน้า | Last Monday - Last Sunday |
| \`lastmonth\` | เดือนก่อนหน้า | First - Last day of last month |
| \`last3month\` | 3 เดือนล่าสุด | 3 months ago - Today |
| \`last6month\` | 6 เดือนล่าสุด | 6 months ago - Today |
| \`last12month\` | 12 เดือนล่าสุด | 12 months ago - Today |

### ตัวอย่างการใช้งาน:

\`\`\`typescript
import { getDateRange } from './utils/dateUtils';

// คำนวณช่วง 7 วันล่าสุด
const range = getDateRange(new Date(), 'last7day');
console.log(range);
// {
//   start: "2025-11-01T00:00:00.000Z",
//   end: "2025-11-08T23:59:59.999Z"
// }
\`\`\`

## 🌟 Features Highlights

### 1. Professional UI/UX
- Dark Mode Theme
- Smooth Animations
- Gradient Borders
- Glow Effects
- Custom Scrollbar

### 2. Performance
- Lazy Loading
- Memoization
- Optimized Re-renders
- Fast Chart Rendering

### 3. Responsive Design
- Mobile Friendly
- Tablet Optimized
- Desktop Enhanced
- Breakpoint System

### 4. Developer Experience
- TypeScript Support
- ESLint Configuration
- Component-based Architecture
- Clear Code Comments (ภาษาไทย)

## 📝 Notes

- ทุกคอมเม้นต์ในโค้ดเป็นภาษาไทย ตามที่ร้องขอ
- ใช้ TradingView Lightweight Charts สำหรับ real-time charting
- รองรับการ Drag & Drop และ Resize แบบ Binance
- Mock Data พร้อมใช้งาน สามารถแทนที่ด้วย API จริงได้ง่าย

## 🚀 Next Steps

1. เชื่อมต่อกับ Backend API
2. เพิ่มระบบ Authentication
3. เพิ่ม WebSocket สำหรับ Real-time Updates
4. เพิ่มฟีเจอร์ Trade Execution
5. เพิ่ม Advanced Technical Indicators

## 📄 License

MIT License

## 👨‍💻 Author

Built with ❤️ using React + TypeScript + TailwindCSS

---

**สนุกกับการเทรด! 🎉**
