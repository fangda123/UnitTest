import React, { useEffect, useRef } from 'react';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
}

/**
 * Pie Chart Component - แสดงกราฟวงกลมสัดส่วน
 * สร้างด้วย Canvas API เพื่อความเบาและรวดเร็ว
 */
export const PieChart: React.FC<PieChartProps> = ({ data, title = 'Pie Chart' }) => {
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

    // คำนวณค่ารวม
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // ตำแหน่งและขนาดของวงกลม
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) / 2 - 40;

    // วาดกราฟ Pie
    let currentAngle = -Math.PI / 2; // เริ่มจากด้านบน

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // วาดส่วนของวงกลม
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      
      // ถ้า hover ให้ขยายออกมาเล็กน้อย
      if (hoveredIndex === index) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      }
      
      ctx.fillStyle = item.color;
      ctx.fill();
      
      ctx.shadowBlur = 0;

      // วาดเส้นขอบ
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // วาดเปอร์เซ็นต์ตรงกลางของแต่ละส่วน
      const midAngle = currentAngle + sliceAngle / 2;
      const textX = centerX + Math.cos(midAngle) * (radius * 0.7);
      const textY = centerY + Math.sin(midAngle) * (radius * 0.7);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${item.value.toFixed(1)}%`, textX, textY);

      currentAngle += sliceAngle;
    });
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

  return (
    <div className="bg-binance-card border border-binance-border rounded h-full flex flex-col p-4">
      <h3 className="text-sm font-semibold text-binance-text mb-3">{title}</h3>
      
      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ maxHeight: '300px' }}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 cursor-pointer hover:bg-binance-bg p-2 rounded transition-colors"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-binance-textSecondary truncate">{item.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

