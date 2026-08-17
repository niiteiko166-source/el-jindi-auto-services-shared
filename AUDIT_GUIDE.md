# Production Readiness Data Audit Guide

## Overview

Before deploying to production, run these comprehensive audits to verify that all analytics, counters, and data integrity checks pass.

## Two Audit Modules Created

### 1. **Data Validation Audit** (`src/auditData.ts`)
Validates 25 key metrics across all views:
- **Dashboard Metrics**: Revenue, job counts, stock levels
- **Reports Metrics**: Financial data (labour, parts, expenses, profit)
- **Debtors Metrics**: Outstanding balances, aging breakdown
- **Expenses Metrics**: Category totals, averages
- **Consistency Checks**: Job total calculations, invoice balances, customer/vehicle counts

### 2. **Production Readiness Audit** (`src/productionAudit.ts`)
Performs 10 comprehensive system checks:
1. Invoice total calculations accuracy
2. Invoice status consistency
3. Payment record integrity
4. Expense record validity
5. Inventory stock level validation
6. Customer data completeness
7. Vehicle record validity
8. Job card record integrity
9. Referential integrity (foreign keys)
10. User account validation

---

## How to Run the Audits

### Option A: Browser Console (Recommended)

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Open Developer Tools** (F12 or Right-click → Inspect)

4. **Go to the Console tab**

5. **Run the Data Validation Audit**:
   ```javascript
   runDataAudit()
   ```
   This will log all 25 metrics with their expected and actual values.

6. **Run the Production Readiness Audit**:
   ```javascript
   const checks = generateProductionAuditReport()
   printAuditReport(checks)
   ```
   This will print a comprehensive report with pass/fail status for all 10 checks.

### Option B: Programmatic (In Code)

Import and run the functions directly:

```typescript
import { runDataAudit } from './auditData';
import { generateProductionAuditReport, printAuditReport } from './productionAudit';

// Run metrics audit
const metrics = runDataAudit();

// Run system checks
const checks = generateProductionAuditReport();
printAuditReport(checks);
```

---

## Interpreting Audit Results

### Data Validation Audit Output

```
========================================
DATA VALIDATION AUDIT REPORT
========================================

✓ 1. Total Revenue Today
   Expected: 1500.50
   Actual:   1500.50
   Details:  2 payments received today

[... more metrics ...]

========================================
TOTAL METRICS CHECKED: 25
✓ VALID: 25
✗ INVALID: 0
========================================
```

**Meanings**:
- ✓ = Valid (expected = actual)
- ✗ = Invalid (values don't match)

### Production Readiness Audit Output

```
========================================
PRODUCTION READINESS AUDIT REPORT
========================================

✅ 1. Invoice Total Calculations
   ✓ All checks passed

❌ 2. Payment Records Integrity
   CRITICAL ISSUES:
     ❌ Payment PAY-123: Negative amount (GH₵-50.00)

   WARNINGS:
     ⚠️  Payment PAY-456: No customer linked

[... more checks ...]

========================================
SUMMARY:
  Total Checks: 10
  ✅ Passed: 9
  ❌ Critical Issues: 1
  ⚠️  Warnings: 2
========================================

❌ SYSTEM IS NOT PRODUCTION READY - Fix critical issues before deploying
```

**Status Messages**:
- 🚀 **SYSTEM IS PRODUCTION READY** - All checks passed, no issues
- ⚠️  **CAN GO TO PRODUCTION WITH CAUTION** - No critical issues, but warnings should be reviewed
- ❌ **NOT PRODUCTION READY** - Critical issues must be fixed before deployment

---

## Critical Issues vs Warnings

### 🚨 Critical Issues (❌)
Must be fixed before production:
- Negative amounts (revenue, expenses)
- Invalid statuses
- Missing required data
- Calculation mismatches
- Referential integrity violations

### ⚠️ Warnings
Should be reviewed and addressed, but may not block deployment:
- Missing optional fields (email, address)
- Selling price lower than purchase cost
- Inconsistent status/data combinations

---

## What Each Check Validates

### 1. Invoice Total Calculations
- Labour + Parts = Subtotal
- Subtotal + Tax - Discount = Grand Total
- Grand Total - Paid Amount = Balance

### 2. Invoice Status Consistency
- Status "Paid" requires balance = 0
- Status "Partially Paid" requires 0 < paidAmount < grandTotal
- Status "Unpaid" requires paidAmount = 0

### 3. Payment Records Integrity
- All amounts must be ≥ 0
- All payments must have a date
- Customer linkage validation

### 4. Expense Records
- All amounts must be ≥ 0
- Categories should be specified
- All expenses must have a date

### 5. Inventory Stock Levels
- Quantities must be ≥ 0
- Status must match quantity (0 = Out of Stock, ≤ minStock = Low Stock)
- Prices must be ≥ 0
- Selling price ≥ purchase price (no loss)

### 6. Customer Data Completeness
- Name is required
- Phone is required
- Email/address recommended

### 7. Vehicle Records
- Registration number required
- Valid year (1900 - current year + 1)
- Mileage must be ≥ 0

### 8. Job Card Validity
- Job number required
- Customer and vehicle must be linked
- Valid status value
- No negative amounts

### 9. Referential Integrity
- All referenced customers exist
- All referenced vehicles exist
- No orphaned records

### 10. User Accounts
- Name required
- Email required
- Valid role (Admin, Technician, Receptionist, Accountant)

---

## Pre-Production Checklist

Before deploying to production:

- [ ] Run both audit scripts
- [ ] Review all critical issues
- [ ] Fix any issues found
- [ ] Run audits again to verify fixes
- [ ] Document any warnings and business justification
- [ ] Get sign-off from business stakeholders
- [ ] Backup production data before first deployment

---

## Common Issues & Solutions

### Issue: "Invoice balance mismatch"
**Cause**: Calculation error in invoice totals
**Solution**: Recalculate using the formula: `balance = grandTotal - paidAmount`

### Issue: "Status mismatch - Paid but has balance"
**Cause**: Invoice marked as Paid without zero balance
**Solution**: Update invoice status to match actual payment state

### Issue: "Negative amount"
**Cause**: Data entry error or calculation bug
**Solution**: Verify the source data and correct the entry

### Issue: "Missing customer/vehicle link"
**Cause**: Job/Invoice created without proper references
**Solution**: Link to appropriate customer/vehicle record

### Issue: "Selling price lower than purchase cost"
**Cause**: Pricing misconfiguration
**Solution**: Adjust selling price or review supplier pricing strategy

---

## Running Regular Audits

Recommendations for ongoing monitoring:

- **Daily**: Quick check via browser console before opening app
- **Weekly**: Full audit on production backup
- **Monthly**: Comprehensive audit and reconciliation
- **Before releases**: Always run full audit before deploying

---

## Audit Data Output

All audit results include:
- **Metric Name**: The specific check being validated
- **Expected Value**: What the system should have
- **Actual Value**: What the system currently has
- **Details**: Additional context about the metric
- **Status**: Pass (✓) or Fail (✗)

---

## Next Steps

1. Run the audits in your development environment
2. Review any issues found
3. Fix critical issues
4. Run audits again to confirm
5. Deploy with confidence! 🚀
