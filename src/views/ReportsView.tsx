import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Wrench, Users, FileSpreadsheet, Calendar, Clock, Layers, PieChart } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

export const ReportsView: React.FC = () => {
  const [reportRange, setReportRange] = useState<'this-month' | 'last-month' | 'this-year' | 'custom'>('this-month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0,10);
  });

  const jobs = db.getJobCards();
  const payments = db.getPayments();
  const expenses = db.getExpenses();

  // Helper: parse a createdDate like '2026-08-13 09:48' into Date
  const parseRecordDate = (d?: string) => {
    if (!d) return new Date(0);
    // normalize space to T and ensure seconds
    const t = d.includes('T') ? d : d.replace(' ', 'T');
    if (t.length === 16) return new Date(t + ':00');
    return new Date(t);
  };

  // Determine date range filtering
  const getRangeBounds = () => {
    const now = new Date();
    let from = new Date(0);
    let to = new Date('9999-12-31');
    if (reportRange === 'this-month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (reportRange === 'last-month') {
      const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      from = new Date(m.getFullYear(), m.getMonth(), 1);
      to = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
    } else if (reportRange === 'this-year') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (reportRange === 'custom') {
      from = new Date(startDate + 'T00:00:00');
      to = new Date(endDate + 'T23:59:59');
    }
    return { from, to };
  };

  const { from: rangeFrom, to: rangeTo } = getRangeBounds();

  const filteredJobs = jobs.filter(j => {
    const d = parseRecordDate(j.createdDate);
    return d >= rangeFrom && d <= rangeTo;
  });

  const filteredPayments = payments.filter(p => {
    const d = parseRecordDate((p as any).date || (p as any).createdDate || (p as any).timestamp);
    return d >= rangeFrom && d <= rangeTo;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = parseRecordDate((e as any).date || (e as any).createdDate || (e as any).timestamp);
    return d >= rangeFrom && d <= rangeTo;
  });

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Breakdown calculation
  const totalLabour = filteredJobs.reduce((sum, j) => sum + j.labourTotal, 0);
  const totalParts = filteredJobs.reduce((sum, j) => sum + j.partsTotal, 0);

  const totalJobs = filteredJobs.length;
  const avgJobValue = totalJobs > 0 ? (filteredJobs.reduce((s, j) => s + (j.grandTotal || 0), 0) / totalJobs) : 0;
  const inventory = db.getInventory();
  const inventoryValue = inventory.reduce((s, p) => s + (p.quantity * (p.sellingPrice || 0)), 0);
  const invoices = db.getInvoices();
  const outstandingInvoices = invoices.filter(i => i.balance && i.balance > 0).length;

  // Top customers by revenue (simple aggregation)
  const customerMap: Record<string, number> = {};
  jobs.forEach(j => {
    const name = j.customerName || 'Unknown';
    customerMap[name] = (customerMap[name] || 0) + (j.grandTotal || 0);
  });
  const topCustomers = Object.entries(customerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, val]) => ({ name, value: val }));

  // Technician performance (count jobs and total billed)
  const techMap: Record<string, { jobs: number; revenue: number }> = {};
  jobs.forEach(j => {
    const tech = j.technicianName || 'Unassigned';
    techMap[tech] = techMap[tech] || { jobs: 0, revenue: 0 };
    techMap[tech].jobs += 1;
    techMap[tech].revenue += (j.grandTotal || 0);
  });
  const topTechs = Object.entries(techMap)
    .sort((a, b) => b[1].jobs - a[1].jobs)
    .slice(0, 4)
    .map(([name, stats]) => ({ name, ...stats }));

  const recentJobs = filteredJobs.slice(0, 8);
  // Pagination for recent jobs
  const [recentJobsPage, setRecentJobsPage] = useState(1);
  const recentJobsPageSize = DEFAULT_PAGE_SIZE;
  const totalRecentJobs = filteredJobs.length;
  const pagedRecentJobs = filteredJobs.slice((recentJobsPage - 1) * recentJobsPageSize, recentJobsPage * recentJobsPageSize);

  // CSV / Excel export
  const downloadTextFile = (filename: string, content: string, mime = 'text/csv') => {
    const blob = new Blob([content], { type: mime + ';charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportJobsToCSV = (asExcel = false) => {
    const rows: string[][] = [];
    rows.push(['JobNumber', 'Customer', 'Vehicle', 'Technician', 'LabourTotal', 'PartsTotal', 'GrandTotal', 'Status', 'CreatedDate']);
    filteredJobs.forEach(j => rows.push([j.jobNumber, j.customerName || '', j.registrationNumber || '', j.technicianName || '', String(j.labourTotal || 0), String(j.partsTotal || 0), String(j.grandTotal || 0), j.status, j.createdDate || '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const ext = asExcel ? 'xls' : 'csv';
    const fname = `eljindi_jobs_${reportRange === 'custom' ? `${startDate}_to_${endDate}` : reportRange}.${ext}`;
    const mime = asExcel ? 'application/vnd.ms-excel' : 'text/csv';
    downloadTextFile(fname, csv, mime);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Workshop Reports & Analytics</h1>
            <p className="text-xs text-slate-500">
              Financial performance, Profit & Loss statement, revenue streams, and workshop KPIs
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
          {(['this-month', 'last-month', 'this-year', 'custom'] as const).map(r => (
            <button
              key={r}
              onClick={() => setReportRange(r)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                reportRange === r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {r.replace('-', ' ')}
            </button>
          ))}
          <div className="ml-3 flex items-center gap-2">
            <button onClick={() => exportJobsToCSV(false)} className="px-3 py-1.5 rounded-lg bg-white text-slate-700 text-xs border">Export CSV</button>
            <button onClick={() => exportJobsToCSV(true)} className="px-3 py-1.5 rounded-lg bg-white text-slate-700 text-xs border">Export Excel</button>
          </div>
        </div>
      </div>

      {reportRange === 'custom' && (
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-600">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 border rounded-lg text-xs" />
          <label className="text-xs text-slate-600">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 border rounded-lg text-xs" />
        </div>
      )}

      {/* Top 3 Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-emerald-900 text-white rounded-3xl shadow-lg space-y-2">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Gross Revenue Collected</span>
          <h2 className="text-3xl font-extrabold font-mono">GH₵ {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p className="text-xs text-emerald-200 pt-1 border-t border-emerald-800/80">From customer payments & MoMo transactions</p>
        </div>

        <div className="p-6 bg-rose-900 text-white rounded-3xl shadow-lg space-y-2">
          <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest block">Total Operating Expenses</span>
          <h2 className="text-3xl font-extrabold font-mono">GH₵ {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p className="text-xs text-rose-200 pt-1 border-t border-rose-800/80">Parts purchases, utilities, fuel, petty cash</p>
        </div>

        <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-lg space-y-2">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Net Workshop Profit</span>
          <h2 className="text-3xl font-extrabold font-mono text-emerald-400">GH₵ {netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-800">Net Profit Margin: {totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 animate-in fade-in-up stagger" style={{ ['--delay' as any]: '0ms' }}>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Jobs</div>
            <div className="text-lg font-bold">{totalJobs}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 animate-in fade-in-up stagger" style={{ ['--delay' as any]: '80ms' }}>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Average Job Value</div>
            <div className="text-lg font-bold">GH₵ {avgJobValue.toFixed(2)}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 animate-in fade-in-up stagger" style={{ ['--delay' as any]: '160ms' }}>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Inventory Value</div>
            <div className="text-lg font-bold">GH₵ {inventoryValue.toFixed(2)}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 animate-in fade-in-up stagger" style={{ ['--delay' as any]: '240ms' }}>
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Outstanding Invoices</div>
            <div className="text-lg font-bold">{outstandingInvoices}</div>
          </div>
        </div>
      </div>

      {/* Top Customers & Technician Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Top Customers</h4>
          <div className="space-y-2 text-xs">
            {topCustomers.length === 0 ? (
              <div className="text-slate-400">No customer data yet.</div>
            ) : (
              topCustomers.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-blue-${(idx+3)*100} text-white flex items-center justify-center font-bold`}>{idx+1}</div>
                    <div>
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">GH₵ {c.value.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Technician Performance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topTechs.map(t => (
              <div key={t.name} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">Jobs: {t.jobs}</div>
                </div>
                <div className="text-xs text-slate-700 mt-2">Billed: GH₵ {t.revenue.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Jobs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Job #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Total (GH₵)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRecentJobs.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No recent jobs</td></tr>
              ) : (
                pagedRecentJobs.map((j, idx) => (
                  <tr key={j.id} className="hover:bg-slate-50 animate-in fade-in-up stagger" style={{ ['--delay' as any]: `${idx * 80}ms` }}>
                    <td className="p-2.5 font-mono">{j.jobNumber}</td>
                    <td className="p-2.5 font-semibold">{j.customerName}</td>
                    <td className="p-2.5">{j.registrationNumber}</td>
                    <td className="p-2.5 font-bold text-slate-900">GH₵ {(j.grandTotal || 0).toFixed(2)}</td>
                    <td className="p-2.5">{j.status}</td>
                    <td className="p-2.5 text-[11px] text-slate-500">{j.createdDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Pagination totalItems={totalRecentJobs} pageSize={recentJobsPageSize} currentPage={recentJobsPage} onPageChange={p => setRecentJobsPage(p)} compact />
        </div>
      </div>

      {/* Profit & Loss Detailed Table */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Income & Expense Breakdown (Profit & Loss)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Income Side */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-3">
            <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Revenue Channels</h4>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span>Labour / Workshop Service Fees:</span>
                <span className="font-bold font-mono">GH₵ {totalLabour.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Spare Parts Sales Revenue:</span>
                <span className="font-bold font-mono">GH₵ {totalParts.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-900 text-sm">
                <span>Total Income:</span>
                <span className="font-mono">GH₵ {totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Expense Side */}
          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/60 space-y-3">
            <h4 className="font-bold text-rose-900 uppercase text-[11px]">Cost Breakdown</h4>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span>Spare Parts Purchases:</span>
                <span className="font-bold font-mono">GH₵ {(totalExpenses * 0.6).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Utilities & Workshop Operating Costs:</span>
                <span className="font-bold font-mono">GH₵ {(totalExpenses * 0.4).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-rose-200 flex justify-between font-bold text-rose-900 text-sm">
                <span>Total Expenses:</span>
                <span className="font-mono">GH₵ {totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
