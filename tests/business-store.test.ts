import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBusinessStore } from '../server/businessStore';

test('business store persists collections in a database', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eljindi-store-'));
  const dbPath = path.join(tmpDir, 'business.sqlite');
  const store = createBusinessStore(dbPath);

  await store.saveState({
    products: [{ id: 1, code: 'A-100', desc: 'Battery' }],
    customers: [{ id: 1, name: 'Jane' }]
  });

  const reloaded = await store.loadState();
  assert.deepEqual(reloaded.products, [{ id: 1, code: 'A-100', desc: 'Battery' }]);
  assert.deepEqual(reloaded.customers, [{ id: 1, name: 'Jane' }]);
  assert.deepEqual(reloaded.debtors, []);
  assert.deepEqual(reloaded.suppliers, []);
  assert.deepEqual(reloaded.stockMovements, []);
  assert.deepEqual(reloaded.salesInvoices, []);
  assert.deepEqual(reloaded.purchaseOrders, []);
  assert.deepEqual(reloaded.expenses, []);
  assert.deepEqual(reloaded.auditLogs, []);
  assert.deepEqual(reloaded.settings, {});
});
