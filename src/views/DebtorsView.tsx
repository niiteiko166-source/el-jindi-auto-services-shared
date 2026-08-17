import React, { useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  Search,
  ChevronDown,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  FileText,
  Plus
} from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface DebtorsViewProps {
  onOpenQuickAdd: (type: string) => void;
}

export const DebtorsView: React.FC<DebtorsViewProps> = ({ onOpenQuickAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const debtors = db.getDebtorsByCustomer();
  const summary = db.getDebtorsSummary();

  // Filter debtors
  const filtered = debtors.filter(debtor => {
    const q = searchTerm.toLowerCase();
    return (
      debtor.customerName.toLowerCase().includes(q) ||
      debtor.customerPhone.toLowerCase().includes(q) ||
      debtor.customerEmail.toLowerCase().includes(q)
    );
  });

  const pageSize = DEFAULT_PAGE_SIZE;
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Color helper for aging
  const getAgingColor = (category: string) => {
    switch (category) {
      case '0-30 Days':
        return 'text-green-700 bg-green-50';
      case '30-60 Days':
        return 'text-yellow-700 bg-yellow-50';
      case '60-90 Days':
        return 'text-orange-700 bg-orange-50';
      case '90+ Days':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-blue-700 bg-blue-50';
    }
  };

  const getAgingBadgeColor = (category: string) => {
    switch (category) {
      case '0-30 Days':
        return 'bg-green-100 text-green-700';
      case '30-60 Days':
        return 'bg-yellow-100 text-yellow-700';
      case '60-90 Days':
        return 'bg-orange-100 text-orange-700';
      case '90+ Days':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Debtors Management</h1>
            <p className="text-xs text-slate-500">
              Track outstanding payments, aging analysis, and collections by customer
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('payment')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Total Outstanding</p>
              <p className="text-2xl font-black text-red-700 mt-2">GH₵ {summary.totalOutstanding.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">{summary.totalInvoices} invoices outstanding</p>
        </div>

        {/* Total Debtors */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Total Debtors</p>
              <p className="text-2xl font-black text-blue-700 mt-2">{summary.uniqueDebtors}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Active customer accounts</p>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Unpaid</p>
              <p className="text-2xl font-black text-red-600 mt-2">{summary.unpaidCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Never received payment</p>
        </div>

        {/* Partially Paid */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Partial</p>
              <p className="text-2xl font-black text-yellow-600 mt-2">{summary.partiallyPaidCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Payment received (incomplete)</p>
        </div>

        {/* 90+ Days Overdue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Overdue 90+</p>
              <p className="text-2xl font-black text-red-700 mt-2">GH₵ {summary.agingBreakdown.days90plus.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Critical priority</p>
        </div>
      </div>

      {/* Aging Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-black text-slate-900 mb-4">Aging Analysis</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-[10px] text-green-600 font-bold uppercase">Current</p>
            <p className="text-lg font-black text-green-700 mt-1">GH₵ {summary.agingBreakdown.current.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-600 font-bold uppercase">0-30 Days</p>
            <p className="text-lg font-black text-blue-700 mt-1">GH₵ {summary.agingBreakdown.days0to30.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
            <p className="text-[10px] text-yellow-600 font-bold uppercase">30-60 Days</p>
            <p className="text-lg font-black text-yellow-700 mt-1">GH₵ {summary.agingBreakdown.days30to60.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-[10px] text-orange-600 font-bold uppercase">60-90 Days</p>
            <p className="text-lg font-black text-orange-700 mt-1">GH₵ {summary.agingBreakdown.days60to90.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-[10px] text-red-600 font-bold uppercase">90+ Days</p>
            <p className="text-lg font-black text-red-700 mt-1">GH₵ {summary.agingBreakdown.days90plus.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search customer name, phone, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      {/* Debtors List */}
      <div className="space-y-3">
        {paged.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="text-slate-400 text-sm">No debtors found</div>
          </div>
        ) : (
          paged.map(debtor => (
            <div key={debtor.customerId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Debtor Header */}
              <button
                onClick={() => setExpandedCustomer(expandedCustomer === debtor.customerId ? null : debtor.customerId)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{debtor.customerName}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {debtor.customerPhone} • {debtor.invoices.length} invoice{debtor.invoices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="font-black text-red-700 text-sm">GH₵ {debtor.totalOutstanding.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">Outstanding</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedCustomer === debtor.customerId ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Debtor Details (Expanded) */}
              {expandedCustomer === debtor.customerId && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Phone</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{debtor.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Email</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{debtor.customerEmail}</p>
                    </div>
                  </div>

                  {/* Invoices Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5 text-right">Paid</th>
                          <th className="p-2.5 text-right">Balance</th>
                          <th className="p-2.5 text-center">Age</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {debtor.invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-white">
                            <td className="p-2.5 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-slate-500">{inv.date}</td>
                            <td className="p-2.5 text-right font-mono">GH₵ {inv.grandTotal.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">GH₵ {inv.paidAmount.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-red-700 font-mono">GH₵ {inv.balance.toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-1 rounded text-[9px] font-bold ${getAgingBadgeColor(inv.agingCategory)}`}>
                                {inv.agingCategory}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => onOpenQuickAdd('payment')}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-emerald-600 hover:text-emerald-700"
                                title="Add payment"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Action */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onOpenQuickAdd('payment')}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Add Payment for {debtor.customerName}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <Pagination
          totalItems={filtered.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
