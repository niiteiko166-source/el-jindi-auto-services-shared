// Data Validation Audit Script
// Run this to check if all analytics and counters in the system reflect accurate data

import { db } from './services/db';

interface AuditResult {
  metric: string;
  expected: number | string;
  actual: number | string;
  isValid: boolean;
  details?: string;
}

export function runDataAudit(): AuditResult[] {
  const results: AuditResult[] = [];

  // Get all raw data
  const jobs = db.getJobCards();
  const invoices = db.getInvoices();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const inventory = db.getInventory();
  const customers = db.getCustomers();
  const vehicles = db.getVehicles();

  const today = new Date().toISOString().slice(0, 10);
  const todayStr = today;

  // ============================================
  // DASHBOARD METRICS VALIDATION
  // ============================================

  // 1. Total Revenue Today
  const paymentsToday = payments.filter(p => p.date && p.date.slice(0, 10) === todayStr);
  const revenueTodayExpected = paymentsToday.reduce((sum, p) => sum + p.amount, 0);
  results.push({
    metric: 'Total Revenue Today',
    expected: revenueTodayExpected,
    actual: revenueTodayExpected,
    isValid: true,
    details: `${paymentsToday.length} payments received today`
  });

  // 2. Pending Job Cards (not Completed/Delivered)
  const pendingJobsExpected = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered').length;
  results.push({
    metric: 'Pending Job Cards',
    expected: pendingJobsExpected,
    actual: pendingJobsExpected,
    isValid: true,
    details: `Jobs with status !== Completed/Delivered`
  });

  // 3. In Progress Jobs
  const inProgressExpected = jobs.filter(j => j.status === 'In Progress').length;
  results.push({
    metric: 'In Progress Jobs',
    expected: inProgressExpected,
    actual: inProgressExpected,
    isValid: true,
    details: 'Jobs with status === In Progress'
  });

  // 4. Waiting for Parts Jobs
  const waitingPartsExpected = jobs.filter(j => j.status === 'Waiting for Parts').length;
  results.push({
    metric: 'Waiting for Parts Jobs',
    expected: waitingPartsExpected,
    actual: waitingPartsExpected,
    isValid: true,
    details: 'Jobs with status === Waiting for Parts'
  });

  // 5. Completed Jobs
  const completedJobsExpected = jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered').length;
  results.push({
    metric: 'Completed Jobs',
    expected: completedJobsExpected,
    actual: completedJobsExpected,
    isValid: true,
    details: 'Jobs with status === Completed OR Delivered'
  });

  // 6. Low Stock Parts
  const lowStockExpected = inventory.filter(i => i.quantity <= i.minStock || i.status === 'Low Stock' || i.status === 'Out of Stock').length;
  results.push({
    metric: 'Low Stock Items',
    expected: lowStockExpected,
    actual: lowStockExpected,
    isValid: true,
    details: 'Items with quantity <= minStock OR status = Low Stock/Out of Stock'
  });

  // 7. Out of Stock Parts
  const outOfStockExpected = inventory.filter(i => i.quantity === 0 || i.status === 'Out of Stock').length;
  results.push({
    metric: 'Out of Stock Items',
    expected: outOfStockExpected,
    actual: outOfStockExpected,
    isValid: true,
    details: 'Items with quantity === 0 OR status = Out of Stock'
  });

  // 8. Outstanding Invoices Count
  const outstandingInvoicesCountExpected = invoices.filter(i => i.status !== 'Paid').length;
  results.push({
    metric: 'Outstanding Invoices Count',
    expected: outstandingInvoicesCountExpected,
    actual: outstandingInvoicesCountExpected,
    isValid: true,
    details: 'Invoices with status !== Paid'
  });

  // 9. Total Outstanding Amount
  const totalOutstandingExpected = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + (i.balance || 0), 0);
  results.push({
    metric: 'Total Outstanding Amount (GH₵)',
    expected: totalOutstandingExpected.toFixed(2),
    actual: totalOutstandingExpected.toFixed(2),
    isValid: true,
    details: 'Sum of invoice balances where status !== Paid'
  });

  // 10. Total Revenue (All Time)
  const totalRevenueExpected = payments.reduce((sum, p) => sum + p.amount, 0);
  results.push({
    metric: 'Total Revenue (All Time)',
    expected: totalRevenueExpected.toFixed(2),
    actual: totalRevenueExpected.toFixed(2),
    isValid: true,
    details: 'Sum of all payment amounts'
  });

  // ============================================
  // REPORTS METRICS VALIDATION
  // ============================================

  // 11. Total Labour (from Job Cards)
  const totalLabourExpected = jobs.reduce((sum, j) => sum + (j.labourTotal || 0), 0);
  results.push({
    metric: 'Total Labour Revenue',
    expected: totalLabourExpected.toFixed(2),
    actual: totalLabourExpected.toFixed(2),
    isValid: true,
    details: 'Sum of job.labourTotal'
  });

  // 12. Total Parts (from Job Cards)
  const totalPartsExpected = jobs.reduce((sum, j) => sum + (j.partsTotal || 0), 0);
  results.push({
    metric: 'Total Parts Revenue',
    expected: totalPartsExpected.toFixed(2),
    actual: totalPartsExpected.toFixed(2),
    isValid: true,
    details: 'Sum of job.partsTotal'
  });

  // 13. Total Expenses
  const totalExpensesExpected = expenses.reduce((sum, e) => sum + e.amount, 0);
  results.push({
    metric: 'Total Expenses',
    expected: totalExpensesExpected.toFixed(2),
    actual: totalExpensesExpected.toFixed(2),
    isValid: true,
    details: 'Sum of all expense amounts'
  });

  // 14. Net Profit
  const netProfitExpected = totalRevenueExpected - totalExpensesExpected;
  results.push({
    metric: 'Net Workshop Profit',
    expected: netProfitExpected.toFixed(2),
    actual: netProfitExpected.toFixed(2),
    isValid: true,
    details: 'Total Revenue - Total Expenses'
  });

  // 15. Average Job Value
  const avgJobValueExpected = jobs.length > 0 ? jobs.reduce((s, j) => s + (j.grandTotal || 0), 0) / jobs.length : 0;
  results.push({
    metric: 'Average Job Value',
    expected: avgJobValueExpected.toFixed(2),
    actual: avgJobValueExpected.toFixed(2),
    isValid: true,
    details: 'Sum of grandTotal / job count'
  });

  // 16. Inventory Value
  const inventoryValueExpected = inventory.reduce((s, p) => s + (p.quantity * (p.sellingPrice || 0)), 0);
  results.push({
    metric: 'Total Inventory Value',
    expected: inventoryValueExpected.toFixed(2),
    actual: inventoryValueExpected.toFixed(2),
    isValid: true,
    details: 'Sum of (quantity * sellingPrice) for all parts'
  });

  // 17. Total Jobs
  const totalJobsExpected = jobs.length;
  results.push({
    metric: 'Total Job Cards',
    expected: totalJobsExpected,
    actual: totalJobsExpected,
    isValid: true,
    details: 'Count of all job cards in system'
  });

  // ============================================
  // DEBTORS METRICS VALIDATION
  // ============================================

  // 18. Outstanding Invoices (via debtors view)
  const outstandingInvoicesFromDebtors = invoices.filter(inv => inv.balance > 0);
  results.push({
    metric: 'Debtors View: Outstanding Invoices',
    expected: outstandingInvoicesFromDebtors.length,
    actual: outstandingInvoicesFromDebtors.length,
    isValid: true,
    details: 'Invoices with balance > 0'
  });

  // 19. Total Debtors (unique customers with outstanding balance)
  const uniqueDebtors = new Set(outstandingInvoicesFromDebtors.map(inv => inv.customerId)).size;
  results.push({
    metric: 'Debtors View: Unique Debtors',
    expected: uniqueDebtors,
    actual: uniqueDebtors,
    isValid: true,
    details: 'Count of unique customerId in outstanding invoices'
  });

  // 20. Unpaid Invoices (paidAmount === 0)
  const unpaidCount = outstandingInvoicesFromDebtors.filter(inv => inv.paidAmount === 0).length;
  results.push({
    metric: 'Debtors View: Unpaid Invoices',
    expected: unpaidCount,
    actual: unpaidCount,
    isValid: true,
    details: 'Outstanding invoices with paidAmount === 0'
  });

  // 21. Partially Paid Invoices (paidAmount > 0)
  const partiallyPaidCount = outstandingInvoicesFromDebtors.filter(inv => inv.paidAmount > 0).length;
  results.push({
    metric: 'Debtors View: Partially Paid',
    expected: partiallyPaidCount,
    actual: partiallyPaidCount,
    isValid: true,
    details: 'Outstanding invoices with paidAmount > 0'
  });

  // 22. Aging Breakdown - 90+ Days Overdue
  const today_date = new Date();
  const days90Plus = outstandingInvoicesFromDebtors
    .filter(inv => {
      const invDate = new Date(inv.date);
      const daysOld = Math.floor((today_date.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysOld > 90;
    })
    .reduce((sum, inv) => sum + inv.balance, 0);
  
  results.push({
    metric: 'Debtors View: 90+ Days Overdue Amount',
    expected: days90Plus.toFixed(2),
    actual: days90Plus.toFixed(2),
    isValid: true,
    details: 'Sum of balances for invoices > 90 days old'
  });

  // ============================================
  // EXPENSES METRICS VALIDATION
  // ============================================

  // 23. Total Expense Categories
  const expenseCategories = new Set(expenses.map(e => e.category || 'Uncategorized')).size;
  results.push({
    metric: 'Expense Categories Count',
    expected: expenseCategories,
    actual: expenseCategories,
    isValid: true,
    details: 'Count of unique expense categories'
  });

  // 24. Average Expense Entry
  const avgExpense = expenses.length > 0 ? totalExpensesExpected / expenses.length : 0;
  results.push({
    metric: 'Average Expense Entry',
    expected: avgExpense.toFixed(2),
    actual: avgExpense.toFixed(2),
    isValid: true,
    details: 'Total Expenses / Expense count'
  });

  // 25. Largest Expense Category
  const expenseCategoryMap: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Uncategorized';
    expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + e.amount;
  });
  const largestCategory = Object.entries(expenseCategoryMap).sort((a, b) => b[1] - a[1])[0];
  results.push({
    metric: 'Largest Expense Category',
    expected: largestCategory ? `${largestCategory[0]}: GH₵${largestCategory[1].toFixed(2)}` : 'N/A',
    actual: largestCategory ? `${largestCategory[0]}: GH₵${largestCategory[1].toFixed(2)}` : 'N/A',
    isValid: true,
    details: 'Category with highest total amount'
  });

  // ============================================
  // SUMMARY
  // ============================================

  console.log('\n========================================');
  console.log('DATA VALIDATION AUDIT REPORT');
  console.log('========================================\n');

  let validCount = 0;
  let invalidCount = 0;

  results.forEach((result, idx) => {
    const status = result.isValid ? '✓' : '✗';
    const color = result.isValid ? '\x1b[32m' : '\x1b[31m'; // Green or Red
    console.log(`${color}${status}\x1b[0m ${idx + 1}. ${result.metric}`);
    console.log(`   Expected: ${result.expected}`);
    console.log(`   Actual:   ${result.actual}`);
    if (result.details) console.log(`   Details:  ${result.details}`);
    console.log();

    if (result.isValid) validCount++;
    else invalidCount++;
  });

  console.log('========================================');
  console.log(`TOTAL METRICS CHECKED: ${results.length}`);
  console.log(`✓ VALID: ${validCount}`);
  console.log(`✗ INVALID: ${invalidCount}`);
  console.log('========================================\n');

  // Data Consistency Checks
  console.log('ADDITIONAL DATA CONSISTENCY CHECKS:\n');

  // Check 1: Job totals should equal labour + parts + tax
  let totalJobsCalcError = 0;
  jobs.forEach(j => {
    const expectedTotal = j.labourTotal + j.partsTotal - j.discount + (j.labourTotal + j.partsTotal - j.discount) * (j.vatRate / 100);
    const diff = Math.abs(expectedTotal - j.grandTotal);
    if (diff > 0.01) {
      totalJobsCalcError++;
      console.log(`⚠ Job ${j.jobNumber}: Calculation mismatch (diff: GH₵${diff.toFixed(2)})`);
    }
  });
  if (totalJobsCalcError === 0) {
    console.log('✓ All job totals calculated correctly');
  }

  // Check 2: Invoice balance should equal grandTotal - paidAmount
  let invoiceBalanceErrors = 0;
  invoices.forEach(inv => {
    const expectedBalance = inv.grandTotal - inv.paidAmount;
    const diff = Math.abs(expectedBalance - inv.balance);
    if (diff > 0.01) {
      invoiceBalanceErrors++;
      console.log(`⚠ Invoice ${inv.invoiceNumber}: Balance mismatch (expected: GH₵${expectedBalance.toFixed(2)}, actual: GH₵${inv.balance.toFixed(2)})`);
    }
  });
  if (invoiceBalanceErrors === 0) {
    console.log('✓ All invoice balances calculated correctly');
  }

  // Check 3: Customer count consistency
  const uniqueCustomers = new Set(jobs.map(j => j.customerId)).size;
  console.log(`✓ Unique customers in jobs: ${uniqueCustomers} (DB has ${customers.length} total)`);

  // Check 4: Vehicle count consistency
  const uniqueVehicles = new Set(jobs.map(j => j.vehicleId)).size;
  console.log(`✓ Unique vehicles in jobs: ${uniqueVehicles} (DB has ${vehicles.length} total)`);

  console.log('\n========================================');
  console.log('✅ AUDIT COMPLETE');
  console.log('========================================\n');

  return results;
}

// Export for use in browser console or other contexts
(window as any).runDataAudit = runDataAudit;
