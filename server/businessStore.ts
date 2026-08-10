import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export interface BusinessState {
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

function sanitizeState(state: BusinessState): BusinessState {
  const clone = { ...state } as BusinessState;
  for (const key of Object.keys(clone) as (keyof BusinessState)[]) {
    if (Array.isArray(clone[key])) {
      const seen = new Set<string>();
      clone[key] = (clone[key] as any[]).filter((item) => {
        if (!item || item.id === undefined) return true;
        const idStr = String(item.id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });
    }
  }
  return clone;
}

function getDefaultState(): BusinessState {
  return {
    products: [],
    debtors: [],
    suppliers: [],
    customers: [],
    stockMovements: [],
    salesInvoices: [],
    purchaseOrders: [],
    expenses: [],
    auditLogs: [],
    settings: {}
  };
}

function isPostgresUrl(value: string) {
  return /^postgres(?:ql)?:\/\//i.test(value);
}

export function createBusinessStore(connectionStringOrPath: string) {
  const normalized = (connectionStringOrPath || '').trim();
  const usePostgres = isPostgresUrl(normalized);
  let pool: Pool | null = null;
  let fallbackFile = '';

  if (usePostgres) {
    pool = new Pool({ connectionString: normalized });
  } else {
    fallbackFile = path.resolve(normalized || path.join(process.cwd(), 'data', 'business-state.json'));
    fs.mkdirSync(path.dirname(fallbackFile), { recursive: true });
  }

  async function loadState(): Promise<BusinessState> {
    if (pool) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS business_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        const result = await pool.query('SELECT value FROM business_state WHERE key = $1', ['main']);
        if (result.rows[0]?.value) {
          const loaded = JSON.parse(result.rows[0].value) as Partial<BusinessState>;
          return sanitizeState({ ...getDefaultState(), ...loaded } as BusinessState);
        }
      } catch (error) {
        console.warn('PostgreSQL business store unavailable, falling back to file storage.', error);
        pool = null;
      }
    }

    if (fallbackFile) {
      if (fs.existsSync(fallbackFile)) {
        const raw = fs.readFileSync(fallbackFile, 'utf8');
        const loaded = JSON.parse(raw) as Partial<BusinessState>;
        return sanitizeState({ ...getDefaultState(), ...loaded } as BusinessState);
      }
      return getDefaultState();
    }

    return getDefaultState();
  }

  async function saveState(state: Partial<BusinessState>): Promise<void> {
    const existing = await loadState();
    const normalized = sanitizeState({ ...getDefaultState(), ...existing, ...state } as BusinessState);

    if (pool) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS business_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await pool.query(
          'INSERT INTO business_state (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
          ['main', JSON.stringify(normalized)]
        );
        return;
      } catch (error) {
        console.warn('PostgreSQL business store unavailable, falling back to file storage.', error);
        pool = null;
      }
    }

    if (fallbackFile) {
      fs.writeFileSync(fallbackFile, JSON.stringify(normalized, null, 2), 'utf8');
    }
  }

  return { loadState, saveState };
}
