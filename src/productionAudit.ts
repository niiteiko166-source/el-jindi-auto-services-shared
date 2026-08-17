// Production Readiness Data Audit Report
// This script performs comprehensive checks on all system data before production

import { db } from './services/db';

interface AuditCheck {
  name: string;
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export function generateProductionAuditReport(): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // Get all raw data
  const jobs = db.getJobCards();
  const invoices = db.getInvoices();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const inventory = db.getInventory();
  const customers = db.getCustomers();
  const vehicles = db.getVehicles();
  const users = db.getUsers();

  // ============================================
  // CHECK 1: Invoice Total Calculations
  // ============================================
  let invoiceCalcCheck: AuditCheck = {
    name: 'Invoice Total Calculations',
    passed: true,
    issues: [],
    warnings: []
  };

  invoices.forEach(inv => {
    // Calculate expected totals
    const labourTotal = (inv.services || []).reduce((sum, s) => sum + s.total, 0);
    const partsTotal = (inv.parts || []).reduce((sum, p) => sum + p.total, 0);
    const expectedSubtotal = labourTotal + partsTotal;
    const expectedTax = Number(((expectedSubtotal * inv.vatRate) / 100).toFixed(2));
    const expectedGrandTotal = Number((expectedSubtotal + expectedTax - inv.discount).toFixed(2));
    const expectedBalance = Number(Math.max(0, expectedGrandTotal - inv.paidAmount).toFixed(2));

    // Check against actual
    const subtotalDiff = Math.abs((labourTotal + partsTotal) - (inv.grandTotal - inv.taxAmount + inv.discount));
    const grandTotalDiff = Math.abs(expectedGrandTotal - inv.grandTotal);
    const balanceDiff = Math.abs(expectedBalance - inv.balance);

    if (subtotalDiff > 0.01) {
      invoiceCalcCheck.passed = false;
      invoiceCalcCheck.issues.push(`Invoice ${inv.invoiceNumber}: Subtotal mismatch (diff: GH₵${subtotalDiff.toFixed(2)})`);
    }

    if (grandTotalDiff > 0.01) {
      invoiceCalcCheck.passed = false;
      invoiceCalcCheck.issues.push(`Invoice ${inv.invoiceNumber}: Grand total mismatch (expected: GH₵${expectedGrandTotal.toFixed(2)}, actual: GH₵${inv.grandTotal.toFixed(2)})`);
    }

    if (balanceDiff > 0.01) {
      invoiceCalcCheck.passed = false;
      invoiceCalcCheck.issues.push(`Invoice ${inv.invoiceNumber}: Balance mismatch (expected: GH₵${expectedBalance.toFixed(2)}, actual: GH₵${inv.balance.toFixed(2)})`);
    }
  });

  checks.push(invoiceCalcCheck);

  // ============================================
  // CHECK 2: Invoice Status Consistency
  // ============================================
  let invoiceStatusCheck: AuditCheck = {
    name: 'Invoice Status Consistency',
    passed: true,
    issues: [],
    warnings: []
  };

  invoices.forEach(inv => {
    const isPaid = inv.paidAmount >= inv.grandTotal && inv.grandTotal > 0;
    const isPartiallPaid = inv.paidAmount > 0 && inv.paidAmount < inv.grandTotal;
    const isUnpaid = inv.paidAmount === 0;

    let expectedStatus = 'Unpaid';
    if (isPaid) expectedStatus = 'Paid';
    else if (isPartiallPaid) expectedStatus = 'Partially Paid';

    if (inv.status !== expectedStatus) {
      invoiceStatusCheck.passed = false;
      invoiceStatusCheck.issues.push(
        `Invoice ${inv.invoiceNumber}: Status mismatch (expected: ${expectedStatus}, actual: ${inv.status})`
      );
    }

    // Check balance vs status
    if (inv.status === 'Paid' && inv.balance > 0) {
      invoiceStatusCheck.passed = false;
      invoiceStatusCheck.issues.push(
        `Invoice ${inv.invoiceNumber}: Marked as Paid but has balance: GH₵${inv.balance.toFixed(2)}`
      );
    }
  });

  checks.push(invoiceStatusCheck);

  // ============================================
  // CHECK 3: Payment Amount Consistency
  // ============================================
  let paymentCheck: AuditCheck = {
    name: 'Payment Records Integrity',
    passed: true,
    issues: [],
    warnings: []
  };

  payments.forEach(p => {
    if (p.amount < 0) {
      paymentCheck.passed = false;
      paymentCheck.issues.push(`Payment ${p.id}: Negative amount (GH₵${p.amount})`);
    }

    if (!p.date || p.date.length === 0) {
      paymentCheck.passed = false;
      paymentCheck.issues.push(`Payment ${p.id}: Missing date`);
    }

    if (!p.customerId) {
      paymentCheck.warnings.push(`Payment ${p.id}: No customer linked`);
    }
  });

