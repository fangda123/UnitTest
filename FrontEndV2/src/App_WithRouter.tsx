import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from './services/api';
import { TradingProvider } from './contexts/TradingContext';
import { PriceProvider } from './contexts/PriceContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/Layout/DashboardLayout';
import App from './App'; // Dashboard หลัก
import RealtimeDashboard from './pages/RealtimeDashboard'; // Real-time Dashboard
import CryptoPage from './pages/CryptoPage';
import TradingPage from './pages/TradingPage';
import TradingPageV2 from './pages/TradingPageV2';
import TradingPageV3 from './pages/TradingPageV3';
import TradingPageV4 from './pages/TradingPageV4';
import TradingInterface from './pages/TradingInterface';
import UsersManagementPage from './pages/UsersManagementPage';
import ProfilePage from './pages/ProfilePage';

/**
 * Main App with Router
 * ครอบคลุมทุกหน้าจาก Postman Collection (36 endpoints)
 */

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppWithRouter() {
  return (
    <PriceProvider>
      <TradingProvider>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RealtimeDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/charts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <App />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/crypto"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CryptoPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <UsersManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trading"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TradingPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trading/v2"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TradingPageV2 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trading/v3"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TradingPageV3 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trading/v4"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TradingPageV4 />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trading/interface"
          element={
            <ProtectedRoute>
              <TradingInterface />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-gray-100">Portfolio</h1>
                  <p className="text-gray-400">Coming soon...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
                  <p className="text-gray-400">Coming soon...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <App />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route
          path="/"
          element={
            isAuthenticated() ? (
              <Navigate to={isAdmin() ? "/admin" : "/dashboard"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
      </TradingProvider>
    </PriceProvider>
  );
}

export default AppWithRouter;

