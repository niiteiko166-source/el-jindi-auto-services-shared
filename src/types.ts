export type UserRole = 
  | 'Admin'
  | 'Manager'
  | 'Receptionist'
  | 'Accountant'
  | 'Technician'
  | 'Storekeeper';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  phone?: string;
  password?: string;
  avatar?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company?: string;
  createdAt: string;
  notes?: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  registrationNumber: string; // e.g., "GR 1234-24"
  make: string; // Toyota, Honda, etc.
  model: string; // Hilux, Corolla, etc.
  year: number;
  vin?: string;
  mileage: number;
  color?: string;
  fuelType?: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
  notes?: string;
  createdAt: string;
}

export type InspectionStatus = 'OK' | 'Needs Attention' | 'Critical' | 'Not Checked';

export interface InspectionItem {
  id: string;
  category: 'Engine' | 'Transmission' | 'Brakes' | 'Suspension' | 'Electrical' | 'Cooling System' | 'AC' | 'Tyres' | 'Battery' | 'Lights' | 'Body' | 'Interior';
  name: string;
  status: InspectionStatus;
  notes?: string;
}

export type ComplaintCategory = 
  | 'Engine'
  | 'Transmission'
  | 'Brakes'
  | 'Suspension'
  | 'Electrical'
  | 'Air Conditioning'
  | 'Tyres'
  | 'Body'
  | 'Service/Maintenance'
  | 'Other';

export interface JobService {
  id: string;
  serviceName: string;
  description?: string;
  technicianId?: string;
  technicianName?: string;
  estimatedHours: number;
  labourRate: number; // rate per hour or fixed fee
  total: number;
}

export interface JobPart {
  id: string;
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  issued: boolean;
  stockAvailable?: number;
}

export type JobStatus = 
  | 'Received'
  | 'Diagnosis'
  | 'Waiting for Approval'
  | 'Waiting for Parts'
  | 'In Progress'
  | 'Quality Check'
  | 'Completed'
  | 'Delivered';

export interface JobStatusHistory {
  id: string;
  jobId: string;
  status: JobStatus;
  date: string;
  userId: string;
  userName: string;
  comment?: string;
}

export interface JobCard {
  id: string;
  jobNumber: string; // e.g., "JOB-2026-001"
  customerId: string;
  vehicleId: string;
  customerName?: string;
  customerPhone?: string;
  registrationNumber?: string;
  vehicleDetails?: string; // Make Model Year
  complaint: string;
  complaintCategories: ComplaintCategory[];
  inspectionChecklist: InspectionItem[];
  diagnosis: string;
  recommendedRepairs?: string;
  technicianId?: string;
  technicianName?: string;
  vehicleMileage?: number;
  services: JobService[];
  parts: JobPart[];
  status: JobStatus;
  statusHistory: JobStatusHistory[];
  quotationId?: string;
  labourTotal: number;
  partsTotal: number;
  subtotal: number;
  discount: number;
  vatRate: number; // e.g. 20 for Ghana VAT/NHIL/GETFund (2.5% NHIL + 2.5% GETFund + 15% VAT)
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  createdDate: string;
  completedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export interface PriceListItem {
  id: string;
  make: string;
  model: string;
  category: string;
  serviceOrPart: string;
  description: string;
  price: number;
  estimatedHours?: number;
  lastUpdated: string;
}

export interface InventoryPart {
  id: string;
  partName: string;
  partNumber: string;
  category: string; // Engine, Brakes, Oils, Filters, etc.
  compatibleVehicles: string; // e.g., "Toyota Hilux / Land Cruiser"
  supplierId: string;
  supplierName?: string;
  quantity: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
  location?: string; // Shelf A3, Bin 12
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
}

export type InventoryTransactionType = 
  | 'Stock In'
  | 'Stock Out'
  | 'Adjustment'
  | 'Return'
  | 'Requisition';

export interface InventoryTransaction {
  id: string;
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  transactionType: InventoryTransactionType;
  reference: string; // Job#, Requisition#, Supplier Invoice#
  date: string;
  userId: string;
  userName: string;
  notes?: string;
}

export type RequisitionStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Issued'
  | 'Completed';

export interface RequisitionItem {
  id: string;
  partId: string;
  partName: string;
  partNumber: string;
  quantityRequested: number;
  quantityIssued: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Issued' | 'Rejected';
}

export interface Requisition {
  id: string;
  requisitionNumber: string; // e.g. "REQ-2026-001"
  date: string;
  jobId?: string;
  jobNumber?: string;
  vehicleRegistration?: string;
  customerName?: string;
  requestedBy: string;
  approvedBy?: string;
  status: RequisitionStatus;
  items: RequisitionItem[];
  totalValue: number;
  notes?: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Expired';

export interface QuotationSendRecord {
  id: string;
  channel: 'Email' | 'WhatsApp';
  recipient: string;
  timestamp: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g., "QT-2026-001"
  date: string;
  validityDate: string;
  customerId: string;
  vehicleId: string;
  customerName?: string;
  vehicleDetails?: string;
  jobId?: string;
  services: JobService[];
  parts: JobPart[];
  subtotal: number;
  discount: number;
  vatRate: number;
  taxAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  convertedToInvoiceId?: string;
  convertedToJobId?: string;
  notes?: string;
  sentRecords?: QuotationSendRecord[];
}

export type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., "INV-2026-001"
  date: string;
  dueDate: string;
  customerId: string;
  vehicleId: string;
  jobId?: string;
  quotationId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  vehicleRegistration?: string;
  vehicleDetails?: string;
  services: JobService[];
  parts: JobPart[];
  subtotal: number;
  discount: number;
  vatRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
}

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Card' | 'Other';

export interface Payment {
  id: string;
  receiptNumber: string; // e.g. "REC-2026-001"
  date: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string; // MoMo TxID, Cheque #, Card Ref
  notes?: string;
  recordedBy: string;
}

export type ExpenseCategory = 
  | 'Parts'
  | 'Fuel'
  | 'Utilities'
  | 'Maintenance'
  | 'Transport'
  | 'Salaries'
  | 'Petty Cash'
  | 'Other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  supplierId?: string;
  supplierName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  recordedBy: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  partsSupplied: string;
  outstandingBalance: number;
}

export type BookingStatus = 'Booked' | 'Confirmed' | 'Arrived' | 'In Service' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  customerName: string;
  customerPhone: string;
  vehicleRegistration: string;
  vehicleDetails: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  serviceRequested: string;
  technicianId?: string;
  technicianName?: string;
  status: BookingStatus;
  notes?: string;
}

export interface AppNotification {
  id: string;
  type: 'Low Stock' | 'Overdue Invoice' | 'Pending Quotation' | 'Job Waiting' | 'Job Completed' | 'Upcoming Booking' | 'General';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  recordType: 'Customer' | 'Vehicle' | 'Job Card' | 'Quotation' | 'Invoice' | 'Payment' | 'Part' | 'Requisition' | 'Expense' | 'Supplier' | 'Price List' | 'Booking' | 'System';
  recordId?: string;
  details: string;
}

export interface WorkshopSettings {
  companyName: string;
  tagline: string;
  tinNumber: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  defaultVatRate: number; // e.g. 20 (NHIL 2.5% + GETFund 2.5% + VAT 15%)
  includeVatByDefault: boolean;
}
