# 📮 Postman Collection - คู่มือการใช้งาน

## 📋 ไฟล์ในโฟลเดอร์นี้

1. **Backend-API.postman_collection.json** - API Collection ครบถ้วน
2. **Backend-API-Local.postman_environment.json** - Environment สำหรับ Local Development
3. **Backend-API-Production.postman_environment.json** - Environment สำหรับ Production Server
4. **README.md** - คู่มือนี้

---

## 🚀 การติดตั้งและใช้งาน

### ขั้นตอนที่ 1: Import Collection

1. เปิด Postman
2. คลิก **Import** (มุมซ้ายบน)
3. เลือกไฟล์ `Backend-API.postman_collection.json`
4. คลิก **Import**

### ขั้นตอนที่ 2: Import Environment

1. คลิก **Import** อีกครั้ง
2. เลือกไฟล์ environment ที่ต้องการ:
   - `Backend-API-Local.postman_environment.json` (สำหรับ Local)
   - `Backend-API-Production.postman_environment.json` (สำหรับ Production)
3. คลิก **Import**

### ขั้นตอนที่ 3: เลือก Environment

1. คลิกเลือก Environment ที่มุมขวาบน
2. เลือก **"Backend API - Local"** หรือ **"Backend API - Production"**

---

## 📂 โครงสร้าง Collection

### 1. 🏠 Welcome & Health
- **Welcome - Homepage** - หน้าแรกของ API
- **Health Check** - ตรวจสอบสถานะ server

### 2. 🔐 Authentication
- **Register - สมัครสมาชิก** (Auto-save token)
- **Login - เข้าสู่ระบบ** (Auto-save token)
- **Register Admin - สร้าง Admin**
- **Get Me - ข้อมูลผู้ใช้ปัจจุบัน**
- **Change Password - เปลี่ยนรหัสผ่าน**

### 3. 👥 User Management
- **Get All Users - ดึงข้อมูลทั้งหมด** (Admin)
- **Get User by ID - ดึงข้อมูลรายคน**
- **Update User - อัพเดทข้อมูล**
- **Delete User - ลบผู้ใช้** (Admin)
- **Toggle User Status - ระงับ/เปิดใช้** (Admin)
- **Search Users - ค้นหาผู้ใช้**
- **Filter Users by Role - กรองตาม Role**

### 4. 💹 Crypto Price (Binance)
- **Get All Crypto Prices - ราคาทั้งหมด**
- **Get BTC Price - ราคา Bitcoin**
- **Get ETH Price - ราคา Ethereum**
- **Get Price History - ประวัติราคา**
- **Get Stats 24h - สถิติ 24 ชั่วโมง**
- **Get Stats 7 Days - สถิติ 7 วัน**

### 5. 📊 Dashboard (Frontend)
- **User Dashboard - ข้อมูลผู้ใช้ + Crypto**
- **Admin Dashboard - สถิติทั้งหมด** (Admin)

### 6. 🔒 Internal API (API Key)
- **Internal - Get Crypto Price**
- **Internal - Without API Key (Error)**
- **Internal - Invalid API Key (Error)**

### 7. 🧪 Test Cases (Error Scenarios)
- **❌ Register - Email ซ้ำ**
- **❌ Login - รหัสผ่านผิด**
- **❌ Get User - ไม่มี Token**
- **❌ Get User - Token ไม่ถูกต้อง**
- **❌ Register - ข้อมูลไม่ครบ**
- **❌ Crypto - Symbol ไม่ถูกต้อง**

### 8. 📈 Advanced Examples
- **Register + Auto Login**
- **Workflow: Register → Login → Get Me**
- **Pagination Example - หน้า 2**
- **Search + Filter Combined**

### 9. 📚 API Documentation
- **Swagger UI - API Docs**

---

## 🎯 การใช้งานแนะนำ (Workflow)

### สำหรับ User ทั่วไป:

```
1. 🔐 Authentication
   ├─ Register - สมัครสมาชิก
   │  (Token จะถูก save อัตโนมัติ)
   │
   ├─ Get Me - ตรวจสอบข้อมูลตัวเอง
   │
   ├─ Update User - แก้ไขข้อมูล
   │
   └─ Change Password - เปลี่ยนรหัสผ่าน

2. 💹 Crypto Price
   ├─ Get BTC Price - ดูราคา Bitcoin
   ├─ Get Stats 24h - ดูสถิติ
   └─ Get Price History - ดูประวัติ

3. 📊 Dashboard
   └─ User Dashboard - ดูข้อมูลรวม
```

