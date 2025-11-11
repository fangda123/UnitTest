import { useState, useEffect, useCallback } from 'react';
import { usePrice } from '../contexts/PriceContext';
import { cryptoAPI } from '../services/api';
import { RefreshCw, TrendingUp, TrendingDown, Search, Zap } from 'lucide-react';
import LineChart from '../components/Charts/LineChart';
import RealtimePriceCard from '../components/Crypto/RealtimePriceCard';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://172.105.118.30:1111/ws';

/**
 * หน้า Crypto Prices
 * แสดงราคา Crypto ทั้งหมด พร้อมกราฟและสถิติ
 * ตาม Postman: GET /api/crypto/prices
 */

interface CryptoPrice {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: string;
}

function CryptoPage() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTCUSDT');
  const [history, setHistory] = useState<any[]>([]);
  const [stats24h, setStats24h] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());
  const [priceAnimations, setPriceAnimations] = useState<Map<string, 'up' | 'down' | null>>(new Map());
  
  // ใช้ PriceContext สำหรับราคา real-time
  const priceContext = usePrice();
  const realtimePrices = priceContext?.prices || new Map();
  const isConnected = priceContext?.isConnected || false;

  useEffect(() => {
    console.log('📊 CryptoPage: Mounted - เริ่มต้นการเชื่อมต่อ');
    fetchAllData();
    // Auto refresh ทุก 10 วินาที
    const interval = setInterval(() => {
      fetchPrices(true);
    }, 10000);
    
    return () => {
      console.log('🧹 CryptoPage: Unmounted - ทำความสะอาด intervals และ connections');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedCrypto) {
      fetchHistory();
      fetchStats();
    }
  }, [selectedCrypto]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPrices(), fetchHistory(), fetchStats()]);
    setLoading(false);
  };

  const fetchPrices = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await cryptoAPI.getAll();
      const newPrices = response.data.data || [];
      
      // ตรวจสอบการเปลี่ยนแปลงราคาและตั้งค่า animation
      const newAnimations = new Map<string, 'up' | 'down' | null>();
      newPrices.forEach((crypto: any) => {
        const prevPrice = previousPrices.get(crypto.symbol);
        if (prevPrice && prevPrice !== crypto.price) {
          const direction = crypto.price > prevPrice ? 'up' : 'down';
          newAnimations.set(crypto.symbol, direction);
          
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
      
      // อัพเดท previous prices
      const newPreviousPrices = new Map<string, number>();
      newPrices.forEach((crypto: any) => {
        newPreviousPrices.set(crypto.symbol, crypto.price);
      });
      setPreviousPrices(newPreviousPrices);
      setPriceAnimations(newAnimations);
      setPrices(newPrices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // อัพเดทราคาจาก PriceContext แบบ real-time ทันทีเมื่อ realtimePrices เปลี่ยน (ไม่ใช้ interval)
  useEffect(() => {
    if (!realtimePrices || realtimePrices.size === 0) {
      return; // ถ้ายังไม่มีข้อมูล realtimePrices ให้ข้าม
    }
    
    setPrices((prevPrices) => {
      const updatedPrices = prevPrices.map((crypto: any) => {
        const realtimePrice = realtimePrices?.get(crypto.symbol);
        if (realtimePrice) {
          const prevPrice = crypto.price;
          const newPrice = realtimePrice.price;
          
          // ตั้งค่า animation
          if (prevPrice && prevPrice !== newPrice) {
            const direction = newPrice > prevPrice ? 'up' : 'down';
            setPriceAnimations((prev) => {
              const updated = new Map(prev);
              updated.set(crypto.symbol, direction);
              return updated;
            });
            
            // ลบ animation หลังจาก 500ms
            setTimeout(() => {
              setPriceAnimations((prev) => {
                const updated = new Map(prev);
                updated.delete(crypto.symbol);
                return updated;
              });
            }, 500);
          }
          
          // อัพเดทข้อมูล
          return {
            ...crypto,
            price: newPrice,
            priceChange: realtimePrice.priceChange || crypto.priceChange,
            priceChangePercent: realtimePrice.priceChangePercent || crypto.priceChangePercent,
            high24h: realtimePrice.high24h || crypto.high24h,
            low24h: realtimePrice.low24h || crypto.low24h,
            volume24h: realtimePrice.volume24h || crypto.volume24h,
            lastUpdate: realtimePrice.lastUpdate || crypto.lastUpdate,
          };
        }
        return crypto;
      });
      
      // เพิ่มเหรียญใหม่จาก realtimePrices (ถ้ายังไม่มี)
      realtimePrices?.forEach((realtimePrice, symbol) => {
        const exists = updatedPrices.some((c: any) => c.symbol === symbol);
        if (!exists) {
          updatedPrices.push({
            symbol: realtimePrice.symbol,
            price: realtimePrice.price,
            priceChange: realtimePrice.priceChange || 0,
            priceChangePercent: realtimePrice.priceChangePercent || 0,
            high24h: realtimePrice.high24h,
            low24h: realtimePrice.low24h,
            volume24h: realtimePrice.volume24h,
            lastUpdate: realtimePrice.lastUpdate || new Date().toISOString(),
          });
        }
      });
      
      return updatedPrices;
    });
    
    // อัพเดท stats ถ้าเป็น selected crypto
    const selectedRealtimePrice = realtimePrices?.get(selectedCrypto);
    if (selectedRealtimePrice) {
      setStats24h((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          price: selectedRealtimePrice.price,
          high24h: selectedRealtimePrice.high24h || prev.high24h,
          low24h: selectedRealtimePrice.low24h || prev.low24h,
          volume24h: selectedRealtimePrice.volume24h || prev.volume24h,
          priceChangePercent: selectedRealtimePrice.priceChangePercent || prev.priceChangePercent,
        };
      });
    }
  }, [realtimePrices, selectedCrypto]);

  const fetchHistory = async () => {
    try {
      const response = await cryptoAPI.getHistory(selectedCrypto, { limit: 50 });
      setHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await cryptoAPI.getStats24h(selectedCrypto);
      setStats24h(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredPrices = prices.filter(p =>
    p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chartData = {
    categories: history.map((_h, i) => `${i + 1}`),
    series: [{
      name: 'Price',
      data: history.map(h => h.price)
    }]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading crypto prices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-warning" />
            Crypto Prices
          </h1>
          <p className="text-gray-400">Real-time cryptocurrency market data via WebSocket</p>
        </div>
        <button
          onClick={() => fetchAllData()}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Live Prices - API (ไม่ใช้ WebSocket เพื่อลด connections) */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning animate-pulse" />
          Live Prices
          <span className="text-sm text-gray-500 font-normal flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              isConnected ? 'bg-success' : 'bg-danger'
            }`}></span>
            {prices.length} Cryptocurrencies
            {isConnected && (
              <span className="text-xs text-success font-semibold ml-2">
                ⚡ Real-time Active
              </span>
            )}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto">
          {prices.length > 0 ? (
            prices.map((crypto, index) => {
              const animation = priceAnimations.get(crypto.symbol);
              const isPositive = (crypto.priceChangePercent24h || crypto.priceChangePercent || 0) >= 0;
              return (
                <div
                  key={crypto.symbol}
                  className={`bg-dark-800 rounded-lg p-4 border border-dark-700 hover:border-primary-500/50 transition-all animate-fade-in hover:scale-105 hover:shadow-lg ${
                    animation === 'up' ? 'animate-price-up' : animation === 'down' ? 'animate-price-down' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.03}s` }}
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
                        {isPositive ? '+' : ''}{(crypto.priceChangePercent24h || crypto.priceChangePercent || 0)?.toFixed(2)}%
                      </span>
                      <span className="text-gray-500">(24h)</span>
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              No cryptocurrencies available
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crypto..."
            className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats Grid */}
      {stats24h && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-gray-400 text-sm mb-1">24h High</p>
            <p className="text-2xl font-bold text-success">${stats24h.high24h?.toLocaleString()}</p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-gray-400 text-sm mb-1">24h Low</p>
            <p className="text-2xl font-bold text-danger">${stats24h.low24h?.toLocaleString()}</p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-gray-400 text-sm mb-1">24h Volume</p>
            <p className="text-2xl font-bold text-gray-100">${(stats24h.volume24h / 1000000).toFixed(2)}M</p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-gray-400 text-sm mb-1">24h Change</p>
            <p className={`text-2xl font-bold ${stats24h.priceChangePercent >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats24h.priceChangePercent >= 0 ? '+' : ''}{stats24h.priceChangePercent?.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {history.length > 0 && (
        <div className="bg-dark-800 rounded-lg shadow-xl mb-6 border border-dark-700">
          <LineChart
            title={`${selectedCrypto} Price History`}
            data={chartData}
            height={300}
            smooth={true}
          />
        </div>
      )}

      {/* Prices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPrices.map((crypto) => (
          <div
            key={crypto.symbol}
            onClick={() => setSelectedCrypto(crypto.symbol)}
            className={`bg-dark-800 rounded-lg p-6 border transition-all cursor-pointer hover:shadow-glow ${
              selectedCrypto === crypto.symbol
                ? 'border-primary-500 shadow-lg'
                : 'border-dark-700 hover:border-primary-500/50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-100">{crypto.symbol.replace('USDT', '')}</h3>
                <p className="text-sm text-gray-500">{crypto.symbol}</p>
              </div>
              {crypto.priceChangePercent >= 0 ? (
                <TrendingUp className="w-6 h-6 text-success" />
              ) : (
                <TrendingDown className="w-6 h-6 text-danger" />
              )}
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-100">
                ${crypto.price?.toLocaleString()}
              </p>
              <p className={`text-sm font-semibold ${crypto.priceChangePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {crypto.priceChangePercent >= 0 ? '+' : ''}{crypto.priceChangePercent?.toFixed(2)}% (24h)
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">24h High:</span>
                <span className="text-gray-300">${crypto.high24h?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">24h Low:</span>
                <span className="text-gray-300">${crypto.low24h?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Volume:</span>
                <span className="text-gray-300">${(crypto.volume24h / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPrices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No cryptocurrencies found</p>
        </div>
      )}
    </div>
  );
}

export default CryptoPage;

