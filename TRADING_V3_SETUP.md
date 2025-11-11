# Trading V3 Setup Guide

## ปัญหาที่พบ

หากคุณเห็น error messages เหล่านี้:
- `WebSocket connection failed`
- `Could not connect to the server`
- `CORS errors`
- `Network Error`

นั่นหมายความว่า **Backend server ไม่ได้รันอยู่**

## วิธีแก้ไข

### 1. เริ่มต้น Backend Server

```bash
cd BackEnd
npm install  # ถ้ายังไม่ได้ติดตั้ง dependencies
npm start
```

หรือใช้ script ที่มีอยู่แล้ว:

```bash
# จาก root directory
./start.sh
```

### 2. ตรวจสอบว่า Backend รันอยู่

เปิด browser ไปที่: `http://localhost:1111/api/health`

ควรเห็น response:
```json
{
  "success": true,
  "message": "API กำลังทำงานปกติ"
}
```

### 3. ตรวจสอบ WebSocket

เปิด browser console และดูว่า WebSocket เชื่อมต่อสำเร็จหรือไม่

## Demo Mode

หาก Backend server ไม่ได้รัน ระบบจะทำงานใน **Demo Mode**:
- แสดงข้อมูลตัวอย่าง (Mock Data)
- UI และฟีเจอร์ทั้งหมดยังใช้งานได้
- เหมาะสำหรับดู UI และทดสอบฟีเจอร์

## ฟีเจอร์ที่ต้องการ Backend

ฟีเจอร์ต่อไปนี้ต้องการ Backend server:
- ✅ Real-time price updates (WebSocket)
- ✅ ML predictions
- ✅ Trading signals
- ✅ Historical data
- ✅ Profit predictions

## ฟีเจอร์ที่ทำงานได้ใน Demo Mode

- ✅ UI และ animations
- ✅ Charts (ใช้ mock data)
- ✅ Mock predictions
- ✅ Mock trading signals

## Troubleshooting

### Backend ไม่สามารถเริ่มต้นได้

1. ตรวจสอบว่า MongoDB รันอยู่:
```bash
# macOS
brew services list | grep mongodb

# หรือ
mongod --version
```

2. ตรวจสอบว่า Redis รันอยู่:
```bash
# macOS
brew services list | grep redis

# หรือ
redis-cli ping
# ควรได้ response: PONG
```

3. ตรวจสอบ environment variables:
```bash
cd BackEnd
cat .env
```

ต้องมี:
- `MONGODB_URI`
- `REDIS_URL` (optional)
- `JWT_SECRET`
- `PORT=1111`

### CORS Errors

Backend มี CORS config แล้ว (`origin: '*'`) แต่ถ้ายังมีปัญหา:

1. ตรวจสอบว่า Backend รันอยู่ที่ port 1111
2. ตรวจสอบว่า Frontend ใช้ URL ที่ถูกต้อง:
   - Development: `http://localhost:1111`
   - Production: ตามที่ตั้งค่าใน `.env`

### WebSocket Connection Failed

1. ตรวจสอบว่า Backend server รันอยู่
2. ตรวจสอบว่า WebSocket service เริ่มต้นแล้ว (ดูใน backend logs)
3. ตรวจสอบว่า URL ถูกต้อง: `ws://localhost:1111/ws`

## Quick Start

```bash
# Terminal 1: Start Backend
cd BackEnd
npm start

# Terminal 2: Start Frontend
cd FrontEndV2
npm run dev

# เปิด browser
# http://localhost:1113/trading/v3
```

## Environment Variables

### Backend (.env)
```env
PORT=1111
MONGODB_URI=mongodb://localhost:27017/trading
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:1111
VITE_WS_URL=ws://localhost:1111/ws
```

## Support

หากยังมีปัญหา:
1. ตรวจสอบ logs ใน BackEnd/logs/
2. ตรวจสอบ browser console
3. ตรวจสอบ network tab ใน browser DevTools