### สำหรับ Admin:

```
1. 🔐 Authentication
   ├─ Register Admin - สร้าง admin account
   └─ Login - เข้าสู่ระบบ

2. 👥 User Management
   ├─ Get All Users - ดูผู้ใช้ทั้งหมด
   ├─ Search Users - ค้นหาผู้ใช้
   ├─ Toggle User Status - ระงับ/เปิดใช้บัญชี
   └─ Delete User - ลบผู้ใช้

3. 📊 Dashboard
   └─ Admin Dashboard - ดูสถิติทั้งหมด
```

---

## 🔑 Environment Variables

| Variable | คำอธิบาย | ตัวอย่างค่า |
|----------|----------|-------------|
| `base_url` | URL ของ API Server | `http://localhost:3000` |
| `auth_token` | JWT Token (auto-saved) | `eyJhbGciOiJIUzI1NiIs...` |
| `user_id` | User ID (auto-saved) | `690f16ab3e71c765e7f5461a` |
| `admin_token` | Admin JWT Token | `eyJhbGciOiJIUzI1NiIs...` |
| `admin_id` | Admin User ID | `690f16ab3e71c765e7f5461b` |
| `internal_api_key` | API Key สำหรับ Internal APIs | `backend-test-internal-api-key-2024-secure` |

---

## 🎨 Features พิเศษ

### 1. Auto-Save Token
หลังจาก Register หรือ Login สำเร็จ token จะถูก save อัตโนมัติ:

```javascript
// Test Script ใน Register/Login
if (pm.response.code === 200 || pm.response.code === 201) {
    const response = pm.response.json();
    pm.collectionVariables.set('auth_token', response.data.token);
    pm.collectionVariables.set('user_id', response.data.user._id);
}
```

### 2. Auto Tests
ทุก request มี test scripts:
- ตรวจสอบ response time
- ตรวจสอบ JSON format
- ตรวจสอบ success status

### 3. Pre-request Scripts
Log request information อัตโนมัติ

### 4. Dynamic Variables
ใช้ Postman variables สำหรับสร้างข้อมูลสุ่ม:
- `{{$randomInt}}` - เลขสุ่ม
- `{{$timestamp}}` - Unix timestamp
- `{{$randomEmail}}` - Email สุ่ม
- `{{$randomFirstName}}` - ชื่อสุ่ม

---

## 📝 ตัวอย่างการใช้งาน

### 1. ทดสอบ Authentication Flow

```
Step 1: Register (Auto-save token)
Step 2: Get Me (ใช้ token ที่ save ไว้)
Step 3: Update User
Step 4: Change Password
```

### 2. ทดสอบ Crypto APIs

```
Step 1: Get All Crypto Prices
Step 2: Get BTC Price
Step 3: Get Price History
Step 4: Get Stats 24h
```

### 3. ทดสอบ Admin Features

```
Step 1: Register Admin
Step 2: Login as Admin (Save admin_token)
Step 3: Get All Users
Step 4: Toggle User Status
Step 5: Admin Dashboard
```

---

## 🧪 การทดสอบ Error Cases

Collection มี folder **"Test Cases (Error Scenarios)"** สำหรับทดสอบ:

1. ✅ Email ซ้ำ (400)
2. ✅ รหัสผ่านผิด (401)
3. ✅ ไม่มี Token (401)
4. ✅ Token ไม่ถูกต้อง (401)
5. ✅ ข้อมูลไม่ครบ (400)
6. ✅ Symbol ไม่ถูกต้อง (404)

---

## 💡 Tips & Tricks

### 1. ใช้ Collection Runner
- เลือก folder ที่ต้องการ
- คลิก **Run** 
- ทดสอบหลาย requests พร้อมกัน

### 2. Generate Code Snippets
- เลือก request ที่ต้องการ
- คลิก **Code** (มุมขวา)
- เลือกภาษา (cURL, JavaScript, Python, etc.)

### 3. Monitor Collection
- เลือก Collection
- คลิก **...** → **Monitor Collection**
- ตั้งค่า schedule สำหรับ auto-test

---

## 📊 สรุป Collection

