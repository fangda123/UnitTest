import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Component สำหรับแสดงสถิติในรูปแบบการ์ด
 * พร้อม animation และ icon ที่สวยงาม
 */

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'purple';
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'primary',
  loading = false,
}) => {
  const colorClasses = {
    primary: 'from-primary-600 to-primary-500',
    success: 'from-green-600 to-green-500',
    danger: 'from-red-600 to-red-500',
    warning: 'from-yellow-600 to-yellow-500',
    purple: 'from-purple-600 to-purple-500',
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return 'text-gray-400';
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-danger';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 animate-pulse">
        <div className="h-4 bg-dark-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-dark-700 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-dark-700 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 hover:border-primary-500/50 transition-all duration-300 hover:shadow-glow group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
          <p className="text-3xl font-bold text-gray-100 group-hover:text-primary-400 transition-colors">
            {value}
          </p>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-medium">
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-gray-500 ml-1">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;

