import React, { useState } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Eye,
  Edit,
  Receipt,
  Printer,
  Filter,
  Car,
  User,
  Wrench,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { JobCard, JobStatus } from '../types';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface DailyWorkViewProps {
  onOpenNewJobModal: () => void;
  onOpenEditModal: (job: JobCard) => void;
  onViewJobDetails: (jobId: string) => void;
  onOpenPrintJobCard: (job: JobCard) => void;
  onGenerateInvoice: (jobId: string) => void;
}

export const DailyWorkView: React.FC<DailyWorkViewProps> = ({
  onOpenNewJobModal,
  onOpenEditModal,
  onViewJobDetails,
  onOpenPrintJobCard,
  onGenerateInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [techFilter, setTechFilter] = useState<string>('All');

  const jobs = db.getJobCards();
  const quotations = db.getQuotations();
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';

  const handleDeleteJob = (job: JobCard) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete job ${job.jobNumber}? This action cannot be undone.`);
    if (!confirmed) return;
    db.deleteJobCard(job.id);
    window.location.reload();
  };

  // Filter Logic
  const filteredJobs = jobs.filter(j => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      j.jobNumber.toLowerCase().includes(q) ||
      (j.registrationNumber && j.registrationNumber.toLowerCase().includes(q)) ||
      (j.customerName && j.customerName.toLowerCase().includes(q)) ||
      (j.customerPhone && j.customerPhone.includes(q)) ||
      (j.technicianName && j.technicianName.toLowerCase().includes(q)) ||
      j.complaint.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    const matchesTech = techFilter === 'All' || j.technicianName === techFilter;

    return matchesSearch && matchesStatus && matchesTech;
  });

  // Pagination for jobs table
  const [jobsPage, setJobsPage] = useState(1);
  const jobsPageSize = DEFAULT_PAGE_SIZE;
  const totalFilteredJobs = filteredJobs.length;
  const pagedJobs = filteredJobs.slice((jobsPage - 1) * jobsPageSize, jobsPage * jobsPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Work & Workshop Job Cards</h1>
            <p className="text-xs text-slate-500">
              Manage daily customer job cards, repair workflows, diagnosis, and floor dispatch
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewJobModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Open New Job Card</span>
        </button>
      </div>

      {/* Search & Filters Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Job #, Registration (GR 1234), Customer name, Phone, Technician..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="All">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Diagnosis">Diagnosis</option>
            <option value="Waiting for Approval">Waiting for Approval</option>
            <option value="Waiting for Parts">Waiting for Parts</option>
            <option value="In Progress">In Progress</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Tech Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={techFilter}
            onChange={e => setTechFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="All">All Technicians</option>
            <option value="Yaw Boadu">Yaw Boadu</option>
            <option value="Daniel Kyeremeh">Daniel Kyeremeh</option>
          </select>
        </div>
      </div>

      {/* Main Jobs Table */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filteredJobs.length}</strong> Workshop Job Cards</span>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Job No.</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Registration</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5">Complaint</th>
                <th className="p-3.5">Technician</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Quote</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {totalFilteredJobs === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    No workshop job cards match your criteria. Click "+ Open New Job Card" to create one.
                  </td>
                </tr>
                ) : (
                  <>
                    {pagedJobs.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-700">{j.jobNumber}</td>
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">{j.createdDate.split(' ')[0]}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        {j.registrationNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{j.customerName}</td>
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">{j.vehicleDetails}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{j.complaint}</td>
                    <td className="p-3.5 text-slate-700 font-semibold whitespace-nowrap">{j.technicianName || 'Yaw Boadu'}</td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          j.status === 'Completed' || j.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {(() => {
                        const quote = quotations.find(q => q.jobId === j.id);
                        if (!quote) {
                          return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">No Quote</span>;
                        }
                        const quoteColor =
                          quote.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : quote.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : quote.status === 'Sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700';
                        return (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${quoteColor}`}>
                            {quote.quotationNumber} / {quote.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                      GH₵ {j.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          j.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {j.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewJobDetails(j.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenEditModal(j)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Job Card"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onGenerateInvoice(j.id)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Generate / View Invoice"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteJob(j)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Job Card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPrintJobCard(j)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Print Workshop Sheet"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </>
                )}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFilteredJobs} pageSize={jobsPageSize} currentPage={jobsPage} onPageChange={p => setJobsPage(p)} />
        </div>
      </div>
    </div>
  );
};
