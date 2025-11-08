# 🔌 วิธีเชื่อมต่อกับ Backend API

## 📋 สรุปสั้นๆ

โปรเจคนี้มี **API Service พร้อมใช้งาน** แล้ว!  
ครอบคลุม **24+ endpoints** จาก Postman Collection

---

## 🚀 Quick Start (3 ขั้นตอน)

### ขั้นตอนที่ 1: เริ่ม Backend Server

```bash
cd /Users/js/Desktop/UnitTest/BackEnd
npm start
```

Backend จะรันที่: `http://localhost:4000`

### ขั้นตอนที่ 2: สร้างไฟล์ `.env.local`

```bash
cd /Users/js/Desktop/UnitTest/FrontEndV2
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:4000
VITE_INTERNAL_API_KEY=backend-test-internal-api-key-2024-secure
VITE_ENV=development
EOF
```

### ขั้นตอนที่ 3: ใช้ API ใน Components

```typescript
// src/App.tsx หรือ component อื่นๆ
import { cryptoAPI, authAPI, dashboardAPI } from './services/api';
import { useEffect, useState } from 'react';

function App() {
  const [btcPrice, setBtcPrice] = useState(null);
  
  useEffect(() => {
    const fetchBTCPrice = async () => {
      try {
        const response = await cryptoAPI.getBTC();
        setBtcPrice(response.data.data);
        console.log('✅ BTC Price:', response.data.data);
      } catch (error) {
        console.error('❌ Error:', error);
      }
    };
    
    fetchBTCPrice();
  }, []);
  
  return (
    <div>
      {btcPrice && (
        <h1>BTC Price: ${btcPrice.price}</h1>
      )}
    </div>
  );
}
```

---

## 📡 API Service ที่พร้อมใช้งาน

### 1. 🔐 Authentication

```typescript
import { authAPI, saveAuth } from './services/api';

// สมัครสมาชิก
const register = async () => {
  const response = await authAPI.register({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!',
    firstName: 'John',
    lastName: 'Doe'
  });
  
  // บันทึก token อัตโนมัติ
  saveAuth(response.data.data.token, response.data.data.user);
};

// เข้าสู่ระบบ
const login = async () => {
  const response = await authAPI.login({
    email: 'test@example.com',
    password: 'Test123!'
  });
  
  saveAuth(response.data.data.token, response.data.data.user);
};

// ดึงข้อมูลผู้ใช้ปัจจุบัน
const getMe = async () => {
  const response = await authAPI.getMe();
  console.log('User:', response.data.data);
};
```

### 2. 💹 Crypto Price

```typescript
import { cryptoAPI } from './services/api';

// ดึงราคา Bitcoin
const getBTCPrice = async () => {
  const response = await cryptoAPI.getBTC();
  return response.data.data;
};

// ดึงราคา Ethereum
const getETHPrice = async () => {
  const response = await cryptoAPI.getETH();
  return response.data.data;
};

// ดึงราคาทั้งหมด
const getAllPrices = async () => {
  const response = await cryptoAPI.getAll();
  return response.data.data;
};

// ดึงประวัติราคา
const getPriceHistory = async (symbol: string) => {
  const response = await cryptoAPI.getHistory(symbol, { limit: 100 });
  return response.data.data;
};

// สถิติ 24 ชั่วโมง
const getStats24h = async (symbol: string) => {
  const response = await cryptoAPI.getStats24h(symbol);
  return response.data.data;
};
```

### 3. 👥 User Management

```typescript
import { userAPI } from './services/api';

// ดึงข้อมูลผู้ใช้ทั้งหมด (Admin only)
const getAllUsers = async () => {
  const response = await userAPI.getAll({ page: 1, limit: 10 });
  return response.data.data;
};

// ค้นหาผู้ใช้
const searchUsers = async (query: string) => {
  const response = await userAPI.search(query);
  return response.data.data;
};

// อัพเดทข้อมูล
const updateUser = async (userId: string) => {
  const response = await userAPI.update(userId, {
    firstName: 'New Name',
    profile: {
      phone: '0812345678'
    }
  });
  return response.data.data;
};
```

