import "dotenv/config";
import express from "express";
import PDFDocument from 'pdfkit';
import path from "path";
import fs from "fs";
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from "vite";
import { CloudStore } from "./src/services/cloudStore";
import { PostgresAdapter } from "./src/services/postgresAdapter";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  rbacMiddleware, 
  requireAdmin
} from "./src/services/production";
import type { User, Customer, Vehicle, JobCard, Payment, Invoice, Requisition, Expense, InventoryPart, WorkshopSettings } from "./src/types";
import { 
  initialUsers,
  initialCustomers,
  initialVehicles,
  initialJobCards,
  initialPriceList,
  initialPayments,
  initialInvoices,
  initialRequisitions,
  initialExpenses,
  initialInventory,
  initialAuditLogs,
  initialSettings
} from "./src/data/seedData";

function normalizeUserRole(role?: string): User['role'] {
  const value = String(role ?? '').trim();
  const key = value.toLowerCase();
  const roleMap: Record<string, User['role']> = {
   admin: 'Admin',
   manager: 'Manager',
   receptionist: 'Receptionist',
   accountant: 'Accountant',
   technician: 'Technician',
   storekeeper: 'Storekeeper',
  };

  return roleMap[key] ?? 'Manager';
}

export async function createApp() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const cloud = new CloudStore();
  const db = new PostgresAdapter(cloud);
  
  // Seed initial data if database is empty
  try {
    await cloud.seedIfEmpty({
      users: initialUsers,
      customers: initialCustomers,
      vehicles: initialVehicles,
      jobcards: initialJobCards,
      priceList: initialPriceList,
      payments: initialPayments,
      invoices: initialInvoices,
      requisitions: initialRequisitions,
      expenses: initialExpenses,
      inventory: initialInventory,
      auditLogs: initialAuditLogs,
      settings: initialSettings
    });

    const users = await db.getUsers();
    const needsNormalization = users.some((user: any) => {
      const userRole = normalizeUserRole(user.role);
      const userName = user.name ?? (user as any).username ?? user.email?.split('@')[0] ?? 'User';
      return user.role !== userRole || (user.name ?? userName) !== userName || (user as any).username !== 'admin';
    });

    if (needsNormalization) {
      const normalizedUsers = users.map((user: any) => ({
        ...user,
        name: user.name ?? (user as any).username ?? user.email?.split('@')[0] ?? 'User',
        username: (user as any).username ?? user.email?.split('@')[0] ?? 'admin',
        role: normalizeUserRole(user.role),
      }));
      await cloud.setMany({ eljindi_users_v1: normalizedUsers });
    }
  } catch (error) {
    console.warn('Warning: Could not seed initial data:', error);
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Ensure JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Cannot start server.');
    process.exit(1);
  }

  // Secure authentication middleware. No development/admin bypass is allowed.
  app.use('/api', async (req, res, next) => {
    // Public endpoints
    if (req.path === '/auth/login' || req.path === '/auth/logout' || req.path === '/health' || req.path === '/info') {
      return next();
    }
    
    try {
      // Get token from Authorization header or cookie
      const authHeader = req.headers.authorization;
      const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const tokenFromCookie = req.cookies?.eljindi_token;
      const auth = tokenFromHeader || tokenFromCookie;

      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      // Verify JWT
      const payload = jwt.verify(auth, process.env.JWT_SECRET!) as { uid: string; role: string };
      
      // Get user from database
      const users = await db.getUsers();
      const user = users.find((u: any) => u.id === payload.uid);
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      const username = (user as any).username ?? (user as any).name ?? (user as any).email?.split('@')[0] ?? 'User';
      const normalizedUser = {
        ...user,
        name: user.name ?? username,
        role: normalizeUserRole(user.role),
        password: undefined,
      };
 
      // Attach user to request (without password)
      (req as any).user = normalizedUser;
      rbacMiddleware(req, res, next);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(401).json({ error: 'Authentication failed' });
    }
  });

  // ========== HEALTH CHECK & STATUS ==========
  app.get('/api/health', async (req, res) => {
    try {
      const users = await db.getUsers();
      const customers = await db.getCustomers();
      const invoices = await db.getInvoices();
      
      res.json({
        status: 'HEALTHY',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          recordCount: {
            users: users.length,
            customers: customers.length,
            invoices: invoices.length
          }
        },
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        status: 'UNHEALTHY',
        error: String(error)
      });
    }
  });

  app.get('/api/status', requireAdmin, async (req, res) => {
    try {
      const health = await new Promise((resolve) => {
        res.on('finish', () => {});
        resolve({
          status: 'HEALTHY',
          timestamp: new Date().toISOString()
        });
      });
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Shared cloud state
  app.get('/api/data', requireAdmin, async (req, res) => {
    try {
      const data = await cloud.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Sync data from client (DEPRECATED - use individual CRUD endpoints instead)
  // This endpoint maintains backward compatibility but validates data before saving
  app.post('/api/data/sync', requireAdmin, async (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ error: 'A JSON object is required.' });
      }
      
      // Only allow known data keys
      const allowedKeys = [
        'eljindi_customers_v1', 'eljindi_users_v1', 'eljindi_vehicles_v1', 'eljindi_jobs_v1',
        'eljindi_price_list_v2', 'eljindi_inventory_v1', 'eljindi_transactions_v1', 
        'eljindi_requisitions_v1', 'eljindi_quotations_v1', 'eljindi_invoices_v1',
        'eljindi_payments_v1', 'eljindi_expenses_v1', 'eljindi_suppliers_v1',
        'eljindi_bookings_v1', 'eljindi_notifications_v1', 'eljindi_audit_logs_v1', 'eljindi_settings_v1'
      ];
      
      const validPayload: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (key in payload) {
          validPayload[key] = payload[key];
        }
      }
      
      await cloud.setMany(validPayload);
      return res.json({ ok: true, entries: Object.keys(validPayload).length });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== USERS CRUD ==========
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.getUsers();
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await db.getUserById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const userData = req.body as Omit<User, 'id'>;
      const user = await db.saveUser({ ...userData, id: `usr-${Date.now()}` });
      await db.logAudit('User Created', 'users', user.id, `Created user ${user.name}`);
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const userData = req.body as Omit<User, 'id'>;
      const user = await db.saveUser({ ...userData, id: req.params.id });
      await db.logAudit('User Updated', 'users', user.id, `Updated user ${user.name}`);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const success = await db.deleteUser(req.params.id);
      if (!success) return res.status(404).json({ error: 'User not found' });
      await db.logAudit('User Deleted', 'users', req.params.id, 'Deleted user');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== CUSTOMERS CRUD ==========
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await db.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/customers/:id', async (req, res) => {
    try {
      const customer = await db.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const customerData = req.body as Omit<Customer, 'id' | 'createdAt'>;
      const newCustomer = { ...customerData, id: `cust-${Date.now()}`, createdAt: new Date().toISOString() } as Customer & { id: string };
      const customer = await db.saveCustomer(newCustomer);
      await db.logAudit('Customer Created', 'customers', customer.id, `Created customer ${customer.name}`);
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    try {
      const customerData = req.body as Omit<Customer, 'id' | 'createdAt'>;
      const existing = await db.getCustomerById(req.params.id);
      const updatedCustomer = { ...customerData, id: req.params.id, createdAt: existing?.createdAt || new Date().toISOString() } as Customer & { id: string };
      const customer = await db.saveCustomer(updatedCustomer);
      await db.logAudit('Customer Updated', 'customers', customer.id, `Updated customer ${customer.name}`);
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      const success = await db.deleteCustomer(req.params.id);
      if (!success) return res.status(404).json({ error: 'Customer not found' });
      await db.logAudit('Customer Deleted', 'customers', req.params.id, 'Deleted customer');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== VEHICLES CRUD ==========
  app.get('/api/vehicles', async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const vehicles = await db.getVehicles(customerId);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/vehicles/:id', async (req, res) => {
    try {
      const vehicle = await db.getVehicleById(req.params.id);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/vehicles', async (req, res) => {
    try {
      const vehicleData = req.body as Omit<Vehicle, 'id' | 'createdAt'>;
      const newVehicle = { ...vehicleData, id: `veh-${Date.now()}`, createdAt: new Date().toISOString() } as Vehicle & { id: string };
      const vehicle = await db.saveVehicle(newVehicle);
      await db.logAudit('Vehicle Created', 'vehicles', vehicle.id, `Created vehicle ${vehicle.make} ${vehicle.model}`);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/vehicles/:id', async (req, res) => {
    try {
      const vehicleData = req.body as Omit<Vehicle, 'id' | 'createdAt'>;
      const existing = await db.getVehicleById(req.params.id);
      const updatedVehicle = { ...vehicleData, id: req.params.id, createdAt: existing?.createdAt || new Date().toISOString() } as Vehicle & { id: string };
      const vehicle = await db.saveVehicle(updatedVehicle);
      await db.logAudit('Vehicle Updated', 'vehicles', vehicle.id, `Updated vehicle ${vehicle.make} ${vehicle.model}`);
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/vehicles/:id', async (req, res) => {
    try {
      const success = await db.deleteVehicle(req.params.id);
      if (!success) return res.status(404).json({ error: 'Vehicle not found' });
      await db.logAudit('Vehicle Deleted', 'vehicles', req.params.id, 'Deleted vehicle');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== JOBCARDS CRUD ==========
  app.get('/api/jobcards', async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as string | undefined;
      const jobcards = await db.getJobCards(customerId, status);
      res.json(jobcards);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/jobcards/:id', async (req, res) => {
    try {
      const jobcard = await db.getJobCardById(req.params.id);
      if (!jobcard) return res.status(404).json({ error: 'Job card not found' });
      res.json(jobcard);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/jobcards', async (req, res) => {
    try {
      const jobData = req.body as Omit<JobCard, 'id' | 'createdAt'>;
      const newJob = { ...jobData, id: `job-${Date.now()}` } as JobCard & { id: string };
      const jobcard = await db.saveJobCard(newJob);
      await db.logAudit('JobCard Created', 'jobcards', jobcard.id, `Created job ${jobcard.jobNumber}`);
      res.status(201).json(jobcard);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/jobcards/:id', async (req, res) => {
    try {
      const jobData = req.body as Omit<JobCard, 'id' | 'createdAt'>;
      const updatedJob = { ...jobData, id: req.params.id } as JobCard & { id: string };
      const jobcard = await db.saveJobCard(updatedJob);
      await db.logAudit('JobCard Updated', 'jobcards', jobcard.id, `Updated job ${jobcard.jobNumber}`);
      res.json(jobcard);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/jobcards/:id', async (req, res) => {
    try {
      const success = await db.deleteJobCard(req.params.id);
      if (!success) return res.status(404).json({ error: 'Job card not found' });
      await db.logAudit('JobCard Deleted', 'jobcards', req.params.id, 'Deleted job');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== PAYMENTS CRUD ==========
  app.get('/api/payments', async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const jobCardId = req.query.jobCardId as string | undefined;
      const payments = await db.getPayments(customerId, jobCardId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/payments', async (req, res) => {
    try {
      const paymentData = req.body as Omit<Payment, 'id' | 'createdAt'>;
      const newPayment = { ...paymentData, id: `pay-${Date.now()}` } as Payment & { id: string };
      const payment = await db.savePayment(newPayment);
      await db.logAudit('Payment Recorded', 'payments', payment.id, `Recorded payment of ${payment.amount}`);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/payments/:id', async (req, res) => {
    try {
      const success = await db.deletePayment(req.params.id);
      if (!success) return res.status(404).json({ error: 'Payment not found' });
      await db.logAudit('Payment Deleted', 'payments', req.params.id, 'Deleted payment');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== INVOICES CRUD ==========
  app.get('/api/invoices', async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const jobCardId = req.query.jobCardId as string | undefined;
      const invoices = await db.getInvoices(customerId, jobCardId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const invoice = await db.getInvoiceById(req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      const invoiceData = req.body as Omit<Invoice, 'id' | 'createdAt'>;
      const newInvoice = { ...invoiceData, id: `inv-${Date.now()}` } as Invoice & { id: string };
      const invoice = await db.saveInvoice(newInvoice);
      await db.logAudit('Invoice Created', 'invoices', invoice.id, `Created invoice ${invoice.invoiceNumber}`);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/invoices/:id', async (req, res) => {
    try {
      const invoiceData = req.body as Omit<Invoice, 'id' | 'createdAt'>;
      const updatedInvoice = { ...invoiceData, id: req.params.id } as Invoice & { id: string };
      const invoice = await db.saveInvoice(updatedInvoice);
      await db.logAudit('Invoice Updated', 'invoices', invoice.id, `Updated invoice ${invoice.invoiceNumber}`);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      const success = await db.deleteInvoice(req.params.id);
      if (!success) return res.status(404).json({ error: 'Invoice not found' });
      await db.logAudit('Invoice Deleted', 'invoices', req.params.id, 'Deleted invoice');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== REQUISITIONS CRUD ==========
  app.get('/api/requisitions', async (req, res) => {
    try {
      const jobCardId = req.query.jobCardId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as string | undefined;
      const requisitions = await db.getRequisitions(jobCardId, customerId, status);
      res.json(requisitions);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/requisitions', async (req, res) => {
    try {
      const requisitionData = req.body as Omit<Requisition, 'id' | 'createdAt'>;
      const newRequisition = { ...requisitionData, id: `req-${Date.now()}` } as Requisition & { id: string };
      const requisition = await db.saveRequisition(newRequisition);
      await db.logAudit('Requisition Created', 'requisitions', requisition.id, `Created requisition ${requisition.requisitionNumber}`);
      res.status(201).json(requisition);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/requisitions/:id', async (req, res) => {
    try {
      const requisitionData = req.body as Omit<Requisition, 'id' | 'createdAt'>;
      const updatedRequisition = { ...requisitionData, id: req.params.id } as Requisition & { id: string };
      const requisition = await db.saveRequisition(updatedRequisition);
      await db.logAudit('Requisition Updated', 'requisitions', requisition.id, `Updated requisition ${requisition.requisitionNumber}`);
      res.json(requisition);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/requisitions/:id', async (req, res) => {
    try {
      const success = await db.deleteRequisition(req.params.id);
      if (!success) return res.status(404).json({ error: 'Requisition not found' });
      await db.logAudit('Requisition Deleted', 'requisitions', req.params.id, 'Deleted requisition');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== EXPENSES CRUD ==========
  app.get('/api/expenses', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const expenses = await db.getExpenses(category);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    try {
      const expenseData = req.body as Omit<Expense, 'id' | 'createdAt'>;
      const newExpense = { ...expenseData, id: `exp-${Date.now()}` } as Expense & { id: string };
      const expense = await db.saveExpense(newExpense);
      await db.logAudit('Expense Created', 'expenses', expense.id, `Created expense of ${expense.amount}`);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const success = await db.deleteExpense(req.params.id);
      if (!success) return res.status(404).json({ error: 'Expense not found' });
      await db.logAudit('Expense Deleted', 'expenses', req.params.id, 'Deleted expense');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== INVENTORY CRUD ==========
  app.get('/api/inventory', async (req, res) => {
    try {
      const inventory = await db.getInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/inventory', async (req, res) => {
    try {
      const itemData = req.body as Omit<InventoryPart, 'id' | 'createdAt'>;
      const newItem = { ...itemData, id: `inv-item-${Date.now()}` } as InventoryPart & { id: string };
      const item = await db.saveInventoryItem(newItem);
      await db.logAudit('Inventory Item Created', 'inventory', item.id, `Created inventory item ${item.partName}`);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/inventory/:id', async (req, res) => {
    try {
      const itemData = req.body as Omit<InventoryPart, 'id' | 'createdAt'>;
      const updatedItem = { ...itemData, id: req.params.id } as InventoryPart & { id: string };
      const item = await db.saveInventoryItem(updatedItem);
      await db.logAudit('Inventory Item Updated', 'inventory', item.id, `Updated inventory item ${item.partName}`);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/inventory/:id', async (req, res) => {
    try {
      const success = await db.deleteInventoryItem(req.params.id);
      if (!success) return res.status(404).json({ error: 'Inventory item not found' });
      await db.logAudit('Inventory Item Deleted', 'inventory', req.params.id, 'Deleted inventory item');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== AUDIT LOGS ==========
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 100), 1000);
      const logs = await db.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ========== SETTINGS ==========
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      await db.setSetting(key, value);
      res.json({ ok: true, key, value });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      system: "EL-JINDI AUTO SERVICES MANAGEMENT SYSTEM",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/info", (req, res) => {
    res.json({
      name: "EL-JINDI AUTO SERVICES",
      version: "1.0.0",
      description: "Automotive Workshop Operations, Inventory, Invoicing & Financial System",
      modules: [
        "Daily Work & Job Cards",
        "Customers & Vehicles Directory",
        "Price List & Estimations",
        "Spare Parts Inventory & Requisitions",
        "Quotations & Invoices with VAT/NHIL",
        "Payments & Expense Tracking",
        "Suppliers & Purchase Logs",
        "Bookings Calendar",
        "Analytical Workshop Reports",
        "Excel Importer (.xlsx)",
        "Role-Based Access & Audit Logs"
      ]
    });
  });

  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }
 
     const loginKey = String(email).trim().toLowerCase();
     const passwordValue = String(password);

     // Get users from database
     const users = await db.getUsers();
     const user = users.find((u: any) => {
       const emailMatches = String(u.email ?? '').trim().toLowerCase() === loginKey;
       const usernameMatches = String(u.username ?? '').trim().toLowerCase() === loginKey;
       return emailMatches || usernameMatches;
     });
 
     // Check if user exists and has a password
     if (!user || !user.password) {
       return res.status(401).json({ error: 'Invalid credentials' });
     }
 
     const candidatePassword = String(user.password);
     const passwordMatch = candidatePassword.startsWith('$2')
       ? await bcrypt.compare(passwordValue, candidatePassword)
       : passwordValue === candidatePassword;

     if (!passwordMatch) {
       return res.status(401).json({ error: 'Invalid credentials' });
     }
 
     const username = (user as any).username ?? (user as any).name ?? (user as any).email?.split('@')[0] ?? 'User';
     const normalizedUser = {
       ...user,
       name: user.name ?? username,
       role: normalizeUserRole(user.role),
     };

     // Generate JWT token
     const token = jwt.sign(
       { uid: user.id, role: normalizedUser.role },
       process.env.JWT_SECRET!,
       { expiresIn: '8h' }
     );
 
     // Set HttpOnly cookie for security
     res.cookie('eljindi_token', token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 8 * 60 * 60 * 1000 // 8 hours
     });
 
     // Return user without password
     const { password: _, ...safeUser } = normalizedUser;
     return res.json({ ok: true, user: safeUser, token });
   } catch (error) {
     console.error('Login error:', error);
     return res.status(500).json({ error: 'Authentication failed' });
   }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.json({ user });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get current user' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    try {
      res.clearCookie('eljindi_token');
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }
  });

  app.get("/api/dvla/vehicle", async (req, res) => {
    const registration = String(req.query.registration || "").trim();
    if (!registration) {
      return res.status(400).json({ error: "registration is required" });
    }

    const dvlaUrl = process.env.DVLA_API_URL;
    const dvlaKey = process.env.DVLA_API_KEY;

    if (!dvlaUrl || !dvlaKey) {
      return res.status(500).json({ error: "DVLA API credentials are not configured" });
    }

    try {
      const response = await fetch(`${dvlaUrl}?registration=${encodeURIComponent(registration)}`, {
        headers: {
          Authorization: `Bearer ${dvlaKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: "DVLA lookup failed", details: text });
      }

      const data = await response.json();
      return res.json({ data });
    } catch (error) {
      return res.status(500).json({ error: "DVLA request error", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, message } = req.body as { to?: string; message?: string };
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v17.0";

    if (!to || !message) {
      return res.status(400).json({ error: "to and message are required" });
    }

    if (!phoneNumberId || !accessToken) {
      return res.status(500).json({ error: "WhatsApp API credentials are not configured" });
    }

    try {
      const url = `${apiUrl}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/[^0-9+]/g, ""),
          type: "text",
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      const text = await response.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: "WhatsApp send failed", details: data });
      }

      return res.json({ data });
    } catch (error) {
      return res.status(500).json({ error: "WhatsApp request error", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Server-side PDF generation for a quotation
  app.post('/api/pdf/quotation', async (req, res) => {
    const quotation = req.body as any;
    if (!quotation || !quotation.quotationNumber) {
      return res.status(400).json({ error: 'quotation object with quotationNumber is required in body' });
    }

    try {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${quotation.quotationNumber}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.pipe(res as any);

      const brandColor = '#111827';
      const softGray = '#F8FAFC';
      const mutedGray = '#6B7280';
      const lightGray = '#F3F4F6';
      const darkGray = '#111827';

      // Header area
      const headerTop = doc.y;
      const iconSize = 30;
      doc.roundedRect(doc.x, headerTop, iconSize, iconSize, 8).fill(darkGray);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(16).text('E', doc.x, headerTop + 5, { width: iconSize, align: 'center' });

      doc.fillColor(darkGray).font('Helvetica-Bold').fontSize(18).text(quotation.companyName || 'EL-JINDI AUTO SERVICES', doc.x + iconSize + 12, headerTop, {
        width: pageWidth - iconSize - 12,
        continued: false,
      });

      doc.font('Helvetica').fontSize(9).fillColor(mutedGray).text(quotation.companyTagline || 'Automotive Maintenance, Diagnostics & Repairs Specialist', {
        width: pageWidth - iconSize - 12,
      });

      if (quotation.companyAddress) {
        doc.fontSize(8).fillColor(mutedGray).text(quotation.companyAddress, {
          width: pageWidth - iconSize - 12,
          lineGap: 2,
        });
      }

      const contactItems: string[] = [];
      if (quotation.companyPhone) contactItems.push(`Tel: ${quotation.companyPhone}`);
      if (quotation.companyEmail) contactItems.push(`Email: ${quotation.companyEmail}`);
      if (contactItems.length) {
        doc.fontSize(8).fillColor(mutedGray).text(contactItems.join(' | '), {
          width: pageWidth - iconSize - 12,
          lineGap: 2,
        });
      }

      const headerY = headerTop;
      const rightHeaderX = doc.page.margins.left + pageWidth * 0.55;
      const rightHeaderWidth = pageWidth * 0.45;
      const rightBlockTop = headerY;
      const rightBlockHeight = 72;

      doc.fillColor(darkGray).font('Helvetica-Bold').fontSize(16).text('QUOTATION', rightHeaderX, rightBlockTop, {
        width: rightHeaderWidth,
        align: 'right',
      });

      doc.font('Helvetica-Bold').fontSize(12).text(quotation.quotationNumber, {
        width: rightHeaderWidth,
        align: 'right',
      });
      doc.font('Helvetica').fontSize(9).fillColor(mutedGray).text(`Date: ${quotation.date || ''}`, {
        width: rightHeaderWidth,
        align: 'right',
      });
      doc.font('Helvetica').fontSize(9).text(`Valid Until: ${quotation.validityDate || ''}`, {
        width: rightHeaderWidth,
        align: 'right',
      });

      doc.moveDown(1.6);

      // Customer / Vehicle card
      const cardX = doc.page.margins.left;
      const cardY = doc.y;
      const cardWidth = pageWidth;
      const cardHeight = 80;
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10).fill(lightGray);
      doc.fillColor(mutedGray).font('Helvetica-Bold').fontSize(8).text('CUSTOMER', cardX + 12, cardY + 12);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray).text(quotation.customerName || '', cardX + 12, doc.y + 2);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedGray).text('VEHICLE', cardX + 12, doc.y + 8);
      doc.font('Helvetica').fontSize(10).fillColor(darkGray).text(quotation.vehicleDetails || '', cardX + 12, doc.y + 2);
      if (quotation.jobId) {
        doc.font('Helvetica').fontSize(8).fillColor(mutedGray).text(`Job: ${quotation.jobId}`, cardX + 12, doc.y + 6);
      }
      doc.moveDown(1.8);

      // Services / parts table
      const tableTop = doc.y;
      const tableX = doc.x;
      const colWidths = [22, pageWidth * 0.45, pageWidth * 0.16, pageWidth * 0.18, pageWidth * 0.20];
      const tableHeaders = ['#', 'ITEM / DESCRIPTION', 'QTY / HRS', 'UNIT PRICE (GHC)', 'TOTAL (GHC)'];

      doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
      doc.roundedRect(tableX, tableTop, pageWidth, 24, 8).fill(darkGray);
      let cellX = tableX + 8;
      tableHeaders.forEach((header, index) => {
        doc.text(header, cellX, tableTop + 7, {
          width: colWidths[index] - (index === 0 ? 8 : 12),
          align: index > 0 ? 'right' : 'left',
        });
        cellX += colWidths[index];
      });

      let currentY = tableTop + 24;
      const rowPadding = 6;
      const rowItems = [...(quotation.services || []).map((item: any, index: number) => ({
        label: `${index + 1}`,
        description: `${item.serviceName}${item.description ? item.description : ''}`,
        qty: item.estimatedHours != null ? item.estimatedHours : '-',
        unitPrice: Number(item.labourRate).toFixed(2),
        total: Number(item.total).toFixed(2),
      })), ...(quotation.parts || []).map((item: any, index: number) => ({
        label: `${(quotation.services?.length || 0) + index + 1}`,
        description: `${item.partName}${item.partNumber ? ` (${item.partNumber})` : ''}`,
        qty: item.quantity != null ? item.quantity : '-',
        unitPrice: Number(item.unitPrice).toFixed(2),
        total: Number(item.total).toFixed(2),
      }))];

      rowItems.forEach((row, index) => {
        const background = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        const rowHeight = Math.max(
          doc.heightOfString(String(row.description), { width: colWidths[1] - 12, align: 'left' }) + rowPadding,
          20
        );
        doc.fillColor(background).rect(tableX, currentY, pageWidth, rowHeight).fill();
        doc.fillColor(darkGray).font('Helvetica-Bold').fontSize(8).text(row.label, tableX + 8, currentY + 6, { width: colWidths[0] - 8, align: 'left' });
        doc.font('Helvetica-Bold').fontSize(8).text(row.description, tableX + colWidths[0] + 4, currentY + 6, {
          width: colWidths[1] - 12,
          align: 'left',
        });
        doc.font('Helvetica').fontSize(8).text(String(row.qty), tableX + colWidths[0] + colWidths[1], currentY + 6, {
          width: colWidths[2] - 12,
          align: 'right',
        });
        doc.text(row.unitPrice, tableX + colWidths[0] + colWidths[1] + colWidths[2], currentY + 6, {
          width: colWidths[3] - 12,
          align: 'right',
        });
        doc.text(row.total, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY + 6, {
          width: colWidths[4] - 12,
          align: 'right',
        });
        currentY += rowHeight;
      });

      doc.moveTo(tableX, currentY).lineTo(tableX + pageWidth, currentY).lineWidth(0.5).strokeColor(lightGray).stroke();
      doc.moveDown(0.5);

      // Status card and totals block
      const statusCardTop = currentY + 14;
      const statusCardWidth = pageWidth * 0.55;
      const totalsBlockWidth = pageWidth * 0.42;

      doc.roundedRect(tableX, statusCardTop, statusCardWidth, 70, 10).fill(lightGray);
      doc.fillColor(mutedGray).font('Helvetica-Bold').fontSize(8).text('Status', tableX + 12, statusCardTop + 12);
      doc.fillColor(darkGray).font('Helvetica-Bold').fontSize(11).text(quotation.status || 'Draft', tableX + 12, statusCardTop + 24);
      doc.font('Helvetica').fontSize(8).fillColor(mutedGray).text('Approval state from customer is reflected here for tracking.', tableX + 12, statusCardTop + 40, {
        width: statusCardWidth - 24,
        lineGap: 2,
      });

      const totalsX = tableX + pageWidth - totalsBlockWidth;
      doc.roundedRect(totalsX, statusCardTop, totalsBlockWidth, 70, 10).fill(darkGray);
      doc.fillColor('white').font('Helvetica').fontSize(9).text('Subtotal', totalsX + 12, statusCardTop + 12, { width: totalsBlockWidth - 24, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).text(`GH₵ ${Number(quotation.subtotal || 0).toFixed(2)}`, totalsX + 12, statusCardTop + 12, { width: totalsBlockWidth - 24, align: 'left' });
      doc.font('Helvetica').fontSize(9).text('Discount', totalsX + 12, statusCardTop + 26, { width: totalsBlockWidth - 24, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).text(`GH₵ ${Number(quotation.discount || 0).toFixed(2)}`, totalsX + 12, statusCardTop + 26, { width: totalsBlockWidth - 24, align: 'left' });
      doc.font('Helvetica').fontSize(9).text('VAT/Levies', totalsX + 12, statusCardTop + 40, { width: totalsBlockWidth - 24, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).text(`GH₵ ${Number(quotation.taxAmount || 0).toFixed(2)}`, totalsX + 12, statusCardTop + 40, { width: totalsBlockWidth - 24, align: 'left' });
      doc.moveTo(totalsX + 12, statusCardTop + 56).lineTo(totalsX + totalsBlockWidth - 12, statusCardTop + 56).lineWidth(0.5).strokeColor('#4B5563').stroke();
      doc.font('Helvetica-Bold').fontSize(11).text('Total', totalsX + 12, statusCardTop + 60, { width: totalsBlockWidth - 24, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(11).text(`GH₵ ${Number(quotation.grandTotal || 0).toFixed(2)}`, totalsX + 12, statusCardTop + 60, { width: totalsBlockWidth - 24, align: 'left' });

      doc.moveDown(6);
      if (quotation.notes) {
        doc.fillColor(darkGray).font('Helvetica-Bold').fontSize(10).text('Notes', tableX, statusCardTop + 96);
        doc.font('Helvetica').fontSize(9).fillColor(mutedGray).text(String(quotation.notes), {
          width: pageWidth,
          lineGap: 3,
        });
      }

      doc.moveDown(1);
      doc.font('Helvetica').fontSize(9).fillColor(mutedGray).text('Thank you for choosing EL-Jindi Auto Services.', {
        width: pageWidth,
      });

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      return res.status(500).json({ error: 'Failed to generate PDF', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Simple Server-Sent Events for real-time notifications
  // (moved earlier to register before Vite middleware)

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Simple Server-Sent Events for real-time notifications
  const sseClients: Array<{ id: number; res: any }> = [];

  app.get('/api/notifications/stream', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();
    const clientId = Date.now();
    sseClients.push({ id: clientId, res });
    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === clientId);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Endpoint to post a notification and broadcast to connected SSE clients
  app.post('/api/notifications', async (req, res) => {
    const notif = req.body;
    if (!notif || !notif.id) {
      return res.status(400).json({ error: 'notification object with id is required' });
    }
    const payload = `data: ${JSON.stringify(notif)}\n\n`;
    sseClients.forEach(c => {
      try {
        c.res.write(payload);
      } catch (e) {
        // ignore
      }
    });
    return res.json({ ok: true });
  });

  // Debug: list registered routes
  app.get('/api/_routes', (req, res) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routes: string[] = [];
      (app as any)._router.stack.forEach((r: any) => {
        if (r.route && r.route.path) {
          const methods = Object.keys(r.route.methods).join(',');
          routes.push(`${methods.toUpperCase()} ${r.route.path}`);
        }
      });
      res.json({ routes });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT || 3000);

  const tryListen = (port: number, retriesLeft: number) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`EL-JINDI Auto Services Server running on http://0.0.0.0:${port}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.warn(`Port ${port} is busy, retrying on ${port + 1}...`);
        tryListen(port + 1, retriesLeft - 1);
        return;
      }

      console.error('Server failed to start:', error);
      process.exit(1);
    });
  };

  tryListen(PORT, 10);
}

if (!process.env.VERCEL) {
  startServer();
}
