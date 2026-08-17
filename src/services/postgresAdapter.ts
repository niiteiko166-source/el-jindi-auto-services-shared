/**
 * PostgreSQL Adapter for production use
 * Provides the same interface as DatabaseManager but uses CloudStore (PostgreSQL)
 */

import { CloudStore } from './cloudStore';
import bcrypt from 'bcryptjs';
import type { 
  User, Customer, Vehicle, JobCard, Payment, Invoice, 
  Requisition, Expense, InventoryPart, AuditLog, WorkshopSettings, PriceListItem,
  Quotation, Supplier, Booking, AppNotification
} from '../types';

export class PostgresAdapter {
  private cloud: CloudStore;

  constructor(cloud: CloudStore) {
    this.cloud = cloud;
  }

  // ========== USERS ==========
  async getUsers(): Promise<User[]> {
    return (await this.cloud.get('eljindi_users_v1')) || [];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  async saveUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    
    if (user.password && !user.password.startsWith('$2')) {
      user.password = await bcrypt.hash(String(user.password), 12);
    }
    
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    await this.cloud.setMany({ 'eljindi_users_v1': users });
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return false;
    users.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_users_v1': users });
    return true;
  }

  // ========== CUSTOMERS ==========
  async getCustomers(): Promise<Customer[]> {
    return (await this.cloud.get('eljindi_customers_v1')) || [];
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const customers = await this.getCustomers();
    return customers.find(c => c.id === id);
  }

