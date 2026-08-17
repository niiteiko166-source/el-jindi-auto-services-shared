import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });
const targetUrl = process.env.TARGET_DATABASE_URL;
if (!targetUrl) {
  throw new Error('TARGET_DATABASE_URL is required. Set it only in your local terminal.');
}

const secureTargetUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}sslmode=require`;

const sourcePath = path.resolve('data', 'db.json');
const state = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const pool = new Pool({ connectionString: secureTargetUrl });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await pool.query("SELECT length(value) AS state_length FROM business_state WHERE key = 'main'");
  if (existing.rowCount > 0) {
    throw new Error('Target database already contains business_state.main; no data was changed.');
  }

  await pool.query(
    "INSERT INTO business_state (key, value, updated_at) VALUES ($1, $2, NOW())",
    ['main', JSON.stringify(state)]
  );

  console.log(JSON.stringify({
    migrated: true,
    products: (state.products || []).length,
    sales: (state.salesInvoices || []).length,
    customers: (state.customers || []).length,
    debtors: (state.debtors || []).length
  }));
} finally {
  await pool.end();
}
