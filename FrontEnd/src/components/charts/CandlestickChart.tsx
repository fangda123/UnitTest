import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  CandlestickData,
  HistogramData
} from 'lightweight-charts';

interface CandlestickChartProps {
  candleData: CandlestickData[];
  volumeData: HistogramData[];
  title?: string;
}

/**
 * Candlestick Chart Component - ใช้ TradingView Lightweight Charts
 * แสดงกราฟแท่งเทียนพร้อม Volume แบบมืออาชีพ
 */
export const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  candleData,
  volumeData,
  title = 'BTC/USDT'
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // สร้าง chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1F2937' },
        textColor: '#D1D5DB',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3B82F6',
        },
        horzLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3B82F6',
        },
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'th-TH',
        priceFormatter: (price: number) => {
          return '$' + price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        },
      },
    });

    chartRef.current = chart;

    // สร้าง candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    candleSeriesRef.current = candleSeries;
    candleSeries.setData(candleData);

    // สร้าง volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: '#3B82F6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeriesRef.current = volumeSeries;
    volumeSeries.setData(volumeData);

    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // ใช้ ResizeObserver เพื่อตรวจจับการเปลี่ยนขนาดของ Container
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current) {
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [candleData, volumeData]);

  // คำนวณสถิติ
  const latestCandle = candleData[candleData.length - 1];
  const firstCandle = candleData[0];
  const priceChange = latestCandle.close - firstCandle.open;
  const priceChangePercent = (priceChange / firstCandle.open) * 100;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold text-white">
              ${latestCandle.close.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
            1D
          </button>
          <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            1W
          </button>
          <button className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
            1M
          </button>
          <button className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
            1Y
          </button>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="flex-1" />
      
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="p-2 bg-gray-700 rounded">
          <div className="text-xs text-gray-400">Open</div>
          <div className="text-sm font-semibold text-white">
            ${latestCandle.open.toLocaleString()}
          </div>
        </div>
        <div className="p-2 bg-gray-700 rounded">
          <div className="text-xs text-gray-400">High</div>
          <div className="text-sm font-semibold text-green-400">
            ${latestCandle.high.toLocaleString()}
          </div>
        </div>
        <div className="p-2 bg-gray-700 rounded">
          <div className="text-xs text-gray-400">Low</div>
          <div className="text-sm font-semibold text-red-400">
            ${latestCandle.low.toLocaleString()}
          </div>
        </div>
        <div className="p-2 bg-gray-700 rounded">
          <div className="text-xs text-gray-400">Close</div>
          <div className="text-sm font-semibold text-white">
            ${latestCandle.close.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

