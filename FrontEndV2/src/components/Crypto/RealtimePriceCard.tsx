import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useBinanceWebSocket } from '../../hooks/useWebSocket';

/**
 * Component แสดงราคา Crypto แบบ Real-time
 * เชื่อมต่อกับ Binance WebSocket โดยตรง
 */

interface RealtimePriceCardProps {
  symbol: string;
  name: string;
}

function RealtimePriceCard({ symbol, name }: RealtimePriceCardProps) {
  const { price, priceChange, volume, isConnected } = useBinanceWebSocket(symbol);

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 hover:border-primary-500/50 transition-all hover:shadow-glow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-100">{name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{symbol.toUpperCase()}</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </div>
        </div>
        {priceChange >= 0 ? (
          <TrendingUp className="w-6 h-6 text-success" />
        ) : (
          <TrendingDown className="w-6 h-6 text-danger" />
        )}
      </div>

      {price ? (
        <>
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-100 animate-fade-in">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm font-semibold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
            </p>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              <span>Volume:</span>
            </div>
            <span className="text-gray-300">
              ${(volume / 1000000).toFixed(2)}M
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

export default RealtimePriceCard;

