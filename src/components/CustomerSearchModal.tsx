import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { Customer } from '../types';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onAddNewCustomer?: () => void;
}

export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
  onAddNewCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return customers;

    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  }, [searchTerm, customers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-900">Select Customer</h2>
            <p className="text-xs text-slate-500 mt-0.5">Search by name, phone, email, or company</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <p className="text-[10px] text-slate-500 mt-2">
              Found {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Customer List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No customers found</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm ? 'Try a different search term' : 'No customers available'}
              </p>
              {onAddNewCustomer && (
                <button
                  onClick={onAddNewCustomer}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add New Customer
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => {
                    onSelectCustomer(customer);
                    onClose();
                  }}
                  className="w-full p-4 hover:bg-blue-50 transition-colors text-left border-0 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">
                        {customer.name}
                        {customer.company && (
                          <span className="text-slate-500 font-normal"> — {customer.company}</span>
                        )}
                      </p>

                      <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-600">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {onAddNewCustomer && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                onClose();
                onAddNewCustomer();
              }}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
