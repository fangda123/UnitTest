import { useState, useEffect, useMemo } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { usePrice } from '../contexts/PriceContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  Zap,
  Activity,
  DollarSign,
  BarChart3,
  Sparkles,
  Rocket,
  Target,
  Award,
  Flame,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Wallet
} from 'lucide-react';
import LineChart from '../components/Charts/LineChart';
import { formatThaiBaht, formatPercentage, thbToUsd, usdToThb } from '../utils/currencyUtils';

function TradingPageV2() {
  const {
    simulation,
    currentPrice,
    signal,
    priceHistory,
    predictions,
    trades,
    loading,
    autoUpdate,
    isConnected,
    createSimulation: createSim,
    stopSimulation: stopSim,
    setAutoUpdate,
  } = useTrading();

  const { prices: realtimePrices, isConnected: priceConnected } = usePrice();

  const [investment, setInvestment] = useState<string>('1000');
  const [isCreating, setIsCreating] = useState(false);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);

  // อัพเดทราคาและคำนวณการเปลี่ยนแปลงแบบ real-time (ทันทีเมื่อราคาเปลี่ยน)
  useEffect(() => {
    const btcPrice = realtimePrices?.get('BTCUSDT');
    if (btcPrice && btcPrice.price) {
      const newPrice = btcPrice.price;
      if (lastPrice > 0 && newPrice !== lastPrice) {
        const change = newPrice - lastPrice;
        const changePercent = (change / lastPrice) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
        
        // Reset animation after 1 second
        setTimeout(() => {
          setPriceChange(0);
          setPriceChangePercent(0);
        }, 1000);
      }
      setLastPrice(newPrice);
    }
  }, [realtimePrices]);

  // คำนวณกำไร/ขาดทุน
  const profit = useMemo(() => {
    if (!simulation) return 0;
    const currentValue = simulation.currentBalance + (simulation.holdings * currentPrice);
    return currentValue - simulation.initialInvestment;
  }, [simulation, currentPrice]);

  const profitPercentage = useMemo(() => {
    if (!simulation || simulation.initialInvestment === 0) return 0;
    return (profit / simulation.initialInvestment) * 100;
  }, [simulation, profit]);

  // คำนวณสถิติ
  const stats = useMemo(() => {
    if (!simulation || trades.length === 0) {
      return {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        avgProfit: 0,
        totalProfit: 0,
      };
    }

    const sellTrades = trades.filter(t => t.type === 'sell');
    const winTrades = sellTrades.filter(t => t.profit > 0);
    const lossTrades = sellTrades.filter(t => t.profit < 0);
    const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = sellTrades.length > 0 ? totalProfit / sellTrades.length : 0;

    return {
      totalTrades: simulation.totalTrades || 0,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate: sellTrades.length > 0 ? (winTrades.length / sellTrades.length) * 100 : 0,
      avgProfit,
      totalProfit,
    };
  }, [simulation, trades]);

  // Chart data
  const chartData = useMemo(() => {
    if (priceHistory.length === 0) {
      return {
        categories: [],
        series: [{
          name: 'Price',
          data: [],
          color: '#0ea5e9',
        }],
      };
    }

    return {
      categories: priceHistory.map((_, i) => `${i + 1}`),
      series: [
        {
          name: 'BTC Price',
          data: priceHistory.map(h => h.price),
          color: '#0ea5e9',
        },
        ...(predictions.length > 0 ? [{
          name: 'Prediction',
          data: predictions.map(p => p.price),
          color: '#f59e0b',
          dashStyle: 'Dash' as const,
        }] : []),
      ],
    };
  }, [priceHistory, predictions]);

  // สร้างการจำลองการเทรด
  const handleCreateSimulation = async () => {
    if (isCreating || loading) return;

    try {
      setIsCreating(true);
      const investmentUSD = thbToUsd(parseFloat(investment));
      
      const settings = {
        buyPercentage: 30,
        minBuyAmount: thbToUsd(50),
        maxBuyAmount: thbToUsd(500),
        sellPercentage: 30,
        minSellAmount: 0.0001,
        maxSellAmount: 0.01,
        minConfidence: 60,
      };

      await createSim(investmentUSD, 'BTCUSDT', settings);
    } catch (error: any) {
      console.error('Error creating simulation:', error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // หยุดการเทรด
  const handleStop = async () => {
    await stopSim();
    setInvestment('1000');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-success-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-warning-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header with Glow Effect */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Rocket className="w-12 h-12 text-primary-500 animate-bounce" />
                <Sparkles className="w-6 h-6 text-warning-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-warning-400 to-success-400 mb-2">
                  ⚡ Trading Pro V2
                </h1>
                <p className="text-gray-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isConnected && priceConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                  {isConnected && priceConnected ? 'Real-time Active' : 'Disconnected'}
                  {autoUpdate && (
                    <span className="ml-2 px-2 py-1 bg-success/20 text-success rounded-full text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Auto Trading
                    </span>
                  )}
                </p>
              </div>
            </div>

            {simulation && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-3 bg-danger/20 hover:bg-danger/30 text-danger rounded-xl transition-all duration-300 hover:scale-105 border border-danger/50 shadow-lg shadow-danger/20"
              >
                <Square className="w-5 h-5" />
                <span className="font-semibold">Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Stats Cards - Animated */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Current Price Card */}
          <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-primary-500/30 shadow-2xl shadow-primary-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Current Price</p>
                <Coins className="w-5 h-5 text-primary-400 animate-pulse" />
              </div>
              <p className="text-3xl font-bold text-gray-100 mb-1">
                {formatThaiBaht(currentPrice)}
              </p>
              {priceChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                  {priceChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{formatPercentage(Math.abs(priceChangePercent))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profit/Loss Card */}
          <div className={`relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border shadow-2xl overflow-hidden group hover:scale-105 transition-transform duration-300 ${
            profit >= 0 
              ? 'border-success-500/30 shadow-success-500/20' 
              : 'border-danger-500/30 shadow-danger-500/20'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              profit >= 0 
                ? 'from-success-500/0 via-success-500/10 to-success-500/0' 
                : 'from-danger-500/0 via-danger-500/10 to-danger-500/0'
            }`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Profit/Loss</p>
                {profit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success animate-pulse" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger animate-pulse" />
                )}
              </div>
              <p className={`text-3xl font-bold mb-1 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatThaiBaht(profit)}
              </p>
              <p className={`text-sm font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatPercentage(profitPercentage)}
              </p>
            </div>
          </div>

          {/* Signal Card */}
          <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-warning-500/30 shadow-2xl shadow-warning-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-warning-500/0 via-warning-500/10 to-warning-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Signal</p>
                <Target className="w-5 h-5 text-warning-400 animate-pulse" />
              </div>
              {signal && signal.signal ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    {signal.signal === 'buy' && <TrendingUp className="w-6 h-6 text-success animate-bounce" />}
                    {signal.signal === 'sell' && <TrendingDown className="w-6 h-6 text-danger animate-bounce" />}
                    {signal.signal === 'hold' && <Activity className="w-6 h-6 text-gray-400" />}
                    <span className={`text-2xl font-bold ${
                      signal.signal === 'buy' ? 'text-success' :
                      signal.signal === 'sell' ? 'text-danger' : 'text-gray-400'
                    }`}>
                      {signal.signal.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-warning-400 font-semibold">
                    {signal.confidence || 0}% Confidence
                  </p>
                </>
              ) : (
                <p className="text-gray-400">Loading...</p>
              )}
            </div>
          </div>

          {/* Balance Card */}
          <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-primary-500/30 shadow-2xl shadow-primary-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Balance</p>
                <Wallet className="w-5 h-5 text-primary-400" />
              </div>
              {simulation ? (
                <>
                  <p className="text-2xl font-bold text-gray-100 mb-1">
                    {formatThaiBaht(usdToThb(simulation.currentBalance))}
                  </p>
                  <p className="text-xs text-gray-500">
                    Holdings: {simulation.holdings.toFixed(8)} BTC
                  </p>
                </>
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Trading Stats - Win Rate & Performance */}
        {simulation && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-success-500/20 to-success-500/5 rounded-2xl p-6 border border-success-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Win Rate</p>
                <Award className="w-5 h-5 text-success-400" />
              </div>
              <p className="text-3xl font-bold text-success-400">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.winTrades}W / {stats.lossTrades}L
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-2xl p-6 border border-primary-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Trades</p>
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-3xl font-bold text-primary-400">
                {stats.totalTrades}
              </p>
            </div>

            <div className="bg-gradient-to-br from-warning-500/20 to-warning-500/5 rounded-2xl p-6 border border-warning-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg Profit</p>
                <Gauge className="w-5 h-5 text-warning-400" />
              </div>
              <p className={`text-3xl font-bold ${stats.avgProfit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {formatThaiBaht(usdToThb(stats.avgProfit))}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Profit</p>
                <Flame className="w-5 h-5 text-purple-400" />
              </div>
              <p className={`text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {formatThaiBaht(usdToThb(stats.totalProfit))}
              </p>
            </div>
          </div>
        )}

        {/* Initial Investment Form */}
        {!simulation && (
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-8 border border-primary-500/30 shadow-2xl mb-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary-400" />
                เริ่มต้นการเทรด
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">เงินลงทุนเริ่มต้น (บาทไทย)</label>
                  <input
                    type="number"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 text-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
                    placeholder="1000"
                    min="1"
                  />
                </div>
                <button
                  onClick={handleCreateSimulation}
                  disabled={isCreating || loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-warning-500 hover:from-primary-600 hover:to-warning-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating || loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>กำลังเริ่มต้น...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>เริ่มการเทรด</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        {simulation && priceHistory.length > 0 && (
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/30 shadow-2xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary-400" />
                Price Chart
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-500 rounded"></div>
                  <span className="text-gray-400">Price</span>
                </div>
                {predictions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-warning-500 rounded border-2 border-dashed"></div>
                    <span className="text-gray-400">Prediction</span>
                  </div>
                )}
              </div>
            </div>
            <LineChart
              title=""
              data={chartData}
              height={400}
              smooth={true}
            />
          </div>
        )}

        {/* Signal Details with Animation */}
        {signal && signal.reasons && signal.reasons.length > 0 && (
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-6 border border-warning-500/30 shadow-2xl mb-8">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-warning-400" />
              Signal Analysis
            </h3>
            <div className="space-y-3">
              {signal.reasons.map((reason, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 bg-dark-700/50 rounded-xl border border-dark-600 hover:border-warning-500/50 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    reason.includes('✅') ? 'bg-success animate-pulse' :
                    reason.includes('⚠️') ? 'bg-warning animate-pulse' :
                    reason.includes('❌') ? 'bg-danger animate-pulse' :
                    'bg-primary-400'
                  }`}></div>
                  <span className="text-sm text-gray-300 flex-1">
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Trades Table - Enhanced */}
        {trades.length > 0 && (
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/30 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary-400" />
              Recent Trades
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-600">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Quantity</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Profit/Loss</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Reasons</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 10).map((trade: any, index: number) => {
                    const tradeProfit = trade.profit || 0;
                    const tradeProfitPercent = trade.profitPercentage || 0;
                    return (
                      <tr 
                        key={index} 
                        className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-all duration-200"
                      >
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-lg font-semibold text-xs ${
                            trade.type === 'buy' 
                              ? 'bg-success/20 text-success border border-success/50' 
                              : 'bg-danger/20 text-danger border border-danger/50'
                          }`}>
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-semibold">
                          {formatThaiBaht(usdToThb(trade.price))}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {trade.quantity.toFixed(8)} BTC
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {formatThaiBaht(usdToThb(trade.amount))}
                        </td>
                        <td className="py-3 px-4">
                          {trade.type === 'sell' ? (
                            <div className={`font-bold ${tradeProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                              <div>{formatThaiBaht(usdToThb(tradeProfit))}</div>
                              <div className="text-xs">{formatPercentage(tradeProfitPercent)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm max-w-md">
                          {trade.signal && trade.signal.reasons && trade.signal.reasons.length > 0 ? (
                            <div className="space-y-1">
                              {trade.signal.reasons.map((reason: string, idx: number) => (
                                <div key={idx} className="text-xs flex items-start gap-1">
                                  <span className="text-primary-400 mt-0.5">•</span>
                                  <span className={reason.includes('✅') ? 'text-success' : reason.includes('⚠️') ? 'text-warning' : ''}>
                                    {reason}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">ไม่มีเหตุผล</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {new Date(trade.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TradingPageV2;

