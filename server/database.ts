import { Pool } from 'pg';
import { config } from './config';
import { createPasswordHash } from './auth';

export interface DbUser {
  id: number;
  username: string;
  name: string;
  role: string;
  email: string;
  password_hash: string;
  active: number;
  created_at: string;
}

let pool: Pool | null = null;

export function initDatabase() {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }

  return pool;
}

export async function ensureDefaultSeed() {
  const db = initDatabase();
  try {
    await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      mfa_secret TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      tagline TEXT,
      branch TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      tin_number TEXT,
      currency TEXT,
      currency_symbol TEXT,
      enable_vat INTEGER NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL DEFAULT 0,
      receipt_header TEXT,
      receipt_footer TEXT,
      low_stock_global_threshold INTEGER NOT NULL DEFAULT 5
    );
  `);

  const existingUser = await db.query('SELECT id FROM users LIMIT 1');
    const defaultUsers = [
      {
        username: 'admin',
        name: 'System Administrator',
        role: 'ADMIN',
        email: 'admin@eljindi.local',
        password: config.nodeEnv === 'production' ? config.defaultAdminPassword : '1234'
      },
      {
        username: 'pos1',
        name: 'Kwame Mensah (POS)',
        role: 'POS_CASHIER',
        email: 'pos@eljindi.com',
        password: '1234'
      },
      {
        username: 'sales1',
        name: 'Kofi Mensah (Sales Rep)',
        role: 'SALES_REP',
        email: 'sales@eljindi.com',
        password: '1234'
      },
      {
        username: 'inv1',
        name: 'Yaw Boateng (Inventory)',
        role: 'INVENTORY_MANAGER',
        email: 'inventory@eljindi.com',
        password: '1234'
      },
      {
        username: 'acc1',
        name: 'Ama Osei (Accounting)',
        role: 'ACCOUNTANT',
        email: 'accounting@eljindi.com',
        password: '1234'
      }
    ];

    if (existingUser.rowCount === 0) {
      for (const user of defaultUsers) {
        await db.query(`
          INSERT INTO users (username, name, role, email, password_hash, active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          user.username,
          user.name,
          user.role,
          user.email,
          createPasswordHash(user.password),
          1
        ]);
      }

      await db.query(`
        INSERT INTO settings (
          id, company_name, tagline, branch, address, phone, email, tin_number, currency, currency_symbol,
          enable_vat, vat_rate, receipt_header, receipt_footer, low_stock_global_threshold
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        'EL-JINDI AUTO SERVICES',
        'Automotive Parts Management',
        'Main Branch',
        'Accra, Ghana',
        '+233 000 000 000',
        'info@eljindi.local',
        '000000000',
        'GHS',
        'GH₵',
        0,
        0,
        'EL-JINDI AUTO SERVICES',
        'Thank you for your business',
        5
      ]);
    } else {
      const shouldResetDevPasswords = config.nodeEnv !== 'production';
      for (const user of defaultUsers) {
        if (shouldResetDevPasswords) {
          await db.query(`
            INSERT INTO users (username, name, role, email, password_hash, active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (username) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              email = EXCLUDED.email,
              active = EXCLUDED.active,
              password_hash = EXCLUDED.password_hash
          `, [
            user.username,
            user.name,
            user.role,
            user.email,
            createPasswordHash(user.password),
            1
          ]);
        } else {
          await db.query(`
            INSERT INTO users (username, name, role, email, password_hash, active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (username) DO NOTHING
          `, [
            user.username,
            user.name,
            user.role,
            user.email,
            createPasswordHash(user.password),
            1
          ]);
        }
      }
    }
  } catch (error) {
    console.warn('Database seed initialization skipped: unable to reach PostgreSQL.', error);
  }
}

export function getDatabase() {
  return initDatabase();
}
