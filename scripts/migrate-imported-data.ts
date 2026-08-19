import { Pool } from 'pg';
import { importedCustomers } from '../src/data/imported_customers.ts';
import { importedVehicles } from '../src/data/imported_vehicles.ts';
import { rawPriceListData } from '../src/data/priceListRawData.ts';

const connectionString = process.env.DATABASE_URL || (process.env.PGUSER && process.env.POSTGRES_PASSWORD && process.env.RAILWAY_PRIVATE_DOMAIN && process.env.PGDATABASE
  ? `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.RAILWAY_PRIVATE_DOMAIN}:5432/${encodeURIComponent(process.env.PGDATABASE)}`
  : '');

if (!connectionString) {
  throw new Error('DATABASE_URL or Railway PGUSER, POSTGRES_PASSWORD, RAILWAY_PRIVATE_DOMAIN, and PGDATABASE variables are required.');
}

const priceList = rawPriceListData.map((item, index) => ({
  id: `imported-price-${index + 1}`,
  make: item.make,
  model: item.model,
  category: item.category,
  serviceOrPart: item.service,
  description: `${item.make} ${item.model} ${item.service}`,
  price: Number(item.fee) || 0,
  lastUpdated: new Date().toISOString(),
}));

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

const records = {
  eljindi_customers_v1: importedCustomers,
  eljindi_vehicles_v1: importedVehicles,
  eljindi_price_list_v2: priceList,
};

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('BEGIN');
  for (const [key, value] of Object.entries(records)) {
    await pool.query(
      `INSERT INTO app_state(key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    console.log(`${key}: ${value.length} records`);
  }
  await pool.query('COMMIT');

  const verification = await pool.query(
    `SELECT key, jsonb_array_length(value) AS count
     FROM app_state
     WHERE key = ANY($1::text[])
     ORDER BY key`,
    [Object.keys(records)]
  );
  console.log('Migration verified:', verification.rows);
} catch (error) {
  try { await pool.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  await pool.end();
}
