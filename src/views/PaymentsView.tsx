import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, DollarSign, Calendar } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface PaymentsViewProps {
  onOpenQuickAdd: (type: string) => void;
  refreshKey?: number;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenQuickAdd, refreshKey = 0 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState(() => db.getPayments());
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser.role === 'Admin';

  useEffect(() => {
    setPayments(db.getPayments());
  }, [refreshKey]);

  const filtered = payments.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      p.receiptNumber.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
    );
  });

  // Pagination for payments
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((paymentsPage - 1) * paymentsPageSize, paymentsPage * paymentsPageSize);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Payments & Income Receipts</h1>
            <p className="text-xs text-slate-500">
              Record payments, Mobile Money transactions, cash collections, and issue official receipts
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('payment')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Payment</span>
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search receipt #, Customer, Invoice #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Income Collected</span>
          <span className="text-lg font-black text-emerald-700 font-mono">GH₵ {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Receipt #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Invoice Ref</th>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5 text-right">Amount (GH₵)</th>
                {isAdmin && <th className="p-3.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-emerald-700">{p.receiptNumber}</td>
                  <td className="p-3.5 text-slate-500">{p.date}</td>
                  <td className="p-3.5 font-mono text-blue-700">{p.invoiceNumber || 'Direct Payment'}</td>
                  <td className="p-3.5 font-bold text-slate-800">{p.customerName}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-black font-mono text-emerald-700 text-sm">
                    GH₵ {p.amount.toFixed(2)}
                  </td>
                  {isAdmin && (
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete payment ${p.receiptNumber}? This cannot be undone.`)) {
                            db.deletePayment(p.id);
                            setPayments(db.getPayments());
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={paymentsPageSize} currentPage={paymentsPage} onPageChange={p => setPaymentsPage(p)} />
        </div>
      </div>
    </div>
  );
};
