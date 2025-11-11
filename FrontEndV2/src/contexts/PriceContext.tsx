import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { isAuthenticated } from '../services/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1111/ws';

interface CryptoPrice {
  symbol: string;
  price: number;
  priceChange?: number;
  priceChangePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  lastUpdate?: string;
}

interface PriceContextType {
  prices: Map<string, CryptoPrice>;
  getPrice: (symbol: string) => CryptoPrice | null;
  isConnected: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const usePrice = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrice must be used within PriceProvider');
  }
  return context;
};

interface PriceProviderProps {
  children: React.ReactNode;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ children }) => {
  const [prices, setPrices] = useState<Map<string, CryptoPrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const token = localStorage.getItem('auth_token');
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map());

  // อัพเดทราคาเมื่อได้รับ WebSocket message
  const updatePrice = useCallback((priceData: any) => {
    if (!priceData || !priceData.symbol) return;

    setPrices((prevPrices) => {
      const updated = new Map(prevPrices);
      const existing = updated.get(priceData.symbol);
      
      // คำนวณ priceChange
      const priceChange = existing 
        ? priceData.price - existing.price 
        : 0;
      
      const priceChangePercent = existing && existing.price > 0
        ? ((priceData.price - existing.price) / existing.price) * 100
        : priceData.priceChangePercent24h || 0;

      updated.set(priceData.symbol, {
        symbol: priceData.symbol,
        price: priceData.price,
        priceChange,
        priceChangePercent,
        high24h: priceData.highPrice24h || existing?.high24h,
        low24h: priceData.lowPrice24h || existing?.low24h,
        volume24h: priceData.volume24h || existing?.volume24h,
        lastUpdate: priceData.lastUpdate || new Date().toISOString(),
      });

      pricesRef.current = updated;
      return updated;
    });
  }, []);

  // WebSocket connection - ทำงานตลอดเวลาเมื่อ login แล้ว
  const { isConnected: wsConnected } = useWebSocket({
    url: WS_URL,
    token: isAuthenticated() ? (token || undefined) : undefined,
    enabled: isAuthenticated(), // เปิด WebSocket ตลอดเวลาเมื่อ login แล้ว
    onMessage: (message) => {
      // อัพเดทราคาทันทีเมื่อได้รับ notification
      if (message.type === 'crypto.price.update' && message.data) {
        updatePrice(message.data);
      }
    },
    onConnected: () => {
      setIsConnected(true);
      if (import.meta.env.DEV) {
        console.log('✅ PriceContext: เชื่อมต่อ WebSocket สำเร็จ - พร้อมรับข้อมูลราคา real-time');
      }
    },
    onDisconnected: () => {
      setIsConnected(false);
      if (import.meta.env.DEV) {
        console.log('🔌 PriceContext: ตัดการเชื่อมต่อ WebSocket');
      }
    },
    autoReconnect: true,
  });

  // อัพเดท isConnected state
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  // Function สำหรับดึงราคา
  const getPrice = useCallback((symbol: string): CryptoPrice | null => {
    return prices.get(symbol) || null;
  }, [prices]);

  // อัพเดท pricesRef เมื่อ prices เปลี่ยน (สำหรับ backward compatibility)
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  const value: PriceContextType = {
    prices, // ใช้ state โดยตรงเพื่อให้ React re-render เมื่อราคาเปลี่ยน
    getPrice,
    isConnected,
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
};

