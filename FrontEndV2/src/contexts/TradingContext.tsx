import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { tradingAPI, cryptoAPI, isAuthenticated } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePrice } from './PriceContext';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1111/ws';

interface Simulation {
  _id: string;
  userId: string;
  symbol: string;
  initialInvestment: number;
  currentBalance: number;
  holdings: number;
  averageBuyPrice: number;
  totalTrades: number;
  totalProfit: number;
  status: 'active' | 'stopped' | 'completed';
  settings: {
    buyPercentage: number;
    sellPercentage: number;
    minConfidence: number;
    useStopLoss?: boolean;
    stopLossPercentage?: number;
    useTakeProfit?: boolean;
    takeProfitPercentage?: number;
  };
}

interface TradingSignal {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  buySignals?: number;
  sellSignals?: number;
  reasons?: string[];
}

interface TradingContextType {
  simulation: Simulation | null;
  currentPrice: number;
  signal: TradingSignal | null;
  priceHistory: any[];
  predictions: any[];
  trades: any[];
  loading: boolean;
  autoUpdate: boolean;
  isConnected: boolean;
  createSimulation: (investment: number, symbol?: string, settings?: any) => Promise<void>;
  stopSimulation: () => Promise<void>;
  updateSimulation: () => Promise<void>;
  fetchSignal: (symbol?: string) => Promise<void>;
  setAutoUpdate: (value: boolean) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within TradingProvider');
  }
  return context;
};

