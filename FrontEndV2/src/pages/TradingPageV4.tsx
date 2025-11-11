import { useState, useEffect, useMemo, useRef } from 'react';
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
  Rocket,
  Brain,
  Cpu,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LineChart as LineChartIcon,
  PieChart,
  BarChart,
  Layers,
  Database,
  Network,
  Settings,
  Eye,
  EyeOff,
  Star,
  TrendingUp as TrendingUpIcon2,
  Zap as ZapIcon,
  Target as TargetIcon,
  Brain as BrainIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { formatThaiBaht, formatPercentage, thbToUsd, usdToThb } from '../utils/currencyUtils';
import { tradingV4API, cryptoAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTrading } from '../contexts/TradingContext';

interface MLPrediction {
  predictedPrice: number;
  confidence: number;
  predictedProfit: number;
  predictedProfitPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: 'buy' | 'sell' | 'hold';
  timeframe: string;
  features: {
    rsi: number;
    macd: number;
    bollinger: number;
    volume: number;
    momentum: number;
  };
  predictions?: {
    '1h': any;
    '4h': any;
    '24h': any;
  };
}

interface TradingSignal {
  signal: 'buy' | 'sell' | 'hold';
  strength: number;
  confidence: number;
  positionSize: number;
  technicalIndicators: {
    rsi: number;
    macd: any;
    bollinger: any;
    volume: number;
    momentum: number;
    marketRegime: 'bull' | 'bear' | 'neutral';
  };
  mlPrediction?: MLPrediction;
  reasoning?: string[];
}

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface ProfitPrediction {
  oneDay: {
    predictedProfit: number;
    predictedProfitPercent: number;
    confidence: number;
    minProfit: number;
    maxProfit: number;
  };
  oneWeek: {
    predictedProfit: number;
    predictedProfitPercent: number;
    confidence: number;
  };
  oneMonth: {
    predictedProfit: number;
    predictedProfitPercent: number;
    confidence: number;
  };
  currentPrice: number;
  predictions?: {
    '1h': any;
    '4h': any;
    '24h': any;
  };
}

