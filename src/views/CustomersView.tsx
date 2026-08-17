import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, Car, Eye, Edit, Trash2 } from 'lucide-react';
import { Customer } from '../types';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface CustomersViewProps {
  onOpenQuickAdd: (type: string, customer?: Customer | null) => void;
  onEditVehicle: (vehicleId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onOpenQuickAdd, onEditVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const customers = db.getCustomers();
  const vehicles = db.getVehicles();
  const jobs = db.getJobCards();

  const refresh = () => setRefreshKey(prev => prev + 1);

  const normalizeSearchValue = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

  const filteredCustomers = customers.filter(c => {
    const q = normalizeSearchValue(searchTerm.trim());
    if (!q) return true;

    return (
      normalizeSearchValue(c.name).includes(q) ||
      normalizeSearchValue(c.phone).includes(q) ||
      (c.email && normalizeSearchValue(c.email).includes(q)) ||
      (c.company && normalizeSearchValue(c.company).includes(q))
    );
  });

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const activeVehicles = vehicles.filter(v => v.customerId === selectedCustomerId);
  const activeJobs = jobs.filter(j => j.customerId === selectedCustomerId);

  // Pagination for left customer list
  const [customersPage, setCustomersPage] = useState(1);
  const customersPageSize = DEFAULT_PAGE_SIZE;
  const totalFilteredCustomers = filteredCustomers.length;
  const pagedCustomers = filteredCustomers.slice((customersPage - 1) * customersPageSize, customersPage * customersPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Relationship Management</h1>
            <p className="text-xs text-slate-500">
              Customer profiles, vehicle histories, total billing, and contact records
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('customer')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register New Customer</span>
        </button>
      </div>

      {/* Main Grid: Directory Left, Profile & History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Customer List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search customers by name, phone..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {pagedCustomers.map(c => {
              const isSelected = c.id === selectedCustomerId;
              const custVehs = vehicles.filter(v => v.customerId === c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">{c.name}</h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {custVehs.length} Vehicles
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="p-3">
            <Pagination
              totalItems={totalFilteredCustomers}
              pageSize={customersPageSize}
              currentPage={customersPage}
              onPageChange={(p) => setCustomersPage(p)}
            />
          </div>
        </div>

        {/* Right Customer Details & History */}
        <div className="lg:col-span-2 space-y-6">
          {activeCustomer ? (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{activeCustomer.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Customer ID: <span className="font-mono">{activeCustomer.id}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenQuickAdd('customer', activeCustomer)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Customer
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Delete customer ${activeCustomer.name}? This cannot be undone.`)) return;
                      db.deleteCustomer(activeCustomer.id);
                      refresh();
                      setSelectedCustomerId(null);
                    }}
                    className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Customer
                  </button>
                  <button
                    onClick={() => onOpenQuickAdd('vehicle')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Car className="w-3.5 h-3.5" /> + Register Vehicle
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                  <p className="font-bold text-slate-800 mt-0.5">{activeCustomer.phone}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                  <p className="font-bold text-slate-800 mt-0.5">{activeCustomer.email || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Address</span>
                  <p className="font-bold text-slate-800 mt-0.5">{activeCustomer.address || 'Accra'}</p>
                </div>
              </div>

              {/* Customer Vehicles */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Registered Vehicles ({activeVehicles.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeVehicles.map(v => (
                    <div key={v.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-xs">
                          {v.registrationNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-1">{v.make} {v.model} ({v.year})</h4>
                        <p className="text-[10px] text-slate-500">Mileage: {v.mileage.toLocaleString()} km</p>
                      </div>
                      <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onEditVehicle(v.id)}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[10px] rounded-full transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm(`Delete vehicle ${v.registrationNumber}? This cannot be undone.`)) return;
                        db.deleteVehicle(v.id);
                        refresh();
                      }}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white font-bold text-[10px] rounded-full transition-colors"
                    >
                      <Trash2 className="w-3 h-3 inline-block mr-1" /> Delete
                    </button>
                  </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Service History */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Workshop Service History ({activeJobs.length})
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                      <tr>
                        <th className="p-3">Job No.</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vehicle</th>
                        <th className="p-3">Complaint</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeJobs.map(j => (
                        <tr key={j.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">{j.jobNumber}</td>
                          <td className="p-3 text-slate-500">{j.createdDate.split(' ')[0]}</td>
                          <td className="p-3 font-semibold text-slate-800">{j.registrationNumber}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">{j.complaint}</td>
                          <td className="p-3 text-right font-bold font-mono">GH₵ {j.grandTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
              Select a customer from the left list to view their complete profile, vehicles, and workshop history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
