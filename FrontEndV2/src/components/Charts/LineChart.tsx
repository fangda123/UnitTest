import React from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * Component สำหรับแสดง Line Chart
 * เหมาะสำหรับแสดงข้อมูลที่เปลี่ยนแปลงตามเวลา (Time Series)
 */

interface LineChartProps {
  title: string;
  data: {
    categories: string[] | number[]; // รองรับทั้ง string และ number (timestamp)
    series: {
      name: string;
      data: (number | null)[];
      color?: string;
      dashStyle?: 'Solid' | 'Dash' | 'Dot' | 'DashDot' | 'LongDash' | 'LongDashDot';
    }[];
  };
  height?: number;
  smooth?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ 
  title, 
  data, 
  height = 350,
  smooth = true 
}) => {
  // ตรวจสอบว่า categories เป็น timestamp หรือไม่
  const isDateTime = data.categories && data.categories.length > 0 && typeof data.categories[0] === 'number';
  
  const options: ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      }
    },
    stroke: {
      curve: smooth ? 'smooth' : 'straight',
      width: data.series.map(s => s.dashStyle ? 2 : 3),
      lineCap: 'round',
    },
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 6, // เพิ่มขนาดจุด
      hover: {
        size: 8,
        sizeOffset: 3
      },
      strokeWidth: 2,
      strokeColors: '#1e293b',
      shape: 'circle', // ใช้จุดกลม
      showNullDataPoints: false, // ไม่แสดงจุดสำหรับข้อมูล null
    },
    xaxis: {
      type: isDateTime ? 'datetime' : 'category', // ใช้ datetime ถ้า categories เป็น timestamp
      // ไม่ส่ง categories ถ้าเป็น datetime mode (ApexCharts จะใช้ timestamp จาก series data แทน)
      ...(isDateTime ? {} : { categories: data.categories }),
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        rotate: -45,
        rotateAlways: false,
        // Format สำหรับ datetime (แสดงวันเดือนปี)
        datetimeFormatter: isDateTime ? {
          year: 'yyyy',
          month: 'MMM yyyy',
          day: 'dd MMM yyyy',
          hour: 'HH:mm',
          minute: 'HH:mm',
        } : undefined,
        // Format สำหรับ datetime labels
        formatter: isDateTime 
          ? function(value: string, timestamp?: number, opts?: any) {
              if (timestamp) {
                const date = new Date(timestamp);
                // แสดงเป็น วัน เดือน ปี เวลา (ถ้ามีข้อมูลน้อย)
                const showTime = data.categories.length <= 100;
                return date.toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  ...(showTime && {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                });
              }
              return value;
            }
          : undefined,
      },
      axisBorder: {
        show: true,
        color: '#334155'
      },
      axisTicks: {
        show: true,
        color: '#334155'
      },
      tooltip: {
        enabled: true,
        formatter: isDateTime
          ? function(value: string, opts?: any) {
              // ApexCharts จะส่ง timestamp มาใน opts
              if (opts && opts.w && opts.w.globals && opts.dataPointIndex !== undefined) {
                // ดึง timestamp จาก series data
                const seriesData = opts.w.globals.series[opts.seriesIndex]?.data;
                if (seriesData && seriesData[opts.dataPointIndex]) {
                  const dataPoint = seriesData[opts.dataPointIndex];
                  if (Array.isArray(dataPoint) && dataPoint[0]) {
                    const timestamp = dataPoint[0];
                    const date = new Date(timestamp);
                    return date.toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }
                }
              }
              return value;
            }
          : undefined,
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        formatter: function (val: number | null | undefined) {
          if (val === null || val === undefined || isNaN(val)) {
            return '';
          }
          return val.toLocaleString();
        }
      }
    },
    colors: data.series.map(s => s.color || '#0ea5e9'),
    theme: {
      mode: 'dark',
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 20,
        bottom: 0,
        left: 10
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '14px',
      labels: {
        colors: '#e2e8f0',
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        show: true,
        format: isDateTime ? 'dd MMM yyyy HH:mm' : undefined, // Format สำหรับ datetime
        formatter: isDateTime
          ? function(value: string, opts?: any) {
              // ApexCharts จะส่ง timestamp มาใน value
              if (value) {
                const timestamp = typeof value === 'number' ? value : parseInt(value);
                if (!isNaN(timestamp)) {
                  const date = new Date(timestamp);
                  return date.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
              }
              return value;
            }
          : undefined,
      },
      y: {
        formatter: function (val: number | number[] | null | undefined) {
          if (val === null || val === undefined) {
            return '';
          }
          // ถ้า val เป็น array (multiple series)
          if (Array.isArray(val)) {
            return val.map(v => {
              if (v === null || v === undefined || isNaN(v)) {
                return '';
              }
              return v.toLocaleString();
            }).join(', ');
          }
          // ถ้า val เป็น number
          if (isNaN(val)) {
            return '';
          }
          return val.toLocaleString();
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.8,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-warning rounded-full"></span>
          {title}
        </h3>
      </div>
      <div className="flex-1 p-4">
        <Chart
          key={`chart-${data.categories?.length || 0}-${data.series?.length || 0}`}
          options={options}
          series={data.series.map(s => {
            // ถ้า categories เป็น timestamp (number[]) และ data ยังไม่ใช่ [timestamp, value] ให้แปลง
            // แต่ถ้า data เป็น [timestamp, value] อยู่แล้ว (จาก TradingPage) ให้ใช้เลย
            const seriesData = isDateTime && data.categories && data.categories.length > 0
              ? s.data.map((value, index) => {
                  // ตรวจสอบว่า value เป็น array [timestamp, price] อยู่แล้วหรือไม่
                  if (Array.isArray(value) && value.length === 2) {
                    // ถ้าเป็น [timestamp, price] อยู่แล้ว ให้ใช้เลย
                    return value;
                  }
                  // ถ้ายังไม่ใช่ ให้แปลงเป็น [timestamp, value]
                  const timestamp = data.categories[index] as number;
                  // ตรวจสอบว่า timestamp และ value ถูกต้อง
                  if (timestamp && !isNaN(timestamp) && value !== null && value !== undefined) {
                    return [timestamp, value];
                  }
                  return null;
                }).filter(item => item !== null) // กรอง null ออก
              : s.data;
            
            return {
              name: s.name,
              data: seriesData,
              ...(s.dashStyle && {
                strokeDashArray: s.dashStyle === 'Dash' ? [5, 5] : 
                                s.dashStyle === 'Dot' ? [2, 2] : 
                                s.dashStyle === 'DashDot' ? [5, 5, 2, 5] : 0,
              }),
            };
          })}
          type="line"
          height={height}
        />
      </div>
    </div>
  );
};

export default LineChart;

