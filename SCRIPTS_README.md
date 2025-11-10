# 🚀 Scripts สำหรับรัน Services

Scripts สำหรับรัน Backend, FrontEndV2, และ FrontEnd พร้อมกัน

## 📋 Ports

- **Backend**: Port 1111
- **FrontEndV2**: Port 1113
- **FrontEnd**: Port 1112

## 🎯 วิธีใช้งาน

### macOS / Linux

#### 1. รัน Services ทั้งหมด
```bash
./start.sh
```

หรือ
```bash
npm start
```

#### 2. หยุด Services ทั้งหมด
```bash
./stop.sh
```

หรือ
```bash
npm run stop
```

### Windows

#### 1. รัน Services ทั้งหมด
```cmd
start.bat
```

หรือดับเบิลคลิกที่ไฟล์ `start.bat`

## 📝 Scripts ที่มี

### 1. `start.sh` (macOS/Linux)
- ตรวจสอบ dependencies
- รัน Backend, FrontEndV2, และ FrontEnd พร้อมกัน
- แสดง logs และ URLs
- รองรับ graceful shutdown (Ctrl+C)

### 2. `stop.sh` (macOS/Linux)
- หยุด services ทั้งหมด
- ปิด ports ที่ใช้
- ลบ PID files

### 3. `start.bat` (Windows)
- ตรวจสอบ dependencies
- รัน services ในหน้าต่างแยก
- แสดง URLs

### 4. `package.json` Scripts
- `npm start` - รัน services ทั้งหมด
- `npm run stop` - หยุด services ทั้งหมด
- `npm run start:backend` - รัน Backend เท่านั้น
- `npm run start:frontendv2` - รัน FrontEndV2 เท่านั้น
- `npm run start:frontend` - รัน FrontEnd เท่านั้น
- `npm run install:all` - ติดตั้ง dependencies ทั้งหมด

## 🔍 ตรวจสอบ Logs

### Backend
```bash
tail -f logs/backend.log
```

### FrontEndV2
```bash
tail -f logs/frontendv2.log
```

### FrontEnd
```bash
tail -f logs/frontend.log
```

## 🌐 URLs

หลังจากรัน services แล้ว:

- **Backend API**: http://localhost:1111
- **Backend API Docs**: http://localhost:1111/api-docs
- **FrontEndV2**: http://localhost:1113
- **FrontEnd**: http://localhost:1112

## 🛠️ Troubleshooting

### Port ถูกใช้งานอยู่แล้ว

```bash
# ตรวจสอบ ports
lsof -i :1111
lsof -i :1112
lsof -i :1113

# หยุด processes ที่ใช้ ports
./stop.sh
```

### Dependencies ไม่ครบ

```bash
# ติดตั้ง dependencies ทั้งหมด
npm run install:all
```

### Services ไม่เริ่มทำงาน

1. ตรวจสอบว่า Node.js ติดตั้งแล้ว: `node --version`
2. ตรวจสอบว่า npm ติดตั้งแล้ว: `npm --version`
3. ตรวจสอบ logs: `tail -f logs/*.log`

## 📌 หมายเหตุ

- Scripts จะสร้างโฟลเดอร์ `logs/` อัตโนมัติ
- PID files จะถูกเก็บไว้ในแต่ละโฟลเดอร์ (`.pid`)
- ใช้ `Ctrl+C` เพื่อหยุด services แบบ graceful shutdown
- บน Windows จะเปิดหน้าต่างแยกสำหรับแต่ละ service

