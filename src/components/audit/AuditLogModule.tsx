import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  Shield,
  Activity,
  Calendar,
  Lock,
  Layers,
  Printer
} from 'lucide-react';

export const AuditLogModule: React.FC = () => {
  const { auditLogs, refreshData, loading } = useApp();

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Classify log risk level
  const getRiskLevel = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('RESET') || act.includes('REMOVE')) {
      return 'HIGH';
    }
    if (act.includes('MODIFY') || act.includes('CHANGE') || act.includes('UPDATE') || act.includes('ROLE')) {
      return 'MEDIUM';
    }
    if (act.includes('ADD') || act.includes('CREATE') || act.includes('RECORD') || act.includes('SALE')) {
      return 'LOW';
    }
    return 'INFO';
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search term
      const matchSearch =
        !search ||
        log.user?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.module?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.role?.toLowerCase().includes(search.toLowerCase());

      // Module filter
      const matchModule = selectedModule === 'all' || log.module?.toLowerCase() === selectedModule.toLowerCase();

      // Risk filter
      const risk = getRiskLevel(log.action);
      const matchRisk = riskFilter === 'all' || risk === riskFilter;

      // Time filter
      let matchTime = true;
      if (timeFilter !== 'all' && log.timestamp) {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        if (timeFilter === 'today') {
          matchTime = logDate.toDateString() === now.toDateString();
        } else if (timeFilter === '7days') {
          const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
          matchTime = logDate >= sevenDaysAgo;
        } else if (timeFilter === '30days') {
          const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
          matchTime = logDate >= thirtyDaysAgo;
        }
      }

      return matchSearch && matchModule && matchRisk && matchTime;
    });
  }, [auditLogs, search, selectedModule, riskFilter, timeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    let highRisk = 0;
    let mediumRisk = 0;
    let todayCount = 0;
    const nowStr = new Date().toDateString();

    auditLogs.forEach((l) => {
      const level = getRiskLevel(l.action);
      if (level === 'HIGH') highRisk++;
      if (level === 'MEDIUM') mediumRisk++;
      if (l.timestamp && new Date(l.timestamp).toDateString() === nowStr) {
        todayCount++;
      }
    });

    return { total, highRisk, mediumRisk, todayCount };
  }, [auditLogs]);

  // Export CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.user}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 px-3 py-1 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Security & Compliance Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">System Audit Log</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time chronological log of all sensitive user activities, inventory modifications, transaction deletions, user role updates, and system configuration adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refreshData()}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all text-xs border border-slate-700 flex items-center gap-1.5"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-md text-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-md text-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Audit Records</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Immutable system log</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Critical / Deletion Events</div>
            <div className="text-2xl font-black text-red-600 mt-1">{stats.highRisk}</div>
            <div className="text-[10px] text-red-500 mt-0.5">Deletions, resets & drops</div>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Modifications / Role Changes</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.mediumRisk}</div>
            <div className="text-[10px] text-amber-500 mt-0.5">Stock edits & user updates</div>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Today's Security Events</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.todayCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Logged last 24 hours</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All System Modules</option>
              <option value="inventory">Inventory Module</option>
              <option value="debtors">Debtors & AR Module</option>
              <option value="users">Users & Roles Module</option>
              <option value="pos terminal">POS Terminal Module</option>
              <option value="purchasing">Purchasing & POs</option>
              <option value="cashbook">Cashbook Module</option>
              <option value="settings">Settings & System</option>
              <option value="authentication">Authentication</option>
            </select>
          </div>

          {/* Action Risk Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Action Severities</option>
              <option value="HIGH">Critical / High Risk (Deletes & Resets)</option>
              <option value="MEDIUM">Medium Risk (Modifications & Role Edits)</option>
              <option value="LOW">Low Risk (Creations & Sales)</option>
              <option value="INFO">Info / Login Events</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time History</option>
              <option value="today">Today Only</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1 border-t border-slate-100">
          <span>Showing {filteredLogs.length} of {auditLogs.length} recorded audit events</span>
          {(search || selectedModule !== 'all' || riskFilter !== 'all' || timeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedModule('all');
                setRiskFilter('all');
                setTimeFilter('all');
              }}
              className="text-blue-600 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
              Security Audit Event Records
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Timestamped ISO-8601 UTC</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No audit logs matching your selected search parameters.</p>
            <p className="text-xs text-slate-400">Try adjusting your module or risk severity filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Timestamp & Date</th>
                  <th className="p-3.5">User Account</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">System Module</th>
                  <th className="p-3.5">Activity Description / Details</th>
                  <th className="p-3.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const risk = getRiskLevel(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3.5 font-mono text-slate-600 shrink-0 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </td>

                      {/* User */}
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {(log.user || 'A').charAt(0)}
                          </div>
                          <span>{log.user || 'Unknown User'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            log.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : log.role === 'SALES_REP'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : log.role === 'POS_CASHIER'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {log.role || 'STAFF'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-md border flex items-center gap-1.5 w-fit ${
                            risk === 'HIGH'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : risk === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : risk === 'LOW'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {risk === 'HIGH' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                          {risk === 'MEDIUM' && <Shield className="w-3 h-3 text-amber-600" />}
                          {risk === 'LOW' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {risk === 'INFO' && <Lock className="w-3 h-3 text-blue-600" />}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      {/* Module */}
                      <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                          {log.module}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="p-3.5 text-slate-700 font-medium max-w-md truncate">
                        {log.details}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors font-bold text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Audit Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Record ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Timestamp</span>
                  <span className="font-mono font-bold text-slate-900">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">User Name</span>
                  <span className="font-bold text-slate-900">{selectedLog.user}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">User Role</span>
                  <span className="font-bold text-blue-700">{selectedLog.role}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Action Type</span>
                <div className="p-2 bg-slate-100 rounded-lg font-mono font-extrabold text-slate-800">
                  {selectedLog.action}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Module</span>
                <div className="p-2 bg-slate-100 rounded-lg font-bold text-slate-800">
                  {selectedLog.module}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Full Action Log Details</span>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed break-words">
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
