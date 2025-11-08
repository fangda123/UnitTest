import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';

interface LineChartProps {
  data: LineData[];
  title?: string;
  color?: string;
}

/**
 * Line Chart Component - ใช้ TradingView Lightweight Charts
 * แสดงกราฟเส้นสำหรับข้อมูลราคาตามเวลา
 */
export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  title = 'Line Chart',
  color = '#3B82F6'
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // สร้าง chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
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

    // สร้าง line series
    const lineSeries = chart.addLineSeries({
      color: color,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: '#ffffff',
      lastValueVisible: true,
      priceLineVisible: true,
    });

    seriesRef.current = lineSeries;
    lineSeries.setData(data);

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
    if (seriesRef.current) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div className="bg-binance-card border border-binance-border rounded h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-binance-text">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs text-binance-textSecondary">BTC/USD</span>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="flex-1" />
      
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-binance-bg rounded border border-binance-border">
          <div className="text-xs text-binance-textSecondary">High</div>
          <div className="text-xs font-mono font-semibold text-binance-green">
            ${Math.max(...data.map(d => d.value)).toLocaleString()}
          </div>
        </div>
        <div className="p-2 bg-binance-bg rounded border border-binance-border">
          <div className="text-xs text-binance-textSecondary">Low</div>
          <div className="text-xs font-mono font-semibold text-binance-red">
            ${Math.min(...data.map(d => d.value)).toLocaleString()}
          </div>
        </div>
        <div className="p-2 bg-binance-bg rounded border border-binance-border">
          <div className="text-xs text-binance-textSecondary">Avg</div>
          <div className="text-xs font-mono font-semibold text-binance-text">
            ${(data.reduce((sum, d) => sum + d.value, 0) / data.length).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

