import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { clearAuth, getCurrentUser, isAdmin } from '../../services/api';

/**
 * Dashboard Navbar พร้อมเมนูครบถ้วน
 * ตาม API Collection จาก Postman
 */

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: 'Charts', path: '/dashboard/charts', icon: <BarChart3 className="w-5 h-5" /> },
  { name: 'Crypto Prices', path: '/crypto', icon: <TrendingUp className="w-5 h-5" /> },
  { name: 'Trading', path: '/trading', icon: <Activity className="w-5 h-5" /> },
  { name: 'Portfolio', path: '/portfolio', icon: <BarChart3 className="w-5 h-5" /> },
  { name: 'User Management', path: '/users', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { name: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
];

function DashboardNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentUser = getCurrentUser();
  const userIsAdmin = isAdmin();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (item.adminOnly && userIsAdmin)
  );

  return (
    <nav className="bg-dark-800 border-b border-dark-700 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-glow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-100">Crypto Dashboard</h1>
                <p className="text-xs text-gray-400">Professional Trading Platform</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-dark-700">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                userIsAdmin ? 'bg-gradient-to-br from-warning to-danger' : 'bg-gradient-to-br from-primary-600 to-primary-500'
              }`}>
                {userIsAdmin ? (
                  <Shield className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-100">
                  {currentUser?.firstName || 'User'}
                </p>
                <p className="text-xs text-gray-400">
                  {userIsAdmin ? 'Admin' : 'User'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-dark-700"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-dark-700">
          <div className="px-4 py-4 space-y-2">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-dark-700 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                userIsAdmin ? 'bg-gradient-to-br from-warning to-danger' : 'bg-gradient-to-br from-primary-600 to-primary-500'
              }`}>
                {userIsAdmin ? (
                  <Shield className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-100">
                  {currentUser?.firstName || 'User'}
                </p>
                <p className="text-sm text-gray-400">
                  {currentUser?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {userIsAdmin ? 'Admin' : 'User'}
                </p>
              </div>
            </div>

            {/* Navigation Items */}
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            {/* Logout */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default DashboardNavbar;

