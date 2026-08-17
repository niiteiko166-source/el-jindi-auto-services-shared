import {
  Customer,
  Vehicle,
  JobCard,
  PriceListItem,
  InventoryPart,
  InventoryTransaction,
  Requisition,
  Quotation,
  Invoice,
  Payment,
  Expense,
  Supplier,
  Booking,
  AppNotification,
  AuditLog,
  WorkshopSettings,
  User,
  JobStatus,
  QuotationStatus
} from '../types';

import {
  initialCustomers,
  initialVehicles,
  initialJobCards,
  initialPriceList,
  initialInventory,
  initialRequisitions,
  initialQuotations,
  initialInvoices,
  initialPayments,
  initialExpenses,
  initialSuppliers,
  initialBookings,
  initialNotifications,
  initialAuditLogs,
  initialSettings,
  initialUsers
} from '../data/seedData';

const STORAGE_KEYS = {
  CUSTOMERS: 'eljindi_customers_v1',
  USERS: 'eljindi_users_v1',
  VEHICLES: 'eljindi_vehicles_v1',
  JOBS: 'eljindi_jobs_v1',
  PRICE_LIST: 'eljindi_price_list_v2',
  INVENTORY: 'eljindi_inventory_v1',
  TRANSACTIONS: 'eljindi_transactions_v1',
  REQUISITIONS: 'eljindi_requisitions_v1',
  QUOTATIONS: 'eljindi_quotations_v1',
  INVOICES: 'eljindi_invoices_v1',
  PAYMENTS: 'eljindi_payments_v1',
  EXPENSES: 'eljindi_expenses_v1',
  SUPPLIERS: 'eljindi_suppliers_v1',
  BOOKINGS: 'eljindi_bookings_v1',
  NOTIFICATIONS: 'eljindi_notifications_v1',
  AUDIT_LOGS: 'eljindi_audit_logs_v1',
  SETTINGS: 'eljindi_settings_v1',
  CURRENT_USER: 'eljindi_current_user_v1',
};

// LocalStorage Helper
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    if (parsed === null || parsed === undefined) return defaultValue;
    return parsed;
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

async function syncLocalStorageToServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const snapshot = Object.fromEntries(
      Object.keys(localStorage)
        .filter(key => key.startsWith('eljindi_') && key !== STORAGE_KEYS.CURRENT_USER)
        .map(key => {
          const raw = localStorage.getItem(key);
          try { return [key, raw === null ? null : JSON.parse(raw)]; }
          catch { return [key, raw]; }
        })
    );
    if (!Object.keys(snapshot).length) return;
    const response = await fetch('/api/data/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(snapshot)
    });
    if (!response.ok) console.warn('Cloud sync rejected:', response.status);
  } catch (error) {
    console.warn('Cloud sync failed:', error);
  }
}

export async function hydrateSharedData(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch('/api/data', { credentials: 'include' });
    if (!response.ok) return false;
    const sharedData = await response.json();
    if (!sharedData || typeof sharedData !== 'object') return false;
    Object.entries(sharedData).forEach(([key, value]) => {
      if (key.startsWith('eljindi_') && value !== undefined) localStorage.setItem(key, JSON.stringify(value));
    });
    return true;
  } catch (error) {
    console.warn('Shared backend not available:', error);
    return false;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    void syncLocalStorageToServer();
  } catch (e) {
    console.warn(`Error writing ${key} to storage:`, e);
  }
}

// Financial helper
export function calculateTotals(
  labourTotal: number,
  partsTotal: number,
  discount: number = 0,
  vatRate: number = 20,
  includeVat: boolean = true,
  amountPaid: number = 0
) {
  const baseSubtotal = Math.max(0, labourTotal + partsTotal);
  const subtotal = baseSubtotal;
  const taxAmount = includeVat ? Number(((subtotal * vatRate) / 100).toFixed(2)) : 0;
  const grandTotal = Number((subtotal + taxAmount - discount).toFixed(2));
  const balance = Number(Math.max(0, grandTotal - amountPaid).toFixed(2));
  let paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' = 'Unpaid';
  if (amountPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'Partially Paid';
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    vatRate,
    taxAmount,
    grandTotal,
    amountPaid: Number(amountPaid.toFixed(2)),
    balance,
    paymentStatus
  };
}

class DatabaseService {
  private currentUser: User = initialUsers[0]; // Default Manager

