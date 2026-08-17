import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseOrder } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { Plus, ShoppingBag, Truck, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

export const PurchasingModule: React.FC = () => {
  const { purchaseOrders, createPurchaseOrder, suppliers, products } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [items, setItems] = useState<
    Array<{ itemId: number; itemCode: string; itemDesc: string; qtyOrdered: number; unitCost: number }>
  >([]);

  const [notes, setNotes] = useState('');

  const handleAddItem = (pId: number) => {
    const p = products.find((prod) => prod.id === pId);
    if (!p) return;

    setItems((prev) => [
      ...prev,
      {
        itemId: p.id,
        itemCode: p.code || 'N/A',
        itemDesc: p.desc,
        qtyOrdered: 10,
        unitCost: p.cost
      }
    ]);
  };

  const handleUpdateItem = (index: number, field: string, val: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: val } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalCost = items.reduce((sum, it) => sum + it.qtyOrdered * it.unitCost, 0);

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one inventory item to the order');
      return;
    }

    const supp = suppliers.find((s) => s.id === selectedSupplierId);

    await createPurchaseOrder({
      poNo: `PO-${Date.now().toString().slice(-6)}`,
      supplierId: Number(selectedSupplierId),
      supplierName: supp?.name || 'Supplier',
      date: new Date().toISOString().split('T')[0],
      items,
      totalAmount: totalCost,
      status: 'RECEIVED', // Auto receive for quick stock update or PENDING
      notes
    });

    setIsModalOpen(false);
    setItems([]);
    setSelectedSupplierId('');
    setNotes('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Purchasing & Goods Receiving Notes (GRN)
          </h2>
          <p className="text-xs text-slate-500">
            Create Purchase Orders to suppliers and instantly update inventory stock & unit cost prices
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3">PO Number</th>
                <th className="p-3">Date</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Items Count</th>
                <th className="p-3 text-right">Total Amount (GH₵)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(purchaseOrders || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No Purchase Orders created yet. Click "New Purchase Order" to restock.
                  </td>
                </tr>
              ) : (
                (purchaseOrders || []).map((po, idx) => (
                  <tr key={`po-${po.id || idx}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600">{po.poNo || (po as any).poNumber}</td>
                    <td className="p-3 font-mono text-slate-600">{po.date}</td>
                    <td className="p-3 font-bold text-slate-900">{po.supplierName}</td>
                    <td className="p-3 text-slate-600 font-semibold">{(po.items || []).length} items</td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Purchase Order / Restock GRN"
        subtitle="Select supplier, select OEM part numbers, set unit cost price and received quantities"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmitPO} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Supplier
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s, idx) => (
                <option key={`po-sup-${s.id}-${idx}`} value={s.id}>
                  {s.name} ({s.contactPerson})
                </option>
              ))}
            </select>
          </div>

          {/* Add Item Selector */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Add Inventory Part to PO
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) handleAddItem(Number(e.target.value));
              }}
              value=""
              className="w-full p-2 border border-blue-400 rounded-lg bg-blue-50 font-semibold text-blue-900"
            >
              <option value="">+ Click to Select & Add Inventory Part...</option>
              {products.map((p, idx) => (
                <option key={`po-prod-${p.id}-${idx}`} value={p.id}>
                  [{p.sheet}] {p.code} - {p.desc} (Current Cost: GH₵ {p.cost})
                </option>
              ))}
            </select>
          </div>

          {/* Added Line Items */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                <tr>
                  <th className="p-2">Part Description</th>
                  <th className="p-2 w-24">Qty Ordered</th>
                  <th className="p-2 w-28">Unit Cost (GH₵)</th>
                  <th className="p-2 w-28 text-right">Line Total</th>
                  <th className="p-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      No items added to this PO yet.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-slate-900">
                        <div className="font-mono text-blue-600 font-bold">{it.itemCode}</div>
                        <div>{it.itemDesc}</div>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.qtyOrdered}
                          onChange={(e) => handleUpdateItem(idx, 'qtyOrdered', Number(e.target.value))}
                          className="w-full p-1 border rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitCost}
                          onChange={(e) => handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value))}
                          className="w-full p-1 border rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(it.qtyOrdered * it.unitCost)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg font-bold">
            <span className="text-slate-700 uppercase">Total PO Value:</span>
            <span className="font-mono text-base text-blue-600">{formatCurrency(totalCost)}</span>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
            >
              Post PO & Restock Inventory
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
