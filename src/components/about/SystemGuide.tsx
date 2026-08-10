import React from 'react';
import { BookOpen, CheckCircle, Barcode, ShoppingCart, Truck, DollarSign, Layers, ShieldCheck } from 'lucide-react';

export const SystemGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-blue-400 font-extrabold uppercase text-xs tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>EL-JINDI Auto Services Management System</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">System User Manual & Operations Guide</h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          Comprehensive enterprise manual for managing OEM automotive spare parts, multi-tier pricing, point of sale checkout, purchasing orders, and accounts receivable.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. Structured Sheet Navigation</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Organized into dedicated category sheets for <strong>Filters</strong>, <strong>Brakes</strong>, <strong>Accessories</strong>, and <strong>Oil & Fluids</strong>. Each sheet supports real-time search across OEM codes, descriptions, vehicle fitment models, and positions (Front/Rear).
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Barcode className="w-4 h-4 text-amber-600" />
            <span>2. Barcode Scanning & Label Printing</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Plug-and-play support for standard USB Barcode Scanners on the POS terminal. You can also generate and print shelf tags with barcodes and retail prices directly onto label paper.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>3. POS Terminal & Thermal Receipts</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Rapid checkout with automatic stock decrementing, instant discount calculations, split payment support (Cash, MoMo, Card, Bank), and WhatsApp digital receipt sharing.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-600" />
            <span>4. Purchasing & Supplier AP</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Issue Purchase Orders to importers, restock inventory levels automatically, update unit cost prices, and manage supplier credit ledger balances.
          </p>
        </div>
      </div>
    </div>
  );
};
