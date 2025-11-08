import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';

/**
 * Component สำหรับแสดง TradingView Lightweight Chart
 * เหมาะสำหรับแสดงข้อมูล Candlestick แบบ real-time
 * พร้อมฟีเจอร์ซูมและเลื่อนดูข้อมูล
 */

interface TradingViewChartProps {
  title: string;
  data: CandlestickData[];
  height?: number;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  title, 
  data, 
  height = 400 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // สร้าง chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: {
          color: '#0ea5e9',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0ea5e9',
        },
        horzLine: {
          color: '#0ea5e9',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0ea5e9',
        },
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // เพิ่ม candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // ตั้งค่าข้อมูล
    if (data && data.length > 0) {
      candlestickSeries.setData(data);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [height]);

  // อัพเดทข้อมูลเมื่อ data เปลี่ยน
  useEffect(() => {
    if (candlestickSeriesRef.current && data && data.length > 0) {
      candlestickSeriesRef.current.setData(data);
    }
  }, [data]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary-500 rounded-full animate-pulse"></span>
          {title}
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            Live
          </span>
        </h3>
      </div>
      <div className="flex-1 p-4">
        <div 
          ref={chartContainerRef} 
          className="w-full rounded-lg overflow-hidden shadow-lg"
          style={{ height: `${height}px` }}
        />
        <div className="mt-4 flex gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-danger rounded"></div>
            <span>Bearish</span>
          </div>
          <div className="ml-auto">
            Scroll to zoom • Drag to pan
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingViewChart;

