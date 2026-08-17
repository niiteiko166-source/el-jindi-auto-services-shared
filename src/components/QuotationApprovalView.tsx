import React, { useState } from 'react';
import { X, Printer, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../services/db';

interface QuotationApprovalViewProps {
  quotationId: string;
  onClose: () => void;
}

export const QuotationApprovalView: React.FC<QuotationApprovalViewProps> = ({ quotationId, onClose }) => {
  const quotation = db.getQuotationById(quotationId);
  const settings = db.getSettings();
  const [status, setStatus] = useState(quotation?.status || 'Draft');

  if (!quotation) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-3xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">Quotation not found</h2>
          <p className="text-sm text-slate-500 mt-3">The quotation link may be invalid or the quotation is not available in this browser.</p>
          <button
            onClick={onClose}
            className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    const updated = db.updateQuotationStatus(quotation.id, 'Approved');
    if (updated && updated.jobId) {
      db.updateJobStatus(updated.jobId, 'In Progress', 'Quotation approved by customer via approval link');
    }
    setStatus('Approved');
  };

  const handleReject = () => {
    const updated = db.updateQuotationStatus(quotation.id, 'Rejected');
    if (updated && updated.jobId) {
      db.updateJobStatus(updated.jobId, 'Diagnosis', 'Quotation rejected by customer via approval link');
    }
    setStatus('Rejected');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-900 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Approval Link</p>
            <h1 className="text-xl font-black">Quotation {quotation.quotationNumber}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold"
            >
              <Printer className="w-4 h-4 inline-block mr-1" /> Print
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 bg-slate-800 hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 text-xs text-slate-900 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Customer</p>
              <p className="font-bold text-slate-900 text-sm">{quotation.customerName}</p>
              <p className="text-slate-500">Job: {quotation.jobId || 'N/A'}</p>
            </div>
            <div className="space-y-2 border-l border-slate-200 pl-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Vehicle</p>
              <p className="font-bold text-slate-900 text-sm">{quotation.vehicleDetails}</p>
              <p className="text-slate-500">Valid Until: {quotation.validityDate}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                {status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-500">
              <div>
                <div className="font-semibold text-slate-800">Subtotal</div>
                <div>GH₵ {quotation.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-800">VAT / Levies</div>
                <div>GH₵ {quotation.taxAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-800">Total</div>
                <div>GH₵ {quotation.grandTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Services</p>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                {quotation.services.map((service, index) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div>
                      <div className="font-semibold text-slate-900">{service.serviceName}</div>
                      <div className="text-[10px] text-slate-500">{service.estimatedHours} hrs × GH₵ {service.labourRate.toFixed(2)}</div>
                    </div>
                    <div className="font-bold text-slate-900">GH₵ {service.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Parts</p>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                {quotation.parts.map((part, index) => (
                  <div key={part.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div>
                      <div className="font-semibold text-slate-900">{part.partName}</div>
                      <div className="text-[10px] text-slate-500">{part.quantity} × GH₵ {part.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="font-bold text-slate-900">GH₵ {part.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-2">Notes</p>
              <p>{quotation.notes}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-end">
            <button
              onClick={handleReject}
              className="flex items-center gap-2 px-4 py-3 bg-rose-100 text-rose-700 rounded-2xl font-semibold text-xs"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-semibold text-xs"
            >
              <CheckCircle className="w-4 h-4" /> Approve Quotation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
