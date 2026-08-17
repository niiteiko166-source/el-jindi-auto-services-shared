import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { computeProductStats, computeDebtorStats, formatCurrency, formatInt } from '../../utils/calculations';
import { QuickSaleModal } from '../pos/QuickSaleModal';
import { SalesLogModal } from '../pos/SalesLogModal';
import {
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  ShoppingCart,
  PlusCircle,
  ArrowRight,
  Boxes,
  Truck,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  Activity,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  LayoutGrid,
  CheckSquare,
  X,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
  const {
    products,
    debtors,
    sales,
    customers,
    totalStockValueCost,
    totalProfit,
    totalReorderCount,
    totalDebtorsOwed,
    setCurrentView,
    setStatusFilter,
    refreshData,
    showToast
  } = useApp();

  const [selectedReorderSheet, setSelectedReorderSheet] = useState<string>('all');
  const [showQuickSaleModal, setShowQuickSaleModal] = useState<boolean>(false);
  const [showSalesLogModal, setShowSalesLogModal] = useState<boolean>(false);
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState<boolean>(false);

  const [activeWidgets, setActiveWidgets] = useState({
    kpiCards: true,
    quickShortcuts: true,
    reorderMonitor: true,
    salesGauge: true,
    topParts: true,
    categoryBreakdown: true
  });

  const toggleWidget = (key: keyof typeof activeWidgets) => {
    setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Stock value breakdown by sheet category
  const sheets = ['Filters', 'Brakes', 'Accessories', 'Oil & Fluids'];
  const categoryChartData = sheets.map((sheetName) => {
    let sheetVal = 0;
    let sheetCount = 0;
    let sheetReorders = 0;

    (products || [])
      .filter((p) => p.sheet === sheetName)
      .forEach((p) => {
        const stats = computeProductStats(p);
        sheetVal += stats.stockValueCost;
        sheetCount++;
        if (stats.status === 'REORDER' || stats.status === 'OUT_OF_STOCK') sheetReorders++;
      });

    return {
      name: sheetName,
      value: sheetVal,
      count: sheetCount,
      reorder: sheetReorders
    };
  });

  // Top selling products by units sold
  const topSelling = [...(products || [])]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6);

  // 30-Day Daily Sales Revenue Trend (from POS Transactions)
  const dailySales30DaysData = useMemo(() => {
    const data: { dateStr: string; displayDate: string; revenue: number; orders: number }[] = [];
    const today = new Date();

    const salesMap: Record<string, { revenue: number; orders: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      salesMap[isoDate] = { revenue: 0, orders: 0 };
      data.push({ dateStr: isoDate, displayDate, revenue: 0, orders: 0 });
    }

    (sales || []).forEach((s) => {
      if (!s || !s.date) return;
      const saleDate = s.date.slice(0, 10);
      if (salesMap[saleDate]) {
        const rev = s.grandTotal || s.subtotal || 0;
        salesMap[saleDate].revenue += rev;
        salesMap[saleDate].orders += 1;
      }
    });

    return data.map((item) => ({
      ...item,
      revenue: Math.round((salesMap[item.dateStr]?.revenue || 0) * 100) / 100,
      orders: salesMap[item.dateStr]?.orders || 0
    }));
  }, [sales]);

  const total30DayRevenue = useMemo(
    () => dailySales30DaysData.reduce((sum, d) => sum + d.revenue, 0),
    [dailySales30DaysData]
  );

  const avgDailyRevenue = useMemo(
    () => (dailySales30DaysData.length > 0 ? total30DayRevenue / dailySales30DaysData.length : 0),
    [total30DayRevenue, dailySales30DaysData]
  );

  const total30DayOrders = useMemo(
    () => dailySales30DaysData.reduce((sum, d) => sum + d.orders, 0),
    [dailySales30DaysData]
  );

  const peakDay = useMemo(() => {
    let max = dailySales30DaysData[0] || { displayDate: 'N/A', revenue: 0 };
    dailySales30DaysData.forEach((d) => {
      if (d.revenue > max.revenue) max = d;
    });
    return max;
  }, [dailySales30DaysData]);

  // Automated Reorder System Calculations
  const allLowStockProducts = (products || []).filter((p) => computeProductStats(p).status !== 'OK');

  const filteredLowStockProducts = selectedReorderSheet === 'all'
    ? allLowStockProducts
    : allLowStockProducts.filter((p) => p.sheet === selectedReorderSheet);

  const totalShortageUnits = allLowStockProducts.reduce((sum, p) => {
    const stats = computeProductStats(p);
    const deficit = Math.max(1, (p.reorder || 3) - stats.currentStock);
    return sum + deficit;
  }, 0);

  const estimatedRestockCost = allLowStockProducts.reduce((sum, p) => {
    const stats = computeProductStats(p);
    const deficit = Math.max(1, (p.reorder || 3) - stats.currentStock);
    return sum + (deficit * p.cost);
  }, 0);

  const handleJumpToInventoryReorder = (sheetName: string) => {
    setStatusFilter('REORDER');
    setCurrentView(sheetName);
  };

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dashboard Toolbar & Widget Manager Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-sm uppercase tracking-tight">Executive Dashboard Widgets</h2>
            <p className="text-[11px] text-slate-500 font-medium">Customize active widgets, view live KPI metrics & launch express tools</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Sale Express Trigger Button */}
          <button
            onClick={() => setShowQuickSaleModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 animate-pulse hover:animate-none"
          >
            <Zap className="w-4 h-4 fill-current text-amber-300" />
            <span>⚡ Quick Sale Express</span>
          </button>

          {/* Toggle Widget Customizer */}
          <button
            onClick={() => setShowWidgetCustomizer(!showWidgetCustomizer)}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl border transition-all flex items-center gap-1.5 ${
              showWidgetCustomizer
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Customize Widgets</span>
          </button>

          {/* Dev: Force refresh live data and clear local cache */}
          <button
            onClick={async () => {
              try {
                localStorage.removeItem('eljindi_debtors');
                localStorage.removeItem('eljindi_customers');
                localStorage.removeItem('eljindi_suppliers');
                await refreshData();
                showToast('Live data refreshed and local cache cleared', 'success');
              } catch (e) {
                console.error(e);
                showToast('Failed to refresh live data', 'error');
              }
            }}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm rounded-xl border border-slate-200"
          >
            Force Refresh Data
          </button>
        </div>
      </div>

      {/* Widget Customizer Toggle Panel */}
      {showWidgetCustomizer && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-3 border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-xs uppercase text-slate-200 tracking-wider">
                Dashboard Widget Preferences
              </h3>
            </div>
            <button
              onClick={() => setShowWidgetCustomizer(false)}
              className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-2.5 py-1 rounded-lg"
            >
              Done / Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'kpiCards', label: 'KPI Metrics Cards' },
              { id: 'quickShortcuts', label: 'Quick Shortcuts' },
              { id: 'reorderMonitor', label: 'Reorder Point Monitor' },
              { id: 'salesGauge', label: 'Daily Sales Revenue' },
              { id: 'topParts', label: 'Top OEM Parts' },
              { id: 'categoryBreakdown', label: 'Stock Valuation' }
            ].map((widget) => {
              const isActive = activeWidgets[widget.id as keyof typeof activeWidgets];
              return (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id as keyof typeof activeWidgets)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="truncate pr-1">{widget.label}</span>
                  {isActive ? <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      {activeWidgets.kpiCards && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Value (Cost)</span>
            <PackageCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalStockValueCost)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Across <span className="font-bold text-slate-700">{formatInt((products || []).length)}</span> active SKUs
          </p>
        </div>

        {/* Gross Profit to Date */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Profit Realized</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalProfit)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span>Calculated from verified units sold</span>
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => handleJumpToInventoryReorder('Filters')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Reorders</span>
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono flex items-center justify-between">
            <span>{totalReorderCount} <span className="text-xs text-slate-400 font-normal">items</span></span>
            {totalReorderCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Alert Active</span>
            )}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center justify-between">
            <span>Click to filter & highlight in Inventory</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Customer Accounts Receivable */}
        <div
          onClick={() => setCurrentView('debtors')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden cursor-pointer hover:border-red-400 transition-colors"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Owed by Customers (AR)</span>
            <CreditCard className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono text-red-600">
            {formatCurrency(totalDebtorsOwed)}
          </div>
          {(() => {
            const openCount = (sales || []).filter((s) => (s.balanceDue || 0) > 0).length;
            return (
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <span>{openCount} open credit invoices</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </p>
            );
          })()}
        </div>
      </div>
      )}

      {/* Quick Actions Ribbon */}
      {activeWidgets.quickShortcuts && (
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Express Shortcuts:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowQuickSaleModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3.5 py-1.5 rounded-lg transition-all shadow-md active:scale-95"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-current" />
            <span>Quick Sale Express</span>
          </button>
          <button
            onClick={() => setShowSalesLogModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Sales Rep Daily Log</span>
          </button>
          <button
            onClick={() => setCurrentView('pos')}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Launch POS Terminal</span>
          </button>
          <button
            onClick={() => handleJumpToInventoryReorder('Filters')}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Reorder Monitor ({totalReorderCount})</span>
          </button>
          <button
            onClick={() => setCurrentView('purchasing')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Receive Stock Order</span>
          </button>
          <button
            onClick={() => setCurrentView('debtors')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Customer Payment</span>
          </button>
        </div>
      </div>
      )}

      {/* Automated Inventory Reorder Point Monitor System */}
      {activeWidgets.reorderMonitor && (
      <div className="bg-white rounded-xl border-2 border-amber-300 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Automated Inventory Reorder Point Monitor
                </h3>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                  AUTOMATED SYSTEM
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Automatically tracks parts whose stock levels have fallen at or below their predefined safety threshold.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleJumpToInventoryReorder('Filters')}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <span>Highlight All Low Stock in Inventory</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reorder Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Alert SKUs Count</span>
            <div className="text-xl font-extrabold text-amber-900 font-mono mt-0.5">{allLowStockProducts.length} Items</div>
            <p className="text-[11px] text-amber-700 mt-1">Below minimum threshold</p>
          </div>
          <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Unit Shortage</span>
            <div className="text-xl font-extrabold text-amber-900 font-mono mt-0.5">{formatInt(totalShortageUnits)} Units</div>
            <p className="text-[11px] text-amber-700 mt-1">Deficit below safety level</p>
          </div>
          <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Estimated Restock Investment</span>
            <div className="text-xl font-extrabold text-amber-900 font-mono mt-0.5">{formatCurrency(estimatedRestockCost)}</div>
            <p className="text-[11px] text-amber-700 mt-1">Based on supplier unit cost</p>
          </div>
        </div>

        {/* Category Sheet Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-600 mr-1">Filter Alert Feed:</span>
          <button
            onClick={() => setSelectedReorderSheet('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedReorderSheet === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories ({allLowStockProducts.length})
          </button>
          {sheets.map((sheetName) => {
            const count = allLowStockProducts.filter((p) => p.sheet === sheetName).length;
            return (
              <button
                key={sheetName}
                onClick={() => setSelectedReorderSheet(sheetName)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  selectedReorderSheet === sheetName
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{sheetName}</span>
                {count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedReorderSheet === sheetName ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Low Stock Items Detailed Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Category Sheet</th>
                  <th className="p-2.5">OEM / Part Code</th>
                  <th className="p-2.5">Part Description</th>
                  <th className="p-2.5 text-right">Current Stock</th>
                  <th className="p-2.5 text-right">Reorder Threshold</th>
                  <th className="p-2.5 text-right">Unit Shortage</th>
                  <th className="p-2.5 text-center">Automated Status</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                      ✨ No inventory items currently below reorder threshold in this selection!
                    </td>
                  </tr>
                ) : (
                  filteredLowStockProducts.map((p, idx) => {
                    const stats = computeProductStats(p);
                    const isOutOfStock = stats.currentStock <= 0;
                    const shortage = Math.max(1, (p.reorder || 3) - stats.currentStock);

                    return (
                      <tr key={`reorder-${p.id}-${idx}`} className={isOutOfStock ? 'bg-red-50/60 hover:bg-red-50' : 'bg-amber-50/50 hover:bg-amber-50'}>
                        <td className="p-2.5 font-bold text-slate-800 uppercase text-[10px]">{p.sheet}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-600">{p.code || 'NO-CODE'}</td>
                        <td className="p-2.5 font-medium text-slate-900 truncate max-w-xs">{p.desc}</td>
                        <td className={`p-2.5 text-right font-mono font-black text-sm ${isOutOfStock ? 'text-red-700' : 'text-amber-700'}`}>
                          {stats.currentStock}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-700">{p.reorder || 3}</td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-amber-800">+{shortage}</td>
                        <td className="p-2.5 text-center">
                          {isOutOfStock ? (
                            <span className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Out Of Stock
                            </span>
                          ) : (
                            <span className="bg-amber-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Below Reorder
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleJumpToInventoryReorder(p.sheet)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <span>Highlight</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* 30-Day Daily Sales Revenue Line Chart */}
      {activeWidgets.salesGauge && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  30-Day POS Sales Revenue Performance
                </h3>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                  REAL-TIME POS DATA
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Daily sales revenue trajectory pulled directly from Point of Sale completed customer transactions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">30-Day Revenue</span>
              <span className="font-bold text-blue-700 text-sm">{formatCurrency(total30DayRevenue)}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Daily Average</span>
              <span className="font-bold text-slate-900 text-sm">{formatCurrency(avgDailyRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySales30DaysData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="salesRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                interval={2}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickFormatter={(val) => `GH₵${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                          <span>{data.displayDate} ({data.dateStr})</span>
                          <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded">POS Record</span>
                        </div>
                        <div className="text-emerald-400 font-mono font-black text-sm">
                          Revenue: {formatCurrency(data.revenue)}
                        </div>
                        <div className="text-slate-400 font-medium text-[11px] flex justify-between gap-4">
                          <span>Transactions:</span>
                          <span className="font-bold text-white font-mono">{data.orders} sales</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#salesRevenueGrad)"
                activeDot={{ r: 6, fill: '#1D4ED8', stroke: '#FFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Transactions</span>
            <div className="font-mono font-extrabold text-slate-900 text-sm">{total30DayOrders} Sales</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">30-Day Peak Day</span>
            <div className="font-mono font-extrabold text-blue-600 text-sm">{peakDay.displayDate} ({formatCurrency(peakDay.revenue)})</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Order Value</span>
            <div className="font-mono font-extrabold text-emerald-600 text-sm">
              {formatCurrency(total30DayOrders > 0 ? total30DayRevenue / total30DayOrders : 0)}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">POS Terminal Status</span>
            <div className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Sync Enabled
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Charts & Analytics Grid */}
      {activeWidgets.categoryBreakdown && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Stock Value Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Stock Valuation by Category
              </h3>
              <p className="text-xs text-slate-500">Distribution of inventory cost capital in GH₵</p>
            </div>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `GH₵${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valuation Cost']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Category Ratio
            </h3>
            <span className="text-xs text-slate-400 font-mono">By SKUs</span>
          </div>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            {categoryChartData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-600 font-medium truncate">{cat.name}:</span>
                <span className="font-bold text-slate-900">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Top Selling Parts */}
      {activeWidgets.topParts && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Fast Moving / Top Selling Parts
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Highest Turnover
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5">Code / Item</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-right">Sold</th>
                <th className="p-2.5 text-right">Profit (GH₵)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topSelling.map((p, idx) => {
                const stats = computeProductStats(p);
                return (
                  <tr key={`top-${p.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold text-slate-900">
                      <div className="font-mono text-blue-600">{p.code || 'NO-CODE'}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.desc}</div>
                    </td>
                    <td className="p-2.5 text-slate-600 font-medium">{p.sheet}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatInt(p.sold)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(stats.profit, '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Quick Sale Express Modal */}
      <QuickSaleModal
        isOpen={showQuickSaleModal}
        onClose={() => setShowQuickSaleModal(false)}
      />

      {/* Sales Rep Daily Sales Log Modal */}
      <SalesLogModal
        isOpen={showSalesLogModal}
        onClose={() => setShowSalesLogModal(false)}
      />
    </div>
  );
};

