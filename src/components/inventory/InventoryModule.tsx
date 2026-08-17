import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, SheetCategory } from '../../types';
import { computeProductStats, formatCurrency, formatInt } from '../../utils/calculations';
import { ProductModal } from './ProductModal';
import { BarcodeModal } from './BarcodeModal';
import { StockMovementsModal } from './StockMovementsModal';
import { BatchEditModal } from './BatchEditModal';
import {
  Search,
  Plus,
  Filter,
  AlertCircle,
  AlertTriangle,
  Barcode,
  History,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Sliders,
  CheckSquare,
  XSquare
} from 'lucide-react';

interface InventoryModuleProps {
  sheet: SheetCategory;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ sheet }) => {
  const { products, searchTerm, setSearchTerm, statusFilter, setStatusFilter, deleteProduct, saveProduct, showToast } = useApp();
  const { currentUser } = useAuth();

  const canEditInventory = currentUser?.role === 'ADMIN' || currentUser?.role === 'INVENTORY_MANAGER';

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [auditItemId, setAuditItemId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter items
  let sheetProducts = (products || []).filter((p) => p.sheet === sheet);

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    sheetProducts = sheetProducts.filter(
      (p) =>
        (p.desc || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q)
    );
  }

  if (statusFilter && statusFilter !== 'all') {
    sheetProducts = sheetProducts.filter((p) => {
      const stats = computeProductStats(p);
      if (statusFilter === 'REORDER') return stats.status !== 'OK';
      return stats.status === statusFilter;
    });
  }

  const totalCount = (products || []).filter((p) => p.sheet === sheet).length;
  const reorderCount = (products || [])
    .filter((p) => p.sheet === sheet)
    .filter((p) => computeProductStats(p).status !== 'OK').length;

  const isAllSelected = sheetProducts.length > 0 && sheetProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sheetProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedProductsList = (products || []).filter((p) => selectedIds.includes(p.id));

  const handleBatchSave = async (updates: { id: number; changes: Partial<Product> }[]) => {
    for (const update of updates) {
      await saveProduct({ id: update.id, ...update.changes });
    }
    showToast(`Batch updated ${updates.length} item(s) successfully!`, 'success');
    setSelectedIds([]);
  };

  const handleEdit = (p: Product) => {
    if (!canEditInventory) {
      showToast(`Access Restricted: Stock modifications require INVENTORY_MANAGER or ADMIN role. (Current Role: ${currentUser?.role})`, 'warning');
      return;
    }
    setSelectedProduct(p);
    setIsProductModalOpen(true);
  };

  const handleAdd = () => {
    if (!canEditInventory) {
      showToast(`Access Restricted: Adding new inventory parts requires INVENTORY_MANAGER or ADMIN role. (Current Role: ${currentUser?.role})`, 'warning');
      return;
    }
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleShowBarcode = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setSelectedProduct(p);
    setIsBarcodeModalOpen(true);
  };

  const handleShowHistory = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setAuditItemId(p.id);
    setIsHistoryModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (!canEditInventory) {
      showToast(`Access Restricted: Deleting inventory parts requires INVENTORY_MANAGER or ADMIN role.`, 'warning');
      return;
    }
    if (confirm(`Remove part "${p.desc}" from inventory?`)) {
      await deleteProduct(p.id);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Automated Reorder Alert Banner */}
      {reorderCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3 text-amber-900 text-xs font-medium">
            <div className="p-2 bg-amber-500 text-white rounded-lg animate-pulse shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-amber-900 text-sm flex items-center gap-1.5">
                <span>Automated Inventory Reorder System Alert</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  {reorderCount} Low Stock Item(s)
                </span>
              </div>
              <p className="text-amber-800 text-xs mt-0.5">
                Stock levels for <span className="font-bold">{reorderCount} item(s)</span> in <span className="font-bold uppercase">{sheet}</span> have dropped below their predefined reorder point threshold (min safety level).
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'REORDER' ? 'all' : 'REORDER')}
            className={`text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'REORDER'
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{statusFilter === 'REORDER' ? 'Show All Items' : `⚡ Highlight Reorder Items (${reorderCount})`}</span>
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search & Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${sheet} by code, fitment, brand...`}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all' || !statusFilter
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('REORDER')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                statusFilter === 'REORDER'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-amber-700 hover:bg-amber-100/50'
              }`}
            >
              <span>Needs Reorder</span>
              {reorderCount > 0 && (
                <span className="bg-amber-800 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {reorderCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('OK')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'OK'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-100/50'
              }`}
            >
              In Stock
            </button>
          </div>
        </div>

        {/* Add Part Button & Batch Edit Actions */}
        <div className="flex items-center space-x-2">
          {!canEditInventory && (
            <span className="bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span>Stock Inquiry Mode ({currentUser?.role || 'STAFF'})</span>
            </span>
          )}

          {selectedIds.length > 0 && canEditInventory && (
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 p-1 rounded-lg">
              <span className="text-xs font-bold text-blue-900 px-2 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                {selectedIds.length} Selected
              </span>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-md shadow-xs transition-colors flex items-center space-x-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Batch Edit ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-blue-100/50"
                title="Deselect All"
              >
                <XSquare className="w-4 h-4" />
              </button>
            </div>
          )}

          {canEditInventory && (
            <button
              onClick={handleAdd}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Part</span>
            </button>
          )}
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    title="Select/Deselect All Visible Items"
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Brand / Category</th>
                <th className="p-3">OEM / Part Code</th>
                <th className="p-3">Description / Fitment</th>
                <th className="p-3">Pos</th>
                <th className="p-3 text-right">Cost (GH₵)</th>
                <th className="p-3 text-right">In Qty</th>
                <th className="p-3 text-right">Sold</th>
                <th className="p-3 text-right">Stock (Current / Min)</th>
                <th className="p-3 text-right">Sell Price (GH₵)</th>
                <th className="p-3 text-right">Profit (GH₵)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sheetProducts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">No inventory items found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try broadening your search term or filter selection.
                    </p>
                  </td>
                </tr>
              ) : (
                sheetProducts.map((p, idx) => {
                  const stats = computeProductStats(p);
                  const isReorder = stats.status !== 'OK';
                  const isOutOfStock = stats.currentStock <= 0;
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={`inv-${p.id}-${idx}`}
                      onClick={() => handleEdit(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 font-semibold border-l-4 border-l-blue-600'
                          : isOutOfStock
                          ? 'bg-red-50/90 hover:bg-red-100 border-l-4 border-l-red-600 font-bold'
                          : isReorder
                          ? 'bg-amber-50/80 hover:bg-amber-100 border-l-4 border-l-amber-500 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => toggleSelectOne(e, p.id)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-slate-700 font-bold max-w-[120px] truncate">
                        {p.category || 'GENERAL'}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-600 text-[11px]">
                        {p.code || '—'}
                      </td>
                      <td className="p-3 font-medium text-slate-900 max-w-xs truncate" title={p.desc}>
                        {p.desc}
                      </td>
                      <td className="p-3 text-slate-500 font-semibold uppercase text-[10px]">
                        {p.position || '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {formatCurrency(p.cost, '')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">{formatInt(p.qty)}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{formatInt(p.sold)}</td>
                      <td className="p-3 text-right font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          {isReorder && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />}
                          <span
                            className={`font-extrabold text-sm ${
                              isOutOfStock ? 'text-red-700' : isReorder ? 'text-amber-700' : 'text-slate-900'
                            }`}
                          >
                            {formatInt(stats.currentStock)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Min: {p.reorder || 3})
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(p.sell, '')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(stats.profit, '')}
                      </td>
                      <td className="p-3 text-center">
                        {isOutOfStock ? (
                          <span className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Out Of Stock
                          </span>
                        ) : isReorder ? (
                          <span className="bg-amber-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                            <AlertCircle className="w-3 h-3" />
                            Below Threshold
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={(e) => handleShowBarcode(e, p)}
                            title="Barcode / Label"
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleShowHistory(e, p)}
                            title="Stock History"
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            title="Edit Part & Reorder Threshold"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, p)}
                            title="Delete Part"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Tag */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-500 flex items-center justify-between">
          <div>
            Showing <span className="font-bold text-slate-900">{sheetProducts.length}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCount}</span> {sheet} parts
          </div>
          <div className="text-[11px] text-slate-400">
            Items highlighted in amber/red have stock levels below their predefined reorder threshold.
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
        sheet={sheet}
      />

      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        product={selectedProduct}
      />

      <StockMovementsModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        itemId={auditItemId}
      />

      <BatchEditModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedProducts={selectedProductsList}
        onBatchSave={handleBatchSave}
      />
    </div>
  );
};

