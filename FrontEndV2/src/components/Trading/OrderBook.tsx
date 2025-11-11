import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatThaiBaht, usdToThb } from '../../utils/currencyUtils';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookProps {
  symbol?: string;
}

const BINANCE_API = 'https://api.binance.com/api/v3';

const OrderBook: React.FC<OrderBookProps> = ({ symbol = 'BTCUSDT' }) => {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [precision, setPrecision] = useState<string>('0.01');
  const [loading, setLoading] = useState(true);

  const fetchOrderBook = async () => {
    try {
      const response = await fetch(`${BINANCE_API}/depth?symbol=${symbol}&limit=20`);
      const data = await response.json();

      // Process bids (buy orders)
      let bidTotal = 0;
      const processedBids: OrderBookEntry[] = data.bids.map((bid: [string, string]) => {
        const price = parseFloat(bid[0]);
        const quantity = parseFloat(bid[1]);
        bidTotal += quantity;
        return {
          price,
          quantity,
          total: bidTotal,
        };
      });

      // Process asks (sell orders)
      let askTotal = 0;
      const processedAsks: OrderBookEntry[] = data.asks.map((ask: [string, string]) => {
        const price = parseFloat(ask[0]);
        const quantity = parseFloat(ask[1]);
        askTotal += quantity;
        return {
          price,
          quantity,
          total: askTotal,
        };
      });

      setBids(processedBids.reverse()); // Reverse to show highest first
      setAsks(processedAsks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order book:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [symbol]);

  const formatPrice = (price: number) => {
    // แสดงเป็น USD
    const decimals = precision === '0.01' ? 2 : precision === '0.1' ? 1 : 0;
    return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatQuantity = (qty: number) => {
    if (qty >= 1) return qty.toFixed(2);
    if (qty >= 0.1) return qty.toFixed(3);
    if (qty >= 0.01) return qty.toFixed(4);
    return qty.toFixed(6);
  };

  const formatTotal = (total: number) => {
    if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
    return total.toFixed(2);
  };

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total),
    1
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading order book...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-800 rounded-lg border border-dark-700">
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">Order Book</h3>
          <select
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
            className="px-2 py-1 bg-dark-700 border border-dark-600 rounded text-sm text-gray-300"
          >
            <option value="0.01">0.01</option>
            <option value="0.1">0.1</option>
            <option value="1">1</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-semibold">
          <div>Price (USDT)</div>
          <div className="text-right">Amount (BTC)</div>
          <div className="text-right">Total</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Asks (Sell Orders) - Red */}
        <div className="space-y-0">
          {asks.slice().reverse().map((ask, index) => {
            const widthPercent = (ask.total / maxTotal) * 100;
            return (
              <div
                key={`ask-${index}`}
                className="relative px-4 py-1 hover:bg-dark-700/50 cursor-pointer group"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-danger/10 opacity-30"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 gap-2 text-sm">
                  <div className="text-danger font-medium">{formatPrice(ask.price)} ฿</div>
                  <div className="text-right text-gray-300">{formatQuantity(ask.quantity)}</div>
                  <div className="text-right text-gray-400">{formatTotal(ask.total)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Price */}
        {bids.length > 0 && asks.length > 0 && (
          <div className="px-4 py-2 bg-primary-500/20 border-y border-primary-500/30">
            <div className="flex items-center justify-center gap-2">
              <ArrowUp className="w-4 h-4 text-success" />
              <span className="text-lg font-bold text-gray-100">
                {formatPrice((bids[0]?.price + asks[0]?.price) / 2)} ฿
              </span>
              <span className="text-sm text-gray-400">${((bids[0]?.price + asks[0]?.price) / 2).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) - Green */}
        <div className="space-y-0">
          {bids.map((bid, index) => {
            const widthPercent = (bid.total / maxTotal) * 100;
            return (
              <div
                key={`bid-${index}`}
                className="relative px-4 py-1 hover:bg-dark-700/50 cursor-pointer group"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-success/10 opacity-30"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 gap-2 text-sm">
                  <div className="text-success font-medium">{formatPrice(bid.price)} ฿</div>
                  <div className="text-right text-gray-300">{formatQuantity(bid.quantity)}</div>
                  <div className="text-right text-gray-400">{formatTotal(bid.total)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;

