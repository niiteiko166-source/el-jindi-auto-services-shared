import { Product, ComputedProductStats, DebtorRecord, ComputedDebtor } from '../types';

export function computeProductStats(p: Product): ComputedProductStats {
  const cost = Number(p.cost) || 0;
  const sell = Number(p.sell) || 0;
  const qty = Number(p.qty) || 0;
  const sold = Number(p.sold) || 0;
  const ret = Number(p.ret) || 0;
  const reorder = Number(p.reorder) || 3;

  const totalPurchaseCost = cost * qty;
  const currentStock = qty - sold + ret;
  const revenue = sell * sold;
  const profit = revenue - cost * sold;
  const stockValueCost = currentStock * cost;
  const stockValueSell = currentStock * sell;

  let status: 'OK' | 'REORDER' | 'OUT_OF_STOCK' = 'OK';
  if (currentStock <= 0) {
    status = 'OUT_OF_STOCK';
  } else if (currentStock <= reorder) {
    status = 'REORDER';
  }

  return {
    totalPurchaseCost,
    currentStock,
    revenue,
    profit,
    stockValueCost,
    stockValueSell,
    status
  };
}

export function computeDebtorStats(d: DebtorRecord): ComputedDebtor {
  const qty = Number(d.qty) || 0;
  const price = Number(d.price) || 0;
  const paid = Number(d.paid) || 0;

  const amount = qty * price;
  const balance = amount - paid;
  const status: 'PAID' | 'OUTSTANDING' = balance <= 0 ? 'PAID' : 'OUTSTANDING';

  let daysOverdue: number | null = null;
  const parsedDate = Date.parse(d.date);
  if (!isNaN(parsedDate) && balance > 0) {
    daysOverdue = Math.max(0, Math.floor((Date.now() - parsedDate) / (1000 * 60 * 60 * 24)));
  }

  return {
    amount,
    balance: Math.max(0, balance),
    status,
    daysOverdue
  };
}

export function formatCurrency(amount: number, symbol: string = 'GH₵'): string {
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatInt(val: number): string {
  return (Number(val) || 0).toLocaleString('en-GH');
}

export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
