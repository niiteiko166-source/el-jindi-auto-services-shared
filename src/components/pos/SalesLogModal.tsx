import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SaleInvoice } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { ReceiptModal } from './ReceiptModal';
import {
  Receipt,
  Calendar,
  User,
  DollarSign,
  Search,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Filter,
  BarChart2,
  Zap,
  ArrowUpRight,
  Trash2
} from 'lucide-react';

interface SalesLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesLogModal: React.FC<SalesLogModalProps> = ({ isOpen, onClose }) => {
  const { sales, settings, showToast, deleteSale } = useApp();
  const { currentUser, users } = useAuth();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCashier, setSelectedCashier] = useState<string>('MY_SALES');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');

  // Selected invoice for receipt viewing
  const [activeInvoice, setActiveInvoice] = useState<SaleInvoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'INVENTORY_MANAGER';

  // Determine current active cashier filter name
  const currentRepName = currentUser?.name || currentUser?.username || 'Sales Rep';

  // Helper to accurately match sale cashier with active user profile
  const isMySale = (saleCashier: string | undefined | null, user: typeof currentUser): boolean => {
    if (!saleCashier) return true;
    if (!user) return true;

    const cLower = saleCashier.toLowerCase().trim();
    const nameLower = (user.name || '').toLowerCase().trim();
    const userLower = (user.username || '').toLowerCase().trim();

    // Direct inclusion in either direction
    if (nameLower && (cLower.includes(nameLower) || nameLower.includes(cLower))) return true;
    if (userLower && (cLower.includes(userLower) || userLower.includes(cLower))) return true;

    // Tokenized word matching (e.g., "Kofi", "Mensah", "sales1")
    const nameParts = nameLower.split(/[\s()_,-]+/).filter((p) => p.length >= 2 && p !== 'rep' && p !== 'sales');
    const userParts = userLower.split(/[\s()_,-]+/).filter((p) => p.length >= 2 && p !== 'rep' && p !== 'sales');
    const allParts = [...nameParts, ...userParts];

    for (const part of allParts) {
      if (cLower.includes(part)) return true;
    }

    // Role fallback for sales reps / cashiers
    if (
      (user.role === 'SALES_REP' || user.role === 'POS_CASHIER') &&
      (cLower === 'cashier' || cLower === 'main cashier' || cLower === 'sales rep' || cLower.includes('sales'))
    ) {
      return true;
    }

    return false;
  };

  // Filter sales list based on selected filters
  const filteredSales = useMemo(() => {
    return (sales || []).filter((sale) => {
      // Date filter (if selectedDate is empty, show all dates)
      if (selectedDate && sale.date !== selectedDate) {
        return false;
      }

      // Cashier filter
      if (selectedCashier === 'MY_SALES') {
        if (!isMySale(sale.cashier, currentUser)) {
          return false;
        }
      } else if (selectedCashier !== 'ALL') {
        const cLower = (sale.cashier || '').toLowerCase();
        const selLower = selectedCashier.toLowerCase();
        if (!cLower.includes(selLower) && !selLower.includes(cLower)) {
          return false;
        }
      }

      // Payment method filter
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
  }, [sales, selectedDate, selectedCashier, selectedPaymentMethod, searchTerm, currentUser]);

  // Aggregate Metrics for the filtered view (Daily Sales Tally)
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalCredit = 0;
    let totalItemsCount = 0;
    let cashTotal = 0;
    let momoTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;

    filteredSales.forEach((s) => {
      totalRevenue += s.grandTotal || 0;
      totalPaid += s.amountPaid || 0;
      totalCredit += s.balanceDue || 0;

      s.items?.forEach((item) => {
        totalItemsCount += item.qty || 0;
      });

      if (s.paymentMethod === 'CASH') cashTotal += s.grandTotal;
      else if (s.paymentMethod === 'MOBILE_MONEY') momoTotal += s.grandTotal;
      else if (s.paymentMethod === 'CARD') cardTotal += s.grandTotal;
      else if (s.paymentMethod === 'BANK_TRANSFER') bankTotal += s.grandTotal;
    });

    return {
      totalSalesCount: filteredSales.length,
      totalRevenue,
      totalPaid,
      totalCredit,
      totalItemsCount,
      cashTotal,
      momoTotal,
      cardTotal,
      bankTotal
    };
  }, [filteredSales]);

  const handlePrintDailySummary = () => {
    window.print();
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-base uppercase tracking-tight text-white">
                    Sales Rep Daily Sales Log
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-extrabold">
                    Live Shift Tracker
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Track individual daily sales tally, invoice logs, & payment breakdown
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrintDailySummary}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print Shift Log</span>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Date Picker */}
                <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-500">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="font-bold text-slate-900 focus:outline-none bg-transparent cursor-pointer"
                  />
                  {selectedDate === todayStr && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                      TODAY
                    </span>
                  )}
                </div>

                {/* Quick Date Buttons */}
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-colors ${
                    selectedDate === todayStr
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate('')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-colors ${
                    !selectedDate
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  All Dates
                </button>

                {/* Cashier / Rep Selector */}
                <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-500">Sales Rep:</span>
                  <select
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                    className="font-bold text-slate-900 focus:outline-none bg-transparent cursor-pointer"
                  >
                    <option value="MY_SALES">My Sales ({currentRepName})</option>
                    <option value="ALL">All Sales Reps / Cashiers</option>
                    {(users || []).map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="font-bold text-slate-800 focus:outline-none bg-transparent text-xs cursor-pointer"
                  >
                    <option value="ALL">All Payment Types</option>
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">MoMo</option>
                    <option value="CARD">Card / POS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_SALE">Credit Sale</option>
                  </select>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search invoice #, customer, item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Daily Tally Metrics Cards */}
          <div className="p-4 bg-slate-100/70 border-b border-slate-200 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Today's Sales Revenue */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Total Sales Revenue
              </div>
              <div className="text-lg font-black font-mono text-emerald-600">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>Paid: {formatCurrency(stats.totalPaid)}</span>
              </div>
              <div className="absolute top-3 right-3 text-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Total Invoices Count */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Transactions Count
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {stats.totalSalesCount} <span className="text-xs font-normal text-slate-500">Invoices</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-blue-500" />
                <span>Parts Sold: {stats.totalItemsCount} units</span>
              </div>
              <div className="absolute top-3 right-3 text-blue-500/20">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            {/* Payment Breakdown (Cash / MoMo) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Cash & MoMo Received
              </div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                Cash: <span className="text-emerald-700 font-black">{formatCurrency(stats.cashTotal)}</span>
              </div>
              <div className="text-xs font-extrabold text-amber-700 font-mono mt-0.5">
                MoMo: <span>{formatCurrency(stats.momoTotal)}</span>
              </div>
              <div className="absolute top-3 right-3 text-amber-500/20">
                <Banknote className="w-6 h-6" />
              </div>
            </div>

            {/* Card / Credit Sales */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Card & Credit Invoices
              </div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                Card: <span className="text-blue-700 font-black">{formatCurrency(stats.cardTotal)}</span>
              </div>
              <div className="text-xs font-extrabold text-red-600 font-mono mt-0.5">
                Credit Owed: <span>{formatCurrency(stats.totalCredit)}</span>
              </div>
              <div className="absolute top-3 right-3 text-red-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Sales Log Invoices List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Sales Recorded for Selected Filter</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No transaction records match the selected date ({selectedDate}), sales rep, or payment method filter.
                </p>
                <button
                  onClick={() => {
                    setSelectedDate(todayStr);
                    setSelectedCashier('MY_SALES');
                    setSearchTerm('');
                    setSelectedPaymentMethod('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl transition-colors inline-block mt-2"
                >
                  Reset to Today&apos;s My Sales
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
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
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px]">
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReceipt(sale);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" />
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
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Summary */}
          <div className="bg-slate-900 text-white p-3.5 px-6 border-t border-slate-800 shrink-0 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-slate-400 font-medium">
                Viewing <strong className="text-white">{filteredSales.length}</strong> invoices for{' '}
                <strong className="text-amber-300">{selectedDate}</strong>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-extrabold text-slate-300">
                Daily Sales Tally:{' '}
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatCurrency(stats.totalRevenue)}
                </span>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      {isReceiptOpen && activeInvoice && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={activeInvoice}
        />
      )}
    </>
  );
};