interface TradingProviderProps {
  children: React.ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoUpdate, setAutoUpdate] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // ใช้ PriceContext สำหรับราคา BTCUSDT แบบ real-time
  const { prices: realtimePrices } = usePrice();
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignalFetchRef = useRef<number>(0);
  const lastUpdateSimulationRef = useRef<number>(0);
  const signalFetchThrottleRef = useRef<number>(60000); // 60 วินาที
  const updateSimulationThrottleRef = useRef<number>(5000); // ลดเป็น 5 วินาทีเพื่อ real-time
  const token = localStorage.getItem('auth_token');

  // ดึงสัญญาณการเทรด (พร้อม throttling)
  const fetchSignal = useCallback(async (symbol?: string, force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastSignalFetchRef.current;
    
    // Throttle: เรียกแค่ทุก 30 วินาที (ยกเว้นถ้า force = true)
    if (!force && timeSinceLastFetch < signalFetchThrottleRef.current) {
      return;
    }
    
    const selectedSymbol = symbol || simulation?.symbol || 'BTCUSDT';
    
    try {
      lastSignalFetchRef.current = now;
      console.log(`[TradingContext] 📊 กำลังดึงข้อมูล signal และ history สำหรับ ${selectedSymbol}...`);
      const response = await tradingAPI.getTradingSignal(selectedSymbol);
      if (response.data && response.data.data) {
        const history = response.data.data.history || [];
        const predictions = response.data.data.predictions || [];
        console.log(`[TradingContext] ✅ ได้รับข้อมูล: History=${history.length} จุด, Predictions=${predictions.length} จุด`);
        
        setCurrentPrice(response.data.data.currentPrice || 0);
        setSignal(response.data.data.signal || null);
        
        // Merge ข้อมูล history: ถ้ามีข้อมูลจาก klines (1 ปี) อยู่แล้ว ให้ merge แทนที่จะทับ
        setPriceHistory((prevHistory) => {
          // ถ้ามีข้อมูลเดิมมากกว่า 100 จุด (น่าจะเป็นข้อมูล 1 ปี) ให้ merge
          if (prevHistory.length > 100 && history.length > 0) {
            // สร้าง map ของ timestamp เพื่อป้องกันข้อมูลซ้ำ
            const historyMap = new Map();
            // เพิ่มข้อมูลเดิมก่อน (ข้อมูล 1 ปี)
            prevHistory.forEach((item: any) => {
              const timestamp = item.timestamp || (typeof item === 'object' ? item.date?.getTime() : null);
              if (timestamp) {
                historyMap.set(timestamp, item);
              }
            });
            // เพิ่มข้อมูลใหม่ (ข้อมูลล่าสุดจาก backend)
            history.forEach((item: any) => {
              const timestamp = item.timestamp || (typeof item === 'object' ? item.date?.getTime() : null) || (typeof item === 'number' ? null : Date.now());
              if (timestamp) {
                historyMap.set(timestamp, item);
              } else {
                // ถ้าไม่มี timestamp ให้เพิ่มท้าย
                historyMap.set(Date.now() + Math.random(), item);
              }
            });
            // แปลงกลับเป็น array และเรียงตาม timestamp
            const merged = Array.from(historyMap.values()).sort((a: any, b: any) => {
              const timeA = a.timestamp || (typeof a === 'object' ? a.date?.getTime() : 0) || 0;
              const timeB = b.timestamp || (typeof b === 'object' ? b.date?.getTime() : 0) || 0;
              return timeA - timeB;
            });
            console.log(`[TradingContext] 🔄 Merge ข้อมูล: เดิม=${prevHistory.length} จุด, ใหม่=${history.length} จุด, รวม=${merged.length} จุด`);
            return merged;
          } else {
            // ถ้าไม่มีข้อมูลเดิมหรือข้อมูลเดิมน้อย ให้ใช้ข้อมูลใหม่
            return history;
          }
        });
        
        setPredictions(predictions);
      }
    } catch (error: any) {
      // ไม่ log error ถ้าเป็น 429 (Too Many Requests) - แค่ข้าม
      if (error.response?.status !== 429) {
        console.error('Error fetching signal:', error);
      }
    }
  }, [simulation]);

  // ดึงการจำลองการเทรด
  const fetchSimulation = useCallback(async () => {
    try {
      const response = await tradingAPI.getSimulations({ status: 'active' });
      if (response.data && response.data.data && response.data.data.length > 0) {
        setSimulation(response.data.data[0]);
        setAutoUpdate(true);
      } else {
        setSimulation(null);
        setAutoUpdate(false);
      }
    } catch (error) {
      console.error('Error fetching simulation:', error);
    }
  }, []);

  // ดึงประวัติการเทรด
  const fetchTrades = useCallback(async (simulationId: string) => {
    try {
      const response = await tradingAPI.getTrades(simulationId, { limit: 20 });
      setTrades(response.data.data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  }, []);

  // อัพเดทการจำลองการเทรด (พร้อม throttling เพื่อป้องกัน request มากเกินไป)
  const updateSimulation = useCallback(async () => {
    if (!simulation) {
      return;
    }

    // Throttle: เรียกแค่ทุก 2 วินาที (เพื่อป้องกัน request มากเกินไป แต่ยัง real-time)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateSimulationRef.current;
    if (timeSinceLastUpdate < 2000) { // 2 วินาที (ลดจาก 3 วินาทีเพื่อตอบสนองเร็วกว่า)
      return;
    }

    try {
      lastUpdateSimulationRef.current = now;
      setLoading(true);
      const response = await tradingAPI.updateSimulation(simulation._id);
      
      if (response.data && response.data.data) {
        setSimulation(response.data.data.simulation);
        setCurrentPrice(response.data.data.currentPrice || currentPrice);
        setSignal(response.data.data.signal || signal);
        
        // อัพเดท history และ predictions ถ้ามี
        if (response.data.data.history) {
          setPriceHistory(response.data.data.history);
        }
        if (response.data.data.predictions) {
          setPredictions(response.data.data.predictions);
        }
        
        // ดึงประวัติการเทรดใหม่ทุกครั้งที่อัพเดท (real-time)
        await fetchTrades(simulation._id);
      }
    } catch (error: any) {
      // ไม่ log error ถ้าเป็น 429 (Too Many Requests)
      if (error.response?.status !== 429) {
        console.error('❌ TradingContext: Error updating simulation:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [simulation, currentPrice, signal, fetchTrades]);

  // สร้างการจำลองการเทรดใหม่
  const createSimulation = useCallback(async (investment: number, symbol: string = 'BTCUSDT', settings?: any) => {
    try {
      setLoading(true);
      const response = await tradingAPI.createSimulation({
        symbol,
        initialInvestment: investment,
        settings: {
          buyPercentage: 30, // ลดจาก 50% เป็น 30%
          minBuyAmount: 10,
          maxBuyAmount: 1000,
          sellPercentage: 30, // ลดจาก 50% เป็น 30%
          minSellAmount: 0.0001,
          maxSellAmount: 1,
          minConfidence: 60, // เพิ่มเป็น 60 เพื่อลดการเทรดและลดความเสี่ยง
          ...settings,
        },
      });
      setSimulation(response.data.data);
      
      // ดึงข้อมูลย้อนหลัง 1 ปีทันทีหลังจากสร้าง simulation
      // เรียก API เพื่อดึงข้อมูล klines ย้อนหลัง 1 ปี (interval: 1d = 1 วัน)
      try {
        console.log(`[TradingContext] 📊 กำลังดึงข้อมูลย้อนหลัง 1 ปีสำหรับ ${symbol}...`);
        const klinesResponse = await cryptoAPI.getKlines(symbol, {
          years: 1,
          interval: '1d', // 1 วันต่อจุด = 365 จุดสำหรับ 1 ปี
        });
        
        if (klinesResponse.data && klinesResponse.data.data) {
          const historicalData = klinesResponse.data.data.map((kline: any) => ({
            price: kline.price || kline.close,
            timestamp: kline.timestamp || kline.openTime,
            date: kline.date || new Date(kline.timestamp || kline.openTime),
            high: kline.high,
            low: kline.low,
            open: kline.open,
            volume: kline.volume,
          }));
          
          console.log(`[TradingContext] ✅ ดึงข้อมูลย้อนหลัง 1 ปีสำเร็จ: ${historicalData.length} จุด`);
          setPriceHistory(historicalData);
        }
      } catch (error: any) {
        console.warn(`[TradingContext] ⚠️ ไม่สามารถดึงข้อมูลย้อนหลัง 1 ปีได้: ${error.message}`);
        // ถ้าไม่สามารถดึงได้ ให้ใช้ fetchSignal แทน (backend จะดึงให้อัตโนมัติ)
      }
      
      // ดึง signal และข้อมูลเพิ่มเติม (backend จะดึงข้อมูล 1 ปีอัตโนมัติถ้ายังไม่มี)
      setTimeout(async () => {
        await fetchSignal(symbol, true); // force = true เพื่อให้ดึงข้อมูลทันที
      }, 1000);
      
      // รอสักครู่ก่อนเปิด auto-update เพื่อป้องกัน request มากเกินไป
      setTimeout(() => {
        setAutoUpdate(true);
      }, 3000);
      
      // ดึง trades หลังจากรอสักครู่
      setTimeout(async () => {
        await fetchTrades(response.data.data._id);
      }, 2000);
    } catch (error: any) {
      console.error('Error creating simulation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchTrades]);

  // หยุดการจำลองการเทรด - หยุดทุกอย่างและเคลียร์ข้อมูลทั้งหมด
  const stopSimulation = useCallback(async () => {
    if (!simulation) {
      // ถ้าไม่มี simulation แล้ว ให้เคลียร์ทุกอย่างเลย
      setAutoUpdate(false);
      setSimulation(null);
      setTrades([]);
      setSignal(null);
      setPriceHistory([]);
      setPredictions([]);
      setCurrentPrice(0);
      return;
    }

    try {
      // หยุด auto-update ทันที (ก่อนเรียก API)
      setAutoUpdate(false);
      
      // หยุด intervals ทั้งหมด
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (signalIntervalRef.current) {
        clearInterval(signalIntervalRef.current);
        signalIntervalRef.current = null;
      }
      
      // ตัดการเชื่อมต่อ WebSocket (ถ้ามี) - ใช้ disconnect จาก useWebSocket
      // Note: disconnect จะถูกเรียกอัตโนมัติเมื่อ enabled เปลี่ยนเป็น false
      
      // เรียก API เพื่อหยุด simulation บน server
      const simulationId = simulation._id;
      try {
        await tradingAPI.stopSimulation(simulationId);
      } catch (error) {
        // ถ้า API error ก็ไม่เป็นไร - เราจะเคลียร์ข้อมูลอยู่แล้ว
        console.warn('Warning: Error stopping simulation on server:', error);
      }
      
      // Reset simulation state เพื่อกลับไปหน้าเริ่มต้น - เคลียร์ทุกอย่าง
      setSimulation(null);
      setTrades([]);
      setSignal(null);
      setPriceHistory([]);
      setPredictions([]);
      setCurrentPrice(0);
      
      // Reset loading state
      setLoading(false);
    } catch (error) {
      console.error('Error stopping simulation:', error);
      // แม้ว่าจะ error ก็เคลียร์ข้อมูลอยู่ดี
      setAutoUpdate(false);
      setSimulation(null);
      setTrades([]);
      setSignal(null);
      setPriceHistory([]);
      setPredictions([]);
      setCurrentPrice(0);
      setLoading(false);
    }
  }, [simulation]);

  // WebSocket connection - ทำงานเฉพาะเมื่อ login แล้วและมี simulation
  const { isConnected: wsConnected, disconnect } = useWebSocket({
    url: WS_URL,
    token: isAuthenticated() ? (token || undefined) : undefined,
    enabled: isAuthenticated() && simulation !== null, // เปิด WebSocket เฉพาะเมื่อ login แล้วและมี simulation
    onMessage: (message) => {
      // ราคาจะถูกอัพเดทผ่าน PriceContext แล้ว
      // WebSocket นี้ใช้สำหรับข้อมูลอื่นๆ (ถ้ามี)
    },
    onConnected: () => {
      setIsConnected(true);
    },
    onDisconnected: () => {
      if (import.meta.env.DEV) {
        console.log('🔌 TradingContext: ตัดการเชื่อมต่อ WebSocket');
      }
      setIsConnected(false);
    },
    autoReconnect: true,
  });

  // อัพเดทราคาจาก PriceContext แบบ real-time ทันทีเมื่อราคาเปลี่ยน
  const lastPriceRef = useRef<number>(0);
  const lastSignalRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!realtimePrices) {
      return;
    }
    const btcPrice = realtimePrices.get('BTCUSDT');
    if (btcPrice && btcPrice.price) {
      const newPrice = btcPrice.price;
      const oldPrice = lastPriceRef.current;
      
      // อัพเดทราคาทันที
      setCurrentPrice(newPrice);
      lastPriceRef.current = newPrice;
      
      // ถ้ามี simulation และราคาเปลี่ยน → อัพเดท simulation ทันที (พร้อม debounce)
      if (simulation && autoUpdate && oldPrice > 0 && newPrice !== oldPrice) {
        // Clear timeout เดิม (ถ้ามี)
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // ใช้ debounce เพื่อป้องกันการเรียก API บ่อยเกินไป
        updateTimeoutRef.current = setTimeout(() => {
          updateSimulation();
        }, 1000); // ลดจาก 2 วินาทีเป็น 1 วินาทีเพื่อตอบสนองเร็วกว่า
      }
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [realtimePrices, simulation, autoUpdate, updateSimulation]);

  // ตรวจสอบสัญญาณใหม่และอัพเดท simulation ทันทีเมื่อสัญญาณเปลี่ยน
  useEffect(() => {
    if (!simulation || !autoUpdate || !signal) {
      return;
    }

    const currentSignal = signal.signal || '';
    const lastSignal = lastSignalRef.current;

    // ถ้าสัญญาณเปลี่ยนจาก HOLD/ไม่มีสัญญาณ เป็น BUY/SELL → อัพเดททันที
    if (currentSignal && currentSignal !== 'hold' && currentSignal !== lastSignal) {
      // ถ้าสัญญาณเปลี่ยนเป็น BUY หรือ SELL → อัพเดททันที (ไม่ต้องรอราคาเปลี่ยน)
      if ((currentSignal === 'buy' || currentSignal === 'sell') && signal.confidence >= 50) {
        console.log(`[TradingContext] 🚀 สัญญาณเปลี่ยนเป็น ${currentSignal.toUpperCase()} (Confidence: ${signal.confidence}%) - อัพเดท simulation ทันที`);
        
        // Clear timeout เดิม (ถ้ามี)
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // อัพเดททันที (ไม่ต้อง debounce เพราะสัญญาณเปลี่ยนแล้ว)
        updateSimulation();
      }
      
      lastSignalRef.current = currentSignal;
    }
  }, [signal, simulation, autoUpdate, updateSimulation]);

  // อัพเดท simulation เป็นระยะๆ (ทุก 5 วินาที) เพื่อตรวจสอบสัญญาณใหม่ แม้ว่าราคาจะไม่เปลี่ยน
  useEffect(() => {
    if (!simulation || !autoUpdate) {
      // Clear interval ถ้าไม่มี simulation หรือปิด auto-update
      if (periodicUpdateIntervalRef.current) {
        clearInterval(periodicUpdateIntervalRef.current);
        periodicUpdateIntervalRef.current = null;
      }
      return;
    }

    // เรียก updateSimulation ทุก 5 วินาทีเพื่อตรวจสอบสัญญาณใหม่
    periodicUpdateIntervalRef.current = setInterval(() => {
      console.log('[TradingContext] ⏰ Periodic update - ตรวจสอบสัญญาณใหม่');
      updateSimulation();
    }, 5000); // ทุก 5 วินาที

    return () => {
      if (periodicUpdateIntervalRef.current) {
        clearInterval(periodicUpdateIntervalRef.current);
        periodicUpdateIntervalRef.current = null;
      }
    };
  }, [simulation, autoUpdate, updateSimulation]);

  // เริ่มต้น - ดึงข้อมูลเมื่อ mount (เฉพาะเมื่อ login แล้ว)
  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้ login แล้วหรือยัง
    if (!isAuthenticated()) {
      return; // ไม่ต้องทำอะไรถ้ายังไม่ login
    }

    const init = async () => {
      await fetchSimulation();
      // ดึง signal สำหรับ BTCUSDT (ใช้แค่เหรียญเดียว) - เพื่อดึงข้อมูล 1 ปี
      // เรียก fetchSignal เสมอเพื่อให้ดึงข้อมูล history และ predictions มาแสดง
      // ไม่ต้องเช็ค simulation เพราะเราต้องการดึงข้อมูล 1 ปีมาแสดงในกราฟ
      setTimeout(() => {
        fetchSignal('BTCUSDT');
      }, 1000); // รอ 1 วินาทีเพื่อให้ backend โหลดข้อมูลเสร็จ
    };
    init();
  }, []); // เรียกแค่ครั้งเดียวเมื่อ mount

  // Auto-update signal ทุก 30 วินาที (ลดความถี่เพื่อลด request)
  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้ login แล้วหรือยัง
    if (!isAuthenticated()) {
      return; // ไม่ต้องทำอะไรถ้ายังไม่ login
    }

    // ปิดการ auto-update signal อัตโนมัติ - ใช้แค่เมื่อจำเป็น
    // ถ้ามี simulation แล้ว ไม่ต้องดึง signal แยก เพราะ updateSimulation จะดึงมาให้แล้ว
    if (!simulation) {
      // ถ้ายังไม่มี simulation ให้ดึง BTCUSDT แค่ครั้งเดียว
      // signalIntervalRef.current = setInterval(() => {
      //   fetchSignal('BTCUSDT');
      // }, 60000); // ปิดการ auto-update
    }

    return () => {
      if (signalIntervalRef.current) {
        clearInterval(signalIntervalRef.current);
      }
    };
  }, [simulation, fetchSignal]);

  // อัพเดท simulation ครั้งแรกเมื่อเปิด auto-update (ไม่ใช้ interval - ใช้การเปลี่ยนแปลงราคาแทน)
  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้ login แล้วหรือยัง
    if (!isAuthenticated()) {
      return; // ไม่ต้องทำอะไรถ้ายังไม่ login
    }

    if (autoUpdate && simulation) {
      // อัพเดททันทีครั้งแรกเมื่อเปิด auto-update
      updateSimulation();
    }
  }, [autoUpdate, simulation, updateSimulation]);

  // ดึง trades เมื่อ simulation เปลี่ยน (แค่ครั้งเดียว ไม่ต้องดึงบ่อย)
  useEffect(() => {
    if (simulation) {
      // ดึง trades แค่ครั้งเดียวเมื่อ simulation เปลี่ยน
      fetchTrades(simulation._id);
    }
  }, [simulation?._id]); // ใช้แค่ _id เพื่อไม่ให้ดึงซ้ำ

  const value: TradingContextType = {
    simulation,
    currentPrice,
    signal,
    priceHistory,
    predictions,
    trades,
    loading,
    autoUpdate,
    isConnected: wsConnected,
    createSimulation,
    stopSimulation,
    updateSimulation,
    fetchSignal,
    setAutoUpdate,
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};

