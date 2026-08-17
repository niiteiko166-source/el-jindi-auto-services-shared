export type SheetCategory = 'Filters' | 'Brakes' | 'Accessories' | 'Oil & Fluids' | string;

export type PriceTier = 'retail' | 'wholesale' | 'dealer' | 'vip';

export interface Product {
  id: number;
  sheet: SheetCategory;
  category: string;
  code: string;
  desc: string;
  position?: string;
  cost: number;
  sell: number;
  wholesalePrice?: number;
  dealerPrice?: number;
  vipPrice?: number;
  qty: number;
  sold: number;
  ret: number;
  reorder: number;
  location?: string;
  barcode?: string;
  brand?: string;
  oemNumber?: string;
  updatedAt?: string;
}

export interface ComputedProductStats {
  totalPurchaseCost: number;
  currentStock: number;
  revenue: number;
  profit: number;
  stockValueCost: number;
  stockValueSell: number;
  status: 'OK' | 'REORDER' | 'OUT_OF_STOCK';
}

export type StockMovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGED_ITEM'
  | 'INTERNAL_TRANSFER';

export interface StockMovement {
  id: string;
  itemId: number;
  itemCode: string;
  itemDesc: string;
  type: StockMovementType;
  qtyChange: number;
  previousStock: number;
  newStock: number;
  referenceNo?: string;
  notes?: string;
  userName: string;
  timestamp: string;
}

export interface DebtorRecord {
  id: number;
  date: string;
  customer: string;
  customerPhone?: string;
  item: string;
  qty: number;
  price: number;
  paid: number;
  itemId?: number | null;
  invoiceNo?: string;
  dueDate?: string;
  notes?: string;
}

export interface ComputedDebtor {
  amount: number;
  balance: number;
  status: 'PAID' | 'OUTSTANDING';
  daysOverdue: number | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  priceTier?: PriceTier;
  creditLimit?: number;
  notes?: string;
  createdAt?: string;
}

export type CustomerProfile = Customer;

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  outstandingBalance: number;
  notes?: string;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  itemId: number;
  itemCode?: string;
  itemDesc?: string;
  qtyOrdered: number;
  qtyReceived?: number;
  unitCost: number;
  totalCost?: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierId: number;
  supplierName: string;
  date: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount?: number;
  notes?: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CREDIT_SALE' | 'SPLIT';

export interface POSCartLine {
  itemId: number;
  sheet: SheetCategory;
  desc: string;
  code: string;
  price: number;
  tier: PriceTier;
  qty: number;
  maxStock: number;
  discountPct?: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  cashier: string;
  paymentMethod: PaymentMethod;
  splitDetails?: {
    cash: number;
    card: number;
    momo: number;
    credit: number;
  };
  items: Array<{
    itemId: number;
    code: string;
    desc: string;
    sheet: string;
    qty: number;
    unitPrice: number;
    discountPct: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: 'COMPLETED' | 'PARTIAL' | 'CREDIT' | 'REFUNDED';
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  referenceNo?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export type UserRole = 'ADMIN' | 'INVENTORY_MANAGER' | 'POS_CASHIER' | 'SALES_REP' | 'ACCOUNTANT';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  active: boolean;
  avatarUrl?: string;
}

export interface SystemSettings {
  companyName: string;
  tagline: string;
  branch: string;
  address: string;
  phone: string;
  email: string;
  tinNumber: string;
  currency: string;
  currencySymbol: string;
  enableVat: boolean;
  vatRate: number; // e.g. 15 for 15%
  receiptHeader: string;
  receiptFooter: string;
  lowStockGlobalThreshold: number;
}
