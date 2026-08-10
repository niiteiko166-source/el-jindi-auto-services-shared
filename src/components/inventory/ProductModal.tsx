import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product, SheetCategory } from '../../types';
import { useApp } from '../../context/AppContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  sheet: SheetCategory;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  sheet
}) => {
  const { saveProduct, deleteProduct } = useApp();

  const [formData, setFormData] = useState<Partial<Product>>({
    sheet,
    category: '',
    code: '',
    desc: '',
    position: '',
    cost: 0,
    qty: 0,
    sell: 0,
    wholesalePrice: 0,
    dealerPrice: 0,
    vipPrice: 0,
    sold: 0,
    ret: 0,
    reorder: 3,
    location: '',
    barcode: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
    } else {
      setFormData({
        sheet,
        category: '',
        code: '',
        desc: '',
        position: '',
        cost: 0,
        qty: 0,
        sell: 0,
        wholesalePrice: 0,
        dealerPrice: 0,
        vipPrice: 0,
        sold: 0,
        ret: 0,
        reorder: 3,
        location: '',
        barcode: ''
      });
    }
  }, [product, sheet, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sheet = formData.sheet || 'Filters';
    const isCodeRequired = sheet !== 'Accessories' && sheet !== 'Oil & Fluids';

    if (!formData.desc) {
      alert('Description is required');
      return;
    }

    if (isCodeRequired && !(formData.code || '').trim()) {
      alert('Part Code / OEM No. is required for this category.');
      return;
    }

    await saveProduct(formData);
    onClose();
  };

  const handleDelete = async () => {
    if (product?.id && confirm(`Are you sure you want to delete "${product.desc}"?`)) {
      await deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? `Edit Part #${product.id}` : `Add New Part (${sheet})`}
      subtitle="Configure OEM part number, pricing, stock levels, and fitment details"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Category / Sheet */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category Sheet
            </label>
            <select
              name="sheet"
              value={formData.sheet}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="Filters">Filters</option>
              <option value="Brakes">Brakes</option>
              <option value="Accessories">Accessories</option>
              <option value="Oil & Fluids">Oil & Fluids</option>
            </select>
          </div>

          {/* Sub Brand / Category */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Brand / Sub-Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              placeholder="e.g. TOYOTA, RYMAX, SAMIR"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* OEM Part Code */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Part Code / OEM No.
            </label>
            <input
              type="text"
              name="code"
              value={formData.code || ''}
              onChange={handleChange}
              placeholder="e.g. 04152-31090"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Item Description / Vehicle Fitment */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Description & Vehicle Fitment
          </label>
          <input
            type="text"
            name="desc"
            required
            value={formData.desc || ''}
            onChange={handleChange}
            placeholder="e.g. TOYOTA CAMRY 07-21, HIGHLANDER 08-21, RAV 4 06-18"
            className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Position */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Position
            </label>
            <input
              type="text"
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
              placeholder="FRONT / REAR / N/A"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Warehouse Location */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Shelf / Bin Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
              placeholder="Shelf A-12"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Barcode String */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Barcode / SKU String
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode || ''}
              onChange={handleChange}
              placeholder="Scanned Barcode value"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Pricing Tiers Section */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Cost & Multi-Tier Selling Prices (GH₵)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Cost Price</label>
              <input
                type="number"
                step="0.01"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Retail Selling Price</label>
              <input
                type="number"
                step="0.01"
                name="sell"
                value={formData.sell}
                onChange={handleChange}
                className="w-full p-2 border border-blue-400 rounded bg-white font-mono font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Wholesale Price</label>
              <input
                type="number"
                step="0.01"
                name="wholesalePrice"
                value={formData.wholesalePrice || ''}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Dealer / VIP Price</label>
              <input
                type="number"
                step="0.01"
                name="dealerPrice"
                value={formData.dealerPrice || ''}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Quantities & Reorder Threshold */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Stock Quantities & Reorder Trigger
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Initial / Qty Purchased</label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Units Sold</label>
              <input
                type="number"
                name="sold"
                value={formData.sold}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Units Restocked / Ret</label>
              <input
                type="number"
                name="ret"
                value={formData.ret}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-700 mb-1">Reorder Level Threshold</label>
              <input
                type="number"
                name="reorder"
                value={formData.reorder}
                onChange={handleChange}
                className="w-full p-2 border border-amber-300 rounded bg-amber-50 font-mono font-bold text-amber-900"
              />
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          {product?.id ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold border border-red-200 transition-colors"
            >
              Delete Part
            </button>
          ) : (
            <div></div>
          )}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-xs"
            >
              Save Part Record
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