### 4. 📊 Dashboard

```typescript
import { dashboardAPI } from './services/api';

// Dashboard สำหรับ User
const getUserDashboard = async () => {
  const response = await dashboardAPI.getUserDashboard();
  return response.data.data;
};

// Dashboard สำหรับ Admin
const getAdminDashboard = async () => {
  const response = await dashboardAPI.getAdminDashboard();
  return response.data.data;
};
```

---

## 🎨 ตัวอย่างการใช้งานจริง

### ตัวอย่าง 1: Login Flow

```typescript
import { useState } from 'react';
import { authAPI, saveAuth, isAuthenticated } from './services/api';
import toast from 'react-hot-toast';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data.data;
      
      // บันทึก token และ user
      saveAuth(token, user);
      
      // แสดง notification
      toast.success(`ยินดีต้อนรับ ${user.firstName}!`);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
```

### ตัวอย่าง 2: Real-time Crypto Prices

```typescript
import { useState, useEffect } from 'react';
import { cryptoAPI } from './services/api';

function CryptoPriceWidget() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await cryptoAPI.getAll();
        setPrices(response.data.data);
      } catch (error) {
        console.error('Error fetching prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();

    // Update ทุก 10 วินาที
    const interval = setInterval(fetchPrices, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {prices.map((crypto) => (
        <div key={crypto.symbol}>
          <h3>{crypto.symbol}</h3>
          <p>${crypto.price.toLocaleString()}</p>
          <span className={crypto.priceChangePercent > 0 ? 'text-green-500' : 'text-red-500'}>
            {crypto.priceChangePercent > 0 ? '+' : ''}
            {crypto.priceChangePercent}%
          </span>
        </div>
      ))}
    </div>
  );
}
```

### ตัวอย่าง 3: Protected Route

```typescript
import { Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from './services/api';

function ProtectedRoute({ children, requireAdmin = false }: { 
  children: React.ReactNode; 
  requireAdmin?: boolean;
}) {
  // ตรวจสอบ authentication
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  // ตรวจสอบ admin (ถ้าจำเป็น)
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

// ใช้งาน
<Routes>
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  
  <Route path="/admin" element={
    <ProtectedRoute requireAdmin>
      <AdminPanel />
    </ProtectedRoute>
  } />
</Routes>
```

---

## 🔒 การจัดการ Authentication

API Service มี helper functions พร้อมใช้งาน:

```typescript
import { 
  saveAuth,
  clearAuth,
  getCurrentUser,
  isAuthenticated,
  isAdmin 
} from './services/api';

// บันทึก auth
saveAuth(token, user);

// ล้าง auth (logout)
clearAuth();

// ดึงข้อมูลผู้ใช้ปัจจุบัน
const currentUser = getCurrentUser();

// ตรวจสอบว่า login แล้วหรือยัง
if (isAuthenticated()) {
  // User is logged in
}

// ตรวจสอบว่าเป็น admin หรือไม่
if (isAdmin()) {
  // User is admin
}
```

---

## 🛠️ Axios Interceptors (อัตโนมัติ)

API Service มี interceptors ที่ทำงานอัตโนมัติ:

### Request Interceptor
- เพิ่ม `Authorization` header อัตโนมัติ
- ดึง token จาก localStorage

### Response Interceptor
- จัดการ 401 Unauthorized
- ล้าง auth และ redirect to login
- Handle errors automatically

```typescript
// ไม่ต้องเพิ่ม token เอง - interceptor จัดการให้!
const response = await userAPI.getMe();
// Authorization: Bearer <token> ถูกเพิ่มอัตโนมัติ
```

---

## 📊 ตัวอย่าง Full Integration

### App.tsx แบบเชื่อมต่อ Backend

