import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  User, Customer, Vehicle, JobCard, Payment, Invoice, 
  Requisition, Expense, InventoryPart, AuditLog, WorkshopSettings, PriceListItem 
} from '../types';
import { 
  initialUsers, 
  initialSettings, 
  initialCustomers, 
  initialVehicles,
  initialPriceList
} from '../data/seedData';

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'app.db');

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
    this.seedInitialData();
  }

  private initializeSchema() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Customers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        address TEXT,
        company TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Vehicles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
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
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    // Job Cards table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobcards (
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
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
      )
    `);

    // Price List table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_list (
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
      )
    `);

    // Payments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
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
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES invoices(id),
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    // Invoices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
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
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (jobId) REFERENCES jobcards(id),
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
      )
    `);

    // Requisitions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requisitions (
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
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (jobId) REFERENCES jobcards(id)
      )
    `);

    // Expenses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
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
      )
    `);

    // Inventory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inventory (
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
      )
    `);

    // Audit Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        recordType TEXT,
        recordId TEXT,
        details TEXT,
        userId TEXT,
        userName TEXT,
        timestamp TEXT NOT NULL
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  }

  private seedInitialData() {
    // Seed users if empty
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, password, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of initialUsers) {
        insertUser.run(
          user.id,
          user.name,
          user.email,
          user.password || 'password',
          user.role,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }

    // Seed customers if empty
    const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    
    if (customerCount.count === 0) {
      const insertCustomer = this.db.prepare(`
        INSERT INTO customers (id, name, email, phone, address, company, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const customer of initialCustomers) {
        insertCustomer.run(
          customer.id,
          customer.name,
          customer.email || null,
          customer.phone,
          customer.address || null,
          customer.company || null,
          customer.notes || null,
          customer.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }

    // Seed vehicles if empty
    const vehicleCount = this.db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
    
    if (vehicleCount.count === 0) {
      const insertVehicle = this.db.prepare(`
        INSERT INTO vehicles (id, customerId, make, model, year, registrationNumber, vin, mileage, color, fuelType, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vehicle of initialVehicles) {
        insertVehicle.run(
          vehicle.id,
          vehicle.customerId,
          vehicle.make,
          vehicle.model,
          vehicle.year || null,
          vehicle.registrationNumber,
          vehicle.vin || null,
          vehicle.mileage || null,
          vehicle.color || null,
          vehicle.fuelType || null,
          vehicle.notes || null,
          vehicle.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }

    // Seed price list if empty
    const priceListCount = this.db.prepare('SELECT COUNT(*) as count FROM price_list').get() as { count: number };

    if (priceListCount.count === 0) {
      const insertPriceList = this.db.prepare(`
        INSERT INTO price_list (id, make, model, category, serviceOrPart, description, price, estimatedHours, lastUpdated, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const item of initialPriceList) {
        insertPriceList.run(
          item.id,
          item.make,
          item.model,
          item.category,
          item.serviceOrPart,
          item.description,
          item.price,
          item.estimatedHours ?? 1,
          item.lastUpdated || now,
          now,
          now
        );
      }
    }

    // Seed settings if empty
    const settingsCount = this.db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    
    if (settingsCount.count === 0) {
      const insertSetting = this.db.prepare(`
        INSERT INTO settings (key, value, updatedAt)
        VALUES (?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const [key, value] of Object.entries(initialSettings)) {
        insertSetting.run(
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
          now
        );
      }
    }
  }

  public getCurrentUser(): User {
    const row = this.db.prepare('SELECT * FROM users ORDER BY createdAt ASC LIMIT 1').get() as User | undefined;
    return row || { id: 'usr-1', name: 'Kwame Mensah', email: 'kwame@eljindiauto.com', role: 'Manager', password: 'password' };
  }

  // Users
  public getUsers(): User[] {
    const rows = this.db.prepare('SELECT * FROM users').all();
    return rows as User[];
  }

  public getUserById(id: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  public saveUser(user: Omit<User, 'createdAt'> & { createdAt?: string }): User {
    const existing = this.getUserById(user.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE users SET name = ?, email = ?, password = ?, role = ?, updatedAt = ?
        WHERE id = ?
      `).run(user.name, user.email, user.password || 'password', user.role, now, user.id);
    } else {
      this.db.prepare(`
        INSERT INTO users (id, name, email, password, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, user.name, user.email, user.password || 'password', user.role, now, now);
    }

    return this.getUserById(user.id)!;
  }

  public deleteUser(userId: string): boolean {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return result.changes > 0;
  }

  // Customers
  public getCustomers(): Customer[] {
    return this.db.prepare('SELECT * FROM customers ORDER BY name').all() as Customer[];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
  }

  public saveCustomer(customer: Customer & { id: string }): Customer {
    const existing = this.getCustomerById(customer.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, company = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `).run(customer.name, customer.email, customer.phone, customer.address, customer.company, customer.notes, now, customer.id);
    } else {
      this.db.prepare(`
        INSERT INTO customers (id, name, email, phone, address, company, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(customer.id, customer.name, customer.email, customer.phone, customer.address, customer.company, customer.notes, now, now);
    }

    return this.getCustomerById(customer.id)!;
  }

  public deleteCustomer(customerId: string): boolean {
    const result = this.db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
    return result.changes > 0;
  }

  // Vehicles
  public getVehicles(customerId?: string): Vehicle[] {
    if (customerId) {
      return this.db.prepare('SELECT * FROM vehicles WHERE customerId = ? ORDER BY make').all(customerId) as Vehicle[];
    }
    return this.db.prepare('SELECT * FROM vehicles ORDER BY make').all() as Vehicle[];
  }

  public getVehicleById(id: string): Vehicle | undefined {
    return this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as Vehicle | undefined;
  }

  public saveVehicle(vehicle: Vehicle & { id: string }): Vehicle {
    const existing = this.getVehicleById(vehicle.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE vehicles SET customerId = ?, make = ?, model = ?, year = ?, registrationNumber = ?, vin = ?, mileage = ?, color = ?, fuelType = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `).run(vehicle.customerId, vehicle.make, vehicle.model, vehicle.year, vehicle.registrationNumber, vehicle.vin, vehicle.mileage, vehicle.color, vehicle.fuelType, vehicle.notes, now, vehicle.id);
    } else {
      this.db.prepare(`
        INSERT INTO vehicles (id, customerId, make, model, year, registrationNumber, vin, mileage, color, fuelType, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(vehicle.id, vehicle.customerId, vehicle.make, vehicle.model, vehicle.year, vehicle.registrationNumber, vehicle.vin, vehicle.mileage, vehicle.color, vehicle.fuelType, vehicle.notes, now, now);
    }

    return this.getVehicleById(vehicle.id)!;
  }

  public deleteVehicle(vehicleId: string): boolean {
    const result = this.db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicleId);
    return result.changes > 0;
  }

  // Job Cards
  public getJobCards(customerId?: string, status?: string): JobCard[] {
    let query = 'SELECT * FROM jobcards';
    const params: any[] = [];

    if (customerId) {
      query += ' WHERE customerId = ?';
      params.push(customerId);
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
    } else if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY createdAt DESC';
    return this.db.prepare(query).all(...params) as JobCard[];
  }

  public getJobCardById(id: string): JobCard | undefined {
    return this.db.prepare('SELECT * FROM jobcards WHERE id = ?').get(id) as JobCard | undefined;
  }

  public saveJobCard(jobCard: JobCard & { id: string }): JobCard {
    const existing = this.getJobCardById(jobCard.id);
    const now = new Date().toISOString();
    const servicesJson = JSON.stringify(jobCard.services || []);
    const partsJson = JSON.stringify(jobCard.parts || []);
    const inspectionJson = JSON.stringify(jobCard.inspectionChecklist || []);
    const historyjson = JSON.stringify(jobCard.statusHistory || []);
    const categoriesJson = JSON.stringify(jobCard.complaintCategories || []);

    if (existing) {
      this.db.prepare(`
        UPDATE jobcards 
        SET jobNumber = ?, customerId = ?, vehicleId = ?, customerName = ?, customerPhone = ?,
            registrationNumber = ?, vehicleDetails = ?, complaint = ?, complaintCategories = ?,
            inspectionChecklist = ?, diagnosis = ?, recommendedRepairs = ?, technicianId = ?,
            technicianName = ?, vehicleMileage = ?, services = ?, parts = ?, status = ?,
            statusHistory = ?, quotationId = ?, labourTotal = ?, partsTotal = ?, subtotal = ?,
            discount = ?, vatRate = ?, taxAmount = ?, grandTotal = ?, amountPaid = ?, balance = ?,
            paymentStatus = ?, createdDate = ?, completedDate = ?, deliveredDate = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        jobCard.jobNumber, jobCard.customerId, jobCard.vehicleId, jobCard.customerName,
        jobCard.customerPhone, jobCard.registrationNumber, jobCard.vehicleDetails, jobCard.complaint,
        categoriesJson, inspectionJson, jobCard.diagnosis, jobCard.recommendedRepairs,
        jobCard.technicianId, jobCard.technicianName, jobCard.vehicleMileage, servicesJson,
        partsJson, jobCard.status, historyjson, jobCard.quotationId, jobCard.labourTotal,
        jobCard.partsTotal, jobCard.subtotal, jobCard.discount, jobCard.vatRate, jobCard.taxAmount,
        jobCard.grandTotal, jobCard.amountPaid, jobCard.balance, jobCard.paymentStatus,
        jobCard.createdDate, jobCard.completedDate, jobCard.deliveredDate, jobCard.notes, now, jobCard.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO jobcards 
        (id, jobNumber, customerId, vehicleId, customerName, customerPhone, registrationNumber,
         vehicleDetails, complaint, complaintCategories, inspectionChecklist, diagnosis,
         recommendedRepairs, technicianId, technicianName, vehicleMileage, services, parts,
         status, statusHistory, quotationId, labourTotal, partsTotal, subtotal, discount,
         vatRate, taxAmount, grandTotal, amountPaid, balance, paymentStatus, createdDate,
         completedDate, deliveredDate, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        jobCard.id, jobCard.jobNumber, jobCard.customerId, jobCard.vehicleId, jobCard.customerName,
        jobCard.customerPhone, jobCard.registrationNumber, jobCard.vehicleDetails, jobCard.complaint,
        categoriesJson, inspectionJson, jobCard.diagnosis, jobCard.recommendedRepairs,
        jobCard.technicianId, jobCard.technicianName, jobCard.vehicleMileage, servicesJson,
        partsJson, jobCard.status, historyjson, jobCard.quotationId, jobCard.labourTotal,
        jobCard.partsTotal, jobCard.subtotal, jobCard.discount, jobCard.vatRate, jobCard.taxAmount,
        jobCard.grandTotal, jobCard.amountPaid, jobCard.balance, jobCard.paymentStatus,
        jobCard.createdDate, jobCard.completedDate, jobCard.deliveredDate, jobCard.notes, now, now
      );
    }

    return this.getJobCardById(jobCard.id)!;
  }

  public deleteJobCard(jobCardId: string): boolean {
    const result = this.db.prepare('DELETE FROM jobcards WHERE id = ?').run(jobCardId);
    return result.changes > 0;
  }

  // Payments
  public getPayments(customerId?: string, jobCardId?: string): Payment[] {
    let query = 'SELECT * FROM payments';
    const params: any[] = [];

    if (customerId) {
      query += ' WHERE customerId = ?';
      params.push(customerId);
    }

    query += ' ORDER BY date DESC';
    return this.db.prepare(query).all(...params) as Payment[];
  }

  public getPaymentById(id: string): Payment | undefined {
    return this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined;
  }

  public savePayment(payment: Payment & { id: string }): Payment {
    const existing = this.getPaymentById(payment.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE payments 
        SET receiptNumber = ?, date = ?, invoiceId = ?, invoiceNumber = ?, customerId = ?,
            customerName = ?, amount = ?, paymentMethod = ?, reference = ?, notes = ?,
            recordedBy = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        payment.receiptNumber, payment.date, payment.invoiceId, payment.invoiceNumber,
        payment.customerId, payment.customerName, payment.amount, payment.paymentMethod,
        payment.reference, payment.notes, payment.recordedBy, now, payment.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO payments 
        (id, receiptNumber, date, invoiceId, invoiceNumber, customerId, customerName, amount,
         paymentMethod, reference, notes, recordedBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payment.id, payment.receiptNumber, payment.date, payment.invoiceId, payment.invoiceNumber,
        payment.customerId, payment.customerName, payment.amount, payment.paymentMethod,
        payment.reference, payment.notes, payment.recordedBy, now, now
      );
    }

    return this.getPaymentById(payment.id)!;
  }

  public deletePayment(paymentId: string): boolean {
    const result = this.db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);
    return result.changes > 0;
  }

  // Price List
  public getPriceList(): PriceListItem[] {
    return this.db.prepare('SELECT * FROM price_list ORDER BY make, model, category, serviceOrPart').all() as PriceListItem[];
  }

  public savePriceListItem(item: PriceListItem & { id: string }): PriceListItem {
    const existing = this.getPriceList().find(p => p.id === item.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE price_list
        SET make = ?, model = ?, category = ?, serviceOrPart = ?, description = ?, price = ?, estimatedHours = ?, lastUpdated = ?, updatedAt = ?
        WHERE id = ?
      `).run(item.make, item.model, item.category, item.serviceOrPart, item.description, item.price, item.estimatedHours ?? 1, item.lastUpdated || now, now, item.id);
    } else {
      this.db.prepare(`
        INSERT INTO price_list (id, make, model, category, serviceOrPart, description, price, estimatedHours, lastUpdated, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.id, item.make, item.model, item.category, item.serviceOrPart, item.description, item.price, item.estimatedHours ?? 1, item.lastUpdated || now, now, now);
    }

    return this.getPriceList().find(p => p.id === item.id)!;
  }

  public deletePriceListItem(itemId: string): boolean {
    const result = this.db.prepare('DELETE FROM price_list WHERE id = ?').run(itemId);
    return result.changes > 0;
  }

  // Invoices
  public getInvoices(customerId?: string, jobCardId?: string): Invoice[] {
    let query = 'SELECT * FROM invoices';
    const params: any[] = [];

    if (customerId) {
      query += ' WHERE customerId = ?';
      params.push(customerId);
    } else if (jobCardId) {
      query += ' WHERE jobId = ?';
      params.push(jobCardId);
    }

    query += ' ORDER BY date DESC';
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => ({
      ...row,
      services: row.services ? JSON.parse(row.services) : [],
      parts: row.parts ? JSON.parse(row.parts) : [],
    } as Invoice));
  }

  public getInvoiceById(id: string): Invoice | undefined {
    const row = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      services: row.services ? JSON.parse(row.services) : [],
      parts: row.parts ? JSON.parse(row.parts) : [],
    } as Invoice;
  }

  public saveInvoice(invoice: Invoice & { id: string }): Invoice {
    const existing = this.getInvoiceById(invoice.id);
    const now = new Date().toISOString();
    const servicesJson = JSON.stringify(invoice.services || []);
    const partsJson = JSON.stringify(invoice.parts || []);

    if (existing) {
      this.db.prepare(`
        UPDATE invoices 
        SET invoiceNumber = ?, date = ?, dueDate = ?, customerId = ?, vehicleId = ?,
            jobId = ?, quotationId = ?, customerName = ?, customerPhone = ?, customerEmail = ?,
            customerAddress = ?, vehicleRegistration = ?, vehicleDetails = ?, services = ?,
            parts = ?, subtotal = ?, discount = ?, vatRate = ?, taxAmount = ?,
            grandTotal = ?, paidAmount = ?, balance = ?, status = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        invoice.invoiceNumber, invoice.date, invoice.dueDate, invoice.customerId, invoice.vehicleId,
        invoice.jobId, invoice.quotationId, invoice.customerName, invoice.customerPhone,
        invoice.customerEmail, invoice.customerAddress, invoice.vehicleRegistration, invoice.vehicleDetails,
        servicesJson, partsJson, invoice.subtotal, invoice.discount, invoice.vatRate, invoice.taxAmount,
        invoice.grandTotal, invoice.paidAmount, invoice.balance, invoice.status, invoice.notes, now, invoice.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO invoices 
        (id, invoiceNumber, date, dueDate, customerId, vehicleId, jobId, quotationId,
         customerName, customerPhone, customerEmail, customerAddress, vehicleRegistration,
         vehicleDetails, services, parts, subtotal, discount, vatRate, taxAmount, grandTotal,
         paidAmount, balance, status, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoice.id, invoice.invoiceNumber, invoice.date, invoice.dueDate, invoice.customerId,
        invoice.vehicleId, invoice.jobId, invoice.quotationId, invoice.customerName, invoice.customerPhone,
        invoice.customerEmail, invoice.customerAddress, invoice.vehicleRegistration, invoice.vehicleDetails,
        servicesJson, partsJson, invoice.subtotal, invoice.discount, invoice.vatRate, invoice.taxAmount,
        invoice.grandTotal, invoice.paidAmount, invoice.balance, invoice.status, invoice.notes, now, now
      );
    }

    return this.getInvoiceById(invoice.id)!;
  }

  public deleteInvoice(invoiceId: string): boolean {
    const result = this.db.prepare('DELETE FROM invoices WHERE id = ?').run(invoiceId);
    return result.changes > 0;
  }

  // Requisitions
  public getRequisitions(jobCardId?: string, customerId?: string, status?: string): Requisition[] {
    let query = 'SELECT * FROM requisitions';
    const params: any[] = [];

    const conditions: string[] = [];
    if (jobCardId) {
      conditions.push('jobId = ?');
      params.push(jobCardId);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC';
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    } as Requisition));
  }

  public getRequisitionById(id: string): Requisition | undefined {
    const row = this.db.prepare('SELECT * FROM requisitions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    } as Requisition;
  }

  public saveRequisition(requisition: Requisition & { id: string }): Requisition {
    const existing = this.getRequisitionById(requisition.id);
    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(requisition.items || []);

    if (existing) {
      this.db.prepare(`
        UPDATE requisitions 
        SET requisitionNumber = ?, date = ?, jobId = ?, jobNumber = ?, vehicleRegistration = ?,
            customerName = ?, requestedBy = ?, approvedBy = ?, status = ?, items = ?,
            totalValue = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        requisition.requisitionNumber, requisition.date, requisition.jobId, requisition.jobNumber,
        requisition.vehicleRegistration, requisition.customerName, requisition.requestedBy,
        requisition.approvedBy, requisition.status, itemsJson, requisition.totalValue, requisition.notes, now, requisition.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO requisitions 
        (id, requisitionNumber, date, jobId, jobNumber, vehicleRegistration, customerName,
         requestedBy, approvedBy, status, items, totalValue, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        requisition.id, requisition.requisitionNumber, requisition.date, requisition.jobId,
        requisition.jobNumber, requisition.vehicleRegistration, requisition.customerName,
        requisition.requestedBy, requisition.approvedBy, requisition.status, itemsJson,
        requisition.totalValue, requisition.notes, now, now
      );
    }

    return this.getRequisitionById(requisition.id)!;
  }

  public deleteRequisition(requisitionId: string): boolean {
    const result = this.db.prepare('DELETE FROM requisitions WHERE id = ?').run(requisitionId);
    return result.changes > 0;
  }

  // Expenses
  public getExpenses(category?: string): Expense[] {
    let query = 'SELECT * FROM expenses';
    if (category) {
      query += ' WHERE category = ?';
      return this.db.prepare(query).all(category) as Expense[];
    }
    query += ' ORDER BY date DESC';
    return this.db.prepare(query).all() as Expense[];
  }

  public getExpenseById(id: string): Expense | undefined {
    return this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | undefined;
  }

  public saveExpense(expense: Expense & { id: string }): Expense {
    const existing = this.getExpenseById(expense.id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE expenses 
        SET date = ?, category = ?, description = ?, supplierId = ?, supplierName = ?,
            amount = ?, paymentMethod = ?, reference = ?, recordedBy = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        expense.date, expense.category, expense.description, expense.supplierId, expense.supplierName,
        expense.amount, expense.paymentMethod, expense.reference, expense.recordedBy, now, expense.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO expenses 
        (id, date, category, description, supplierId, supplierName, amount, paymentMethod, reference, recordedBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expense.id, expense.date, expense.category, expense.description, expense.supplierId,
        expense.supplierName, expense.amount, expense.paymentMethod, expense.reference, expense.recordedBy, now, now
      );
    }

    return this.getExpenseById(expense.id)!;
  }

  public deleteExpense(expenseId: string): boolean {
    const result = this.db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
    return result.changes > 0;
  }

  // Inventory
  public getInventory(): InventoryPart[] {
    return this.db.prepare('SELECT * FROM inventory ORDER BY partName').all() as InventoryPart[];
  }

  public getInventoryByPartName(partName: string): InventoryPart | undefined {
    return this.db.prepare('SELECT * FROM inventory WHERE partName = ?').get(partName) as InventoryPart | undefined;
  }

  public saveInventory(item: InventoryPart & { id: string }): InventoryPart {
    const existing = this.db.prepare('SELECT * FROM inventory WHERE id = ?').get(item.id) as InventoryPart | undefined;
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE inventory 
        SET partName = ?, partNumber = ?, category = ?, compatibleVehicles = ?, supplierId = ?,
            supplierName = ?, quantity = ?, minStock = ?, purchasePrice = ?, sellingPrice = ?,
            location = ?, status = ?, lastUpdated = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        item.partName, item.partNumber, item.category, item.compatibleVehicles, item.supplierId,
        item.supplierName, item.quantity, item.minStock, item.purchasePrice, item.sellingPrice,
        item.location, item.status, item.lastUpdated, now, item.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO inventory 
        (id, partName, partNumber, category, compatibleVehicles, supplierId, supplierName,
         quantity, minStock, purchasePrice, sellingPrice, location, status, lastUpdated, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id, item.partName, item.partNumber, item.category, item.compatibleVehicles, item.supplierId,
        item.supplierName, item.quantity, item.minStock, item.purchasePrice, item.sellingPrice,
        item.location, item.status, item.lastUpdated, now, now
      );
    }

    return this.db.prepare('SELECT * FROM inventory WHERE id = ?').get(item.id) as InventoryPart;
  }

  public deleteInventory(itemId: string): boolean {
    const result = this.db.prepare('DELETE FROM inventory WHERE id = ?').run(itemId);
    return result.changes > 0;
  }

  // Audit Logs
  public logAudit(action: string, recordType: string, recordId: string | undefined, details: string, userId: string | undefined, userName: string | undefined) {
    const id = `audit-${Date.now()}`;
    this.db.prepare(`
      INSERT INTO audit_logs (id, action, recordType, recordId, details, userId, userName, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, action, recordType, recordId, details, userId, userName, new Date().toISOString());
  }

  public getAuditLogs(limit: number = 100): AuditLog[] {
    return this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLog[];
  }

  // Settings
  public getSetting(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  public setSetting(key: string, value: string | object): void {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `).run(key, valueStr, now);
  }

  public getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  // Export all data for sync
  public exportAllData() {
    return {
      users: this.getUsers(),
      customers: this.getCustomers(),
      vehicles: this.getVehicles(),
      jobcards: this.getJobCards(),
      priceList: this.getPriceList(),
      payments: this.getPayments(),
      invoices: this.getInvoices(),
      requisitions: this.getRequisitions(),
      expenses: this.getExpenses(),
      inventory: this.getInventory(),
      auditLogs: this.getAuditLogs(500),
      settings: this.getAllSettings(),
    };
  }

  public close() {
    this.db.close();
  }
}

// Singleton instance
let dbManager: DatabaseManager | null = null;

export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
}
