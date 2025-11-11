import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, saveAuth } from '../services/api';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import Footer from '../components/Layout/Footer';

/**
 * หน้า Login สำหรับเข้าสู่ระบบ
 * รองรับทั้ง User และ Admin
 */

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data.data;

      // บันทึก token และ user info
      saveAuth(token, user);

      console.log('✅ Login สำเร็จ:', user);

      // Redirect ไปหน้า Dashboard
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('❌ Login Error:', err);
      setError(err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Quick Login Buttons (สำหรับทดสอบ)
  const quickLogin = async (type: 'user' | 'admin') => {
    const credentials = type === 'admin' 
      ? { email: 'admin@example.com', password: 'Admin123!' }
      : { email: 'user@example.com', password: 'User123!' };
    
    setFormData(credentials);
    
    // รอ 100ms แล้ว submit
    setTimeout(() => {
      document.querySelector('form')?.requestSubmit();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 shadow-glow mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            เข้าสู่ระบบ
          </h1>
          <p className="text-gray-400">
            Crypto Trading Dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-dark-800 rounded-xl shadow-2xl p-8 border border-dark-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 border border-danger/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                อีเมล
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all"
                  placeholder="example@email.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500/20"
                />
                <span className="text-gray-400">จดจำฉัน</span>
              </label>
              <button
                type="button"
                className="text-primary-500 hover:text-primary-400 transition-colors"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-800 text-gray-500">หรือ</span>
            </div>
          </div>

          {/* Quick Login Buttons (สำหรับทดสอบ) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => quickLogin('user')}
              className="w-full py-2 px-4 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors text-sm"
            >
              🧪 ทดสอบ: Login เป็น User
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              className="w-full py-2 px-4 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors text-sm"
            >
              🧪 ทดสอบ: Login เป็น Admin
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ยังไม่มีบัญชี?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary-500 hover:text-primary-400 font-semibold transition-colors inline-flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                สมัครสมาชิก
              </button>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            สำหรับทดสอบ: user@example.com / User123! หรือ admin@example.com / Admin123!
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
}

export default LoginPage;

