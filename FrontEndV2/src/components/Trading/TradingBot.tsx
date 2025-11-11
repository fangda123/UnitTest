import React, { useState, useEffect } from 'react';
import { useTrading } from '../../contexts/TradingContext';
import { usePrice } from '../../contexts/PriceContext';
import { 
  Play, 
  Square, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  Wallet,
  Target,
  Award,
  Zap,
  AlertCircle,
  Sparkles,
  Rocket
} from 'lucide-react';
import { formatThaiBaht, formatPercentage, thbToUsd, usdToThb } from '../../utils/currencyUtils';

const TradingBot: React.FC = () => {
  const {
    simulation,
    currentPrice: tradingPrice,
    signal,
    trades,
    priceHistory,
    predictions,
    loading,
    autoUpdate,
    isConnected,
    createSimulation: createSim,
    stopSimulation: stopSim,
    updateSimulation,
    setAutoUpdate,
  } = useTrading();

  // ใช้ราคาจาก PriceContext (WebSocket) เพื่อให้อัพเดทเร็วเท่ากับด้านบน
  const { prices: realtimePrices } = usePrice();
  const btcPriceData = realtimePrices.get('BTCUSDT');
  const realtimePrice = btcPriceData?.price || 0;
  
  // ใช้ราคาจาก PriceContext ถ้ามี (เร็วกว่า) ไม่งั้นใช้จาก TradingContext
  const currentPrice = realtimePrice > 0 ? realtimePrice : tradingPrice;

  const [investment, setInvestment] = useState<string>('10000');
  const [initialBuyPercentage, setInitialBuyPercentage] = useState<string>('70');
  const [isCreating, setIsCreating] = useState(false);

  // คำนวณ Profit/Loss
  const profit = simulation && currentPrice > 0
    ? (simulation.currentBalance + (simulation.holdings * currentPrice)) - simulation.initialInvestment
    : simulation?.totalProfit || 0;
  const profitPercentage = simulation && simulation.initialInvestment > 0
    ? (profit / simulation.initialInvestment) * 100
    : simulation?.profitPercentage || 0;

  // สถิติการเทรด
  const stats = {
    totalTrades: simulation?.totalTrades || 0,
    winTrades: trades.filter((t: any) => t.type === 'sell' && (t.profit || 0) > 0).length,
    lossTrades: trades.filter((t: any) => t.type === 'sell' && (t.profit || 0) < 0).length,
    winRate: trades.filter((t: any) => t.type === 'sell').length > 0
      ? (trades.filter((t: any) => t.type === 'sell' && (t.profit || 0) > 0).length / trades.filter((t: any) => t.type === 'sell').length) * 100
      : 0,
  };

  const handleCreateSimulation = async () => {
    if (isCreating || loading) return;

    try {
      setIsCreating(true);
      // รับค่าเป็น USD แล้ว (ไม่ต้องแปลง)
      const investmentUSD = parseFloat(investment) || 0;
      const initialBuyPercent = parseFloat(initialBuyPercentage || '70');

      const settings = {
        buyPercentage: 70,
        minBuyAmount: 3, // $3 USD
        maxBuyAmount: 30, // $30 USD
        sellPercentage: 70,
        minSellAmount: 0.0001,
        maxSellAmount: 0.01,
        minConfidence: 40, // AGGRESSIVE: ลด confidence เพื่อเทรดบ่อยขึ้น
        initialBuyPercentage: initialBuyPercent,
      };

      await createSim(investmentUSD, 'BTCUSDT', settings);
      setAutoUpdate(true); // เปิด auto trading ทันที
      setIsCreating(false);
    } catch (error: any) {
      setIsCreating(false);
      console.error('Error creating simulation:', error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด'}`);
    }
  };

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Rocket className="w-8 h-8 text-primary-500 animate-bounce" />
            <Sparkles className="w-4 h-4 text-warning-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-success-400">
              🤖 Auto Trading Bot
            </h3>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
              {isConnected ? 'Connected' : 'Disconnected'}
              {autoUpdate && (
                <span className="ml-2 px-2 py-1 bg-success/20 text-success rounded-full text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Auto Trading ON
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Create Simulation Form */}
      {!simulation ? (
        <div className="space-y-4">
          <div className="p-4 bg-primary-900/20 border border-primary-700/50 rounded-lg">
            <p className="text-sm text-primary-300 font-semibold">💰 ระบบเทรดอัตโนมัติ - กำไรมากที่สุด</p>
            <p className="text-xs text-gray-400 mt-1">บอทจะเทรดอัตโนมัติตามสัญญาณ ML และ Technical Analysis</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">เงินลงทุนเริ่มต้น (USD)</label>
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
              placeholder="300"
              min="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              แนะนำ: $300 ขึ้นไปเพื่อผลลัพธ์ที่ดี
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              เปอร์เซ็นต์การซื้อครั้งแรก (%)
              <span className="ml-2 text-xs text-success-400 font-bold">⚡ AGGRESSIVE: แนะนำ 70%</span>
            </label>
            <input
              type="number"
              value={initialBuyPercentage}
              onChange={(e) => setInitialBuyPercentage(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
              min="0"
              max="100"
              placeholder="70"
            />
            <p className="text-xs text-success-400 mt-1 font-semibold">
              ⚡ AGGRESSIVE MODE: เปอร์เซ็นต์ของเงินลงทุนที่จะซื้อทันทีเมื่อเริ่มการเทรด (แนะนำ 70% เพื่อให้ได้กำไรมากและเร็วที่สุด)
            </p>
          </div>

          <button
            onClick={handleCreateSimulation}
            disabled={loading || isCreating}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-success-500 hover:from-primary-600 hover:to-success-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading || isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>กำลังเริ่มต้น...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>🚀 เริ่มเทรดอัตโนมัติ - กำไรมากที่สุด!</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Current Price */}
            <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-4 border border-primary-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">ราคาปัจจุบัน</p>
                <DollarSign className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-xl font-bold text-gray-100">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Profit/Loss */}
            <div className={`bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-4 border ${
              profit >= 0 ? 'border-success-500/30' : 'border-danger-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">กำไร/ขาดทุน</p>
                {profit >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              <p className={`text-xl font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                ${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs ${profitPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatPercentage(profitPercentage)}
              </p>
            </div>

            {/* Signal */}
            <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-4 border border-warning-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">สัญญาณ</p>
                <Target className="w-4 h-4 text-warning-400" />
              </div>
              {signal && signal.signal ? (
                <>
                  <div className="flex items-center gap-2">
                    {signal.signal === 'buy' && <TrendingUp className="w-5 h-5 text-success" />}
                    {signal.signal === 'sell' && <TrendingDown className="w-5 h-5 text-danger" />}
                    {signal.signal === 'hold' && <Activity className="w-5 h-5 text-gray-400" />}
                    <span className={`text-lg font-bold ${
                      signal.signal === 'buy' ? 'text-success' :
                      signal.signal === 'sell' ? 'text-danger' : 'text-gray-400'
                    }`}>
                      {signal.signal.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-warning-400 mt-1">
                    Confidence: {signal.confidence || 0}%
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">กำลังโหลด...</p>
              )}
            </div>

            {/* Balance */}
            <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-4 border border-primary-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">ยอดเงิน</p>
                <Wallet className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-lg font-bold text-gray-100">
                ${simulation.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                {simulation.holdings.toFixed(8)} BTC
              </p>
            </div>
          </div>

          {/* Trading Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-success-500/20 rounded-xl p-4 border border-success-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">Win Rate</p>
                <Award className="w-4 h-4 text-success-400" />
              </div>
              <p className="text-2xl font-bold text-success-400">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.winTrades}W / {stats.lossTrades}L
              </p>
            </div>

            <div className="bg-primary-500/20 rounded-xl p-4 border border-primary-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">Total Trades</p>
                <Activity className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-2xl font-bold text-primary-400">
                {stats.totalTrades}
              </p>
            </div>

            <div className="bg-warning-500/20 rounded-xl p-4 border border-warning-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">Total Value</p>
                <DollarSign className="w-4 h-4 text-warning-400" />
              </div>
              <p className="text-2xl font-bold text-warning-400">
                ${(simulation.currentBalance + (simulation.holdings * currentPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-3 bg-dark-700/50 rounded-lg border border-primary-500/20 flex-1">
              <input
                type="checkbox"
                id="autoUpdate"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="autoUpdate" className="text-sm text-gray-300 cursor-pointer flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning-400" />
                Auto Trading (บอทจะเทรดอัตโนมัติ)
              </label>
            </div>

            <button
              onClick={updateSimulation}
              disabled={loading}
              className="px-4 py-2 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 rounded-lg transition-colors flex items-center gap-2 border border-primary-500/30 disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Update Now
            </button>

            <button
              onClick={async () => {
                await stopSim();
                setAutoUpdate(false);
              }}
              className="px-4 py-2 bg-danger-500/20 text-danger-400 hover:bg-danger-500/30 rounded-lg transition-colors flex items-center gap-2 border border-danger-500/30"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>

          {/* Data Points Info */}
          <div className="p-4 bg-dark-700/50 rounded-lg border border-primary-500/20">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" />
              ข้อมูลที่ใช้ในการคำนวณ
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">จุดข้อมูลย้อนหลัง (History)</p>
                <p className="text-lg font-bold text-primary-400">
                  {priceHistory?.length || 0} จุด
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {priceHistory && priceHistory.length >= 365 ? '✅ ข้อมูลครบ 1 ปี' : 
                   priceHistory && priceHistory.length >= 30 ? '⚠️ ข้อมูลเพียงพอ' : 
                   '❌ ข้อมูลไม่เพียงพอ'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">จุดการคำนวณล่วงหน้า (Predictions)</p>
                <p className="text-lg font-bold text-warning-400">
                  {predictions?.length || 0} จุด
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {predictions && predictions.length > 0 ? '✅ มีการคำนวณ' : '⏳ กำลังคำนวณ...'}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-dark-600">
              <p className="text-xs text-gray-400">
                <span className="text-primary-400 font-semibold">รวม:</span> {((priceHistory?.length || 0) + (predictions?.length || 0))} จุด
                {' '}
                {priceHistory && priceHistory.length >= 365 && predictions && predictions.length > 0 && (
                  <span className="text-success-400 ml-2">✅ พร้อมเทรด</span>
                )}
              </p>
            </div>
          </div>

          {/* Signal Details */}
          {signal && signal.reasons && signal.reasons.length > 0 && (
            <div className="p-4 bg-dark-700/50 rounded-lg border border-primary-500/20">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary-400" />
                Signal Reasons
              </h4>
              <div className="space-y-1">
                {signal.reasons.map((reason, index) => (
                  <div key={index} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-primary-400 mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Trades */}
          {trades.length > 0 && (
            <div className="p-4 bg-dark-700/50 rounded-lg border border-primary-500/20">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-400" />
                Recent Trades
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trades.slice(0, 5).map((trade: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-dark-800/50 rounded-lg border border-dark-600/50 hover:border-primary-500/30 transition-all"
                  >
                    {/* Trade Header */}
                    <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.type === 'buy' ? 'bg-success/20 text-success border border-success/50' : 'bg-danger/20 text-danger border border-danger/50'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                        <span className="text-xs text-gray-300 font-semibold">
                        ${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                        {trade.quantity && (
                          <span className="text-xs text-gray-500">
                            ({trade.quantity.toFixed(8)} BTC)
                          </span>
                        )}
                    </div>
                    {trade.profit !== undefined && trade.profit !== null && trade.type === 'sell' && (
                      <span className={`text-xs font-semibold ${
                        trade.profit > 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      )}
                    </div>
                    
                    {/* Trade Reasons */}
                    {trade.signal && trade.signal.reasons && trade.signal.reasons.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-dark-600/50">
                        <p className="text-xs text-gray-500 mb-1.5 font-semibold">เหตุผลในการตัดสินใจ:</p>
                        <div className="space-y-1">
                          {trade.signal.reasons.map((reason: string, idx: number) => (
                            <div key={idx} className="text-xs flex items-start gap-1.5">
                              <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>
                              <span className={`text-gray-300 ${
                                reason.includes('✅') || reason.includes('BUY') || reason.includes('SELL') ? 'text-success' : 
                                reason.includes('⚠️') || reason.includes('WARNING') ? 'text-warning' : 
                                reason.includes('❌') || reason.includes('RISK') ? 'text-danger' : ''
                              }`}>
                                {reason}
                              </span>
                            </div>
                          ))}
                        </div>
                        {trade.signal.confidence && (
                          <div className="mt-2 pt-2 border-t border-dark-600/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Confidence:</span>
                              <span className="text-warning-400 font-semibold">{trade.signal.confidence}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-dark-600/50">
                        <p className="text-xs text-gray-500 italic">ไม่มีเหตุผลในการตัดสินใจ</p>
                      </div>
                    )}
                    
                    {/* Trade Time */}
                    {trade.createdAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(trade.createdAt).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingBot;

