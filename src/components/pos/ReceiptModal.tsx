import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { SaleInvoice } from '../../types';
import { useApp } from '../../context/AppContext';
import { Printer, Share2, FileText, Receipt, CheckCircle, ShieldCheck, Building2 } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleInvoice | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale }) => {
  const { settings } = useApp();
  const [paperSize, setPaperSize] = useState<'A4' | 'THERMAL'>('A4');

  if (!sale) return null;

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct window.print failed, attempting popup print:', err);
      handlePopoutPrint();
    }
  };

  const handlePopoutPrint = () => {
    const isA4 = paperSize === 'A4';
    const printWin = window.open('', '_blank', 'width=850,height=950');

    if (!printWin) {
      alert('Pop-up window blocked! Please allow pop-ups for this site or press Ctrl+P / Cmd+P to print.');
      return;
    }

    const itemsRows = (sale.items || []).map((it, idx) => {
      if (isA4) {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
            <td style="padding: 10px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #1d4ed8;">${it.code}</td>
            <td style="padding: 10px; font-weight: bold; color: #0f172a;">${it.desc}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; font-family: monospace;">${it.qty}</td>
            <td style="padding: 10px; text-align: right; font-family: monospace; color: #334155;">${settings.currencySymbol} ${it.unitPrice.toFixed(2)}</td>
            <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${settings.currencySymbol} ${it.lineTotal.toFixed(2)}</td>
          </tr>
        `;
      } else {
        return `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
            <div style="flex: 1; padding-right: 8px;">
              <div style="font-weight: bold; color: #000;">${it.desc}</div>
              <div style="font-size: 10px; color: #555;">${it.code} &bull; ${it.qty} x ${settings.currencySymbol} ${it.unitPrice.toFixed(2)}</div>
            </div>
            <div style="font-weight: bold; font-family: monospace;">${settings.currencySymbol} ${it.lineTotal.toFixed(2)}</div>
          </div>
        `;
      }
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${sale.invoiceNo} - ${settings.companyName}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isA4 ? 'A4 portrait' : '80mm auto'};
              margin: ${isA4 ? '10mm' : '3mm'};
            }
            * { box-sizing: border-box; }
            body {
              font-family: ${isA4 ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'monospace, sans-serif'};
              margin: 0;
              padding: ${isA4 ? '20px' : '10px'};
              color: #0f172a;
              background: #ffffff;
              font-size: ${isA4 ? '13px' : '12px'};
            }
            .no-print-bar {
              position: sticky;
              top: 0;
              background: #1e293b;
              color: white;
              padding: 12px 20px;
              margin: -20px -20px 20px -20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              z-index: 9999;
            }
            .no-print-btn {
              background: #2563eb;
              color: white;
              border: none;
              padding: 8px 18px;
              font-weight: bold;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            }
            .no-print-btn:hover { background: #1d4ed8; }
            @media print {
              .no-print-bar { display: none !important; }
              body { padding: 0 !important; margin: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <span style="font-weight: bold; font-size: 13px;">📄 ${settings.companyName} - Invoice #${sale.invoiceNo}</span>
            <div>
              <button class="no-print-btn" onclick="window.print()">🖨️ Click to Print Now</button>
              <button class="no-print-btn" style="background: #475569; margin-left: 8px;" onclick="window.close()">Close Window</button>
            </div>
          </div>
          ${
            isA4
              ? `
            <div style="max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 32px; border-radius: 12px; background: #fff;">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
                <div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${settings.companyName}</h1>
                  <p style="margin: 4px 0; font-weight: bold; color: #475569; font-size: 13px;">${settings.tagline || ''}</p>
                  <p style="margin: 2px 0; color: #64748b; font-size: 12px;">${settings.address || ''}</p>
                  <p style="margin: 2px 0; color: #64748b; font-size: 12px;">Phone: ${settings.phone || ''}</p>
                  ${settings.tinNumber ? `<p style="margin: 2px 0; color: #64748b; font-size: 12px;">TIN / TAX ID: ${settings.tinNumber}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-block; background: #0f172a; color: white; padding: 6px 14px; font-weight: 900; border-radius: 6px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
                    Commercial Tax Invoice
                  </div>
                  <div style="margin-top: 10px;">
                    <p style="margin: 0; font-family: monospace; font-size: 16px; font-weight: 900; color: #1d4ed8;">#${sale.invoiceNo}</p>
                    <p style="margin: 4px 0 0 0; color: #64748b;">Date: <strong>${sale.date}</strong></p>
                    <p style="margin: 2px 0 0 0; color: #64748b;">Time: <strong>${sale.time}</strong></p>
                  </div>
                </div>
              </div>

              <!-- Customer Meta -->
              <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <div>
                  <div style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Billed To / Customer</div>
                  <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px;">${sale.customerName || 'Walk-In Customer'}</div>
                  <div style="font-size: 12px; color: #475569; margin-top: 4px;">Served By (Sales Rep): <strong>${sale.cashier || 'Sales Rep'}</strong></div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Payment Details</div>
                  <div style="margin-top: 4px;">
                    <span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px;">${sale.paymentMethod}</span>
                    <span style="background: ${sale.balanceDue <= 0 ? '#dcfce7' : '#fee2e2'}; color: ${sale.balanceDue <= 0 ? '#166534' : '#991b1b'}; padding: 4px 8px; border-radius: 4px; font-weight: 900; font-size: 11px; margin-left: 6px;">
                      ${sale.balanceDue <= 0 ? 'PAID IN FULL' : 'PARTIAL / CREDIT'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Items Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #0f172a; color: white; text-transform: uppercase; font-size: 10px; font-weight: 900;">
                    <th style="padding: 10px; text-align: center; width: 40px;">S/N</th>
                    <th style="padding: 10px; text-align: left;">Part Code</th>
                    <th style="padding: 10px; text-align: left;">Item Description</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Unit Price</th>
                    <th style="padding: 10px; text-align: right;">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <!-- Summary Totals -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                <div style="flex: 1; max-width: 320px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 11px; color: #475569;">
                  <strong style="color: #0f172a; text-transform: uppercase;">Terms & Policy:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 16px;">
                    <li>Goods sold are non-refundable.</li>
                    <li>Electrical parts carry manufacturer defect warranty only.</li>
                    <li>Keep this invoice for warranty & service claims.</li>
                  </ul>
                </div>

                <div style="width: 280px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                    <span>Subtotal:</span>
                    <span style="font-family: monospace; font-weight: bold;">${settings.currencySymbol} ${sale.subtotal.toFixed(2)}</span>
                  </div>
                  ${
                    sale.discountTotal > 0
                      ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a; font-weight: bold;">
                      <span>Discount:</span>
                      <span style="font-family: monospace;">-${settings.currencySymbol} ${sale.discountTotal.toFixed(2)}</span>
                    </div>`
                      : ''
                  }
                  ${
                    sale.taxAmount > 0
                      ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                      <span>VAT (${settings.vatRate}%):</span>
                      <span style="font-family: monospace;">${settings.currencySymbol} ${sale.taxAmount.toFixed(2)}</span>
                    </div>`
                      : ''
                  }
                  <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px;">
                    <span>GRAND TOTAL:</span>
                    <span style="font-family: monospace; color: #1d4ed8;">${settings.currencySymbol} ${sale.grandTotal.toFixed(2)}</span>
                  </div>
                  <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; color: #334155;">
                      <span>Amount Paid:</span>
                      <span style="font-family: monospace; font-weight: bold;">${settings.currencySymbol} ${sale.amountPaid.toFixed(2)}</span>
                    </div>
                    ${
                      sale.balanceDue > 0
                        ? `
                      <div style="display: flex; justify-content: space-between; color: #dc2626; font-weight: 900; margin-top: 4px;">
                        <span>Balance Due:</span>
                        <span style="font-family: monospace;">${settings.currencySymbol} ${sale.balanceDue.toFixed(2)}</span>
                      </div>`
                        : ''
                    }
                  </div>
                </div>
              </div>

              <!-- Signatures -->
              <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 11px; color: #64748b;">
                <div style="width: 40%;">
                  <div style="border-bottom: 1px solid #94a3b8; height: 30px; margin-bottom: 6px;"></div>
                  <div>Issued By: <strong>${sale.cashier || 'Sales Rep'}</strong></div>
                </div>
                <div style="width: 40%;">
                  <div style="border-bottom: 1px solid #94a3b8; height: 30px; margin-bottom: 6px;"></div>
                  <div>Customer Signature</div>
                </div>
              </div>

              <div style="text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; color: #64748b;">
                ${settings.receiptFooter || 'Thank you for your business!'}
              </div>
            </div>
          `
              : `
            <div style="max-width: 300px; margin: 0 auto; font-family: monospace; text-align: center;">
              <h2 style="margin: 0; font-size: 16px;">${settings.companyName}</h2>
              <p style="margin: 2px 0; font-size: 11px;">${settings.tagline || ''}</p>
              <p style="margin: 2px 0; font-size: 11px;">${settings.address || ''}</p>
              <p style="margin: 2px 0; font-size: 11px;">Tel: ${settings.phone || ''}</p>
              <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span>INV: #${sale.invoiceNo}</span>
                <span>${sale.date} ${sale.time}</span>
              </div>
              <div style="text-align: left; font-size: 11px; margin-top: 4px;">Cust: ${sale.customerName}</div>
              <div style="text-align: left; font-size: 11px;">Rep: ${sale.cashier || 'Sales Rep'}</div>
              <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
              ${itemsRows}
              <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>Subtotal:</span>
                <span>${settings.currencySymbol} ${sale.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px;">
                <span>TOTAL:</span>
                <span>${settings.currencySymbol} ${sale.grandTotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                <span>Paid (${sale.paymentMethod}):</span>
                <span>${settings.currencySymbol} ${sale.amountPaid.toFixed(2)}</span>
              </div>
              ${
                sale.balanceDue > 0
                  ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: red; font-weight: bold; margin-top: 2px;">
                  <span>Balance Due:</span>
                  <span>${settings.currencySymbol} ${sale.balanceDue.toFixed(2)}</span>
                </div>`
                  : ''
              }
              <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
              <p style="font-size: 10px; margin-top: 8px;">${settings.receiptFooter || 'Thank you!'}</p>
            </div>
          `
          }
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleWhatsApp = () => {
    const text = `*${settings.companyName}*\nOfficial Invoice #${sale.invoiceNo}\nDate: ${sale.date}\nCustomer: ${sale.customerName}\nGrand Total: ${settings.currencySymbol} ${sale.grandTotal.toFixed(2)}\nAmount Paid: ${settings.currencySymbol} ${sale.amountPaid.toFixed(2)}\nBalance Due: ${settings.currencySymbol} ${sale.balanceDue.toFixed(2)}\nThank you for your business!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Invoice #${sale.invoiceNo}`}
      subtitle={`Completed on ${sale.date} at ${sale.time} · Cashier: ${sale.cashier}`}
      maxWidth={paperSize === 'A4' ? '2xl' : 'md'}
    >
      <div className="space-y-4 text-xs">
        {/* Paper Size Selector Controls */}
        <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-200 no-print">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <span className="text-slate-500">Print Format:</span>
            <button
              type="button"
              onClick={() => setPaperSize('A4')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
                paperSize === 'A4'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 A4 Full Sheet Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('THERMAL')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
                paperSize === 'THERMAL'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>🧾 80mm Thermal Receipt</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
            {paperSize === 'A4' ? 'Optimized for A4 paper printers' : 'Optimized for thermal POS printers'}
          </span>
        </div>

        {/* -------------------------------------------------------------------------- */}
        {/* A4 STANDARD SHEET PRINTABLE INVOICE TEMPLATE                               */}
        {/* -------------------------------------------------------------------------- */}
        {paperSize === 'A4' && (
          <div
            id="printable-a4-invoice"
            className="invoice-container bg-white border border-slate-300 p-6 sm:p-8 rounded-xl text-slate-900 shadow-sm space-y-6 font-sans"
          >
            {/* Header: Company Info + Invoice Title */}
            <div className="flex flex-wrap items-start justify-between border-b-2 border-slate-800 pb-5 gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-900 text-white rounded-lg">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      {settings.companyName}
                    </h1>
                    <p className="text-xs font-bold text-slate-600">{settings.tagline}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-2">
                  <p><span className="font-semibold">Address:</span> {settings.address}</p>
                  <p><span className="font-semibold">Phone:</span> {settings.phone}</p>
                  {settings.tinNumber && (
                    <p><span className="font-semibold">TIN / TAX ID:</span> {settings.tinNumber}</p>
                  )}
                </div>
              </div>

              <div className="text-right space-y-2">
                <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest">
                  Commercial Tax Invoice
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-mono text-sm font-black text-blue-700">#{sale.invoiceNo}</p>
                  <p className="text-slate-500 font-medium">Date: <span className="font-bold text-slate-800">{sale.date}</span></p>
                  <p className="text-slate-500 font-medium">Time: <span className="font-bold text-slate-800">{sale.time}</span></p>
                </div>
              </div>
            </div>

            {/* Customer & Transaction Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Billed To / Customer Details
                </h3>
                <p className="text-sm font-black text-slate-900">{sale.customerName || 'Walk-In Customer'}</p>
                <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                  <p><span className="font-semibold">Account Status:</span> Cash / Immediate Payment</p>
                  <p><span className="font-semibold">Served By (Sales Rep):</span> {sale.cashier || 'Sales Rep'}</p>
                </div>
              </div>

              <div className="sm:text-right flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Payment Method & Status
                  </h3>
                  <div className="flex items-center sm:justify-end space-x-2">
                    <span className="font-bold text-slate-900 uppercase bg-slate-200 px-2.5 py-0.5 rounded text-xs">
                      {sale.paymentMethod}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-black uppercase ${
                        sale.balanceDue <= 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {sale.balanceDue <= 0 ? 'PAID IN FULL' : 'PARTIAL / CREDIT'}
                    </span>
                  </div>
                </div>
                {sale.paymentReference && (
                  <p className="text-[11px] font-mono text-slate-600 mt-2">
                    Ref #: {sale.paymentReference}
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Invoice Table */}
            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <th className="p-2.5 text-center w-10">S/N</th>
                    <th className="p-2.5">Item / Part Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(sale.items || []).map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-700">{item.code}</td>
                      <td className="p-2.5 font-bold text-slate-900">{item.desc}</td>
                      <td className="p-2.5 text-center font-bold font-mono">{item.qty}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Summary & Calculation Box */}
            <div className="flex flex-wrap items-start justify-between gap-6 pt-2">
              {/* Payment & Terms Note */}
              <div className="flex-1 min-w-[240px] space-y-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terms & Conditions:</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Goods sold are non-refundable.</li>
                    <li>Electrical or modified auto parts carry manufacturer defect warranty only.</li>
                    <li>Please retain this A4 invoice as proof of purchase for warranty claims.</li>
                  </ul>
                </div>
              </div>

              {/* Total Financial Summary */}
              <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono font-bold">{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Allowed:</span>
                    <span className="font-mono">-{formatCurrency(sale.discountTotal)}</span>
                  </div>
                )}
                {sale.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>VAT / Tax ({settings.vatRate}%):</span>
                    <span className="font-mono">{formatCurrency(sale.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-800 pt-2 my-1">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-blue-800">{formatCurrency(sale.grandTotal)}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-700">
                    <span>Amount Paid ({sale.paymentMethod}):</span>
                    <span className="font-mono font-bold">{formatCurrency(sale.amountPaid)}</span>
                  </div>
                  {sale.changeGiven > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Change Refunded:</span>
                      <span className="font-mono">{formatCurrency(sale.changeGiven)}</span>
                    </div>
                  )}
                  {sale.balanceDue > 0 && (
                    <div className="flex justify-between text-red-600 font-black border-t border-red-200 pt-1">
                      <span>Balance Due (Outstanding):</span>
                      <span className="font-mono">{formatCurrency(sale.balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Official Signature Lines */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 font-semibold">
              <div>
                <div className="border-b border-slate-400 mb-1 h-8 w-3/4 mx-auto"></div>
                <p>Issued By: <span className="font-bold text-slate-800">{sale.cashier || 'Sales Rep'}</span></p>
                <p className="text-[9px] text-slate-400">(Authorized Signature & Stamp)</p>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 h-8 w-3/4 mx-auto"></div>
                <p>Received By: <span className="font-bold text-slate-800">{sale.customerName || 'Customer'}</span></p>
                <p className="text-[9px] text-slate-400">(Customer Signature & Date)</p>
              </div>
            </div>

            {/* Footer Tagline */}
            <div className="text-center text-[10px] text-slate-500 font-bold border-t border-slate-200 pt-3">
              {settings.receiptFooter || 'Thank you for your business!'}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------- */}
        {/* THERMAL RECEIPT 80MM TEMPLATE                                              */}
        {/* -------------------------------------------------------------------------- */}
        {paperSize === 'THERMAL' && (
          <div id="printable-receipt" className="bg-white border border-slate-300 p-5 rounded-lg font-mono shadow-xs space-y-3 mx-auto max-w-sm">
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight font-sans">
                {settings.companyName}
              </h2>
              <p className="text-[10px] text-slate-600 font-sans mt-0.5">{settings.tagline}</p>
              <p className="text-[10px] text-slate-500 font-sans">{settings.address}</p>
              <p className="text-[10px] text-slate-500 font-sans">{settings.phone}</p>
              {settings.tinNumber && (
                <p className="text-[10px] text-slate-500 font-sans">TIN: {settings.tinNumber}</p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="flex justify-between text-[11px] text-slate-700 font-sans">
              <div>
                <span className="font-bold">INV:</span> #{sale.invoiceNo}
              </div>
              <div>{sale.date} {sale.time}</div>
            </div>
            <div className="text-[11px] text-slate-700 font-sans">
              <span className="font-bold">Customer:</span> {sale.customerName}
            </div>

            {/* Items Table */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5 font-sans">
              {(sale.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <div className="font-bold text-slate-900">{it.desc}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {it.code} · {it.qty} x {formatCurrency(it.unitPrice)}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right">
                    {formatCurrency(it.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Breakdown */}
            <div className="space-y-1 font-sans text-xs pt-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(sale.discountTotal)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT ({settings.vatRate}%):</span>
                  <span className="font-mono">{formatCurrency(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">{formatCurrency(sale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>Paid ({sale.paymentMethod}):</span>
                <span className="font-mono font-bold">{formatCurrency(sale.amountPaid)}</span>
              </div>
              {sale.balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold border-t border-dashed border-red-200 pt-1">
                  <span>Balance Due (AR):</span>
                  <span className="font-mono">{formatCurrency(sale.balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer Note */}
            <div className="text-center text-[10px] text-slate-500 font-sans pt-3 border-t border-dashed border-slate-300">
              {settings.receiptFooter}
            </div>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="flex justify-between items-center pt-2 no-print border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold no-print text-xs"
          >
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={handleWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors no-print shadow-xs text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePopoutPrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all no-print shadow-xs text-xs"
              title="Open in new window to bypass iframe or browser print blocks"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Open Print Window</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold shadow-md transition-all no-print active:scale-95 text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperSize === 'A4' ? 'A4 Sheet' : 'Receipt'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

