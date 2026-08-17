import React, { useState } from 'react';
import { Truck, Search, Plus, Phone } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

export const SuppliersView: React.FC = () => {
  const suppliers = db.getSuppliers();
  const [supPage, setSupPage] = useState(1);
  const supPageSize = DEFAULT_PAGE_SIZE;
  const totalSuppliers = suppliers.length;
  const pagedSuppliers = suppliers.slice((supPage - 1) * supPageSize, supPage * supPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Spare Parts Suppliers & Vendors</h1>
            <p className="text-xs text-slate-500">
              Vendor directory, parts categories supplied, contact information, and outstanding payables
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedSuppliers.map(sup => (
            <div key={sup.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{sup.companyName}</h3>
                <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2.5 py-0.5 rounded-full">
                  {sup.partsSupplied || 'General Spares'}
                </span>
              </div>
              <p className="text-xs text-slate-600">Contact Person: <strong className="text-slate-800">{sup.contactPerson}</strong></p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {sup.phone}
              </p>
              <p className="text-xs text-slate-500">{sup.address}</p>
            </div>
          ))}
        </div>
        <div className="p-3">
          <Pagination totalItems={totalSuppliers} pageSize={supPageSize} currentPage={supPage} onPageChange={p => setSupPage(p)} compact />
        </div>
      </div>
    </div>
  );
};
