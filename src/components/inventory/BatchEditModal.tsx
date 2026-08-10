import React, { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import {
  X,
  CheckSquare,
  DollarSign,
  Package,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Layers
} from 'lucide-react';

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onBatchSave: (updates: { id: number; changes: Partial<Product> }[]) => Promise<void>;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  onBatchSave
}) => {
  // Enabled field toggles
  const [updateCost, setUpdateCost] = useState(false);
  const [updateSell, setUpdateSell] = useState(false);
  const [updateWholesale, setUpdateWholesale] = useState(false);
  const [updateDealer, setUpdateDealer] = useState(false);
  const [updateReorder, setUpdateReorder] = useState(false);
  const [updateStockQty, setUpdateStockQty] = useState(false);
  const [updateCategory, setUpdateCategory] = useState(false);

  // Field values
  const [costMode, setCostMode] = useState<'fixed' | 'percent'>('fixed');
  const [costValue, setCostValue] = useState<string>('');

  const [sellMode, setSellMode] = useState<'fixed' | 'percent' | 'markup'>('fixed');
  const [sellValue, setSellValue] = useState<string>('');

  const [wholesaleMode, setWholesaleMode] = useState<'fixed' | 'percent'>('fixed');
  const [wholesaleValue, setWholesaleValue] = useState<string>('');

  const [dealerMode, setDealerMode] = useState<'fixed' | 'percent'>('fixed');
  const [dealerValue, setDealerValue] = useState<string>('');

  const [reorderValue, setReorderValue] = useState<string>('');

  const [stockQtyMode, setStockQtyMode] = useState<'fixed' | 'add' | 'subtract'>('add');
  const [stockQtyValue, setStockQtyValue] = useState<string>('');

  const [categoryValue, setCategoryValue] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleApplyBatch = async () => {
    if (selectedProducts.length === 0) return;

    const updates: { id: number; changes: Partial<Product> }[] = [];

    selectedProducts.forEach((p) => {
      const changes: Partial<Product> = {};

      // 1. Cost
      if (updateCost && costValue !== '') {
        const val = parseFloat(costValue);
        if (!isNaN(val)) {
          if (costMode === 'fixed') {
            changes.cost = Math.max(0, val);
          } else if (costMode === 'percent') {
            changes.cost = Math.max(0, p.cost * (1 + val / 100));
          }
        }
      }

      const effectiveCost = changes.cost !== undefined ? changes.cost : p.cost;

      // 2. Retail Sell Price
      if (updateSell && sellValue !== '') {
        const val = parseFloat(sellValue);
        if (!isNaN(val)) {
          if (sellMode === 'fixed') {
            changes.sell = Math.max(0, val);
          } else if (sellMode === 'percent') {
            changes.sell = Math.max(0, p.sell * (1 + val / 100));
          } else if (sellMode === 'markup') {
            // markup percentage over cost
            changes.sell = Math.max(0, effectiveCost * (1 + val / 100));
          }
        }
      }

      // 3. Wholesale Price
      if (updateWholesale && wholesaleValue !== '') {
        const val = parseFloat(wholesaleValue);
        if (!isNaN(val)) {
          const current = p.wholesalePrice || p.sell;
          if (wholesaleMode === 'fixed') {
            changes.wholesalePrice = Math.max(0, val);
          } else if (wholesaleMode === 'percent') {
            changes.wholesalePrice = Math.max(0, current * (1 + val / 100));
          }
        }
      }

      // 4. Dealer Price
      if (updateDealer && dealerValue !== '') {
        const val = parseFloat(dealerValue);
        if (!isNaN(val)) {
          const current = p.dealerPrice || p.sell;
          if (dealerMode === 'fixed') {
            changes.dealerPrice = Math.max(0, val);
          } else if (dealerMode === 'percent') {
            changes.dealerPrice = Math.max(0, current * (1 + val / 100));
          }
        }
      }

      // 5. Reorder Point Threshold
      if (updateReorder && reorderValue !== '') {
        const val = parseInt(reorderValue, 10);
        if (!isNaN(val)) {
          changes.reorder = Math.max(0, val);
        }
      }

      // 6. Stock Quantity Adjustments
      if (updateStockQty && stockQtyValue !== '') {
        const val = parseInt(stockQtyValue, 10);
        if (!isNaN(val)) {
          if (stockQtyMode === 'fixed') {
            changes.qty = Math.max(0, val);
          } else if (stockQtyMode === 'add') {
            changes.qty = Math.max(0, p.qty + val);
          } else if (stockQtyMode === 'subtract') {
            changes.qty = Math.max(0, p.qty - val);
          }
        }
      }

      // 7. Category / Brand
      if (updateCategory && categoryValue.trim() !== '') {
        changes.category = categoryValue.trim().toUpperCase();
      }

      if (Object.keys(changes).length > 0) {
        updates.push({ id: p.id, changes });
      }
    });

    if (updates.length === 0) {
      alert('Please check and specify at least one valid field update.');
      return;
    }

    try {
      setIsSaving(true);
      await onBatchSave(updates);
      onClose();
    } catch (e) {
      console.error('Batch edit error:', e);
      alert('An error occurred while saving batch updates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-xl border border-blue-400/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black uppercase tracking-tight">Batch Multi-Item Edit</h2>
                <span className="bg-blue-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                  {selectedProducts.length} Items Selected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bulk update cost prices, selling tiers, safety reorder thresholds, or inventory stock levels at once.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Scroll Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Selected Items Quick Badge Strip */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-blue-900 font-bold">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Target SKUs: {selectedProducts.map((p) => p.code || p.desc).slice(0, 4).join(', ')} {selectedProducts.length > 4 ? `and ${selectedProducts.length - 4} more...` : ''}</span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Only checked fields will be modified across all selected SKUs.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Cost Price */}
            <div className={`p-4 rounded-xl border transition-all ${updateCost ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={updateCost}
                    onChange={(e) => setUpdateCost(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                  />
                  <span>Cost Price (GH₵)</span>
                </label>
                {updateCost && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setCostMode('fixed')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${costMode === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Fixed Value
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostMode('percent')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${costMode === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      % Change
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                disabled={!updateCost}
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
                placeholder={costMode === 'fixed' ? 'New Cost GH₵ (e.g. 150)' : 'Percentage adjustment (e.g. 10 for +10%)'}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>

            {/* 2. Retail Selling Price */}
            <div className={`p-4 rounded-xl border transition-all ${updateSell ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={updateSell}
                    onChange={(e) => setUpdateSell(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                  />
                  <span>Retail Sell Price (GH₵)</span>
                </label>
                {updateSell && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setSellMode('fixed')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${sellMode === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellMode('percent')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${sellMode === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      % Adj
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellMode('markup')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${sellMode === 'markup' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      % Markup
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                disabled={!updateSell}
                value={sellValue}
                onChange={(e) => setSellValue(e.target.value)}
                placeholder={
                  sellMode === 'fixed'
                    ? 'New Retail Price GH₵ (e.g. 250)'
                    : sellMode === 'percent'
                    ? 'Price % adjustment (e.g. 5 for +5%)'
                    : 'Markup % over Cost (e.g. 40 for 40% margin)'
                }
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>

            {/* 3. Wholesale Price */}
            <div className={`p-4 rounded-xl border transition-all ${updateWholesale ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={updateWholesale}
                    onChange={(e) => setUpdateWholesale(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                  />
                  <span>Wholesale Price Tier (GH₵)</span>
                </label>
                {updateWholesale && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setWholesaleMode('fixed')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${wholesaleMode === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setWholesaleMode('percent')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${wholesaleMode === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      % Change
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                disabled={!updateWholesale}
                value={wholesaleValue}
                onChange={(e) => setWholesaleValue(e.target.value)}
                placeholder="Wholesale price value or % adjustment"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>

            {/* 4. Dealer Price */}
            <div className={`p-4 rounded-xl border transition-all ${updateDealer ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={updateDealer}
                    onChange={(e) => setUpdateDealer(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                  />
                  <span>Dealer / Fleet Price Tier (GH₵)</span>
                </label>
                {updateDealer && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setDealerMode('fixed')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${dealerMode === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDealerMode('percent')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${dealerMode === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      % Change
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                disabled={!updateDealer}
                value={dealerValue}
                onChange={(e) => setDealerValue(e.target.value)}
                placeholder="Dealer price value or % adjustment"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>

            {/* 5. Reorder Safety Threshold */}
            <div className={`p-4 rounded-xl border transition-all ${updateReorder ? 'border-amber-500 bg-amber-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={updateReorder}
                    onChange={(e) => setUpdateReorder(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500"
                  />
                  <span>Minimum Reorder Threshold (Safety Stock)</span>
                </label>
              </div>
              <input
                type="number"
                disabled={!updateReorder}
                value={reorderValue}
                onChange={(e) => setReorderValue(e.target.value)}
                placeholder="Minimum stock units required (e.g. 5)"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-amber-500 disabled:opacity-40"
              />
            </div>

            {/* 6. Stock Quantity Adjustment */}
            <div className={`p-4 rounded-xl border transition-all ${updateStockQty ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={updateStockQty}
                    onChange={(e) => setUpdateStockQty(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Stock Quantity (Units)</span>
                </label>
                {updateStockQty && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setStockQtyMode('add')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${stockQtyMode === 'add' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockQtyMode('subtract')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${stockQtyMode === 'subtract' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
                    >
                      - Subtract
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockQtyMode('fixed')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${stockQtyMode === 'fixed' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                    >
                      Set Exact
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                disabled={!updateStockQty}
                value={stockQtyValue}
                onChange={(e) => setStockQtyValue(e.target.value)}
                placeholder={
                  stockQtyMode === 'add'
                    ? 'Units to add to existing stock (e.g. 10)'
                    : stockQtyMode === 'subtract'
                    ? 'Units to subtract (e.g. 2)'
                    : 'Set exact total quantity (e.g. 50)'
                }
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* 7. Category / Brand Batch Rename */}
          <div className={`p-4 rounded-xl border transition-all ${updateCategory ? 'border-purple-500 bg-purple-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-900 mb-2">
              <input
                type="checkbox"
                checked={updateCategory}
                onChange={(e) => setUpdateCategory(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded-md border-slate-300 focus:ring-purple-500"
              />
              <span>Batch Category / Brand Label</span>
            </label>
            <input
              type="text"
              disabled={!updateCategory}
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              placeholder="e.g. TOYOTA, BOSCH, MAX PROFESSIONALS, SAMIR ENGINEERING"
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold uppercase focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Applying batch updates to <span className="font-bold text-slate-900">{selectedProducts.length}</span> SKUs.
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-extrabold shadow-sm hover:shadow transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSaving ? 'Updating SKUs...' : `Apply Batch Changes (${selectedProducts.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
