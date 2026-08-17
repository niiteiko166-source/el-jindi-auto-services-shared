/**
 * Production-grade utilities: RBAC, data integrity, backup management
 */

import { Request, Response, NextFunction } from 'express';
import type { User } from '../types';
import path from 'path';
import fs from 'fs';

function normalizeRole(role?: string): string {
  const value = String(role ?? '').trim();
  const key = value.toLowerCase();
  const lookup: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    receptionist: 'Receptionist',
    accountant: 'Accountant',
    technician: 'Technician',
    storekeeper: 'Storekeeper',
  };
  return lookup[key] ?? (value || 'Manager');
}

// ========== ROLE-BASED ACCESS CONTROL ==========
export type UserRole = 'Admin' | 'Manager' | 'Technician' | 'Receptionist';

interface PermissionMap {
  [endpoint: string]: UserRole[];
}

// Define which roles can access which endpoints
const ROLE_PERMISSIONS: PermissionMap = {
  // Admin-only endpoints
  '/api/_backup': ['Admin'],
  '/api/_restore': ['Admin'],
  '/api/_health': ['Admin'],
  '/api/_integrity': ['Admin'],
  '/api/users': ['Admin'],
  '/api/users/:id': ['Admin'],
  '/api/audit-logs': ['Admin'],
  
  // Manager+ can delete financial records
  '/api/payments/:id/delete': ['Admin', 'Manager'],
  '/api/invoices/:id/delete': ['Admin', 'Manager'],
  '/api/expenses/:id/delete': ['Admin', 'Manager'],
  
  // Technician can view and modify job cards
  '/api/jobcards': ['Admin', 'Manager', 'Technician'],
  '/api/jobcards/:id': ['Admin', 'Manager', 'Technician'],
  
  // Receptionist can record payments, manage customers
  '/api/payments': ['Admin', 'Manager', 'Receptionist', 'Technician'],
  '/api/invoices': ['Admin', 'Manager', 'Receptionist', 'Technician'],
  '/api/customers': ['Admin', 'Manager', 'Receptionist', 'Technician'],
  '/api/vehicles': ['Admin', 'Manager', 'Receptionist', 'Technician'],
  
  // Read-only access for all authenticated users
  '/api/data': ['Admin', 'Manager', 'Technician', 'Receptionist'],
};

/**
 * RBAC middleware: Validates user role against endpoint permission
 */
export function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public endpoints
  const publicEndpoints = ['/', '/index.html'];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  // Extract user from request (assumed to be set by auth middleware upstream)
  const user = (req as any).user as User | undefined;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: No user session' });
  }

  const userRole = normalizeRole(user.role) as UserRole;
 
  // Find matching permission rule
  const allowedRoles = ROLE_PERMISSIONS[req.path] || ROLE_PERMISSIONS[getBaseRoute(req.path)];
  
  // If no rule exists, allow access (default-allow)
  if (!allowedRoles) {
    return next();
  }
 
  // Check if user's role is permitted
  if (!allowedRoles.includes(userRole)) {
    console.warn(`⚠ RBAC VIOLATION: User ${user.name} (${userRole}) attempted to access ${req.method} ${req.path}`);
    return res.status(403).json({ 
      error: 'Forbidden: Your role does not have permission for this action',
      required: allowedRoles,
      userRole: userRole
    });
  }

  next();
}

/**
 * Extract base route from parameterized path
 * e.g., /api/users/123 -> /api/users/:id
 */
function getBaseRoute(path: string): string {
  return path
    .replace(/\/[a-z0-9\-]+(?=\/|$)/gi, (match) => {
      // Check if it looks like an ID (alphanumeric with hyphens/dashes)
      if (/^\/[a-z0-9\-]+$/.test(match)) {
        return '/:id';
      }
      return match;
    });
}

/**
 * Verify admin-only access
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  const userRole = normalizeRole(user?.role);
  
  if (!user || userRole !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * Verify manager+ access (Admin or Manager role)
 */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  const userRole = normalizeRole(user?.role);
  
  if (!user || !['Admin', 'Manager'].includes(userRole)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  
  next();
}

// ========== DATA INTEGRITY VALIDATION ==========