  checks.push(paymentCheck);

  // ============================================
  // CHECK 4: Expense Record Integrity
  // ============================================
  let expenseCheck: AuditCheck = {
    name: 'Expense Records',
    passed: true,
    issues: [],
    warnings: []
  };

  expenses.forEach(e => {
    if (e.amount < 0) {
      expenseCheck.passed = false;
      expenseCheck.issues.push(`Expense ${e.id}: Negative amount (GH₵${e.amount})`);
    }

    if (!e.category || e.category.length === 0) {
      expenseCheck.warnings.push(`Expense ${e.id}: No category specified`);
    }

    if (!e.date || e.date.length === 0) {
      expenseCheck.passed = false;
      expenseCheck.issues.push(`Expense ${e.id}: Missing date`);
    }
  });

  checks.push(expenseCheck);

  // ============================================
  // CHECK 5: Inventory Stock Levels
  // ============================================
  let inventoryCheck: AuditCheck = {
    name: 'Inventory Stock Levels',
    passed: true,
    issues: [],
    warnings: []
  };

  inventory.forEach(part => {
    if (part.quantity < 0) {
      inventoryCheck.passed = false;
      inventoryCheck.issues.push(`Part ${part.partName}: Negative quantity (${part.quantity})`);
    }

    if (part.quantity === 0 && part.status !== 'Out of Stock') {
      inventoryCheck.warnings.push(`Part ${part.partName}: Zero quantity but status is ${part.status}`);
    }

    if (part.quantity > 0 && part.status === 'Out of Stock') {
      inventoryCheck.warnings.push(`Part ${part.partName}: Has stock (${part.quantity}) but marked Out of Stock`);
    }

    if (part.quantity <= part.minStock && part.status !== 'Low Stock') {
      inventoryCheck.warnings.push(`Part ${part.partName}: Below min stock but not marked Low Stock`);
    }

    if (part.sellingPrice < 0) {
      inventoryCheck.passed = false;
      inventoryCheck.issues.push(`Part ${part.partName}: Negative selling price (GH₵${part.sellingPrice})`);
    }

    if (part.purchasePrice < 0) {
      inventoryCheck.passed = false;
      inventoryCheck.issues.push(`Part ${part.partName}: Negative purchase price (GH₵${part.purchasePrice})`);
    }

    if (part.sellingPrice < part.purchasePrice) {
      inventoryCheck.warnings.push(`Part ${part.partName}: Selling price lower than purchase cost (Loss: GH₵${(part.purchasePrice - part.sellingPrice).toFixed(2)})`);
    }
  });

  checks.push(inventoryCheck);

  // ============================================
  // CHECK 6: Customer Data Completeness
  // ============================================
  let customerCheck: AuditCheck = {
    name: 'Customer Data Completeness',
    passed: true,
    issues: [],
    warnings: []
  };

  customers.forEach(c => {
    if (!c.name || c.name.trim().length === 0) {
      customerCheck.passed = false;
      customerCheck.issues.push(`Customer ${c.id}: Missing name`);
    }

    if (!c.phone || c.phone.trim().length === 0) {
      customerCheck.passed = false;
      customerCheck.issues.push(`Customer ${c.name || c.id}: Missing phone`);
    }

    if (!c.email) {
      customerCheck.warnings.push(`Customer ${c.name}: Missing email`);
    }

    if (!c.address) {
      customerCheck.warnings.push(`Customer ${c.name}: Missing address`);
    }
  });

  checks.push(customerCheck);

  // ============================================
  // CHECK 7: Vehicle Registration Validity
  // ============================================
  let vehicleCheck: AuditCheck = {
    name: 'Vehicle Records',
    passed: true,
    issues: [],
    warnings: []
  };

  vehicles.forEach(v => {
    if (!v.registrationNumber || v.registrationNumber.trim().length === 0) {
      vehicleCheck.passed = false;
      vehicleCheck.issues.push(`Vehicle ${v.id}: Missing registration number`);
    }

    if (!v.make || v.make.trim().length === 0) {
      vehicleCheck.warnings.push(`Vehicle ${v.registrationNumber}: Missing make`);
    }

    if (v.year < 1900 || v.year > new Date().getFullYear() + 1) {
      vehicleCheck.warnings.push(`Vehicle ${v.registrationNumber}: Invalid year (${v.year})`);
    }

    if (v.mileage < 0) {
      vehicleCheck.passed = false;
      vehicleCheck.issues.push(`Vehicle ${v.registrationNumber}: Negative mileage (${v.mileage})`);
    }
  });

  checks.push(vehicleCheck);

  // ============================================
  // CHECK 8: Job Card Validity
  // ============================================
  let jobCheck: AuditCheck = {
    name: 'Job Card Records',
    passed: true,
    issues: [],
    warnings: []
  };

