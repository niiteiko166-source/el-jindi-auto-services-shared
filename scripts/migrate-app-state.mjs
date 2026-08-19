import { Pool } from 'pg';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const allowOverwrite = process.env.ALLOW_TARGET_OVERWRITE === 'true';

if (!sourceUrl || !targetUrl) {
  console.error('SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required.');
  process.exit(1);
}

if (sourceUrl === targetUrl) {
  console.error('Source and target database URLs must be different.');
  process.exit(1);
}

const ssl = { rejectUnauthorized: false };
const source = new Pool({ connectionString: sourceUrl, ssl, max: 1 });
const target = new Pool({ connectionString: targetUrl, ssl, max: 1 });

try {
  await target.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const sourceResult = await source.query('SELECT key, value FROM app_state ORDER BY key');
  const targetCount = await target.query('SELECT COUNT(*)::int AS count FROM app_state');

  console.log(`Source rows: ${sourceResult.rowCount}`);
  console.log(`Target rows before migration: ${targetCount.rows[0].count}`);

  if (targetCount.rows[0].count > 0 && !allowOverwrite) {
    throw new Error('Target app_state is not empty. Set ALLOW_TARGET_OVERWRITE=true only after confirming replacement is intended.');
  }

  await target.query('BEGIN');
  for (const row of sourceResult.rows) {
    await target.query(
      `INSERT INTO app_state(key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [row.key, JSON.stringify(row.value)]
    );
  }
  await target.query('COMMIT');

  const targetResult = await target.query('SELECT key, value FROM app_state ORDER BY key');
  const sourceKeys = new Set(sourceResult.rows.map(row => row.key));
  const missingKeys = [...sourceKeys].filter(key => !targetResult.rows.some(row => row.key === key));

  if (missingKeys.length > 0) {
    throw new Error(`Verification failed. Missing target keys: ${missingKeys.join(', ')}`);
  }

  console.log(`Migration complete. Copied ${sourceResult.rowCount} app_state rows.`);
} catch (error) {
  try { await target.query('ROLLBACK'); } catch {}
  console.error('Migration failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
