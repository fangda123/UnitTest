import React, { useEffect, useRef } from 'react';

interface ColumnChartData {
  week: string;
  profit: number;
  loss: number;
}

interface ColumnChartProps {
  data: ColumnChartData[];
  title?: string;
}

/**
 * Column Chart Component - แสดงกราฟแท่งแนวตั้ง
 * รองรับการแสดงข้อมูลหลายชุด (กำไร/ขาดทุน)
 */
export const ColumnChart: React.FC<ColumnChartProps> = ({ data, title = 'Column Chart' }) => {
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

    // คำนวณค่าสูงสุดและต่ำสุด
    const maxProfit = Math.max(...data.map(d => d.profit));
    const maxLoss = Math.abs(Math.min(...data.map(d => d.loss)));
    const maxValue = Math.max(maxProfit, maxLoss);
    
    // ตั้งค่าระยะห่าง
    const padding = 50;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    const columnWidth = chartWidth / data.length;
    const barWidth = columnWidth * 0.35;
    const zeroY = padding + chartHeight / 2;

    // วาดเส้นแกน X (zero line)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(rect.width - padding, zeroY);
    ctx.stroke();

    // วาดเส้น grid แนวนอน
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // วาดแท่งกราฟ
    data.forEach((item, index) => {
      const x = padding + index * columnWidth + columnWidth / 2;
      
      // คำนวณความสูงของแท่ง
      const profitHeight = (item.profit / maxValue) * (chartHeight / 2);
      const lossHeight = (Math.abs(item.loss) / maxValue) * (chartHeight / 2);

      // วาดแท่งกำไร (สีเขียว)
      const profitGradient = ctx.createLinearGradient(0, zeroY - profitHeight, 0, zeroY);
      profitGradient.addColorStop(0, '#10B981');
      profitGradient.addColorStop(1, '#059669');
      
      ctx.fillStyle = hoveredIndex === index ? '#059669' : profitGradient;
      ctx.fillRect(
        x - barWidth - 2,
        zeroY - profitHeight,
        barWidth,
        profitHeight
      );

      // วาดแท่งขาดทุน (สีแดง)
      const lossGradient = ctx.createLinearGradient(0, zeroY, 0, zeroY + lossHeight);
      lossGradient.addColorStop(0, '#EF4444');
      lossGradient.addColorStop(1, '#DC2626');
      
      ctx.fillStyle = hoveredIndex === index ? '#DC2626' : lossGradient;
      ctx.fillRect(
        x + 2,
        zeroY,
        barWidth,
        lossHeight
      );

      // วาดค่าตัวเลข
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '$' + item.profit.toLocaleString(),
        x - barWidth / 2 - 2,
        zeroY - profitHeight - 5
      );

      ctx.fillStyle = '#EF4444';
      ctx.fillText(
        '$' + Math.abs(item.loss).toLocaleString(),
        x + barWidth / 2 + 2,
        zeroY + lossHeight + 15
      );

      // วาด label แกน X
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.week, x, rect.height - padding + 20);
    });

    // วาด label แกน Y
    ctx.fillStyle = '#6B7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const value = maxValue - (maxValue / 2) * i;
      const y = padding + (chartHeight / 4) * i;
      ctx.fillText('$' + value.toLocaleString(), padding - 10, y);
    }
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
    const x = e.clientX - rect.left;
    const padding = 50;
    const columnWidth = (rect.width - padding * 2) / data.length;

    const index = Math.floor((x - padding) / columnWidth);
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

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-binance-green rounded-sm" />
          <span className="text-xs text-binance-textSecondary">Profit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-binance-red rounded-sm" />
          <span className="text-xs text-binance-textSecondary">Loss</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div className="mt-3 p-2 bg-binance-bg rounded border border-binance-border">
          <div className="text-xs font-semibold text-binance-text mb-1">
            {data[hoveredIndex].week}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-binance-green font-mono">
              +${data[hoveredIndex].profit.toLocaleString()}
            </span>
            <span className="text-binance-red font-mono">
              -${Math.abs(data[hoveredIndex].loss).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 pt-1 border-t border-binance-border">
            <span className="text-xs font-mono font-semibold text-binance-text">
              Net: ${(data[hoveredIndex].profit + data[hoveredIndex].loss).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

