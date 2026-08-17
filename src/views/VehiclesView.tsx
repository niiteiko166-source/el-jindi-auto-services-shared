import React, { useState } from 'react';
import { Car, Search, Plus, Eye, Wrench, ShieldCheck, User, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface VehiclesViewProps {
  onOpenQuickAdd: (type: string) => void;
  onViewJobDetails: (jobId: string) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ onOpenQuickAdd, onViewJobDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const vehicles = db.getVehicles();
  const customers = db.getCustomers();
  const jobs = db.getJobCards();

  const refresh = () => setRefreshKey(prev => prev + 1);

  const filteredVehicles = vehicles.filter(v => {
    const q = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === v.customerId);
    return (
      v.registrationNumber.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (cust && cust.name.toLowerCase().includes(q))
    );
  });

  // Pagination for vehicles table
  const [vehiclesPage, setVehiclesPage] = useState(1);
  const vehiclesPageSize = DEFAULT_PAGE_SIZE;
  const totalFilteredVehicles = filteredVehicles.length;
  const pagedVehicles = filteredVehicles.slice((vehiclesPage - 1) * vehiclesPageSize, vehiclesPage * vehiclesPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Vehicle Register & History</h1>
            <p className="text-xs text-slate-500">
              Complete vehicle registry, registration numbers, owners, mileage logs, and repair history
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('vehicle')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register Vehicle</span>
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by registration (GR 1234), Make, Model, Owner name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Registration</th>
                <th className="p-3.5">Make & Model</th>
                <th className="p-3.5">Owner / Customer</th>
                <th className="p-3.5">Year</th>
                <th className="p-3.5">Mileage (km)</th>
                <th className="p-3.5 text-center">Visits</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedVehicles.map(v => {
                const owner = customers.find(c => c.id === v.customerId);
                const vehJobs = jobs.filter(j => j.vehicleId === v.id);
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-amber-900">
                      <span className="bg-amber-100 px-2.5 py-1 rounded text-xs">
                        {v.registrationNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{v.make} {v.model}</td>
                    <td className="p-3.5 text-slate-700 font-semibold">{owner?.name || 'Unknown'}</td>
                    <td className="p-3.5 font-mono">{v.year}</td>
                    <td className="p-3.5 font-mono font-semibold">{v.mileage.toLocaleString()} km</td>
                    <td className="p-3.5 text-center font-bold font-mono text-blue-600">{vehJobs.length}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={() => {
                          if (vehJobs.length > 0) onViewJobDetails(vehJobs[0].id);
                          else alert('No job history for this vehicle yet.');
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> History
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm(`Delete vehicle ${v.registrationNumber}? This cannot be undone.`)) return;
                          db.deleteVehicle(v.id);
                          refresh();
                        }}
                        className="px-3 py-1 bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-600 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination
            totalItems={totalFilteredVehicles}
            pageSize={vehiclesPageSize}
            currentPage={vehiclesPage}
            onPageChange={(p) => setVehiclesPage(p)}
          />
        </div>
      </div>
    </div>
  );
};
