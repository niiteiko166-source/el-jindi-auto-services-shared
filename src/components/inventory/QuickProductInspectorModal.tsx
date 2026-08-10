import React from 'react';
import { Product } from '../../types';
import { computeProductStats, formatCurrency } from '../../utils/calculations';
import {
  X,
  Package,
  Layers,
  MapPin,
  Barcode,
  Tag,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Edit3,
  Boxes
} from 'lucide-react';

interface QuickProductInspectorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onJumpToSheet: (sheet: string, codeOrDesc: string) => void;
  onEditProduct?: (p: Product) => void;
}

export const QuickProductInspectorModal: React.FC<QuickProductInspectorModalProps> = ({
  product,
  isOpen,
  onClose,
  onJumpToSheet,
  onEditProduct
}) => {
  if (!isOpen || !product) return null;

  const stats = computeProductStats(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <span className="bg-blue-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
                {product.sheet}
              </span>
              <h3 className="font-extrabold text-base tracking-tight mt-0.5">{product.category}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Title & OEM Code */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Part Description & Fitment
            </div>
            <div className="text-sm font-extrabold text-slate-900 font-sans leading-snug">
              {product.desc}
            </div>
            <div className="pt-1 flex items-center space-x-2">
              <span className="font-mono font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-xs">
                OEM Code: {product.code || 'NO CODE'}
              </span>
              {product.position && (
                <span className="font-mono text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                  Pos: {product.position}
                </span>
              )}
            </div>
          </div>

          {/* Stock & Location */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div
              className={`p-3 rounded-xl border ${
                stats.status === 'OK'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-slate-500">Stock Qty Balance</div>
              <div className="text-xl font-black mt-0.5 flex items-center justify-between">
                <span>{stats.currentStock} Units</span>
                {stats.status === 'OK' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                Reorder Point Threshold: <span className="font-bold">{product.reorder}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" /> Bin / Shelf Location
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {product.location || 'UNASSIGNED'}
              </div>
              <div className="text-[10px] text-slate-400 font-sans truncate mt-0.5">
                Barcode: {product.barcode || 'N/A'}
              </div>
            </div>
          </div>

          {/* Multi-Tier Pricing Breakdown */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Price Schedule (GHS)
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9px] text-slate-400 uppercase font-bold">Retail Sell</div>
                <div className="text-sm font-black text-emerald-700">{formatCurrency(product.sell)}</div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9px] text-slate-400 uppercase font-bold">Wholesale</div>
                <div className="text-sm font-black text-blue-700">
                  {formatCurrency(product.wholesalePrice || product.sell)}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[9px] text-slate-400 uppercase font-bold">Dealer Price</div>
                <div className="text-sm font-black text-purple-700">
                  {formatCurrency(product.dealerPrice || product.sell)}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-sans text-center pt-1">
              Unit Cost Price: <span className="font-mono font-bold">{formatCurrency(product.cost)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {onEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Product</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToSheet(product.sheet, product.code || product.desc);
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 ml-auto"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Jump to {product.sheet} Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
