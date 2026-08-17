import React, { useState } from 'react';
import { FileText, Search, Printer, Plus, CreditCard, Eye, CheckCircle } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface InvoicesViewProps {
  onOpenPrintInvoice: (invoiceId: string) => void;
  onOpenQuickAdd: (type: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ onOpenPrintInvoice, onOpenQuickAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const invoices = db.getInvoices();
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser.role === 'Admin';

  const filtered = invoices.filter(inv => {
    const q = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.vehicleRegistration.toLowerCase().includes(q)
    );
  });

  // Pagination for invoices
  const [invoicesPage, setInvoicesPage] = useState(1);
  const invoicesPageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((invoicesPage - 1) * invoicesPageSize, invoicesPage * invoicesPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Invoices & Billing Statements</h1>
            <p className="text-xs text-slate-500">
              Customer invoices with Ghana VAT/NHIL/GETFund breakdown (20%), payment tracking, and printable billing
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('payment')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Invoice Payment</span>
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search invoice number (INV-...), Customer, Registration..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Vehicle Reg</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">VAT/Levies (20%)</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Paid Amount</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">{inv.date}</td>
                  <td className="p-3.5 font-bold text-slate-800">{inv.customerName}</td>
                  <td className="p-3.5 font-mono font-bold text-amber-900">{inv.vehicleRegistration}</td>
                  <td className="p-3.5 text-right font-mono text-slate-600">GH₵ {inv.subtotal.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-mono text-slate-600">GH₵ {inv.taxAmount.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-bold font-mono text-slate-900">GH₵ {inv.grandTotal.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-bold font-mono text-emerald-700">GH₵ {inv.paidAmount.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-bold font-mono text-amber-800">GH₵ {inv.balance.toFixed(2)}</td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onOpenPrintInvoice(inv.id)}
                        className="px-3 py-1 bg-slate-900 text-white font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) {
                              db.deleteInvoice(inv.id);
                              window.location.reload();
                            }
                          }}
                          className="px-3 py-1 bg-rose-600 text-white font-bold text-[11px] rounded-lg transition-colors hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={invoicesPageSize} currentPage={invoicesPage} onPageChange={p => setInvoicesPage(p)} />
        </div>
      </div>
    </div>
  );
};
