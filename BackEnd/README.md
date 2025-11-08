# 🚀 Backend Developer Skill Test API

## 📋 คำอธิบายโปรเจกต์

โปรเจกต์นี้เป็น RESTful API ที่สร้างด้วย Node.js + Express.js สำหรับการทดสอบทักษะผู้พัฒนา Backend โดยมีฟีเจอร์ครบถ้วนตามที่กำหนด

### ✨ ฟีเจอร์หลัก

- ✅ **User Management API** - ระบบจัดการผู้ใช้แบบ CRUD พร้อม JWT Authentication
- ✅ **WebSocket Real-time** - การแจ้งเตือนแบบ real-time เมื่อมีการสร้าง/แก้ไขข้อมูลผู้ใช้
- ✅ **Binance Integration** - ดึงข้อมูลราคาสกุลเงินดิจิทัลจาก Binance API และ WebSocket
- ✅ **Redis Caching** - แคชข้อมูลด้วย Redis พร้อม TTL เพื่อเพิ่มประสิทธิภาพ
- ✅ **Dashboard API** - Endpoint สำหรับ Frontend ที่รวมข้อมูลผู้ใช้และราคา crypto
- ✅ **Internal API** - API ภายในที่มีการ authenticate ด้วย API Key
- ✅ **API Documentation** - Swagger/OpenAPI documentation
- ✅ **Unit Tests** - ครอบคลุมการทดสอบหลักๆ

## 🛠 เทคโนโลยีที่ใช้

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **WebSocket**: ws library
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## 📁 โครงสร้างโปรเจกต์

```
BackEnd/
├── src/
│   ├── config/           # การตั้งค่า database, redis
│   ├── controllers/      # Business logic ของแต่ละ endpoint
│   ├── middleware/       # Authentication, validation, error handling
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── services/         # External services (Binance, WebSocket)
│   ├── utils/            # Utility functions (logger)
│   ├── app.js            # Express app configuration
│   └── server.js         # Entry point
├── __tests__/            # Unit tests
├── logs/                 # Log files
├── .env.example          # ตัวอย่างตัวแปร environment
├── package.json
└── README.md
```

## 🚀 การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จากไฟล์ `.env.example`:

```bash
cp .env.example .env
```

แก้ไขค่าต่างๆ ในไฟล์ `.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/backend_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=60

# Binance API Configuration
BINANCE_API_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
CRYPTO_SYMBOL=BTCUSDT
UPDATE_INTERVAL=60000

# Internal API Authentication
INTERNAL_API_KEY=your-internal-api-key-change-this
```

### 3. เริ่มต้น MongoDB และ Redis

```bash
# MongoDB (ถ้าใช้ Docker)
docker run -d -p 27017:27017 --name mongodb mongo

# Redis (ถ้าใช้ Docker)
docker run -d -p 6379:6379 --name redis redis
```

### 4. เริ่มใช้งาน Server

