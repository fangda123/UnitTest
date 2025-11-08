import React from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * Component สำหรับแสดง Bar Chart (แนวนอน)
 * ใช้สำหรับเปรียบเทียบข้อมูลระหว่างหมวดหมู่ต่างๆ
 */

interface BarChartProps {
  title: string;
  data: {
    categories: string[];
    series: {
      name: string;
      data: number[];
    }[];
  };
  height?: number;
  horizontal?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ 
  title, 
  data, 
  height = 350,
  horizontal = true 
}) => {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
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
      }
    },
    plotOptions: {
      bar: {
        horizontal: horizontal,
        borderRadius: 8,
        borderRadiusApplication: 'end',
        dataLabels: {
          position: 'top',
        },
        columnWidth: '75%',
      }
    },
    dataLabels: {
      enabled: true,
      offsetX: horizontal ? 0 : 0,
      offsetY: horizontal ? 0 : -20,
      style: {
        fontSize: '12px',
        colors: ['#fff']
      },
      formatter: function (val: number) {
        return val.toLocaleString();
      }
    },
    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        }
      },
      axisBorder: {
        show: true,
        color: '#334155'
      },
      axisTicks: {
        show: true,
        color: '#334155'
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
    colors: ['#0ea5e9', '#10b981', '#f59e0b'],
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
      y: {
        formatter: function (val: number) {
          return val.toLocaleString();
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-success rounded-full"></span>
          {title}
        </h3>
      </div>
      <div className="flex-1 p-4">
        <Chart
          options={options}
          series={data.series}
          type="bar"
          height={height}
        />
      </div>
    </div>
  );
};

export default BarChart;

