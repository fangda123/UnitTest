# 🚀 Quick Start Guide

## การเริ่มต้นใช้งานอย่างรวดเร็ว

### 📋 ความต้องการของระบบ

- Node.js >= 16.x
- MongoDB >= 5.x
- Redis >= 6.x
- npm หรือ yarn

---

## ⚡️ เริ่มต้นใน 5 นาที

### 1. Clone Repository

```bash
git clone <repository-url>
cd BackEnd
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` (หรือคัดลอกจาก `.env.example`):

```bash
cp .env.example .env
```

แก้ไขค่าในไฟล์ `.env` ให้เหมาะสม

### 4. เริ่มต้น MongoDB และ Redis

**ใช้ Docker (แนะนำ):**

```bash
# MongoDB
docker run -d -p 27017:27017 --name mongodb mongo

# Redis
docker run -d -p 6379:6379 --name redis redis
```

**หรือติดตั้งบน Local Machine:**

- MongoDB: https://docs.mongodb.com/manual/installation/
- Redis: https://redis.io/docs/getting-started/

### 5. เริ่มต้น Development Server

```bash
npm run dev
```

Server จะทำงานที่: `http://localhost:3000`

---

## 🧪 ทดสอบว่าทำงานได้

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

### 2. ลองสมัครสมาชิก

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. เข้าสู่ระบบ

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

บันทึก `token` ที่ได้รับมา

### 4. ดึงข้อมูลราคา Crypto

```bash
curl http://localhost:3000/api/crypto/price/BTCUSDT
```

---

## 📚 เปิด API Documentation

เปิด browser และไปที่:

```
http://localhost:3000/api-docs
```

---

## 🔌 ทดสอบ WebSocket

สร้างไฟล์ `test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test</title>
</head>
<body>
    <h1>WebSocket Test</h1>
    <div id="messages"></div>
    
    <script>
        const ws = new WebSocket('ws://localhost:3000/ws');
        const messages = document.getElementById('messages');
        
        ws.onopen = () => {
            console.log('Connected!');
            messages.innerHTML += '<p>✅ Connected to WebSocket</p>';
            
            // ส่ง token เพื่อ authenticate
            ws.send(JSON.stringify({
                type: 'auth',
                token: 'YOUR_JWT_TOKEN_HERE'
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Message:', data);
            messages.innerHTML += `<p>📨 ${data.type}: ${data.message}</p>`;
        };
        
        ws.onerror = (error) => {
            console.error('Error:', error);
            messages.innerHTML += '<p>❌ WebSocket Error</p>';
        };
        
        ws.onclose = () => {
            console.log('Disconnected');
            messages.innerHTML += '<p>🔌 Disconnected</p>';
        };
    </script>
</body>
</html>
```

---

## 🧪 รัน Unit Tests

```bash
npm test
```

---

## 📮 ใช้งาน Postman Collection

1. เปิด Postman
2. Import file: `postman/Backend-API.postman_collection.json`
3. ตั้งค่า environment variable `base_url` เป็น `http://localhost:3000`
4. เริ่มทดสอบ APIs

---

## 🎯 Endpoints สำคัญ

### Public Endpoints

- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/crypto/price/:symbol` - ดึงราคา crypto
- `GET /api/crypto/prices` - ดึงราคาทั้งหมด
- `GET /api/health` - ตรวจสอบสถานะ server

### Private Endpoints (ต้องมี JWT Token)

- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `GET /api/users` - ดึงข้อมูลผู้ใช้ทั้งหมด (Admin)
- `GET /api/dashboard` - ข้อมูล dashboard
- `PUT /api/users/:id` - อัพเดทข้อมูลผู้ใช้

### Internal API (ต้องมี API Key)

- `GET /api/internal/crypto/price/:symbol` - ดึงราคา crypto (Internal)

**วิธีใช้ API Key:**

```bash
curl http://localhost:3000/api/internal/crypto/price/BTCUSDT \
  -H "x-api-key: your-internal-api-key"
```

---

## 🔐 JWT Token Usage

### วิธีใช้ Token

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### ใน JavaScript

```javascript
fetch('http://localhost:3000/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📊 ตรวจสอบข้อมูลใน Database

### MongoDB

```bash
# เข้า MongoDB shell
mongosh

# เลือก database
use backend_test

# ดูข้อมูล users
db.users.find().pretty()

# ดูข้อมูลราคา crypto
db.cryptoprices.find().limit(10).sort({ createdAt: -1 }).pretty()
```

### Redis

```bash
# เข้า Redis CLI
redis-cli

# ดู keys ทั้งหมด
KEYS *

# ดูข้อมูล cache
GET crypto:price:BTCUSDT
```

---

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย

**1. MongoDB Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**แก้ไข:**
- ตรวจสอบว่า MongoDB กำลังทำงาน: `docker ps` หรือ `systemctl status mongod`
- เริ่ม MongoDB: `docker start mongodb` หรือ `sudo systemctl start mongod`

**2. Redis Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**แก้ไข:**
- ตรวจสอบว่า Redis กำลังทำงาน: `docker ps` หรือ `systemctl status redis`
- เริ่ม Redis: `docker start redis` หรือ `sudo systemctl start redis`
- **หมายเหตุ:** API จะยังทำงานได้แม้ Redis ไม่ทำงาน (แต่จะไม่มี cache)

**3. Port Already in Use**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**แก้ไข:**
```bash
# ค้นหา process ที่ใช้ port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# หรือเปลี่ยน port ในไฟล์ .env
PORT=3001
```

**4. JWT Token Expired**

```
{ "success": false, "message": "Token หมดอายุ" }
```

**แก้ไข:**
- Login ใหม่เพื่อรับ token ใหม่

---

## 📚 เอกสารเพิ่มเติม

- **README.md** - รายละเอียดโปรเจกต์ทั้งหมด
- **ARCHITECTURE.md** - การออกแบบสถาปัตยกรรม
- **DEPLOYMENT.md** - คู่มือการ deploy
- **API Documentation** - http://localhost:3000/api-docs

---

## 💡 Tips & Tricks

### 1. ใช้ nodemon สำหรับ Development

```bash
npm run dev
```

nodemon จะ restart server อัตโนมัติเมื่อมีการแก้ไขไฟล์

### 2. ดู Logs แบบ Real-time

```bash
tail -f logs/combined.log
```

### 3. สร้าง Admin User

```javascript
// ใช้ MongoDB shell
use backend_test
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "admin" } }
)
```

### 4. Clear Redis Cache

```bash
redis-cli FLUSHALL
```

---

## 🎉 ยินดีด้วย!

คุณพร้อมใช้งาน Backend API แล้ว!

**Next Steps:**
1. ลองเรียก API ด้วย Postman
2. ทดสอบ WebSocket connection
3. ดูเอกสาร Swagger
4. อ่าน ARCHITECTURE.md เพื่อเข้าใจการออกแบบ

---

**Need Help?**
- ดูเอกสารใน `README.md`
- ตรวจสอบ logs ใน `logs/`
- ดู API Documentation ที่ `/api-docs`

**Happy Coding! 🚀**

