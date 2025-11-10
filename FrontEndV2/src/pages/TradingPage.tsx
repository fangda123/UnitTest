import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { tradingAPI } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  RefreshCw,
  DollarSign,
  BarChart3,
  Activity,
  AlertCircle,
  Zap
} from 'lucide-react';
import LineChart from '../components/Charts/LineChart';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1111/ws';

interface TradingSignal {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasons: string[];
  indicators: any;
}

interface Simulation {
  _id: string;
  symbol: string;
  initialInvestment: number;
  currentBalance: number;
  holdings: number;
  totalTrades: number;
  totalProfit: number;
  profitPercentage: number;
  status: 'active' | 'paused' | 'completed';
  settings: any;
}

function TradingPage() {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [investment, setInvestment] = useState<string>('1000');
  const [isConnected, setIsConnected] = useState(false);
  const token = localStorage.getItem('auth_token');

  // ดึงสัญญาณการเทรด
  const fetchSignal = useCallback(async () => {
    try {
      const response = await tradingAPI.getTradingSignal('BTCUSDT');
      if (response.data && response.data.data) {
        setCurrentPrice(response.data.data.currentPrice || 0);
        setSignal(response.data.data.signal || null);
        setPriceHistory(response.data.data.history || []);
      }
    } catch (error) {
      console.error('Error fetching signal:', error);
    }
  }, []);

  // ดึงการจำลองการเทรด
  const fetchSimulation = useCallback(async () => {
    try {
      const response = await tradingAPI.getSimulations({ status: 'active' });
      if (response.data.data && response.data.data.length > 0) {
        const sim = response.data.data[0];
        setSimulation(sim);
        
        // ดึงประวัติการเทรด
        const tradesResponse = await tradingAPI.getTrades(sim._id, { limit: 20 });
        setTrades(tradesResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching simulation:', error);
    }
  }, []);

  // อัพเดทการจำลองการเทรด
  const updateSimulation = useCallback(async () => {
    if (!simulation) return;

    try {
      setLoading(true);
      const response = await tradingAPI.updateSimulation(simulation._id);
      setSimulation(response.data.data.simulation);
      setCurrentPrice(response.data.data.currentPrice);
      setSignal(response.data.data.signal);
      
      // ดึงประวัติการเทรดใหม่
      const tradesResponse = await tradingAPI.getTrades(simulation._id, { limit: 20 });
      setTrades(tradesResponse.data.data || []);
    } catch (error) {
      console.error('Error updating simulation:', error);
    } finally {
      setLoading(false);
    }
  }, [simulation]);

  // สร้างการจำลองการเทรดใหม่
  const createSimulation = async () => {
    try {
      setLoading(true);
      const response = await tradingAPI.createSimulation({
        symbol: 'BTCUSDT',
        initialInvestment: parseFloat(investment),
        settings: {
          buyPercentage: 50,
          sellPercentage: 50,
          minConfidence: 60,
        },
      });
      setSimulation(response.data.data);
      setAutoUpdate(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // หยุดการจำลองการเทรด
  const stopSimulation = async () => {
    if (!simulation) return;

    try {
      setLoading(true);
      await tradingAPI.stopSimulation(simulation._id);
      setAutoUpdate(false);
      await fetchSimulation();
    } catch (error) {
      console.error('Error stopping simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket connection
  const { isConnected: wsConnected } = useWebSocket({
    url: WS_URL,
    token: token || undefined,
    onMessage: (message) => {
      if (message.type === 'crypto.price.update' && message.data?.symbol === 'BTCUSDT') {
        setCurrentPrice(message.data.price);
        if (autoUpdate && simulation) {
          updateSimulation();
        }
      }
    },
    onConnected: () => {
      setIsConnected(true);
    },
    autoReconnect: true,
  });

  useEffect(() => {
    fetchSignal();
    fetchSimulation();
    
    // Auto update signal ทุก 10 วินาที
    const interval = setInterval(() => {
      fetchSignal();
      if (autoUpdate && simulation) {
        updateSimulation();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchSignal, fetchSimulation, autoUpdate, simulation, updateSimulation]);

  const profit = simulation
    ? simulation.currentBalance + (simulation.holdings * currentPrice) - simulation.initialInvestment
    : 0;
  const profitPercentage = simulation
    ? (profit / simulation.initialInvestment) * 100
    : 0;

  const chartData = {
    categories: priceHistory.map((_, i) => `${i + 1}`),
    series: [{
      name: 'BTC Price',
      data: priceHistory.map(h => h.price),
    }],
  };

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary-500" />
          Trading Simulation
        </h1>
        <p className="text-gray-400">จำลองการเทรดอัตโนมัติด้วย BTC</p>
      </div>

      {/* Current Price & Signal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <p className="text-gray-400 text-sm mb-2">Current Price</p>
          <p className="text-3xl font-bold text-gray-100">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
            <span className="text-xs text-gray-500">
              {wsConnected ? 'Real-time' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <p className="text-gray-400 text-sm mb-2">Trading Signal</p>
          {signal ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                {signal.signal === 'buy' && <TrendingUp className="w-6 h-6 text-success" />}
                {signal.signal === 'sell' && <TrendingDown className="w-6 h-6 text-danger" />}
                {signal.signal === 'hold' && <Activity className="w-6 h-6 text-gray-400" />}
                <span className={`text-2xl font-bold ${
                  signal.signal === 'buy' ? 'text-success' :
                  signal.signal === 'sell' ? 'text-danger' : 'text-gray-400'
                }`}>
                  {signal.signal.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-400">Confidence: {signal.confidence}%</p>
            </>
          ) : (
            <p className="text-gray-400">Loading...</p>
          )}
        </div>

        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <p className="text-gray-400 text-sm mb-2">Profit/Loss</p>
          {simulation ? (
            <>
              <p className={`text-3xl font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
              </p>
              <p className={`text-sm ${profitPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
              </p>
            </>
          ) : (
            <p className="text-gray-400">No active simulation</p>
          )}
        </div>
      </div>

      {/* Create/Control Simulation */}
      {!simulation ? (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 mb-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">เริ่มต้นการจำลองการเทรด</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">จำนวนเงินลงทุน (USD)</label>
              <input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                placeholder="1000"
                min="1"
              />
            </div>
            <button
              onClick={createSimulation}
              disabled={loading || !investment}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              เริ่มต้น
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-100">การจำลองการเทรด</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoUpdate(!autoUpdate)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoUpdate
                    ? 'bg-success/20 text-success border border-success/50'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                <Zap className="w-4 h-4" />
                Auto: {autoUpdate ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={updateSimulation}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Update
              </button>
              <button
                onClick={stopSimulation}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-danger/20 text-danger hover:bg-danger/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Initial Investment</p>
              <p className="text-lg font-bold text-gray-100">
                ${simulation.initialInvestment.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Balance</p>
              <p className="text-lg font-bold text-gray-100">
                ${simulation.currentBalance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Holdings</p>
              <p className="text-lg font-bold text-gray-100">
                {simulation.holdings.toFixed(8)} BTC
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Trades</p>
              <p className="text-lg font-bold text-gray-100">
                {simulation.totalTrades}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      {priceHistory.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 mb-6">
          <LineChart
            title="BTC Price History"
            data={chartData}
            height={300}
            smooth={true}
          />
        </div>
      )}

      {/* Signal Details */}
      {signal && signal.reasons && signal.reasons.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 mb-6">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Signal Details</h3>
          <div className="space-y-2">
            {signal.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertCircle className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Recent Trades</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 text-gray-400">Type</th>
                  <th className="text-left py-2 text-gray-400">Price</th>
                  <th className="text-left py-2 text-gray-400">Quantity</th>
                  <th className="text-left py-2 text-gray-400">Amount</th>
                  <th className="text-left py-2 text-gray-400">Profit</th>
                  <th className="text-left py-2 text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade._id} className="border-b border-dark-700/50">
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.type === 'buy'
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-gray-300">${trade.price.toFixed(2)}</td>
                    <td className="py-2 text-gray-300">{trade.quantity.toFixed(8)}</td>
                    <td className="py-2 text-gray-300">${trade.amount.toFixed(2)}</td>
                    <td className={`py-2 font-semibold ${
                      trade.profit >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                    </td>
                    <td className="py-2 text-gray-400 text-sm">
                      {new Date(trade.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingPage;

