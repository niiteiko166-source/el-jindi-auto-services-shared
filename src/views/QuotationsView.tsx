import React, { useState } from 'react';
import { FileText, Search, Printer, CheckCircle, XCircle } from 'lucide-react';
import { Quotation, QuotationStatus } from '../types';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface QuotationsViewProps {
  onOpenPrintQuotation: (quotationId: string) => void;
  onViewJobDetails: (jobId: string) => void;
}

const statusClasses: Record<QuotationStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-800',
  Expired: 'bg-amber-100 text-amber-800'
};

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onOpenPrintQuotation, onViewJobDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>(db.getQuotations());

  const filtered = quotations.filter((quote) => {
    const q = searchTerm.toLowerCase();
    const job = quote.jobId ? db.getJobById(quote.jobId) : undefined;
    return (
      quote.quotationNumber.toLowerCase().includes(q) ||
      quote.customerName.toLowerCase().includes(q) ||
      quote.vehicleDetails.toLowerCase().includes(q) ||
      (quote.jobId || '').toLowerCase().includes(q) ||
      (job?.jobNumber || '').toLowerCase().includes(q) ||
      (quote.notes || '').toLowerCase().includes(q)
    );
  });

  // Pagination for quotations
  const [quotesPage, setQuotesPage] = useState(1);
  const quotesPageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((quotesPage - 1) * quotesPageSize, quotesPage * quotesPageSize);

  const handleApprove = (quote: Quotation) => {
    const updated = db.updateQuotationStatus(quote.id, 'Approved');
    if (updated && quote.jobId) {
      db.updateJobStatus(quote.jobId, 'In Progress', 'Quotation approved by customer');
    }
    setQuotations(db.getQuotations());
  };

  const handleReject = (quote: Quotation) => {
    const updated = db.updateQuotationStatus(quote.id, 'Rejected');
    if (updated && quote.jobId) {
      db.updateJobStatus(quote.jobId, 'Diagnosis', 'Quotation rejected by customer');
    }
    setQuotations(db.getQuotations());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Quotations</h1>
            <p className="text-xs text-slate-500">
              Track quotation status, job relationships, and customer approval state.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search quotation #, customer, vehicle, job # or notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="hidden lg:block border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Quote #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5">Job #</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5">Validity</th>
                <th className="p-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    No quotations match your search. Create a job card with quotation approval to track them here.
                  </td>
                </tr>
              ) : (
                pagedFiltered.map((quote) => {
                  const job = quote.jobId ? db.getJobById(quote.jobId) : undefined;
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{quote.quotationNumber}</td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{quote.date}</td>
                      <td className="p-3.5 font-bold text-slate-800">{quote.customerName}</td>
                      <td className="p-3.5 text-slate-600">{quote.vehicleDetails}</td>
                      <td className="p-3.5 font-mono text-slate-700">{job?.jobNumber || quote.jobId || '—'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClasses[quote.status]}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono text-slate-900">GH₵ {quote.grandTotal.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{quote.validityDate}</td>
                      <td className="p-3.5 text-center space-y-2">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => onOpenPrintQuotation(quote.id)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-[11px] rounded-xl"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          {quote.status === 'Sent' && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleApprove(quote)}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-emerald-600 text-white text-[11px] rounded-xl"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(quote)}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-rose-600 text-white text-[11px] rounded-xl"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={quotesPageSize} currentPage={quotesPage} onPageChange={p => setQuotesPage(p)} />
        </div>

        <div className="space-y-4 lg:hidden">
          {filtered.length === 0 ? (
            <div className="p-8 rounded-3xl border border-slate-200 bg-slate-50 text-center text-slate-500">
              No quotations match your search. Create a job card with quotation approval to track them here.
            </div>
          ) : (
            filtered.map((quote) => {
              const job = quote.jobId ? db.getJobById(quote.jobId) : undefined;
              return (
                <div key={quote.id} className="p-4 border border-slate-200 rounded-3xl bg-slate-50 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{quote.quotationNumber}</div>
                      <div className="text-xs text-slate-500">{quote.customerName}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClasses[quote.status]}`}>
                      {quote.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                    <div>
                      <div className="font-semibold text-slate-800">Vehicle</div>
                      <div>{quote.vehicleDetails}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Total</div>
                      <div>GH₵ {quote.grandTotal.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Date</div>
                      <div>{quote.date}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Valid until</div>
                      <div>{quote.validityDate}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => onOpenPrintQuotation(quote.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    {quote.status === 'Sent' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprove(quote)}
                          className="inline-flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(quote)}
                          className="inline-flex items-center justify-center px-3 py-2 bg-rose-600 text-white rounded-xl text-sm"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
