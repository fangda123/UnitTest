import { useState } from 'react';
import { useWebSocket, useBinanceWebSocket } from '../hooks/useWebSocket';
import RealtimePriceCard from '../components/Crypto/RealtimePriceCard';
import StatsCard from '../components/Stats/StatsCard';
import { 
  Wallet, 
  TrendingUp, 
  Activity, 
  Award,
  Zap,
  AlertCircle
} from 'lucide-react';
import { dashboardStats } from '../data/mockData';

/**
 * Dashboard แบบ Real-time
 * เชื่อมต่อ WebSocket สำหรับอัพเดทข้อมูลทันที
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

function RealtimeDashboard() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const token = localStorage.getItem('auth_token');

  // เชื่อมต่อ Backend WebSocket
  const { isConnected, lastMessage } = useWebSocket({
    url: WS_URL,
    token: token || undefined,
    onMessage: (message) => {
      console.log('📨 WebSocket Message:', message);
      
      // เพิ่ม notification
      setNotifications(prev => [message, ...prev].slice(0, 10));
    },
    onConnected: () => {
      console.log('✅ เชื่อมต่อ Backend WebSocket สำเร็จ');
    },
    autoReconnect: true,
  });

  // เชื่อมต่อ Binance WebSocket สำหรับราคา BTC
  const btc = useBinanceWebSocket('btcusdt');
  const eth = useBinanceWebSocket('ethusdt');
  const bnb = useBinanceWebSocket('bnbusdt');

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-warning" />
              Real-time Dashboard
            </h1>
            <p className="text-gray-400">อัพเดทข้อมูลแบบ Real-time ด้วย WebSocket</p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isConnected ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success animate-pulse' : 'bg-danger'
              }`}></span>
              <span className="text-sm font-semibold">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WebSocket Info */}
      <div className="bg-primary-500/10 border border-primary-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-primary-400">
          <p className="font-semibold mb-1">Real-time Mode Active</p>
          <p>ข้อมูลจะอัพเดทอัตโนมัติผ่าน WebSocket - ไม่ต้อง Refresh!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Balance"
          value={`$${dashboardStats.totalBalance.toLocaleString()}`}
          change={dashboardStats.todayChange}
          changeLabel="today"
          icon={<Wallet className="w-6 h-6" />}
          color="primary"
        />
        <StatsCard
          title="Total Profit"
          value={`$${dashboardStats.totalProfit.toLocaleString()}`}
          change={dashboardStats.weeklyChange}
          changeLabel="this week"
          icon={<TrendingUp className="w-6 h-6" />}
          color="success"
        />
        <StatsCard
          title="Total Trades"
          value={dashboardStats.totalTrades}
          change={dashboardStats.monthlyChange}
          changeLabel="this month"
          icon={<Activity className="w-6 h-6" />}
          color="warning"
        />
        <StatsCard
          title="Success Rate"
          value={`${dashboardStats.successRate}%`}
          change={2.1}
          changeLabel="improved"
          icon={<Award className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Real-time Crypto Prices */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-warning" />
          Live Crypto Prices
          <span className="text-sm text-gray-500 font-normal">(Binance WebSocket)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RealtimePriceCard symbol="btcusdt" name="Bitcoin" />
          <RealtimePriceCard symbol="ethusdt" name="Ethereum" />
          <RealtimePriceCard symbol="bnbusdt" name="Binance Coin" />
        </div>
      </div>

      {/* Real-time Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications Feed */}
        <div className="lg:col-span-2 bg-dark-800 rounded-lg p-6 border border-dark-700">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Real-time Notifications
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                รอข้อความจาก WebSocket...
              </p>
            ) : (
              notifications.map((notif, index) => (
                <div
                  key={index}
                  className="bg-dark-900/50 rounded-lg p-4 border border-dark-600 animate-slide-up"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      notif.type.includes('created') ? 'bg-success' :
                      notif.type.includes('updated') ? 'bg-warning' :
                      notif.type.includes('deleted') ? 'bg-danger' :
                      'bg-primary-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-100 mb-1">
                        {notif.type}
                      </p>
                      <p className="text-sm text-gray-400">
                        {notif.message}
                      </p>
                      {notif.data && (
                        <pre className="mt-2 text-xs text-gray-500 font-mono">
                          {JSON.stringify(notif.data, null, 2).slice(0, 200)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connection Info */}
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <h2 className="text-xl font-bold text-gray-100 mb-4">Connection Info</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Backend WebSocket</p>
              <div className={`flex items-center gap-2 text-sm font-semibold ${
                isConnected ? 'text-success' : 'text-danger'
              }`}>
                <span className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-danger'
                }`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Binance WebSocket</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    btc.price ? 'bg-success' : 'bg-gray-600'
                  }`}></span>
                  <span className="text-gray-400">BTC: {btc.isConnected ? '✅' : '⏳'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    eth.price ? 'bg-success' : 'bg-gray-600'
                  }`}></span>
                  <span className="text-gray-400">ETH: {eth.isConnected ? '✅' : '⏳'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    bnb.price ? 'bg-success' : 'bg-gray-600'
                  }`}></span>
                  <span className="text-gray-400">BNB: {bnb.isConnected ? '✅' : '⏳'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-600">
              <p className="text-sm text-gray-500 mb-2">WebSocket Events</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>• user.created</p>
                <p>• user.updated</p>
                <p>• user.deleted</p>
                <p>• crypto.price.update</p>
              </div>
            </div>

            {lastMessage && (
              <div className="pt-4 border-t border-dark-600">
                <p className="text-sm text-gray-500 mb-2">Last Message</p>
                <p className="text-xs text-gray-400 font-mono">
                  {lastMessage.type}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealtimeDashboard;