| Category | จำนวน Requests | คำอธิบาย |
|----------|----------------|----------|
| Welcome & Health | 2 | Homepage, Health check |
| Authentication | 5 | Register, Login, Get Me, Change Password, Admin Register |
| User Management | 7 | CRUD, Search, Filter, Toggle Status |
| Crypto Price | 6 | Prices, History, Stats (BTC, ETH) |
| Dashboard | 2 | User Dashboard, Admin Dashboard |
| Internal API | 3 | API Key authentication tests |
| Test Cases | 6 | Error scenarios |
| Advanced Examples | 4 | Workflows, Pagination |
| Documentation | 1 | Swagger link |
| **รวม** | **36** | **ครอบคลุมทั้งหมด** |

---

## 🎯 การทดสอบที่แนะนำ

### Test Sequence 1: Basic Flow
1. Health Check ✅
2. Register ✅
3. Login ✅
4. Get Me ✅
5. Get Crypto Price ✅

### Test Sequence 2: CRUD Operations
1. Register (User A) ✅
2. Register (User B) ✅
3. Login as Admin ✅
4. Get All Users ✅
5. Update User A ✅
6. Delete User B ✅

### Test Sequence 3: Complete Dashboard
1. Login ✅
2. User Dashboard ✅
3. Get Crypto Prices ✅
4. Get Crypto Stats ✅
5. Admin Dashboard (if admin) ✅

---

## 🔧 Troubleshooting

### ปัญหา: Token หมดอายุ

**วิธีแก้:**
```
1. ไปที่ folder "Authentication"
2. รัน "Login" อีกครั้ง
3. Token จะถูก refresh อัตโนมัติ
```

### ปัญหา: 401 Unauthorized

**เหตุผล:**
- Token หมดอายุ
- ไม่มี token
- Token ไม่ถูกต้อง

**วิธีแก้:**
```
Login ใหม่เพื่อรับ token ใหม่
```

### ปัญหา: 403 Forbidden

**เหตุผล:**
- ไม่มีสิทธิ์เข้าถึง (ต้องการ Admin)

**วิธีแก้:**
```
Login ด้วย Admin account
```

### ปัญหา: 429 Too Many Requests

**เหตุผล:**
- ส่ง request มากเกินไป (Rate limiting)

**วิธีแก้:**
```
รอสักครู่แล้วลองใหม่
หรือ restart server (rate limit จะ reset)
```

---

## 📚 Documentation Links

- **Swagger UI:** http://localhost:3000/api-docs
- **README:** ../README.md
- **QUICKSTART:** ../QUICKSTART.md
- **API Documentation:** ../ARCHITECTURE.md

---

## ✅ Checklist การทดสอบ

### Basic Tests
- [ ] Health check ทำงานได้
- [ ] Register สมัครสมาชิกสำเร็จ
- [ ] Login เข้าสู่ระบบสำเร็จ
- [ ] Token ถูก save อัตโนมัติ
- [ ] Get Me ดึงข้อมูลได้

### CRUD Tests
- [ ] Get All Users (Admin)
- [ ] Get User by ID
- [ ] Update User
- [ ] Delete User (Admin)
- [ ] Toggle Status (Admin)

### Crypto Tests
- [ ] Get All Prices
- [ ] Get BTC Price
- [ ] Get Price History
- [ ] Get Stats 24h

### Dashboard Tests
- [ ] User Dashboard
- [ ] Admin Dashboard (Admin)

### Internal API Tests
- [ ] Internal API with valid key
- [ ] Internal API without key (401)
- [ ] Internal API with invalid key (403)

### Error Tests
- [ ] Register with duplicate email (400)
- [ ] Login with wrong password (401)
- [ ] Access without token (401)
- [ ] Invalid token (401)
- [ ] Incomplete data (400)
- [ ] Invalid symbol (404)

---

## 🎊 คำแนะนำเพิ่มเติม

### 1. ใช้ Collection Variables
Collection variables จะถูก share ระหว่างทุก requests:
- `{{auth_token}}` - JWT token
- `{{user_id}}` - User ID
- `{{base_url}}` - API base URL

### 2. ทดสอบแบบ Sequence
เปิดใช้ Collection Runner และรัน folder ทั้งหมด

### 3. Export Results
หลังจากทดสอบเสร็จ export ผลลัพธ์ได้

### 4. Share Collection
Export collection แล้ว share กับทีม

---

## 📞 Support

**Email:** nanobotsup@gmail.com

---

**สร้างเมื่อ:** 8 พฤศจิกายน 2025  
**Version:** 1.0.0  
**Total Requests:** 36 endpoints

**ครอบคลุม 100% ของ API ทั้งหมด! ✅**

