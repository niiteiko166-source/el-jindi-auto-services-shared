import { Product, DebtorRecord } from '../types';

export interface ParsedImportItem {
  type: 'product' | 'debtor';
  rawRow: Record<string, any>;
  data: Partial<Product> | Partial<DebtorRecord>;
  isDuplicate: boolean;
  duplicateOf?: string;
  status: 'NEW' | 'DUPLICATE';
}

/**
 * Normalizes text extracted from HTML nodes or CSV cells
 */
function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val)
    .replace(/<[^>]*>/g, '') // strip HTML tags if any
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
  return str;
}

/**
 * Parses numeric currency/quantity strings (e.g. "GH₵ 120.00", "$45.50", "1,500")
 */
function parseNumber(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = cleanText(val)
    .replace(/GH₵|GHS|\$|€|£|,/gi, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Parses HTML or Web Table markup string into an array of raw objects
 */
export function parseHTMLTableToObjects(htmlString: string): Record<string, string>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const table = doc.querySelector('table');

  const results: Record<string, string>[] = [];

  if (table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return results;

    let headers: string[] = [];

    // Check first row for <th> or <td>
    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    headers = headerCells.map((c, idx) => cleanText(c.textContent) || `col_${idx}`);

    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td, th'));
      if (cells.length === 0) continue;

      const rowObj: Record<string, string> = {};
      let hasData = false;

      cells.forEach((cell, idx) => {
        const key = headers[idx] || `col_${idx}`;
        const val = cleanText(cell.textContent);
        if (val) hasData = true;
        rowObj[key] = val;
      });

      if (hasData) {
        results.push(rowObj);
      }
    }
  } else {
    // Fallback: try parsing generic HTML list or CSV-like text
    const lines = htmlString.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = lines[0].split(/,|\t/).map((h) => cleanText(h));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,|\t/).map((c) => cleanText(c));
        if (cols.length >= 2) {
          const rowObj: Record<string, string> = {};
          cols.forEach((col, idx) => {
            const key = headers[idx] || `col_${idx}`;
            rowObj[key] = col;
          });
          results.push(rowObj);
        }
      }
    }
  }

  return results;
}

/**
 * Maps raw key-value objects from HTML table to structured Product or Debtor model,
 * and performs duplicate checking against existing database items.
 */
