import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SaleInvoice } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { ReceiptModal } from './ReceiptModal';
import {
  BarChart2,
  Calendar,
  User,
  Search,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Clock,
  TrendingUp,
  ShoppingBag,
  Filter,
  Receipt,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Zap,
  Download,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

export const MySalesHistory: React.FC = () => {
  const { sales, deleteSale, showToast } = useApp();
  const { currentUser, users } = useAuth();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const startOfWeekStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }, []);

  const startOfMonthStr = useMemo(() => {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  }, []);

  // Filter state with Date Range support
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' | 'ALL_TIME'>('TODAY');

  const [selectedRep, setSelectedRep] = useState<string>('MY_SALES');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Apply quick date range presets
  const applyDatePreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' | 'ALL_TIME') => {
    setDatePreset(preset);
    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (preset === 'THIS_WEEK') {
      setStartDate(startOfWeekStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(startOfMonthStr);
      setEndDate(todayStr);
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('CUSTOM');
    if (endDate && val > endDate) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('CUSTOM');
    if (startDate && val < startDate) {
      setStartDate(val);
    }
  };

  // Selected receipt viewing
  const [activeInvoice, setActiveInvoice] = useState<SaleInvoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'INVENTORY_MANAGER';
  const currentRepName = currentUser?.name || currentUser?.username || 'Sales Rep';

  // Helper matching function
  const isMySale = (saleCashier: string | undefined | null, user: typeof currentUser): boolean => {
    if (!saleCashier) return true;
    if (!user) return true;

    const cLower = saleCashier.toLowerCase().trim();
    const nameLower = (user.name || '').toLowerCase().trim();
    const userLower = (user.username || '').toLowerCase().trim();

    if (nameLower && (cLower.includes(nameLower) || nameLower.includes(cLower))) return true;
    if (userLower && (cLower.includes(userLower) || userLower.includes(cLower))) return true;

    const nameParts = nameLower.split(/[\s()_,-]+/).filter((p) => p.length >= 2 && p !== 'rep' && p !== 'sales');
    const userParts = userLower.split(/[\s()_,-]+/).filter((p) => p.length >= 2 && p !== 'rep' && p !== 'sales');
    const allParts = [...nameParts, ...userParts];

    for (const part of allParts) {
      if (cLower.includes(part)) return true;
    }

    if (
      (user.role === 'SALES_REP' || user.role === 'POS_CASHIER') &&
      (cLower === 'cashier' || cLower === 'main cashier' || cLower === 'sales rep' || cLower.includes('sales'))
    ) {
      return true;
    }

    return false;
  };

  // Filter sales based on user criteria
  const filteredSales = useMemo(() => {
    return (sales || []).filter((sale) => {
      // Date range filter
      if (startDate && sale.date < startDate) {
        return false;
      }
      if (endDate && sale.date > endDate) {
        return false;
      }

      // Rep filter
      if (selectedRep === 'MY_SALES') {
        if (!isMySale(sale.cashier, currentUser)) {
          return false;
        }
      } else if (selectedRep !== 'ALL') {
        const cLower = (sale.cashier || '').toLowerCase();
        const selLower = selectedRep.toLowerCase();
        if (!cLower.includes(selLower) && !selLower.includes(cLower)) {
          return false;
        }
      }

      // Payment method
      if (selectedPaymentMethod !== 'ALL' && sale.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const invNo = (sale.invoiceNo || '').toLowerCase();
        const custName = (sale.customerName || '').toLowerCase();
        const cashierName = (sale.cashier || '').toLowerCase();
        const hasItemMatch = sale.items?.some(
          (item) => item.desc.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
        );

        if (!invNo.includes(q) && !custName.includes(q) && !cashierName.includes(q) && !hasItemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sales, startDate, endDate, selectedRep, selectedPaymentMethod, searchTerm, currentUser]);

  // Performance metrics computation
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalCredit = 0;
    let totalUnits = 0;
    let cashTotal = 0;
    let momoTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;

    filteredSales.forEach((s) => {
      totalRevenue += s.grandTotal || 0;
      totalPaid += s.amountPaid || 0;
      totalCredit += s.balanceDue || 0;

      s.items?.forEach((i) => {
        totalUnits += i.qty || 0;
      });

      if (s.paymentMethod === 'CASH') cashTotal += s.grandTotal;
      else if (s.paymentMethod === 'MOBILE_MONEY') momoTotal += s.grandTotal;
      else if (s.paymentMethod === 'CARD') cardTotal += s.grandTotal;
      else if (s.paymentMethod === 'BANK_TRANSFER') bankTotal += s.grandTotal;
    });

    const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    return {
      count: filteredSales.length,
      totalRevenue,
      totalPaid,
      totalCredit,
      totalUnits,
      cashTotal,
      momoTotal,
      cardTotal,
      bankTotal,
      avgOrderValue
    };
  }, [filteredSales]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!filteredSales || filteredSales.length === 0) {
      alert('No sales records match the selected filter criteria to export.');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Time',
      'Customer Name',
      'Sales Rep / Cashier',
      'Payment Method',
      'Payment Ref',
      'Items Count',
      'Items Details',
      'Subtotal',
      'Discount',
      'Tax Amount',
      'Grand Total',
      'Amount Paid',
      'Balance Due'
    ];

    const escapeCsv = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredSales.map((sale) => {
      const itemsDetail = (sale.items || []).map((i) => `${i.desc} (x${i.qty})`).join('; ');
      return [
        escapeCsv(sale.invoiceNo),
        escapeCsv(sale.date),
        escapeCsv(sale.time),
        escapeCsv(sale.customerName || 'Walk-In Customer'),
        escapeCsv(sale.cashier || currentRepName),
        escapeCsv(sale.paymentMethod),
        escapeCsv(sale.paymentReference || 'N/A'),
        escapeCsv(sale.items?.length || 0),
        escapeCsv(itemsDetail),
        escapeCsv((sale.subtotal || 0).toFixed(2)),
        escapeCsv((sale.discountTotal || 0).toFixed(2)),
        escapeCsv((sale.taxAmount || 0).toFixed(2)),
        escapeCsv((sale.grandTotal || 0).toFixed(2)),
        escapeCsv((sale.amountPaid || 0).toFixed(2)),
        escapeCsv((sale.balanceDue || 0).toFixed(2))
      ].join(',');
    });

    // Add BOM (\uFEFF) for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateSlug = startDate && endDate
      ? (startDate === endDate ? startDate : `${startDate}_to_${endDate}`)
      : (startDate ? `from_${startDate}` : (endDate ? `until_${endDate}` : 'all_time'));
    const repSlug = currentRepName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute('download', `daily_sales_report_${repSlug}_${dateSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewReceipt = (invoice: SaleInvoice) => {
    setActiveInvoice(invoice);
    setIsReceiptOpen(true);
  };

  const handleDeleteSale = async (sale: SaleInvoice) => {
    if (!window.confirm(`Delete invoice ${sale.invoiceNo}? This will restore stock and remove its linked records.`)) return;
    try {
      await deleteSale(sale.id);
      if (activeInvoice?.id === sale.id) {
        setActiveInvoice(null);
        setIsReceiptOpen(false);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete sale.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-md border border-blue-400/30">
            <BarChart2 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                My Daily Sales History & Log
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                Logged in: {currentRepName}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Track your shift transactions, invoice receipts, and daily sales performance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl border border-emerald-500 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Export filtered sales data to Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Print Sales Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Date Range Presets & Active Range Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Date Range Filter
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {startDate && endDate && startDate === endDate && startDate === todayStr && 'Showing Today\'s Sales'}
                {startDate && endDate && startDate === endDate && startDate !== todayStr && `Showing Sales for ${startDate}`}
                {startDate && endDate && startDate !== endDate && `Showing Sales from ${startDate} to ${endDate}`}
                {startDate && !endDate && `Showing Sales from ${startDate} onwards`}
                {!startDate && endDate && `Showing Sales up to ${endDate}`}
                {!startDate && !endDate && 'Showing All-Time Sales Records'}
              </p>
            </div>
          </div>

          {/* Quick Preset Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => applyDatePreset('TODAY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('YESTERDAY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('THIS_WEEK')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === 'THIS_WEEK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('ALL_TIME')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === 'ALL_TIME'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Filters Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Start & End Date Custom Inputs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
              <span className="font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {/* Sales Rep Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <User className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-500">Sales Rep:</span>
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="MY_SALES">My Sales ({currentRepName})</option>
                <option value="ALL">All Sales Reps</option>
                {(users || []).map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash Only</option>
                <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                <option value="CARD">Card / POS</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT_SALE">Credit Sale</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search invoice #, customer, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Summary KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Sales Revenue ({startDate && endDate ? (startDate === endDate ? startDate : `${startDate} – ${endDate}`) : 'All Time'})
          </div>
          <div className="text-xl font-black font-mono text-emerald-600">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Amount Paid: {formatCurrency(stats.totalPaid)}</span>
          </div>
          <div className="absolute top-4 right-4 text-emerald-500/15">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>

        {/* Transactions & Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Invoices & Parts Volume
          </div>
          <div className="text-xl font-black font-mono text-slate-900">
            {stats.count} <span className="text-xs font-normal text-slate-500">Invoices</span>
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            <span>Parts Sold: {stats.totalUnits} units</span>
          </div>
          <div className="absolute top-4 right-4 text-blue-500/15">
            <Receipt className="w-8 h-8" />
          </div>
        </div>

        {/* Cash vs MoMo Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Cash & MoMo Tally
          </div>
          <div className="text-sm font-extrabold text-slate-900 font-mono">
            Cash: <span className="text-emerald-700 font-black">{formatCurrency(stats.cashTotal)}</span>
          </div>
          <div className="text-xs font-extrabold text-amber-700 font-mono mt-1">
            MoMo: <span>{formatCurrency(stats.momoTotal)}</span>
          </div>
          <div className="absolute top-4 right-4 text-amber-500/15">
            <Banknote className="w-8 h-8" />
          </div>
        </div>

        {/* Average Order Value & Credit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Avg Order & Outstanding
          </div>
          <div className="text-sm font-extrabold text-slate-900 font-mono">
            Avg Order: <span className="text-blue-700 font-black">{formatCurrency(stats.avgOrderValue)}</span>
          </div>
          <div className="text-xs font-extrabold text-red-600 font-mono mt-1">
            Credit Owed: <span>{formatCurrency(stats.totalCredit)}</span>
          </div>
          <div className="absolute top-4 right-4 text-purple-500/15">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recorded Sales Transactions ({filteredSales.length})
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
            <span>
              Total Volume: <span className="font-mono font-black text-emerald-600">{formatCurrency(stats.totalRevenue)}</span>
            </span>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
              title="Download CSV report of these sales"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Transactions Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No sales records match the current filter selection ({startDate && endDate ? (startDate === endDate ? startDate : `${startDate} to ${endDate}`) : 'All Time'}). Make a new sale on the POS terminal!
            </p>
            <button
              onClick={() => {
                applyDatePreset('TODAY');
                setSelectedRep('MY_SALES');
                setSearchTerm('');
                setSelectedPaymentMethod('ALL');
              }}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition-colors inline-block cursor-pointer"
            >
              Reset Filters to My Today Sales
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3 pl-4">Invoice #</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Items Purchased</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleViewReceipt(sale)}
                  >
                    <td className="p-3 pl-4 font-mono font-extrabold text-blue-700 group-hover:underline">
                      {sale.invoiceNo}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {sale.time || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{sale.customerName || 'Walk-In'}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {sale.cashier || 'Sales Rep'}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600 text-[11px]">
                      {sale.items?.map((i) => `${i.qty}x ${i.desc}`).join(', ') || 'Parts'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          sale.paymentMethod === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.paymentMethod === 'MOBILE_MONEY'
                            ? 'bg-amber-100 text-amber-800'
                            : sale.paymentMethod === 'CARD'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipt(sale);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSale(sale);
                          }}
                          className="ml-1 px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                          title="Delete sale"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {isReceiptOpen && activeInvoice && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={activeInvoice}
        />
      )}
    </div>
  );
};
