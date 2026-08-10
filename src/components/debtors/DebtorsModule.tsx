import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';
import { Users, DollarSign, Calendar, CheckCircle, AlertCircle, Phone, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';

export const DebtorsModule: React.FC = () => {
  const { sales, recordCustomerPayment, debtors } = useApp();

  const creditSales = (sales || []).filter((s) => s.balanceDue > 0);

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState('');

  const handleOpenPayment = (sale: any) => {
    setSelectedSale(sale);
    setPaymentAmount(sale.balanceDue.toString());
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    await recordCustomerPayment(
      selectedSale.id,
      amt,
      selectedSale.customerName,
      paymentNote || 'Customer AR Debt Clearance'
    );

    setIsPaymentModalOpen(false);
    setSelectedSale(null);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const totalOutstandingAR = creditSales.reduce((sum, s) => sum + s.balanceDue, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Debtors & Accounts Receivable (AR) Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Track unpaid credit sales invoices, record customer payments, and view debt aging
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-right">
          <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
            Total Outstanding Receivables
          </div>
          <div className="font-mono font-extrabold text-base text-red-600">
            {formatCurrency(totalOutstandingAR)}
          </div>
        </div>
      </div>

      {/* Credit Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Invoice Total</th>
                <th className="p-3 text-right">Paid To Date</th>
                <th className="p-3 text-right">Balance Due (GH₵)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {creditSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No outstanding debtor balances recorded! All credit sales have been settled.
                  </td>
                </tr>
              ) : (
                creditSales.map((s, idx) => (
                  <tr key={`debtor-${s.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600">#{s.invoiceNo}</td>
                    <td className="p-3 font-mono text-slate-600">{s.date}</td>
                    <td className="p-3 font-bold text-slate-900">{s.customerName}</td>
                    <td className="p-3 font-mono text-slate-600">{s.customerPhone || 'N/A'}</td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {formatCurrency(s.grandTotal)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                      {formatCurrency(s.amountPaid)}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-red-600">
                      {formatCurrency(s.balanceDue)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenPayment(s)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Entry Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Receive Customer Payment: INV #${selectedSale?.invoiceNo}`}
        subtitle={`Customer: ${selectedSale?.customerName} · Balance Due: ${formatCurrency(
          selectedSale?.balanceDue || 0
        )}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Payment Amount Received (GH₵)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full p-2.5 border-2 border-emerald-500 rounded-lg font-mono font-extrabold text-lg text-emerald-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Payment Reference / Notes
            </label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Cash payment / Mobile Money Ref"
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs"
            >
              Post Payment & Clear Debt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