export interface DataIntegrityReport {
  timestamp: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

export class DataIntegrityValidator {
  /**
   * Run comprehensive data integrity checks
   */
  static validate(db: any): DataIntegrityReport {
    const checks: DataIntegrityReport['checks'] = [];
    
    // Check 1: Customers exist
    const customers = db.getCustomers?.() || [];
    checks.push({
      name: 'Customers table populated',
      passed: customers.length > 0,
      message: `Found ${customers.length} customers`
    });

    // Check 2: Vehicles reference existing customers
    const vehicles = db.getVehicles?.() || [];
    const orphanVehicles = vehicles.filter((v: any) => 
      !customers.find((c: any) => c.id === v.customerId)
    );
    checks.push({
      name: 'Vehicle customer references valid',
      passed: orphanVehicles.length === 0,
      message: orphanVehicles.length === 0 
        ? `All ${vehicles.length} vehicles have valid customer references`
        : `⚠ ${orphanVehicles.length} vehicles have missing customers`
    });

    // Check 3: Invoices have required fields
    const invoices = db.getInvoices?.() || [];
    const invalidInvoices = invoices.filter((inv: any) => 
      !inv.invoiceNumber || !inv.customerId || !inv.grandTotal
    );
    checks.push({
      name: 'Invoices data completeness',
      passed: invalidInvoices.length === 0,
      message: invalidInvoices.length === 0
        ? `All ${invoices.length} invoices have required fields`
        : `⚠ ${invalidInvoices.length} invoices are incomplete`
    });

    // Check 4: Payments match invoices
    const payments = db.getPayments?.() || [];
    const orphanPayments = payments.filter((p: any) => 
      p.invoiceId && !invoices.find((inv: any) => inv.id === p.invoiceId)
    );
    checks.push({
      name: 'Payment invoice references valid',
      passed: orphanPayments.length === 0,
      message: orphanPayments.length === 0
        ? `All ${payments.length} payments reference valid invoices`
        : `⚠ ${orphanPayments.length} payments have missing invoices`
    });

    // Check 5: Invoice balances are correct
    const incorrectBalances = invoices.filter((inv: any) => {
      const expectedBalance = inv.grandTotal - inv.paidAmount;
      return Math.abs(expectedBalance - inv.balance) > 0.01;
    });
    checks.push({
      name: 'Invoice balance calculations correct',
      passed: incorrectBalances.length === 0,
      message: incorrectBalances.length === 0
        ? `All invoice balances are mathematically correct`
        : `⚠ ${incorrectBalances.length} invoices have incorrect balances`
    });

    // Check 6: Users exist with required roles
    const users = db.getUsers?.() || [];
    const adminExists = users.some((u: any) => u.role === 'Admin');
    checks.push({
      name: 'Admin user exists',
      passed: adminExists,
      message: adminExists 
        ? 'At least one Admin user is configured'
        : '⚠ No Admin user found - system may be misconfigured'
    });

    // Determine overall status
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.length - passedCount;
    const status = failedCount > 0 ? 'FAIL' : passedCount === checks.length ? 'PASS' : 'WARNING';

    return {
      timestamp: new Date().toISOString(),
      status,
      checks,
      summary: {
        totalChecks: checks.length,
        passedChecks: passedCount,
        failedChecks: failedCount
      }
    };
  }
}

// ========== BACKUP & RECOVERY ==========

export class BackupManager {
  static readonly BACKUP_DIR = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(process.cwd(), 'backups');
  static readonly BACKUP_RETENTION_DAYS = 30;

  /**
   * List all available backups
   */
  static listBackups(): Array<{ filename: string; created: string; size: number }> {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      return [];
    }

    return fs.readdirSync(this.BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(filename => {
        const filepath = path.join(this.BACKUP_DIR, filename);
        const stat = fs.statSync(filepath);
        return {
          filename,
          created: stat.birthtime.toISOString(),
          size: stat.size
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Verify backup file integrity
   */
  static verifyBackup(filename: string): { valid: boolean; message: string } {
    const filepath = path.join(this.BACKUP_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
      return { valid: false, message: 'Backup file not found' };
    }

    const stat = fs.statSync(filepath);
    if (stat.size < 1000) {
      return { valid: false, message: 'Backup file is too small (possibly corrupted)' };
    }

    // Check if file is a valid SQLite database (starts with "SQLite format 3")
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    const header = buffer.toString('utf8', 0, 13);
    if (header !== 'SQLite format') {
      return { valid: false, message: 'File is not a valid SQLite database' };
    }

    return { valid: true, message: 'Backup file is valid' };
  }

  /**
   * Clean up old backups (older than retention period)
   */
  static cleanupOldBackups(): { removed: string[]; kept: string[] } {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      return { removed: [], kept: [] };
    }

    const now = Date.now();
    const retentionMs = this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const removed: string[] = [];
    const kept: string[] = [];

    fs.readdirSync(this.BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .forEach(filename => {
        const filepath = path.join(this.BACKUP_DIR, filename);
        const stat = fs.statSync(filepath);
        
        if (now - stat.birthtime.getTime() > retentionMs) {
          fs.unlinkSync(filepath);
          removed.push(filename);
        } else {
          kept.push(filename);
        }
      });

    return { removed, kept };
  }
}

// ========== HEALTH CHECK ==========

export interface HealthCheckReport {
  timestamp: string;
  uptime: number;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  database: {
    connected: boolean;
    recordCount: number;
  };
  backups: {
    latestBackup: string | null;
    count: number;
  };
  version: string;
}

export function performHealthCheck(db: any): HealthCheckReport {
  const backups = BackupManager.listBackups();
  const customers = db.getCustomers?.() || [];
  const invoices = db.getInvoices?.() || [];
  const payments = db.getPayments?.() || [];

  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'HEALTHY',
    database: {
      connected: true,
      recordCount: customers.length + invoices.length + payments.length
    },
    backups: {
      latestBackup: backups[0]?.created || null,
      count: backups.length
    },
    version: process.env.APP_VERSION || '1.0.0'
  };
}
