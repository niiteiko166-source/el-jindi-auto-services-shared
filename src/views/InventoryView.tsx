import React, { useState } from 'react';
import { Package, Search, Plus, AlertTriangle, ArrowUpRight, TrendingDown } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface InventoryViewProps {
  onOpenQuickAdd: (type: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenQuickAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inventory = db.getInventory();

  const filtered = inventory.filter(i => {
    const q = searchTerm.toLowerCase();
    return (
      i.partName.toLowerCase().includes(q) ||
      i.partNumber.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  // Pagination for inventory list
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryPageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((inventoryPage - 1) * inventoryPageSize, inventoryPage * inventoryPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Spare Parts & Inventory Management</h1>
            <p className="text-xs text-slate-500">
              Workshop spare parts stock control, low-level stock alerts, unit prices, and bin locations
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('part')}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Part</span>
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search spare parts by name, Part #, Category..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Part Name</th>
                <th className="p-3.5">Part Number</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-center">Stock Quantity</th>
                <th className="p-3.5 text-center">Min Stock</th>
                <th className="p-3.5 text-right">Cost Price</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{item.partName}</td>
                  <td className="p-3.5 font-mono text-slate-500">{item.partNumber}</td>
                  <td className="p-3.5 text-slate-600 font-semibold">{item.category}</td>
                  <td className="p-3.5 text-center font-bold font-mono text-sm">{item.quantity}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">{item.minStock}</td>
                  <td className="p-3.5 text-right font-mono text-slate-600">
                    GH₵ {item.purchasePrice ? item.purchasePrice.toFixed(2) : '—'}
                  </td>
                  <td className="p-3.5 text-right font-bold font-mono text-slate-900">
                    GH₵ {item.sellingPrice.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'In Stock'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'Low Stock'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={inventoryPageSize} currentPage={inventoryPage} onPageChange={p => setInventoryPage(p)} />
        </div>
      </div>
    </div>
  );
};
