import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: () => void;
}

type ImportType = 'customers' | 'vehicles' | 'price-list' | 'inventory' | 'income-expenses';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportDone
}) => {
  const [importType, setImportType] = useState<ImportType>('customers');
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string>('');
  const [importReport, setImportReport] = useState<{ imported: number; skipped: number } | null>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);

  if (!isOpen) return null;

  const parseSheetRows = (sheetName: string) => {
    const workbook = workbookRef.current;
    if (!workbook || !sheetName) {
      setParsedRows([]);
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      setParsedRows([]);
      setParseError(`Worksheet "${sheetName}" could not be loaded.`);
      return;
    }

    const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      blankrows: false,
    });

    setParsedRows(jsonRows);
    setParseError(jsonRows.length === 0 ? `Worksheet "${sheetName}" has no data rows to import.` : '');
  };

  // Handle File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportReport(null);
    setParseError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const fileResult = evt.target?.result;
        if (!fileResult) {
          setParseError('The selected file could not be read. Please try another spreadsheet.');
          return;
        }

        const data = fileResult instanceof ArrayBuffer ? new Uint8Array(fileResult) : new Uint8Array(fileResult as any);
        const workbook = XLSX.read(data, { type: 'array', raw: false, cellDates: true });
        workbookRef.current = workbook;

        if (!workbook.SheetNames?.length) {
          setSheetNames([]);
          setSelectedSheet('');
          setParsedRows([]);
          setParseError('This spreadsheet does not contain any worksheets.');
          return;
        }

        setSheetNames(workbook.SheetNames);
        const firstSheet = workbook.SheetNames[0];
        setSelectedSheet(firstSheet);
        parseSheetRows(firstSheet);
      } catch (err) {
        setParseError('Error parsing Excel file. Please ensure it is a valid .xlsx or .xls spreadsheet.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Change active worksheet
  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    parseSheetRows(sheet);
  };

  // Execute Import Logic
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;

    let importedCount = 0;
    let skippedCount = 0;

    if (importType === 'customers') {
      const existing = db.getCustomers();
      parsedRows.forEach(row => {
        const name = row['Name'] || row['Customer Name'] || row['Customer'] || row['CONTACT'] || row['NAME'];
        const phone = row['Phone'] || row['Phone Number'] || row['TEL'] || row['TELEPHONE'] || row['MOBILE'];
        const email = row['Email'] || row['EMAIL'];
        const address = row['Address'] || row['LOCATION'] || row['ADDRESS'];

        if (name) {
          const isDup = existing.some(c => c.name.toLowerCase() === String(name).toLowerCase() || (phone && c.phone === String(phone)));
          if (isDup) {
            skippedCount++;
          } else {
            db.saveCustomer({
              name: String(name),
              phone: String(phone || '+233 24 000 0000'),
              email: email ? String(email) : undefined,
              address: address ? String(address) : undefined
            });
            importedCount++;
          }
        }
      });
    } else if (importType === 'price-list') {
      parsedRows.forEach(row => {
        const make = row['Make'] || row['VEHICLE MAKE'] || 'Universal';
        const model = row['Model'] || row['MODEL'] || 'All Models';
        const service = row['Service'] || row['Description'] || row['ITEM'] || row['SERVICE NAME'];
        const price = parseFloat(row['Price'] || row['PRICE'] || row['RATE'] || row['AMOUNT'] || '0');

        if (service && price > 0) {
          db.savePriceListItem({
            make: String(make),
            model: String(model),
            category: row['Category'] ? String(row['Category']) : 'General',
            serviceOrPart: String(service),
            price
          });
          importedCount++;
        }
      });
    } else if (importType === 'inventory') {
      parsedRows.forEach(row => {
        const name = row['Part Name'] || row['DESCRIPTION'] || row['ITEM'];
        const partNum = row['Part Number'] || row['PART NO'] || `PN-${Math.floor(Math.random()*10000)}`;
        const qty = parseInt(row['Quantity'] || row['QTY'] || row['STOCK'] || '0');
        const price = parseFloat(row['Price'] || row['SELLING PRICE'] || row['PRICE'] || '0');

        if (name) {
          db.saveInventoryPart({
            partName: String(name),
            partNumber: String(partNum),
            category: row['Category'] ? String(row['Category']) : 'General Spares',
            quantity: isNaN(qty) ? 10 : qty,
            minStock: 5,
            sellingPrice: isNaN(price) ? 100 : price
          });
          importedCount++;
        }
      });
    } else if (importType === 'income-expenses') {
      parsedRows.forEach(row => {
        const desc = row['Description'] || row['DETAILS'] || row['INCOME/EXPENSE'];
        const amount = parseFloat(row['Amount'] || row['AMOUNT'] || row['TOTAL'] || '0');
        const cat = row['Category'] || 'Other';

        if (desc && amount > 0) {
          db.saveExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Other',
            description: String(desc),
            amount,
            paymentMethod: 'Cash'
          });
          importedCount++;
        }
      });
    }

    setImportReport({ imported: importedCount, skipped: skippedCount });
    db.logAudit('Excel Import Executed', 'System', undefined, `Imported ${importedCount} records from Excel file (${fileName})`);
    onImportDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">El-Jindi Excel Data Migration Tool</h2>
              <p className="text-xs text-slate-300">
                Import legacy Excel files (CONTACT OF CUSTOMERS.xlsx, Price List.xlsx, Income.xlsx, etc.)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Step 1: Select Entity Target */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
              1. Select Data Category to Import
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'customers', label: 'Customers' },
                { id: 'price-list', label: 'Price List' },
                { id: 'inventory', label: 'Spare Parts' },
                { id: 'income-expenses', label: 'Expenses' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setImportType(t.id as any)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    importType === t.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Choose Excel File */}
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center hover:border-emerald-500 transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                {fileName ? fileName : 'Click to Upload Spreadsheet (.xlsx / .xls)'}
              </span>
              <span className="text-[11px] text-slate-500">
                Supports CONTACT OF CUSTOMERS.xlsx, Price List.xlsx, Income.xlsx
              </span>
            </label>
          </div>

          {/* Sheet Selector */}
          {sheetNames.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Worksheet</label>
              <select
                value={selectedSheet}
                onChange={e => handleSheetChange(e.target.value)}
                className="px-3 py-1.5 border rounded-xl text-xs font-bold"
              >
                {sheetNames.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {parseError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Data Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Preview Data ({parsedRows.length} rows parsed)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  Ready to Validate & Import
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48 scrollbar-thin">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                    <tr>
                      {Object.keys(parsedRows[0] || {}).map(col => (
                        <th key={col} className="p-2 border-b whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val: any, cidx) => (
                          <td key={cidx} className="p-2 whitespace-nowrap text-slate-600">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Summary Report */}
          {importReport && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <h4 className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Import Execution Complete!
              </h4>
              <p>Successfully imported: <strong>{importReport.imported}</strong> new records into database.</p>
              <p>Skipped duplicates: <strong>{importReport.skipped}</strong> existing records.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Process & Import Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
