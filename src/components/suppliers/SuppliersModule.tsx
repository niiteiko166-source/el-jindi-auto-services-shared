import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { Truck, Plus, Phone, Mail, MapPin, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

export const SuppliersModule: React.FC = () => {
  const { suppliers, saveSupplier, deleteSupplier } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    outstandingBalance: 0
  });

  const handleEdit = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      outstandingBalance: 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    await saveSupplier(formData);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete supplier?')) {
      await deleteSupplier(id);
    }
  };

  const totalOutstandingAP = (suppliers || []).reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Suppliers & Accounts Payable (AP) Directory
          </h2>
          <p className="text-xs text-slate-500">
            Manage spare parts importers, OEMs, distributors and monitor credit balances
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            Total AP Debt Balance:{' '}
            <span className="font-mono font-bold text-red-600">{formatCurrency(totalOutstandingAP)}</span>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Grid of Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(suppliers || []).map((s, idx) => (
          <div
            key={`sup-${s.id}-${idx}`}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-blue-300 transition-all text-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{s.name}</h3>
                <p className="text-[11px] font-semibold text-slate-500">{s.contactPerson}</p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(s)}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1 text-slate-600">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{s.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.email || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.address || 'N/A'}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-600 uppercase text-[10px]">AP Credit Balance:</span>
              <span className={`font-mono font-extrabold ${s.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(s.outstandingBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Manage vendor profile and starting AP credit balance"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Company / Vendor Name</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. TOYOTA JAPAN / GHANA LTD"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Contact Person</label>
            <input
              type="text"
              value={formData.contactPerson || ''}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Mr. Kwame Mensah"
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Address / Warehouse</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Outstanding AP Balance (GH₵)</label>
            <input
              type="number"
              step="0.01"
              value={formData.outstandingBalance || 0}
              onChange={(e) => setFormData({ ...formData, outstandingBalance: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-red-600"
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
