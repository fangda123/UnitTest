import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface OrderFormProps {
  symbol?: string;
  currentPrice?: number;
}

const OrderForm: React.FC<OrderFormProps> = ({ symbol = 'BTCUSDT', currentPrice = 0 }) => {
  const [orderType, setOrderType] = useState<'Limit' | 'Market' | 'Stop Limit'>('Limit');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [total, setTotal] = useState<string>('');

  useEffect(() => {
    if (currentPrice > 0 && orderType === 'Limit' && !price) {
      // Set default price slightly above current price
      setPrice((currentPrice * 1.001).toFixed(2));
    }
  }, [currentPrice, orderType]);

  useEffect(() => {
    if (price && amount) {
      const calculatedTotal = parseFloat(price) * parseFloat(amount);
      setTotal(calculatedTotal.toFixed(2));
    } else {
      setTotal('');
    }
  }, [price, amount]);

  const handlePercentageClick = (percentage: number) => {
    // This would typically use available balance
    // For now, just a placeholder
    console.log(`Set amount to ${percentage}%`);
  };

  const handleBuy = () => {
    console.log('Buy order:', { orderType, price, amount, total });
    // Implement buy logic
  };

  const handleSell = () => {
    console.log('Sell order:', { orderType, price, amount, total });
    // Implement sell logic
  };

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-3">Spot</h3>
        <div className="flex gap-2">
          {(['Limit', 'Market', 'Stop Limit'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                orderType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {orderType !== 'Market' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Price</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                placeholder="0.00"
                step="0.01"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                USDT
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500 pr-20"
              placeholder="0.00"
              step="0.0001"
            />
            <select className="absolute right-4 top-1/2 -translate-y-1/2 bg-dark-700 border border-dark-600 rounded text-gray-300 text-sm px-2 py-1">
              <option>BTC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Total</label>
          <input
            type="text"
            value={total}
            readOnly
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 5 USDT</p>
        </div>

        <div className="flex gap-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentageClick(percent)}
              className="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded text-sm font-medium transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleBuy}
            className="w-full px-4 py-3 bg-success-500 hover:bg-success-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUp className="w-5 h-5" />
            Market Buy
          </button>
          <button
            onClick={handleSell}
            className="w-full px-4 py-3 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDown className="w-5 h-5" />
            Market Sell
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;

