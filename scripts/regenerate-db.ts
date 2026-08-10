import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS, INITIAL_DEBTORS, INITIAL_SUPPLIERS, INITIAL_CUSTOMERS, INITIAL_SETTINGS } from '../src/data/seedData.ts';

function normalizeKey(value: any) {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).trim().toLowerCase() || null;
}

function dedupeArray<T>(items: T[], keyFn: (item: T) => string | null) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (key === null) {
      return true;
    }
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function assertNoDuplicates<T>(items: T[], keyFn: (item: T) => string | null, label: string) {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (key === null) continue;
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }
  if (duplicates.length) {
    throw new Error(`Found duplicate ${label} values: ${duplicates.join(', ')}`);
  }
}

const dbPath = path.resolve(process.cwd(), 'data', 'db.json');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const existingState = fs.existsSync(dbPath)
  ? JSON.parse(fs.readFileSync(dbPath, 'utf8'))
  : {};

const products = dedupeArray(
  INITIAL_PRODUCTS.map((product) => ({ ...product })),
  (product) => normalizeKey((product as any).id)
);

assertNoDuplicates(products, (product) => normalizeKey((product as any).id), 'product id');
assertNoDuplicates(products, (product) => normalizeKey((product as any).code), 'product code');

const state = {
  products,
  debtors: existingState.debtors ?? [],
  suppliers: existingState.suppliers ?? INITIAL_SUPPLIERS,
  customers: existingState.customers ?? [],
  stockMovements: existingState.stockMovements ?? [],
  salesInvoices: existingState.salesInvoices ?? [],
  purchaseOrders: existingState.purchaseOrders ?? [],
  expenses: existingState.expenses ?? [],
  auditLogs: existingState.auditLogs ?? [
    {
      id: 'log-1',
      user: 'System',
      role: 'SYSTEM',
      action: 'REGENERATE_DB',
      module: 'System',
      details: 'Regenerated data/db.json from seed data.',
      timestamp: new Date().toISOString()
    }
  ],
  settings: existingState.settings ?? INITIAL_SETTINGS
};

fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), 'utf8');
console.log(`Rewrote ${dbPath} with ${products.length} products.`);
