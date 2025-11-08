# 🧪 คู่มือการทดสอบ Postman - Permission Testing

## 📋 Overview

Collection นี้ออกแบบมาเพื่อทดสอบระบบ **Role-Based Access Control (RBAC)** โดยเฉพาะ

จะแสดงให้เห็นว่า:
- 👤 **User ธรรมดา** - มีสิทธิ์จำกัด
- 👑 **Admin** - มีสิทธิ์เต็ม
- 🎫 **Token แต่ละแบบใช้งานต่างกัน**

---

## 🎯 เป้าหมายการทดสอบ

### 1. แสดงความแตกต่างของ Tokens

| Action | User Token 👤 | Admin Token 👑 |
|--------|--------------|----------------|
| ดูข้อมูลตัวเอง | ✅ 200 | ✅ 200 |
| แก้ไขข้อมูลตัวเอง | ✅ 200 | ✅ 200 |
| ดู Dashboard ตัวเอง | ✅ 200 | ✅ 200 |
| ดู Crypto Prices | ✅ 200 | ✅ 200 |
| ดู Users ทั้งหมด | ❌ 403 | ✅ 200 |
| แก้ไขข้อมูลคนอื่น | ❌ 403 | ✅ 200 |
| ลบ Users | ❌ 403 | ✅ 200 |
| Toggle User Status | ❌ 403 | ✅ 200 |
| ดู Admin Dashboard | ❌ 403 | ✅ 200 |

### 2. พิสูจน์ Security

- ✅ User token ไม่สามารถเข้าถึง admin endpoints
- ✅ Admin token เข้าถึงได้ทุกอย่าง
- ✅ Token ที่ไม่ถูกต้องจะถูก reject
- ✅ ไม่มี token จะได้ 401
- ✅ API Key system ทำงานแยกจาก JWT

---

## 🚀 วิธีใช้งาน (Step by Step)

### ขั้นตอนที่ 1: Setup Users

#### 1.1 สร้าง User ธรรมดา
```
Folder: "🔧 Setup - สร้าง Users"
Request: "1️⃣ สร้าง User ธรรมดา"

คลิก Send → จะได้ user_token และ user_id
```

#### 1.2 สร้าง Admin User
```
Request: "2️⃣ สร้าง Admin User"

คลิก Send → จะได้ admin_id
```

#### 1.3 เปลี่ยน Role เป็น Admin ⚠️

**วิธีที่ 1: ใช้ MongoDB Shell**
```bash
mongosh
use backend_test
db.users.updateOne(
  { email: 'admin@example.com' },
  { $set: { role: 'admin' } }
)
```

**วิธีที่ 2: ใช้ MongoDB Compass**
1. เชื่อมต่อ: `mongodb://172.105.118.30:27017`
2. Database: `backend_test`
3. Collection: `users`
4. หา user ที่ `email = admin@example.com`
5. แก้ไข field `role` จาก `'user'` เป็น `'admin'`
6. Save

**วิธีที่ 3: ใช้ mongosh command เดียว**
```bash
mongosh "mongodb://172.105.118.30:27017/backend_test" --eval "db.users.updateOne({email:'admin@example.com'},{\\$set:{role:'admin'}})"
```

### ขั้นตอนที่ 2: Login

#### 2.1 Login as User ธรรมดา
```
Folder: "🔐 Login - เข้าสู่ระบบ"
Request: "Login as User ธรรมดา 👤"

Email: user@example.com
Password: User123!

คลิก Send → จะได้ user_token (auto-saved)
```

#### 2.2 Login as Admin
```
Request: "Login as Admin 👑"

Email: admin@example.com
Password: Admin123!

คลิก Send → จะได้ admin_token (auto-saved)

⚠️ ถ้าได้ 403 แสดงว่ายังไม่ได้เปลี่ยน role เป็น admin
```

### ขั้นตอนที่ 3: ทดสอบ Permissions

