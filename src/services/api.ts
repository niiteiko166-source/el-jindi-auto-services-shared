import {
  Product,
  DebtorRecord,
  Supplier,
  Customer,
  PurchaseOrder,
  SaleInvoice,
  ExpenseRecord,
  AuditLog,
  StockMovement,
  SystemSettings,
  User
} from '../types';
import { INITIAL_SETTINGS } from '../data/seedData';

const BASE_URL = '/api';
const AUTH_TOKEN_KEY = 'eljindi_auth_token';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function fetchWithAuth(url: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers || {});
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...opts, headers });
  if (response.status === 401) {
    clearAuthToken();
  }
  return response;
}

// Helper for local storage fallback
function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`eljindi_${key}`);
    const data = raw ? JSON.parse(raw) : fallback;
    if (Array.isArray(data)) {
      const seen = new Set<string>();
      return data.filter((item: any) => {
        if (!item || item.id === undefined) return true;
        const idStr = String(item.id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      }) as unknown as T;
    }
    return data;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`eljindi_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to set localStorage', e);
  }
}

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetchWithAuth(`${BASE_URL}/products`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to fetch products (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as Product[];
    setLocal('products', data);
    return data;
  },

  async saveProduct(prod: Partial<Product>): Promise<Product> {
    const isEdit = !!prod.id;
    const url = isEdit ? `${BASE_URL}/products/${prod.id}` : `${BASE_URL}/products`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prod)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to save product (${res.status})`;
      throw new Error(errorMessage);
    }
    const saved = body as Product;
    const current = getLocal<Product[]>('products', []);
    if (isEdit) {
      const idx = current.findIndex((p) => p.id === saved.id);
      if (idx > -1) current[idx] = saved;
    } else {
      current.push(saved);
    }
    setLocal('products', current);
    return saved;
  },

  async deleteProduct(id: number): Promise<boolean> {
    const res = await fetchWithAuth(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      console.warn('API deleteProduct failed', res.statusText);
      return false;
    }
    const current = getLocal<Product[]>('products', []).filter((p) => p.id !== id);
    setLocal('products', current);
    return true;
  },

  async bulkImportProducts(
    products: Partial<Product>[],
    mode: 'update' | 'skip' = 'update'
  ): Promise<{ countAdded: number; countUpdated: number; countSkipped: number }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/products/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, mode })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('API bulk import failed');
    }
    return { countAdded: 0, countUpdated: 0, countSkipped: 0 };
  },

  async bulkImportDebtors(
    debtors: Partial<DebtorRecord>[],
    mode: 'skip' | 'update' = 'skip'
  ): Promise<{ countAdded: number; countSkipped: number }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/debtors/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtors, mode })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('API bulkImportDebtors failed');
    }
    return { countAdded: 0, countSkipped: 0 };
  },

  // Debtors
  async getDebtors(): Promise<DebtorRecord[]> {
    const res = await fetchWithAuth(`${BASE_URL}/debtors`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to fetch debtors (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as DebtorRecord[];
    setLocal('debtors', data);
    return data;
  },

  async saveDebtor(d: Partial<DebtorRecord>): Promise<DebtorRecord> {
    const isEdit = !!d.id;
    const url = isEdit ? `${BASE_URL}/debtors/${d.id}` : `${BASE_URL}/debtors`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to save debtor (${res.status})`;
      throw new Error(errorMessage);
    }
    const saved = body as DebtorRecord;
    const current = getLocal<DebtorRecord[]>('debtors', []);
    if (isEdit) {
      const idx = current.findIndex((x) => x.id === saved.id);
      if (idx > -1) current[idx] = saved;
    } else {
      current.unshift(saved);
    }
    setLocal('debtors', current);
    return saved;
  },

  async deleteDebtor(id: number): Promise<boolean> {
    const res = await fetchWithAuth(`${BASE_URL}/debtors/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to delete debtor (${res.status})`;
      throw new Error(errorMessage);
    }
    const current = getLocal<DebtorRecord[]>('debtors', []).filter((x) => x.id !== id);
    setLocal('debtors', current);
    return true;
  },

  // Sales (POS)
  async getSales(): Promise<SaleInvoice[]> {
    const res = await fetchWithAuth(`${BASE_URL}/sales`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to fetch sales (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as SaleInvoice[];
    setLocal('sales', data);
    return data;
  },

  async recordSale(sale: Partial<SaleInvoice>): Promise<SaleInvoice> {
    const res = await fetchWithAuth(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to record sale (${res.status})`;
      throw new Error(errorMessage);
    }
    const saved = body as SaleInvoice;
    const sales = getLocal<SaleInvoice[]>('sales', []);
    sales.unshift(saved);
    setLocal('sales', sales);
    return saved;
  },

  async deleteSale(id: string | number): Promise<boolean> {
    const res = await fetchWithAuth(`${BASE_URL}/sales/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to delete sale (${res.status})`;
      throw new Error(errorMessage);
    }
    const current = getLocal<SaleInvoice[]>('sales', []).filter((sale) => String(sale.id) !== String(id));
    setLocal('sales', current);
    return true;
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetchWithAuth(`${BASE_URL}/suppliers`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to fetch suppliers (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as Supplier[];
    setLocal('suppliers', data);
    return data;
  },

  async saveSupplier(sup: Partial<Supplier>): Promise<Supplier> {
    const res = await fetchWithAuth(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sup)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error || `Failed to save supplier (${res.status})`;
      throw new Error(message);
    }
    return res.json();
  },

  async deleteSupplier(id: number): Promise<boolean> {
    const res = await fetchWithAuth(`${BASE_URL}/suppliers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      console.warn('API deleteSupplier failed', res.statusText);
      return false;
    }
    const current = getLocal<Supplier[]>('suppliers', []).filter((s) => Number(s.id) !== id);
    setLocal('suppliers', current);
    return true;
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetchWithAuth(`${BASE_URL}/customers`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to fetch customers (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as Customer[];
    setLocal('customers', data);
    return data;
  },

  async saveCustomer(cust: Partial<Customer>): Promise<Customer> {
    const isEdit = !!cust.id;
    const url = isEdit ? `${BASE_URL}/customers/${cust.id}` : `${BASE_URL}/customers`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to save customer (${res.status})`;
      throw new Error(errorMessage);
    }
    const saved = body as Customer;
    const current = getLocal<Customer[]>('customers', []);
    if (isEdit) {
      const idx = current.findIndex((c) => String(c.id) === String(saved.id));
      if (idx > -1) {
        current[idx] = saved;
      } else {
        current.push(saved);
      }
    } else {
      current.push(saved);
    }
    setLocal('customers', current);
    return saved;
  },

  async deleteCustomer(id: number): Promise<boolean> {
    const res = await fetchWithAuth(`${BASE_URL}/customers/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to delete customer (${res.status})`;
      throw new Error(errorMessage);
    }
    const current = getLocal<Customer[]>('customers', []).filter((c) => Number(c.id) !== id);
    setLocal('customers', current);
    return true;
  },

  // Purchases
  async getPurchases(): Promise<PurchaseOrder[]> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/purchases`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getPurchases failed');
    }
    return getLocal('purchases', []);
  },

  async recordPurchase(po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(po)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API recordPurchase failed');
    }
    const current = getLocal<PurchaseOrder[]>('purchases', []);
    const saved: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNo: po.poNo || `PO-${Math.floor(10000 + Math.random() * 90000)}`,
      supplierId: Number(po.supplierId) || 1,
      supplierName: po.supplierName || 'General Supplier',
      date: po.date || new Date().toISOString().split('T')[0],
      status: po.status || 'ORDERED',
      items: po.items || [],
      totalAmount: po.totalAmount || 0,
      paidAmount: po.paidAmount || 0
    };
    current.unshift(saved);
    setLocal('purchases', current);
    return saved;
  },

  // Expenses & Cashbook
  async getExpenses(): Promise<ExpenseRecord[]> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/expenses`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getExpenses failed');
    }
    return getLocal('expenses', []);
  },

  async recordExpense(exp: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exp)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API recordExpense failed');
    }
    const current = getLocal<ExpenseRecord[]>('expenses', []);
    const saved: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: exp.date || new Date().toISOString().split('T')[0],
      type: exp.type || 'EXPENSE',
      category: exp.category || 'OPERATIONS',
      description: exp.description || 'General Expense',
      amount: Number(exp.amount) || 0,
      paymentMethod: exp.paymentMethod || 'CASH',
      timestamp: new Date().toISOString()
    };
    current.unshift(saved);
    setLocal('expenses', current);
    return saved;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/audit-logs`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getAuditLogs failed');
    }
    return getLocal('auditLogs', []);
  },

  async addAuditLog(log: Partial<AuditLog>): Promise<void> {
    try {
      await fetchWithAuth(`${BASE_URL}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    } catch (e) {
      console.warn('API addAuditLog failed');
    }
  },

  // Stock Movements
  async getStockMovements(): Promise<StockMovement[]> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/stock-movements`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getStockMovements failed');
    }
    return getLocal('stockMovements', []);
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetchWithAuth(`${BASE_URL}/settings`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Failed to fetch settings (${res.status})`);
    }
    return await res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetchWithAuth(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMessage = body?.error || `Failed to update settings (${res.status})`;
      throw new Error(errorMessage);
    }
    const data = body as SystemSettings;
    setLocal('settings', data);
    return data;
  },

  async login(username: string, password: string): Promise<User> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.token || !body?.user) {
      const errorMessage = body?.error || `Failed to authenticate (${res.status})`;
      throw new Error(errorMessage);
    }
    setAuthToken(body.token);
    return body.user as User;
  },

  async getMe(): Promise<User> {
    const res = await fetchWithAuth(`${BASE_URL}/auth/me`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.user) {
      const errorMessage = body?.error || `Failed to fetch authenticated user (${res.status})`;
      throw new Error(errorMessage);
    }
    return body.user as User;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetchWithAuth(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error || `Failed to change PIN (${res.status})`);
    }
  },

  async adminResetPassword(username: string, newPassword: string): Promise<void> {
    const res = await fetchWithAuth(`${BASE_URL}/auth/admin-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword })
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error || `Failed to reset PIN (${res.status})`);
    }
  },

  async createUser(user: {
    username: string;
    name: string;
    email: string;
    role: string;
    pin: string;
    active: boolean;
  }): Promise<User> {
    const res = await fetchWithAuth(`${BASE_URL}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.user) {
      throw new Error(body?.error || `Failed to create user (${res.status})`);
    }
    return body.user as User;
  },

  logout(): void {
    clearAuthToken();
  }
};
