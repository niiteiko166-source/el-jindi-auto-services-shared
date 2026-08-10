import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, PaymentMethod, SaleInvoice } from '../../types';
import { computeProductStats, formatCurrency } from '../../utils/calculations';
import { ReceiptModal } from './ReceiptModal';
import {
  Zap,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Printer,
  DollarSign,
  User,
  CreditCard,
  Smartphone,
  Building,
  AlertCircle,
  X,
  ExternalLink,
  Receipt
} from 'lucide-react';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  initialProduct
}) => {
  const { products, customers, recordSale, setCurrentView, settings, showToast } = useApp();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('Walk-In Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Cart items inside modal
  const [cart, setCart] = useState<
    Array<{
      product: Product;
      qty: number;
      unitPrice: number;
      discountPct: number;
    }>
  >(() => {
    if (initialProduct) {
      return [
        {
          product: initialProduct,
          qty: 1,
          unitPrice: initialProduct.sell,
          discountPct: 0
        }
      ];
    }
    return [];
  });

  // When initial product changes, set initial cart
  React.useEffect(() => {
    if (initialProduct && isOpen) {
      setCart([
        {
          product: initialProduct,
          qty: 1,
          unitPrice: initialProduct.sell,
          discountPct: 0
        }
      ]);
    }
  }, [initialProduct, isOpen]);

  // Product search matches
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 1) return [];
    const q = searchTerm.trim().toLowerCase();
    return (products || [])
      .filter((p) => {
        const code = (p.code || '').toLowerCase();
        const desc = (p.desc || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const sheet = (p.sheet || '').toLowerCase();
        return code.includes(q) || desc.includes(q) || barcode.includes(q) || sheet.includes(q);
      })
      .slice(0, 6);
  }, [searchTerm, products]);

  // Add item to cart
  const handleAddToCart = (prod: Product) => {
    const stats = computeProductStats(prod);
    if (stats.currentStock <= 0) {
      showToast(`Warning: ${prod.desc} is currently Out of Stock!`, 'warning');
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === prod.id);
      if (existingIdx >= 0) {
        const existingItem = prev[existingIdx];
        const newQty = existingItem.qty + 1;
        if (newQty > stats.currentStock) {
          showToast(`Note: Added quantity (${newQty}) exceeds current available stock (${stats.currentStock})`, 'warning');
        }
        return prev.map((item, index) =>
          index === existingIdx ? { ...item, qty: newQty } : item
        );
      } else {
        return [
          ...prev,
          {
            product: prod,
            qty: 1,
            unitPrice: prod.sell,
            discountPct: 0
          }
        ];
      }
    });
    setSearchTerm('');
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      return prev.map((item, index) =>
        index === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      );
    });
  };

  const handleRemoveItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineRaw = item.qty * item.unitPrice;
      const lineDiscount = lineRaw * (item.discountPct / 100);
      return sum + (lineRaw - lineDiscount);
    }, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    if (!settings.enableVat || !settings.vatRate) return 0;
    return subtotal * (settings.vatRate / 100);
  }, [subtotal, settings]);

  const grandTotal = subtotal + taxAmount;

  const tenderedVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedVal - grandTotal);

  // Submit Sale
  const handleProcessSale = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one part to process a sale.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const itemsPayload = cart.map((c) => ({
        itemId: c.product.id,
        code: c.product.code,
        desc: c.product.desc,
        sheet: c.product.sheet,
        qty: c.product.sheet ? c.qty : c.qty,
        unitPrice: c.unitPrice,
        discountPct: c.discountPct,
        lineTotal: c.qty * c.unitPrice * (1 - c.discountPct / 100)
      }));

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      const invoiceData: Partial<SaleInvoice> = {
        date: currentDate,
        time: currentTime,
        customerName: customerName || 'Walk-In Customer',
        customerPhone,
        cashier: currentUser?.name || currentUser?.username || 'Sales Rep',
        paymentMethod,
        items: itemsPayload,
        subtotal,
        discountTotal: 0,
        taxAmount,
        grandTotal,
        amountPaid: paymentMethod === 'CREDIT_SALE' ? 0 : tenderedVal > 0 ? Math.min(tenderedVal, grandTotal) : grandTotal,
        balanceDue: paymentMethod === 'CREDIT_SALE' ? grandTotal : 0,
        status: paymentMethod === 'CREDIT_SALE' ? 'CREDIT' : 'COMPLETED',
        notes: `Quick Sale Express Terminal (${new Date().toLocaleTimeString()})`
      };

      const result = await recordSale(invoiceData);
      setCompletedInvoice(result);
      setShowReceiptModal(true);
    } catch (err) {
      showToast('Error processing quick sale.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetModal = () => {
    setCart([]);
    setCompletedInvoice(null);
    setShowReceiptModal(false);
    setSearchTerm('');
    setCashTendered('');
    setCustomerName('Walk-In Customer');
    setCustomerPhone('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight uppercase">Quick Sale Express</h3>
              <p className="text-[11px] text-blue-100 font-medium">Fast point-of-sale checkout & invoice generator</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                setCurrentView('pos');
              }}
              className="text-xs font-bold text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full POS Terminal</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {completedInvoice ? (
          /* Sale Success View */
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Sale Successfully Completed!</h2>
              <p className="text-xs text-slate-500 font-mono">Invoice #{completedInvoice.invoiceNo}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">{completedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <span className="font-bold text-blue-700">{completedInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Items Count:</span>
                <span className="font-bold text-slate-900">{completedInvoice.items.length} parts</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-700 font-bold">Total Paid:</span>
                <span className="font-black text-emerald-700 text-sm font-mono">
                  {formatCurrency(completedInvoice.grandTotal)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>View & Print Thermal Receipt</span>
              </button>

              <button
                onClick={handleResetModal}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
              >
                <Zap className="w-4 h-4" />
                <span>Start Another Quick Sale</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Normal Quick Sale Entry Form */
          <div className="p-6 space-y-5">
            {/* SKU Search Input */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Search Parts (SKU, OEM Code, Description)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to search stock item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>

              {/* Live Search Results Popover */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {searchResults.map((prod) => {
                    const stats = computeProductStats(prod);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleAddToCart(prod)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900">{prod.desc}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Code: <span className="text-blue-700 font-bold">{prod.code}</span> | Cat: {prod.sheet}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-700">{formatCurrency(prod.sell)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Stock: <span className="font-bold text-slate-700">{stats.currentStock}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="bg-slate-100 p-2.5 px-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sale Line Items ({cart.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Click item to adjust</span>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-1">
                  <p>No items added yet.</p>
                  <p className="text-[10px] text-slate-400">Search above to add OEM parts to quick sale.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{item.product.desc}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.code} • {item.product.sheet}
                        </div>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono font-extrabold text-slate-900">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price & Subtotal */}
                      <div className="text-right font-mono">
                        <div className="font-extrabold text-slate-900">
                          {formatCurrency(item.qty * item.unitPrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{formatCurrency(item.unitPrice)}/ea
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Name / Phone</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="CARD">Bank Card / POS</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="CREDIT_SALE">Credit Sale (Debtor Invoice)</option>
                </select>
              </div>
            </div>

            {/* Cash Tendered Input if Cash */}
            {paymentMethod === 'CASH' && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-amber-800 font-bold">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Cash Tendered:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder={`Min ${grandTotal.toFixed(2)}`}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-28 px-2 py-1 bg-white border border-amber-300 rounded text-right font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {tenderedVal > 0 && (
                    <span className="text-emerald-700 font-bold font-mono">
                      Change: {formatCurrency(changeDue)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer Summary & Checkout Button */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grand Total</div>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {formatCurrency(grandTotal)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessSale}
                  disabled={cart.length === 0 || isProcessing}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{isProcessing ? 'Processing...' : 'Complete Sale'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReceiptModal && completedInvoice && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          sale={completedInvoice}
        />
      )}
    </div>
  );
};
