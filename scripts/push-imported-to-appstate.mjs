import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const jsonPath = path.resolve('src', 'data', 'imported_customers_with_vehicles.json');
if (!fs.existsSync(jsonPath)) {
  console.error('Imported JSON not found at', jsonPath);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const customers = raw.customers || raw.customers || [];
const vehicles = raw.vehicles || raw.vehicles || [];

const envUrl = process.env.DATABASE_URL;
if (!envUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

let secureUrl = envUrl;
if (!/sslmode=/.test(envUrl)) {
  secureUrl = `${envUrl}${envUrl.includes('?') ? '&' : '?'}sslmode=require`;
}

const pool = new Pool({ connectionString: secureUrl });

(async () => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const upsert = async (key, obj) => {
      const s = JSON.stringify(obj);
      await pool.query(
        `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, s]
      );
    };

    console.log('Upserting customers (%d) ...', customers.length);
    await upsert('eljindi_customers_v1', customers);
    console.log('Upserting vehicles (%d) ...', vehicles.length);
    await upsert('eljindi_vehicles_v1', vehicles);

    // Verification
    const res = await pool.query(
      `SELECT key, jsonb_typeof(value) as value_type,
        CASE WHEN jsonb_typeof(value) = 'array' THEN jsonb_array_length(value) ELSE NULL END as item_count
       FROM app_state WHERE key IN ('eljindi_customers_v1','eljindi_vehicles_v1','eljindi_price_list_v2','eljindi_users_v1')`
    );

    console.log('Verification results:');
    for (const row of res.rows) {
      console.log('-', row.key, '| type:', row.value_type, '| count:', row.item_count);
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error during push:', err);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
})();