  jobs.forEach(j => {
    if (!j.jobNumber || j.jobNumber.trim().length === 0) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.id}: Missing job number`);
    }

    if (!j.customerId) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: No customer linked`);
    }

    if (!j.vehicleId) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: No vehicle linked`);
    }

    if (j.labourTotal < 0) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: Negative labour total (GH₵${j.labourTotal})`);
    }

    if (j.partsTotal < 0) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: Negative parts total (GH₵${j.partsTotal})`);
    }

    if (j.grandTotal < 0) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: Negative grand total (GH₵${j.grandTotal})`);
    }

    if (!['Received', 'Diagnosis', 'Waiting for Approval', 'Waiting for Parts', 'In Progress', 'Quality Check', 'Completed', 'Delivered'].includes(j.status)) {
      jobCheck.passed = false;
      jobCheck.issues.push(`Job ${j.jobNumber}: Invalid status (${j.status})`);
    }
  });

  checks.push(jobCheck);

  // ============================================
  // CHECK 9: Referential Integrity
  // ============================================
  let refIntegrityCheck: AuditCheck = {
    name: 'Referential Integrity',
    passed: true,
    issues: [],
    warnings: []
  };

  const customerIds = new Set(customers.map(c => c.id));
  const vehicleIds = new Set(vehicles.map(v => v.id));

  jobs.forEach(j => {
    if (!customerIds.has(j.customerId)) {
      refIntegrityCheck.issues.push(`Job ${j.jobNumber}: References missing customer ${j.customerId}`);
      refIntegrityCheck.passed = false;
    }
    if (!vehicleIds.has(j.vehicleId)) {
      refIntegrityCheck.issues.push(`Job ${j.jobNumber}: References missing vehicle ${j.vehicleId}`);
      refIntegrityCheck.passed = false;
    }
  });

  invoices.forEach(inv => {
    if (!customerIds.has(inv.customerId)) {
      refIntegrityCheck.issues.push(`Invoice ${inv.invoiceNumber}: References missing customer ${inv.customerId}`);
      refIntegrityCheck.passed = false;
    }
  });

  checks.push(refIntegrityCheck);

  // ============================================
  // CHECK 10: User Accounts
  // ============================================
  let userCheck: AuditCheck = {
    name: 'User Accounts',
    passed: true,
    issues: [],
    warnings: []
  };

  users.forEach(u => {
    if (!u.name || u.name.trim().length === 0) {
      userCheck.issues.push(`User ${u.id}: Missing name`);
      userCheck.passed = false;
    }

    if (!u.email || u.email.trim().length === 0) {
      userCheck.issues.push(`User ${u.id}: Missing email`);
      userCheck.passed = false;
    }

    if (!['Admin', 'Technician', 'Receptionist', 'Accountant'].includes(u.role)) {
      userCheck.warnings.push(`User ${u.name}: Invalid role (${u.role})`);
    }
  });

  checks.push(userCheck);

  return checks;
}

export function printAuditReport(checks: AuditCheck[]): void {
  console.log('\n========================================');
  console.log('PRODUCTION READINESS AUDIT REPORT');
  console.log('========================================\n');

  let totalPassed = 0;
  let totalIssues = 0;
  let totalWarnings = 0;

  checks.forEach((check, idx) => {
    const status = check.passed ? '✅' : '❌';
    console.log(`${status} ${idx + 1}. ${check.name}`);

    if (check.issues.length > 0) {
      console.log('   CRITICAL ISSUES:');
      check.issues.forEach(issue => {
        console.log(`     ❌ ${issue}`);
        totalIssues++;
      });
    }

    if (check.warnings.length > 0) {
      console.log('   WARNINGS:');
      check.warnings.forEach(warning => {
        console.log(`     ⚠️  ${warning}`);
        totalWarnings++;
      });
    }

    if (check.passed && check.warnings.length === 0) {
      console.log('   ✓ All checks passed');
    }

    console.log();
    if (check.passed) totalPassed++;
  });

  console.log('========================================');
  console.log('SUMMARY:');
  console.log(`  Total Checks: ${checks.length}`);
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Critical Issues: ${totalIssues}`);
  console.log(`  ⚠️  Warnings: ${totalWarnings}`);
  console.log('========================================\n');

  if (totalIssues === 0 && totalPassed === checks.length) {
    console.log('🚀 SYSTEM IS PRODUCTION READY!\n');
  } else if (totalIssues === 0) {
    console.log('⚠️  SYSTEM CAN GO TO PRODUCTION WITH CAUTION (fix warnings first)\n');
  } else {
    console.log('❌ SYSTEM IS NOT PRODUCTION READY - Fix critical issues before deploying\n');
  }
}

// Export for console usage
(window as any).generateProductionAuditReport = generateProductionAuditReport;
(window as any).printAuditReport = printAuditReport;
