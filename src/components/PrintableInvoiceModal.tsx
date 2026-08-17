import React from 'react';
import { X, Printer } from 'lucide-react';
import { Invoice } from '../types';
import { db } from '../services/db';
import { BrandLogo } from './BrandLogo';

interface PrintableInvoiceModalProps {
  invoiceId: string;
  onClose: () => void;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  invoiceId,
  onClose
}) => {
  const invoice = db.getInvoiceById(invoiceId);
  const settings = db.getSettings();

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-area fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none">
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="text-xs font-bold font-mono">Invoice Document — {invoice.invoiceNumber}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div id="invoice-print-area" className="p-8 space-y-8 bg-white text-slate-900 text-xs font-sans print:p-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <BrandLogo compact className="w-[310px] max-w-full -ml-2" />
              <p className="text-[11px] font-semibold text-blue-700">{settings.tagline}</p>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone} | Email: {settings.email}</p>
              <p className="text-[10px] text-slate-600 font-mono">GRA TIN NO: <strong className="text-slate-900">{settings.tinNumber}</strong></p>
            </div>

            <div className="text-right space-y-1">
              <h2 className="text-2xl font-black text-slate-900 uppercase font-mono tracking-wider">
                INVOICE
              </h2>
              <p className="text-sm font-bold text-blue-700 font-mono">{invoice.invoiceNumber}</p>
              <p className="text-[11px] text-slate-600">Date: <strong className="text-slate-800">{invoice.date}</strong></p>
              <p className="text-[11px] text-slate-600">Due Date: <strong className="text-slate-800">{invoice.dueDate}</strong></p>
            </div>
          </div>

          {/* Customer & Vehicle Information Box */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed To:</span>
              <h3 className="text-sm font-bold text-slate-900">{invoice.customerName}</h3>
              <p className="text-slate-600">Tel: {invoice.customerPhone}</p>
              <p className="text-slate-600">{invoice.customerAddress || 'Accra, Ghana'}</p>
            </div>

            <div className="space-y-1 border-l border-slate-200 pl-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Serviced:</span>
              <h3 className="text-sm font-black font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded inline-block">
                {invoice.vehicleRegistration}
              </h3>
              <p className="text-slate-800 font-semibold mt-1">{invoice.vehicleDetails}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item / Service Description</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Qty / Hrs</th>
                  <th className="p-3 text-right">Unit Price (GH₵)</th>
                  <th className="p-3 text-right">Total (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {/* Services */}
                {invoice.services.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{s.serviceName}</strong>
                      <span className="text-[10px] text-slate-500">{s.description || 'Workshop Labour Charge'}</span>
                    </td>
                    <td className="p-3 text-center"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">Labour</span></td>
                    <td className="p-3 text-center font-mono">{s.estimatedHours} hrs</td>
                    <td className="p-3 text-right font-mono">{s.labourRate.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">{s.total.toFixed(2)}</td>
                  </tr>
                ))}

                {/* Parts */}
                {invoice.parts.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-slate-400">{invoice.services.length + idx + 1}</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{p.partName}</strong>
                      <span className="text-[10px] font-mono text-slate-500">PN: {p.partNumber}</span>
                    </td>
                    <td className="p-3 text-center"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Spare Part</span></td>
                    <td className="p-3 text-center font-mono">{p.quantity}</td>
                    <td className="p-3 text-right font-mono">{p.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">{p.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold font-mono">GH₵ {invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="font-bold font-mono">- GH₵ {invoice.discount.toFixed(2)}</span>
                </div>
              )}
              {invoice.vatRate === 20 ? (
                <div className="space-y-1.5 text-[11px] text-slate-600 py-2 border-y border-slate-200 my-2 bg-white/50 px-2 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-slate-500">NHIL (2.5%):</span>
                    <span className="font-mono font-medium">GH₵ {(invoice.subtotal * 0.025).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GETFund (2.5%):</span>
                    <span className="font-mono font-medium">GH₵ {(invoice.subtotal * 0.025).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT (15.0%):</span>
                    <span className="font-mono font-medium">GH₵ {(invoice.subtotal * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 text-xs pt-1.5 border-t border-slate-200">
                    <span>Total VAT & Levies (20.0%):</span>
                    <span className="font-mono text-slate-900">GH₵ {invoice.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Levies ({invoice.vatRate}%):</span>
                  <span className="font-bold font-mono">GH₵ {invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-blue-700">GH₵ {invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Amount Paid:</span>
                <span className="font-mono">GH₵ {invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-black border-t border-slate-200 pt-1 text-sm">
                <span>Balance Due:</span>
                <span className="font-mono">GH₵ {invoice.balance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms & Footer Sign-off */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div className="space-y-1 text-[11px] text-slate-600">
              <p className="font-bold text-slate-800">Payment Terms & Banking:</p>
              <p>Accepted: Cash, Mobile Money (MTN MoMo / Telecel Cash), Bank Transfer, Visa/Mastercard.</p>
              <p>Mobile Money Merchant ID: <strong className="font-mono">EL-JINDI AUTO / 0244567890</strong></p>
              <p className="italic text-[10px] text-slate-500 pt-2">Thank you for servicing your vehicle with El-Jindi Auto Services!</p>
            </div>

            <div className="flex flex-col items-end justify-end space-y-8 text-center">
              <div className="w-48 border-b-2 border-slate-900 text-slate-400 font-mono text-[10px] pb-1">
                Authorized Signature & Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
