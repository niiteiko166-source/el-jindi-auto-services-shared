import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

function normalizeRole(role?: string): string {
  const value = String(role ?? '').trim();
  const key = value.toLowerCase();
  const map: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    receptionist: 'Receptionist',
    accountant: 'Accountant',
    technician: 'Technician',
    storekeeper: 'Storekeeper',
  };
  return map[key] ?? (value || 'Manager');
}

const KEYS = [
  'eljindi_customers_v1','eljindi_users_v1','eljindi_vehicles_v1','eljindi_jobs_v1',
  'eljindi_price_list_v2','eljindi_inventory_v1','eljindi_transactions_v1','eljindi_requisitions_v1',
  'eljindi_quotations_v1','eljindi_invoices_v1','eljindi_payments_v1','eljindi_expenses_v1',
  'eljindi_suppliers_v1','eljindi_bookings_v1','eljindi_notifications_v1','eljindi_audit_logs_v1',
  'eljindi_settings_v1','eljindi_current_user_v1'
] as const;

export class CloudStore {
  private pool?: Pool;
  private memory = new Map<string, any>();
  private ready: Promise<void>;

  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 1 : 5)),
      });
      this.ready = this.init();
    } else {
      console.warn('DATABASE_URL is not configured; using temporary in-memory cloud state for local development only.');
      this.ready = Promise.resolve();
    }
  }

  private async init() {
    if (!this.pool) return;
    try {
      await this.pool.query(`CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    } catch (error) {
      console.warn('Could not initialize database table:', (error as Error).message);
      // Continue with in-memory fallback
    }
  }

  async getAll(): Promise<Record<string, any>> {
    await this.ready;
    if (!this.pool) return Object.fromEntries(this.memory);
    try {
      const { rows } = await this.pool.query('SELECT key, value FROM app_state');
      return Object.fromEntries(rows.map(r => [r.key, r.value]));
    } catch (error) {
      console.warn('Warning: Could not fetch all data from database, using in-memory fallback');
      return Object.fromEntries(this.memory);
    }
  }

  async setMany(data: Record<string, any>): Promise<void> {
    await this.ready;
    
    // Hash passwords for users before storing anywhere
    const processedData = { ...data };
    if ('eljindi_users_v1' in data && Array.isArray(data.eljindi_users_v1)) {
      processedData.eljindi_users_v1 = await Promise.all(data.eljindi_users_v1.map(async (u: any) => {
        const normalized = {
          ...u,
          name: u?.name ?? u?.username ?? u?.email?.split('@')[0] ?? 'User',
          username: u?.username ?? u?.name ?? u?.email?.split('@')[0] ?? 'user',
          role: normalizeRole(u?.role),
        };

        if (!normalized?.password) return normalized;
        const password = String(normalized.password);
        if (password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$')) return normalized;
        return { ...normalized, password: await bcrypt.hash(password, 12) };
      }));
    }
    
    // Store processed data in memory
    for (const key of KEYS) if (key in processedData) this.memory.set(key, processedData[key]);
    
    // Try to store in database if available
    if (!this.pool) return;
    
    try {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const key of KEYS) {
          if (!(key in processedData)) continue;
          const value = processedData[key];
          await client.query(`INSERT INTO app_state(key,value,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [key, JSON.stringify(value)]);
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    } catch (error) {
      console.warn('Warning: Could not sync to database:', (error as Error).message);
      // Data is already stored in memory with hashed passwords, continue with in-memory mode
    }
  }

  async get(key: string): Promise<any> {
    await this.ready;
    if (!this.pool) return this.memory.get(key);
    try {
      const { rows } = await this.pool.query('SELECT value FROM app_state WHERE key=$1', [key]);
      return rows[0]?.value;
    } catch (error) {
      console.warn(`Warning: Could not fetch from database (${key}), using in-memory fallback`);
      return this.memory.get(key);
    }
  }

  async seedIfEmpty(seed: Record<string, any>) {
    await this.ready;
    
    // Check if we already have data
    if (!this.pool) {
      if (this.memory.size !== 0) return;
    } else {
      try {
        const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM app_state');
        if (rows[0].count !== 0) return;
      } catch (error) {
        // Database is unavailable, proceed with in-memory seeding
        console.warn('Could not check database for existing data, proceeding with in-memory seed');
        if (this.memory.size !== 0) return;
      }
    }
    
    const mapped: Record<string, any> = {
      eljindi_users_v1: seed.users || [],
      eljindi_customers_v1: seed.customers || [],
      eljindi_vehicles_v1: seed.vehicles || [],
      eljindi_jobs_v1: seed.jobcards || [],
      eljindi_price_list_v2: seed.priceList || [],
      eljindi_payments_v1: seed.payments || [],
      eljindi_invoices_v1: seed.invoices || [],
      eljindi_requisitions_v1: seed.requisitions || [],
      eljindi_expenses_v1: seed.expenses || [],
      eljindi_inventory_v1: seed.inventory || [],
      eljindi_audit_logs_v1: seed.auditLogs || [],
      eljindi_settings_v1: seed.settings || {}
    };
    await this.setMany(mapped);
  }

  async close() { if (this.pool) await this.pool.end(); }
}
