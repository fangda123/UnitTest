import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';

/**
 * Component สำหรับแสดง TradingView Lightweight Chart
 * เหมาะสำหรับแสดงข้อมูล Candlestick แบบ real-time
 * พร้อมฟีเจอร์ซูมและเลื่อนดูข้อมูล
 */

interface TradingViewChartProps {
  title: string;
  data: CandlestickData[];
  volumeData?: HistogramData[];
  predictionData?: LineData[]; // เส้นการคำนวณผลล่วงหน้า
  height?: number;
  symbol?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  title, 
  data, 
  volumeData,
  predictionData,
  height = 400,
  onTimeframeChange
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const predictionSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1W');
  
  const timeframes = ['1s', '15m', '1H', '4H', '1D', '1W'];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // ตรวจสอบว่า container มีขนาดที่ถูกต้อง
    const containerWidth = chartContainerRef.current.clientWidth || 800;
    const containerHeight = height - 100;
    
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn('Chart container has invalid dimensions, waiting for resize...');
      return;
    }

    // สร้าง main chart instance
    const chart = createChart(chartContainerRef.current, {
      width: containerWidth,
      height: containerHeight,
      layout: {
        background: { color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: {
        mode: 1,
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
          bottom: 0.1,
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
    // For lightweight-charts v5+, use addSeries with CandlestickSeries class
    try {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      if (candlestickSeries) {
        candlestickSeriesRef.current = candlestickSeries;

        // ตั้งค่าข้อมูล
        if (data && data.length > 0) {
          candlestickSeries.setData(data);
        }
      }
    } catch (error: any) {
      console.error('Error creating candlestick series:', error);
    }

    // เพิ่ม prediction line series (เส้นการคำนวณผลล่วงหน้า) - สร้างแยกต่างหาก
    if (predictionData && predictionData.length > 0 && chartRef.current) {
      try {
        // ลบ prediction series เดิมถ้ามี
        if (predictionSeriesRef.current) {
          chartRef.current.removeSeries(predictionSeriesRef.current);
          predictionSeriesRef.current = null;
        }

        const predictionSeries = chartRef.current.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1, // เส้นบาง
          lineStyle: 1, // Dashed line
          title: 'การคำนวณผลล่วงหน้า',
          priceLineVisible: false,
          lastValueVisible: true,
          pointMarkersVisible: true, // แสดงจุด
          pointMarkersRadius: 6, // ขนาดจุด
        });
        
        predictionSeriesRef.current = predictionSeries;
        predictionSeries.setData(predictionData);
      } catch (error: any) {
        console.error('Error creating prediction series:', error);
      }
    }

    // สร้าง volume chart ถ้ามี volume data
    if (volumeContainerRef.current && volumeData && volumeData.length > 0) {
      const volumeWidth = volumeContainerRef.current.clientWidth || containerWidth;
      const volumeHeight = 100;
      
      if (volumeWidth <= 0 || volumeHeight <= 0) {
        console.warn('Volume chart container has invalid dimensions');
        return;
      }

      const volumeChart = createChart(volumeContainerRef.current, {
        width: volumeWidth,
        height: volumeHeight,
        layout: {
          background: { color: '#1e293b' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: '#334155' },
        },
        rightPriceScale: {
          visible: true,
          borderColor: '#334155',
        },
        timeScale: {
          borderColor: '#334155',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      volumeChartRef.current = volumeChart;

      // Sync time scale with main chart
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange) {
          volumeChart.timeScale().setVisibleRange(timeRange);
        }
      });

      volumeChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange) {
          chart.timeScale().setVisibleRange(timeRange);
        }
      });

      // เพิ่ม volume histogram series
      // For lightweight-charts v5+, use addSeries with HistogramSeries class
      try {
        const volumeSeries = volumeChart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        });
        
        volumeSeriesRef.current = volumeSeries;
        if (volumeData && volumeData.length > 0) {
          volumeSeries.setData(volumeData);
        }
      } catch (error: any) {
        console.error('Error creating volume series:', error);
      }
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
      if (volumeContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumeContainerRef.current.clientWidth,
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
      if (volumeChartRef.current) {
        volumeChartRef.current.remove();
      }
    };
  }, [height, predictionData]);

  // อัพเดทข้อมูลเมื่อ data เปลี่ยน
  useEffect(() => {
    if (candlestickSeriesRef.current && data && data.length > 0) {
      candlestickSeriesRef.current.setData(data);
    }
  }, [data]);

  // อัพเดท prediction data หรือสร้างใหม่ถ้ายังไม่มี
  useEffect(() => {
    if (!chartRef.current) return;

    if (predictionData && predictionData.length > 0) {
      if (predictionSeriesRef.current) {
        // อัพเดทข้อมูลที่มีอยู่แล้ว
        predictionSeriesRef.current.setData(predictionData);
      } else {
        // สร้างใหม่ถ้ายังไม่มี
        try {
          const predictionSeries = chartRef.current.addSeries(LineSeries, {
            color: '#f59e0b',
            lineWidth: 2,
            lineStyle: 1, // Dashed line
            title: 'การคำนวณผลล่วงหน้า',
            priceLineVisible: false,
            lastValueVisible: true,
          });
          
          predictionSeriesRef.current = predictionSeries;
          predictionSeries.setData(predictionData);
        } catch (error: any) {
          console.error('Error creating prediction series:', error);
        }
      }
    } else if (predictionSeriesRef.current) {
      // ลบ prediction series ถ้าไม่มีข้อมูล
      try {
        chartRef.current.removeSeries(predictionSeriesRef.current);
        predictionSeriesRef.current = null;
      } catch (error: any) {
        console.error('Error removing prediction series:', error);
      }
    }
  }, [predictionData]);

  // อัพเดท volume data
  useEffect(() => {
    if (volumeSeriesRef.current && volumeData && volumeData.length > 0) {
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [volumeData]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    if (onTimeframeChange) {
      onTimeframeChange(timeframe);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-dark-800 rounded-lg border border-dark-700">
      <div className="px-6 py-4 border-b border-dark-700">
        <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary-500 rounded-full animate-pulse"></span>
          {title}
        </h3>
          <div className="flex items-center gap-2">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <div 
          ref={chartContainerRef} 
          className="w-full rounded-lg overflow-hidden shadow-lg flex-1"
        />
        {volumeData && volumeData.length > 0 && (
          <div 
            ref={volumeContainerRef} 
            className="w-full mt-2 rounded-lg overflow-hidden"
          />
        )}
        <div className="mt-4 flex gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-danger rounded"></div>
            <span>Bearish</span>
          </div>
          {predictionData && predictionData.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-warning border-dashed border-t-2"></div>
              <span>การคำนวณผลล่วงหน้า</span>
            </div>
          )}
          <div className="ml-auto">
            Scroll to zoom • Drag to pan
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingViewChart;

