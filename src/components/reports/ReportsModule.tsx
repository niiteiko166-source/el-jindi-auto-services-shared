import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, computeProductStats, formatInt } from '../../utils/calculations';
import { SaleInvoice } from '../../types';
import { ReceiptModal } from '../pos/ReceiptModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Package, AlertTriangle, FileText, Printer, User, Calendar, Receipt, Search, DollarSign, ShoppingBag, BarChart2, Clock } from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { products, sales } = useApp();
  const { currentUser, users } = useAuth();

  const [activeReport, setActiveReport] = useState<'VALUATION' | 'FAST_MOVERS' | 'DEAD_STOCK' | 'SALES_REP_LOG'>('VALUATION');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [selectedRep, setSelectedRep] = useState<string>('ALL');
  const [repSearch, setRepSearch] = useState<string>('');

  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Category breakdown valuation
  const sheets = ['Filters', 'Brakes', 'Accessories', 'Oil & Fluids'] as const;

  const categoryValuation = sheets.map((s) => {
    const items = (products || []).filter((p) => p.sheet === s);
    const totalCost = items.reduce((sum, p) => sum + p.cost * computeProductStats(p).currentStock, 0);
    const totalValue = items.reduce((sum, p) => sum + p.sell * computeProductStats(p).currentStock, 0);
    return { name: s, costValue: totalCost, retailValue: totalValue, itemCount: items.length };
  });

  // Fast / Slow Movers
  const sortedProducts = [...(products || [])].sort((a, b) => b.sold - a.sold);
  const fastMovers = sortedProducts.slice(0, 10);
  const deadStock = (products || []).filter((p) => p.sold === 0);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Executive Analytics & Audit Reports
          </h2>
        </div>

        {/* Report Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveReport('VALUATION')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeReport === 'VALUATION'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventory Valuation
          </button>
          <button
            onClick={() => setActiveReport('FAST_MOVERS')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeReport === 'FAST_MOVERS'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fast Moving Parts
          </button>
          <button
            onClick={() => setActiveReport('DEAD_STOCK')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeReport === 'DEAD_STOCK'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dead Stock Audit ({deadStock.length})
          </button>
          <button
            onClick={() => setActiveReport('SALES_REP_LOG')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeReport === 'SALES_REP_LOG'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Sales Rep Daily Log</span>
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
        >
          <Printer className="w-4 h-4" />
          <span>Print Audit Report</span>
        </button>
      </div>

      {/* Valuation View */}
      {activeReport === 'VALUATION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chart */}
            <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Stock Valuation by Category Sheet (GH₵)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryValuation}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), 'Valuation']}
                      contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="costValue" name="Cost Price Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retailValue" name="Retail Price Value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Category Summary Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-[10px] text-slate-700 uppercase">
                    <tr>
                      <th className="p-2">Sheet</th>
                      <th className="p-2 text-right">Cost Value</th>
                      <th className="p-2 text-right">Retail Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryValuation.map((c) => (
                      <tr key={c.name}>
                        <td className="p-2 font-bold text-slate-900">{c.name}</td>
                        <td className="p-2 text-right font-mono text-slate-700">
                          {formatCurrency(c.costValue)}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-600 font-bold">
                          {formatCurrency(c.retailValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fast Movers View */}
      {activeReport === 'FAST_MOVERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Top 10 Fast-Selling OEM Spare Parts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">OEM Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Units Sold</th>
                  <th className="p-2.5 text-right">Unit Sell Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fastMovers.map((p, idx) => (
                  <tr key={`fast-${p.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-700">{p.sheet}</td>
                    <td className="p-2.5 font-mono text-blue-600 font-bold">{p.code}</td>
                    <td className="p-2.5 font-medium text-slate-900">{p.desc}</td>
                    <td className="p-2.5 text-right font-mono font-extrabold text-emerald-600">
                      {formatInt(p.sold)} units
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(p.sell)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dead Stock View */}
      {activeReport === 'DEAD_STOCK' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Slow-Moving / Dead Stock Audit List (0 Sales Recorded)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">OEM Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Stock Held</th>
                  <th className="p-2.5 text-right">Unit Cost</th>
                  <th className="p-2.5 text-right">Capital Tied Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deadStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Great job! No completely dead stock found in inventory.
                    </td>
                  </tr>
                ) : (
                  deadStock.map((p, idx) => {
                    const stats = computeProductStats(p);
                    return (
                      <tr key={`dead-${p.id}-${idx}`} className="hover:bg-amber-50/50">
                        <td className="p-2.5 font-bold text-slate-700">{p.sheet}</td>
                        <td className="p-2.5 font-mono text-blue-600 font-bold">{p.code}</td>
                        <td className="p-2.5 font-medium text-slate-900">{p.desc}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatInt(stats.currentStock)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          {formatCurrency(p.cost)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-red-600">
                          {formatCurrency(p.cost * stats.currentStock)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Rep Daily Performance Log View */}
      {activeReport === 'SALES_REP_LOG' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-500">Log Date:</span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              {/* Rep Filter */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <User className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-500">Sales Rep:</span>
                <select
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Sales Reps / Cashiers</option>
                  {(users || []).map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search invoice #, customer..."
                value={repSearch}
                onChange={(e) => setRepSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Sales List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Daily Sales Invoices Log ({reportDate})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Showing recorded sales for {selectedRep === 'ALL' ? 'all sales reps' : selectedRep}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 pl-4">Invoice #</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Sales Rep</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                  {sales
                    .filter((s) => {
                      if (reportDate && s.date !== reportDate) return false;
                      if (selectedRep !== 'ALL') {
                        const cLower = (s.cashier || '').toLowerCase();
                        const repLower = selectedRep.toLowerCase();
                        if (!cLower.includes(repLower) && !repLower.includes(cLower)) {
                          return false;
                        }
                      }
                      if (repSearch.trim()) {
                        const q = repSearch.toLowerCase();
                        const invMatch = (s.invoiceNo || '').toLowerCase().includes(q);
                        const custMatch = (s.customerName || '').toLowerCase().includes(q);
                        const cMatch = (s.cashier || '').toLowerCase().includes(q);
                        if (!invMatch && !custMatch && !cMatch) return false;
                      }
                      return true;
                    })
                    .map((sale) => (
                      <tr key={sale.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-extrabold text-blue-600">{sale.invoiceNo}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{sale.time || 'N/A'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                            {sale.cashier || 'Sales Rep'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{sale.customerName || 'Walk-In'}</td>
                        <td className="p-3">
                          <span className="font-extrabold uppercase text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {formatCurrency(sale.grandTotal)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
                            onClick={() => {
                              setSelectedInvoice(sale);
                              setIsReceiptOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptOpen && selectedInvoice && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={selectedInvoice}
        />
      )}
    </div>
  );
};