```typescript
import { useState, useEffect } from 'react';
import { 
  cryptoAPI, 
  dashboardAPI, 
  isAuthenticated 
} from './services/api';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import TradingViewChart from './components/Charts/TradingViewChart';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูล Dashboard
        if (isAuthenticated()) {
          const dashResponse = await dashboardAPI.getUserDashboard();
          setDashboardData(dashResponse.data.data);
        }

        // ดึงราคา BTC
        const btcResponse = await cryptoAPI.getBTC();
        setBtcPrice(btcResponse.data.data);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Update ทุก 30 วินาที
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 p-4">
        <h1 className="text-2xl font-bold text-white">
          Crypto Trading Dashboard
        </h1>
        {btcPrice && (
          <p className="text-gray-400">
            BTC: ${btcPrice.price.toLocaleString()}
            <span className={btcPrice.priceChangePercent > 0 ? 'text-success' : 'text-danger'}>
              {' '}({btcPrice.priceChangePercent > 0 ? '+' : ''}
              {btcPrice.priceChangePercent}%)
            </span>
          </p>
        )}
      </header>

      <main className="p-6">
        {/* Dashboard Content */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-dark-800 p-6 rounded-lg">
              <h3 className="text-gray-400">Total Balance</h3>
              <p className="text-3xl font-bold text-white">
                ${dashboardData.stats?.totalBalance || 0}
              </p>
            </div>
            {/* เพิ่ม stats อื่นๆ */}
          </div>
        )}

        {/* Charts and other components */}
        <DashboardLayout widgets={[/* your widgets */]} />
      </main>
    </div>
  );
}

export default App;
```

---

## 🎯 API Endpoints ทั้งหมด

### Authentication (5)
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `PUT /api/auth/change-password` - เปลี่ยนรหัสผ่าน
- `POST /api/auth/register` (role: admin) - สร้าง Admin

### User Management (7)
- `GET /api/users` - ดึงข้อมูลทั้งหมด
- `GET /api/users/:id` - ดึงข้อมูลรายคน
- `PUT /api/users/:id` - อัพเดทข้อมูล
- `DELETE /api/users/:id` - ลบผู้ใช้
- `PATCH /api/users/:id/toggle-status` - ระงับ/เปิดใช้
- `GET /api/users?search=...` - ค้นหา
- `GET /api/users?role=...` - กรองตาม role

### Crypto Price (7)
- `GET /api/crypto/prices` - ราคาทั้งหมด
- `GET /api/crypto/prices/BTCUSDT` - ราคา BTC
- `GET /api/crypto/prices/ETHUSDT` - ราคา ETH
- `GET /api/crypto/prices/:symbol` - ราคาเหรียญเฉพาะ
- `GET /api/crypto/prices/:symbol/history` - ประวัติราคา
- `GET /api/crypto/stats/:symbol/24h` - สถิติ 24h
- `GET /api/crypto/stats/:symbol/7d` - สถิติ 7d

### Dashboard (2)
- `GET /api/dashboard` - User Dashboard
- `GET /api/dashboard/admin` - Admin Dashboard

### Internal (1)
- `GET /api/internal/crypto/:symbol` - Get price (API Key required)

---

## 💡 Tips & Best Practices

### 1. Error Handling

```typescript
try {
  const response = await cryptoAPI.getBTC();
  // success
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    console.error('Error:', error.response.data.message);
    toast.error(error.response.data.message);
  } else if (error.request) {
    // No response from server
    console.error('Network error');
    toast.error('ไม่สามารถเชื่อมต่อกับ server ได้');
  } else {
    // Other errors
    console.error('Error:', error.message);
  }
}
```

### 2. Loading States

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // API call
  } finally {
    setLoading(false);
  }
};
```

### 3. Data Caching

```typescript
const [cache, setCache] = useState<Map<string, any>>(new Map());

const fetchWithCache = async (key: string, fetcher: () => Promise<any>) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetcher();
  setCache(new Map(cache.set(key, data)));
  return data;
};
```

---

## 🚀 พร้อมใช้งาน!

API Service พร้อมใช้งานแล้ว - เพียงแค่:

1. เริ่ม Backend Server
2. สร้างไฟล์ `.env.local`
3. Import และใช้งาน APIs

**Happy Coding! 🎉**

