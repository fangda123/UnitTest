import React, { useEffect, useRef } from 'react';

interface BarChartData {
  month: string;
  volume: number;
  trades: number;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
}

/**
 * Bar Chart Component - แสดงกราฟแท่งแนวนอน
 * ใช้ Canvas API เพื่อประสิทธิภาพสูงสุด
 */
export const BarChart: React.FC<BarChartProps> = ({ data, title = 'Bar Chart' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawChart = () => {
      // ตั้งค่าขนาด canvas
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

    // คำนวณค่าสูงสุด
    const maxVolume = Math.max(...data.map(d => d.volume));
    
    // ตั้งค่าระยะห่าง
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    const barHeight = chartHeight / data.length;
    const barPadding = barHeight * 0.2;

    // วาดแกน Y (labels)
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    data.forEach((item, index) => {
      const y = padding + index * barHeight + barHeight / 2;
      ctx.fillText(item.month, padding - 10, y);
    });

    // วาดแท่งกราฟ
    data.forEach((item, index) => {
      const barWidth = (item.volume / maxVolume) * chartWidth;
      const x = padding;
      const y = padding + index * barHeight + barPadding;
      const height = barHeight - barPadding * 2;

      // สีของแท่ง
      const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1D4ED8');

      // วาดแท่ง
      ctx.fillStyle = hoveredIndex === index ? '#2563EB' : gradient;
      ctx.fillRect(x, y, barWidth, height);

      // วาดค่าตัวเลข
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        item.volume.toLocaleString(),
        x + barWidth + 10,
        y + height / 2
      );
    });

    // วาดเส้นแกน X
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.stroke();
    };

    drawChart();

    // ใช้ ResizeObserver เพื่อ Re-draw เมื่อขนาดเปลี่ยน
    const resizeObserver = new ResizeObserver(() => {
      drawChart();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, hoveredIndex]);

  // จัดการ hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const padding = 40;
    const barHeight = (rect.height - padding * 2) / data.length;

    const index = Math.floor((y - padding) / barHeight);
    if (index >= 0 && index < data.length) {
      setHoveredIndex(index);
    } else {
      setHoveredIndex(null);
    }
  };

  return (
    <div className="bg-binance-card border border-binance-border rounded h-full flex flex-col p-4">
      <h3 className="text-sm font-semibold text-binance-text mb-3">{title}</h3>
      
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div className="mt-3 p-2 bg-binance-bg rounded border border-binance-border">
          <div className="text-xs">
            <span className="font-semibold text-binance-text">
              {data[hoveredIndex].month}:
            </span>
            <span className="ml-2 text-binance-textSecondary">
              {data[hoveredIndex].volume.toLocaleString()} | 
              {data[hoveredIndex].trades} trades
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

