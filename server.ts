import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config';
import { createBackup } from './server/backup';
import { logError, logInfo } from './server/logger';
import { createPasswordHash, createRefreshToken, createToken, generateMfaSecret, generateTotpCode, requireAuth, requireModuleAccess, requireRole, verifyPassword, verifyRefreshToken, verifyTotp } from './server/auth';
import { ensureDefaultSeed, getDatabase } from './server/database';
import { createBusinessStore } from './server/businessStore';
import { INITIAL_PRODUCTS, INITIAL_SUPPLIERS, INITIAL_SETTINGS } from './src/data/seedData.js';

const app = express();
const PORT = Number(process.env.PORT || config.port || 3000);

app.use(express.json({ limit: '10mb' }));
app.use('/api', async (req, res, next) => {
  if (req.method === 'GET') {
    try {
      await refreshDatabaseFromStore();
    } catch (error) {
      console.error('Failed to refresh database state for GET request', error);
    }
  }
  next();
});

// Persistence file location
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const dbConnection = getDatabase();
const businessStore = createBusinessStore(config.businessStorePath);

interface LocalDB {
  products: any[];
  debtors: any[];
  suppliers: any[];
  customers: any[];
  stockMovements: any[];
  salesInvoices: any[];
  purchaseOrders: any[];
  expenses: any[];
  auditLogs: any[];
  settings: any;
}

let db: LocalDB = {
  products: [...INITIAL_PRODUCTS],
  debtors: [],
  suppliers: [...INITIAL_SUPPLIERS],
  customers: [],
  stockMovements: [],
  salesInvoices: [],
  purchaseOrders: [],
  expenses: [],
  auditLogs: [
    {
      id: 'log-1',
      user: 'Admin',
      role: 'ADMIN',
      action: 'SYSTEM_BOOT',
      module: 'System',
      details: 'El-Jindi Enterprise Auto Management system initialized successfully.',
      timestamp: new Date().toISOString()
    }
  ],
  settings: { ...INITIAL_SETTINGS }
};

// Initialize or Load DB File
function sanitizeDbArrays(dbObj: LocalDB): LocalDB {
  for (const key of Object.keys(dbObj) as (keyof LocalDB)[]) {
    if (Array.isArray(dbObj[key])) {
      const seen = new Set<string>();
      (dbObj[key] as any[]) = (dbObj[key] as any[]).filter((item) => {
        if (!item || item.id === undefined) return true;
        const idStr = String(item.id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });
    }
  }
  return dbObj;
}

async function loadDatabase() {
  try {
    const loaded = await businessStore.loadState();
    db = sanitizeDbArrays({ ...db, ...loaded });
    console.log('Database loaded successfully from database store.');
  } catch (err) {
    console.error('Error loading database store, utilizing memory state:', err);
    logError('Failed to load main database', { error: String(err) });
  }
}

async function refreshDatabaseFromStore() {
  try {
    const loaded = await businessStore.loadState();
    db = sanitizeDbArrays({ ...db, ...loaded });
  } catch (err) {
    console.error('Error refreshing database store', err);
  }
}

async function saveDatabase() {
  try {
    const normalized = sanitizeDbArrays({ ...db });
    db = normalized;
    await businessStore.saveState(normalized);
    logInfo('Database saved successfully', { store: config.databaseFile });
  } catch (err) {
    console.error('Error writing database store:', err);
    logError('Failed to write database store', { error: String(err) });
  }
}

void loadDatabase();
void ensureDefaultSeed();

// --- API ENDPOINTS ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', company: db.settings.companyName, productCount: db.products.length });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, mfaCode } = req.body;
    const result = await dbConnection.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash) || user.active !== 1) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const mfaSecret = user.mfa_secret || null;
    if (mfaSecret && !mfaCode) {
      return res.status(401).json({ error: 'MFA required' });
    }

    if (mfaSecret && !verifyTotp(mfaSecret, String(mfaCode || ''))) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    const token = createToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      active: Boolean(user.active)
    });
    const refreshToken = createRefreshToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      active: Boolean(user.active)
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: String(user.id),
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        active: Boolean(user.active)
      }
    });
  } catch (error) {
    logError('Authentication failed', { error });
    res.status(500).json({ error: 'Authentication error' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Missing refresh token' });
  }

  const user = verifyRefreshToken(refreshToken);
  if (!user) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const token = createToken(user);
  res.json({ token });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await dbConnection.query('SELECT id FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await dbConnection.query('UPDATE users SET password_hash = $1 WHERE id = $2', [createPasswordHash(newPassword), user.id]);
  res.json({ success: true });
});

app.post('/api/auth/mfa/setup', requireAuth, async (req: any, res) => {
  const secret = generateMfaSecret();
  await dbConnection.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, req.user.id]);
  res.json({ secret, otpauthUrl: `otpauth://totp/ElJindi:${req.user.username}?secret=${secret}` });
});

