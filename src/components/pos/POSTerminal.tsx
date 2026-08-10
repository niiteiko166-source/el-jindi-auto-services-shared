import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, POSCartLine, PriceTier, PaymentMethod } from '../../types';
import { computeProductStats, formatCurrency, formatInt } from '../../utils/calculations';
import { ReceiptModal } from './ReceiptModal';
import { SalesLogModal } from './SalesLogModal';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  User,
  Tag,
  Volume2,
  Sparkles,
  Zap,
  AlertTriangle,
  Receipt,
  Clock,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export const POSTerminal: React.FC = () => {
  const { products, sales, recordSale, customers, showToast } = useApp();
  const { currentUser } = useAuth();

  const [cart, setCart] = useState<POSCartLine[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('Walk-in Customer');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSalesLogOpen, setIsSalesLogOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<{ code: string; desc: string; success: boolean; msg: string } | null>(null);

  // Compute Today's Sales Tally for Logged-In Sales Rep
  const activeRepName = currentUser?.name || currentUser?.username || 'Main Cashier';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayMySalesStats = useMemo(() => {
    const myTodayInvoices = (sales || []).filter((s) => {
      const isToday = s.date === todayStr;
      const cLower = (s.cashier || '').toLowerCase();
      const myNameLower = (currentUser?.name || '').toLowerCase();
      const myUserLower = (currentUser?.username || '').toLowerCase();
      const matchesRep =
        (myNameLower && (cLower.includes(myNameLower) || myNameLower.includes(cLower))) ||
        (myUserLower && (cLower.includes(myUserLower) || myUserLower.includes(cLower))) ||
        s.cashier === 'Cashier' ||
        s.cashier === 'Main Cashier' ||
        s.cashier === 'Sales Rep';
      return isToday && matchesRep;
    });

    const totalRev = myTodayInvoices.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    return {
      count: myTodayInvoices.length,
      revenue: totalRev
    };
  }, [sales, todayStr, currentUser]);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Web Audio Synth Beep Feedback
  const playBeep = (success: boolean = true) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
    } catch {
      // Audio context silenced or blocked
    }
  };

  // Process a barcode lookup string
  const processBarcodeCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      const match = (products || []).find(
        (p) =>
          (p.code && p.code.toLowerCase() === code.toLowerCase()) ||
          (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
          (p.oemNumber && p.oemNumber.toLowerCase() === code.toLowerCase())
      );

      if (match) {
        const stats = computeProductStats(match);
        if (stats.currentStock <= 0) {
          playBeep(false);
          setLastScannedItem({
            code,
            desc: match.desc,
            success: false,
            msg: `Part "${match.desc}" is OUT OF STOCK!`
          });
          showToast(`Part "${match.desc}" is out of stock!`, 'error');
          return;
        }

        addToCart(match);
        playBeep(true);
        setLastScannedItem({
          code,
          desc: match.desc,
          success: true,
          msg: `Scanned & Added: ${match.desc} (${formatCurrency(match.sell)})`
        });
        showToast(`Barcode Scanned: ${match.desc}`, 'success');
        setScanInput('');
      } else {
        playBeep(false);
        setLastScannedItem({
          code,
          desc: 'Unknown Barcode',
          success: false,
          msg: `Barcode "${code}" not found in inventory.`
        });
        showToast(`Barcode "${code}" not found`, 'error');
        setPosSearch(code);
        setScanInput('');
      }
    },
    [products, showToast]
  );

  // Global Barcode Event Listener for Hardware USB Scanners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Hardware scanners type characters very quickly (< 40ms apart)
      const isRapidKey = timeDiff < 40;

      if (e.key === 'Enter') {
        if (bufferRef.current.length > 1) {
          // Process hardware buffer scan
          e.preventDefault();
          const scanned = bufferRef.current;
          bufferRef.current = '';
          processBarcodeCode(scanned);
          return;
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        if (!isInput || isRapidKey) {
          bufferRef.current += e.key;
        } else {
          bufferRef.current = '';
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [processBarcodeCode]);

  // Filter in-stock items for POS search
  const searchResults = posSearch.trim()
    ? (products || [])
        .filter((p) => {
          const stats = computeProductStats(p);
          if (stats.currentStock <= 0) return false;
          const q = posSearch.toLowerCase();
          return (
            (p.desc || '').toLowerCase().includes(q) ||
            (p.code || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.barcode || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 20)
    : [];

  const handleBarcodeScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcodeCode(scanInput);
    }
  };

  const addToCart = (product: Product, tier: PriceTier = 'retail') => {
    const stats = computeProductStats(product);
    if (stats.currentStock <= 0) {
      alert(`Product "${product.desc}" is out of stock!`);
      return;
    }

    let unitPrice = product.sell;
    if (tier === 'wholesale' && product.wholesalePrice) unitPrice = product.wholesalePrice;
    if (tier === 'dealer' && product.dealerPrice) unitPrice = product.dealerPrice;

    setCart((prev) => {
      const existing = prev.find((line) => line.itemId === product.id && line.tier === tier);
      if (existing) {
        if (existing.qty + 1 > stats.currentStock) {
          alert(`Cannot exceed available stock (${stats.currentStock} units available)`);
          return prev;
        }
        return prev.map((line) =>
          line.itemId === product.id && line.tier === tier ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [
        ...prev,
        {
          itemId: product.id,
          sheet: product.sheet,
          desc: product.desc,
          code: product.code || 'N/A',
          price: unitPrice,
          tier,
          qty: 1,
          maxStock: stats.currentStock,
          discountPct: 0
        }
      ];
    });
  };

  const updateCartQty = (itemId: number, tier: PriceTier, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId, tier);
      return;
    }

    setCart((prev) =>
      prev.map((line) => {
        if (line.itemId === itemId && line.tier === tier) {
          const newQty = Math.min(qty, line.maxStock);
          return { ...line, qty: newQty };
        }
        return line;
      })
    );
  };

  const removeFromCart = (itemId: number, tier: PriceTier) => {
    setCart((prev) => prev.filter((line) => !(line.itemId === itemId && line.tier === tier)));
  };

  // Calculations
  const subtotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const discountTotal = (subtotal * discountPct) / 100;
  const grandTotal = Math.max(0, subtotal - discountTotal);

  const amountPaid = amountPaidInput === '' ? grandTotal : parseFloat(amountPaidInput) || 0;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Verify stock
    for (const line of cart) {
      const p = products.find((prod) => prod.id === line.itemId);
      if (p) {
        const stats = computeProductStats(p);
        if (line.qty > stats.currentStock) {
          alert(`Insufficient stock for "${line.desc}". Available: ${stats.currentStock}`);
          return;
        }
      }
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const saleInvoice = {
      date: currentDate,
      time: currentTime,
      customerName: selectedCustomer,
      customerPhone: selectedCustomerPhone,
      cashier: activeRepName,
      paymentMethod,
      items: cart.map((l) => ({
        itemId: l.itemId,
        code: l.code,
        desc: l.desc,
        sheet: l.sheet,
        qty: l.qty,
        unitPrice: l.price,
        discountPct: l.discountPct || 0,
        lineTotal: l.qty * l.price
      })),
      subtotal,
      discountTotal,
      taxAmount: 0,
      grandTotal,
      amountPaid,
      balanceDue,
      notes,
      status: balanceDue > 0 ? ('CREDIT' as const) : ('COMPLETED' as const)
    };

    const saved = await recordSale(saleInvoice);
    setCompletedSale(saved);
    setIsReceiptOpen(true);

    // Reset Form
    setCart([]);
    setAmountPaidInput('');
    setDiscountPct(0);
    setNotes('');
    setPosSearch('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sales Rep Daily Tally Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white p-3.5 px-5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/40 text-blue-300 rounded-xl border border-blue-400/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wide">Sales Rep Shift Tally</span>
              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                Logged in: {activeRepName}
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-3 font-mono mt-0.5">
              <span>Today&apos;s Sales: <strong className="text-emerald-400 font-black">{formatCurrency(todayMySalesStats.revenue)}</strong></span>
              <span className="text-slate-500">•</span>
              <span>Invoices Issued: <strong className="text-white font-black">{todayMySalesStats.count}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSalesLogOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 border border-blue-400/30"
        >
          <BarChart2 className="w-4 h-4 text-amber-300" />
          <span>Open Sales Log ({todayMySalesStats.count})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Search & Barcode Scanner */}
      <div className="lg:col-span-7 space-y-4">
        {/* Scanner Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            <span className="flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-amber-400" />
              USB / Wireless Barcode Scanner & OEM Code Rapid Entry
            </span>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Hardware Listener Active
              </span>
              <span className="bg-amber-400/20 text-amber-300 font-mono text-[9px] px-2 py-0.5 rounded border border-amber-400/30">
                AUTO-BEEP ON SCAN
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleBarcodeScanInput}
              placeholder="Scan physical barcode or type exact part code (e.g. FA-1883), then press Enter..."
              className="w-full bg-slate-950 text-white font-mono text-sm px-3.5 py-2.5 rounded-lg border-2 border-amber-400/80 focus:outline-hidden focus:ring-2 focus:ring-amber-300 tracking-wider placeholder:text-slate-500 pr-24"
            />
            <button
              onClick={() => processBarcodeCode(scanInput)}
              className="absolute right-1.5 top-1.5 bottom-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 rounded-md transition-colors flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          </div>

          {/* Quick Scan Simulation Pills */}
          <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium text-[10px] uppercase font-mono mr-1">
              Sample Quick Scans:
            </span>
            {(products || []).slice(0, 5).map((p) => {
              const codeToTest = p.code || p.barcode || 'N/A';
              if (!codeToTest || codeToTest === 'N/A') return null;
              return (
                <button
                  key={`sim-${p.id}`}
                  onClick={() => processBarcodeCode(codeToTest)}
                  type="button"
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 hover:border-amber-400 transition-all flex items-center gap-1"
                  title={`Simulate barcode scan for ${p.desc}`}
                >
                  <Barcode className="w-3 h-3 text-slate-400" />
                  <span>{codeToTest}</span>
                </button>
              );
            })}
          </div>

          {/* Last Scanned Feedback Banner */}
          {lastScannedItem && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-mono animate-in fade-in duration-150 ${
                lastScannedItem.success
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/80 border-red-500/50 text-red-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {lastScannedItem.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="font-bold">{lastScannedItem.msg}</span>
              </div>
              <button
                onClick={() => setLastScannedItem(null)}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Text Search Box */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              placeholder="Or search by description, fitment, model..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
            {posSearch.trim() === '' ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Search className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                Start typing or scan a barcode above to add items to cart.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No available in-stock parts match "{posSearch}".
              </div>
            ) : (
              searchResults.map((p, idx) => {
                const stats = computeProductStats(p);
                return (
                  <div
                    key={`pos-res-${p.id}-${idx}`}
                    onClick={() => addToCart(p)}
                    className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg flex items-center justify-between cursor-pointer transition-all text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="font-bold text-slate-900 truncate">{p.desc}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2 mt-0.5">
                        <span className="text-blue-600 font-bold">{p.code || 'NO-CODE'}</span>
                        <span>·</span>
                        <span>{p.sheet}</span>
                        <span>·</span>
                        <span className="text-emerald-600 font-bold">{stats.currentStock} in stock</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-extrabold text-sm text-slate-900">
                        {formatCurrency(p.sell)}
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold uppercase">
                        + Add to Cart
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: POS Cart & Checkout */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-xs uppercase tracking-wider">Sale Basket ({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Line Items */}
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto flex-1 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Cart is empty. Scan items or select from the left.
              </div>
            ) : (
              cart.map((line) => (
                <div key={`${line.itemId}-${line.tier}`} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-slate-900 truncate">{line.desc}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {line.code} · {formatCurrency(line.price)} ea
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center border border-slate-300 rounded-md bg-slate-50">
                      <button
                        onClick={() => updateCartQty(line.itemId, line.tier, line.qty - 1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded-l"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-mono font-bold text-slate-900">{line.qty}</span>
                      <button
                        onClick={() => updateCartQty(line.itemId, line.tier, line.qty + 1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded-r"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-mono font-extrabold text-slate-900 text-right w-16">
                      {formatCurrency(line.qty * line.price, '')}
                    </div>

                    <button
                      onClick={() => removeFromCart(line.itemId, line.tier)}
                      className="text-slate-400 hover:text-red-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Customer Account */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  Customer
                </label>
                <input
                  type="text"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  Phone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={selectedCustomerPhone}
                  onChange={(e) => setSelectedCustomerPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'CARD', label: 'Card', icon: CreditCard },
                  { id: 'MOBILE_MONEY', label: 'MoMo', icon: Smartphone },
                  { id: 'BANK_TRANSFER', label: 'Bank', icon: Building }
                ].map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`p-1.5 border rounded-lg flex items-center justify-center space-x-1 transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Paid Input */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                <span>Amount Tendered / Paid Now</span>
                {balanceDue > 0 && <span className="text-red-600">Credit Balance: {formatCurrency(balanceDue)}</span>}
              </div>
              <input
                type="number"
                step="0.01"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={formatCurrency(grandTotal, '')}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900"
              />
            </div>

            {/* Total Summary Box */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1">
                <span>GRAND TOTAL:</span>
                <span className="text-blue-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-extrabold rounded-lg text-sm uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Complete Sale & Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
      />

      {/* Sales Rep Daily Sales Log Modal */}
      <SalesLogModal
        isOpen={isSalesLogOpen}
        onClose={() => setIsSalesLogOpen(false)}
      />
    </div>
  );
};
