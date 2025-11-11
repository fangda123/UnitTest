import React, { useEffect, useState } from 'react';
import { formatThaiBaht, usdToThb } from '../../utils/currencyUtils';

interface Trade {
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean;
}

interface MarketTradesProps {
  symbol?: string;
}

const BINANCE_API = 'https://api.binance.com/api/v3';

const MarketTrades: React.FC<MarketTradesProps> = ({ symbol = 'BTCUSDT' }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    try {
      const response = await fetch(`${BINANCE_API}/trades?symbol=${symbol}&limit=50`);
      const data = await response.json();

      const processedTrades: Trade[] = data.map((trade: any) => ({
        price: parseFloat(trade.price),
        qty: parseFloat(trade.qty),
        time: trade.time,
        isBuyerMaker: trade.isBuyerMaker,
      }));

      setTrades(processedTrades.reverse()); // Show newest first
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [symbol]);

  const formatPrice = (price: number) => {
    // แสดงเป็น USD
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatQuantity = (qty: number) => {
    if (qty >= 1) return qty.toFixed(2);
    if (qty >= 0.1) return qty.toFixed(3);
    if (qty >= 0.01) return qty.toFixed(4);
    return qty.toFixed(6);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-800 rounded-lg border border-dark-700">
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-medium">
            Market Trades
          </button>
          <button className="px-3 py-1 text-gray-400 rounded text-sm font-medium hover:bg-dark-700">
            My Trades
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-dark-700">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-semibold">
          <div>Price (USDT)</div>
          <div className="text-right">Amount (BTC)</div>
          <div className="text-right">Time</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0">
          {trades.map((trade, index) => (
            <div
              key={`trade-${index}`}
              className="px-4 py-1 hover:bg-dark-700/50 border-b border-dark-700/50 last:border-b-0"
            >
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className={trade.isBuyerMaker ? 'text-danger' : 'text-success'}>
                  ${formatPrice(trade.price)}
                </div>
                <div className="text-right text-gray-300">
                  {formatQuantity(trade.qty)}
                </div>
                <div className="text-right text-gray-400 text-xs">
                  {formatTime(trade.time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketTrades;

