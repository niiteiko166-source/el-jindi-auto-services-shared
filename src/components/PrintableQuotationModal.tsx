import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Quotation } from '../types';
import { db } from '../services/db';
import { BrandLogo } from './BrandLogo';

interface PrintableQuotationModalProps {
  quotationId: string;
  onClose: () => void;
}

export const PrintableQuotationModal: React.FC<PrintableQuotationModalProps> = ({ quotationId, onClose }) => {
  const quotation = db.getQuotationById(quotationId);
  const settings = db.getSettings();

  if (!quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const formatReceiptText = () => {
    const lines: string[] = [];
    lines.push(settings.companyName);
    lines.push(settings.tagline || '');
    lines.push(settings.address);
    lines.push(`Tel: ${settings.phone} | Email: ${settings.email}`);
    lines.push('');
    lines.push(`QUOTATION ${quotation.quotationNumber}`);
    lines.push(`Date: ${quotation.date}`);
    lines.push(`Valid Until: ${quotation.validityDate}`);
    lines.push('');
    lines.push(`Customer: ${quotation.customerName}`);
    lines.push(`Vehicle: ${quotation.vehicleDetails}`);
    lines.push(`Job: ${quotation.jobId || 'N/A'}`);
    lines.push('');
    if (quotation.services.length) {
      lines.push('Services:');
      quotation.services.forEach((service, index) => {
        lines.push(
          `${index + 1}. ${service.serviceName} • ${service.estimatedHours} hrs @ GH₵ ${service.labourRate.toFixed(2)} = GH₵ ${service.total.toFixed(2)}`
        );
      });
      lines.push('');
    }
    if (quotation.parts.length) {
      lines.push('Parts:');
      quotation.parts.forEach((part, index) => {
        lines.push(
          `${quotation.services.length + index + 1}. ${part.partName} (${part.partNumber}) • ${part.quantity} x GH₵ ${part.unitPrice.toFixed(2)} = GH₵ ${part.total.toFixed(2)}`
        );
      });
      lines.push('');
    }
    lines.push(`Subtotal: GH₵ ${quotation.subtotal.toFixed(2)}`);
    lines.push(`Discount: GH₵ ${quotation.discount.toFixed(2)}`);
    lines.push(`VAT/Levies: GH₵ ${quotation.taxAmount.toFixed(2)}`);
    lines.push(`Total: GH₵ ${quotation.grandTotal.toFixed(2)}`);
    if (quotation.notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(quotation.notes);
    }
    lines.push('');
    lines.push('Thank you for choosing EL-Jindi Auto Services.');
    return lines.filter(Boolean).join('\n');
  };

  const handleSendWhatsApp = () => {
    const customer = db.getCustomerById(quotation.customerId);
    let recipient = customer?.phone?.trim();
    if (!recipient) {
      recipient = window.prompt('Enter the customer WhatsApp number to send this quotation receipt:');
      if (!recipient) return;
    }

    const formattedPhone = recipient.replace(/\D/g, '');
    if (!formattedPhone) {
      window.alert('Please enter a valid phone number with country code.');
      return;
    }

    const receiptText = formatReceiptText();
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(receiptText)}`;
    const opened = window.open(whatsappUrl, '_blank', 'noopener');
    if (!opened) {
      window.location.href = whatsappUrl;
    }
    db.recordQuotationSend(quotation.id, 'WhatsApp', recipient);
  };

  const vatBreakdown = quotation.vatRate === 20
    ? {
        nhil: quotation.subtotal * 0.025,
        getFund: quotation.subtotal * 0.025,
        vat: quotation.subtotal * 0.15,
        total: quotation.taxAmount,
      }
    : null;

  const barcodeValue = (quotation.quotationNumber || 'QT-0000').replace(/[^A-Za-z0-9]/g, '').slice(0, 20) || 'QT0000';
  const barcodeBars = Array.from({ length: 150 }, (_, index) => {
    const pattern = (index * 7 + barcodeValue.length * 3) % 11;
    return pattern < 3 ? 1 : pattern < 6 ? 0 : 1;
  });

  return (
    <div className="printable-area fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none">
          <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden print-hidden">
          <span className="text-xs font-bold font-mono">Quotation Document — {quotation.quotationNumber}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> Send WhatsApp
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> Save Document
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div id="quotation-print-area" className="p-8 space-y-8 bg-white text-slate-900 text-xs font-sans print:p-4">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <BrandLogo compact className="w-[300px] max-w-full -ml-2" />
              <p className="text-[11px] font-semibold text-blue-700">{settings.tagline}</p>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone} | Email: {settings.email}</p>
            </div>

            <div className="text-right space-y-1">
              <h2 className="text-2xl font-black text-slate-900 uppercase font-mono tracking-wider">QUOTATION</h2>
              <p className="text-sm font-bold text-blue-700 font-mono">{quotation.quotationNumber}</p>
              <p className="text-[11px] text-slate-600">Date: <strong className="text-slate-800">{quotation.date}</strong></p>
              <p className="text-[11px] text-slate-600">Valid Until: <strong className="text-slate-800">{quotation.validityDate}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
              <h3 className="text-sm font-bold text-slate-900">{quotation.customerName}</h3>
            </div>
            <div className="space-y-1 border-l border-slate-200 pl-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle</span>
              <h3 className="text-sm font-black font-mono text-amber-900">{quotation.vehicleDetails}</h3>
              <p className="text-[10px] text-slate-600">Job: {quotation.jobId || 'N/A'}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item / Description</th>
                  <th className="p-3 text-right">Qty / Hrs</th>
                  <th className="p-3 text-right">Unit Price (GH₵)</th>
                  <th className="p-3 text-right">Total (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {quotation.services.map((service, index) => (
                  <tr key={service.id}>
                    <td className="p-3 font-mono text-slate-400">{index + 1}</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{service.serviceName}</strong>
                      <span className="text-[10px] text-slate-500">{service.description || 'Labour / service charge'}</span>
                    </td>
                    <td className="p-3 text-right font-mono">{service.estimatedHours}</td>
                    <td className="p-3 text-right font-mono">{service.labourRate.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">{service.total.toFixed(2)}</td>
                  </tr>
                ))}
                {quotation.parts.map((part, index) => (
                  <tr key={part.id}>
                    <td className="p-3 font-mono text-slate-400">{quotation.services.length + index + 1}</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{part.partName}</strong>
                      <span className="text-[10px] text-slate-500">{part.partNumber}</span>
                    </td>
                    <td className="p-3 text-right font-mono">{part.quantity}</td>
                    <td className="p-3 text-right font-mono">{part.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">{part.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500">
              <p className="font-bold text-slate-800 mb-2">Status</p>
              <p className="uppercase font-bold text-xs tracking-widest">{quotation.status}</p>
              <p className="mt-2">Approval state from customer is reflected here for tracking.</p>
            </div>
            <div className="w-72 ml-auto p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold text-right">
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span className="font-mono">GH₵ {quotation.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-2">
                <span>Discount</span>
                <span className="font-mono">GH₵ {quotation.discount.toFixed(2)}</span>
              </div>

              {vatBreakdown ? (
                <div className="space-y-1.5 text-[11px] text-slate-600 py-2 border-y border-slate-200 my-2 bg-white/60 px-2 rounded-lg">
                  <div className="flex justify-between">
                    <span>NHIL (2.5%):</span>
                    <span className="font-mono">GH₵ {vatBreakdown.nhil.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GETFund (2.5%):</span>
                    <span className="font-mono">GH₵ {vatBreakdown.getFund.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (15.0%):</span>
                    <span className="font-mono">GH₵ {vatBreakdown.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 text-xs pt-1 border-t border-slate-200">
                    <span>VAT Total:</span>
                    <span className="font-mono">GH₵ {vatBreakdown.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 text-xs pt-1 border-t border-slate-200">
                    <span>Total VAT & Levies (20.0%):</span>
                    <span className="font-mono">GH₵ {vatBreakdown.total.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 mt-2">
                  <span>VAT / Levies ({quotation.vatRate}%):</span>
                  <span className="font-mono">GH₵ {quotation.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-300 mt-3 pt-3 flex items-center justify-between gap-4 text-lg text-slate-900">
                <span>Total</span>
                <span className="font-mono">GH₵ {quotation.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-[10px] text-slate-600">
              <p className="font-bold text-slate-900 mb-1">Notes</p>
              <p>{quotation.notes}</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-full max-w-105 h-16 border border-slate-300 rounded-md bg-white overflow-hidden flex items-center justify-center px-3">
              <div className="flex h-full w-full items-stretch gap-px">
                {barcodeBars.map((bar, index) => (
                  <div
                    key={`${barcodeValue}-${index}`}
                    className={`h-full ${bar ? 'bg-slate-900' : 'bg-white'}`}
                    style={{ width: index % 3 === 0 ? '2px' : index % 5 === 0 ? '1px' : '1.5px' }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 text-[10px] tracking-[0.28em] font-mono text-slate-500 uppercase">{quotation.quotationNumber}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