#### 3.1 ทดสอบ User Token
```
Folder: "👤 User Endpoints (ใช้ user_token)"

ลองทุก request:
✅ Get Me → 200 (สำเร็จ)
✅ Update Own Profile → 200 (สำเร็จ)
✅ View User Dashboard → 200 (สำเร็จ)
❌ Get All Users → 403 (ไม่มีสิทธิ์)
❌ Delete User → 403 (ไม่มีสิทธิ์)
❌ Admin Dashboard → 403 (ไม่มีสิทธิ์)
```

#### 3.2 ทดสอบ Admin Token
```
Folder: "👑 Admin Endpoints (ใช้ admin_token)"

ลองทุก request:
✅ Get All Users → 200 (สำเร็จ)
✅ Update Other User → 200 (สำเร็จ)
✅ Toggle User Status → 200 (สำเร็จ)
✅ Admin Dashboard → 200 (สำเร็จ)
✅ Delete User → 200 (สำเร็จ)
```

### ขั้นตอนที่ 4: ทดสอบ Permission Tests

```
Folder: "🧪 Permission Tests - ทดสอบสิทธิ์"

รัน Collection Runner:
1. เลือก folder "Permission Tests"
2. คลิก "Run"
3. ดูผลลัพธ์:
   - Test 1: User → Admin endpoint = 403 ✅
   - Test 2: Admin → Admin endpoint = 200 ✅
   - Test 3: User → Edit other user = 403 ✅
   - Test 4: Admin → Edit other user = 200 ✅
   - Test 5: Dashboard comparison ✅
```

---

## 📊 ตาราง Permissions เปรียบเทียบ

### User ธรรมดา 👤 (user_token)

| Endpoint | Method | Permission | Status |
|----------|--------|------------|--------|
| `/api/auth/me` | GET | ✅ Allow | 200 |
| `/api/users/:own_id` | GET | ✅ Allow | 200 |
| `/api/users/:own_id` | PUT | ✅ Allow | 200 |
| `/api/dashboard` | GET | ✅ Allow | 200 |
| `/api/crypto/*` | GET | ✅ Allow | 200 |
| `/api/users` | GET | ❌ Deny | 403 |
| `/api/users/:other_id` | PUT | ❌ Deny | 403 |
| `/api/users/:id` | DELETE | ❌ Deny | 403 |
| `/api/users/:id/toggle-status` | PATCH | ❌ Deny | 403 |
| `/api/dashboard/admin` | GET | ❌ Deny | 403 |

### Admin 👑 (admin_token)

| Endpoint | Method | Permission | Status |
|----------|--------|------------|--------|
| **ทุก endpoint ที่ User เข้าได้** | All | ✅ Allow | 200 |
| `/api/users` | GET | ✅ Allow | 200 |
| `/api/users/:any_id` | GET | ✅ Allow | 200 |
| `/api/users/:any_id` | PUT | ✅ Allow | 200 |
| `/api/users/:any_id` | DELETE | ✅ Allow | 200 |
| `/api/users/:id/toggle-status` | PATCH | ✅ Allow | 200 |
| `/api/dashboard/admin` | GET | ✅ Allow | 200 |

---

## 🎓 Test Scenarios

### Scenario 1: User พยายามเข้าถึง Admin Endpoint

**Request:**
```
GET /api/users
Authorization: Bearer {{user_token}}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (ต้องการสิทธิ์: admin)"
}
```

**Status:** 403 Forbidden ✅

### Scenario 2: Admin เข้าถึง Admin Endpoint

