import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Clock, User, FileText, 
  Calendar, Download, Printer, Eye, ChevronLeft, ChevronRight, CheckCircle2, Shield
} from 'lucide-react';
import { AuditLog } from '../types';
import { loadAuditLogs } from '../lib/storage';

interface AuditLogViewProps {
  darkMode?: boolean;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ darkMode = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'ThisWeek' | 'ThisMonth' | 'Custom'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = () => {
    setLogs(loadAuditLogs());
  };

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    // 1. Search term
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Category
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;

    // 3. Role
    const matchesRole = roleFilter === 'All' || log.userRole === roleFilter;

    // 4. Date Range
    let matchesDate = true;
    if (log.timestamp) {
      const logDate = new Date(log.timestamp);
      const now = new Date();

      if (dateFilter === 'Today') {
        matchesDate = logDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'Yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        matchesDate = logDate.toDateString() === yesterday.toDateString();
      } else if (dateFilter === 'ThisWeek') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = logDate >= weekAgo;
      } else if (dateFilter === 'ThisMonth') {
        matchesDate = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === 'Custom') {
        if (startDate) {
          const start = new Date(startDate);
          matchesDate = matchesDate && logDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && logDate <= end;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesRole && matchesDate;
  });

  // Pagination math
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Unique categories & roles for filters
  const uniqueCategories = Array.from(new Set(logs.map(l => l.category)));
  const uniqueRoles = Array.from(new Set(logs.map(l => l.userRole)));

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User Name', 'User Role', 'User Email', 'Category', 'Action', 'Details'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.userEmail}"`,
      `"${l.category}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Logs_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Audit Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>System Activity Audit History</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Immutable Log Engine
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              History ndende igaragaza ibyakozwe byose kimwe kukindi (complete audit trail of logins, orders, stock adjustments, payments, and system edits).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={refreshLogs}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Logged Events</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{logs.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filtered Events</span>
          <span className="text-xl font-black text-amber-500 mt-1 block">{filteredLogs.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active User Accounts</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{uniqueRoles.length} Roles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Categories</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{uniqueCategories.length} Types</span>
        </div>
      </div>

      {/* Comprehensive Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, order #, details..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Event Categories</option>
              <option value="Sales">Sales & Payments</option>
              <option value="Inventory">Inventory & Stock</option>
              <option value="Auth">Auth & Security</option>
              <option value="User Management">User Management</option>
              <option value="Tables">Tables & Seating</option>
              <option value="System">System Settings</option>
              <option value="Reports">Reports & Exports</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Staff Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Quick Buttons */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Time Range</option>
              <option value="Today">Today Only</option>
              <option value="Yesterday">Yesterday</option>
              <option value="ThisWeek">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

        </div>

        {/* Custom Date Pickers if Custom selected */}
        {dateFilter === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-500">Custom Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <FileText className="w-12 h-12 mx-auto text-slate-400 opacity-50" />
            <p className="font-bold text-sm">No audit logs match your search filters</p>
            <p className="text-xs">Try clearing or adjusting search queries or date ranges.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User / Staff</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Action Executed</th>
                    <th className="p-3.5">Detailed Payload & Context</th>
                    <th className="p-3.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px] font-mono">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{log.userName}</p>
                            <p className="text-[10px] text-slate-400">{log.userRole}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.category === 'Sales' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          log.category === 'Inventory' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          log.category === 'Auth' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {log.category}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {log.action}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {log.details}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} events
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-bold text-slate-800 dark:text-slate-200 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INSPECT AUDIT ENTRY MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border space-y-4 transition-colors ${
            darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Audit Log Details #{selectedLog.id.slice(-6)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Immutable System Audit Event Verified</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Action</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <span className="font-bold text-amber-500">{selectedLog.category}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">User / Staff</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.userName}</span>
                  <p className="text-[10px] text-slate-400">{selectedLog.userRole} ({selectedLog.userEmail || 'N/A'})</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Timestamp</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  <p className="text-[10px] font-mono text-slate-400">{selectedLog.timestamp}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Complete Action Payload & Details</span>
                <p className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
