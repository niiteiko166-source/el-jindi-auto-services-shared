import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  DebtorRecord,
  Supplier,
  CustomerProfile,
  PurchaseOrder,
  SaleInvoice,
  ExpenseRecord,
  AuditLog,
  StockMovement,
  SystemSettings
} from '../types';
import { api } from '../services/api';
import { computeProductStats, computeDebtorStats } from '../utils/calculations';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchTerm: string;
  setSearchTerm: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;

  products: Product[];
  debtors: DebtorRecord[];
  suppliers: Supplier[];
  customers: CustomerProfile[];
  purchases: PurchaseOrder[];
  purchaseOrders: PurchaseOrder[];
  sales: SaleInvoice[];
  expenses: ExpenseRecord[];
  cashTransactions: ExpenseRecord[];
  auditLogs: AuditLog[];
  stockMovements: StockMovement[];
  settings: SystemSettings;
  loading: boolean;

  toasts: Toast[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;

  refreshData: () => Promise<void>;
  saveProduct: (prod: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: number) => Promise<boolean>;
  saveDebtor: (d: Partial<DebtorRecord>) => Promise<DebtorRecord>;
  deleteDebtor: (id: number) => Promise<boolean>;
  recordSale: (sale: Partial<SaleInvoice>) => Promise<SaleInvoice>;
  deleteSale: (id: string | number) => Promise<boolean>;
  saveSupplier: (sup: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: number) => Promise<boolean>;
  saveCustomer: (cust: Partial<CustomerProfile>) => Promise<CustomerProfile>;
  deleteCustomer: (id: number) => Promise<boolean>;
  recordPurchase: (po: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  createPurchaseOrder: (po: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  recordExpense: (
    expOrAmount: Partial<ExpenseRecord> | number,
    category?: string,
    description?: string,
    referenceNo?: string
  ) => Promise<ExpenseRecord>;
  recordCustomerPayment: (saleId: string | number, amount: number, customerName: string, notes?: string) => Promise<void>;
  bulkImportProducts: (
    prods: Partial<Product>[],
    mode?: 'update' | 'skip'
  ) => Promise<{ countAdded: number; countUpdated: number; countSkipped: number }>;
  bulkImportDebtors: (
    debts: Partial<DebtorRecord>[],
    mode?: 'skip' | 'update'
  ) => Promise<{ countAdded: number; countSkipped: number }>;
  updateSettings: (s: Partial<SystemSettings>) => Promise<void>;
  logAuditAction: (action: string, moduleName: string, details: string) => Promise<void>;

  reorderCountsBySheet: Record<string, number>;
  totalReorderCount: number;
  totalStockValueCost: number;
  totalProfit: number;
  totalDebtorsOwed: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [products, setProducts] = useState<Product[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(api.getSettings as any);
  const [loading, setLoading] = useState<boolean>(true);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, debts, sups, custs, pos, sls, exps, logs, movs, stgs] = await Promise.all([
        api.getProducts(),
        api.getDebtors(),
        api.getSuppliers(),
        api.getCustomers(),
        api.getPurchases(),
        api.getSales(),
        api.getExpenses(),
        api.getAuditLogs(),
        api.getStockMovements(),
        api.getSettings()
      ]);

      setProducts(Array.isArray(prods) ? prods : []);
      setDebtors(Array.isArray(debts) ? debts : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setCustomers(Array.isArray(custs) ? custs : []);
      setPurchases(Array.isArray(pos) ? pos : []);
      setSales(Array.isArray(sls) ? sls : []);
      setExpenses(Array.isArray(exps) ? exps : []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setStockMovements(Array.isArray(movs) ? movs : []);
      if (stgs) setSettings(stgs);
    } catch (e) {
      console.error('Failed to load initial data:', e);
      showToast('Error connecting to backend database', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Clear potentially stale localStorage fallbacks so we use live API data
    try {
      localStorage.removeItem('eljindi_debtors');
      localStorage.removeItem('eljindi_customers');
      localStorage.removeItem('eljindi_suppliers');
    } catch (e) {
      // ignore
    }

    refreshData();
  }, [refreshData]);

  // Derived metrics
  const sheets = ['Filters', 'Brakes', 'Accessories', 'Oil & Fluids'];
  const reorderCountsBySheet: Record<string, number> = {};
  let totalReorderCount = 0;
  let totalStockValueCost = 0;
  let totalProfit = 0;

  sheets.forEach((s) => (reorderCountsBySheet[s] = 0));

  (products || []).forEach((p) => {
    const stats = computeProductStats(p);
    totalStockValueCost += stats.stockValueCost;
    totalProfit += stats.profit;

    if (stats.status === 'REORDER' || stats.status === 'OUT_OF_STOCK') {
      totalReorderCount++;
      if (reorderCountsBySheet[p.sheet] !== undefined) {
        reorderCountsBySheet[p.sheet]++;
      } else {
        reorderCountsBySheet[p.sheet] = 1;
      }
    }
  });

  const totalDebtorsOwed = (sales || [])
    .reduce((sum, sale) => sum + Math.max(0, Number(sale.balanceDue) || 0), 0);

  // Helper for recording audit events
  const logAuditAction = async (action: string, moduleName: string, details: string) => {
    let userName = 'System User';
    let roleName = 'STAFF';
    try {
      const rawUser = localStorage.getItem('eljindi_current_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.name) userName = parsed.name;
        if (parsed?.role) roleName = parsed.role;
      }
    } catch {
      // ignore
    }

    await api.addAuditLog({
      user: userName,
      role: roleName,
      action,
      module: moduleName,
      details,
      timestamp: new Date().toISOString()
    });
  };

  // Actions
  const handleSaveProduct = async (prod: Partial<Product>) => {
    const isEdit = !!prod.id;
    try {
      const result = await api.saveProduct(prod);
      await logAuditAction(
        isEdit ? 'MODIFY_INVENTORY' : 'ADD_INVENTORY',
        'Inventory',
        `${isEdit ? 'Updated' : 'Added'} catalog item "${result.desc}" (Code: ${result.code || 'N/A'}, Qty: ${result.qty}, Cost: GH₵ ${result.cost}, Sell: GH₵ ${result.sell})`
      );
      await refreshData();
      showToast(`Part "${result.desc}" saved successfully.`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product';
      showToast(message, 'error');
      throw error;
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const target = products.find((p) => p.id === id);
    await api.deleteProduct(id);
    await logAuditAction(
      'DELETE_INVENTORY',
      'Inventory',
      `Deleted inventory item #${id} "${target?.desc || 'Unknown'}" (Code: ${target?.code || 'N/A'})`
    );
    await refreshData();
    showToast('Part removed from inventory.', 'info');
    return true;
  };

  const handleSaveDebtor = async (d: Partial<DebtorRecord>) => {
    const isEdit = !!d.id;
    const result = await api.saveDebtor(d);
    // Optimistically update local state so dashboard reflects changes immediately
    setDebtors((prev) => {
      try {
        if (isEdit) return prev.map((x) => (x.id === result.id ? result : x));
        return [result, ...prev];
      } catch {
        return prev;
      }
    });
    await logAuditAction(
      isEdit ? 'UPDATE_TRANSACTION' : 'RECORD_DEBTOR',
      'Debtors',
      `${isEdit ? 'Updated' : 'Recorded'} credit transaction for customer "${result.customer}" (Item: ${result.item}, Price: GH₵ ${result.price}, Qty: ${result.qty})`
    );
    await refreshData();
    showToast(`Transaction for "${result.customer}" saved.`);
    return result;
  };

  const handleDeleteDebtor = async (id: number) => {
    const target = debtors.find((d) => d.id === id);
    await api.deleteDebtor(id);
    await logAuditAction(
      'DELETE_TRANSACTION',
      'Debtors',
      `Deleted debtor account transaction #${id} for customer "${target?.customer || 'Unknown'}" (Item: ${target?.item || 'N/A'})`
    );
    await refreshData();
    showToast('Debtor transaction removed.', 'info');
    return true;
  };

  const handleRecordSale = async (sale: Partial<SaleInvoice>) => {
    const result = await api.recordSale(sale);
    await logAuditAction(
      'RECORD_SALE',
      'POS Terminal',
      `Processed sales invoice #${result.invoiceNo} for customer "${result.customerName}" - Grand Total: GH₵ ${result.grandTotal} (${result.paymentMethod})`
    );
    await refreshData();
    showToast(`Sale Invoice ${result.invoiceNo} completed!`);
    return result;
  };

  const handleDeleteSale = async (id: string | number) => {
    const target = sales.find((sale) => String(sale.id) === String(id));
    await api.deleteSale(id);
    await logAuditAction(
      'DELETE_SALE',
      'POS Terminal',
      `Deleted sales invoice #${target?.invoiceNo || id} for customer "${target?.customerName || 'Unknown'}" - Grand Total: GH₵ ${target?.grandTotal || 0}`
    );
    await refreshData();
    showToast(`Sale Invoice ${target?.invoiceNo || id} deleted.`, 'info');
    return true;
  };

  const handleSaveSupplier = async (sup: Partial<Supplier>) => {
    const result = await api.saveSupplier(sup);
    await logAuditAction('SAVE_SUPPLIER', 'Purchasing', `Saved supplier profile "${result.name}"`);
    await refreshData();
    showToast(`Supplier "${result.name}" saved.`);
    return result;
  };

  const handleDeleteSupplier = async (id: number) => {
    const target = suppliers.find((s) => String(s.id) === String(id));
    await api.deleteSupplier(id);
    await logAuditAction('DELETE_SUPPLIER', 'Purchasing', `Removed supplier "${target?.name || id}"`);
    await refreshData();
    showToast('Supplier removed.', 'info');
    return true;
  };

  const handleSaveCustomer = async (cust: Partial<CustomerProfile>) => {
    const result = await api.saveCustomer(cust);
    setCustomers((prev) => {
      try {
        const index = prev.findIndex((c) => String(c.id) === String(result.id));
        if (index > -1) {
          const updated = [...prev];
          updated[index] = result;
          return updated;
        }
        return [result, ...prev];
      } catch {
        return prev;
      }
    });
    await logAuditAction('SAVE_CUSTOMER', 'Customers', `Saved customer profile "${result.name}"`);
    await refreshData();
    showToast(`Customer "${result.name}" saved.`);
    return result;
  };

  const handleDeleteCustomer = async (id: number) => {
    const target = customers.find((c) => String(c.id) === String(id));
    await api.deleteCustomer(id);
    await logAuditAction('DELETE_CUSTOMER', 'Customers', `Removed customer profile "${target?.name || id}"`);
    await refreshData();
    showToast('Customer removed.', 'info');
    return true;
  };

  const handleRecordPurchase = async (po: Partial<PurchaseOrder>) => {
    const result = await api.recordPurchase(po);
    await logAuditAction(
      'RECORD_PURCHASE',
      'Purchasing',
      `Saved purchase order #${result.poNo} for supplier "${result.supplierName}" - Status: ${result.status}`
    );
    await refreshData();
    showToast(`Purchase Order ${result.poNo} saved.`);
    return result;
  };

  const handleRecordExpense = async (
    expOrAmount: Partial<ExpenseRecord> | number,
    category?: string,
    description?: string,
    referenceNo?: string
  ) => {
    let payload: Partial<ExpenseRecord>;
    if (typeof expOrAmount === 'number') {
      payload = {
        amount: expOrAmount,
        category: category || 'OPERATIONS',
        description: description || 'General Expense',
        referenceNo,
        type: 'EXPENSE',
        date: new Date().toISOString().split('T')[0]
      };
    } else {
      payload = expOrAmount;
    }
    const result = await api.recordExpense(payload);
    await logAuditAction(
      'RECORD_CASHBOOK',
      'Cashbook',
      `Recorded cashbook ${result.type} entry (${result.category}): GH₵ ${result.amount} - "${result.description}"`
    );
    await refreshData();
    showToast(`Cashbook record saved.`);
    return result;
  };

  const handleRecordCustomerPayment = async (
    saleId: string | number,
    amount: number,
    customerName: string,
    notes?: string
  ) => {
    await api.recordExpense({
      date: new Date().toISOString().split('T')[0],
      type: 'INCOME',
      category: 'DEBT_PAYMENT',
      description: `Payment from ${customerName} (Ref: ${saleId}) ${notes ? '- ' + notes : ''}`,
      amount,
      referenceNo: String(saleId)
    });

    const sale = (sales || []).find((s) => s.id === saleId || s.invoiceNo === saleId);
    if (sale) {
      const updatedPaid = (sale.amountPaid || 0) + amount;
      const updatedBalance = Math.max(0, (sale.grandTotal || 0) - updatedPaid);
      await api.recordSale({
        ...sale,
        amountPaid: updatedPaid,
        balanceDue: updatedBalance,
        status: updatedBalance <= 0 ? 'COMPLETED' : 'CREDIT'
      });
    }

    await logAuditAction(
      'RECORD_DEBT_PAYMENT',
      'Debtors',
      `Received payment of GH₵ ${amount.toFixed(2)} from customer "${customerName}" for transaction/invoice #${saleId}`
    );

    await refreshData();
    showToast(`Payment of GH₵ ${amount.toFixed(2)} recorded for ${customerName}`);
  };

  const handleBulkImportProducts = async (
    prods: Partial<Product>[],
    mode: 'update' | 'skip' = 'update'
  ) => {
    const res = await api.bulkImportProducts(prods, mode);
    await logAuditAction(
      'BULK_IMPORT',
      'Inventory',
      `Executed bulk products import: ${res.countAdded} added, ${res.countUpdated} updated, ${res.countSkipped} skipped`
    );
    await refreshData();
    showToast(`Bulk Import: ${res.countAdded} added, ${res.countUpdated} updated, ${res.countSkipped} skipped.`);
    return res;
  };

  const handleBulkImportDebtors = async (
    debts: Partial<DebtorRecord>[],
    mode: 'skip' | 'update' = 'skip'
  ) => {
    const res = await api.bulkImportDebtors(debts, mode);
    await logAuditAction(
      'BULK_IMPORT',
      'Debtors',
      `Executed bulk debtors import: ${res.countAdded} added, ${res.countSkipped} skipped`
    );
    await refreshData();
    showToast(`Debtors Import: ${res.countAdded} added, ${res.countSkipped} duplicate(s) skipped.`);
    return res;
  };

  const handleUpdateSettings = async (s: Partial<SystemSettings>) => {
    const updated = await api.updateSettings(s);
    setSettings(updated);
    await logAuditAction('UPDATE_SETTINGS', 'Settings', `Updated company settings & global preferences.`);
    showToast('System Settings updated successfully.');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        products,
        debtors,
        suppliers,
        customers,
        purchases,
        purchaseOrders: purchases,
        sales,
        expenses,
        cashTransactions: expenses,
        auditLogs,
        stockMovements,
        settings,
        loading,
        toasts,
        showToast,
        refreshData,
        saveProduct: handleSaveProduct,
        deleteProduct: handleDeleteProduct,
        saveDebtor: handleSaveDebtor,
        deleteDebtor: handleDeleteDebtor,
        recordSale: handleRecordSale,
        deleteSale: handleDeleteSale,
        saveSupplier: handleSaveSupplier,
        deleteSupplier: handleDeleteSupplier,
        saveCustomer: handleSaveCustomer,
        deleteCustomer: handleDeleteCustomer,
        recordPurchase: handleRecordPurchase,
        createPurchaseOrder: handleRecordPurchase,
        recordExpense: handleRecordExpense,
        recordCustomerPayment: handleRecordCustomerPayment,
        bulkImportProducts: handleBulkImportProducts,
        bulkImportDebtors: handleBulkImportDebtors,
        updateSettings: handleUpdateSettings,
        logAuditAction,
        reorderCountsBySheet,
        totalReorderCount,
        totalStockValueCost,
        totalProfit,
        totalDebtorsOwed
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
