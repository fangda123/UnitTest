import { useState } from 'react';
import GridLayout from './components/Dashboard/DashboardLayout';
import PieChart from './components/Charts/PieChart';
import BarChart from './components/Charts/BarChart';
import LineChart from './components/Charts/LineChart';
import ColumnChart from './components/Charts/ColumnChart';
import DataTable from './components/Table/DataTable';
import type { TableColumn, TableRow } from './components/Table/DataTable';
import StatsCard from './components/Stats/StatsCard';
import {
  portfolioDistribution,
  monthlyTradingVolume,
  accountBalance,
  weeklyProfitLoss,
  transactionHistory,
  dashboardStats,
  topCoins,
  marketOverview,
} from './data/mockData';
import {
  getDateRange,
  formatDate,
  type DateRangeType,
} from './utils/dateUtils';
import {
  Wallet,
  TrendingUp,
  Activity,
  Award,
  RefreshCw,
} from 'lucide-react';

/**
 * Main Application Component
 * Dashboard แบบ Professional พร้อมฟีเจอร์ครบครัน
 */

function App() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeType>('last7day');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // คำนวณ date range
  const currentDate = new Date();
  const dateRange = getDateRange(currentDate, selectedDateRange);

  // จัดการ refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // กำหนด columns สำหรับตาราง
  const transactionColumns: TableColumn[] = [
    {
      key: 'id',
      label: 'Transaction ID',
      width: 120,
      sortable: true,
    },
    {
      key: 'date',
      label: 'Date',
      width: 180,
      sortable: true,
      render: (value) => formatDate(value, 'long'),
    },
    {
      key: 'type',
      label: 'Type',
      width: 100,
      sortable: true,
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            value === 'buy'
              ? 'bg-success/20 text-success'
              : 'bg-danger/20 text-danger'
          }`}
        >
          {value.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'coin',
      label: 'Coin',
      width: 100,
      sortable: true,
      render: (value) => (
        <span className="font-bold text-primary-400">{value}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      width: 120,
      sortable: true,
      render: (value) => value.toLocaleString(),
    },
    {
      key: 'price',
      label: 'Price',
      width: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`,
    },
    {
      key: 'total',
      label: 'Total',
      width: 140,
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-100">
          ${value.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      sortable: true,
      render: (value) => {
        const statusColors = {
          completed: 'bg-success/20 text-success',
          pending: 'bg-warning/20 text-warning',
          cancelled: 'bg-gray-600/20 text-gray-400',
        };
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              statusColors[value as keyof typeof statusColors]
            }`}
          >
            {value.toUpperCase()}
          </span>
        );
      },
    },
  ];

  // เพิ่ม expanded content ให้กับแต่ละแถว
  const tableData: TableRow[] = transactionHistory.map((tx) => ({
    ...tx,
    expandedContent: (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Fee:</span>
          <span className="ml-2 text-gray-300">${tx.fee.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500">Net Total:</span>
          <span className="ml-2 text-gray-300">
            ${(tx.total - tx.fee).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Avg Price:</span>
          <span className="ml-2 text-gray-300">
            ${(tx.total / tx.amount).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Order Type:</span>
          <span className="ml-2 text-gray-300">Market Order</span>
        </div>
      </div>
    ),
  }));

  // Top Coins Table
  const topCoinsColumns: TableColumn[] = [
    {
      key: 'symbol',
      label: 'Symbol',
      width: 100,
      sortable: true,
      render: (value) => (
        <span className="font-bold text-primary-400">{value}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      width: 150,
      sortable: true,
    },
    {
      key: 'price',
      label: 'Price',
      width: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`,
    },
    {
      key: 'change24h',
      label: '24h Change',
      width: 120,
      sortable: true,
      render: (value) => (
        <span
          className={`font-semibold ${
            value >= 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {value >= 0 ? '+' : ''}
          {value}%
        </span>
      ),
    },
    {
      key: 'volume',
      label: '24h Volume',
      width: 120,
      sortable: true,
      render: (value) => `$${value}`,
    },
    {
      key: 'marketCap',
      label: 'Market Cap',
      width: 120,
      sortable: true,
      render: (value) => `$${value}`,
    },
  ];

  // สร้าง widgets สำหรับ dashboard
  const widgets = [
    {
      id: 'pie-chart',
      title: 'Portfolio Distribution',
      component: (
        <PieChart
          title="Portfolio Distribution"
          data={portfolioDistribution}
          height={300}
        />
      ),
    },
    {
      id: 'bar-chart',
      title: 'Monthly Trading Volume',
      component: (
        <BarChart
          title="Monthly Trading Volume"
          data={monthlyTradingVolume}
          height={300}
        />
      ),
    },
    {
      id: 'line-chart',
      title: 'Account Balance History',
      component: (
        <LineChart
          title="Account Balance History"
          data={accountBalance}
          height={300}
          smooth={true}
        />
      ),
    },
    {
      id: 'column-chart',
      title: 'Weekly Profit & Loss',
      component: (
        <ColumnChart
          title="Weekly Profit & Loss"
          data={weeklyProfitLoss}
          height={300}
          stacked={false}
        />
      ),
    },
    // TradingView Chart ถูกปิดชั่วคราว - ใช้ Line Chart แทน
    {
      id: 'btc-chart',
      title: 'BTC/USDT Price Chart',
      component: (
        <LineChart
          title="BTC/USDT Price Chart"
          data={{
            categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
            series: [{
              name: 'BTC Price',
              data: [44500, 44800, 45200, 45000, 45500, 45300, 45600]
            }]
          }}
          height={350}
          smooth={true}
        />
      ),
    },
    {
      id: 'transaction-table',
      title: 'Transaction History',
      component: (
        <DataTable
          title="Transaction History"
          columns={transactionColumns}
          data={tableData}
          expandable={true}
          pagination={true}
          itemsPerPage={10}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Top Controls */}
      <div className="bg-dark-800/50 border-b border-dark-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Dashboard Overview</h1>
            <p className="text-sm text-gray-400">
              Showing data from {formatDate(dateRange.start)} to {formatDate(dateRange.end)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value as DateRangeType)}
              className="px-4 py-2 bg-dark-700 text-gray-300 rounded-lg border border-dark-600 focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="lastday">Yesterday</option>
              <option value="last7day">Last 7 Days</option>
              <option value="lastweek">Last Week</option>
              <option value="lastmonth">Last Month</option>
              <option value="last3month">Last 3 Months</option>
              <option value="last6month">Last 6 Months</option>
              <option value="last12month">Last 12 Months</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className={`p-2 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-all ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatsCard
            title="Total Balance"
            value={`$${dashboardStats.totalBalance.toLocaleString()}`}
            change={dashboardStats.todayChange}
            changeLabel="today"
            icon={<Wallet className="w-6 h-6" />}
            color="primary"
          />
          <StatsCard
            title="Total Profit"
            value={`$${dashboardStats.totalProfit.toLocaleString()}`}
            change={dashboardStats.weeklyChange}
            changeLabel="this week"
            icon={<TrendingUp className="w-6 h-6" />}
            color="success"
          />
          <StatsCard
            title="Total Trades"
            value={dashboardStats.totalTrades}
            change={dashboardStats.monthlyChange}
            changeLabel="this month"
            icon={<Activity className="w-6 h-6" />}
            color="warning"
          />
          <StatsCard
            title="Success Rate"
            value={`${dashboardStats.successRate}%`}
            change={2.1}
            changeLabel="improved"
            icon={<Award className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">Market Cap</p>
            <p className="text-lg font-bold text-gray-100">
              ${marketOverview.totalMarketCap}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">24h Volume</p>
            <p className="text-lg font-bold text-gray-100">
              ${marketOverview.total24hVolume}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">BTC Dominance</p>
            <p className="text-lg font-bold text-primary-400">
              {marketOverview.btcDominance}%
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">ETH Dominance</p>
            <p className="text-lg font-bold text-primary-400">
              {marketOverview.ethDominance}%
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">Total Coins</p>
            <p className="text-lg font-bold text-gray-100">
              {marketOverview.totalCoins.toLocaleString()}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-gray-500 mb-1">Exchanges</p>
            <p className="text-lg font-bold text-gray-100">
              {marketOverview.activeExchanges}
            </p>
          </div>
        </div>

        {/* Top Coins Table */}
        <div className="mb-6">
          <DataTable
            title="Top Cryptocurrencies"
            columns={topCoinsColumns}
            data={topCoins.map((coin, idx) => ({ id: idx, ...coin }))}
            expandable={false}
            pagination={false}
          />
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <GridLayout widgets={widgets} />

    </div>
  );
}

export default App;
