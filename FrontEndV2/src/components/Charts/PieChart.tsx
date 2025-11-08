import React from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * Component สำหรับแสดง Pie Chart
 * ใช้สำหรับแสดงสัดส่วนข้อมูลในรูปแบบวงกลม
 */

interface PieChartProps {
  title: string;
  data: {
    labels: string[];
    series: number[];
  };
  height?: number;
  colors?: string[];
}

const PieChart: React.FC<PieChartProps> = ({ 
  title, 
  data, 
  height = 350,
  colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
}) => {
  const options: ApexOptions = {
    chart: {
      type: 'pie',
      background: 'transparent',
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
      toolbar: {
        show: true,
        tools: {
          download: true,
        }
      }
    },
    labels: data.labels,
    colors: colors,
    theme: {
      mode: 'dark',
    },
    legend: {
      position: 'bottom',
      fontSize: '14px',
      labels: {
        colors: '#e2e8f0',
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%";
      },
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: '#000',
        opacity: 0.45
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '0%',
        }
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      y: {
        formatter: function (val: number) {
          return val.toFixed(2);
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: '100%'
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
          {title}
        </h3>
      </div>
      <div className="flex-1 p-4">
        <Chart
          options={options}
          series={data.series}
          type="pie"
          height={height}
        />
      </div>
    </div>
  );
};

export default PieChart;