  async saveCustomer(customer: Customer): Promise<Customer> {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    await this.cloud.setMany({ 'eljindi_customers_v1': customers });
    return customer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx < 0) return false;
    customers.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_customers_v1': customers });
    return true;
  }

  // ========== VEHICLES ==========
  async getVehicles(customerId?: string): Promise<Vehicle[]> {
    const vehicles = (await this.cloud.get('eljindi_vehicles_v1')) || [];
    if (customerId) return vehicles.filter((v: any) => v.customerId === customerId);
    return vehicles;
  }

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    const vehicles = await this.getVehicles();
    return vehicles.find(v => v.id === id);
  }

  async saveVehicle(vehicle: Vehicle): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    const idx = vehicles.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      vehicles[idx] = vehicle;
    } else {
      vehicles.push(vehicle);
    }
    await this.cloud.setMany({ 'eljindi_vehicles_v1': vehicles });
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const vehicles = await this.getVehicles();
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx < 0) return false;
    vehicles.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_vehicles_v1': vehicles });
    return true;
  }

  // ========== JOB CARDS ==========
  async getJobCards(customerId?: string, status?: string): Promise<JobCard[]> {
    const jobs = (await this.cloud.get('eljindi_jobs_v1')) || [];
    let result = jobs;
    if (customerId) result = result.filter((j: any) => j.customerId === customerId);
    if (status) result = result.filter((j: any) => j.status === status);
    return result;
  }

  async getJobCardById(id: string): Promise<JobCard | undefined> {
    const jobs = await this.getJobCards();
    return jobs.find(j => j.id === id);
  }

  async saveJobCard(job: JobCard): Promise<JobCard> {
    const jobs = await this.getJobCards();
    const idx = jobs.findIndex(j => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.push(job);
    }
    await this.cloud.setMany({ 'eljindi_jobs_v1': jobs });
    return job;
  }

  async deleteJobCard(id: string): Promise<boolean> {
    const jobs = await this.getJobCards();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx < 0) return false;
    jobs.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_jobs_v1': jobs });
    return true;
  }

  // ========== PAYMENTS ==========
  async getPayments(customerId?: string, jobCardId?: string): Promise<Payment[]> {
    const payments = (await this.cloud.get('eljindi_payments_v1')) || [];
    let result = payments;
    if (customerId) result = result.filter((p: any) => p.customerId === customerId);
    if (jobCardId) result = result.filter((p: any) => p.jobCardId === jobCardId);
    return result;
  }

  async savePayment(payment: Payment): Promise<Payment> {
    const payments = await this.getPayments();
    const idx = payments.findIndex(p => p.id === payment.id);
    if (idx >= 0) {
      payments[idx] = payment;
    } else {
      payments.push(payment);
    }
    await this.cloud.setMany({ 'eljindi_payments_v1': payments });
    return payment;
  }

  async deletePayment(id: string): Promise<boolean> {
    const payments = await this.getPayments();
    const idx = payments.findIndex(p => p.id === id);
    if (idx < 0) return false;
    payments.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_payments_v1': payments });
    return true;
  }

  // ========== INVOICES ==========
  async getInvoices(customerId?: string, jobCardId?: string): Promise<Invoice[]> {
    const invoices = (await this.cloud.get('eljindi_invoices_v1')) || [];
    let result = invoices;
    if (customerId) result = result.filter((i: any) => i.customerId === customerId);
    if (jobCardId) result = result.filter((i: any) => i.jobCardId === jobCardId);
    return result;
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const invoices = await this.getInvoices();
    return invoices.find(i => i.id === id);
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice> {
    const invoices = await this.getInvoices();
    const idx = invoices.findIndex(i => i.id === invoice.id);
    if (idx >= 0) {
      invoices[idx] = invoice;
    } else {
      invoices.push(invoice);
    }
    await this.cloud.setMany({ 'eljindi_invoices_v1': invoices });
    return invoice;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const invoices = await this.getInvoices();
    const idx = invoices.findIndex(i => i.id === id);
    if (idx < 0) return false;
    invoices.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_invoices_v1': invoices });
    return true;
  }

  // ========== QUOTATIONS ==========
  async getQuotations(): Promise<Quotation[]> {
    return (await this.cloud.get('eljindi_quotations_v1')) || [];
  }

  async getQuotationById(id: string): Promise<Quotation | undefined> {
    const quotations = await this.getQuotations();
    return quotations.find(q => q.id === id);
  }

  async saveQuotation(quotation: Quotation): Promise<Quotation> {
    const quotations = await this.getQuotations();
    const idx = quotations.findIndex(q => q.id === quotation.id);
    if (idx >= 0) {
      quotations[idx] = quotation;
    } else {
      quotations.push(quotation);
    }
    await this.cloud.setMany({ 'eljindi_quotations_v1': quotations });
    return quotation;
  }

  async deleteQuotation(id: string): Promise<boolean> {
    const quotations = await this.getQuotations();
    const idx = quotations.findIndex(q => q.id === id);
    if (idx < 0) return false;
    quotations.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_quotations_v1': quotations });
    return true;
  }

  // ========== PRICE LIST ==========
  async getPriceList(): Promise<PriceListItem[]> {
    return (await this.cloud.get('eljindi_price_list_v2')) || [];
  }

  async savePriceList(items: PriceListItem[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_price_list_v2': items });
  }

  // ========== INVENTORY ==========
  async getInventory(): Promise<InventoryPart[]> {
    return (await this.cloud.get('eljindi_inventory_v1')) || [];
  }

  async saveInventory(inventory: InventoryPart[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_inventory_v1': inventory });
  }

  async saveInventoryItem(item: InventoryPart): Promise<InventoryPart> {
    const inventory = await this.getInventory();
    const idx = inventory.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      inventory[idx] = item;
    } else {
      inventory.push(item);
    }
    await this.cloud.setMany({ 'eljindi_inventory_v1': inventory });
    return item;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const inventory = await this.getInventory();
    const idx = inventory.findIndex(i => i.id === id);
    if (idx < 0) return false;
    inventory.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_inventory_v1': inventory });
    return true;
  }

  // ========== REQUISITIONS ==========
  async getRequisitions(jobCardId?: string, customerId?: string, status?: string): Promise<Requisition[]> {
    const all = (await this.cloud.get('eljindi_requisitions_v1')) || [];
    return all.filter(r =>
      (!jobCardId || r.jobCardId === jobCardId) &&
      (!customerId || r.customerId === customerId) &&
      (!status || r.status === status)
    );
  }

  async saveRequisition(requisition: Requisition): Promise<Requisition> {
    const requisitions = await this.getRequisitions();
    const idx = requisitions.findIndex(r => r.id === requisition.id);
    if (idx >= 0) {
      requisitions[idx] = requisition;
    } else {
      requisitions.push(requisition);
    }
    await this.cloud.setMany({ 'eljindi_requisitions_v1': requisitions });
    return requisition;
  }

  async deleteRequisition(id: string): Promise<boolean> {
    const requisitions = await this.getRequisitions();
    const idx = requisitions.findIndex(r => r.id === id);
    if (idx < 0) return false;
    requisitions.splice(idx, 1);
    await this.cloud.setMany({ 'eljindi_requisitions_v1': requisitions });
    return true;
  }

  async saveRequisitions(requisitions: Requisition[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_requisitions_v1': requisitions });
  }

  // ========== EXPENSES ==========
  async getExpenses(category?: string): Promise<Expense[]> {
    const all = (await this.cloud.get('eljindi_expenses_v1')) || [];
    return category ? all.filter(e => e.category === category) : all;
  }

  async saveExpenses(expenses: Expense[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_expenses_v1': expenses });
  }

  async saveExpense(expense: Expense): Promise<Expense> {
    const expenses = await this.getExpenses();
    const idx = expenses.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      expenses[idx] = expense;
    } else {
      expenses.push(expense);
    }
    await this.saveExpenses(expenses);
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const expenses = await this.getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return false;
    expenses.splice(idx, 1);
    await this.saveExpenses(expenses);
    return true;
  }

  // ========== SUPPLIERS ==========
  async getSuppliers(): Promise<Supplier[]> {
    return (await this.cloud.get('eljindi_suppliers_v1')) || [];
  }

  async saveSuppliers(suppliers: Supplier[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_suppliers_v1': suppliers });
  }

  // ========== BOOKINGS ==========
  async getBookings(): Promise<Booking[]> {
    return (await this.cloud.get('eljindi_bookings_v1')) || [];
  }

  async saveBookings(bookings: Booking[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_bookings_v1': bookings });
  }

  // ========== AUDIT LOGS ==========
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const logs = (await this.cloud.get('eljindi_audit_logs_v1')) || [];
    return logs.slice(-limit);
  }

  async logAudit(
    action: string,
    recordType: string,
    recordId: string,
    description: string,
    userId: string = 'system-user',
    userName: string = 'System'
  ): Promise<void> {
    const logs = (await this.cloud.get('eljindi_audit_logs_v1')) || [];
    logs.push({
      id: `audit-${Date.now()}`,
      action,
      recordType: (recordType.charAt(0).toUpperCase() + recordType.slice(1)) as any,
      recordId,
      details: description,
      userId,
      userName,
      userRole: 'admin',
      timestamp: new Date().toISOString(),
    });
    await this.cloud.setMany({ 'eljindi_audit_logs_v1': logs });
  }

  // ========== SETTINGS ==========
  async getSetting(key: string): Promise<any> {
    const settings = (await this.cloud.get('eljindi_settings_v1')) || {};
    return settings[key];
  }

  async setSetting(key: string, value: any): Promise<void> {
    const settings = (await this.cloud.get('eljindi_settings_v1')) || {};
    settings[key] = value;
    await this.cloud.setMany({ 'eljindi_settings_v1': settings });
  }

  async getSettings(): Promise<WorkshopSettings> {
    return (await this.cloud.get('eljindi_settings_v1')) || {};
  }

  async getAllSettings(): Promise<WorkshopSettings> {
    return await this.getSettings();
  }

  // ========== NOTIFICATIONS ==========
  async getNotifications(): Promise<AppNotification[]> {
    return (await this.cloud.get('eljindi_notifications_v1')) || [];
  }

  async saveNotification(notification: AppNotification): Promise<AppNotification> {
    const notifications = await this.getNotifications();
    const idx = notifications.findIndex(n => n.id === notification.id);
    if (idx >= 0) {
      notifications[idx] = notification;
    } else {
      notifications.push(notification);
    }
    await this.cloud.setMany({ 'eljindi_notifications_v1': notifications });
    return notification;
  }

  async saveNotifications(notifications: AppNotification[]): Promise<void> {
    await this.cloud.setMany({ 'eljindi_notifications_v1': notifications });
  }

  // ========== EXPORT ALL DATA ==========
  async exportAllData(): Promise<Record<string, any>> {
    return await this.cloud.getAll();
  }
}
