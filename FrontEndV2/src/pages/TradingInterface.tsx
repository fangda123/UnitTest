import React, { useEffect, useState } from 'react';
import TradingTopBar from '../components/Trading/TradingTopBar';
import OrderBook from '../components/Trading/OrderBook';
import TradingViewChart from '../components/Charts/TradingViewChart';
import MarketTrades from '../components/Trading/MarketTrades';
import TradingBot from '../components/Trading/TradingBot';
import { useTrading } from '../contexts/TradingContext';
import { cryptoAPI } from '../services/api';
import type { CandlestickData, HistogramData, LineData } from 'lightweight-charts';

const TradingInterface: React.FC = () => {
  const symbol = 'BTCUSDT';
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [volumeData, setVolumeData] = useState<HistogramData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1w');
  const [loading, setLoading] = useState(true);
  
  // ดึงข้อมูล predictions จาก TradingContext
  const { predictions, priceHistory } = useTrading();

  // Map timeframe to Binance interval
  const timeframeMap: Record<string, string> = {
    '1s': '1m', // Use 1m as closest to 1s
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
  };

  const fetchKlines = async (interval: string) => {
    try {
      setLoading(true);
      const binanceInterval = timeframeMap[interval] || '1w';
      
      // Fetch klines from backend API
      const response = await cryptoAPI.getKlines(symbol, {
        interval: binanceInterval,
        limit: 500,
      });

      const klines = response.data?.data || response.data || [];

      // Convert to candlestick format
      const candlesticks: CandlestickData[] = klines.map((kline: any) => {
        const timestamp = kline.openTime || kline.timestamp || kline.time || kline[0];
        return {
          time: (typeof timestamp === 'number' ? timestamp : parseInt(timestamp)) / 1000 as any, // Convert to seconds
          open: parseFloat(kline.open || kline[1] || 0),
          high: parseFloat(kline.high || kline[2] || 0),
          low: parseFloat(kline.low || kline[3] || 0),
          close: parseFloat(kline.close || kline[4] || 0),
        };
      }).filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);

      // Convert to volume format
      const volumes: HistogramData[] = klines.map((kline: any) => {
        const timestamp = kline.openTime || kline.timestamp || kline.time || kline[0];
        const close = parseFloat(kline.close || kline[4] || 0);
        const open = parseFloat(kline.open || kline[1] || 0);
        const isUp = close >= open;
        
        return {
          time: (typeof timestamp === 'number' ? timestamp : parseInt(timestamp)) / 1000 as any,
          value: parseFloat(kline.volume || kline[5] || 0),
          color: isUp ? '#10b981' : '#ef4444',
        };
      }).filter(v => v.value > 0);

      setCandlestickData(candlesticks);
      setVolumeData(volumes);

      // Set current price from latest candle
      if (candlesticks.length > 0) {
        setCurrentPrice(candlesticks[candlesticks.length - 1].close);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching klines:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKlines(selectedTimeframe);
    const interval = setInterval(() => fetchKlines(selectedTimeframe), 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

  // แปลง predictions เป็น LineData สำหรับแสดงในกราฟ
  const predictionLineData: LineData[] = React.useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    
    // หา timestamp ล่าสุดจาก priceHistory หรือ candlestick data
    let lastTime = Date.now() / 1000;
    
    if (priceHistory && priceHistory.length > 0) {
      const lastHistory = priceHistory[priceHistory.length - 1];
      if (lastHistory) {
        const historyTimestamp = lastHistory.timestamp 
          ? (typeof lastHistory.timestamp === 'number' ? lastHistory.timestamp : parseInt(lastHistory.timestamp)) / 1000
          : lastHistory.date 
            ? new Date(lastHistory.date).getTime() / 1000
            : Date.now() / 1000;
        lastTime = historyTimestamp;
      }
    } else if (candlestickData.length > 0) {
      lastTime = candlestickData[candlestickData.length - 1].time as number;
    }
    
    return predictions.map((pred: any, index: number) => {
      // ใช้ timestamp จาก prediction ถ้ามี ไม่งั้นคำนวณจาก lastTime
      let timestamp = lastTime;
      
      if (pred.timestamp) {
        timestamp = (typeof pred.timestamp === 'number' ? pred.timestamp : parseInt(pred.timestamp)) / 1000;
      } else if (pred.date) {
        timestamp = new Date(pred.date).getTime() / 1000;
      } else {
        // คำนวณ timestamp ต่อจาก lastTime (5 นาทีต่อจุด)
        timestamp = lastTime + (index + 1) * 300;
      }
      
      return {
        time: timestamp as any,
        value: pred.price || pred.predictedPrice || 0,
      };
    }).filter((p: LineData) => p.value > 0);
  }, [predictions, priceHistory, candlestickData]);

  return (
    <div className="min-h-screen bg-dark-900 p-4">
      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Top Bar */}
        <TradingTopBar symbol={symbol} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-4" style={{ minHeight: '600px' }}>
          {/* Left Panel - Order Book */}
          <div className="col-span-2">
            <div style={{ height: '600px' }}>
              <OrderBook symbol={symbol} />
            </div>
          </div>

          {/* Center Panel - Chart */}
          <div className="col-span-8 flex flex-col">
            <div style={{ height: '600px' }}>
              {loading ? (
                <div className="h-full flex items-center justify-center bg-dark-800 rounded-lg border border-dark-700">
                  <div className="text-gray-400">Loading chart data...</div>
                </div>
              ) : (
                <TradingViewChart
                  title="Chart"
                  data={candlestickData}
                  volumeData={volumeData}
                  predictionData={predictionLineData}
                  height={600}
                  onTimeframeChange={handleTimeframeChange}
                />
              )}
            </div>
          </div>

          {/* Right Panel - Market Trades */}
          <div className="col-span-2">
            <div style={{ height: '600px' }}>
              <MarketTrades symbol={symbol} />
            </div>
          </div>
        </div>

        {/* Bottom Panel - Trading Bot */}
        <div className="grid grid-cols-12 gap-4" style={{ paddingTop: '200px' }}>
          <div className="col-span-12">
            <TradingBot />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInterface;