function TradingPageV4() {
  const [investment, setInvestment] = useState<string>('10000');
  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [profitPrediction, setProfitPrediction] = useState<ProfitPrediction | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalProfitPercent, setTotalProfitPercent] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '1d'>('1h');
  const [profitEffect, setProfitEffect] = useState(false);
  const profitEffectRef = useRef<HTMLDivElement>(null);
  
  // Use TradingContext for simulation management
  const { simulation, createSimulation: createSim, stopSimulation: stopSim } = useTrading();
  
  const selectedSymbol = 'BTCUSDT';
  const investmentNum = parseFloat(investment) || 0;
  const initialInvestmentUSD = thbToUsd(investmentNum);

  // WebSocket connection for real-time data
  const { isConnected, lastMessage } = useWebSocket({
    url: import.meta.env.VITE_WS_URL || 'ws://172.105.118.30:1111/ws',
    onMessage: (data: any) => {
      if (data.type === 'price' && data.symbol === selectedSymbol) {
        setCurrentPrice(data.price);
        setPriceHistory(prev => {
          const newData = [...prev, { timestamp: Date.now(), price: data.price, volume: data.volume || 0 }];
          return newData.slice(-500);
        });
      }
    },
    reconnectInterval: 3000,
  });

  // Fetch initial data and ML predictions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current price
        const priceRes = await cryptoAPI.getPrice(selectedSymbol);
        if (priceRes.data?.price) {
          setCurrentPrice(parseFloat(priceRes.data.price));
        }

        // Fetch trading signal with ML (V4)
        try {
          const signalRes = await tradingV4API.getTradingSignal(selectedSymbol);
          if (signalRes.data) {
            setSignal(signalRes.data);
            if (signalRes.data.mlPrediction) {
              setMlPrediction(signalRes.data.mlPrediction);
            }
          }
        } catch (err) {
          console.error('Failed to fetch V4 signal:', err);
        }

        // Fetch ML profit prediction (V4)
        try {
          const predictionRes = await tradingV4API.predictProfit(selectedSymbol, initialInvestmentUSD, '1d');
          if (predictionRes.data) {
            setProfitPrediction(predictionRes.data);
          }
        } catch (err) {
          console.error('Failed to fetch profit prediction:', err);
        }

        // Fetch historical data
        const historyRes = await cryptoAPI.getKlines(selectedSymbol, {
          interval: selectedTimeframe,
          limit: 200
        });
        if (historyRes.data) {
          const history = historyRes.data.map((k: any) => ({
            timestamp: k[0],
            price: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
          setPriceHistory(history);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedSymbol, selectedTimeframe, initialInvestmentUSD]);

  // Calculate portfolio value with profit effect
  useEffect(() => {
    if (currentPrice > 0 && initialInvestmentUSD > 0) {
      const baseValue = initialInvestmentUSD;
      const priceChange = priceHistory.length > 1 
        ? ((currentPrice - priceHistory[0]?.price) / priceHistory[0]?.price) * 100
        : 0;
      
      let multiplier = 1;
      if (signal?.signal === 'buy' && signal.strength > 0.5) {
        multiplier = 1 + (signal.strength * 0.15);
      } else if (signal?.signal === 'sell' && signal.strength > 0.5) {
        multiplier = 1 - (signal.strength * 0.08);
      }

      const newValue = baseValue * (1 + priceChange / 100) * multiplier;
      const newProfit = newValue - baseValue;
      const newProfitPercent = ((newValue - baseValue) / baseValue) * 100;

      // Trigger profit effect
      if (newProfit > totalProfit && newProfit > 0) {
        setProfitEffect(true);
        setTimeout(() => setProfitEffect(false), 2000);
      }

      setPortfolioValue(newValue);
      setTotalProfit(newProfit);
      setTotalProfitPercent(newProfitPercent);
    }
  }, [currentPrice, priceHistory, signal, initialInvestmentUSD, totalProfit]);

  // Advanced 3D Chart Configuration with impressive effects
  const chartOptions: ApexOptions = useMemo(() => {
    const isProfit = totalProfit >= 0;
    const profitColor = isProfit ? '#10b981' : '#ef4444';
    const gradientColors = isProfit 
      ? ['#10b981', '#34d399', '#6ee7b7']
      : ['#ef4444', '#f87171', '#fca5a5'];
    
    return {
      chart: {
        type: 'area',
        height: 600,
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
            selection: true,
          },
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1500,
          animateGradually: {
            enabled: true,
            delay: 200,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 1000,
          },
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true,
        },
        sparkline: {
          enabled: false,
        },
        dropShadow: {
          enabled: true,
          color: profitColor,
          top: 10,
          left: 0,
          blur: 10,
          opacity: 0.3,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 4,
        lineCap: 'round',
        dashArray: 0,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.6,
          gradientToColors: gradientColors,
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.2,
          stops: [0, 25, 50, 75, 100],
          colorStops: [
            {
              offset: 0,
              color: gradientColors[0],
              opacity: 0.9,
            },
            {
              offset: 25,
              color: gradientColors[1],
              opacity: 0.7,
            },
            {
              offset: 50,
              color: gradientColors[2],
              opacity: 0.5,
            },
            {
              offset: 75,
              color: gradientColors[1],
              opacity: 0.3,
            },
            {
              offset: 100,
              color: gradientColors[0],
              opacity: 0.1,
            },
          ],
        },
      },
      colors: [profitColor],
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM yyyy',
            day: 'dd MMM',
            hour: 'HH:mm',
          },
        },
        axisBorder: {
          show: true,
          color: '#334155',
          width: 2,
        },
        axisTicks: {
          show: true,
          color: '#334155',
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          formatter: (val: number) => {
            return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 0,
          left: 10,
        },
      },
      tooltip: {
        enabled: true,
        theme: 'dark',
        shared: true,
        intersect: false,
        x: {
          format: 'dd MMM yyyy HH:mm',
        },
        y: {
          formatter: (val: number) => {
            return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
        marker: {
          show: true,
        },
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
        },
      },
      markers: {
        size: 0,
        hover: {
          size: 8,
          sizeOffset: 4,
        },
        strokeWidth: 3,
        strokeColors: [profitColor],
        strokeOpacity: 0.9,
        fillOpacity: 0.9,
      },
      theme: {
        mode: 'dark',
      },
    };
  }, [totalProfit]);

  const chartSeries = useMemo(() => {
    if (priceHistory.length === 0) return [];
    
    return [
      {
        name: 'Price',
        data: priceHistory.map(p => [p.timestamp, p.price]),
      },
    ];
  }, [priceHistory]);

  // Profit Prediction Chart
  const predictionChartOptions: ApexOptions = useMemo(() => {
    if (!profitPrediction) return {};
    
    return {
      chart: {
        type: 'line',
        height: 350,
        background: 'transparent',
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1200,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 4,
        lineCap: 'round',
      },
      colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      xaxis: {
        categories: ['Now', '1 Hour', '4 Hours', '1 Day'],
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '12px',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#94a3b8',
          },
          formatter: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
        },
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4,
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
        },
      },
      markers: {
        size: 8,
        hover: {
          size: 10,
        },
        strokeWidth: 3,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          opacityFrom: 0.8,
          opacityTo: 0.2,
        },
      },
    };
  }, [profitPrediction]);

  const predictionChartSeries = useMemo(() => {
    if (!profitPrediction) return [];
    
    const oneDayPercent = profitPrediction.oneDay.predictedProfitPercent;
    
    return [
      {
        name: 'Predicted Profit %',
        data: [
          0,
          oneDayPercent * 0.25,
          oneDayPercent * 0.5,
          oneDayPercent,
        ],
      },
    ];
  }, [profitPrediction]);

  const handleStart = async () => {
    if (isCreating || loading) {
      return;
    }

    try {
      setIsCreating(true);
      setIsRunning(true);
      
      // Convert THB to USD
      const investmentUSD = thbToUsd(parseFloat(investment) || 10000);
      
      // Create simulation with default settings
      const settings = {
        buyPercentage: 50,
        minBuyAmount: 10,
        maxBuyAmount: 1000,
        sellPercentage: 50,
        minSellAmount: 0.0001,
        maxSellAmount: 1,
        minConfidence: 50,
      };
      
      await createSim(investmentUSD, selectedSymbol, settings);
      
      // Wait a bit before allowing updates
      setTimeout(() => {
        setIsCreating(false);
      }, 2000);
    } catch (error: any) {
      setIsCreating(false);
      setIsRunning(false);
      console.error('Failed to start trading:', error);
      alert(`ไม่สามารถเริ่มการเทรดได้: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleStop = async () => {
    if (simulation?._id) {
      try {
        await stopSim(simulation._id);
        setIsRunning(false);
      } catch (error: any) {
        console.error('Failed to stop trading:', error);
        alert(`ไม่สามารถหยุดการเทรดได้: ${error.response?.data?.message || error.message}`);
      }
    } else {
      setIsRunning(false);
    }
  };

  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case 'buy':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'sell':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Profit Effect Overlay */}
      {profitEffect && (
        <div 
          ref={profitEffectRef}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{
            animation: 'profitPulse 2s ease-out',
          }}
        >
          <div className="text-6xl font-bold text-green-400 drop-shadow-2xl animate-bounce">
            +{formatPercentage(totalProfitPercent)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes profitPulse {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3 animate-pulse">
              <SparklesIcon className="w-12 h-12 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
              Trading V4 - Ultimate AI Trading
            </h1>
            <p className="text-gray-400 mt-2 text-lg">ระบบเทรดอัตโนมัติขั้นสูงสุดด้วย Machine Learning และ Genetic Programming สำหรับผลกำไรสูงสุด</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} border ${isConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards with Enhanced Effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Price */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Current Price</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-400">{selectedSymbol}</p>
            </div>
          </div>

          {/* Portfolio Value */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-purple-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Portfolio Value</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{formatThaiBaht(portfolioValue || initialInvestmentUSD)}</p>
              <p className="text-sm text-gray-400">Initial: {formatThaiBaht(initialInvestmentUSD)}</p>
            </div>
          </div>

          {/* Total Profit */}
          <div className={`bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border ${totalProfit >= 0 ? 'border-green-500/50' : 'border-red-500/50'} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${totalProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-lg`}>
                {totalProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                )}
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Total Profit</span>
            </div>
            <div className="space-y-1">
              <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercentage(totalProfitPercent)}
              </p>
              <p className="text-sm text-gray-400">{formatThaiBaht(totalProfit)}</p>
            </div>
          </div>

          {/* ML Confidence */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-pink-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <BrainIcon className="w-6 h-6 text-pink-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">AI Confidence</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {mlPrediction ? `${(mlPrediction.confidence * 100).toFixed(1)}%` : '--'}
              </p>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${mlPrediction ? mlPrediction.confidence * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Signal & ML Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Signal */}
          <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Trading Signal
            </h3>
            {signal ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${getSignalColor(signal.signal)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium uppercase">{signal.signal}</span>
                    <span className="text-2xl font-bold">{(signal.strength * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        signal.signal === 'buy' ? 'bg-green-500' : signal.signal === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${signal.strength * 100}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Position Size: {(signal.positionSize * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">RSI</p>
                    <p className="text-lg font-semibold">{signal.technicalIndicators.rsi.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">MACD</p>
                    <p className="text-lg font-semibold">{typeof signal.technicalIndicators.macd === 'object' ? signal.technicalIndicators.macd.macd?.toFixed(4) : signal.technicalIndicators.macd?.toFixed(4) || '0.0000'}</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Volume</p>
                    <p className="text-lg font-semibold">{(signal.technicalIndicators.volume * 100).toFixed(0)}%</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Market</p>
                    <p className="text-lg font-semibold capitalize">{signal.technicalIndicators.marketRegime}</p>
                  </div>
                </div>
                {signal.reasoning && signal.reasoning.length > 0 && (
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Reasoning:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {signal.reasoning.map((reason, idx) => (
                        <li key={idx}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">Loading signal...</div>
            )}
          </div>

          {/* ML Prediction */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BrainIcon className="w-5 h-5 text-pink-400" />
              AI Profit Prediction (1 Day Focus)
            </h3>
            {profitPrediction ? (
              <div className="space-y-6">
                {/* Prediction Chart */}
                <div className="h-64">
                  <Chart
                    options={predictionChartOptions}
                    series={predictionChartSeries}
                    type="line"
                    height={256}
                  />
                </div>

                {/* Prediction Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg border border-green-500/30 hover:scale-105 transition-transform">
                    <p className="text-xs text-gray-400 mb-2">1 Day Prediction</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatPercentage(profitPrediction.oneDay.predictedProfitPercent)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatThaiBaht(profitPrediction.oneDay.predictedProfit)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Confidence:</span>
                      <span className="text-xs font-semibold text-green-400">
                        {(profitPrediction.oneDay.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Range: {formatPercentage((profitPrediction.oneDay.minProfit / initialInvestmentUSD) * 100)} to{' '}
                      {formatPercentage((profitPrediction.oneDay.maxProfit / initialInvestmentUSD) * 100)}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg border border-blue-500/30 hover:scale-105 transition-transform">
                    <p className="text-xs text-gray-400 mb-2">1 Week Prediction</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatPercentage(profitPrediction.oneWeek.predictedProfitPercent)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatThaiBaht(profitPrediction.oneWeek.predictedProfit)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Confidence:</span>
                      <span className="text-xs font-semibold text-blue-400">
                        {(profitPrediction.oneWeek.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg border border-purple-500/30 hover:scale-105 transition-transform">
                    <p className="text-xs text-gray-400 mb-2">1 Month Prediction</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {formatPercentage(profitPrediction.oneMonth.predictedProfitPercent)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatThaiBaht(profitPrediction.oneMonth.predictedProfit)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Confidence:</span>
                      <span className="text-xs font-semibold text-purple-400">
                        {(profitPrediction.oneMonth.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {mlPrediction && (
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-semibold mb-3">ML Model Features</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">RSI</p>
                        <p className="text-sm font-semibold">{mlPrediction.features.rsi.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">MACD</p>
                        <p className="text-sm font-semibold">{mlPrediction.features.macd.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bollinger</p>
                        <p className="text-sm font-semibold">{mlPrediction.features.bollinger.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Volume</p>
                        <p className="text-sm font-semibold">{mlPrediction.features.volume.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Momentum</p>
                        <p className="text-sm font-semibold">{mlPrediction.features.momentum.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Risk Level:</span>
                        <span className={`text-sm font-semibold ${getRiskColor(mlPrediction.riskLevel)}`}>
                          {mlPrediction.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">Recommended:</span>
                        <span className={`text-sm font-semibold ${getSignalColor(mlPrediction.recommendedAction)}`}>
                          {mlPrediction.recommendedAction.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">Loading predictions...</div>
            )}
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-blue-400" />
              Advanced Price Chart with ML Predictions
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTimeframe('1h')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeframe === '1h'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                1H
              </button>
              <button
                onClick={() => setSelectedTimeframe('4h')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeframe === '4h'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                4H
              </button>
              <button
                onClick={() => setSelectedTimeframe('1d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeframe === '1d'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                1D
              </button>
            </div>
          </div>
          {chartSeries.length > 0 ? (
            <Chart options={chartOptions} series={chartSeries} type="area" height={600} />
          ) : (
            <div className="h-[600px] flex items-center justify-center text-gray-400">
              Loading chart data...
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount (THB)</label>
                <input
                  type="number"
                  value={investment}
                  onChange={(e) => setInvestment(e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10000"
                  disabled={isRunning}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                {!isRunning && !simulation ? (
                  <button
                    onClick={handleStart}
                    disabled={isCreating || loading}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating || loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>กำลังเริ่มต้น...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start Trading
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Square className="w-5 h-5" />
                    Stop Trading
                  </button>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all duration-300 flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Refresh
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-all duration-300 flex items-center gap-2"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradingPageV4;