export function processImportDataWithDuplicateCheck(
  rawObjects: Record<string, string>[],
  existingProducts: Product[],
  existingDebtors: DebtorRecord[]
): {
  detectedType: 'product' | 'debtor';
  parsedItems: ParsedImportItem[];
  duplicateCount: number;
  newCount: number;
} {
  if (rawObjects.length === 0) {
    return {
      detectedType: 'product',
      parsedItems: [],
      duplicateCount: 0,
      newCount: 0
    };
  }

  // Detect whether table represents Debtors or Products
  const sampleKeys = Object.keys(rawObjects[0]).map((k) => k.toLowerCase());
  const isDebtorTable =
    sampleKeys.some((k) => k.includes('debtor') || k.includes('customer') || k.includes('client')) &&
    sampleKeys.some((k) => k.includes('paid') || k.includes('due') || k.includes('owe') || k.includes('balance'));

  const parsedItems: ParsedImportItem[] = [];
  let duplicateCount = 0;
  let newCount = 0;

  // Internal deduplication tracking during current import batch
  const seenCodesInBatch = new Set<string>();
  const seenDebtorsInBatch = new Set<string>();

  if (isDebtorTable) {
    rawObjects.forEach((raw) => {
      const keys = Object.keys(raw);
      const findVal = (terms: string[]) => {
        const matchedKey = keys.find((k) => terms.some((t) => k.toLowerCase().includes(t)));
        return matchedKey ? raw[matchedKey] : '';
      };

      const customer = findVal(['customer', 'debtor', 'client', 'name']) || 'Imported Debtor';
      const item = findVal(['item', 'description', 'part', 'particular', 'details']) || 'General Auto Parts';
      const date = findVal(['date', 'created']) || new Date().toISOString().split('T')[0];
      const qty = parseNumber(findVal(['qty', 'quantity']), 1);
      const price = parseNumber(findVal(['price', 'amount', 'total', 'cost']), 0);
      const paid = parseNumber(findVal(['paid', 'deposit', 'received']), 0);
      const notes = findVal(['notes', 'remark', 'comment']) || 'HTML File Import';

      const debtorData: Partial<DebtorRecord> = {
        customer,
        item,
        date,
        qty,
        price,
        paid,
        notes
      };

      // Unique signature for debtor
      const sig = `${customer.toLowerCase().trim()}|${item.toLowerCase().trim()}|${date}|${price}`;

      // Duplicate check against database + batch
      const existsInDb = existingDebtors.some(
        (d) =>
          d.customer.toLowerCase().trim() === customer.toLowerCase().trim() &&
          d.item.toLowerCase().trim() === item.toLowerCase().trim() &&
          d.date === date &&
          Math.abs(d.price - price) < 0.01
      );

      const isDuplicate = existsInDb || seenDebtorsInBatch.has(sig);
      seenDebtorsInBatch.add(sig);

      if (isDuplicate) duplicateCount++;
      else newCount++;

      parsedItems.push({
        type: 'debtor',
        rawRow: raw,
        data: debtorData,
        isDuplicate,
        duplicateOf: isDuplicate ? `${customer} - ${item}` : undefined,
        status: isDuplicate ? 'DUPLICATE' : 'NEW'
      });
    });

    return {
      detectedType: 'debtor',
      parsedItems,
      duplicateCount,
      newCount
    };
  }

  // Handle Products / Inventory Table
  rawObjects.forEach((raw) => {
    const keys = Object.keys(raw);
    const findVal = (terms: string[]) => {
      const matchedKey = keys.find((k) => terms.some((t) => k.toLowerCase().includes(t)));
      return matchedKey ? raw[matchedKey] : '';
    };

    const sheetRaw = findVal(['sheet', 'tab', 'module', 'type', 'department']);
    let sheet: 'Filters' | 'Brakes' | 'Accessories' | 'Oil & Fluids' = 'Filters';
    const sLower = sheetRaw.toLowerCase();
    if (sLower.includes('brake')) sheet = 'Brakes';
    else if (sLower.includes('access')) sheet = 'Accessories';
    else if (sLower.includes('oil') || sLower.includes('fluid') || sLower.includes('lube')) sheet = 'Oil & Fluids';
    else if (sLower.includes('filter')) sheet = 'Filters';

    const category = findVal(['category', 'brand', 'make', 'manufacturer']) || 'GENERAL';
    const code = findVal(['code', 'oem', 'part #', 'part no', 'sku', 'number']) || '';
    const desc = findVal(['desc', 'description', 'fitment', 'item', 'name']) || 'Imported Part';
    const position = findVal(['position', 'side', 'fit', 'loc']) || '';
    const cost = parseNumber(findVal(['cost', 'buying', 'purchase']), 0);
    const qty = parseNumber(findVal(['qty', 'quantity', 'stock', 'balance', 'in stock']), 10);
    const sell = parseNumber(findVal(['sell', 'retail', 'selling', 'price']), 0);
    const wholesalePrice = parseNumber(findVal(['wholesale', 'ws']), sell);
    const dealerPrice = parseNumber(findVal(['dealer', 'dlr']), sell);
    const reorder = parseNumber(findVal(['reorder', 'min', 'threshold']), 3);
    const location = findVal(['location', 'shelf', 'bin', 'rack']) || '';
    const barcode = findVal(['barcode', 'ean', 'upc']) || '';

    const productData: Partial<Product> = {
      sheet,
      category,
      code,
      desc,
      position,
      cost,
      qty,
      sell,
      wholesalePrice,
      dealerPrice,
      reorder,
      location,
      barcode
    };

    const codeNorm = code.trim().toLowerCase();
    const descNorm = desc.trim().toLowerCase();
    const barcodeNorm = barcode.trim().toLowerCase();

    // Check duplicate in existing database
    const dbMatch = existingProducts.find((p) => {
      const pCode = (p.code || '').trim().toLowerCase();
      const pDesc = (p.desc || '').trim().toLowerCase();
      const pBarcode = (p.barcode || '').trim().toLowerCase();

      if (codeNorm && pCode && codeNorm === pCode) return true;
      if (barcodeNorm && pBarcode && barcodeNorm === pBarcode) return true;
      if (descNorm && pDesc && descNorm === pDesc && p.sheet === sheet) return true;
      return false;
    });

    const batchKey = codeNorm ? `code:${codeNorm}` : `desc:${descNorm}|sheet:${sheet}`;
    const isDuplicate = !!dbMatch || seenCodesInBatch.has(batchKey);
    seenCodesInBatch.add(batchKey);

    if (isDuplicate) duplicateCount++;
    else newCount++;

    parsedItems.push({
      type: 'product',
      rawRow: raw,
      data: productData,
      isDuplicate,
      duplicateOf: dbMatch ? `${dbMatch.category} - ${dbMatch.code || dbMatch.desc}` : undefined,
      status: isDuplicate ? 'DUPLICATE' : 'NEW'
    });
  });

  return {
    detectedType: 'product',
    parsedItems,
    duplicateCount,
    newCount
  };
}
