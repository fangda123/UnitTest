import { useState, useEffect, useCallback } from 'react';
import { useWebSocket, useBinanceWebSocket } from '../hooks/useWebSocket';
import { cryptoAPI } from '../services/api';
import RealtimePriceCard from '../components/Crypto/RealtimePriceCard';
import StatsCard from '../components/Stats/StatsCard';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Award,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { dashboardStats } from '../data/mockData';

/**
 * Dashboard แบบ Real-time
 * เชื่อมต่อ WebSocket สำหรับอัพเดทข้อมูลทันที
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1111/ws';

function RealtimeDashboard() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<any[]>([]);
  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceAnimations, setPriceAnimations] = useState<Map<string, 'up' | 'down' | null>>(new Map());
  const token = localStorage.getItem('auth_token');

  // ดึงข้อมูลราคา crypto ทั้งหมด
  useEffect(() => {
    fetchCryptoPrices();
    // Auto refresh ทุก 10 วินาที (backup ในกรณีที่ WebSocket ไม่ทำงาน)
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh ข้อมูลราคา (ทุก 10 วินาที)');
      fetchCryptoPrices(true);
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCryptoPrices = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await cryptoAPI.getAll();
      const newPrices = response.data.data || [];
      
      // ตรวจสอบการเปลี่ยนแปลงราคาและตั้งค่า animation
      const newAnimations = new Map<string, 'up' | 'down' | null>();
      let hasChanges = false;
      
      newPrices.forEach((crypto: any) => {
        const prevPrice = previousPrices.get(crypto.symbol);
        if (prevPrice && prevPrice !== crypto.price) {
          hasChanges = true;
          const direction = crypto.price > prevPrice ? 'up' : 'down';
          newAnimations.set(crypto.symbol, direction);
          console.log(`📊 ราคา ${crypto.symbol} เปลี่ยน: $${prevPrice} → $${crypto.price} (${direction})`);
          
          // ลบ animation หลังจาก 500ms
          setTimeout(() => {
            setPriceAnimations((prev) => {
              const updated = new Map(prev);
              updated.delete(crypto.symbol);
              return updated;
            });
          }, 500);
        }
      });
      
      if (hasChanges && silent) {
        console.log('🔄 อัพเดทราคาแบบ real-time');
      }
      
      // อัพเดท previous prices
      const newPreviousPrices = new Map<string, number>();
      newPrices.forEach((crypto: any) => {
        newPreviousPrices.set(crypto.symbol, crypto.price);
      });
      setPreviousPrices(newPreviousPrices);
      setPriceAnimations(newAnimations);
      setCryptoPrices(newPrices);
    } catch (error) {
      console.error('❌ Error fetching crypto prices:', error);
    } finally {
      if (!silent) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  };

  // อัพเดทราคาเฉพาะ symbol ที่เปลี่ยน (ทันทีจาก WebSocket)
  const updatePriceImmediately = useCallback((priceData: any) => {
    if (!priceData || !priceData.symbol) return;
    
    setCryptoPrices((prevPrices) => {
      const updatedPrices = prevPrices.map((crypto: any) => {
        if (crypto.symbol === priceData.symbol) {
          const prevPrice = crypto.price;
          const newPrice = priceData.price;
          
          // ตั้งค่า animation
          if (prevPrice && prevPrice !== newPrice) {
            const direction = newPrice > prevPrice ? 'up' : 'down';
            setPriceAnimations((prev) => {
              const updated = new Map(prev);
              updated.set(priceData.symbol, direction);
              return updated;
            });
            
            // ลบ animation หลังจาก 500ms
            setTimeout(() => {
              setPriceAnimations((prev) => {
                const updated = new Map(prev);
                updated.delete(priceData.symbol);
                return updated;
              });
            }, 500);
            
            console.log(`⚡ อัพเดทราคา ${priceData.symbol} ทันที: $${prevPrice} → $${newPrice}`);
          }
          
          // อัพเดทข้อมูล
          return {
            ...crypto,
            price: newPrice,
            highPrice24h: priceData.highPrice24h || crypto.highPrice24h,
            lowPrice24h: priceData.lowPrice24h || crypto.lowPrice24h,
            volume24h: priceData.volume24h || crypto.volume24h,
            priceChangePercent24h: priceData.priceChangePercent24h || crypto.priceChangePercent24h,
            openPrice24h: priceData.openPrice24h || crypto.openPrice24h,
            lastUpdate: priceData.lastUpdate || new Date().toISOString(),
          };
        }
        return crypto;
      });
      
      // ถ้ายังไม่มี symbol นี้ในรายการ ให้เพิ่มเข้าไป
      const exists = updatedPrices.some((c: any) => c.symbol === priceData.symbol);
      if (!exists && priceData.symbol) {
        updatedPrices.push({
          symbol: priceData.symbol,
          price: priceData.price,
          highPrice24h: priceData.highPrice24h,
          lowPrice24h: priceData.lowPrice24h,
          volume24h: priceData.volume24h,
          priceChangePercent24h: priceData.priceChangePercent24h || 0,
          openPrice24h: priceData.openPrice24h,
          lastUpdate: priceData.lastUpdate || new Date().toISOString(),
        });
      }
      
      return updatedPrices;
    });
    
    // อัพเดท previous price
    setPreviousPrices((prev) => {
      const updated = new Map(prev);
      updated.set(priceData.symbol, priceData.price);
      return updated;
    });
  }, []);

  // เชื่อมต่อ Backend WebSocket
  const { isConnected, lastMessage } = useWebSocket({
    url: WS_URL,
    token: token || undefined,
    onMessage: (message) => {
      console.log('📨 WebSocket Message:', message);
      console.log('📨 Message Type:', message.type);
      console.log('📨 Message Data:', message.data);
      
      // อัพเดทราคาทันทีเมื่อได้รับ notification
      if (message.type === 'crypto.price.update' && message.data) {
        console.log('⚡ อัพเดทราคาแบบ real-time:', message.data.symbol, message.data);
        updatePriceImmediately(message.data);
      } else {
        console.log('⚠️ ไม่ใช่ crypto.price.update หรือไม่มี data:', {
          type: message.type,
          hasData: !!message.data
        });
      }
      
      // เพิ่ม notification
      setNotifications(prev => [message, ...prev].slice(0, 10));
    },
    onConnected: () => {
      console.log('✅ เชื่อมต่อ Backend WebSocket สำเร็จ - พร้อมรับข้อมูล real-time');
    },
    autoReconnect: true,
  });

  // เชื่อมต่อ Binance WebSocket เฉพาะสำหรับ top 3 coins (เพื่อลด connections)
  // ใช้ Backend API แทนสำหรับเหรียญอื่นๆ
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
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <StatsCard
            title="Total Balance"
            value={`$${dashboardStats.totalBalance.toLocaleString()}`}
            change={dashboardStats.todayChange}
            changeLabel="today"
            icon={<Wallet className="w-6 h-6 animate-pulse-slow" />}
            color="primary"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <StatsCard
            title="Total Profit"
            value={`$${dashboardStats.totalProfit.toLocaleString()}`}
            change={dashboardStats.weeklyChange}
            changeLabel="this week"
            icon={<TrendingUp className="w-6 h-6 animate-pulse-slow" />}
            color="success"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <StatsCard
            title="Total Trades"
            value={dashboardStats.totalTrades}
            change={dashboardStats.monthlyChange}
            changeLabel="this month"
            icon={<Activity className="w-6 h-6 animate-pulse-slow" />}
            color="warning"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <StatsCard
            title="Success Rate"
            value={`${dashboardStats.successRate}%`}
            change={2.1}
            changeLabel="improved"
            icon={<Award className="w-6 h-6 animate-pulse-slow" />}
            color="purple"
          />
        </div>
      </div>

      {/* Real-time Crypto Prices */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-warning animate-pulse" />
            Live Crypto Prices
            <span className="text-sm text-gray-500 font-normal flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                isConnected ? 'bg-success' : 'bg-danger'
              }`}></span>
              ({cryptoPrices.length} Cryptocurrencies)
              {isConnected && (
                <span className="text-xs text-success font-semibold ml-2">
                  ⚡ Real-time Active
                </span>
              )}
            </span>
          </h2>
          <button
            onClick={() => fetchCryptoPrices()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading cryptocurrencies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 max-h-[800px] overflow-y-auto">
            {cryptoPrices.length > 0 ? (
              cryptoPrices.map((crypto, index) => {
                const animation = priceAnimations.get(crypto.symbol);
                const isPositive = crypto.priceChangePercent24h >= 0;
                
                return (
                  <div
                    key={crypto.symbol}
                    className={`bg-dark-800 rounded-lg p-4 border border-dark-700 hover:border-primary-500/50 transition-all animate-fade-in ${
                      animation === 'up' ? 'animate-price-up' : animation === 'down' ? 'animate-price-down' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                          {crypto.symbol.replace('USDT', '')}
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-success animate-pulse-slow" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-danger animate-pulse-slow" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{crypto.symbol}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-success' : 'bg-danger'} animate-pulse`}></div>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold text-gray-100 transition-all duration-300 ${
                        animation === 'up' ? 'text-success scale-105' : animation === 'down' ? 'text-danger scale-105' : ''
                      }`}>
                        ${crypto.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        {animation && (
                          <span className="ml-2 text-xs">
                            {animation === 'up' ? '📈' : '📉'}
                          </span>
                        )}
                      </p>
                      <p className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                        <span className={isPositive ? 'animate-pulse-slow' : ''}>
                          {isPositive ? '+' : ''}{crypto.priceChangePercent24h?.toFixed(2)}%
                        </span>
                        <span className="text-gray-500">(24h)</span>
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                No cryptocurrencies available
              </div>
            )}
          </div>
        )}
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