**Request:**
```
GET /api/users
Authorization: Bearer {{admin_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

**Status:** 200 OK ✅

### Scenario 3: User แก้ไขข้อมูลตัวเอง

**Request:**
```
PUT /api/users/{{user_id}}
Authorization: Bearer {{user_token}}
Body: { "firstName": "Updated" }
```

**Status:** 200 OK ✅

### Scenario 4: User พยายามแก้ไขข้อมูลคนอื่น

**Request:**
```
PUT /api/users/{{admin_id}}
Authorization: Bearer {{user_token}}
Body: { "firstName": "Hacked" }
```

**Expected Response:**
```json
{
  "success": false,
  "message": "คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้นี้"
}
```

**Status:** 403 Forbidden ✅

### Scenario 5: Admin แก้ไขข้อมูลคนอื่น

**Request:**
```
PUT /api/users/{{user_id}}
Authorization: Bearer {{admin_token}}
Body: { "firstName": "Updated by Admin" }
```

**Status:** 200 OK ✅

---

## 🔄 Workflow แนะนำ

### Workflow A: ทดสอบ User Permissions

```
1. Setup → สร้าง User ธรรมดา
2. Login as User ธรรมดา (save user_token)
3. User Endpoints → ลองทุก request
   ✅ Get Me (ผ่าน)
   ✅ Update Own Profile (ผ่าน)
   ✅ View Dashboard (ผ่าน)
   ❌ Get All Users (ไม่ผ่าน - 403)
   ❌ Delete User (ไม่ผ่าน - 403)
   ❌ Admin Dashboard (ไม่ผ่าน - 403)
```

### Workflow B: ทดสอบ Admin Permissions

```
1. Setup → สร้าง Admin User
2. MongoDB → เปลี่ยน role เป็น 'admin'
3. Login as Admin (save admin_token)
4. Admin Endpoints → ลองทุก request
   ✅ Get All Users (ผ่าน)
   ✅ Update Other User (ผ่าน)
   ✅ Toggle Status (ผ่าน)
   ✅ Admin Dashboard (ผ่าน)
   ✅ Delete User (ผ่าน)
```

### Workflow C: ทดสอบ Permission Tests

```
1. Permission Tests → รัน Collection Runner
2. ดูผลลัพธ์:
   ✅ Test 1: User → Admin endpoint = 403
   ✅ Test 2: Admin → Admin endpoint = 200
   ✅ Test 3: User → Edit other = 403
   ✅ Test 4: Admin → Edit other = 200
   ✅ Test 5: Dashboard comparison
```

---

## 💡 สิ่งที่ต้องจำ

### 1. Token แยกกัน
```javascript
user_token   = JWT สำหรับ User ธรรมดา (role: user)
admin_token  = JWT สำหรับ Admin (role: admin)
```

### 2. การใช้งาน Token

**User Token:**
- ใช้กับ endpoints ใน folder "👤 User Endpoints"
- จะถูก reject ใน admin endpoints (403)

**Admin Token:**
- ใช้กับ endpoints ใน folder "👑 Admin Endpoints"
- เข้าถึงได้ทุกอย่าง

### 3. Expected Errors

| Error | Status | Message |
|-------|--------|---------|
| No token | 401 | กรุณาเข้าสู่ระบบ |
| Invalid token | 401 | Token ไม่ถูกต้อง |
| User → Admin endpoint | 403 | ไม่มีสิทธิ์เข้าถึง |
| Invalid API Key | 403 | API Key ไม่ถูกต้อง |

---

## 🎨 Console Output Features

Collection นี้มี console logging ที่ชัดเจน:

### Login Success
```
✅ Login เป็น USER ธรรมดา สำเร็จ
👤 Role: user
📝 User ID: 690f16ab3e71c765e7f5461a
🎫 Token saved as: user_token

💡 User ธรรมดาสามารถ:
   ✅ ดูข้อมูลตัวเอง
   ✅ แก้ไขข้อมูลตัวเอง
   ❌ ดูข้อมูล users ทั้งหมด (Admin เท่านั้น)
