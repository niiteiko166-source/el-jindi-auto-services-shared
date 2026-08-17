import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  parseHTMLTableToObjects,
  processImportDataWithDuplicateCheck,
  ParsedImportItem
} from '../../utils/htmlImportParser';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertCircle,
  Code,
  FileCode,
  Copy,
  Layers,
  Sparkles,
  ShieldCheck,
  Filter,
  Trash2,
  Sliders,
  CheckSquare
} from 'lucide-react';

export const ImportExportModule: React.FC = () => {
  const { products, debtors, bulkImportProducts, bulkImportDebtors, showToast } = useApp();

  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [htmlPasteText, setHtmlPasteText] = useState('');

  // Preview state
  const [parsedData, setParsedData] = useState<{
    detectedType: 'product' | 'debtor';
    items: ParsedImportItem[];
    duplicateCount: number;
    newCount: number;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Download Sample HTML File
  const handleDownloadSampleHTML = () => {
    const htmlSample = `<!DOCTYPE html>
<html>
<head>
  <title>El-Jindi Auto Services - Inventory Import Sample</title>
  <style>
    table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #2563eb; color: white; }
  </style>
</head>
<body>
  <h2>El-Jindi Auto Parts Stock Inventory Data</h2>
  <table>
    <thead>
      <tr>
        <th>Sheet</th>
        <th>Category</th>
        <th>OEM Code</th>
        <th>Description</th>
        <th>Position</th>
        <th>Cost (GHS)</th>
        <th>Qty</th>
        <th>Sell Price</th>
        <th>Wholesale Price</th>
        <th>Dealer Price</th>
        <th>Reorder</th>
        <th>Location</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Filters</td>
        <td>TOYOTA - OIL FILTER</td>
        <td>04152-31090-HTML</td>
        <td>TOYOTA CAMRY 07-21, HIGHLANDER 08-21 OIL FILTER</td>
        <td>FRONT</td>
        <td>25.00</td>
        <td>150</td>
        <td>95.00</td>
        <td>85.00</td>
        <td>75.00</td>
        <td>5</td>
        <td>SHELF A-01</td>
      </tr>
      <tr>
        <td>Filters</td>
        <td>HONDA - AIR FILTER</td>
        <td>17220-5AA-A00</td>
        <td>HONDA CIVIC 16-21 AIR FILTER GENUINE</td>
        <td>FRONT</td>
        <td>45.00</td>
        <td>80</td>
        <td>140.00</td>
        <td>120.00</td>
        <td>110.00</td>
        <td>4</td>
        <td>SHELF B-03</td>
      </tr>
      <tr>
        <td>Brakes</td>
        <td>SAMIR BRAKES</td>
        <td>AB2036-HTML</td>
        <td>HONDA ACCORD FRONT BRAKE PADS SET</td>
        <td>FRONT</td>
        <td>180.00</td>
        <td>40</td>
        <td>450.00</td>
        <td>400.00</td>
        <td>380.00</td>
        <td>3</td>
        <td>SHELF C-10</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlSample], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'EL-JINDI_Sample_Inventory_Data.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample HTML inventory template', 'info');
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = `sheet,category,code,desc,position,cost,qty,sell,wholesalePrice,dealerPrice,reorder,location\nFilters,TOYOTA,04152-31090,TOYOTA CAMRY 07-21 OIL FILTER,FRONT,25.00,100,50.00,45.00,40.00,10,SHELF A-01\nBrakes,SAMIR,04465-0K130,TOYOTA HILUX FRONT BRAKE PADS,FRONT,120.00,50,220.00,200.00,180.00,5,SHELF B-12`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'EL-JINDI_Inventory_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFullCSV = () => {
    let csv = 'sheet,category,code,desc,position,cost,qty,sold,ret,sell,wholesalePrice,dealerPrice,reorder,location,barcode\n';
    (products || []).forEach((p) => {
      csv += `"${p.sheet}","${p.category || ''}","${p.code || ''}","${(p.desc || '').replace(/"/g, '""')}","${p.position || ''}",${p.cost},${p.qty},${p.sold},${p.ret},${p.sell},${p.wholesalePrice || 0},${p.dealerPrice || 0},${p.reorder || 3},"${p.location || ''}","${p.barcode || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EL-JINDI_Inventory_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse HTML / File string content
  const processRawString = (text: string) => {
    setImportResult(null);
    if (!text.trim()) {
      showToast('No HTML or text content provided', 'error');
      return;
    }

    try {
      const rawObjects = parseHTMLTableToObjects(text);
      if (rawObjects.length === 0) {
        showToast('Could not find HTML table or CSV rows in the provided content', 'error');
        return;
      }

      const analyzed = processImportDataWithDuplicateCheck(rawObjects, products || [], debtors || []);
      setParsedData({
        detectedType: analyzed.detectedType,
        items: analyzed.parsedItems,
        duplicateCount: analyzed.duplicateCount,
        newCount: analyzed.newCount
      });

      showToast(`Parsed ${analyzed.parsedItems.length} records (${analyzed.duplicateCount} duplicates detected)`, 'info');
    } catch (err) {
      console.error('Failed to parse file:', err);
      showToast('Error parsing HTML / File format', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processRawString(text);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processRawString(htmlPasteText);
  };

  // Remove individual row from parsed preview
  const handleRemovePreviewRow = (index: number) => {
    if (!parsedData) return;
    const updated = [...parsedData.items];
    const removed = updated.splice(index, 1)[0];
    
    let dups = parsedData.duplicateCount;
    let news = parsedData.newCount;
    if (removed.isDuplicate) dups--;
    else news--;

    setParsedData({
      ...parsedData,
      items: updated,
      duplicateCount: Math.max(0, dups),
      newCount: Math.max(0, news)
    });
  };

  // Execute Final Import to Database
  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.items.length === 0) return;

    setIsProcessing(true);
    try {
      if (parsedData.detectedType === 'product') {
        const payloadProducts = parsedData.items.map((i) => i.data);
        const res = await bulkImportProducts(payloadProducts, duplicateStrategy);

        const summaryMsg = `Successfully processed HTML import: ${res.countAdded} new parts added, ${res.countUpdated} existing parts updated, ${res.countSkipped} duplicates skipped.`;
        setImportResult(summaryMsg);
        showToast(`HTML Import Complete! (${res.countAdded} added, ${res.countUpdated} updated)`, 'success');
      } else {
        const payloadDebtors = parsedData.items.map((i) => i.data);
        const res = await bulkImportDebtors(payloadDebtors, duplicateStrategy);

        const summaryMsg = `Successfully imported debtors: ${res.countAdded} new records added, ${res.countSkipped} duplicates skipped.`;
        setImportResult(summaryMsg);
        showToast(`Debtors Import Complete! (${res.countAdded} added)`, 'success');
      }

      setParsedData(null);
      setHtmlPasteText('');
    } catch (err) {
      console.error('Bulk import execution failed:', err);
      showToast('Error saving imported data to database', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            HTML File Import, Web Table Parser & Duplicate Protection
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directly upload `.html` files, paste HTML `&lt;table&gt;` web data, or import CSV spreadsheets with automated deduplication.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadSampleHTML}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
            title="Download sample HTML file to inspect table structure"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Download Sample HTML</span>
          </button>
          <button
            onClick={handleDownloadSampleCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV Template</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Importer vs Exporter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Importer Section (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Import Data from HTML / Web Tables / CSV
              </h3>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold border border-slate-200">
              <button
                onClick={() => setImportMode('file')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  importMode === 'file' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Upload HTML / CSV File</span>
              </button>
              <button
                onClick={() => setImportMode('paste')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  importMode === 'paste' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Paste Raw HTML Table</span>
              </button>
            </div>
          </div>

          {/* File Upload Mode */}
          {importMode === 'file' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Select any <span className="font-bold text-slate-900">.html</span>, <span className="font-bold text-slate-900">.htm</span>, or <span className="font-bold text-slate-900">.csv</span> file containing stock inventory or debtor tables.
              </p>
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 rounded-xl text-center space-y-2 hover:border-blue-400 transition-colors">
                <FileCode className="w-8 h-8 mx-auto text-blue-600" />
                <div>
                  <p className="font-extrabold text-blue-900 text-sm">Upload .HTML / .HTM / .CSV File</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Drag & drop or browse your local computer</p>
                </div>
                <input
                  type="file"
                  accept=".html,.htm,.xhtml,.csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full max-w-sm mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Direct Paste Mode */}
          {importMode === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Paste HTML source code or web page table content (e.g. <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-700">&lt;table&gt;&lt;tr&gt;...&lt;/table&gt;</span>).
              </p>
              <textarea
                value={htmlPasteText}
                onChange={(e) => setHtmlPasteText(e.target.value)}
                placeholder="Paste HTML table markup or raw text content here..."
                rows={6}
                className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!htmlPasteText.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse & Detect Duplicates</span>
              </button>
            </form>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importResult}</span>
            </div>
          )}
        </div>

        {/* Database Stats & Quick Export (1 Column) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <Download className="w-5 h-5 text-emerald-600" />
            <span>Export Complete Inventory Backup</span>
          </div>

          <p className="text-slate-600">
            Export all active stock records, multi-tier prices, location bins, and barcodes to a clean CSV file for auditing or offline backup.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono">
            <div className="font-bold text-slate-800 font-sans text-xs">Active Database Summary:</div>
            <div className="text-slate-600 flex justify-between">
              <span>Total Recorded Parts:</span>
              <span className="font-bold text-slate-900">{(products || []).length}</span>
            </div>
            <div className="text-slate-600 flex justify-between">
              <span>Active Debtors:</span>
              <span className="font-bold text-slate-900">{(debtors || []).length}</span>
            </div>
          </div>

          <button
            onClick={handleExportFullCSV}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center space-x-2"
          >
            <Database className="w-4 h-4" />
            <span>Export Full Database (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Interactive Parsed Data Preview Modal / Section */}
      {parsedData && (
        <div className="bg-white rounded-xl border-2 border-blue-600 shadow-lg p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Parsed Data Preview & Duplicate Protection Verification
                </h3>
                <span className="bg-blue-100 text-blue-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  {parsedData.detectedType.toUpperCase()} RECOGNIZED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review extracted records before committing them to the system database. Duplicate protection is active.
              </p>
            </div>

            {/* Duplicate Handling Strategy Control */}
            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 text-[11px] px-1 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                On Duplicate Found:
              </span>
              <button
                type="button"
                onClick={() => setDuplicateStrategy('skip')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  duplicateStrategy === 'skip'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Skip Duplicates (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setDuplicateStrategy('update')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  duplicateStrategy === 'update'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Update Existing Records
              </button>
            </div>
          </div>

          {/* Stat Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total HTML Rows</span>
              <span className="font-black text-slate-900 text-sm">{parsedData.items.length} Records</span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">New Unique Items</span>
              <span className="font-black text-emerald-800 text-sm">{parsedData.newCount} To Insert</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Duplicates Detected</span>
              <span className="font-black text-amber-800 text-sm">{parsedData.duplicateCount} Duplicates</span>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
              <span className="text-[10px] text-blue-700 uppercase font-bold block">Action Plan</span>
              <span className="font-bold text-blue-900 text-xs">
                {duplicateStrategy === 'skip'
                  ? `Insert ${parsedData.newCount} new, skip ${parsedData.duplicateCount}`
                  : `Insert ${parsedData.newCount} new, update ${parsedData.duplicateCount}`}
              </span>
            </div>
          </div>

          {/* Preview Table */}
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Duplicate Status</th>
                  <th className="p-2.5">Category / Brand</th>
                  <th className="p-2.5">OEM / Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Cost</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Sell Price</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {parsedData.items.map((item, idx) => {
                  const d: any = item.data;
                  return (
                    <tr
                      key={idx}
                      className={item.isDuplicate ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'bg-white hover:bg-slate-50'}
                    >
                      <td className="p-2.5">
                        {item.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            {duplicateStrategy === 'skip' ? 'DUPLICATE (Will Skip)' : 'DUPLICATE (Will Update)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            NEW ITEM
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{d.category || d.customer || 'GENERAL'}</td>
                      <td className="p-2.5 text-blue-700 font-bold">{d.code || d.date || 'N/A'}</td>
                      <td className="p-2.5 text-slate-900 max-w-xs truncate font-sans font-medium">{d.desc || d.item}</td>
                      <td className="p-2.5 text-slate-600">GH₵{d.cost !== undefined ? d.cost : d.price}</td>
                      <td className="p-2.5 font-bold text-slate-800">{d.qty}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">GH₵{d.sell !== undefined ? d.sell : d.price}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemovePreviewRow(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded"
                          title="Remove from import batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setParsedData(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
            >
              Cancel Import
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition-colors shadow-md flex items-center space-x-2"
            >
              <CheckSquare className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Importing Data...'
                  : `Confirm & Import ${parsedData.items.length} Records (${duplicateStrategy === 'skip' ? 'Skip Duplicates' : 'Update Duplicates'})`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
