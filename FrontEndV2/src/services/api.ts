/**
 * API Service สำหรับเชื่อมต่อกับ Backend
 * ครอบคลุมทุก endpoints จาก Postman Collection
 */

import axios, { type AxiosInstance } from 'axios';

// Base URL - เปลี่ยนตามสภาพแวดล้อม
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1111';

// สร้าง axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 วินาที
});

// Request interceptor - เพิ่ม token อัตโนมัติ
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - จัดการ error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token หมดอายุ - ล้าง localStorage และ redirect
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================================
// 🏠 Welcome & Health APIs
// ========================================

export const healthAPI = {
  // ตรวจสอบสถานะ server
  check: () => apiClient.get('/api/health'),
  
  // หน้าแรก
  welcome: () => apiClient.get('/'),
};

// ========================================
// 🔐 Authentication APIs
// ========================================

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profile?: {
    phone?: string;
    address?: string;
    bio?: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const authAPI = {
  // สมัครสมาชิก
  register: (data: RegisterData) => apiClient.post('/api/auth/register', data),
  
  // เข้าสู่ระบบ
  login: (data: LoginData) => apiClient.post('/api/auth/login', data),
  
  // สร้าง Admin (ต้องมี role admin)
  registerAdmin: (data: RegisterData) => apiClient.post('/api/auth/register', { ...data, role: 'admin' }),
  
  // ดึงข้อมูลผู้ใช้ปัจจุบัน
  getMe: () => apiClient.get('/api/auth/me'),
  
  // เปลี่ยนรหัสผ่าน
  changePassword: (data: ChangePasswordData) => apiClient.put('/api/auth/change-password', data),
};

// ========================================
// 👥 User Management APIs
// ========================================

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  profile?: {
    phone?: string;
    address?: string;
    bio?: string;
  };
}

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

export const userAPI = {
  // ดึงข้อมูลผู้ใช้ทั้งหมด (Admin only)
  getAll: (params?: UserQuery) => apiClient.get('/api/users', { params }),
  
  // ดึงข้อมูลผู้ใช้รายคน
  getById: (id: string) => apiClient.get(`/api/users/${id}`),
  
  // อัพเดทข้อมูลผู้ใช้
  update: (id: string, data: UpdateUserData) => apiClient.put(`/api/users/${id}`, data),
  
  // ลบผู้ใช้ (Admin only)
  delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  
  // ระงับ/เปิดใช้บัญชี (Admin only)
  toggleStatus: (id: string) => apiClient.patch(`/api/users/${id}/toggle-status`),
  
  // ค้นหาผู้ใช้
  search: (query: string) => apiClient.get('/api/users', { params: { search: query } }),
  
  // กรองตาม role
  filterByRole: (role: 'user' | 'admin') => apiClient.get('/api/users', { params: { role } }),
};

// ========================================
// 💹 Crypto Price APIs (Binance)
// ========================================

export interface CryptoQuery {
  symbol?: string;
  timeRange?: string;
  limit?: number;
}

export const cryptoAPI = {
  // ดึงรายการ symbols ทั้งหมดจาก Binance
  getAllSymbols: () => apiClient.get('/api/crypto/symbols'),
  
  // ดึงราคา crypto ทั้งหมด
  getAll: () => apiClient.get('/api/crypto/prices'),
  
  // ดึงราคา Bitcoin
  getBTC: () => apiClient.get('/api/crypto/prices/BTCUSDT'),
  
  // ดึงราคา Ethereum
  getETH: () => apiClient.get('/api/crypto/prices/ETHUSDT'),
  
  // ดึงราคาเหรียญเฉพาะ
  getPrice: (symbol: string) => apiClient.get(`/api/crypto/prices/${symbol}`),
  
  // ดึงประวัติราคา
  getHistory: (symbol: string, params?: { limit?: number }) => 
    apiClient.get(`/api/crypto/history/${symbol}`, { params }),
  
  // สถิติ 24 ชั่วโมง
  getStats24h: (symbol: string) => apiClient.get(`/api/crypto/stats/${symbol}?period=24h`),
  
  // สถิติ 7 วัน
  getStats7d: (symbol: string) => apiClient.get(`/api/crypto/stats/${symbol}?period=7d`),
};

// ========================================
// 📊 Dashboard APIs
// ========================================

export const dashboardAPI = {
  // Dashboard สำหรับ User
  getUserDashboard: () => apiClient.get('/api/dashboard'),
  
  // Dashboard สำหรับ Admin
  getAdminDashboard: () => apiClient.get('/api/dashboard/admin'),
};

// ========================================
// 🔒 Internal APIs (API Key Required)
// ========================================

export const internalAPI = {
  // ดึงราคา crypto (ต้องมี API Key)
  getCryptoPrice: (symbol: string, apiKey: string) => 
    apiClient.get(`/api/internal/crypto/${symbol}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    }),
};

// ========================================
// 🛠️ Helper Functions
// ========================================

/**
 * บันทึก token และข้อมูลผู้ใช้
 */
export const saveAuth = (token: string, user: any) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * ล้างข้อมูล authentication
 */
export const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
};

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
export const getCurrentUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * ตรวจสอบว่า login แล้วหรือยัง
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token');
};

/**
 * ตรวจสอบว่าเป็น admin หรือไม่
 */
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

// Export axios instance สำหรับใช้งานแบบ custom
export default apiClient;

