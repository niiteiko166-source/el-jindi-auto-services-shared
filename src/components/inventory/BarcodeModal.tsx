import React from 'react';
import { Modal } from '../common/Modal';
import { Product } from '../../types';
import { Printer, QrCode, Barcode } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  const codeVal = product.code || `ELJ-${product.id}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Barcode & Shelf Label: ${product.code || 'Part #' + product.id}`}
      subtitle="Printable shelf tag and barcode label for USB scanner scanning"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Printable Label Preview Box */}
        <div id="printable-label" className="bg-white border-2 border-dashed border-slate-300 p-4 rounded-xl text-center shadow-xs">
          <div className="font-extrabold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
            EL-JINDI AUTO SERVICES
          </div>

          <div className="font-bold text-xs text-slate-800 line-clamp-2 px-2">
            {product.desc}
          </div>

          <div className="my-3 flex flex-col items-center justify-center bg-slate-50 py-3 rounded-lg border border-slate-200">
            {/* Simulated Barcode Visual */}
            <div className="flex items-center justify-center space-x-1 font-mono text-3xl tracking-tighter text-slate-900 select-none">
              ||| | ||| || |||| | ||| ||| | ||
            </div>
            <div className="font-mono font-extrabold text-xs tracking-widest mt-1 text-slate-900">
              *{codeVal}*
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-2 pt-1 border-t border-slate-100">
            <div className="text-left font-semibold text-slate-600">
              <div>Category: <span className="font-bold text-slate-900">{product.sheet}</span></div>
              {product.position && <div>Pos: <span className="font-bold text-slate-900">{product.position}</span></div>}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Retail Price</div>
              <div className="font-mono font-extrabold text-base text-blue-600">
                {formatCurrency(product.sell)}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label Tag</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
