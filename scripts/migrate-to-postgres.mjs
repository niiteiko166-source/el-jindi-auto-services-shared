import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Client } from 'pg';

const sqliteDbPath = path.join(process.cwd(), 'data', 'app.db');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required before running the migration.');
  process.exit(1);
}

if (!fs.existsSync(sqliteDbPath)) {
  console.warn(`No SQLite database found at ${sqliteDbPath}. Nothing to migrate.`);
  process.exit(0);
}

const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(process.cwd(), 'backups', `app.db.pre-migration-${backupTimestamp}.bak`);
fs.mkdirSync(path.dirname(backupPath), { recursive: true });
fs.copyFileSync(sqliteDbPath, backupPath);
console.log(`SQLite backup created at ${backupPath}`);

const sqlite = new Database(sqliteDbPath, { readonly: true });
const client = new Client({ connectionString });

const tableOrder = [
  'users',
  'customers',
  'vehicles',
  'jobcards',
  'price_list',
  'payments',
  'invoices',
  'requisitions',
  'expenses',
  'inventory',
  'audit_logs',
  'settings',
];

const schema = {
  users: `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  customers: `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    company TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  vehicles: `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    registrationNumber TEXT NOT NULL,
    vin TEXT,
    mileage INTEGER,
    color TEXT,
    fuelType TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  jobcards: `CREATE TABLE IF NOT EXISTS jobcards (
    id TEXT PRIMARY KEY,
    jobNumber TEXT UNIQUE NOT NULL,
    customerId TEXT NOT NULL,
    vehicleId TEXT NOT NULL,
    customerName TEXT,
    customerPhone TEXT,
    registrationNumber TEXT,
    vehicleDetails TEXT,
    complaint TEXT NOT NULL,
    complaintCategories TEXT,
    inspectionChecklist TEXT,
    diagnosis TEXT,
    recommendedRepairs TEXT,
    technicianId TEXT,
    technicianName TEXT,
    vehicleMileage INTEGER,
    services TEXT,
    parts TEXT,
    status TEXT NOT NULL,
    statusHistory TEXT,
    quotationId TEXT,
    labourTotal REAL,
    partsTotal REAL,
    subtotal REAL,
    discount REAL,
    vatRate REAL,
    taxAmount REAL,
    grandTotal REAL,
    amountPaid REAL,
    balance REAL,
    paymentStatus TEXT,
    createdDate TEXT NOT NULL,
    completedDate TEXT,
    deliveredDate TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  price_list: `CREATE TABLE IF NOT EXISTS price_list (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    category TEXT NOT NULL,
    serviceOrPart TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    estimatedHours REAL,
    lastUpdated TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  payments: `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    receiptNumber TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    invoiceId TEXT NOT NULL,
    invoiceNumber TEXT,
    customerId TEXT NOT NULL,
    customerName TEXT,
    amount REAL NOT NULL,
    paymentMethod TEXT,
    reference TEXT,
    notes TEXT,
    recordedBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  invoices: `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    dueDate TEXT,
    customerId TEXT NOT NULL,
    vehicleId TEXT,
    jobId TEXT,
    quotationId TEXT,
    customerName TEXT,
    customerPhone TEXT,
    customerEmail TEXT,
    customerAddress TEXT,
    vehicleRegistration TEXT,
    vehicleDetails TEXT,
    services TEXT,
    parts TEXT,
    subtotal REAL,
    discount REAL,
    vatRate REAL,
    taxAmount REAL,
    grandTotal REAL,
    paidAmount REAL,
    balance REAL,
    status TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  requisitions: `CREATE TABLE IF NOT EXISTS requisitions (
    id TEXT PRIMARY KEY,
    requisitionNumber TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    jobId TEXT,
    jobNumber TEXT,
    vehicleRegistration TEXT,
    customerName TEXT,
    requestedBy TEXT NOT NULL,
    approvedBy TEXT,
    status TEXT,
    items TEXT,
    totalValue REAL,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  expenses: `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    supplierId TEXT,
    supplierName TEXT,
    amount REAL NOT NULL,
    paymentMethod TEXT,
    reference TEXT,
    recordedBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  inventory: `CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    partName TEXT NOT NULL,
    partNumber TEXT,
    category TEXT,
    compatibleVehicles TEXT,
    supplierId TEXT,
    supplierName TEXT,
    quantity INTEGER,
    minStock INTEGER,
    purchasePrice REAL,
    sellingPrice REAL,
    location TEXT,
    status TEXT,
    lastUpdated TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  audit_logs: `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    recordType TEXT,
    recordId TEXT,
    details TEXT,
    userId TEXT,
    userName TEXT,
    timestamp TEXT NOT NULL
  );`,
  settings: `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
};

async function resetTable(client, tableName) {
  await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY;`);
}

async function migrateTable(tableName) {
  const columns = Object.keys(sqlite.prepare(`PRAGMA table_info(${tableName})`).all().reduce((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {}));

  if (columns.length === 0) {
    return 0;
  }

  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  if (!rows.length) {
    return 0;
  }

  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  const insertSql = `INSERT INTO ${tableName} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${columns.filter((c) => c !== 'id').map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')}`;

  for (const row of rows) {
    const values = columns.map((column) => row[column] ?? null);
    await client.query(insertSql, values);
  }

  return rows.length;
}

async function run() {
  await client.connect();

  console.log('Creating Postgres schema...');
  for (const tableName of tableOrder) {
    if (schema[tableName]) {
      await client.query(schema[tableName]);
    }
  }

  console.log('Migrating data...');
  let migratedTotal = 0;
  for (const tableName of tableOrder) {
    const rowCount = await migrateTable(tableName);
    migratedTotal += rowCount;
    console.log(`${tableName}: ${rowCount} rows migrated`);
  }

  const sqliteCounts = {};
  for (const tableName of tableOrder) {
    const count = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get()?.count ?? 0;
    sqliteCounts[tableName] = count;
  }

  const postgresCounts = {};
  for (const tableName of tableOrder) {
    const result = await client.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
    postgresCounts[tableName] = Number(result.rows[0].count);
  }

  const mismatch = tableOrder.filter((tableName) => sqliteCounts[tableName] !== postgresCounts[tableName]);
  if (mismatch.length > 0) {
    console.error('Row count mismatch detected:', mismatch.map((tableName) => ({ tableName, sqlite: sqliteCounts[tableName], postgres: postgresCounts[tableName] })));
    process.exitCode = 1;
    return;
  }

  console.log('Migration complete. Row counts verified across all tables.');
  console.log(`Migrated ${migratedTotal} rows without mismatches.`);
}

try {
  await run();
} catch (error) {
  console.error('Migration failed. No data was deleted from the SQLite source. The backup remains at:', backupPath);
  console.error(error);
  process.exit(1);
} finally {
  sqlite.close();
  await client.end();
}
