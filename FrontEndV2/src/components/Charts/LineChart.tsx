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
    categories: string[];
    series: {
      name: string;
      data: number[];
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
      width: 3,
      lineCap: 'round'
    },
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 5,
      hover: {
        size: 7,
        sizeOffset: 3
      },
      strokeWidth: 2,
      strokeColors: '#1e293b'
    },
    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        rotate: -45,
        rotateAlways: false
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
        enabled: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        formatter: function (val: number) {
          return val.toLocaleString();
        }
      }
    },
    colors: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'],
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
        show: true
      },
      y: {
        formatter: function (val: number) {
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
          options={options}
          series={data.series}
          type="line"
          height={height}
        />
      </div>
    </div>
  );
};

export default LineChart;