  constructor() {
    const storedUser = getStored<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (storedUser) {
      this.currentUser = storedUser;
    }
  }

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User): void {
    this.currentUser = user;
    setStored(STORAGE_KEYS.CURRENT_USER, user);
    this.logAudit('User Login Switch', 'System', user.id, `Switched active session to ${user.name} (${user.role})`);
  }

  public getUsers(): User[] {
    return getStored<User[]>(STORAGE_KEYS.USERS, initialUsers);
  }

  public saveUser(userData: Omit<User, 'id'> & { id?: string }): User {
    const users = this.getUsers();

    if (userData.id) {
      const idx = users.findIndex(u => u.id === userData.id);
      if (idx !== -1) {
        const updated: User = {
          ...users[idx],
          ...userData,
          password: userData.password?.trim() || users[idx].password || '',
        };
        users[idx] = updated;
        setStored(STORAGE_KEYS.USERS, users);
        this.logAudit('User Updated', 'System', updated.id, `Updated user ${updated.name}`);
        return updated;
      }
    }

    const password = String(userData.password ?? '').trim();
    const newUser: User = {
      ...userData,
      password,
      id: `usr-${Date.now()}`,
    } as User;
    setStored(STORAGE_KEYS.USERS, [newUser, ...users]);
    this.logAudit('User Created', 'System', newUser.id, `Created user ${newUser.name}`);
    return newUser;
  }

  public deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    const deleted = users[idx];
    users.splice(idx, 1);
    setStored(STORAGE_KEYS.USERS, users);
    this.logAudit('User Deleted', 'System', deleted.id, `Deleted user ${deleted.name}`);
    return true;
  }

  // Audit Logs
  public logAudit(
    action: string,
    recordType: AuditLog['recordType'],
    recordId?: string,
    details: string = ''
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action,
      recordType,
      recordId,
      details
    };
    const updated = [newLog, ...logs].slice(0, 200); // Keep last 200 logs
    setStored(STORAGE_KEYS.AUDIT_LOGS, updated);
  }

  public getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  // Settings
  public getSettings(): WorkshopSettings {
    const settings = getStored<WorkshopSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    if (settings && (settings.defaultVatRate === 21.9 || !settings.defaultVatRate)) {
      settings.defaultVatRate = 20;
      setStored(STORAGE_KEYS.SETTINGS, settings);
    }
    return settings;
  }

  public updateSettings(settings: Partial<WorkshopSettings>): WorkshopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    setStored(STORAGE_KEYS.SETTINGS, updated);
    this.logAudit('Update Workshop Settings', 'System', undefined, 'Updated company profile or VAT configuration');
    return updated;
  }

  // Customers
  public getCustomers(): Customer[] {
    return getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  public saveCustomer(customerData: Omit<Customer, 'id' | 'createdAt'> & { id?: string }): Customer {
    const customers = this.getCustomers();
    if (customerData.id) {
      const index = customers.findIndex(c => c.id === customerData.id);
      if (index !== -1) {
        const updatedCustomer: Customer = {
          ...customers[index],
          ...customerData,
        };
        customers[index] = updatedCustomer;
        setStored(STORAGE_KEYS.CUSTOMERS, customers);
        this.logAudit('Customer Updated', 'Customer', updatedCustomer.id, `Updated details for ${updatedCustomer.name}`);
        return updatedCustomer;
      }
    }

    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setStored(STORAGE_KEYS.CUSTOMERS, [newCustomer, ...customers]);
    this.logAudit('Customer Created', 'Customer', newCustomer.id, `Created customer record ${newCustomer.name}`);
    return newCustomer;
  }

  public deleteCustomer(customerId: string): boolean {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index === -1) return false;
    const deleted = customers[index];
    customers.splice(index, 1);
    setStored(STORAGE_KEYS.CUSTOMERS, customers);
    this.logAudit('Customer Deleted', 'Customer', deleted.id, `Deleted customer record ${deleted.name}`);
    return true;
  }

  // Vehicles
  public getVehicles(): Vehicle[] {
    return getStored<Vehicle[]>(STORAGE_KEYS.VEHICLES, initialVehicles);
  }

  public getVehicleById(id: string): Vehicle | undefined {
    return this.getVehicles().find(v => v.id === id);
  }

  public getVehicleByRegistration(reg: string): Vehicle | undefined {
    return this.getVehicles().find(
      v => v.registrationNumber.replaceAll(/\s/g, '').toLowerCase() === reg.replaceAll(/\s/g, '').toLowerCase()
    );
  }

  public getVehiclesByCustomer(customerId: string): Vehicle[] {
    return this.getVehicles().filter(v => v.customerId === customerId);
  }

  public saveVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt'> & { id?: string }): Vehicle {
    const vehicles = this.getVehicles();

    const normalizeVin = (): string | undefined => {
      if (vehicleData.vin === undefined) {
        return undefined;
      }
      const vinTrimmed = vehicleData.vin.trim();
      return vinTrimmed ? vinTrimmed.toUpperCase() : undefined;
    };

    if (vehicleData.id) {
      const index = vehicles.findIndex(v => v.id === vehicleData.id);
      if (index !== -1) {
        const updatedVehicle: Vehicle = {
          ...vehicles[index],
          ...vehicleData,
          vin: vehicleData.vin === undefined ? vehicles[index].vin : normalizeVin(),
        };
        vehicles[index] = updatedVehicle;
        setStored(STORAGE_KEYS.VEHICLES, vehicles);
        this.logAudit('Vehicle Updated', 'Vehicle', updatedVehicle.id, `Updated vehicle ${updatedVehicle.registrationNumber}`);
        return updatedVehicle;
      }
    }

    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      vin: normalizeVin(),
    };
    setStored(STORAGE_KEYS.VEHICLES, [newVehicle, ...vehicles]);
    this.logAudit('Vehicle Registered', 'Vehicle', newVehicle.id, `Registered vehicle ${newVehicle.registrationNumber} (${newVehicle.make} ${newVehicle.model})`);
    return newVehicle;
  }

  public deleteVehicle(vehicleId: string): boolean {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex(v => v.id === vehicleId);
    if (index === -1) return false;
    const deleted = vehicles[index];
    vehicles.splice(index, 1);
    setStored(STORAGE_KEYS.VEHICLES, vehicles);
    this.logAudit('Vehicle Deleted', 'Vehicle', deleted.id, `Deleted vehicle ${deleted.registrationNumber} (${deleted.make} ${deleted.model})`);
    return true;
  }

  // Job Cards
  public getJobCards(): JobCard[] {
    return getStored<JobCard[]>(STORAGE_KEYS.JOBS, initialJobCards);
  }

  public getJobById(id: string): JobCard | undefined {
    return this.getJobCards().find(j => j.id === id);
  }

  public saveJobCard(jobData: Partial<JobCard> & { id?: string; customerId: string; vehicleId: string }): JobCard {
    const jobs = this.getJobCards();
    const customer = this.getCustomerById(jobData.customerId);
    const vehicle = this.getVehicleById(jobData.vehicleId);
    const settings = this.getSettings();

    // Recalculate totals
    const labourTotal = (jobData.services || []).reduce((sum, s) => sum + s.total, 0);
    const partsTotal = (jobData.parts || []).reduce((sum, p) => sum + p.total, 0);
    const discount = jobData.discount || 0;
    const vatRate = jobData.vatRate !== undefined ? jobData.vatRate : settings.defaultVatRate;
    const amountPaid = jobData.amountPaid || 0;

    const calc = calculateTotals(labourTotal, partsTotal, discount, vatRate, true, amountPaid);

    if (jobData.id) {
      const index = jobs.findIndex(j => j.id === jobData.id);
      if (index !== -1) {
        const existing = jobs[index];
        const statusChanged = jobData.status && jobData.status !== existing.status;

        let statusHistory = existing.statusHistory || [];
        if (statusChanged && jobData.status) {
          statusHistory = [
            ...statusHistory,
            {
              id: `hist-${Date.now()}`,
              jobId: existing.id,
              status: jobData.status,
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              userId: this.currentUser.id,
              userName: this.currentUser.name,
              comment: `Status updated to ${jobData.status}`
            }
          ];
        }

            const updatedJob: JobCard = {
          ...existing,
          ...jobData,
          customerName: customer?.name || existing.customerName,
          customerPhone: customer?.phone || existing.customerPhone,
          registrationNumber: vehicle?.registrationNumber || existing.registrationNumber,
          vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : existing.vehicleDetails,
          quotationId: jobData.quotationId || existing.quotationId,
          vehicleMileage: jobData.vehicleMileage ?? existing.vehicleMileage,
          labourTotal,
          partsTotal,
          ...calc,
          statusHistory,
        };

        jobs[index] = updatedJob;
        setStored(STORAGE_KEYS.JOBS, jobs);
        this.logAudit('Job Card Updated', 'Job Card', updatedJob.id, `Updated Job ${updatedJob.jobNumber} (Status: ${updatedJob.status})`);
        
        if (vehicle && typeof jobData.vehicleMileage === 'number' && jobData.vehicleMileage > vehicle.mileage) {
          this.saveVehicle({
            ...vehicle,
            mileage: jobData.vehicleMileage
          });
          this.logAudit('Vehicle Mileage Updated', 'Vehicle', vehicle.id, `Updated mileage to ${jobData.vehicleMileage} km after Job ${updatedJob.jobNumber}`);
        }
        
        if (statusChanged) {
          this.checkAndSyncInvoiceForJob(updatedJob);
        }

        return updatedJob;
      }
    }

    // New Job Card
    const nextJobNum = `JOB-2026-${String(jobs.length + 1).padStart(3, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newJob: JobCard = {
      id: `job-${Date.now()}`,
      jobNumber: nextJobNum,
      customerId: jobData.customerId,
      vehicleId: jobData.vehicleId,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      registrationNumber: vehicle?.registrationNumber || '',
      vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : '',
      complaint: jobData.complaint || '',
      complaintCategories: jobData.complaintCategories || ['Other'],
      inspectionChecklist: jobData.inspectionChecklist || [],
      diagnosis: jobData.diagnosis || '',
      recommendedRepairs: jobData.recommendedRepairs || '',
      technicianId: jobData.technicianId,
      technicianName: jobData.technicianName,
      vehicleMileage: jobData.vehicleMileage,
      services: jobData.services || [],
      parts: jobData.parts || [],
      quotationId: jobData.quotationId,
      status: jobData.status || 'Received',
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          jobId: `job-${Date.now()}`,
          status: jobData.status || 'Received',
          date: nowStr,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          comment: 'Job card opened'
        }
      ],
      labourTotal,
      partsTotal,
      ...calc,
      createdDate: nowStr,
      notes: jobData.notes
    };

    setStored(STORAGE_KEYS.JOBS, [newJob, ...jobs]);
    this.logAudit('Job Card Created', 'Job Card', newJob.id, `Created Job Card ${newJob.jobNumber} for ${newJob.registrationNumber}`);
    
    if (vehicle && typeof jobData.vehicleMileage === 'number' && jobData.vehicleMileage > vehicle.mileage) {
      this.saveVehicle({
        ...vehicle,
        mileage: jobData.vehicleMileage
      });
      this.logAudit('Vehicle Mileage Updated', 'Vehicle', vehicle.id, `Updated mileage to ${jobData.vehicleMileage} km after Job ${newJob.jobNumber}`);
    }

    return newJob;
  }

  public updateJobStatus(jobId: string, status: JobStatus, comment?: string): JobCard | undefined {
    const job = this.getJobById(jobId);
    if (!job) return undefined;
    return this.saveJobCard({ ...job, status });
  }

  public deleteJobCard(jobId: string): boolean {
    const jobs = this.getJobCards();
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) return false;

    const deleted = jobs[index];
    jobs.splice(index, 1);
    setStored(STORAGE_KEYS.JOBS, jobs);
    this.logAudit('Job Card Deleted', 'Job Card', deleted.id, `Deleted Job ${deleted.jobNumber} (${deleted.customerName || 'Unknown customer'})`);
    return true;
  }

  // Auto Invoice Sync
  private checkAndSyncInvoiceForJob(job: JobCard) {
    if (job.status === 'Completed' || job.status === 'Delivered') {
      const invoices = this.getInvoices();
      const existingInv = invoices.find(i => i.jobId === job.id);
      if (!existingInv) {
        this.createInvoiceFromJob(job.id);
      }
    }
  }

  // Inventory & Price List
  public getInventory(): InventoryPart[] {
    return getStored<InventoryPart[]>(STORAGE_KEYS.INVENTORY, initialInventory);
  }

  public saveInventoryPart(partData: Partial<InventoryPart> & { id?: string; partName: string; partNumber: string; category: string }): InventoryPart {
    const inventory = this.getInventory();
    
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    const qty = partData.quantity !== undefined ? partData.quantity : 0;
    const min = partData.minStock !== undefined ? partData.minStock : 5;
    if (qty <= 0) {
      status = 'Out of Stock';
    } else if (qty <= min) {
      status = 'Low Stock';
    }

    if (partData.id) {
      const index = inventory.findIndex(p => p.id === partData.id);
      if (index !== -1) {
        const updatedPart: InventoryPart = {
          ...inventory[index],
          ...partData,
          quantity: qty,
          minStock: min,
          status,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        inventory[index] = updatedPart;
        setStored(STORAGE_KEYS.INVENTORY, inventory);
        this.logAudit('Inventory Part Updated', 'Part', updatedPart.id, `Updated part ${updatedPart.partName} (${updatedPart.quantity} units)`);
        return updatedPart;
      }
    }

    const newPart: InventoryPart = {
      id: `part-${Date.now()}`,
      partName: partData.partName,
      partNumber: partData.partNumber,
      category: partData.category,
      compatibleVehicles: partData.compatibleVehicles || 'Universal',
      supplierId: partData.supplierId || 'supp-1',
      supplierName: partData.supplierName || 'General Supplier',
      quantity: qty,
      minStock: min,
      purchasePrice: partData.purchasePrice || 0,
      sellingPrice: partData.sellingPrice || 0,
      location: partData.location || 'Main Store',
      status,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setStored(STORAGE_KEYS.INVENTORY, [newPart, ...inventory]);
    this.logAudit('Inventory Part Added', 'Part', newPart.id, `Added part ${newPart.partName} [${newPart.partNumber}]`);
    return newPart;
  }

  public adjustInventoryStock(partId: string, quantityChange: number, type: InventoryTransaction['transactionType'], reference: string, notes?: string): boolean {
    const inventory = this.getInventory();
    const index = inventory.findIndex(p => p.id === partId);
    if (index === -1) return false;

    const part = inventory[index];
    const newQty = Math.max(0, part.quantity + quantityChange);
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (newQty <= 0) status = 'Out of Stock';
    else if (newQty <= part.minStock) status = 'Low Stock';

    inventory[index] = {
      ...part,
      quantity: newQty,
      status,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setStored(STORAGE_KEYS.INVENTORY, inventory);

    // Record transaction
    const transactions = this.getInventoryTransactions();
    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      partId: part.id,
      partName: part.partName,
      partNumber: part.partNumber,
      quantity: Math.abs(quantityChange),
      transactionType: type,
      reference,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      notes
    };
    setStored(STORAGE_KEYS.TRANSACTIONS, [newTx, ...transactions]);

    this.logAudit('Stock Adjusted', 'Part', part.id, `${type}: ${quantityChange > 0 ? '+' : ''}${quantityChange} units for ${part.partName} (Ref: ${reference})`);
    return true;
  }

  public getInventoryTransactions(): InventoryTransaction[] {
    return getStored<InventoryTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  }

  // Price List
  public getPriceList(): PriceListItem[] {
    return getStored<PriceListItem[]>(STORAGE_KEYS.PRICE_LIST, initialPriceList);
  }

  public savePriceListItem(itemData: Partial<PriceListItem> & { id?: string; make: string; serviceOrPart: string; price: number }): PriceListItem {
    const priceList = this.getPriceList();
    if (itemData.id) {
      const index = priceList.findIndex(p => p.id === itemData.id);
      if (index !== -1) {
        const updated = {
          ...priceList[index],
          ...itemData,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        priceList[index] = updated;
        setStored(STORAGE_KEYS.PRICE_LIST, priceList);
        this.logAudit('Price List Updated', 'Price List', updated.id, `Updated price for ${updated.serviceOrPart} to GH₵ ${updated.price}`);
        return updated;
      }
    }

    const newItem: PriceListItem = {
      id: `prc-${Date.now()}`,
      make: itemData.make,
      model: itemData.model || 'All Models',
      category: itemData.category || 'General',
      serviceOrPart: itemData.serviceOrPart,
      description: itemData.description || '',
      price: itemData.price,
      estimatedHours: itemData.estimatedHours || 1.0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setStored(STORAGE_KEYS.PRICE_LIST, [newItem, ...priceList]);
    this.logAudit('Price List Added', 'Price List', newItem.id, `Added ${newItem.serviceOrPart} @ GH₵ ${newItem.price}`);
    return newItem;
  }

  public deletePriceListItem(id: string): void {
    const priceList = this.getPriceList();
    const item = priceList.find(p => p.id === id);
    const filtered = priceList.filter(p => p.id !== id);
    setStored(STORAGE_KEYS.PRICE_LIST, filtered);
    if (item) {
      this.logAudit('Price List Deleted', 'Price List', id, `Deleted ${item.serviceOrPart}`);
    }
  }

  // Requisitions
  public getRequisitions(): Requisition[] {
    return getStored<Requisition[]>(STORAGE_KEYS.REQUISITIONS, initialRequisitions);
  }

  public saveRequisition(reqData: Partial<Requisition> & { jobId?: string }): Requisition {
    const reqs = this.getRequisitions();
    const job = reqData.jobId ? this.getJobById(reqData.jobId) : undefined;

    if (reqData.id) {
      const index = reqs.findIndex(r => r.id === reqData.id);
      if (index !== -1) {
        const existing = reqs[index];
        const updated = {
          ...existing,
          ...reqData,
        };
        reqs[index] = updated;
        setStored(STORAGE_KEYS.REQUISITIONS, reqs);
        this.logAudit('Requisition Updated', 'Requisition', updated.id, `Updated Requisition ${updated.requisitionNumber} (${updated.status})`);
        return updated;
      }
    }

    const nextReqNum = `REQ-2026-${String(reqs.length + 1).padStart(3, '0')}`;
    const items = reqData.items || [];
    const newReq: Requisition = {
      id: `req-${Date.now()}`,
      requisitionNumber: nextReqNum,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      jobId: reqData.jobId || undefined,
      jobNumber: job?.jobNumber || reqData.jobNumber || 'MANUAL',
      vehicleRegistration: job?.registrationNumber || reqData.vehicleRegistration || 'N/A',
      customerName: job?.customerName || reqData.customerName || 'Manual Request',
      requestedBy: reqData.requestedBy || `${this.currentUser.name} (${this.currentUser.role})`,
      status: reqData.status || 'Submitted',
      items,
      totalValue: items.reduce((sum, i) => sum + i.totalPrice, 0),
      notes: reqData.notes
    };

    setStored(STORAGE_KEYS.REQUISITIONS, [newReq, ...reqs]);
    this.logAudit('Requisition Created', 'Requisition', newReq.id, `Created Requisition ${newReq.requisitionNumber} for Job ${newReq.jobNumber}`);
    return newReq;
  }

  public issueRequisition(reqId: string): boolean {
    const reqs = this.getRequisitions();
    const index = reqs.findIndex(r => r.id === reqId);
    if (index === -1) return false;

    const req = reqs[index];
    if (req.status === 'Issued' || req.status === 'Completed') return true;

    // Deduct stock for each item
    req.items.forEach(item => {
      this.adjustInventoryStock(item.partId, -item.quantityRequested, 'Requisition', req.requisitionNumber, `Issued for Job ${req.jobNumber}`);
    });

    reqs[index] = {
      ...req,
      status: 'Issued',
      approvedBy: `${this.currentUser.name} (${this.currentUser.role})`,
      items: req.items.map(i => ({ ...i, quantityIssued: i.quantityRequested, status: 'Issued' }))
    };

    setStored(STORAGE_KEYS.REQUISITIONS, reqs);
    this.logAudit('Requisition Issued', 'Requisition', req.id, `Issued parts for Requisition ${req.requisitionNumber}`);
    return true;
  }

  public issueRequisitionItem(reqId: string, itemId: string): boolean {
    const reqs = this.getRequisitions();
    const index = reqs.findIndex(r => r.id === reqId);
    if (index === -1) return false;

    const req = reqs[index];
    const itemIndex = req.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;

    const item = req.items[itemIndex];
    this.adjustInventoryStock(item.partId, -item.quantityRequested, 'Requisition', req.requisitionNumber, `Issued item for Job ${req.jobNumber}`);

    req.items[itemIndex] = {
      ...item,
      quantityIssued: item.quantityRequested,
      status: 'Issued'
    };

    const allIssued = req.items.every(i => i.status === 'Issued');
    req.status = allIssued ? 'Issued' : 'Submitted';

    reqs[index] = req;
    setStored(STORAGE_KEYS.REQUISITIONS, reqs);
    this.logAudit('Requisition Item Issued', 'Requisition', req.id, `Issued part ${item.partName} for Requisition ${req.requisitionNumber}`);
    return true;
  }

  // Quotations
  public getQuotations(): Quotation[] {
    return getStored<Quotation[]>(STORAGE_KEYS.QUOTATIONS, initialQuotations);
  }

  public getQuotationById(id: string): Quotation | undefined {
    return this.getQuotations().find(q => q.id === id);
  }

  public updateQuotationStatus(quotationId: string, status: QuotationStatus): Quotation | undefined {
    const quotes = this.getQuotations();
    const index = quotes.findIndex(q => q.id === quotationId);
    if (index === -1) return undefined;
    const quote = quotes[index];
    const updatedQuote: Quotation = {
      ...quote,
      status,
    };
    quotes[index] = updatedQuote;
    setStored(STORAGE_KEYS.QUOTATIONS, quotes);
    this.logAudit('Quotation Status Updated', 'Quotation', updatedQuote.id, `Quotation ${updatedQuote.quotationNumber} status changed to ${status}`);
    return updatedQuote;
  }

  public recordQuotationSend(quotationId: string, channel: 'Email' | 'WhatsApp', recipient: string): Quotation | undefined {
    const quotes = this.getQuotations();
    const index = quotes.findIndex(q => q.id === quotationId);
    if (index === -1) return undefined;
    const quote = quotes[index];
    const now = new Date().toISOString();
    const sendRecord = {
      id: `qt-send-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channel,
      recipient,
      timestamp: now,
    };
    const updatedQuote: Quotation = {
      ...quote,
      status: quote.status === 'Draft' ? 'Sent' : quote.status,
      sentRecords: [...(quote.sentRecords || []), sendRecord],
    };
    quotes[index] = updatedQuote;
    setStored(STORAGE_KEYS.QUOTATIONS, quotes);
    this.logAudit('Quotation Sent', 'Quotation', updatedQuote.id, `Quotation ${updatedQuote.quotationNumber} sent via ${channel} to ${recipient}`);
    return updatedQuote;
  }

  public saveQuotation(quoteData: Partial<Quotation> & { customerId: string; vehicleId: string }): Quotation {
    const quotes = this.getQuotations();
    const customer = this.getCustomerById(quoteData.customerId);
    const vehicle = this.getVehicleById(quoteData.vehicleId);
    const settings = this.getSettings();

    const labourTotal = (quoteData.services || []).reduce((s, i) => s + i.total, 0);
    const partsTotal = (quoteData.parts || []).reduce((s, i) => s + i.total, 0);
    const discount = quoteData.discount || 0;
    const vatRate = quoteData.vatRate !== undefined ? quoteData.vatRate : settings.defaultVatRate;

    const calc = calculateTotals(labourTotal, partsTotal, discount, vatRate, true);

    if (quoteData.id) {
      const index = quotes.findIndex(q => q.id === quoteData.id);
      if (index !== -1) {
        const updated = {
          ...quotes[index],
          ...quoteData,
          customerName: customer?.name || quotes[index].customerName,
          vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : quotes[index].vehicleDetails,
          sentRecords: quoteData.sentRecords || quotes[index].sentRecords || [],
          ...calc
        };
        quotes[index] = updated;
        setStored(STORAGE_KEYS.QUOTATIONS, quotes);
        this.logAudit('Quotation Updated', 'Quotation', updated.id, `Updated Quotation ${updated.quotationNumber}`);
        return updated;
      }
    }

    const nextQuoteNum = `QT-2026-${String(quotes.length + 1).padStart(3, '0')}`;
    const nowStr = new Date().toISOString().split('T')[0];
    const valDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newQuote: Quotation = {
      id: `qt-${Date.now()}`,
      quotationNumber: nextQuoteNum,
      date: quoteData.date || nowStr,
      validityDate: quoteData.validityDate || valDate,
      customerId: quoteData.customerId,
      vehicleId: quoteData.vehicleId,
      customerName: customer?.name || '',
      vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : '',
      jobId: quoteData.jobId,
      services: quoteData.services || [],
      parts: quoteData.parts || [],
      ...calc,
      status: quoteData.status || 'Draft',
      sentRecords: quoteData.sentRecords || [],
      notes: quoteData.notes
    };

    setStored(STORAGE_KEYS.QUOTATIONS, [newQuote, ...quotes]);
    this.logAudit('Quotation Created', 'Quotation', newQuote.id, `Created Quotation ${newQuote.quotationNumber} for ${newQuote.customerName}`);
    return newQuote;
  }

  public convertQuotationToInvoice(quotationId: string): Invoice | undefined {
    const quotes = this.getQuotations();
    const index = quotes.findIndex(q => q.id === quotationId);
    if (index === -1) return undefined;

    const quote = quotes[index];
    const invoiceData: Partial<Invoice> & { customerId: string; vehicleId: string } = {
      customerId: quote.customerId,
      vehicleId: quote.vehicleId,
      quotationId: quote.id,
      jobId: quote.jobId,
      services: quote.services,
      parts: quote.parts,
      discount: quote.discount,
      vatRate: quote.vatRate,
      notes: `Converted from Quotation ${quote.quotationNumber}`
    };

    const invoice = this.saveInvoice(invoiceData);

    quotes[index] = {
      ...quote,
      status: 'Approved',
      convertedToInvoiceId: invoice.id
    };
    setStored(STORAGE_KEYS.QUOTATIONS, quotes);

    this.logAudit('Quotation Converted', 'Quotation', quote.id, `Converted Quotation ${quote.quotationNumber} to Invoice ${invoice.invoiceNumber}`);
    return invoice;
  }

  // Invoices
  public getInvoices(): Invoice[] {
    return getStored<Invoice[]>(STORAGE_KEYS.INVOICES, initialInvoices);
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.getInvoices().find(i => i.id === id);
  }

  public deleteInvoice(invoiceId: string): boolean {
    const invoices = this.getInvoices();
    const index = invoices.findIndex(i => i.id === invoiceId);
    if (index === -1) return false;

    const deleted = invoices[index];
    invoices.splice(index, 1);
    setStored(STORAGE_KEYS.INVOICES, invoices);

    const payments = this.getPayments();
    const remainingPayments = payments.filter(p => p.invoiceId !== invoiceId);
    if (remainingPayments.length !== payments.length) {
      setStored(STORAGE_KEYS.PAYMENTS, remainingPayments);
    }

    if (deleted.jobId) {
      const job = this.getJobById(deleted.jobId);
      if (job) {
        const remainingJobInvoices = this.getInvoices().filter(inv => inv.jobId === deleted.jobId);
        const totalPaidOnJob = remainingJobInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
        const updatedJob: JobCard = {
          ...job,
          amountPaid: totalPaidOnJob,
          balance: Math.max(0, job.grandTotal - totalPaidOnJob),
          paymentStatus: totalPaidOnJob >= job.grandTotal && job.grandTotal > 0
            ? 'Paid'
            : totalPaidOnJob > 0
              ? 'Partially Paid'
              : 'Unpaid'
        };
        this.saveJobCard(updatedJob);
      }
    }

    this.logAudit('Invoice Deleted', 'Invoice', deleted.id, `Deleted invoice ${deleted.invoiceNumber} for ${deleted.customerName || 'customer'}`);
    return true;
  }

  public createInvoiceFromJob(jobId: string): Invoice | undefined {
    const job = this.getJobById(jobId);
    if (!job) return undefined;

    const invoiceData: Partial<Invoice> & { customerId: string; vehicleId: string } = {
      jobId: job.id,
      customerId: job.customerId,
      vehicleId: job.vehicleId,
      services: job.services,
      parts: job.parts,
      discount: job.discount,
      vatRate: job.vatRate,
      paidAmount: job.amountPaid,
      notes: `Auto-generated invoice from Job ${job.jobNumber}`
    };

    return this.saveInvoice(invoiceData);
  }

  public saveInvoice(invData: Partial<Invoice> & { customerId: string; vehicleId: string }): Invoice {
    const invoices = this.getInvoices();
    const customer = this.getCustomerById(invData.customerId);
    const vehicle = this.getVehicleById(invData.vehicleId);
    const settings = this.getSettings();

    const labourTotal = (invData.services || []).reduce((s, i) => s + i.total, 0);
    const partsTotal = (invData.parts || []).reduce((s, i) => s + i.total, 0);
    const discount = invData.discount || 0;
    const vatRate = invData.vatRate !== undefined ? invData.vatRate : settings.defaultVatRate;
    const paidAmount = invData.paidAmount || 0;

    const calc = calculateTotals(labourTotal, partsTotal, discount, vatRate, true, paidAmount);

    let status: Invoice['status'] = 'Unpaid';
    if (calc.balance <= 0 && calc.grandTotal > 0) {
      status = 'Paid';
    } else if (paidAmount > 0) {
      status = 'Partially Paid';
    }

    if (invData.id) {
      const index = invoices.findIndex(i => i.id === invData.id);
      if (index !== -1) {
        const updated = {
          ...invoices[index],
          ...invData,
          customerName: customer?.name || invoices[index].customerName,
          customerPhone: customer?.phone || invoices[index].customerPhone,
          customerEmail: customer?.email || invoices[index].customerEmail,
          customerAddress: customer?.address || invoices[index].customerAddress,
          vehicleRegistration: vehicle?.registrationNumber || invoices[index].vehicleRegistration,
          vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : invoices[index].vehicleDetails,
          ...calc,
          status,
        };
        invoices[index] = updated;
        setStored(STORAGE_KEYS.INVOICES, invoices);
        this.logAudit('Invoice Updated', 'Invoice', updated.id, `Updated Invoice ${updated.invoiceNumber}`);
        return updated;
      }
    }

    const nextInvNum = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvNum,
      date: invData.date || today,
      dueDate: invData.dueDate || today,
      customerId: invData.customerId,
      vehicleId: invData.vehicleId,
      jobId: invData.jobId,
      quotationId: invData.quotationId,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email,
      customerAddress: customer?.address,
      vehicleRegistration: vehicle?.registrationNumber || '',
      vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : '',
      services: invData.services || [],
      parts: invData.parts || [],
      ...calc,
      paidAmount: calc.amountPaid,
      status,
      notes: invData.notes
    };

    setStored(STORAGE_KEYS.INVOICES, [newInvoice, ...invoices]);
    this.logAudit('Invoice Generated', 'Invoice', newInvoice.id, `Generated Invoice ${newInvoice.invoiceNumber} for GH₵ ${newInvoice.grandTotal}`);
    return newInvoice;
  }

  // Payments
  public getPayments(): Payment[] {
    return getStored<Payment[]>(STORAGE_KEYS.PAYMENTS, initialPayments);
  }

  public deletePayment(paymentId: string): boolean {
    const payments = this.getPayments();
    const index = payments.findIndex(p => p.id === paymentId);
    if (index === -1) return false;

    const deleted = payments[index];
    payments.splice(index, 1);
    setStored(STORAGE_KEYS.PAYMENTS, payments);

    if (deleted.invoiceId) {
      const invoice = this.getInvoiceById(deleted.invoiceId);
      if (invoice) {
        const updatedPaidAmount = Math.max(0, invoice.paidAmount - deleted.amount);
        const recalculated = calculateTotals(
          (invoice.services || []).reduce((sum, item) => sum + item.total, 0),
          (invoice.parts || []).reduce((sum, item) => sum + item.total, 0),
          invoice.discount,
          invoice.vatRate,
          true,
          updatedPaidAmount
        );

        const newStatus = recalculated.balance <= 0 && recalculated.grandTotal > 0
          ? 'Paid'
          : updatedPaidAmount > 0
            ? 'Partially Paid'
            : 'Unpaid';

        this.saveInvoice({
          ...invoice,
          ...recalculated,
          paidAmount: recalculated.amountPaid,
          balance: recalculated.balance,
          status: newStatus,
        });
      }
    }

    this.logAudit('Payment Deleted', 'Payment', deleted.id, `Deleted payment receipt ${deleted.receiptNumber} for ${deleted.customerName}`);
    return true;
  }

  public recordPayment(payData: Omit<Payment, 'id' | 'receiptNumber' | 'date' | 'recordedBy'> & { date?: string }): Payment {
    const payments = this.getPayments();
    const invoice = this.getInvoiceById(payData.invoiceId);
    const nextReceiptNum = `REC-2026-${String(payments.length + 1).padStart(3, '0')}`;
    const nowStr = payData.date || new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newPayment: Payment = {
      ...payData,
      id: `pay-${Date.now()}`,
      receiptNumber: nextReceiptNum,
      date: nowStr,
      recordedBy: `${this.currentUser.name} (${this.currentUser.role})`
    };

    setStored(STORAGE_KEYS.PAYMENTS, [newPayment, ...payments]);

    // Update Invoice balance & Job balance
    if (invoice) {
      const newPaidAmount = invoice.paidAmount + payData.amount;
      this.saveInvoice({
        ...invoice,
        paidAmount: newPaidAmount
      });

      if (invoice.jobId) {
        const job = this.getJobById(invoice.jobId);
        if (job) {
          this.saveJobCard({
            ...job,
            amountPaid: newPaidAmount
          });
        }
      }
    }

    this.logAudit('Payment Recorded', 'Payment', newPayment.id, `Recorded GH₵ ${newPayment.amount} (${newPayment.paymentMethod}) for Invoice ${newPayment.invoiceNumber}`);
    return newPayment;
  }

  // Expenses
  public getExpenses(): Expense[] {
    return getStored<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
  }

  public saveExpense(expData: Omit<Expense, 'id' | 'recordedBy'> & { id?: string }): Expense {
    const expenses = this.getExpenses();
    if (expData.id) {
      const index = expenses.findIndex(e => e.id === expData.id);
      if (index !== -1) {
        const updated = {
          ...expenses[index],
          ...expData,
        };
        expenses[index] = updated;
        setStored(STORAGE_KEYS.EXPENSES, expenses);
        this.logAudit('Expense Updated', 'Expense', updated.id, `Updated expense ${updated.description}`);
        return updated;
      }
    }

    const newExpense: Expense = {
      ...expData,
      id: `exp-${Date.now()}`,
      recordedBy: this.currentUser.name
    };

    setStored(STORAGE_KEYS.EXPENSES, [newExpense, ...expenses]);
    this.logAudit('Expense Added', 'Expense', newExpense.id, `Recorded expense GH₵ ${newExpense.amount} (${newExpense.category})`);
    return newExpense;
  }

  // Suppliers
  public getSuppliers(): Supplier[] {
    return getStored<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
  }

  public saveSupplier(supData: Partial<Supplier> & { companyName: string; contactPerson: string; phone: string }): Supplier {
    const suppliers = this.getSuppliers();
    if (supData.id) {
      const index = suppliers.findIndex(s => s.id === supData.id);
      if (index !== -1) {
        const updated = {
          ...suppliers[index],
          ...supData,
        };
        suppliers[index] = updated;
        setStored(STORAGE_KEYS.SUPPLIERS, suppliers);
        this.logAudit('Supplier Updated', 'Supplier', updated.id, `Updated supplier ${updated.companyName}`);
        return updated;
      }
    }

    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      companyName: supData.companyName,
      contactPerson: supData.contactPerson,
      phone: supData.phone,
      email: supData.email,
      address: supData.address,
      partsSupplied: supData.partsSupplied || '',
      outstandingBalance: supData.outstandingBalance || 0
    };

    setStored(STORAGE_KEYS.SUPPLIERS, [newSupplier, ...suppliers]);
    this.logAudit('Supplier Added', 'Supplier', newSupplier.id, `Added supplier ${newSupplier.companyName}`);
    return newSupplier;
  }

  // Bookings
  public getBookings(): Booking[] {
    return getStored<Booking[]>(STORAGE_KEYS.BOOKINGS, initialBookings);
  }

  public saveBooking(bkData: Partial<Booking> & { customerId: string; vehicleId: string; date: string; time: string; serviceRequested: string }): Booking {
    const bookings = this.getBookings();
    const customer = this.getCustomerById(bkData.customerId);
    const vehicle = this.getVehicleById(bkData.vehicleId);

    if (bkData.id) {
      const index = bookings.findIndex(b => b.id === bkData.id);
      if (index !== -1) {
        const updated = {
          ...bookings[index],
          ...bkData,
          customerName: customer?.name || bookings[index].customerName,
          customerPhone: customer?.phone || bookings[index].customerPhone,
          vehicleRegistration: vehicle?.registrationNumber || bookings[index].vehicleRegistration,
          vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model}` : bookings[index].vehicleDetails,
        };
        bookings[index] = updated;
        setStored(STORAGE_KEYS.BOOKINGS, bookings);
        this.logAudit('Booking Updated', 'Booking', updated.id, `Updated appointment for ${updated.vehicleRegistration} on ${updated.date}`);
        return updated;
      }
    }

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      customerId: bkData.customerId,
      vehicleId: bkData.vehicleId,
      customerName: customer?.name || 'N/A',
      customerPhone: customer?.phone || 'N/A',
      vehicleRegistration: vehicle?.registrationNumber || 'N/A',
      vehicleDetails: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
      date: bkData.date,
      time: bkData.time,
      serviceRequested: bkData.serviceRequested,
      technicianId: bkData.technicianId,
      technicianName: bkData.technicianName,
      status: bkData.status || 'Booked',
      notes: bkData.notes
    };

    setStored(STORAGE_KEYS.BOOKINGS, [newBooking, ...bookings]);
    this.logAudit('Booking Created', 'Booking', newBooking.id, `Created appointment for ${newBooking.customerName} (${newBooking.vehicleRegistration})`);
    return newBooking;
  }

  // Notifications
  public getNotifications(): AppNotification[] {
    return getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
  }

  public addNotification(notification: AppNotification): void {
    const notifs = this.getNotifications();
    const updated = [notification, ...notifs].slice(0, 200);
    setStored(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  public markNotificationAsRead(id: string): void {
    const notifs = this.getNotifications();
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setStored(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  public saveSettings(settingsData: Partial<WorkshopSettings>): WorkshopSettings {
    const current = this.getSettings();
    const updated: WorkshopSettings = {
      ...current,
      ...settingsData,
      defaultVatRate: settingsData.defaultVatRate ?? current.defaultVatRate
    };
    setStored(STORAGE_KEYS.SETTINGS, updated);
    this.logAudit('Settings Updated', 'System', undefined, 'Updated workshop settings and tax rates');
    return updated;
  }

  // ========== DEBTORS MANAGEMENT ==========
  
  public getOutstandingInvoices(): (Invoice & { daysOutstanding: number; agingCategory: string })[] {
    const invoices = this.getInvoices();
    const today = new Date();
    
    return invoices
      .filter(inv => inv.balance > 0)
      .map(inv => {
        const invoiceDate = new Date(inv.date);
        const daysOutstanding = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let agingCategory = 'Current';
        if (daysOutstanding > 90) agingCategory = '90+ Days';
        else if (daysOutstanding > 60) agingCategory = '60-90 Days';
        else if (daysOutstanding > 30) agingCategory = '30-60 Days';
        else if (daysOutstanding > 0) agingCategory = '0-30 Days';
        
        return {
          ...inv,
          daysOutstanding,
          agingCategory
        };
      })
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  }

  public getDebtorsSummary() {
    const outstanding = this.getOutstandingInvoices();
    const totalOutstanding = outstanding.reduce((sum, inv) => sum + inv.balance, 0);
    
    const agingBreakdown = {
      current: outstanding.filter(inv => inv.daysOutstanding <= 0).reduce((sum, inv) => sum + inv.balance, 0),
      days0to30: outstanding.filter(inv => inv.agingCategory === '0-30 Days').reduce((sum, inv) => sum + inv.balance, 0),
      days30to60: outstanding.filter(inv => inv.agingCategory === '30-60 Days').reduce((sum, inv) => sum + inv.balance, 0),
      days60to90: outstanding.filter(inv => inv.agingCategory === '60-90 Days').reduce((sum, inv) => sum + inv.balance, 0),
      days90plus: outstanding.filter(inv => inv.agingCategory === '90+ Days').reduce((sum, inv) => sum + inv.balance, 0),
    };

    const uniqueDebtors = new Set(outstanding.map(inv => inv.customerId)).size;
    const unpaidCount = outstanding.filter(inv => inv.paidAmount === 0).length;
    const partiallyPaidCount = outstanding.filter(inv => inv.paidAmount > 0).length;

    return {
      totalOutstanding,
      totalInvoices: outstanding.length,
      uniqueDebtors,
      unpaidCount,
      partiallyPaidCount,
      agingBreakdown
    };
  }

  public getDebtorsByCustomer() {
    const outstanding = this.getOutstandingInvoices();
    const debtorMap = new Map<string, any>();

    outstanding.forEach(inv => {
      const customerId = inv.customerId;
      if (!debtorMap.has(customerId)) {
        const customer = this.getCustomerById(customerId);
        debtorMap.set(customerId, {
          customerId,
          customerName: customer?.name || inv.customerName || 'Unknown',
          customerPhone: customer?.phone || inv.customerPhone || 'N/A',
          customerEmail: customer?.email || inv.customerEmail || 'N/A',
          totalOutstanding: 0,
          invoices: []
        });
      }
      
      const debtor = debtorMap.get(customerId)!;
      debtor.totalOutstanding += inv.balance;
      debtor.invoices.push(inv);
    });

    return Array.from(debtorMap.values())
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }

  // Reset database to seed
  public resetToSeed(): void {
    setStored(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    setStored(STORAGE_KEYS.VEHICLES, initialVehicles);
    setStored(STORAGE_KEYS.JOBS, initialJobCards);
    setStored(STORAGE_KEYS.PRICE_LIST, initialPriceList);
    setStored(STORAGE_KEYS.INVENTORY, initialInventory);
    setStored(STORAGE_KEYS.TRANSACTIONS, []);
    setStored(STORAGE_KEYS.REQUISITIONS, initialRequisitions);
    setStored(STORAGE_KEYS.QUOTATIONS, initialQuotations);
    setStored(STORAGE_KEYS.INVOICES, initialInvoices);
    setStored(STORAGE_KEYS.PAYMENTS, initialPayments);
    setStored(STORAGE_KEYS.EXPENSES, initialExpenses);
    setStored(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
    setStored(STORAGE_KEYS.BOOKINGS, initialBookings);
    setStored(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    setStored(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
    setStored(STORAGE_KEYS.SETTINGS, initialSettings);
    this.logAudit('Database Reset', 'System', undefined, 'Restored database to initial El-Jindi workshop seed state');
  }
}

export const db = new DatabaseService();
