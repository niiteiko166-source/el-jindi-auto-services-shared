import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';
import { DollarSign, Plus, ArrowUpRight, ArrowDownLeft, FileText, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';

export const AccountingModule: React.FC = () => {
  const { cashTransactions, recordExpense } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Rent & Utilities',
    amount: '',
    description: '',
    referenceNo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    await recordExpense(
      amt,
      formData.category,
      formData.description || 'General Business Expense',
      formData.referenceNo
    );

    setIsModalOpen(false);
    setFormData({
      category: 'Rent & Utilities',
      amount: '',
      description: '',
      referenceNo: ''
    });
  };

  const totalIncome = (cashTransactions || [])
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = (cashTransactions || [])
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Cash Inflows (Sales & Collections)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-xl text-emerald-600">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Operating Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="font-mono font-extrabold text-xl text-red-600">
            {formatCurrency(totalExpense)}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Net Business Cash Flow
          </div>
          <div
            className={`font-mono font-extrabold text-xl ${
              netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Main Ledger Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Financial Cashbook & Expense Vouchers
        </h2>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense Voucher</span>
        </button>
      </div>

      {/* Cashbook Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Ref No</th>
                <th className="p-3 text-right">Amount (GH₵)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(cashTransactions || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No financial cash transactions recorded yet.
                  </td>
                </tr>
              ) : (
                (cashTransactions || []).map((t, idx) => {
                  const isIncome = t.type === 'INCOME';
                  return (
                    <tr key={`cash-${t.id || idx}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-600">
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{t.category}</td>
                      <td className="p-3 font-medium text-slate-900">{t.description}</td>
                      <td className="p-3 font-mono text-slate-600">{t.referenceNo || '—'}</td>
                      <td
                        className={`p-3 text-right font-mono font-extrabold ${
                          isIncome ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isIncome ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operational Expense Voucher"
        subtitle="Log shop expenses, rent, utilities, salaries, customs duties, or transport"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Expense Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <option value="Rent & Utilities">Shop Rent & Utilities (Electricity/Water)</option>
              <option value="Staff Salaries">Staff Salaries & Allowances</option>
              <option value="Customs & Port Clearing">Customs Duty & Shipping Clearance</option>
              <option value="Transport & Logistics">Freight & Local Delivery</option>
              <option value="Maintenance & Supplies">Store Maintenance & Stationery</option>
              <option value="Miscellaneous">Other Operating Expenses</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Expense Amount (GH₵)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full p-2 border-2 border-red-400 rounded-lg font-mono font-bold text-lg text-red-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Description / Particulars</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. ECG Power Recharge for Store"
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Payment Receipt / Voucher No</label>
            <input
              type="text"
              value={formData.referenceNo}
              onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
              placeholder="VOUCHER-001"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-xs"
            >
              Post Expense Voucher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