**Development mode (พร้อม auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server จะทำงานที่ `http://localhost:3000`

## 📚 API Documentation

เมื่อเริ่ม server แล้ว สามารถเข้าถึง API Documentation ได้ที่:

- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health

## 🔐 API Endpoints

### Authentication (Public)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/register` | สมัครสมาชิก |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| GET | `/api/auth/me` | ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้อง auth) |
| PUT | `/api/auth/change-password` | เปลี่ยนรหัสผ่าน (ต้อง auth) |

### User Management (Private)

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|--------|----------|----------|--------|
| GET | `/api/users` | ดึงข้อมูลผู้ใช้ทั้งหมด | Admin |
| GET | `/api/users/:id` | ดึงข้อมูลผู้ใช้รายคน | User |
| PUT | `/api/users/:id` | อัพเดทข้อมูลผู้ใช้ | User/Admin |
| DELETE | `/api/users/:id` | ลบผู้ใช้ | Admin |
| PATCH | `/api/users/:id/toggle-status` | ระงับ/เปิดใช้บัญชี | Admin |

### Crypto Price (Public)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/crypto/prices` | ดึงราคา crypto ทั้งหมด |
| GET | `/api/crypto/price/:symbol` | ดึงราคาตาม symbol |
| GET | `/api/crypto/history/:symbol` | ดึงประวัติราคา |
| GET | `/api/crypto/stats/:symbol` | ดึงสถิติราคา |

### Dashboard (Private)

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|--------|----------|----------|--------|
| GET | `/api/dashboard` | ข้อมูล dashboard (user + crypto) | User |
| GET | `/api/dashboard/admin` | ข้อมูลสรุปสำหรับ admin | Admin |

### Internal API (API Key Required)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/internal/crypto/price/:symbol` | ดึงราคา crypto (ต้องมี API Key) |

## 🔌 WebSocket

### การเชื่อมต่อ

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

// รอการเชื่อมต่อสำเร็จ
ws.onopen = () => {
  console.log('เชื่อมต่อสำเร็จ');
  
  // ส่ง token เพื่อ authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};

// รับข้อความ
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message:', data);
};
```

### Event Types

- `connected` - เชื่อมต่อสำเร็จ
- `authenticated` - ยืนยันตัวตนสำเร็จ
- `user.created` - มีผู้ใช้ใหม่
- `user.updated` - ข้อมูลผู้ใช้ถูกอัพเดท
- `user.deleted` - ผู้ใช้ถูกลบ
- `crypto.price.update` - ราคา crypto อัพเดท

## 🧪 การทดสอบ (Testing)

### รัน Unit Tests

```bash
npm test
```

### รัน Tests พร้อม Coverage

```bash
npm test -- --coverage
```

### รัน Tests แบบ Watch Mode

```bash
npm run test:watch
```

## 📮 Postman Collection

Import Postman Collection จากไฟล์ `postman/Backend-API.postman_collection.json`

## 🔒 Security Features

- **JWT Authentication** - การยืนยันตัวตนด้วย JWT tokens
- **Password Hashing** - รหัสผ่านถูก hash ด้วย bcrypt
- **Rate Limiting** - จำกัดจำนวน requests เพื่อป้องกัน abuse
- **Helmet** - ตั้งค่า HTTP headers เพื่อความปลอดภัย
- **CORS** - ควบคุมการเข้าถึงจากต่าง origin
- **Input Validation** - ตรวจสอบข้อมูลด้วย Joi
- **API Key Protection** - ป้องกัน Internal API ด้วย API Key

## 🏗 Architecture Design

### Monolithic vs Microservices

โปรเจกต์นี้ใช้สถาปัตยกรรมแบบ **Monolithic** โดยมีเหตุผลดังนี้:

#### ข้อดีของ Monolithic (ที่เลือกใช้)
- ✅ พัฒนาและ deploy ง่ายกว่า
- ✅ เหมาะกับโปรเจกต์ขนาดเล็ก-กลาง
- ✅ ลดความซับซ้อนในการจัดการ infrastructure
- ✅ Transaction ทำงานได้ง่ายกว่า (single database)
- ✅ ทดสอบและ debug ง่ายกว่า

#### ข้อเสียของ Monolithic
- ❌ Scale ยากเมื่อโปรเจกต์ใหญ่ขึ้น
- ❌ ทีมหลายคนทำงานพร้อมกันได้ยากกว่า
- ❌ Deploy ทั้ง app แม้แก้แค่ส่วนเดียว

#### ข้อดีของ Microservices
- ✅ Scale แต่ละ service แยกอิสระ
- ✅ ทีมหลายคนทำงานพร้อมกันได้ง่าย
- ✅ เลือกเทคโนโลยีต่างกันในแต่ละ service ได้
- ✅ Fault isolation ดีกว่า

#### ข้อเสียของ Microservices
- ❌ ซับซ้อนในการจัดการ infrastructure
- ❌ ต้องใช้ message queue, service discovery
- ❌ Debugging และ monitoring ยากกว่า
- ❌ Network latency สูงกว่า

### Database Schema Design

```
┌─────────────┐         ┌──────────────┐        ┌─────────────┐
│    User     │         │ CryptoPrice  │        │    Trade    │
├─────────────┤         ├──────────────┤        ├─────────────┤
│ _id         │         │ _id          │        │ _id         │
│ username    │         │ symbol       │        │ userId ──────┼──> User
│ email       │         │ price        │        │ symbol      │
│ password    │         │ highPrice24h │        │ type        │
│ firstName   │         │ lowPrice24h  │        │ price       │
│ lastName    │         │ volume24h    │        │ amount      │
│ role        │         │ lastUpdate   │        │ total       │
│ isActive    │         │ source       │        │ status      │
│ profile     │         └──────────────┘        └─────────────┘
│ createdAt   │
│ updatedAt   │
└─────────────┘
```

## 🌐 Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# สร้าง app
heroku create your-app-name

# เพิ่ม MongoDB addon
heroku addons:create mongolab:sandbox

# เพิ่ม Redis addon
heroku addons:create heroku-redis:hobby-dev

# ตั้งค่า environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set INTERNAL_API_KEY=your-api-key

# Deploy
git push heroku main
```

### AWS / Vercel / Railway

ดู documentation เฉพาะของแต่ละ platform

## 📊 Performance Optimization

- **Redis Caching**: แคชข้อมูลราคา crypto เพื่อลดการเรียก API
- **Database Indexing**: สร้าง index สำหรับ field ที่ query บ่อย
- **Connection Pooling**: ใช้ connection pool สำหรับ MongoDB
- **Rate Limiting**: จำกัดจำนวน requests
- **Compression**: บีบอัด response (สามารถเพิ่ม middleware)

## 🐛 Known Issues & Future Improvements

### ปัญหาที่ทราบ
- WebSocket ไม่มี reconnect อัตโนมัติฝั่ง client
- ไม่มี pagination สำหรับ crypto history

### การพัฒนาต่อ
- [ ] เพิ่ม OAuth2 authentication (Google, Facebook)
- [ ] เพิ่ม email verification
- [ ] เพิ่ม 2FA (Two-Factor Authentication)
- [ ] เพิ่ม file upload สำหรับ avatar
- [ ] เพิ่ม notification system
- [ ] เพิ่ม GraphQL API
- [ ] เพิ่ม Docker compose สำหรับ development

## 📝 License

MIT License

## 👤 ผู้พัฒนา

สร้างโดย Backend Developer Candidate

**ติดต่อ**: nanobotsup@gmail.com

---

## 🎯 สรุป Features ที่ทำครบ

| งานที่ | คำอธิบาย | สถานะ |
|--------|----------|-------|
| 1 | RESTful API สำหรับ User Management (CRUD) + JWT | ✅ |
| 2 | WebSocket สำหรับ real-time notifications | ✅ |
| 3 | ใช้ Node.js + Express.js | ✅ |
| 4 | ดึงข้อมูลจาก Binance API + WebSocket | ✅ |
| 5 | Endpoint สำหรับ Frontend | ✅ |
| 6 | Redis Caching พร้อม TTL | ✅ |
| 7 | ออกแบบ Database Schema | ✅ |
| 8 | Internal API พร้อม API Key Auth | ✅ |
| 9 | API Documentation (Swagger) | ✅ |
| 10 | Unit Tests | ✅ |
| 11 | Postman Collection | ✅ |

---

**🚀 ขอบคุณที่ให้โอกาส!**

