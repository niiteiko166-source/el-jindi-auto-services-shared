import React, { useState } from 'react';
import {
  Car,
  Wrench,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Plus,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
  Package,
  FileText
} from 'lucide-react';
import { JobCard, InventoryPart, Invoice, JobStatus } from '../types';
import { db } from '../services/db';

interface DashboardViewProps {
  onOpenNewJobModal: () => void;
  onViewJobDetails: (jobId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewJobModal,
  onViewJobDetails,
  onNavigateTab
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  const jobs = db.getJobCards();
  const inventory = db.getInventory();
  const invoices = db.getInvoices();
  const payments = db.getPayments();
  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);

  const pendingJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered');
  const inProgressJobs = jobs.filter(j => j.status === 'In Progress');
  const waitingPartsJobs = jobs.filter(j => j.status === 'Waiting for Parts');
  const completedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered');

  const lowStockParts = inventory.filter(i => i.quantity <= i.minStock || i.status === 'Low Stock' || i.status === 'Out of Stock');
  const outOfStockParts = inventory.filter(i => i.quantity === 0 || i.status === 'Out of Stock');

  const outstandingInvoices = invoices.filter(i => i.status !== 'Paid');
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.balance, 0);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentsToday = payments.filter(p => p.date && p.date.slice(0, 10) === todayStr);
  const revenueToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

  // Render full dashboard for all authenticated roles; action-level gating handled elsewhere

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      {/* Top Welcome Header */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block mb-1">
            EL-JINDI AUTO SERVICES — WORKSHOP CONTROL CENTRE
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">Today's Workshop Operations</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time management of workshop jobs, vehicle repair flow, inventory, and revenue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Filter Dropdown */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            {(['today', 'week', 'month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  dateFilter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenNewJobModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Card</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue Today */}
        <div 
          onClick={() => onNavigateTab('payments')}
          style={{ animationDelay: '0.04s' }}
          className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between transform-gpu animate-in fade-in-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue Today</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform pulse-slow">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">
              GH₵ {revenueToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
              <span>{paymentsToday.length} payment{paymentsToday.length !== 1 ? 's' : ''} received today</span>
              <span className="font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Payments <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Pending Job Cards */}
        <div 
          onClick={() => onNavigateTab('daily-work')}
          style={{ animationDelay: '0.09s' }}
          className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between transform-gpu animate-in fade-in-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Job Cards</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform bounce-slow">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600 font-mono">
              {pendingJobs.length} <span className="text-xs font-bold text-slate-400">Active</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
              <span>{inProgressJobs.length} in progress · {waitingPartsJobs.length} parts delay</span>
              <span className="font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Daily Work <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          style={{ animationDelay: '0.14s' }}
          className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between transform-gpu animate-in fade-in-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform pulse-slow">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 font-mono">
              {lowStockParts.length} <span className="text-xs font-bold text-slate-400">Items Alert</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
              <span>{outOfStockParts.length} out of stock · {lowStockParts.length - outOfStockParts.length} low stock</span>
              <span className="font-bold text-rose-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Inventory <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Operational Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Intake</span>
            <div className="text-xl font-black text-slate-900 font-mono pt-0.5">{jobs.length}</div>
          </div>
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl"><Car className="w-4 h-4" /></div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Completed Jobs</span>
            <div className="text-xl font-black text-emerald-600 font-mono pt-0.5">{completedJobs.length}</div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl"><CheckCircle className="w-4 h-4" /></div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cumulative Revenue</span>
            <div className="text-base font-black text-slate-900 font-mono pt-0.5">GH₵ {totalRevenue.toLocaleString()}</div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl"><DollarSign className="w-4 h-4" /></div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Invoices</span>
            <div className="text-base font-black text-amber-600 font-mono pt-0.5">GH₵ {totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl"><CreditCard className="w-4 h-4" /></div>
        </div>
      </div>

      {/* Main Today's Workshop Live Table */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Today's Workshop Active Jobs</h2>
            <p className="text-xs text-slate-500">Live vehicle status on the workshop floor</p>
          </div>

          <button
            onClick={() => onNavigateTab('daily-work')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>View All Daily Work</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Job No.</th>
                <th className="p-3.5">Vehicle Reg</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Complaint / Service</th>
                <th className="p-3.5">Lead Tech</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Amount (GH₵)</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No active job cards today. Click "+ New Job Card" to open a vehicle intake.
                  </td>
                </tr>
              ) : (
                jobs.slice(0, 8).map(j => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-700">{j.jobNumber}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        {j.registrationNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{j.customerName}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{j.complaint}</td>
                    <td className="p-3.5 text-slate-700 font-semibold">{j.technicianName || 'Yaw Boadu'}</td>
                    <td className="p-3.5 text-center">
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
                    <td className="p-3.5 text-right font-bold font-mono text-slate-900">
                      GH₵ {j.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onViewJobDetails(j.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2 Cards Grid: Low Stock Alerts & Outstanding Receivables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Stock Inventory Alert */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Low-Stock Inventory Warnings
            </h3>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Manage Inventory
            </button>
          </div>

          <div className="space-y-2">
            {lowStockParts.length === 0 ? (
              <p className="text-xs text-slate-400">All inventory levels are healthy!</p>
            ) : (
              lowStockParts.map(p => (
                <div key={p.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{p.partName}</span>
                    <span className="text-[10px] font-mono text-slate-500 block">PN: {p.partNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-700 font-mono block">Stock: {p.quantity} units</span>
                    <span className="text-[10px] text-slate-500">Min: {p.minStock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outstanding Invoices Alert */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Outstanding Customer Receivables
            </h3>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Invoices
            </button>
          </div>

          <div className="space-y-2">
            {outstandingInvoices.length === 0 ? (
              <p className="text-xs text-slate-400">No overdue balances!</p>
            ) : (
              outstandingInvoices.map(inv => (
                <div key={inv.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{inv.invoiceNumber}</span>
                    <p className="font-semibold text-slate-800">{inv.customerName} ({inv.vehicleRegistration})</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-900 font-mono block">GH₵ {inv.balance.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500">{inv.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
