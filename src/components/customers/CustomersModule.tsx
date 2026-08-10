import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { Users, Plus, Phone, Mail, MapPin, Edit2, Trash2, Tag } from 'lucide-react';
import { Modal } from '../common/Modal';

export const CustomersModule: React.FC = () => {
  const { customers, sales, saveCustomer, deleteCustomer } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    priceTier: 'retail',
    creditLimit: 5000
  });

  const handleEdit = (c: Customer) => {
    setSelectedCustomer(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      priceTier: 'retail',
      creditLimit: 5000
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const { outstandingBalance: _legacyBalance, ...customerDetails } = formData;
    await saveCustomer(customerDetails);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete customer?')) {
      await deleteCustomer(id);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Customer & Client Relationship Directory
          </h2>
          <p className="text-xs text-slate-500">
            Configure wholesale buyers, workshops, mechanics, retail clients and custom pricing tiers
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(customers || []).map((c, idx) => {
          const invoiceBalance = (sales || [])
            .filter((sale) =>
              sale.customerName?.trim().toLowerCase() === c.name?.trim().toLowerCase() &&
              (Number(sale.balanceDue) || 0) > 0
            )
            .reduce((sum, sale) => sum + (Number(sale.balanceDue) || 0), 0);

          return (
          <div
            key={`cust-${c.id}-${idx}`}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-blue-300 transition-all text-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{c.name}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider mt-1">
                  {c.priceTier} Tier
                </span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(c)}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1 text-slate-600">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{c.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.email || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.address || 'N/A'}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-600 uppercase text-[10px]">Invoice AR Balance:</span>
              <span className={`font-mono font-extrabold ${invoiceBalance > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {formatCurrency(invoiceBalance)}
              </span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Set default pricing tier, credit limit, and contact details"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Customer / Workshop Name</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Accra Motors Auto Repair"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
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
              <label className="block font-bold text-slate-700 uppercase mb-1">Price Tier</label>
              <select
                value={formData.priceTier}
                onChange={(e) => setFormData({ ...formData, priceTier: e.target.value as any })}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
              >
                <option value="retail">Retail Price</option>
                <option value="wholesale">Wholesale Price</option>
                <option value="dealer">Dealer / VIP Price</option>
              </select>
            </div>
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

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Location / Address</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Credit Limit (GH₵)</label>
              <input
                type="number"
                value={formData.creditLimit || 0}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
