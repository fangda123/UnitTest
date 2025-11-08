import { useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';
import { User, Mail, Phone, MapPin, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * หน้า Profile
 * ตาม Postman:
 * - GET /api/auth/me
 * - PUT /api/users/:id (Update)
 * - PUT /api/auth/change-password
 */

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data.data;
      setUser(userData);
      
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.profile?.phone || '',
        address: userData.profile?.address || '',
        bio: userData.profile?.bio || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await userAPI.update(user._id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        profile: {
          phone: profileData.phone,
          address: profileData.address,
          bio: profileData.bio,
        },
      });

      setSuccess('อัพเดทข้อมูลสำเร็จ!');
      fetchProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'อัพเดทข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setSaving(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccess('เปลี่ยนรหัสผ่านสำเร็จ!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Profile Settings</h1>
          <p className="text-gray-400">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger/10 border border-danger/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-success">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - User Info */}
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-100">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-gray-400">@{user?.username}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  user?.role === 'admin' 
                    ? 'bg-warning/20 text-warning' 
                    : 'bg-primary-500/20 text-primary-400'
                }`}>
                  {user?.role === 'admin' ? 'ADMIN' : 'USER'}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                {user?.profile?.phone && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{user.profile.phone}</span>
                  </div>
                )}
                {user?.profile?.address && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{user.profile.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-dark-600">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Member since</span>
                  <span className="text-gray-300">
                    {new Date(user?.createdAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Update Profile Form */}
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h2 className="text-xl font-bold text-gray-100 mb-6">Update Profile</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ชื่อ
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ที่อยู่
                  </label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h2 className="text-xl font-bold text-gray-100 mb-6">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    รหัสผ่านปัจจุบัน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    รหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-warning hover:bg-warning/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Changing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;

