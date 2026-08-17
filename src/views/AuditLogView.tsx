import React, { useState } from 'react';
import { History, ShieldCheck, Search } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

export const AuditLogView: React.FC = () => {
  const auditLogs = db.getAuditLogs();
  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = DEFAULT_PAGE_SIZE;
  const totalAuditLogs = auditLogs.length;
  const pagedAuditLogs = auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">System Audit & Compliance Log</h1>
            <p className="text-xs text-slate-500">
              Immutable security record of all user actions, financial transactions, inventory changes, and job updates
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedAuditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3.5 font-bold text-slate-800">{log.userName}</td>
                  <td className="p-3.5 font-bold text-blue-700">{log.action}</td>
                  <td className="p-3.5 text-slate-600">{log.details || 'System operation executed.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalAuditLogs} pageSize={auditPageSize} currentPage={auditPage} onPageChange={p => setAuditPage(p)} compact />
        </div>
      </div>
    </div>
  );
};
