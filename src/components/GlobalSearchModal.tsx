import React, { useState, useEffect } from 'react';
import { Search, X, Car, User, Wrench, Receipt, Package, ArrowRight } from 'lucide-react';
import { Customer, Vehicle, JobCard, Invoice, InventoryPart } from '../types';
import { db } from '../services/db';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string, entityId?: string) => void;
  onSelectJob?: (jobId: string) => void;
  onSelectCustomer?: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectJob,
  onSelectCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parts, setParts] = useState<InventoryPart[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCustomers(db.getCustomers() || []);
      setVehicles(db.getVehicles() || []);
      setJobs(db.getJobCards() || []);
      setInvoices(db.getInvoices() || []);
      setParts(db.getInventory() || []);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (tab: string, entityId?: string) => {
    if (tab === 'job-details' && entityId && onSelectJob) {
      onSelectJob(entityId);
    } else if (tab === 'customers' && onSelectCustomer) {
      onSelectCustomer();
    } else if (onNavigateTab) {
      onNavigateTab(tab, entityId);
    }
    onClose();
  };

  const normalizeSearchValue = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const q = normalizeSearchValue(query.trim());

  const filteredCustomers = q
    ? (customers || []).filter(c =>
        c &&
        (normalizeSearchValue(c.name).includes(q) || normalizeSearchValue(c.phone).includes(q))
      )
    : [];

  const filteredVehicles = q
    ? (vehicles || []).filter(
        v =>
          v &&
          (v.registrationNumber.toLowerCase().includes(q) ||
            v.make.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            (v.vin && v.vin.toLowerCase().includes(q)))
      )
    : [];

  const filteredJobs = q
    ? (jobs || []).filter(
        j =>
          j &&
          (j.jobNumber.toLowerCase().includes(q) ||
            j.registrationNumber?.toLowerCase().includes(q) ||
            j.customerName?.toLowerCase().includes(q) ||
            j.complaint.toLowerCase().includes(q))
      )
    : [];

  const filteredInvoices = q
    ? (invoices || []).filter(
        i =>
          i &&
          (i.invoiceNumber.toLowerCase().includes(q) ||
            i.vehicleRegistration?.toLowerCase().includes(q) ||
            i.customerName?.toLowerCase().includes(q))
      )
    : [];

  const filteredParts = q
    ? (parts || []).filter(
        p =>
          p &&
          (p.partName.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q))
      )
    : [];

  const totalResults =
    filteredCustomers.length +
    filteredVehicles.length +
    filteredJobs.length +
    filteredInvoices.length +
    filteredParts.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type registration (e.g., GR 1234), job #, customer name, phone, part #..."
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg"
          >
            Esc
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Start typing to search across Customers, Vehicles, Workshop Job Cards, Invoices, and Spare Parts.
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching record found for "<span className="font-semibold text-slate-800">{query}</span>"
            </div>
          )}

          {/* Job Cards */}
          {filteredJobs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Job Cards ({filteredJobs.length})
              </h4>
              <div className="space-y-1.5">
                {filteredJobs.map(j => (
                  <div
                    key={j.id}
                    onClick={() => handleNavigate('job-details', j.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 bg-white hover:bg-blue-50/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 font-mono">{j.jobNumber}</span>
                        <span className="text-xs font-bold text-slate-800">{j.registrationNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                          {j.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{j.customerName} - {j.complaint}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicles */}
          {filteredVehicles.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-indigo-600" />
                Vehicles ({filteredVehicles.length})
              </h4>
              <div className="space-y-1.5">
                {filteredVehicles.map(v => (
                  <div
                    key={v.id}
                    onClick={() => handleNavigate('vehicles', v.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 bg-white hover:bg-indigo-50/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          {v.registrationNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{v.make} {v.model} ({v.year})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">VIN: {v.vin || 'N/A'} | Mileage: {v.mileage.toLocaleString()} km</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {filteredCustomers.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Customers ({filteredCustomers.length})
              </h4>
              <div className="space-y-1.5">
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleNavigate('customers', c.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 bg-white hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800">{c.name}</span>
                      <p className="text-xs text-slate-500">{c.phone} | {c.address || 'No address'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                Invoices ({filteredInvoices.length})
              </h4>
              <div className="space-y-1.5">
                {filteredInvoices.map(i => (
                  <div
                    key={i.id}
                    onClick={() => handleNavigate('invoices', i.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-purple-200 bg-white hover:bg-purple-50/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-700 font-mono">{i.invoiceNumber}</span>
                        <span className="text-xs font-bold text-slate-800">GH₵ {i.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{i.customerName} - {i.vehicleRegistration}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts */}
          {filteredParts.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Spare Parts ({filteredParts.length})
              </h4>
              <div className="space-y-1.5">
                {filteredParts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleNavigate('inventory', p.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-amber-200 bg-white hover:bg-amber-50/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{p.partName}</span>
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.partNumber}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Qty: {p.quantity} | Sell: GH₵ {p.sellingPrice}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