```

### Permission Denied
```
❌ ถูกต้อง: User ธรรมดาไม่มีสิทธิ์เข้าถึง
📋 Message: คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (ต้องการสิทธิ์: admin)
```

---

## 🏃 Quick Test (5 นาที)

### 1. Import Collection (1 นาที)
```
1. เปิด Postman
2. Import → Backend-API.postman_collection.json
3. Import → Backend-API-Local.postman_environment.json
4. เลือก Environment: "Backend API - Local"
```

### 2. Setup Users (2 นาที)
```
Folder: "Setup - สร้าง Users"
1. สร้าง User ธรรมดา → Send
2. สร้าง Admin User → Send
3. เปลี่ยน role เป็น admin (ใน MongoDB)
```

### 3. Test Permissions (2 นาที)
```
Folder: "Login - เข้าสู่ระบบ"
1. Login as User ธรรมดา → Send (save user_token)
2. Login as Admin → Send (save admin_token)

Folder: "Permission Tests"
3. รัน Collection Runner
4. ดูผลลัพธ์ทั้งหมด
```

---

## 🎯 Expected Results

### ✅ All Tests Should Pass

```
Permission Tests:
├─ Test 1: User → Admin endpoint ........ 403 ✅
├─ Test 2: Admin → Admin endpoint ....... 200 ✅
├─ Test 3: User → Edit other ............ 403 ✅
├─ Test 4: Admin → Edit other ........... 200 ✅
└─ Test 5: Dashboard comparison ......... PASS ✅

Total: 5/5 passed
```

---

## 🐛 Troubleshooting

### ปัญหา: Admin login แล้วยังได้ 403

**สาเหตุ:** ยังไม่ได้เปลี่ยน role เป็น 'admin' ใน MongoDB

**วิธีแก้:**
```bash
mongosh "mongodb://172.105.118.30:27017/backend_test"
db.users.updateOne(
  { email: 'admin@example.com' },
  { $set: { role: 'admin' } }
)

# ตรวจสอบ
db.users.findOne({ email: 'admin@example.com' }, { role: 1 })
# ควรเห็น: { _id: ..., role: 'admin' }
```

### ปัญหา: Token หมดอายุ

**สาเหตุ:** JWT token มีอายุ 7 วัน

**วิธีแก้:**
```
Login ใหม่เพื่อรับ token ใหม่
```

### ปัญหา: 401 Unauthorized

**เหตุผล:**
- ไม่มี token
- Token ไม่ถูกต้อง
- Token หมดอายุ

**วิธีแก้:**
```
ตรวจสอบว่า:
1. เลือก Authorization = Bearer Token
2. ใช้ {{user_token}} หรือ {{admin_token}}
3. Token ยังไม่หมดอายุ
```

---

## 📝 Summary Checklist

### User Token Tests
- [ ] Get Me (200) ✅
- [ ] Update Own Profile (200) ✅
- [ ] View Dashboard (200) ✅
- [ ] Get All Users (403) ✅
- [ ] Delete User (403) ✅
- [ ] Admin Dashboard (403) ✅

### Admin Token Tests
- [ ] Get All Users (200) ✅
- [ ] Update Other User (200) ✅
- [ ] Toggle Status (200) ✅
- [ ] Admin Dashboard (200) ✅
- [ ] Delete User (200) ✅

### API Key Tests
- [ ] Valid API Key (200) ✅
- [ ] No API Key (401) ✅
- [ ] Invalid API Key (403) ✅

---

## 🎊 สรุป

Postman Collection นี้:
- ✅ แยก login ระหว่าง User และ Admin ชัดเจน
- ✅ ทดสอบความแตกต่างของ tokens
- ✅ พิสูจน์ว่า RBAC ทำงานถูกต้อง
- ✅ มี console logging ที่ชัดเจน
- ✅ มี auto tests ทุก request
- ✅ ครอบคลุมทุก scenarios

**พร้อมใช้งานและส่งงานแล้ว! 🚀**

---

**หมายเหตุ:** อย่าลืมเปลี่ยน role เป็น 'admin' ใน MongoDB ก่อนทดสอบ admin endpoints!

