import React, { useState } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
import { PieChart } from './charts/PieChart';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';
import { ColumnChart } from './charts/ColumnChart';
import { CandlestickChart } from './charts/CandlestickChart';
import { Table } from './Table';
import { 
  portfolioData, 
  monthlyVolumeData, 
  bitcoinPriceData, 
  weeklyProfitData,
  tradeHistoryData,
  candlestickData,
  volumeData
} from '../data/mockData';
import { getDateRange } from '../utils/dateRange';
import { RotateCcw, Maximize2, Trash2 } from 'lucide-react';

/**
 * Dashboard Component
 * - Drag & Drop: ลากย้ายตำแหน่ง Panel ได้
 * - Resize: ปรับขนาด Panel ได้ทุกด้าน
 * - Responsive: ปรับตัวตามขนาดหน้าจอ
 * - Layout คล้าย Binance Trading Dashboard
 */
export const Dashboard: React.FC = () => {
  // Widget IDs ที่มีอยู่ทั้งหมด
  const allWidgetIds = ['candlestick', 'portfolio', 'profit', 'line', 'bar', 'table', 'daterange'];
  
  // State สำหรับเก็บ widgets ที่แสดงอยู่
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(allWidgetIds);
  
  // State สำหรับเก็บ selected widgets
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());

  // Layout configuration สำหรับ react-grid-layout
  const getDefaultLayout = (widgetIds: string[]): { [key: string]: Layout[] } => {
    const layoutMap: { [key: string]: Layout } = {
      candlestick: { i: 'candlestick', x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 6 },
      portfolio: { i: 'portfolio', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 4 },
      profit: { i: 'profit', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 4 },
      line: { i: 'line', x: 0, y: 8, w: 6, h: 6, minW: 4, minH: 5 },
      bar: { i: 'bar', x: 6, y: 8, w: 6, h: 6, minW: 4, minH: 5 },
      table: { i: 'table', x: 0, y: 14, w: 12, h: 8, minW: 8, minH: 6 },
      daterange: { i: 'daterange', x: 0, y: 22, w: 12, h: 3, minW: 6, minH: 3 },
    };
    
    return {
      lg: widgetIds.map(id => layoutMap[id]).filter(Boolean) as Layout[]
    };
  };

  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>(() => 
    getDefaultLayout(visibleWidgets)
  );

  // State สำหรับ Date Range
  const [selectedDateType, setSelectedDateType] = useState<string>('last7day');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date().toISOString();
    return getDateRange(now, 'last7day');
  });

  // Reset layout to default
  const resetLayout = () => {
    setVisibleWidgets(allWidgetIds);
    setSelectedWidgets(new Set());
    setLayouts(getDefaultLayout(allWidgetIds));
  };

  // อัปเดต layout เมื่อ visibleWidgets เปลี่ยน
  React.useEffect(() => {
    setLayouts(getDefaultLayout(visibleWidgets));
  }, [visibleWidgets]);

  // Toggle selection ของ widget
  const toggleWidgetSelection = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  // ลบ widget เดียว
  const deleteWidget = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`คุณต้องการลบ widget "${widgetId}" หรือไม่?`)) {
      setVisibleWidgets(prev => prev.filter(id => id !== widgetId));
      setSelectedWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  };

  // ลบ widgets ที่เลือก
  const deleteSelectedWidgets = () => {
    if (selectedWidgets.size === 0) return;
    if (window.confirm(`คุณต้องการลบ ${selectedWidgets.size} widget(s) หรือไม่?`)) {
      setVisibleWidgets(prev => prev.filter(id => !selectedWidgets.has(id)));
      setSelectedWidgets(new Set());
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedWidgets(new Set());
  };

  const handleLayoutChange = (_currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
  };

  // Handle date range change
  const handleDateRangeChange = (type: string) => {
    setSelectedDateType(type);
    const now = new Date().toISOString();
    const range = getDateRange(now, type as any);
    setDateRange(range);
  };

  return (
    <div className="min-h-screen bg-binance-bg">
      {/* Header - Binance Style */}
      <header className="bg-binance-card border-b border-binance-border sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-binance-yellow rounded flex items-center justify-center">
                  <span className="text-binance-bg font-bold text-lg">B</span>
                </div>
                <h1 className="text-xl font-bold text-binance-text">
                  Trading Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-binance-textSecondary">BTC/USDT</span>
                  <span className="text-binance-green font-mono font-semibold">$43,250.50</span>
                  <span className="text-binance-green text-xs">+2.45%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetLayout}
                className="flex items-center gap-2 px-3 py-1.5 bg-binance-card hover:bg-binance-border text-binance-text rounded transition-colors border border-binance-border text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Layout
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-binance-yellow/10 text-binance-yellow rounded border border-binance-yellow/20 text-sm">
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="font-medium">Drag & Resize</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="max-w-[1920px] mx-auto p-4">
        {/* Delete Button - แสดงเมื่อมี widget ที่เลือก */}
        {selectedWidgets.size > 0 && (
          <div className="mb-4 flex items-center justify-between bg-binance-card border border-binance-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-binance-text">
                {selectedWidgets.size} widget{selectedWidgets.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-binance-textSecondary hover:text-binance-text transition-colors"
              >
                Clear selection
              </button>
            </div>
            <button
              onClick={deleteSelectedWidgets}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete Selected</span>
            </button>
          </div>
        )}

        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          preventCollision={false}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {/* Candlestick Chart Panel */}
          {visibleWidgets.includes('candlestick') && (
            <div key="candlestick" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('candlestick')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('candlestick', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('candlestick')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('candlestick') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('candlestick') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('candlestick', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <CandlestickChart 
                candleData={candlestickData as any}
                volumeData={volumeData as any}
                title="BTC/USDT"
              />
            </div>
          </div>
          )}

          {/* Portfolio Pie Chart Panel */}
          {visibleWidgets.includes('portfolio') && (
            <div key="portfolio" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('portfolio')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('portfolio', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('portfolio')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('portfolio') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('portfolio') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('portfolio', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <PieChart 
                data={portfolioData}
                title="สัดส่วน Portfolio"
              />
            </div>
          </div>
          )}

          {/* Profit/Loss Column Chart Panel */}
          {visibleWidgets.includes('profit') && (
            <div key="profit" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('profit')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('profit', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('profit')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('profit') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('profit') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('profit', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <ColumnChart 
                data={weeklyProfitData}
                title="กำไร/ขาดทุนรายสัปดาห์"
              />
            </div>
          </div>
          )}

          {/* Bitcoin Price Line Chart Panel */}
          {visibleWidgets.includes('line') && (
            <div key="line" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('line')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('line', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('line')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('line') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('line') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('line', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <LineChart 
                data={bitcoinPriceData as any}
                title="ราคา Bitcoin (30 วัน)"
                color="#F0B90B"
              />
            </div>
          </div>
          )}

          {/* Monthly Volume Bar Chart Panel */}
          {visibleWidgets.includes('bar') && (
            <div key="bar" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('bar')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('bar', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('bar')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('bar') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('bar') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('bar', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <BarChart 
                data={monthlyVolumeData}
                title="ปริมาณการซื้อขายรายเดือน"
              />
            </div>
          </div>
          )}

          {/* Trade History Table Panel */}
          {visibleWidgets.includes('table') && (
            <div key="table" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('table')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('table', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('table')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('table') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('table') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('table', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden">
              <Table 
                data={tradeHistoryData}
                title="ประวัติการซื้อขาย"
              />
            </div>
          </div>
          )}

          {/* Date Range Utility Panel */}
          {visibleWidgets.includes('daterange') && (
            <div key="daterange" className={`bg-binance-card rounded border overflow-hidden transition-all duration-300 ${
              selectedWidgets.has('daterange')
                ? 'border-binance-yellow ring-2 ring-binance-yellow/50'
                : 'border-binance-border'
            }`}>
              <div className="group cursor-move bg-binance-bg/50 px-4 py-2 border-b border-binance-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    onClick={(e) => toggleWidgetSelection('daterange', e)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                      selectedWidgets.has('daterange')
                        ? 'bg-red-500 ring-2 ring-red-500/50'
                        : 'bg-red-500/50 hover:bg-red-500'
                    }`}
                    title={selectedWidgets.has('daterange') ? 'Click to deselect' : 'Click to select'}
                  />
                  <div className="w-8 h-1 bg-binance-border rounded-full" />
                  <span className="text-xs text-binance-textSecondary ml-2">Drag to move • Resize from corners</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWidgets.has('daterange') && (
                    <span className="px-2 py-1 bg-binance-yellow/20 text-binance-yellow text-xs rounded">
                      Selected
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteWidget('daterange', e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            <div className="h-[calc(100%-44px)] overflow-hidden p-4">
              <h3 className="text-sm font-semibold text-binance-text mb-2">
                Date Range Calculator
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { value: 'lastday', label: '1D' },
                  { value: 'last7day', label: '7D' },
                  { value: 'lastweek', label: '1W' },
                  { value: 'lastmonth', label: '1M' },
                  { value: 'last3month', label: '3M' },
                  { value: 'last6month', label: '6M' },
                  { value: 'last12month', label: '1Y' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDateRangeChange(option.value)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      selectedDateType === option.value
                        ? 'bg-binance-yellow text-binance-bg'
                        : 'bg-binance-bg text-binance-textSecondary hover:text-binance-text border border-binance-border'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 bg-binance-bg rounded border border-binance-border">
                <div>
                  <div className="text-xs text-binance-textSecondary mb-1">Start Date</div>
                  <div className="text-xs font-mono text-binance-text">
                    {new Date(dateRange.start).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-binance-textSecondary mb-1">End Date</div>
                  <div className="text-xs font-mono text-binance-text">
                    {new Date(dateRange.end).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </ResponsiveGridLayout>
      </div>

      {/* Footer */}
      <footer className="bg-binance-card border-t border-binance-border mt-4">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <p className="text-xs text-binance-textSecondary text-center">
            Frontend Developer Test - Professional Trading Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
};

