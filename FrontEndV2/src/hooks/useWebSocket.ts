import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom Hook สำหรับเชื่อมต่อ WebSocket
 * รองรับ Real-time updates จาก Backend
 * 
 * Events ที่รองรับ:
 * - user.created - มีผู้ใช้ใหม่
 * - user.updated - อัพเดทข้อมูลผู้ใช้
 * - user.deleted - ลบผู้ใช้
 * - crypto.price.update - อัพเดทราคา Crypto
 */

export interface WebSocketMessage {
  type: string;
  message?: string;
  data?: any;
}

interface UseWebSocketOptions {
  url: string;
  token?: string;
  enabled?: boolean; // เปิด/ปิด WebSocket
  onMessage?: (message: WebSocketMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    token,
    enabled = true, // Default: เปิด WebSocket
    onMessage,
    onConnected,
    onDisconnected,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  /**
   * เชื่อมต่อ WebSocket
   */
  const connect = useCallback(() => {
    try {
      console.log('🔌 กำลังเชื่อมต่อ WebSocket:', url);
      
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('✅ เชื่อมต่อ WebSocket สำเร็จ');
        setIsConnected(true);
        
        // ส่ง token เพื่อ authenticate
        if (token && ws.current) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            token: token,
          }));
        }

        if (onConnected) {
          onConnected();
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const rawData = event.data;
          const message: WebSocketMessage = JSON.parse(rawData);
          
          // ลด console logs - แสดงแค่เมื่อมี error หรือ debug mode
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_WS === 'true') {
            console.log('📨 WebSocket Message:', message.type, message.data);
          }
          
          setLastMessage(message);

          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket Error:', error);
        if (onError) {
          onError(error);
        }
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket ถูกตัดการเชื่อมต่อ');
        setIsConnected(false);

        if (onDisconnected) {
          onDisconnected();
        }

        // Auto reconnect (เฉพาะเมื่อ component ยัง mounted)
        if (autoReconnect && mountedRef.current) {
          console.log(`🔄 จะลองเชื่อมต่อใหม่ใน ${reconnectInterval / 1000} วินาที...`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  }, [url, token, onMessage, onConnected, onDisconnected, onError, autoReconnect, reconnectInterval]);

  /**
   * ตัดการเชื่อมต่อ WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * ส่งข้อความผ่าน WebSocket
   */
  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      console.log('📤 ส่งข้อความ WebSocket:', message);
      return true;
    } else {
      console.warn('⚠️ WebSocket ไม่ได้เชื่อมต่อ');
      return false;
    }
  }, []);

  /**
   * Connect เมื่อ mount, Disconnect เมื่อ unmount
   */
  useEffect(() => {
    if (!enabled) {
      // ถ้า disabled ให้ disconnect ถ้ามีการเชื่อมต่ออยู่
      if (ws.current) {
        disconnect();
      }
      return;
    }

    mountedRef.current = true;
    connect();

    return () => {
      console.log('🧹 Cleanup WebSocket connection');
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // ตรวจสอบ enabled เพื่อเปิด/ปิด WebSocket

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}

/**
 * Hook สำหรับ Binance WebSocket (ราคา Crypto Real-time)
 */
export function useBinanceWebSocket(symbol: string = 'btcusdt') {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Binance WebSocket URL
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;

    console.log('🔌 เชื่อมต่อ Binance WebSocket:', symbol);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('✅ เชื่อมต่อ Binance WebSocket สำเร็จ');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // อัพเดทข้อมูล
        setPrice(parseFloat(data.c)); // Current price
        setPriceChange(parseFloat(data.P)); // Price change percent
        setVolume(parseFloat(data.v)); // Volume
        
        console.log(`💰 ${symbol.toUpperCase()} Price: $${parseFloat(data.c).toLocaleString()}`);
      } catch (error) {
        console.error('❌ Error parsing Binance data:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('❌ Binance WebSocket Error:', error);
    };

    ws.current.onclose = () => {
      console.log('🔌 Binance WebSocket ถูกตัดการเชื่อมต่อ');
    };

    // Cleanup
    return () => {
      console.log(`🧹 Cleanup Binance WebSocket: ${symbol}`);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [symbol]);

  return {
    price,
    priceChange,
    volume,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
}

