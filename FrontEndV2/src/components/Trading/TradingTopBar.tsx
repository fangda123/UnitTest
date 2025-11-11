import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPercentage, formatThaiBaht, usdToThb } from '../../utils/currencyUtils';
import { usePrice } from '../../contexts/PriceContext';

interface TradingTopBarProps {
  symbol?: string;
}

const BINANCE_API = 'https://api.binance.com/api/v3';

interface MarketData {
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

const TradingTopBar: React.FC<TradingTopBarProps> = ({ symbol = 'BTCUSDT' }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ใช้ PriceContext สำหรับราคา real-time (เร็วกว่า)
  const { prices: realtimePrices } = usePrice();
  const btcPriceData = realtimePrices.get('BTCUSDT');

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`);
      const data = await response.json();

      setMarketData({
        price: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        quoteVolume24h: parseFloat(data.quoteVolume),
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setLoading(false);
    }
  };

  // อัพเดทราคาจาก WebSocket real-time
  useEffect(() => {
    if (btcPriceData && btcPriceData.price > 0 && marketData) {
      setMarketData(prev => prev ? {
        ...prev,
        price: btcPriceData.price,
        priceChange: btcPriceData.priceChange || prev.priceChange,
        priceChangePercent: btcPriceData.priceChangePercent || prev.priceChangePercent,
      } : null);
    }
  }, [btcPriceData, marketData]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000); // Update every 10 seconds (ใช้ WebSocket สำหรับ real-time)
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading || !marketData) {
    return (
      <div className="bg-dark-800 rounded-lg border border-dark-700 p-4">
        <div className="text-gray-400">Loading market data...</div>
      </div>
    );
  }

  const isPositive = marketData.priceChangePercent >= 0;

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">{symbol}</div>
            <div className="text-2xl font-bold text-gray-100">
              ${marketData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger" />
            )}
            <div className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {formatPercentage(marketData.priceChangePercent)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div>
            <div className="text-gray-400 mb-1">24h High</div>
            <div className="text-gray-100 font-semibold">
              ${marketData.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">24h Low</div>
            <div className="text-gray-100 font-semibold">
              ${marketData.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">24h Volume (BTC)</div>
            <div className="text-gray-100 font-semibold">
              {marketData.volume24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">24h Volume (USDT)</div>
            <div className="text-gray-100 font-semibold">
              ${marketData.quoteVolume24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium">
            POW Payments
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingTopBar;

