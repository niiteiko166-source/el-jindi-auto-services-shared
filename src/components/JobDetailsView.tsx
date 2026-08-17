import React, { useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  User,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Receipt,
  CreditCard,
  Printer,
  Plus,
  Send,
  History,
  ShieldCheck,
  Package,
  Calendar
} from 'lucide-react';
import { JobCard, JobStatus, UserRole } from '../types';
import { db } from '../services/db';

interface JobDetailsViewProps {
  jobId: string;
  onBack: () => void;
  onOpenEditModal: (job: JobCard) => void;
  onOpenPrintInvoice: (invoiceId: string) => void;
  onOpenPrintJobCard: (job: JobCard) => void;
  userRole: UserRole;
}

const ALL_STATUSES: JobStatus[] = [
  'Received',
  'Diagnosis',
  'Waiting for Approval',
  'Waiting for Parts',
  'In Progress',
  'Quality Check',
  'Completed',
  'Delivered'
];

export const JobDetailsView: React.FC<JobDetailsViewProps> = ({
  jobId,
  onBack,
  onOpenEditModal,
  onOpenPrintInvoice,
  onOpenPrintJobCard,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'inspection' | 'diagnosis' | 'services' | 'parts' | 'payments' | 'invoices' | 'history'
  >('overview');

  const [job, setJob] = useState<JobCard | undefined>(() => db.getJobById(jobId));
  const [newStatus, setNewStatus] = useState<JobStatus>(job?.status || 'Received');
  const [statusComment, setStatusComment] = useState('');

  if (!job) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Job Card not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
          Return to Daily Work
        </button>
      </div>
    );
  }

  const customer = db.getCustomerById(job.customerId);
  const vehicle = db.getVehicleById(job.vehicleId);
  const invoices = db.getInvoices().filter(i => i.jobId === job.id);
  const payments = db.getPayments().filter(p => p.invoiceId && invoices.some(inv => inv.id === p.invoiceId));

  const currentStatusIdx = ALL_STATUSES.indexOf(job.status);
  const quotation = job.quotationId ? db.getQuotationById(job.quotationId) : undefined;

  // Handle Quick Status Change
  const handleUpdateStatus = () => {
    const updated = db.updateJobStatus(job.id, newStatus, statusComment);
    if (updated) {
      setJob(updated);
      setStatusComment('');
      alert(`Job status updated to ${newStatus}`);
    }
  };

  // Quick Requisition Trigger
  const handleRequestPartsRequisition = () => {
    if (job.parts.length === 0) {
      alert('No parts attached to this job card to request requisition for.');
      return;
    }

    const req = db.saveRequisition({
      jobId: job.id,
      items: job.parts.map(p => ({
        id: `reqitem-${Date.now()}-${p.id}`,
        partId: p.partId,
        partName: p.partName,
        partNumber: p.partNumber,
        quantityRequested: p.quantity,
        quantityIssued: 0,
        unitPrice: p.unitPrice,
        totalPrice: p.total,
        reason: `Requisition for Job ${job.jobNumber}`,
        status: 'Pending'
      }))
    });

    alert(`Requisition ${req.requisitionNumber} created and sent to Storekeeper!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Daily Work</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenPrintJobCard(job)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Job Card</span>
          </button>

          <button
            onClick={handleRequestPartsRequisition}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Package className="w-4 h-4" />
            <span>Request Parts Requisition</span>
          </button>

          <button
            onClick={() => onOpenEditModal(job)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Wrench className="w-4 h-4" />
            <span>Edit Job Card</span>
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-blue-600/30 text-blue-300 font-mono font-bold text-xs rounded-lg border border-blue-500/30">
              {job.jobNumber}
            </span>
            <span className="text-xl font-black tracking-tight text-amber-400 font-mono bg-amber-400/10 px-3 py-0.5 rounded-lg border border-amber-400/20">
              {job.registrationNumber}
            </span>
            <span className="text-xs text-slate-400">Opened: {job.createdDate}</span>
          </div>
          <h1 className="text-xl font-bold">{job.vehicleDetails}</h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-400" /> {job.customerName} ({job.customerPhone})
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
          <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {job.status}
          </span>
          <div className="text-right mt-1 space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Amount</span>
              <span className="text-base font-bold text-white font-mono">
                GH₵ {job.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quotation && (
              <div className="px-3 py-2 bg-slate-800/90 rounded-2xl border border-slate-700 text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Quotation</div>
                <div className="text-sm font-bold text-white mt-1">{quotation.quotationNumber}</div>
                <div className="text-[10px] text-slate-400">Status: <span className="text-slate-100 font-semibold">{quotation.status}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Workflow Timeline Step Bar */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto scrollbar-none">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Workshop Workflow Timeline Progress
        </h3>
        <div className="flex items-center justify-between min-w-[700px] relative">
          {ALL_STATUSES.map((st, idx) => {
            const isCompleted = idx <= currentStatusIdx;
            const isCurrent = idx === currentStatusIdx;
            return (
              <div key={st} className="flex-1 flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg scale-110'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] font-bold mt-2 text-center max-w-[80px] leading-tight ${
                    isCurrent ? 'text-blue-700 font-extrabold' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {st}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'inspection', label: 'Inspection' },
          { id: 'diagnosis', label: 'Diagnosis & Repairs' },
          { id: 'services', label: `Labour (${job.services.length})` },
          { id: 'parts', label: `Spare Parts (${job.parts.length})` },
          { id: 'payments', label: `Payments (${payments.length})` },
          { id: 'invoices', label: `Invoices (${invoices.length})` },
          { id: 'history', label: 'Activity History' },
        ].map(tb => (
          <button
            key={tb.id}
            onClick={() => setActiveTab(tb.id as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tb.id
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      <div className="space-y-6">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Complaint Box */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Customer Complaint
                </h3>
                <p className="text-sm font-medium text-slate-800 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60 leading-relaxed">
                  "{job.complaint}"
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(job.complaintCategories || []).map(cat => (
                    <span key={cat} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Diagnosis Summary */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Diagnostic Findings & Recommended Scope
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {job.diagnosis || 'Diagnosis in progress by technician.'}
                </p>
                {job.recommendedRepairs && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 font-medium">
                    <strong>Recommended Repairs:</strong>
                    <pre className="mt-1 font-sans whitespace-pre-wrap">{job.recommendedRepairs}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Financial & Quick Status Updater Sidebar */}
            <div className="space-y-6">
              {/* Quick Status Control */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Workshop Status</h3>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as JobStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  {ALL_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Optional comment..."
                  value={statusComment}
                  onChange={e => setStatusComment(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs"
                />
                <button
                  onClick={handleUpdateStatus}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Save Status Update
                </button>
              </div>

              {/* Financial Box */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Labour Total:</span>
                    <span>GH₵ {job.labourTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Parts Total:</span>
                    <span>GH₵ {job.partsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Discount:</span>
                    <span>- GH₵ {job.discount.toFixed(2)}</span>
                  </div>
                  {job.vatRate === 20 ? (
                    <div className="space-y-1 text-[11px] text-slate-400 py-2 border-y border-slate-800 my-1">
                      <div className="flex justify-between">
                        <span>NHIL (2.5%):</span>
                        <span className="font-mono">GH₵ {(job.subtotal * 0.025).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GETFund (2.5%):</span>
                        <span className="font-mono">GH₵ {(job.subtotal * 0.025).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (15.0%):</span>
                        <span className="font-mono">GH₵ {(job.subtotal * 0.15).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-200 text-xs pt-1 border-t border-slate-800">
                        <span>Total VAT & Levies (20.0%):</span>
                        <span className="font-mono">GH₵ {job.taxAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-300">
                      <span>VAT / Levies ({job.vatRate}%):</span>
                      <span>GH₵ {job.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                    <span>Grand Total:</span>
                    <span className="font-mono">GH₵ {job.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Amount Paid:</span>
                    <span>GH₵ {job.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-bold text-sm pt-1">
                    <span>Balance Due:</span>
                    <span>GH₵ {job.balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSPECTION TAB */}
        {activeTab === 'inspection' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Inspection Checklist Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(job.inspectionChecklist || []).map(item => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{item.category}</span>
                    <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                    {item.notes && <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'OK'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'Needs Attention'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVICES LABOUR TAB */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3 text-center">Hours</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {job.services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{s.serviceName}</td>
                    <td className="p-3 text-slate-500">{s.description || 'Standard workshop service'}</td>
                    <td className="p-3 font-semibold text-slate-700">{s.technicianName || 'Master Tech'}</td>
                    <td className="p-3 text-center font-mono">{s.estimatedHours} hrs</td>
                    <td className="p-3 text-right">GH₵ {s.labourRate.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">GH₵ {s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SPARE PARTS TAB */}
        {activeTab === 'parts' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Part Name</th>
                  <th className="p-3">Part #</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Requisition Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {job.parts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{p.partName}</td>
                    <td className="p-3 font-mono text-slate-500">{p.partNumber}</td>
                    <td className="p-3 text-center font-bold">{p.quantity}</td>
                    <td className="p-3 text-right">GH₵ {p.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">GH₵ {p.total.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.issued ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {p.issued ? 'Issued from Store' : 'Pending Requisition'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Job Invoices</h3>
              <button
                onClick={() => db.createInvoiceFromJob(job.id)}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                + Generate Invoice
              </button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No invoice generated for this job yet.</p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold font-mono text-xs text-blue-700">{inv.invoiceNumber}</span>
                    <p className="text-xs text-slate-500 mt-0.5">Grand Total: GH₵ {inv.grandTotal.toFixed(2)} | Paid: GH₵ {inv.paidAmount.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => onOpenPrintInvoice(inv.id)}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> View / Print Invoice
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACTIVITY HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Job Card Audit & Status History</h3>
            <div className="space-y-3">
              {(job.statusHistory || []).map((sh, idx) => (
                <div key={sh.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{sh.status}</span>
                      <span className="text-[10px] text-slate-400">{sh.date}</span>
                      <span className="text-[10px] text-blue-600 font-semibold">by {sh.userName}</span>
                    </div>
                    {sh.comment && <p className="text-xs text-slate-600 mt-1">{sh.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