app.post('/api/auth/mfa/verify', requireAuth, async (req: any, res) => {
  const { code } = req.body;
  const result = await dbConnection.query('SELECT mfa_secret FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user?.mfa_secret || !verifyTotp(user.mfa_secret, String(code || ''))) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await dbConnection.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  await dbConnection.query('UPDATE users SET password_hash = $1 WHERE id = $2', [createPasswordHash(newPassword), req.user.id]);
  res.json({ success: true });
});

app.post('/api/auth/admin-reset-password', requireAuth, requireRole(['ADMIN']), async (req: any, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new PIN are required' });
  }

  const result = await dbConnection.query('SELECT id FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await dbConnection.query('UPDATE users SET password_hash = $1 WHERE id = $2', [createPasswordHash(newPassword), user.id]);
  res.json({ success: true });
});

// Settings
app.get('/api/settings', requireAuth, requireModuleAccess('settings'), (req, res) => {
  res.json(db.settings);
});

app.put('/api/settings', requireAuth, requireModuleAccess('settings'), (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  saveDatabase();
  res.json(db.settings);
});

function isPartCodeRequired(sheet?: string) {
  return sheet !== 'Accessories' && sheet !== 'Oil & Fluids';
}

function validateProductInput(product: any) {
  const sheet = product?.sheet || '';
  if (!product?.desc || !String(product.desc).trim()) {
    return { valid: false, error: 'Description is required.' };
  }

  if (isPartCodeRequired(sheet) && !product?.code?.toString().trim()) {
    return {
      valid: false,
      error: 'Part Code / OEM No. is required for this category. It is not required only for Accessories or Oil & Fluids.'
    };
  }

  return { valid: true };
}

function normalizeProductKey(value: any) {
  return value ? String(value).trim().toLowerCase() : '';
}

function findDuplicateProduct(product: any, excludeId?: number) {
  const code = normalizeProductKey(product.code);
  const desc = normalizeProductKey(product.desc);
  const sheet = normalizeProductKey(product.sheet);
  const barcode = normalizeProductKey(product.barcode);

  return db.products.find((p) => {
    if (excludeId && p.id === excludeId) {
      return false;
    }

    const existingCode = normalizeProductKey(p.code);
    if (code && existingCode && code === existingCode) {
      return true;
    }

    const existingBarcode = normalizeProductKey(p.barcode);
    if (barcode && existingBarcode && barcode === existingBarcode) {
      return true;
    }

    const existingDesc = normalizeProductKey(p.desc);
    const existingSheet = normalizeProductKey(p.sheet);
    if (desc && existingDesc && desc === existingDesc && sheet && existingSheet === sheet) {
      return true;
    }

    return false;
  });
}

// Products / Inventory
app.get('/api/products', requireAuth, requireModuleAccess('inventory'), (req, res) => {
  res.json(db.products);
});

app.post('/api/products', requireAuth, requireModuleAccess('inventory'), (req, res) => {
  const newProduct = req.body;
  const validation = validateProductInput(newProduct);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const duplicate = findDuplicateProduct(newProduct);
  if (duplicate) {
    return res.status(409).json({ error: 'Duplicate product exists with same code, barcode, or description within the same category.' });
  }

  if (!newProduct.id) {
    const maxId = db.products.reduce((max, p) => (p.id > max ? p.id : max), 0);
    newProduct.id = maxId + 1;
  }
  newProduct.updatedAt = new Date().toISOString();
  db.products.push(newProduct);

  // Add stock movement log if initial qty > 0
  if (newProduct.qty > 0) {
    db.stockMovements.unshift({
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      itemId: newProduct.id,
      itemCode: newProduct.code || 'N/A',
      itemDesc: newProduct.desc,
      type: 'PURCHASE_RECEIPT',
      qtyChange: newProduct.qty,
      previousStock: 0,
      newStock: newProduct.qty,
      referenceNo: 'INIT-ADD',
      notes: 'Initial Stock Entry',
      userName: 'System Admin',
      timestamp: new Date().toISOString()
    });
  }

  saveDatabase();
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAuth, requireModuleAccess('inventory'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const oldProduct = db.products[index];
  const updatedProduct = { ...oldProduct, ...req.body, updatedAt: new Date().toISOString() };
  const validation = validateProductInput(updatedProduct);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const duplicate = findDuplicateProduct(updatedProduct, id);
  if (duplicate) {
    return res.status(409).json({ error: 'Duplicate product exists with same code, barcode, or description within the same category.' });
  }

  db.products[index] = updatedProduct;

  saveDatabase();
  res.json(updatedProduct);
});

app.delete('/api/products/:id', requireAuth, requireModuleAccess('inventory'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.products = db.products.filter((p) => p.id !== id);
  saveDatabase();
  res.json({ success: true, id });
});

// Bulk Import Products (With Strict Duplicate Handling)
app.post('/api/products/bulk', requireAuth, requireModuleAccess('inventory'), (req, res) => {
  const body = req.body;
  const productsArray = Array.isArray(body) ? body : (body && Array.isArray(body.products) ? body.products : []);
  const mode = (body && body.mode) || 'update'; // 'update' or 'skip'

  if (!Array.isArray(productsArray)) {
    return res.status(400).json({ error: 'Expected array of products' });
  }

  let countAdded = 0;
  let countUpdated = 0;
  let countSkipped = 0;

  productsArray.forEach((item) => {
    if (!item) return;

    const itemCode = item.code ? item.code.trim().toLowerCase() : '';
    const itemDesc = item.desc ? item.desc.trim().toLowerCase() : '';
    const itemBarcode = item.barcode ? item.barcode.trim().toLowerCase() : '';

    const existingIndex = db.products.findIndex((p) => {
      const pCode = p.code ? p.code.trim().toLowerCase() : '';
      const pDesc = p.desc ? p.desc.trim().toLowerCase() : '';
      const pBarcode = p.barcode ? p.barcode.trim().toLowerCase() : '';

      if (itemCode && pCode && itemCode === pCode) return true;
      if (itemBarcode && pBarcode && itemBarcode === pBarcode) return true;
      if (itemDesc && pDesc && itemDesc === pDesc && p.sheet === item.sheet) return true;
      return false;
    });

    if (existingIndex > -1) {
      if (mode === 'skip') {
        countSkipped++;
      } else {
        // Update existing record
        db.products[existingIndex] = {
          ...db.products[existingIndex],
          ...item,
          // Preserve ID and existing metrics if not supplied
          id: db.products[existingIndex].id,
          cost: item.cost !== undefined ? Number(item.cost) : db.products[existingIndex].cost,
          sell: item.sell !== undefined ? Number(item.sell) : db.products[existingIndex].sell,
          qty: item.qty !== undefined ? Number(item.qty) : db.products[existingIndex].qty,
          updatedAt: new Date().toISOString()
        };
        countUpdated++;
      }
    } else {
      const maxId = db.products.reduce((max, p) => (p.id > max ? p.id : max), 0);
      const newProd = {
        id: maxId + 1,
        sheet: item.sheet || 'Filters',
        category: item.category || 'GENERAL',
        code: item.code || '',
        desc: item.desc || 'Imported Product',
        position: item.position || '',
        cost: Number(item.cost) || 0,
        sell: Number(item.sell) || 0,
        qty: Number(item.qty) || 0,
        sold: Number(item.sold) || 0,
        ret: Number(item.ret) || 0,
        reorder: Number(item.reorder) || 3,
        wholesalePrice: Number(item.wholesalePrice) || Number(item.sell) || 0,
        dealerPrice: Number(item.dealerPrice) || Number(item.sell) || 0,
        location: item.location || '',
        barcode: item.barcode || '',
        updatedAt: new Date().toISOString()
      };
      db.products.push(newProd);
      countAdded++;
    }
  });

  saveDatabase();
  res.json({ success: true, countAdded, countUpdated, countSkipped, total: db.products.length });
});

// Stock Movements
app.get('/api/stock-movements', requireAuth, (req, res) => {
  res.json(db.stockMovements);
});

app.post('/api/stock-movements', requireAuth, (req, res) => {
  const movement = {
    id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    timestamp: new Date().toISOString(),
    ...req.body
  };

  db.stockMovements.unshift(movement);

  // Apply to product
  const product = db.products.find((p) => p.id === movement.itemId);
  if (product) {
    if (movement.type === 'SALE' || movement.type === 'DAMAGED_ITEM' || movement.type === 'SUPPLIER_RETURN') {
      product.sold = (product.sold || 0) + Math.abs(movement.qtyChange);
    } else if (movement.type === 'PURCHASE_RECEIPT') {
      product.qty = (product.qty || 0) + Math.abs(movement.qtyChange);
    } else if (movement.type === 'CUSTOMER_RETURN') {
      product.ret = (product.ret || 0) + Math.abs(movement.qtyChange);
    }
    product.updatedAt = new Date().toISOString();
  }

  saveDatabase();
  res.status(201).json(movement);
});

// POS Sales / Invoices
app.get('/api/sales', requireAuth, (req, res) => {
  res.json(db.salesInvoices);
});

app.post('/api/sales', requireAuth, requireModuleAccess('pos'), (req, res) => {
  const sale = req.body;
  if (!sale.id) {
    sale.id = `inv-${Date.now()}`;
  }
  if (!sale.invoiceNo) {
    sale.invoiceNo = `INV-${String(db.salesInvoices.length + 1001).padStart(5, '0')}`;
  }

  const now = new Date();
  if (!sale.date) {
    sale.date = now.toISOString().split('T')[0];
  }
  if (!sale.time) {
    sale.time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  db.salesInvoices.unshift(sale);

  // Deduct stock for each line item
  if (Array.isArray(sale.items)) {
    sale.items.forEach((line: any) => {
      const p = db.products.find((item) => item.id === line.itemId);
      if (p) {
        p.sold = (p.sold || 0) + line.qty;
        p.updatedAt = new Date().toISOString();

        db.stockMovements.unshift({
          id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          itemId: p.id,
          itemCode: p.code || 'N/A',
          itemDesc: p.desc,
          type: 'SALE',
          qtyChange: -line.qty,
          previousStock: p.qty - (p.sold - line.qty) + p.ret,
          newStock: p.qty - p.sold + p.ret,
          referenceNo: sale.invoiceNo,
          notes: `POS Sale to ${sale.customerName || 'Walk-in'}`,
          userName: sale.cashier || 'Cashier',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // If partial / credit sale, add to debtors automatically
  if (sale.balanceDue > 0) {
    const nextDebtorId = db.debtors.reduce((max, d) => (d.id > max ? d.id : max), 0) + 1;
    const debtorEntry = {
      id: nextDebtorId,
      date: sale.date || new Date().toISOString().split('T')[0],
      customer: sale.customerName || 'Walk-in Customer',
      item: `Invoice #${sale.invoiceNo} (${sale.items.length} items)`,
      qty: 1,
      price: sale.grandTotal,
      paid: sale.amountPaid,
      invoiceNo: sale.invoiceNo,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `Auto-created from POS Sale #${sale.invoiceNo}`
    };
    db.debtors.unshift(debtorEntry);
  }

  // Add Income Cashbook Record
  if (sale.amountPaid > 0) {
    db.expenses.unshift({
      id: `exp-${Date.now()}`,
      date: sale.date || new Date().toISOString().split('T')[0],
      type: 'INCOME',
      category: 'SALES',
      description: `POS Direct Sale #${sale.invoiceNo} (${sale.customerName})`,
      amount: sale.amountPaid,
      paymentMethod: sale.paymentMethod || 'CASH',
      reference: sale.invoiceNo,
      recordedBy: sale.cashier || 'Cashier'
    });
  }

  saveDatabase();
  res.status(201).json(sale);
});

app.delete('/api/sales/:id', requireAuth, requireRole(['ADMIN']), async (req: any, res) => {
  const saleId = req.params.id;
  const saleIndex = db.salesInvoices.findIndex(
    (sale) => String(sale.id) === String(saleId) || String(sale.invoiceNo) === String(saleId)
  );
  if (saleIndex === -1) {
    return res.status(404).json({ error: 'Sale invoice not found' });
  }

  const sale = db.salesInvoices[saleIndex];
  const saleIdText = String(sale.id || saleId);
  const invoiceNo = String(sale.invoiceNo || '');

  // Restore stock and remove the movements created for this invoice.
  if (Array.isArray(sale.items)) {
    sale.items.forEach((line: any) => {
      const product = db.products.find((item) => item.id === line.itemId);
      if (product) {
        product.sold = Math.max(0, (product.sold || 0) - (Number(line.qty) || 0));
        product.updatedAt = new Date().toISOString();
      }
    });
  }
  db.stockMovements = db.stockMovements.filter((movement) => String(movement.referenceNo || '') !== invoiceNo);

  // Remove records generated alongside the invoice.
  db.debtors = db.debtors.filter((debtor) => String(debtor.invoiceNo || '') !== invoiceNo);
  db.expenses = db.expenses.filter((expense) => {
    const reference = String(expense.reference || '');
    const referenceNo = String(expense.referenceNo || '');
    const description = String(expense.description || '');
    return !(
      reference === invoiceNo ||
      reference === saleIdText ||
      referenceNo === invoiceNo ||
      referenceNo === saleIdText ||
      description.includes(`POS Direct Sale #${invoiceNo}`)
    );
  });
  db.salesInvoices.splice(saleIndex, 1);

  await saveDatabase();
  await dbConnection.query(
    `INSERT INTO audit_logs (user_name, role, action, module, details, timestamp)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      req.user?.name || 'System Administrator',
      req.user?.role || 'ADMIN',
      'DELETE_SALE',
      'POS Terminal',
      `Deleted invoice #${invoiceNo}; cashbook income, AR records, stock movements, and product sold quantities were reversed.`
    ]
  ).catch(() => undefined);
  res.json({ success: true, id: saleId });
});

// Debtors (AR)
app.get('/api/debtors', requireAuth, requireModuleAccess('debtors'), (req, res) => {
  res.json(db.debtors);
});

// Bulk Import Debtors (With Duplicate Detection)
app.post('/api/debtors/bulk', requireAuth, (req, res) => {
  const body = req.body;
  const debtorsArray = Array.isArray(body) ? body : (body && Array.isArray(body.debtors) ? body.debtors : []);
  const mode = (body && body.mode) || 'skip'; // default skip duplicates for debtors

  if (!Array.isArray(debtorsArray)) {
    return res.status(400).json({ error: 'Expected array of debtor records' });
  }

  let countAdded = 0;
  let countSkipped = 0;

  debtorsArray.forEach((item) => {
    if (!item || !item.customer || !item.item) return;

    const cust = String(item.customer).trim().toLowerCase();
    const itemDesc = String(item.item).trim().toLowerCase();
    const date = item.date || new Date().toISOString().split('T')[0];
    const price = Number(item.price) || 0;

    const exists = db.debtors.some((d) => {
      return (
        String(d.customer).trim().toLowerCase() === cust &&
        String(d.item).trim().toLowerCase() === itemDesc &&
        d.date === date &&
        Math.abs((Number(d.price) || 0) - price) < 0.01
      );
    });

    if (exists) {
      countSkipped++;
    } else {
      const maxId = db.debtors.reduce((max, x) => (x.id > max ? x.id : max), 0);
      const newDebtor = {
        id: maxId + 1,
        date: date,
        customer: item.customer,
        item: item.item,
        qty: Number(item.qty) || 1,
        price: price,
        paid: Number(item.paid) || 0,
        notes: item.notes || 'Bulk HTML / CSV Imported',
        invoiceNo: item.invoiceNo || ''
      };
      db.debtors.unshift(newDebtor);
      countAdded++;
    }
  });

  saveDatabase();
  res.json({ success: true, countAdded, countSkipped, total: db.debtors.length });
});

app.post('/api/debtors', requireAuth, requireModuleAccess('debtors'), (req, res) => {
  const d = req.body;
  if (!d.id) {
    const maxId = db.debtors.reduce((max, x) => (x.id > max ? x.id : max), 0);
    d.id = maxId + 1;
  }
  db.debtors.unshift(d);

  // If linked to product, deduct stock
  if (d.itemId) {
    const p = db.products.find((item) => item.id === d.itemId);
    if (p) {
      p.sold = (p.sold || 0) + d.qty;
      p.updatedAt = new Date().toISOString();

      db.stockMovements.unshift({
        id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        itemId: p.id,
        itemCode: p.code || 'N/A',
        itemDesc: p.desc,
        type: 'SALE',
        qtyChange: -d.qty,
        previousStock: p.qty - (p.sold - d.qty) + p.ret,
        newStock: p.qty - p.sold + p.ret,
        referenceNo: `AR-DEBT-${d.id}`,
        notes: `Credit Sale to ${d.customer}`,
        userName: 'Admin',
        timestamp: new Date().toISOString()
      });
    }
  }

  saveDatabase();
  res.status(201).json(d);
});

app.put('/api/debtors/:id', requireAuth, requireModuleAccess('debtors'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = db.debtors.findIndex((x) => x.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Debtor record not found' });
  }

  const old = db.debtors[index];
  const updated = { ...old, ...req.body };

  // Reconcile stock if qty changed on linked item
  if (old.itemId) {
    const p = db.products.find((item) => item.id === old.itemId);
    if (p) {
      const diff = updated.qty - old.qty;
      p.sold = (p.sold || 0) + diff;
      p.updatedAt = new Date().toISOString();
    }
  }

  db.debtors[index] = updated;
  saveDatabase();
  res.json(updated);
});

app.delete('/api/debtors/:id', requireAuth, requireModuleAccess('debtors'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.debtors.find((x) => x.id === id);
  if (existing && existing.itemId) {
    const p = db.products.find((item) => item.id === existing.itemId);
    if (p) {
      p.sold = Math.max(0, (p.sold || 0) - existing.qty);
      p.updatedAt = new Date().toISOString();
    }
  }

  db.debtors = db.debtors.filter((x) => x.id !== id);
  saveDatabase();
  res.json({ success: true, id });
});

// Suppliers
app.get('/api/suppliers', requireAuth, requireModuleAccess('suppliers'), (req, res) => {
  res.json(db.suppliers);
});

app.post('/api/suppliers', requireAuth, requireModuleAccess('suppliers'), (req, res) => {
  const sup = {
    id: `sup-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body
  };
  db.suppliers.push(sup);
  saveDatabase();
  res.status(201).json(sup);
});

app.delete('/api/suppliers/:id', requireAuth, requireModuleAccess('suppliers'), (req, res) => {
  const id = req.params.id;
  db.suppliers = db.suppliers.filter((s) => String(s.id) !== String(id));
  saveDatabase();
  res.json({ success: true, id });
});

// Customers
app.get('/api/customers', requireAuth, requireModuleAccess('customers'), (req, res) => {
  res.json(db.customers);
});

app.post('/api/customers', requireAuth, requireModuleAccess('customers'), (req, res) => {
  const cust = {
    id: `cust-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body
  };
  db.customers.push(cust);
  saveDatabase();
  res.status(201).json(cust);
});

app.put('/api/customers/:id', requireAuth, requireModuleAccess('customers'), (req, res) => {
  const id = req.params.id;
  const index = db.customers.findIndex((c) => String(c.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updated = {
    ...db.customers[index],
    ...req.body,
    id: db.customers[index].id,
    updatedAt: new Date().toISOString()
  };
  db.customers[index] = updated;
  saveDatabase();
  res.json(updated);
});

app.delete('/api/customers/:id', requireAuth, requireModuleAccess('customers'), (req, res) => {
  const id = req.params.id;
  db.customers = db.customers.filter((c) => String(c.id) !== String(id));
  saveDatabase();
  res.json({ success: true, id });
});

// Purchase Orders (Purchasing)
app.get('/api/purchases', requireAuth, requireModuleAccess('purchasing'), (req, res) => {
  res.json(db.purchaseOrders);
});

app.post('/api/purchases', requireAuth, requireModuleAccess('purchasing'), (req, res) => {
  const poNum = req.body.poNo || req.body.poNumber || `PO-${String(db.purchaseOrders.length + 5001).padStart(5, '0')}`;
  const po = {
    id: `po-${Date.now()}`,
    poNo: poNum,
    poNumber: poNum,
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body
  };

  db.purchaseOrders.unshift(po);

  // If status is RECEIVED, update inventory & stock movements
  if (po.status === 'RECEIVED' && Array.isArray(po.items)) {
    po.items.forEach((item: any) => {
      const p = db.products.find((prod) => prod.id === item.itemId);
      if (p) {
        const qtyAdded = item.qtyReceived || item.qtyOrdered;
        p.qty = (p.qty || 0) + qtyAdded;
        if (item.unitCost > 0) {
          p.cost = item.unitCost; // Update unit cost
        }
        p.updatedAt = new Date().toISOString();

        db.stockMovements.unshift({
          id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          itemId: p.id,
          itemCode: p.code || 'N/A',
          itemDesc: p.desc,
          type: 'PURCHASE_RECEIPT',
          qtyChange: qtyAdded,
          previousStock: p.qty - qtyAdded - p.sold + p.ret,
          newStock: p.qty - p.sold + p.ret,
          referenceNo: po.poNumber,
          notes: `Goods Received from Supplier ${po.supplierName}`,
          userName: 'Purchasing Manager',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Record expense if paid
    if (po.paidAmount > 0) {
      db.expenses.unshift({
        id: `exp-${Date.now()}`,
        date: po.date || new Date().toISOString().split('T')[0],
        type: 'EXPENSE',
        category: 'SUPPLIER_PAYMENT',
        description: `PO #${po.poNumber} Goods Received Payment (${po.supplierName})`,
        amount: po.paidAmount,
        paymentMethod: 'BANK_TRANSFER',
        reference: po.poNumber,
        recordedBy: 'Purchasing Manager'
      });
    }
  }

  saveDatabase();
  res.status(201).json(po);
});

// Expenses & Cashbook
app.get('/api/expenses', requireAuth, requireModuleAccess('expenses'), (req, res) => {
  res.json(db.expenses);
});

app.post('/api/expenses', requireAuth, requireModuleAccess('expenses'), (req, res) => {
  const expense = {
    id: `exp-${Date.now()}`,
    ...req.body
  };
  db.expenses.unshift(expense);
  saveDatabase();
  res.status(201).json(expense);
});

// Audit Logs
app.get('/api/audit-logs', requireAuth, requireModuleAccess('audit'), (req, res) => {
  res.json(db.auditLogs);
});

app.post('/api/audit-logs', requireAuth, requireModuleAccess('audit'), (req, res) => {
  const log = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...req.body
  };
  db.auditLogs.unshift(log);
  saveDatabase();
  res.status(201).json(log);
});

// Reset database to seed data endpoint
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/reset-database', requireAuth, requireRole(['ADMIN']), (req: any, res) => {
    db = {
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      debtors: [],
      suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
      customers: [],
      stockMovements: [],
      salesInvoices: [],
      purchaseOrders: [],
      expenses: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          user: req.user.name || 'Admin',
          role: req.user.role || 'ADMIN',
          action: 'RESET_DATABASE',
          module: 'System',
          details: 'System database reset to initial development state.',
          timestamp: new Date().toISOString()
        }
      ],
      settings: { ...INITIAL_SETTINGS }
    };
    saveDatabase();
    res.json({ success: true, message: 'Database reset to initial development state.' });
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listener = app.listen(PORT, '0.0.0.0', () => {
    console.log(`El-Jindi Auto Services server running on http://localhost:${PORT}`);
  });

  listener.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = PORT + 1;
      console.warn(`Port ${PORT} is already in use. Retrying on ${fallbackPort}...`);
      app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`El-Jindi Auto Services server running on http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });
}

startServer();
