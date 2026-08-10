import React from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { History, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';

interface StockMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: number | null;
}

export const StockMovementsModal: React.FC<StockMovementsModalProps> = ({
  isOpen,
  onClose,
  itemId
}) => {
  const { stockMovements, products } = useApp();

  const filteredMovements = itemId
    ? stockMovements.filter((m) => m.itemId === itemId)
    : stockMovements;

  const targetProduct = itemId ? products.find((p) => p.id === itemId) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={targetProduct ? `Stock Audit History: ${targetProduct.desc}` : 'Global Stock Movement Audit Trail'}
      subtitle="Complete chronological log of all stock receipts, sales, customer returns, and adjustments"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">
              Total Logged Movements: {filteredMovements.length}
            </span>
          </div>
          {targetProduct && (
            <div className="font-mono text-slate-600">
              Code: <span className="font-bold text-slate-900">{targetProduct.code || 'N/A'}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Part Details</th>
                <th className="p-2.5 text-right">Qty Change</th>
                <th className="p-2.5 text-right">New Stock</th>
                <th className="p-2.5">Reference</th>
                <th className="p-2.5">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No stock movements recorded yet for this selection.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.qtyChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono text-slate-600">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center space-x-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-red-600" />
                          )}
                          <span>{m.type}</span>
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-900 max-w-xs truncate">
                        <div className="font-mono text-blue-600 font-bold">{m.itemCode}</div>
                        <div className="text-[11px] text-slate-600">{m.itemDesc}</div>
                      </td>
                      <td
                        className={`p-2.5 text-right font-mono font-extrabold ${
                          isPositive ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? `+${m.qtyChange}` : m.qtyChange}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {m.newStock}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{m.referenceNo || 'N/A'}</td>
                      <td className="p-2.5 font-semibold text-slate-700">{m.userName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </Modal>
  );
};
