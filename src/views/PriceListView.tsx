import React, { useState, useEffect } from 'react';
import { Tag, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';
import { PriceListItem } from '../types';

interface PriceListViewProps {
  onOpenQuickAdd: (type: string, item?: PriceListItem) => void;
  refreshKey?: number;
}

export const PriceListView: React.FC<PriceListViewProps> = ({ onOpenQuickAdd, refreshKey = 0 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceList, setPriceList] = useState(() => db.getPriceList());
  const currentUser = db.getCurrentUser();

  useEffect(() => {
    setPriceList(db.getPriceList());
  }, [refreshKey]);
  const isAdmin = currentUser?.role === 'Admin';

  const handleDelete = (id: string) => {
    const item = priceList.find(p => p.id === id);
    if (item && window.confirm(`Delete price for ${item.serviceOrPart}? This cannot be undone.`)) {
      db.deletePriceListItem(id);
      setPriceList(db.getPriceList());
    }
  };

  const handleRefresh = () => {
    setPriceList(db.getPriceList());
  };

  const filtered = priceList.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const searchableText = [
      p.serviceOrPart,
      p.description,
      p.make,
      p.model,
      p.category
    ].join(' ').toLowerCase();

    return searchableText.includes(q);
  });

  // Pagination for price list
  const [pricePage, setPricePage] = useState(1);
  const pricePageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((pricePage - 1) * pricePageSize, pricePage * pricePageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master Price List Catalog</h1>
              <p className="text-xs text-slate-500">
                Standard vehicle service fees, labour rates, and maintenance pricing by Make & Model
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenQuickAdd('price-list')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-md flex items-center gap-2 flex-shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Price Item
          </button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search price list by service name, Make (Toyota/Honda/Mercedes), Model..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Make</th>
                <th className="p-3.5">Model</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Service / Description</th>
                <th className="p-3.5 text-center">Estimated Hours</th>
                <th className="p-3.5 text-right">Standard Fee (GH₵)</th>
                {isAdmin && <th className="p-3.5 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-teal-800">{item.make}</td>
                  <td className="p-3.5 font-semibold text-slate-700">{item.model}</td>
                  <td className="p-3.5 text-slate-500">{item.category}</td>
                  <td className="p-3.5 font-bold text-slate-900">{item.serviceOrPart}</td>
                  <td className="p-3.5 text-center font-mono">{item.estimatedHours || 1} hrs</td>
                  <td className="p-3.5 text-right font-black font-mono text-slate-900">
                    GH₵ {item.price.toFixed(2)}
                  </td>
                  {isAdmin && (
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onOpenQuickAdd('price-list', item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={pricePageSize} currentPage={pricePage} onPageChange={p => setPricePage(p)} compact />
        </div>
      </div>
    </div>
  );
};
