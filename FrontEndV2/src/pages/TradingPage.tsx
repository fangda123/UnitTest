import React, { useState, useEffect, useMemo } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  RefreshCw,
  DollarSign,
  BarChart3,
  Activity,
  AlertCircle,
  Zap,
  Lightbulb,
  Coins,
  Wallet,
  Target,
  Award,
  Gauge,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Rocket
} from 'lucide-react';
import TradingViewChart from '../components/Charts/TradingViewChart';
import LineChart from '../components/Charts/LineChart';
import { cryptoAPI } from '../services/api';
import { formatThaiBaht, formatPercentage, thbToUsd, usdToThb } from '../utils/currencyUtils';
import type { CandlestickData, HistogramData, LineData } from 'lightweight-charts';

function TradingPage() {
  // ใช้ TradingContext แทน local state - ทำงานใน background
  const {
    simulation,
    currentPrice,
    signal,
    priceHistory,
    predictions,
    trades,
    loading,
    autoUpdate,
    isConnected,
    createSimulation: createSim,
    stopSimulation: stopSim,
    updateSimulation,
    fetchSignal,
    setAutoUpdate,
  } = useTrading();

  const [investment, setInvestment] = useState<string>('1000');
  const [initialBuyPercentage, setInitialBuyPercentage] = useState<string>('50'); // เปอร์เซ็นต์การซื้อครั้งแรก (เพิ่มเป็น 50% เพื่อให้ได้กำไรรวดเร็ว)
  const [isCreating, setIsCreating] = useState(false);
  const [recommendedSettings, setRecommendedSettings] = useState<{
    minBuyAmount: number;
    maxBuyAmount: number;
    avgBuyAmount: number;
    minSellAmount: number;
    maxSellAmount: number;
    avgSellAmount: number;
    reasons: string[];
  } | null>(null);
  
  // State สำหรับเอฟเฟกต์เมื่อได้กำไร
  const [showProfitEffect, setShowProfitEffect] = useState(false);
  const [profitAmount, setProfitAmount] = useState<number>(0);
  const [lastTradeCount, setLastTradeCount] = useState<number>(0);
  
  // State สำหรับกราฟ TradingView
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [volumeData, setVolumeData] = useState<HistogramData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1w');

  // ใช้แค่ BTCUSDT เท่านั้น
  const selectedSymbol = 'BTCUSDT';

  // คำนวณค่าที่แนะนำตามหลักการ Advanced Risk Management (Dynamic Position Sizing)
  // investmentAmount รับเป็นบาทไทย
  const calculateRecommendedSettings = (investmentAmount: number) => {
    if (investmentAmount <= 0) {
      setRecommendedSettings(null);
      return;
    }

    // แปลงเป็น USD สำหรับการคำนวณ (backend ใช้ USD)
    const investmentUSD = thbToUsd(investmentAmount);

    // ใช้หลักการ Risk Management แบบง่ายและชัดเจน
    // สำหรับเงินลงทุนน้อย ใช้ risk น้อย, เงินลงทุนมาก ใช้ risk มากขึ้นแต่ไม่เกิน 5%
    
    // คำนวณ risk percentage ตามเงินลงทุน (ใช้ THB) - AGGRESSIVE MODE: เพิ่ม risk เพื่อให้ได้กำไรมากและเร็วขึ้น
    let riskPercent = 0.03; // Default 3% ของเงินลงทุน (เพิ่มจาก 1% เป็น 3%)
    if (investmentAmount < 1800) { // ~50 USD = 1800 THB
      riskPercent = 0.02; // 2% สำหรับเงินลงทุนน้อยมาก (เพิ่มจาก 0.5%)
    } else if (investmentAmount < 3600) { // ~100 USD = 3600 THB
      riskPercent = 0.025; // 2.5% สำหรับเงินลงทุนน้อย (เพิ่มจาก 0.7%)
    } else if (investmentAmount < 18000) { // ~500 USD = 18000 THB
      riskPercent = 0.03; // 3% สำหรับเงินลงทุนปานกลาง (เพิ่มจาก 1%)
    } else if (investmentAmount < 36000) { // ~1000 USD = 36000 THB
      riskPercent = 0.04; // 4% สำหรับเงินลงทุนมาก (เพิ่มจาก 1.5%)
    } else {
      riskPercent = 0.05; // 5% สำหรับเงินลงทุนมากมาก (เพิ่มจาก 2% เป็น 5% - สูงสุด)
    }
    
    // ปรับตาม Market Regime (ถ้ามี signal) - AGGRESSIVE MODE: ลดการลด risk เพื่อให้ได้กำไรมากขึ้น
    if (signal && signal.indicators?.marketRegime) {
      const marketRegime = signal.indicators.marketRegime;
      if (marketRegime === 'bull') {
        riskPercent = riskPercent * 1.2; // เพิ่ม 20% ใน bull market (เดิมไม่เพิ่ม)
      } else if (marketRegime === 'bear') {
        riskPercent = riskPercent * 0.8; // ลดแค่ 20% ใน bear market (เดิมลด 40%)
      } else if (marketRegime === 'volatile') {
        riskPercent = riskPercent * 0.7; // ลดแค่ 30% ใน volatile market (เดิมลด 50%)
      } else if (marketRegime === 'sideways') {
        riskPercent = riskPercent * 0.9; // ลดแค่ 10% ใน sideways market (เดิมลด 20%)
      }
    }
    
    // ปรับตาม Volatility (ถ้ามี) - AGGRESSIVE MODE: ลดการลด risk
    if (signal && signal.indicators?.volatility?.volatility) {
      const volatility = typeof signal.indicators.volatility.volatility === 'number' 
        ? signal.indicators.volatility.volatility 
        : parseFloat(signal.indicators.volatility.volatility || 0);
      if (volatility > 5) {
        riskPercent = riskPercent * 0.8; // ลดแค่ 20% ถ้า volatility สูงมาก (เดิมลด 40%)
      } else if (volatility > 3) {
        riskPercent = riskPercent * 0.9; // ลดแค่ 10% ถ้า volatility สูง (เดิมลด 20%)
      } else if (volatility < 2) {
        riskPercent = riskPercent * 1.1; // เพิ่ม 10% ถ้า volatility ต่ำ (เดิมไม่เพิ่ม)
      }
    }
    
    // จำกัด risk ระหว่าง 1% ถึง 8% (เพิ่มจาก 0.5%-5% เป็น 1%-8% เพื่อให้ aggressive มากขึ้น)
    riskPercent = Math.max(0.01, Math.min(0.08, riskPercent));
    
    // คำนวณ Buy Amount (ใช้ THB โดยตรง - ง่ายกว่า)
    // AGGRESSIVE MODE: จำกัด Max ไม่เกิน 10% ของเงินลงทุน (เพิ่มจาก 5% เป็น 10% เพื่อให้เทรดมากกว่า)
    const maxBuyAmountLimit = Math.round(investmentAmount * 0.10);
    
    // คำนวณ base amount จาก risk
    const baseBuyAmount = investmentAmount * riskPercent;
    
    // คำนวณ Max ก่อน (3x ของ risk แต่ไม่เกิน 10%) - เพิ่มจาก 2x เป็น 3x
    let maxBuyAmount = Math.min(Math.round(baseBuyAmount * 3), maxBuyAmountLimit);
    
    // ตรวจสอบว่า Max ต้องมีค่าอย่างน้อย 50 ฿ (สำหรับเงินลงทุนน้อย)
    const minMaxAmount = Math.max(50, Math.round(investmentAmount * 0.01)); // อย่างน้อย 1% ของเงินลงทุน หรือ 50 ฿
    maxBuyAmount = Math.max(maxBuyAmount, minMaxAmount);
    
    // คำนวณ Min (30% ของ Max - เพื่อให้ Min < Max เสมอ)
    // อย่างน้อย 0.36 ฿ (0.01 USD) เพื่อให้ผ่าน backend validation
    const minBuyAmountTHB = Math.max(0.36, Math.round(maxBuyAmount * 0.3)); // อย่างน้อย 0.36 ฿ (0.01 USD)
    let minBuyAmount = Math.round(minBuyAmountTHB);
    
    // ตรวจสอบว่า Min ไม่เกิน 30% ของเงินลงทุน
    const minBuyAmountLimit = Math.round(investmentAmount * 0.30);
    minBuyAmount = Math.min(minBuyAmount, minBuyAmountLimit);
    
    // ตรวจสอบว่า Min < Max เสมอ
    if (minBuyAmount >= maxBuyAmount) {
      minBuyAmount = Math.max(0.36, Math.round(maxBuyAmount * 0.3)); // อย่างน้อย 0.36 ฿ (0.01 USD)
    }
    
    // คำนวณ Avg (ค่าเฉลี่ยระหว่าง Min และ Max)
    let avgBuyAmount = Math.round((minBuyAmount + maxBuyAmount) / 2);
    
    // ตรวจสอบว่า Min < Avg < Max เสมอ
    if (avgBuyAmount <= minBuyAmount) {
      avgBuyAmount = minBuyAmount + 1;
    }
    if (avgBuyAmount >= maxBuyAmount) {
      avgBuyAmount = maxBuyAmount - 1;
    }
    
    // แปลงเป็น USD สำหรับส่งไป backend
    const finalMinBuyAmountUSD = thbToUsd(minBuyAmount);
    const finalMaxBuyAmountUSD = thbToUsd(maxBuyAmount);
    const finalAvgBuyAmountUSD = thbToUsd(avgBuyAmount);
    
    // เก็บค่าเป็น THB สำหรับแสดงผล
    const finalMinBuyAmount = minBuyAmount;
    const finalMaxBuyAmount = maxBuyAmount;
    const finalAvgBuyAmount = avgBuyAmount;
    
    // คำนวณ Sell Amount จาก Buy Amount (ใช้ THB ก่อน แล้วแปลงเป็น BTC)
    const estimatedBTCPrice = currentPrice > 0 ? currentPrice : 100000; // USD
    const estimatedBTCPriceTHB = usdToThb(estimatedBTCPrice); // แปลงเป็น THB
    
    // AGGRESSIVE MODE: Min Sell = 0.5x ของ Min Buy (เพิ่มจาก 0.3x เพื่อให้ขายได้บ่อยขึ้นและได้กำไรมากขึ้น)
    const minSellAmount = Math.max(0.0001, (finalMinBuyAmount / estimatedBTCPriceTHB) * 0.5);
    
    // AGGRESSIVE MODE: Max Sell = 1.5x ของ Max Buy (เพิ่มจาก 1.0x เพื่อให้ขายได้มากกว่าและได้กำไรมากขึ้น)
    const maxSellAmount = Math.max(0.001, (finalMaxBuyAmount / estimatedBTCPriceTHB) * 1.5);
    
    // Avg Sell = ค่าเฉลี่ย
    const avgSellAmount = (minSellAmount + maxSellAmount) / 2;

    // คำนวณเปอร์เซ็นต์จริง
    const actualMinPercent = ((finalMinBuyAmount / investmentAmount) * 100).toFixed(2);
    const actualMaxPercent = ((finalMaxBuyAmount / investmentAmount) * 100).toFixed(2);
    const actualAvgPercent = ((finalAvgBuyAmount / investmentAmount) * 100).toFixed(2);
    const riskPercentDisplay = (riskPercent * 100).toFixed(2);

    // สร้างเหตุผลตามหลักการ Risk Management
    const reasons = [
      `⚡ AGGRESSIVE MODE: ใช้ ${riskPercentDisplay}% ของเงินลงทุนต่อการเทรด (เพิ่ม risk เพื่อให้ได้กำไรมากและเร็วที่สุด)`,
      `💰 Min Buy Amount (${finalMinBuyAmount.toLocaleString('th-TH')} ฿): ${actualMinPercent}% - ค่าต่ำสุดสำหรับการซื้อ (30% ของ Max)`,
      `📊 Avg Buy Amount (${finalAvgBuyAmount.toLocaleString('th-TH')} ฿): ${actualAvgPercent}% - ค่าเฉลี่ยที่แนะนำ (ระหว่าง Min และ Max)`,
      `💵 Max Buy Amount (${finalMaxBuyAmount.toLocaleString('th-TH')} ฿): ${actualMaxPercent}% - ค่าสูงสุดสำหรับการซื้อ (3x ของ Risk, ไม่เกิน 10% - AGGRESSIVE MODE)`,
      `📉 Min Sell Amount (${minSellAmount.toFixed(6)} BTC): 0.5x ของ Min Buy - AGGRESSIVE: เพิ่มการขายเพื่อได้กำไรมากขึ้น`,
      `📊 Avg Sell Amount (${avgSellAmount.toFixed(6)} BTC): ค่าเฉลี่ยที่แนะนำ`,
      `📈 Max Sell Amount (${maxSellAmount.toFixed(6)} BTC): 1.5x ของ Max Buy - AGGRESSIVE: เพิ่มการขายเพื่อได้กำไรมากขึ้น`,
    ];

    // เพิ่มเหตุผลตาม Market Regime และ Volatility
    if (signal && signal.indicators?.marketRegime) {
      const marketRegime = signal.indicators.marketRegime;
      if (marketRegime === 'bull') {
        reasons.push(`📈 Bull Market: เพิ่ม position size 10% (regime multiplier: 1.1)`);
      } else if (marketRegime === 'bear') {
        reasons.push(`📉 Bear Market: ลด position size 40% (regime multiplier: 0.6)`);
      } else if (marketRegime === 'volatile') {
        reasons.push(`⚡ Volatile Market: ลด position size 60% (regime multiplier: 0.4)`);
      } else if (marketRegime === 'sideways') {
        reasons.push(`↔️ Sideways Market: ลด position size 20% (regime multiplier: 0.8)`);
      }
    }

    if (signal && signal.indicators?.volatility?.volatility) {
      // แปลงเป็น number ถ้าเป็น string
      const volatility = typeof signal.indicators.volatility.volatility === 'number' 
        ? signal.indicators.volatility.volatility 
        : parseFloat(signal.indicators.volatility.volatility || 0);
      if (volatility > 5) {
        reasons.push(`⚠️ High Volatility (${volatility.toFixed(2)}%): ลด position size 50%`);
      } else if (volatility < 2) {
        reasons.push(`✅ Low Volatility (${volatility.toFixed(2)}%): เพิ่ม position size 10%`);
      }
    }

    if (signal && signal.confidence) {
      reasons.push(`🎯 Confidence: ${signal.confidence}% - ปรับ position size ตาม confidence`);
    }

    setRecommendedSettings({
      minBuyAmount: finalMinBuyAmount,
      maxBuyAmount: finalMaxBuyAmount,
      avgBuyAmount: finalAvgBuyAmount,
      minSellAmount,
      maxSellAmount,
      avgSellAmount,
      reasons,
    });
  };

  // เมื่อเงินลงทุนเปลี่ยน
  const handleInvestmentChange = (value: string) => {
    setInvestment(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      calculateRecommendedSettings(amount);
    } else {
      setRecommendedSettings(null);
    }
  };

  // คำนวณค่าที่แนะนำเมื่อ component mount, currentPrice, หรือ signal เปลี่ยน
  // (เพื่อให้คำนวณตาม Market Regime, Volatility, Confidence)
  useEffect(() => {
    const amount = parseFloat(investment);
    if (!isNaN(amount) && amount > 0) {
      calculateRecommendedSettings(amount);
    }
  }, [currentPrice, signal]); // Recalculate when BTC price or signal changes

  // สร้างการจำลองการเทรดใหม่ (พร้อม debounce เพื่อป้องกัน request มากเกินไป)
  const handleCreateSimulation = async () => {
    // ป้องกันการเรียกซ้ำ
    if (isCreating || loading) {
      return;
    }

    try {
      setIsCreating(true);
      // แปลงจากบาทไทยเป็น USD ก่อนส่งไป backend (backend ใช้ USD)
      const investmentUSD = thbToUsd(parseFloat(investment));
      const minBuyInput = (document.getElementById('minBuyAmount') as HTMLInputElement)?.value;
      const maxBuyInput = (document.getElementById('maxBuyAmount') as HTMLInputElement)?.value;
      const minSellInput = (document.getElementById('minSellAmount') as HTMLInputElement)?.value;
      const maxSellInput = (document.getElementById('maxSellAmount') as HTMLInputElement)?.value;
      
      // ตรวจสอบว่าค่าที่กรอกถูกต้อง
      const minBuyTHB = parseFloat(minBuyInput || '0');
      const maxBuyTHB = parseFloat(maxBuyInput || '0');
      const minSell = parseFloat(minSellInput || '0');
      const maxSell = parseFloat(maxSellInput || '0');
      
      console.log('🔍 Debug - Input values:', {
        minBuyInput,
        maxBuyInput,
        minSellInput,
        maxSellInput,
        minBuyTHB,
        maxBuyTHB,
        minSell,
        maxSell,
        investment,
        investmentUSD,
      });
      
      // ตรวจสอบว่า parseFloat ได้ค่าถูกต้อง (ไม่ใช่ NaN)
      if (isNaN(minBuyTHB) || isNaN(maxBuyTHB) || isNaN(minSell) || isNaN(maxSell)) {
        alert(`กรุณากรอกค่าทั้งหมดให้ถูกต้อง (ไม่ใช่ตัวเลข)\nMin Buy: ${minBuyInput}\nMax Buy: ${maxBuyInput}\nMin Sell: ${minSellInput}\nMax Sell: ${maxSellInput}`);
        setIsCreating(false);
        return;
      }
      
      // แปลงเป็น USD
      const minBuy = thbToUsd(minBuyTHB);
      const maxBuy = thbToUsd(maxBuyTHB);
      
      console.log('🔍 Debug - Converted to USD:', {
        minBuy,
        maxBuy,
        minSell,
        maxSell,
      });
      
      // ตรวจสอบว่าค่า USD ต้อง >= 0.01 (backend ต้องการอย่างน้อย 0.01 USD)
      if (minBuy < 0.01 || maxBuy < 0.01) {
        alert(`Buy Amount ใน USD ต้องอย่างน้อย 0.01 USD\nMin Buy: ${minBuy.toFixed(4)} USD (${minBuyTHB} ฿)\nMax Buy: ${maxBuy.toFixed(4)} USD (${maxBuyTHB} ฿)\n\nกรุณาเพิ่มค่า Min/Max Buy Amount`);
        setIsCreating(false);
        return;
      }
      
      // ตรวจสอบ validation
      if (minBuyTHB <= 0 || maxBuyTHB <= 0 || minSell <= 0 || maxSell <= 0) {
        alert(`กรุณากรอกค่าทั้งหมดให้ถูกต้อง (ค่าต้องมากกว่า 0)\nMin Buy: ${minBuyTHB} ฿\nMax Buy: ${maxBuyTHB} ฿\nMin Sell: ${minSell} BTC\nMax Sell: ${maxSell} BTC`);
        setIsCreating(false);
        return;
      }
      
      if (minBuyTHB >= maxBuyTHB) {
        alert(`Min Buy Amount (${minBuyTHB} ฿) ต้องน้อยกว่า Max Buy Amount (${maxBuyTHB} ฿)`);
        setIsCreating(false);
        return;
      }
      
      if (minSell >= maxSell) {
        alert(`Min Sell Amount (${minSell} BTC) ต้องน้อยกว่า Max Sell Amount (${maxSell} BTC)`);
        setIsCreating(false);
        return;
      }
      
      if (minBuyTHB > parseFloat(investment) || maxBuyTHB > parseFloat(investment)) {
        alert(`Buy Amount ต้องไม่เกินเงินลงทุน (${parseFloat(investment)} ฿)\nMin Buy: ${minBuyTHB} ฿\nMax Buy: ${maxBuyTHB} ฿`);
        setIsCreating(false);
        return;
      }
      
      // ตรวจสอบ initialBuyPercentage
      const initialBuyPercent = parseFloat(initialBuyPercentage || '0');
      if (isNaN(initialBuyPercent) || initialBuyPercent < 0 || initialBuyPercent > 100) {
        alert(`กรุณากรอกเปอร์เซ็นต์การซื้อครั้งแรกให้ถูกต้อง (0-100)\nค่าปัจจุบัน: ${initialBuyPercentage}`);
        setIsCreating(false);
        return;
      }

      const settings = {
        buyPercentage: 70, // AGGRESSIVE MODE: เพิ่มจาก 30% เป็น 70% เพื่อให้ซื้อมากและได้กำไรมากขึ้น
        minBuyAmount: minBuy,
        maxBuyAmount: maxBuy,
        sellPercentage: 70, // AGGRESSIVE MODE: เพิ่มจาก 30% เป็น 70% เพื่อให้ขายมากและได้กำไรมากขึ้น
        minSellAmount: minSell,
        maxSellAmount: maxSell,
        minConfidence: 40, // AGGRESSIVE MODE: ลดจาก 60% เป็น 40% เพื่อให้เทรดบ่อยขึ้นและได้กำไรมากขึ้น
        initialBuyPercentage: initialBuyPercent, // เปอร์เซ็นต์การซื้อครั้งแรก
      };
      
      console.log('🔍 Debug - Sending to backend:', {
        investmentUSD,
        symbol: 'BTCUSDT',
        settings,
      });
      
      await createSim(investmentUSD, 'BTCUSDT', settings);
      
      // รอสักครู่ก่อนให้ auto-update เริ่มทำงาน (ป้องกัน request มากเกินไป)
      setTimeout(() => {
        setIsCreating(false);
      }, 2000);
    } catch (error: any) {
      setIsCreating(false);
      console.error('❌ Error creating simulation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด';
      alert(`เกิดข้อผิดพลาด: ${errorMessage}\n\nกรุณาตรวจสอบค่าที่กรอกและลองอีกครั้ง`);
    }
  };

  // คำนวณ Profit/Loss จาก simulation
  const profit = simulation && currentPrice > 0
    ? (simulation.currentBalance + (simulation.holdings * currentPrice)) - simulation.initialInvestment
    : simulation?.totalProfit || 0;
  const profitPercentage = simulation && simulation.initialInvestment > 0
    ? (profit / simulation.initialInvestment) * 100
    : simulation?.profitPercentage || 0;

  // คำนวณสถิติการเทรด (เหมือน V2)
  const stats = useMemo(() => {
    if (!simulation || trades.length === 0) {
      return {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        avgProfit: 0,
        totalProfit: 0,
      };
    }

    const sellTrades = trades.filter((t: any) => t.type === 'sell');
    const winTrades = sellTrades.filter((t: any) => (t.profit || 0) > 0);
    const lossTrades = sellTrades.filter((t: any) => (t.profit || 0) < 0);
    const totalProfit = sellTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const avgProfit = sellTrades.length > 0 ? totalProfit / sellTrades.length : 0;

    return {
      totalTrades: simulation.totalTrades || 0,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate: sellTrades.length > 0 ? (winTrades.length / sellTrades.length) * 100 : 0,
      avgProfit,
      totalProfit,
    };
  }, [simulation, trades]);

  // คำนวณ price change (เหมือน V2)
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);
  
  useEffect(() => {
    if (currentPrice > 0) {
      if (lastPrice > 0 && currentPrice !== lastPrice) {
        const change = currentPrice - lastPrice;
        const changePercent = (change / lastPrice) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
        
        setTimeout(() => {
          setPriceChange(0);
          setPriceChangePercent(0);
        }, 1000);
      }
      setLastPrice(currentPrice);
    }
  }, [currentPrice, lastPrice]);

  // ตรวจจับเมื่อมีการเทรดใหม่ที่ได้กำไร - แสดงเอฟเฟกต์
  useEffect(() => {
    if (trades.length > lastTradeCount) {
      // มี trade ใหม่
      const newTrades = trades.slice(lastTradeCount);
      const profitableTrades = newTrades.filter((t: any) => 
        t.type === 'sell' && t.profit !== undefined && t.profit !== null && t.profit > 0
      );
      
      if (profitableTrades.length > 0) {
        // มี trade ที่ได้กำไร - แสดงเอฟเฟกต์
        const totalProfit = profitableTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
        setProfitAmount(totalProfit);
        setShowProfitEffect(true);
        
        // ซ่อนเอฟเฟกต์หลังจาก 3 วินาที
        setTimeout(() => {
          setShowProfitEffect(false);
        }, 3000);
      }
      
      setLastTradeCount(trades.length);
    }
  }, [trades, lastTradeCount]);

  // Map timeframe to Binance interval
  const timeframeMap: Record<string, string> = {
    '1s': '1m',
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
  };

  // ดึงข้อมูล klines สำหรับกราฟ candlestick
  const fetchKlines = async (interval: string) => {
    try {
      setChartLoading(true);
      const binanceInterval = timeframeMap[interval] || '1w';
      
      const response = await cryptoAPI.getKlines(selectedSymbol, {
        interval: binanceInterval,
        limit: 500,
      });

      const klines = response.data?.data || response.data || [];

      // Convert to candlestick format
      const candlesticks: CandlestickData[] = klines.map((kline: any) => {
        const timestamp = kline.openTime || kline.timestamp || kline.time || kline[0];
        return {
          time: (typeof timestamp === 'number' ? timestamp : parseInt(timestamp)) / 1000 as any,
          open: parseFloat(kline.open || kline[1] || 0),
          high: parseFloat(kline.high || kline[2] || 0),
          low: parseFloat(kline.low || kline[3] || 0),
          close: parseFloat(kline.close || kline[4] || 0),
        };
      }).filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);

      // Convert to volume format
      const volumes: HistogramData[] = klines.map((kline: any) => {
        const timestamp = kline.openTime || kline.timestamp || kline.time || kline[0];
        const close = parseFloat(kline.close || kline[4] || 0);
        const open = parseFloat(kline.open || kline[1] || 0);
        const isUp = close >= open;
        
        return {
          time: (typeof timestamp === 'number' ? timestamp : parseInt(timestamp)) / 1000 as any,
          value: parseFloat(kline.volume || kline[5] || 0),
          color: isUp ? '#10b981' : '#ef4444',
        };
      }).filter(v => v.value > 0);

      setCandlestickData(candlesticks);
      setVolumeData(volumes);
      setChartLoading(false);
    } catch (error) {
      console.error('Error fetching klines:', error);
      setChartLoading(false);
    }
  };

  // ดึงข้อมูล klines เมื่อ simulation เริ่มต้น
  useEffect(() => {
    if (simulation) {
      fetchKlines(selectedTimeframe);
      const interval = setInterval(() => fetchKlines(selectedTimeframe), 30000);
      return () => clearInterval(interval);
    }
  }, [simulation, selectedTimeframe]);

  // แปลง predictions เป็น LineData สำหรับแสดงในกราฟ (จุดสีส้ม)
  const predictionLineData: LineData[] = React.useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    
    // หา timestamp ล่าสุดจาก priceHistory หรือ candlestick data
    let lastTime = Date.now() / 1000;
    
    if (priceHistory && priceHistory.length > 0) {
      const lastHistory = priceHistory[priceHistory.length - 1];
      if (lastHistory) {
        const historyTimestamp = lastHistory.timestamp 
          ? (typeof lastHistory.timestamp === 'number' ? lastHistory.timestamp : parseInt(lastHistory.timestamp)) / 1000
          : lastHistory.date 
            ? new Date(lastHistory.date).getTime() / 1000
            : Date.now() / 1000;
        lastTime = historyTimestamp;
      }
    } else if (candlestickData.length > 0) {
      lastTime = candlestickData[candlestickData.length - 1].time as number;
    }
    
    return predictions
      .map((pred: any, index: number) => {
        // ใช้ timestamp จาก prediction ถ้ามี ไม่งั้นคำนวณจาก lastTime
        let timestamp = lastTime;
        
        if (pred.timestamp) {
          timestamp = (typeof pred.timestamp === 'number' ? pred.timestamp : parseInt(pred.timestamp)) / 1000;
        } else if (pred.date) {
          timestamp = new Date(pred.date).getTime() / 1000;
        } else {
          // คำนวณ timestamp ต่อจาก lastTime (5 นาทีต่อจุด)
          timestamp = lastTime + (index + 1) * 300;
        }
        
        const value = pred.price || pred.predictedPrice || 0;
        
        // ตรวจสอบว่า value เป็นตัวเลขที่ถูกต้อง
        if (typeof value !== 'number' || isNaN(value) || value <= 0) {
          return null;
        }
        
        return {
          time: timestamp as any,
          value: value,
        };
      })
      .filter((p: LineData | null): p is LineData => p !== null && typeof p.value === 'number' && !isNaN(p.value) && p.value > 0);
  }, [predictions, priceHistory, candlestickData]);

  // สร้าง chart data - แสดง Historical, Prediction, และ Actual (ถ้ามี) - สำหรับ LineChart เดิม (ยังใช้อยู่)
  const historicalData = priceHistory && priceHistory.length > 0 
    ? priceHistory.map((h: any) => (typeof h === 'object' ? h.price : h))
    : [];
  const predictionPrices = predictions && predictions.length > 0
    ? predictions.map((p: any) => (typeof p === 'object' ? p.price : p))
    : [];
  
  // สร้าง timestamps สำหรับ categories (แสดงวันเดือนปี)
  const historicalTimestamps = priceHistory && priceHistory.length > 0
    ? priceHistory.map((h: any, index: number) => {
        if (typeof h === 'object') {
          if (h.timestamp) {
            return new Date(h.timestamp).getTime();
          } else if (h.date) {
            return new Date(h.date).getTime();
          }
        }
        // ถ้าไม่มี timestamp ให้ใช้เวลาปัจจุบันลบด้วย index (สำหรับข้อมูล 1 ปี = 365 วัน)
        // ใช้ 1 วันต่อจุดสำหรับข้อมูลย้อนหลัง 1 ปี
        return Date.now() - (priceHistory.length - index) * 24 * 60 * 60 * 1000; // 1 วันต่อจุด
      })
    : [];
  
  // สร้าง timestamps สำหรับ predictions (ต่อจาก historical)
  const lastHistoricalTimestamp = historicalTimestamps.length > 0 
    ? historicalTimestamps[historicalTimestamps.length - 1]
    : Date.now();
  const predictionTimestamps = predictions && predictions.length > 0
    ? predictions.map((p: any, index: number) => {
        if (typeof p === 'object') {
          if (p.timestamp) {
            return new Date(p.timestamp).getTime();
          } else if (p.date) {
            return new Date(p.date).getTime();
          }
        }
        // ถ้าไม่มี timestamp ให้คำนวณจาก historical timestamp ล่าสุด + 5 นาทีต่อจุด
        return lastHistoricalTimestamp + (index + 1) * 5 * 60000; // 5 นาทีต่อจุด
      })
    : [];
  
  // รวม timestamps ทั้งหมด
  const allTimestamps = [...historicalTimestamps, ...predictionTimestamps];
  
  // ดึง actual prices จาก priceHistory ที่มี timestamp หลังจาก prediction
  // (สำหรับเปรียบเทียบ prediction กับ actual)
  const actualData: (number | null)[] = [];
  if (priceHistory.length > 0 && predictions.length > 0) {
    // สร้าง actual data โดยใช้ currentPrice เป็นจุดเริ่มต้น
    actualData.push(...Array(priceHistory.length).fill(null));
    // สำหรับ prediction period ใช้ currentPrice เป็น actual (จะอัพเดทเมื่อมีข้อมูลจริง)
    actualData.push(...Array(predictions.length).fill(currentPrice > 0 ? currentPrice : null));
  }

  const totalPoints = Math.max(
    (priceHistory?.length || 0) + (predictions?.length || 0), 
    historicalData.length + predictionPrices.length
  );
  
  // ตรวจสอบว่ามีข้อมูลหรือไม่ ถ้าไม่มีให้ใช้ string categories แทน
  const chartCategories = allTimestamps.length > 0 
    ? allTimestamps 
    : totalPoints > 0
    ? Array.from({ length: totalPoints }, (_, i) => {
        const historyLen = priceHistory?.length || 0;
        if (i < historyLen) {
          return `H${i + 1}`;
        } else {
          return `P${i - historyLen + 1}`;
        }
      })
    : [];
  
  // ตรวจสอบว่ามีข้อมูลสำหรับแสดงกราฟหรือไม่
  const hasChartData = historicalData.length > 0 || predictionPrices.length > 0;
  
  // ตรวจสอบว่ามีข้อมูลสำหรับแสดงกราฟหรือไม่
  const hasValidCategories = chartCategories.length > 0;
  
  // สร้าง series data ที่ตรงกับ timestamps
  // สำหรับ datetime mode ต้องใช้ [timestamp, value] และต้องมีจำนวนเท่ากับ timestamps
  const historicalSeriesData = historicalData.length > 0
    ? historicalData.map((price, index) => {
        // ใช้ timestamp ที่ตรงกับ index
        const timestamp = historicalTimestamps[index] || (Date.now() - (historicalData.length - index) * 24 * 60 * 60 * 1000);
        return price !== null && price !== undefined ? [timestamp, price] : null;
      }).filter(item => item !== null)
    : [];
  
  const predictionSeriesData = predictionPrices.length > 0
    ? predictionPrices.map((price, index) => {
        // ใช้ timestamp ที่ตรงกับ index (ต่อจาก historical)
        const timestamp = predictionTimestamps[index] || (lastHistoricalTimestamp + (index + 1) * 5 * 60000);
        return price !== null && price !== undefined ? [timestamp, price] : null;
      }).filter(item => item !== null)
    : [];
  
  // รวม historical และ prediction data สำหรับ series ที่แสดงทั้งสอง
  const combinedHistoricalData = historicalSeriesData.length > 0
    ? [...historicalSeriesData, ...Array(predictionPrices.length).fill(null)]
    : [];
  
  const combinedPredictionData = predictionPrices.length > 0
    ? [...Array(historicalData.length).fill(null), ...predictionSeriesData]
    : [];

  const chartData = {
    categories: hasValidCategories ? chartCategories : ['ไม่มีข้อมูล'], // ใช้ timestamps ถ้ามี หรือ string labels ถ้าไม่มี
    series: [
      {
        name: 'ราคาจริง (Historical)',
        data: combinedHistoricalData.length > 0 ? combinedHistoricalData : [],
        color: '#0ea5e9',
      },
      {
        name: 'การคำนวณอนาคต (Prediction)',
        data: combinedPredictionData.length > 0 ? combinedPredictionData : [],
        color: '#f59e0b',
        dashStyle: 'Dash' as const,
      },
      {
        name: 'ราคาจริงปัจจุบัน (Actual)',
        data: actualData.length > 0 ? actualData : [],
        color: '#10b981',
        dashStyle: 'Dot' as const,
      },
    ],
  };

  // คำนวณความแตกต่างระหว่าง prediction กับ actual
  const predictionComparison = predictions.map((pred: any, index: number) => {
    const actual = currentPrice;
    const predicted = pred.price;
    const difference = actual - predicted;
    const differencePercent = actual > 0 ? (difference / actual) * 100 : 0;
    
    return {
      period: pred.period,
      predicted,
      actual,
      difference,
      differencePercent,
      timestamp: pred.timestamp,
    };
  });

  // คำนวณโอกาสได้กำไรในแต่ละช่วงเวลา (5, 10, 15, 20, 30, 40, 50 นาที, 1 ชม., 2 ชม., 4 ชม., 8 ชม., 12 ชม., 1 วัน)
  // แต่ละ prediction period = 5 วินาที (ตามที่ตั้งไว้ใน backend)
  const calculateProfitOpportunities = () => {
    if (!simulation || !currentPrice || predictions.length === 0) {
      return [];
    }

    const timeIntervals = [
      { label: '5 นาที', minutes: 5, periods: 60 }, // 5 นาที = 60 periods (60 * 5 วินาที)
      { label: '10 นาที', minutes: 10, periods: 120 },
      { label: '15 นาที', minutes: 15, periods: 180 },
      { label: '20 นาที', minutes: 20, periods: 240 },
      { label: '30 นาที', minutes: 30, periods: 360 },
      { label: '40 นาที', minutes: 40, periods: 480 },
      { label: '50 นาที', minutes: 50, periods: 600 },
      { label: '1 ชั่วโมง', minutes: 60, periods: 720 },
      { label: '2 ชั่วโมง', minutes: 120, periods: 1440 },
      { label: '4 ชั่วโมง', minutes: 240, periods: 2880 },
      { label: '8 ชั่วโมง', minutes: 480, periods: 5760 },
      { label: '12 ชั่วโมง', minutes: 720, periods: 8640 },
      { label: '1 วัน', minutes: 1440, periods: 17280 },
    ];

    const opportunities = timeIntervals.map(interval => {
      // หา prediction ที่ใกล้เคียงกับช่วงเวลานี้
      const targetPeriod = Math.min(interval.periods, predictions.length);
      const prediction = predictions[targetPeriod - 1] || predictions[predictions.length - 1];
      
      if (!prediction) {
        return null;
      }

      const predictedPrice = prediction.price;
      const priceChange = predictedPrice - currentPrice;
      const priceChangePercent = (priceChange / currentPrice) * 100;

      // คำนวณโอกาสได้กำไร (ถ้ามี holdings)
      let profitOpportunity = 0;
      let profitOpportunityPercent = 0;
      
      if (simulation.holdings > 0) {
        // ถ้ามี holdings แล้ว - คำนวณกำไรจากการขาย
        const currentValue = simulation.holdings * currentPrice;
        const futureValue = simulation.holdings * predictedPrice;
        profitOpportunity = futureValue - currentValue;
        profitOpportunityPercent = (profitOpportunity / currentValue) * 100;
      } else if (simulation.currentBalance > 0) {
        // ถ้ายังไม่มี holdings - คำนวณกำไรจากการซื้อ
        const canBuy = simulation.currentBalance / currentPrice;
        const futureValue = canBuy * predictedPrice;
        profitOpportunity = futureValue - simulation.currentBalance;
        profitOpportunityPercent = (profitOpportunity / simulation.currentBalance) * 100;
      }

      // กำหนดสัญญาณ
      let signal = 'hold';
      if (priceChangePercent > 1) {
        signal = 'buy'; // ราคาจะขึ้น - ควรซื้อ
      } else if (priceChangePercent < -1) {
        signal = 'sell'; // ราคาจะลง - ควรขาย
      }

      return {
        timeLabel: interval.label,
        minutes: interval.minutes,
        predictedPrice,
        currentPrice,
        priceChange,
        priceChangePercent,
        profitOpportunity,
        profitOpportunityPercent,
        signal,
        confidence: prediction.confidence || 0,
      };
    }).filter(item => item !== null);

    return opportunities;
  };

  const profitOpportunities = calculateProfitOpportunities();

  // ตรวจสอบสถานะการเทรด
  const tradingStatus = {
    isReady: priceHistory.length >= 30 && predictions.length > 0,
    isActive: simulation?.status === 'active',
    dataPoints: priceHistory.length,
    requiredDataPoints: 30,
    canTrade: simulation && signal && signal.confidence >= 50,
    nextTradeTime: signal && signal.signal && signal.signal !== 'hold' ? 'พร้อมเทรด' : 'รอสัญญาณ',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6 relative overflow-hidden">
      {/* Profit Celebration Effect */}
      {showProfitEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          {/* Confetti Effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    i % 4 === 0 ? 'bg-success' :
                    i % 4 === 1 ? 'bg-warning' :
                    i % 4 === 2 ? 'bg-primary' :
                    'bg-purple-500'
                  }`}
                />
              </div>
            ))}
          </div>
          
          {/* Profit Message */}
          <div className="relative z-10 bg-gradient-to-r from-success-500/90 to-success-600/90 rounded-2xl p-8 shadow-2xl border-2 border-success-400 animate-bounce-in">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold text-white mb-2">ได้กำไรแล้ว!</h2>
              <p className="text-2xl font-semibold text-white">
                +${profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                <span className="text-yellow-300 font-semibold">Total Value เพิ่มขึ้น!</span>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-success-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-warning-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-primary-400 rounded-full animate-ping opacity-75"></div>
        <div className="absolute top-40 right-40 w-2 h-2 bg-success-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-2 h-2 bg-warning-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative z-10">
      {/* Header with Glow Effect */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Rocket className="w-12 h-12 text-primary-500 animate-bounce" />
              <Sparkles className="w-6 h-6 text-warning-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-warning-400 to-success-400 mb-2 animate-pulse">
                ⚡ Trading Pro
              </h1>
              <p className="text-gray-400 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
                {isConnected ? 'Real-time Active' : 'Disconnected'}
                {autoUpdate && (
                  <span className="ml-2 px-2 py-1 bg-success/20 text-success rounded-full text-xs flex items-center gap-1 animate-pulse">
                    <Zap className="w-3 h-3" />
                    Auto Trading
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Simulation Controls */}
      {!simulation ? (
        <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-8 border border-primary-500/30 shadow-2xl mb-8 relative overflow-hidden group">
          {/* Animated border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
          <div className="relative z-10">
          <h3 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
            เริ่มการจำลองการเทรด
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-primary-900/20 border border-primary-700/50 rounded-lg">
              <p className="text-sm text-primary-300 font-semibold">💰 เทรด BTCUSDT เท่านั้น</p>
              <p className="text-xs text-gray-400 mt-1">ระบบจะเก็บข้อมูลและคำนวณสัญญาณเฉพาะ BTCUSDT เพื่อลด delay</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">เงินลงทุนเริ่มต้น (USD)</label>
              <input
                type="number"
                value={investment}
                onChange={(e) => handleInvestmentChange(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                placeholder="1000"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">จำนวนเงินที่ต้องการลงทุน</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Force Buy - เปอร์เซ็นต์การซื้อครั้งแรก (%)
                <span className="ml-2 text-xs text-success-400 font-bold">⚡ AGGRESSIVE MODE: แนะนำ 50-70%</span>
              </label>
              <input
                type="number"
                value={initialBuyPercentage}
                onChange={(e) => setInitialBuyPercentage(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                min="0"
                max="100"
                placeholder="50"
              />
              <p className="text-xs text-success-400 mt-1 font-semibold">
                ⚡ AGGRESSIVE MODE: เปอร์เซ็นต์ของเงินลงทุนที่จะซื้อทันทีเมื่อเริ่มการเทรด (แนะนำ 50-70% เพื่อให้ได้กำไรมากและเร็วที่สุด)
              </p>
            </div>
            {recommendedSettings && (
                <div className="mt-3 p-4 bg-primary-900/20 border border-primary-700/50 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-success-300 mb-1">⚡ คำแนะนำค่าการเทรด (AGGRESSIVE MODE - เพื่อกำไรมากและเร็วที่สุด)</h4>
                      <p className="text-xs text-success-400 font-semibold">
                        ⚡ AGGRESSIVE MODE: ค่าที่แนะนำเพื่อให้ได้กำไรมากและเร็วที่สุด - ปรับตาม Market Regime, Volatility, และ Confidence
                        <br />
                        <span className="text-primary-400">💰 เงินลงทุน: ${Math.round(parseFloat(investment))}</span>
                        {signal && signal.confidence && (
                          <span className="ml-2 text-success">🎯 Confidence: {signal.confidence}%</span>
                        )}
                        {signal && signal.indicators?.marketRegime && (
                          <span className="ml-2 text-warning">
                            📊 Market: {signal.indicators.marketRegime === 'bull' ? '📈 Bull' : 
                                       signal.indicators.marketRegime === 'bear' ? '📉 Bear' : 
                                       signal.indicators.marketRegime === 'volatile' ? '⚡ Volatile' : 
                                       signal.indicators.marketRegime === 'sideways' ? '↔️ Sideways' : '❓ Unknown'}
                          </span>
                        )}
                        {signal && signal.indicators?.volatility?.volatility && (
                          <span className="ml-2 text-info">
                            📈 Volatility: {typeof signal.indicators.volatility.volatility === 'number' 
                              ? signal.indicators.volatility.volatility.toFixed(2) 
                              : parseFloat(signal.indicators.volatility.volatility || 0).toFixed(2)}%
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {recommendedSettings.reasons.map((reason, index) => (
                      <div key={index} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-primary-400 mt-0.5">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (recommendedSettings) {
                          const minBuyInput = document.getElementById('minBuyAmount') as HTMLInputElement;
                          if (minBuyInput) minBuyInput.value = recommendedSettings.minBuyAmount.toString();
                        }
                      }}
                      className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      ใช้ Min
                    </button>
                    <button
                      onClick={() => {
                        if (recommendedSettings) {
                          const minBuyInput = document.getElementById('minBuyAmount') as HTMLInputElement;
                          const maxBuyInput = document.getElementById('maxBuyAmount') as HTMLInputElement;
                          if (minBuyInput) minBuyInput.value = recommendedSettings.avgBuyAmount.toString();
                          if (maxBuyInput) maxBuyInput.value = recommendedSettings.avgBuyAmount.toString();
                        }
                      }}
                      className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      ใช้ Avg
                    </button>
                    <button
                      onClick={() => {
                        if (recommendedSettings) {
                          const minBuyInput = document.getElementById('minBuyAmount') as HTMLInputElement;
                          const maxBuyInput = document.getElementById('maxBuyAmount') as HTMLInputElement;
                          const minSellInput = document.getElementById('minSellAmount') as HTMLInputElement;
                          const maxSellInput = document.getElementById('maxSellAmount') as HTMLInputElement;
                          
                          if (minBuyInput) minBuyInput.value = recommendedSettings.minBuyAmount.toString();
                          if (maxBuyInput) maxBuyInput.value = recommendedSettings.maxBuyAmount.toString();
                          if (minSellInput) minSellInput.value = recommendedSettings.minSellAmount.toFixed(6);
                          if (maxSellInput) maxSellInput.value = recommendedSettings.maxSellAmount.toFixed(6);
                        }
                      }}
                      className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      ใช้ทั้งหมด
                    </button>
                  </div>
                </div>
              )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Min Buy Amount (บาทไทย)
                  {recommendedSettings && (
                    <span className="ml-2 text-xs text-primary-400">
                      (แนะนำ: {recommendedSettings.minBuyAmount.toLocaleString('th-TH')} ฿)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  defaultValue={recommendedSettings?.minBuyAmount || 10}
                  id="minBuyAmount"
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนเงินขั้นต่ำในการซื้อแต่ละครั้ง - เพื่อให้สามารถซื้อได้หลายครั้ง</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Max Buy Amount (บาทไทย)
                  {recommendedSettings && (
                    <span className="ml-2 text-xs text-primary-400">
                      (แนะนำ: {recommendedSettings.maxBuyAmount.toLocaleString('th-TH')} ฿)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  defaultValue={recommendedSettings?.maxBuyAmount || 1000}
                  id="maxBuyAmount"
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนเงินสูงสุดในการซื้อแต่ละครั้ง - เพื่อจำกัดความเสี่ยง</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Min Sell Amount (BTC)
                  {recommendedSettings && (
                    <span className="ml-2 text-xs text-primary-400">
                      (แนะนำ: {recommendedSettings.minSellAmount.toFixed(6)})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  defaultValue={recommendedSettings?.minSellAmount.toFixed(6) || "0.0001"}
                  step="0.0001"
                  id="minSellAmount"
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนเหรียญขั้นต่ำในการขายแต่ละครั้ง - เพื่อให้สามารถขายได้แม้ซื้อน้อย</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Max Sell Amount (BTC)
                  {recommendedSettings && (
                    <span className="ml-2 text-xs text-primary-400">
                      (แนะนำ: {recommendedSettings.maxSellAmount.toFixed(6)})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  defaultValue={recommendedSettings?.maxSellAmount.toFixed(6) || "1"}
                  step="0.0001"
                  id="maxSellAmount"
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนเหรียญสูงสุดในการขายแต่ละครั้ง - เพื่อให้สามารถขายได้มากเมื่อมีโอกาส</p>
              </div>
            </div>
            <button
              onClick={handleCreateSimulation}
              disabled={loading || isCreating}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-warning-500 hover:from-primary-600 hover:to-warning-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-warning-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center gap-2">
                {loading || isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังเริ่มต้น...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>เริ่มการเทรด</span>
                  </>
                )}
              </div>
            </button>
          </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/30 shadow-2xl mb-6 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-success-500/5 opacity-50 animate-pulse"></div>
          <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-success-400 flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary-400 animate-pulse" />
              การจำลองการเทรด
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={updateSimulation}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-500/20 disabled:opacity-50 border border-primary-500/30"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Update
              </button>
              <button
                onClick={async () => {
                  // เรียก stopSimulation โดยไม่ต้องรอ loading
                  await stopSim();
                  
            // เคลียร์ input fields เมื่อหยุดการเทรด
            setInvestment('1000');
            setInitialBuyPercentage('0');
                  const minBuyInput = document.getElementById('minBuyAmount') as HTMLInputElement;
                  const maxBuyInput = document.getElementById('maxBuyAmount') as HTMLInputElement;
                  const minSellInput = document.getElementById('minSellAmount') as HTMLInputElement;
                  const maxSellInput = document.getElementById('maxSellAmount') as HTMLInputElement;
                  
                  if (minBuyInput) minBuyInput.value = '';
                  if (maxBuyInput) maxBuyInput.value = '';
                  if (minSellInput) minSellInput.value = '';
                  if (maxSellInput) maxSellInput.value = '';
                  
                  // เคลียร์ recommended settings
                  setRecommendedSettings(null);
                }}
                disabled={false} // ใช้งานได้เสมอ - ไม่ disable
                className="flex items-center gap-2 px-4 py-2 bg-danger/20 text-danger hover:bg-danger/30 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-danger-500/20 border border-danger-500/30"
              >
                <Square className="w-4 h-4" />
                {loading ? 'กำลังหยุด...' : 'Stop'}
              </button>
            </div>
          </div>
          {/* Main Stats Cards - Widget จาก V2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Current Price Card */}
            <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-primary-500/30 shadow-2xl shadow-primary-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">ราคาปัจจุบัน</p>
                  <Coins className="w-5 h-5 text-primary-400 animate-pulse" />
                </div>
                <p className="text-3xl font-bold text-gray-100 mb-1">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {priceChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                    {priceChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span>{formatPercentage(Math.abs(priceChangePercent))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profit/Loss Card */}
            <div className={`relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border shadow-2xl overflow-hidden group hover:scale-105 transition-transform duration-300 ${
              profit >= 0 
                ? 'border-success-500/30 shadow-success-500/20' 
                : 'border-danger-500/30 shadow-danger-500/20'
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                profit >= 0 
                  ? 'from-success-500/0 via-success-500/10 to-success-500/0' 
                  : 'from-danger-500/0 via-danger-500/10 to-danger-500/0'
              }`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">กำไร/ขาดทุน</p>
                  {profit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-success animate-pulse" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-danger animate-pulse" />
                  )}
                </div>
                <p className={`text-3xl font-bold mb-1 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercentage(profitPercentage)}
                </p>
              </div>
            </div>

            {/* Signal Card */}
            <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-warning-500/30 shadow-2xl shadow-warning-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-warning-500/0 via-warning-500/10 to-warning-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">สัญญาณ</p>
                  <Target className="w-5 h-5 text-warning-400 animate-pulse" />
                </div>
                {signal && signal.signal ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      {signal.signal === 'buy' && <TrendingUp className="w-6 h-6 text-success animate-bounce" />}
                      {signal.signal === 'sell' && <TrendingDown className="w-6 h-6 text-danger animate-bounce" />}
                      {signal.signal === 'hold' && <Activity className="w-6 h-6 text-gray-400" />}
                      <span className={`text-2xl font-bold ${
                        signal.signal === 'buy' ? 'text-success' :
                        signal.signal === 'sell' ? 'text-danger' : 'text-gray-400'
                      }`}>
                        {signal.signal.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-warning-400 font-semibold">
                      ความมั่นใจ {signal.confidence || 0}%
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">กำลังโหลด...</p>
                )}
              </div>
            </div>

            {/* Balance Card */}
            <div className="relative bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-primary-500/30 shadow-2xl shadow-primary-500/20 overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">ยอดเงิน</p>
                  <Wallet className="w-5 h-5 text-primary-400" />
                </div>
                <p className="text-2xl font-bold text-gray-100 mb-1">
                  ${simulation.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  เหรียญที่ถือ: {simulation.holdings.toFixed(8)} BTC
                </p>
              </div>
            </div>
          </div>

          {/* Trading Stats - Win Rate & Performance - Widget จาก V2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-success-500/20 to-success-500/5 rounded-2xl p-6 border border-success-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">อัตราชนะ</p>
                <Award className="w-5 h-5 text-success-400" />
              </div>
              <p className="text-3xl font-bold text-success-400">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.winTrades}W / {stats.lossTrades}L
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-2xl p-6 border border-primary-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">จำนวนเทรดทั้งหมด</p>
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-3xl font-bold text-primary-400">
                {stats.totalTrades}
              </p>
            </div>

            <div className="bg-gradient-to-br from-warning-500/20 to-warning-500/5 rounded-2xl p-6 border border-warning-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">กำไรเฉลี่ย</p>
                <Gauge className="w-5 h-5 text-warning-400" />
              </div>
              <p className={`text-3xl font-bold ${stats.avgProfit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                ${stats.avgProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">กำไรรวม</p>
                <Flame className="w-5 h-5 text-purple-400" />
              </div>
              <p className={`text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                ${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          {/* แสดง Profit/Loss รายละเอียด - Enhanced */}
          <div className="mt-6 bg-gradient-to-br from-dark-700/80 to-dark-600/80 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20 shadow-xl relative overflow-hidden">
            {/* Animated background */}
            <div className={`absolute inset-0 opacity-10 transition-opacity duration-500 ${
              profit >= 0 ? 'bg-gradient-to-r from-success-500/20 to-transparent' : 'bg-gradient-to-r from-danger-500/20 to-transparent'
            }`}></div>
            <div className="relative z-10">
            <h4 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400 animate-pulse" />
              📊 สรุปผลการเทรด
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">มูลค่าปัจจุบัน (Holdings)</p>
                <p className="text-lg font-bold text-gray-100">
                  ${(simulation.holdings * currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  {simulation.holdings.toFixed(8)} BTC × ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">มูลค่ารวม (Total Value)</p>
                <p className="text-lg font-bold text-gray-100">
                  ${(simulation.currentBalance + (simulation.holdings * currentPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  Balance + Holdings
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">กำไร/ขาดทุน (Profit/Loss)</p>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {profit >= 0 ? '+' : ''}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-xs ${profitPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercentage(profitPercentage)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">ราคาซื้อเฉลี่ย (Avg Buy Price)</p>
                <p className="text-lg font-bold text-gray-100">
                  {simulation.averageBuyPrice > 0 ? `$${simulation.averageBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                </p>
                <p className="text-xs text-gray-500">
                  {simulation.buyCount || 0} ซื้อ / {simulation.sellCount || 0} ขาย
                </p>
              </div>
            </div>
            {/* แสดง Unrealized P/L */}
            {simulation.holdings > 0 && simulation.averageBuyPrice > 0 && (
              <div className="mt-3 pt-3 border-t border-dark-600">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Unrealized P/L (ยังไม่ขาย)</span>
                  <span className={`text-sm font-semibold ${
                    (currentPrice - simulation.averageBuyPrice) >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {((currentPrice - simulation.averageBuyPrice) >= 0 ? '+' : '')}
                    ${((currentPrice - simulation.averageBuyPrice) * simulation.holdings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {' '}
                    ({formatPercentage((currentPrice - simulation.averageBuyPrice) / simulation.averageBuyPrice * 100)})
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    ราคาปัจจุบัน: ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs ราคาซื้อเฉลี่ย: ${simulation.averageBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 p-4 bg-dark-700/30 rounded-xl border border-primary-500/20">
            <input
              type="checkbox"
              id="autoUpdate"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="autoUpdate" className="text-sm text-gray-300 cursor-pointer">
              เปิดใช้งาน Auto Trading (ทำงานใน background)
            </label>
          </div>
          </div>
        </div>
      )}

      {/* Price Chart with Prediction - Enhanced */}
      {simulation && (
        <div className="bg-gradient-to-br from-dark-800/90 to-dark-700/90 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/30 shadow-2xl mb-6 relative overflow-hidden">
          {/* Animated border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-50 animate-pulse rounded-2xl"></div>
          <div className="relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-warning-400 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400 animate-pulse" />
              📈 BTC Price Chart with Prediction
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary-500"></div>
                <span className="text-gray-400">Historical Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-warning border-dashed border-t-2"></div>
                <span className="text-gray-400">Predicted Price</span>
              </div>
              {predictions.length > 0 && (
                <div className="text-gray-400">
                  Next: ${(predictions[0]?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Confidence: {predictions[0]?.confidence || 0}%)
                </div>
              )}
              {/* แสดงสถานะข้อมูล */}
              {priceHistory.length === 0 && (
                <div className="mt-2 p-2 bg-primary/20 border border-primary/50 rounded text-xs text-primary-400">
                  📊 กำลังโหลดข้อมูลย้อนหลัง 1 ปี... กรุณารอสักครู่
                </div>
              )}
              {priceHistory.length > 0 && priceHistory.length < 30 && (
                <div className="mt-2 p-2 bg-warning/20 border border-warning/50 rounded text-xs text-warning">
                  ⚠️ ข้อมูลไม่เพียงพอ: มี {priceHistory.length} จุด ต้องการอย่างน้อย 30 จุดสำหรับการคำนวณที่แม่นยำ
                </div>
              )}
              {priceHistory.length >= 365 && (
                <div className="mt-2 p-2 bg-success/20 border border-success/50 rounded text-xs text-success-400">
                  ✅ ข้อมูลครบ 1 ปีแล้ว: {priceHistory.length} จุด
                </div>
              )}
            </div>
          </div>
          {/* สถานะการเทรด - Enhanced */}
          <div className="mb-6 p-6 bg-gradient-to-br from-dark-700/60 to-dark-600/60 backdrop-blur-xl rounded-2xl border border-warning-500/30 shadow-xl">
            <h4 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-warning-400 animate-pulse" />
              📊 สถานะการเทรด
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800/50 rounded-xl p-4 border border-success-500/20 hover:border-success-500/50 transition-all duration-300 hover:scale-105">
                <p className="text-xs text-gray-400 mb-2">ข้อมูลพร้อม</p>
                <p className={`text-2xl font-bold ${tradingStatus.isReady ? 'text-success animate-pulse' : 'text-warning'}`}>
                  {tradingStatus.isReady ? '✅ พร้อม' : `⚠️ ${tradingStatus.dataPoints}/${tradingStatus.requiredDataPoints}`}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-4 border border-primary-500/20 hover:border-primary-500/50 transition-all duration-300 hover:scale-105">
                <p className="text-xs text-gray-400 mb-2">สถานะการเทรด</p>
                <p className={`text-2xl font-bold ${tradingStatus.isActive ? 'text-success animate-pulse' : 'text-gray-400'}`}>
                  {tradingStatus.isActive ? '🟢 ทำงาน' : '⚪ หยุด'}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-4 border border-warning-500/20 hover:border-warning-500/50 transition-all duration-300 hover:scale-105">
                <p className="text-xs text-gray-400 mb-2">พร้อมเทรด</p>
                <p className={`text-2xl font-bold ${tradingStatus.canTrade ? 'text-success animate-pulse' : 'text-gray-400'}`}>
                  {tradingStatus.canTrade ? '✅ พร้อม' : '⏸️ รอ'}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded-xl p-4 border border-primary-500/20 hover:border-primary-500/50 transition-all duration-300 hover:scale-105">
                <p className="text-xs text-gray-400 mb-2">สัญญาณถัดไป</p>
                <p className="text-2xl font-bold text-primary-400 animate-pulse">
                  {tradingStatus.nextTradeTime}
                </p>
              </div>
            </div>
          </div>

          {simulation && candlestickData.length > 0 ? (
            <TradingViewChart
              title="📈 ราคาและคาดการณ์ (Price & Prediction)"
              data={candlestickData}
              volumeData={volumeData}
              predictionData={predictionLineData}
              height={500}
              onTimeframeChange={(timeframe) => setSelectedTimeframe(timeframe)}
            />
          ) : hasChartData ? (
            <LineChart
              title="📈 ราคาและคาดการณ์ (Price & Prediction)"
              data={chartData}
              height={400}
              smooth={true}
            />
          ) : (
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">⏳ กำลังโหลดข้อมูลกราฟ...</p>
                  <p className="text-sm">📊 ระบบกำลังดึงข้อมูลย้อนหลัง 1 ปีจาก Binance API</p>
                  <p className="text-xs mt-2 text-primary-400">
                    ⚡ เมื่อเริ่มเทรด ระบบจะดึงข้อมูลย้อนหลัง 1 ปี (365 จุด) เพื่อคำนวณและแสดงกราฟ
                  </p>
                  {priceHistory && priceHistory.length > 0 && (
                    <p className="text-xs mt-2 text-success-400">
                      ✅ ข้อมูลที่โหลดแล้ว: {priceHistory.length} จุด
                      {priceHistory.length >= 365 && (
                        <span className="ml-2">🎉 ข้อมูลครบ 1 ปีแล้ว!</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* โอกาสได้กำไรในแต่ละช่วงเวลา */}
          {profitOpportunities.length > 0 && (
            <div className="mt-6 bg-dark-800 rounded-lg p-6 border border-dark-700">
              <h3 className="text-lg font-bold text-gray-100 mb-4">💰 โอกาสได้กำไรในแต่ละช่วงเวลา</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profitOpportunities.map((opp: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      opp.signal === 'buy' ? 'bg-success/10 border-success/30' :
                      opp.signal === 'sell' ? 'bg-danger/10 border-danger/30' :
                      'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">{opp.timeLabel}</span>
                      {opp.signal === 'buy' && <TrendingUp className="w-4 h-4 text-success" />}
                      {opp.signal === 'sell' && <TrendingDown className="w-4 h-4 text-danger" />}
                      {opp.signal === 'hold' && <Activity className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">
                        ราคาที่คำนวณ: <span className="text-gray-300 font-semibold">${opp.predictedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className={`text-sm font-bold ${
                        opp.priceChangePercent > 0 ? 'text-success' : 
                        opp.priceChangePercent < 0 ? 'text-danger' : 
                        'text-gray-400'
                      }`}>
                        {opp.priceChangePercent >= 0 ? '+' : ''}{opp.priceChangePercent.toFixed(2)}%
                      </div>
                      {simulation && (
                        <div className={`text-xs font-semibold ${
                          opp.profitOpportunity > 0 ? 'text-success' : 
                          opp.profitOpportunity < 0 ? 'text-danger' : 
                          'text-gray-400'
                        }`}>
                          กำไร: {opp.profitOpportunity >= 0 ? '+' : ''}${opp.profitOpportunity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <br />
                          ({formatPercentage(opp.profitOpportunityPercent)})
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Confidence: {opp.confidence}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ตารางเปรียบเทียบ Prediction vs Actual */}
          {predictionComparison.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-100 mb-4">📊 เปรียบเทียบการคำนวณกับราคาจริง</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-2 px-4 text-gray-400">Period</th>
                      <th className="text-left py-2 px-4 text-gray-400">ราคาที่คำนวณ (Predicted)</th>
                      <th className="text-left py-2 px-4 text-gray-400">ราคาจริง (Actual)</th>
                      <th className="text-left py-2 px-4 text-gray-400">ความแตกต่าง</th>
                      <th className="text-left py-2 px-4 text-gray-400">% แตกต่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionComparison.slice(0, 10).map((comp: any, index: number) => (
                      <tr key={index} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                        <td className="py-2 px-4 text-gray-300">{comp.period}</td>
                        <td className="py-2 px-4 text-gray-300">${comp.predicted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-4 text-gray-300">
                          {comp.actual ? `$${comp.actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className={`py-2 px-4 font-semibold ${
                          comp.difference > 0 ? 'text-success' : 
                          comp.difference < 0 ? 'text-danger' : 
                          'text-gray-400'
                        }`}>
                          {comp.actual ? (
                            <span>
                              {comp.difference >= 0 ? '+' : ''}${comp.difference.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : '-'}
                        </td>
                        <td className={`py-2 px-4 font-semibold ${
                          comp.differencePercent > 0 ? 'text-success' : 
                          comp.differencePercent < 0 ? 'text-danger' : 
                          'text-gray-400'
                        }`}>
                          {comp.actual ? (
                            <span>
                              {comp.differencePercent >= 0 ? '+' : ''}{comp.differencePercent.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Signal Details */}
      {signal && signal.reasons && signal.reasons.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 mb-6">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Signal Details</h3>
          <div className="space-y-2">
            {signal.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertCircle className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Recent Trades</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-4 text-gray-400">Type</th>
                  <th className="text-left py-2 px-4 text-gray-400">Price</th>
                  <th className="text-left py-2 px-4 text-gray-400">Quantity</th>
                  <th className="text-left py-2 px-4 text-gray-400">Amount</th>
                  <th className="text-left py-2 px-4 text-gray-400">Profit/Loss</th>
                  <th className="text-left py-2 px-4 text-gray-400">Reasons</th>
                  <th className="text-left py-2 px-4 text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade: any, index: number) => (
                  <tr key={index} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.type === 'buy' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-gray-300">${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 text-gray-300">{trade.quantity.toFixed(8)}</td>
                    <td className="py-2 px-4 text-gray-300">${trade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`py-2 px-4 font-semibold ${
                      (trade.profit !== undefined && trade.profit !== null && trade.profit > 0) ? 'text-success' : 
                      (trade.profit !== undefined && trade.profit !== null && trade.profit < 0) ? 'text-danger' : 
                      'text-gray-400'
                    }`}>
                      {trade.type === 'buy' ? (
                        <span className="text-gray-500 text-xs">- (ซื้อ)</span>
                      ) : trade.profit !== undefined && trade.profit !== null ? (
                        <div>
                          <div>{trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          {trade.profitPercentage !== undefined && trade.profitPercentage !== null && (
                            <div className="text-xs">
                              ({formatPercentage(trade.profitPercentage)})
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-300 text-sm max-w-md">
                      {trade.signal && trade.signal.reasons && trade.signal.reasons.length > 0 ? (
                        <div className="space-y-1">
                          {trade.signal.reasons.map((reason: string, idx: number) => (
                            <div key={idx} className="text-xs flex items-start gap-1">
                              <span className="text-primary-400 mt-0.5">•</span>
                              <span className={reason.includes('✅') ? 'text-success' : reason.includes('⚠️') ? 'text-warning' : ''}>
                                {reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">ไม่มีเหตุผล</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-400 text-sm">
                      {new Date(trade.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default TradingPage;
