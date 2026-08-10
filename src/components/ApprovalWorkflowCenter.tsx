import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle, Plus, 
  Edit2, Trash2, Search, FileText, ChevronRight, MessageSquare, 
  Send, History, UserCheck, Layers, ShieldAlert, ArrowRight, CornerUpRight
} from 'lucide-react';
import { 
  ApprovalModule, 
  ApprovalRule, 
  ApprovalRequest, 
  ApprovalLevelName, 
  AppUser 
} from '../types';
import { 
  loadApprovalRules, 
  saveApprovalRules, 
  loadApprovalRequests, 
  saveApprovalRequests 
} from '../lib/storage';
import { processApprovalDecision, submitApprovalRequest } from '../lib/approvalEngine';

interface ApprovalWorkflowCenterProps {
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

export const ApprovalWorkflowCenter: React.FC<ApprovalWorkflowCenterProps> = ({
  loggedInUser,
  darkMode = false
}) => {
  const currentUser: AppUser = loggedInUser || {
    id: 'user-default-admin',
    fullName: 'System Owner',
    email: 'owner@skyview.rw',
    phone: '+250780000000',
    role: 'Super Admin',
    status: 'Active',
    passwordHash: '',
    createdAt: ''
  };

  const [activeTab, setActiveTab] = useState<'pending' | 'rules' | 'history'>('pending');
  const [requests, setRequests] = useState<ApprovalRequest[]>(loadApprovalRequests);
  const [rules, setRules] = useState<ApprovalRule[]>(loadApprovalRules);

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // New Request Modal State
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    module: 'Purchases' as ApprovalModule,
    title: '',
    amount: 1200000,
    reason: '',
    requestedBy: currentUser.fullName,
    requestedByRole: currentUser.role
  });

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    module: 'Purchases' as ApprovalModule,
    conditionField: 'amount',
    operator: '>' as any,
    thresholdValue: 1000000,
    approvalLevels: ['Level 2 (Manager)', 'Level 3 (Owner)'] as ApprovalLevelName[],
    enabled: true
  });

  const modulesList: ApprovalModule[] = [
    'Purchases', 'Expenses', 'Inventory Adjustments', 'Recipe Changes', 
    'Menu Price Changes', 'Discounts', 'Refunds', 'Order Cancellation', 
    'Payroll', 'Supplier Payments', 'Customer Credit', 'Cash Withdrawals', 
    'Cash Deposits', 'User Permissions', 'Accounting Journal Entries'
  ];

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const approvedTodayCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedTodayCount = requests.filter(r => r.status === 'Rejected').length;

  const handleDecision = (requestId: string, decision: 'Approve' | 'Reject' | 'Request Changes' | 'Forward') => {
    setProcessing(true);
    const updated = processApprovalDecision(requestId, decision, currentUser, decisionNotes);
    setProcessing(false);
    setDecisionNotes('');
    setRequests(loadApprovalRequests());
    if (selectedRequest?.id === requestId && updated) {
      setSelectedRequest(updated);
    }
  };

  const handleCreateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.title || !reqForm.reason) {
      alert('Please fill in Title and Reason.');
      return;
    }

    submitApprovalRequest(
      reqForm.module,
      reqForm.title,
      reqForm.amount,
      reqForm.reason,
      currentUser.fullName,
      currentUser.role
    );

    setRequests(loadApprovalRequests());
    setIsNewReqModalOpen(false);
    alert('Approval Request submitted successfully and sent to WhatsApp / In-App approvers!');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    let updated: ApprovalRule[];
    if (editingRule) {
      updated = rules.map(r => r.id === editingRule.id ? { ...r, ...ruleForm } : r);
    } else {
      const newRule: ApprovalRule = {
        id: `rule-appr-${Date.now()}`,
        ...ruleForm,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.fullName
      };
      updated = [newRule, ...rules];
    }
    setRules(updated);
    saveApprovalRules(updated);
    setIsRuleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-linear-to-r from-slate-900 via-amber-950 to-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight">Approval Workflow & Business Rules Engine</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingRequests.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Multi-level approval authorization for Purchases, Expenses, Price Changes, Recipe Modifications, and Inventory Adjustments.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsNewReqModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Request</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex space-x-2 border-t border-slate-800 mt-6 pt-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Pending Queue ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'rules' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Approval Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Approval Audit Trail ({requests.length})
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase font-semibold">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingRequests.length}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase font-semibold">Approved Today</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedTodayCount}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase font-semibold">Rejected Today</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{rejectedTodayCount}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase font-semibold">Active Rules</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{rules.filter(r => r.enabled).length}</p>
        </div>
      </div>

      {/* TAB 1: PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold">Pending Approval Queue</h2>
            {pendingRequests.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold">No Pending Approvals!</p>
                <p className="text-xs mt-1">All business transactions are fully authorized.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const isSelected = selectedRequest?.id === req.id;
                  const currentLevel = req.levels[req.currentLevelIndex]?.level || 'Level 2 (Manager)';
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md'
                          : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-amber-600">{req.referenceNo}</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600">
                              {req.module}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm mt-1">{req.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Requested by <span className="font-semibold text-slate-700 dark:text-slate-300">{req.requestedBy} ({req.requestedByRole})</span>
                          </p>
                        </div>
                        {req.amount !== undefined && (
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Amount</span>
                            <span className="text-base font-bold text-emerald-600">{req.amount.toLocaleString()} RWF</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Current Authorization Stage: <strong className="text-amber-600">{currentLevel}</strong></span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Decision Panel */}
          <div>
            <h2 className="text-lg font-bold mb-4">Decision Drawer</h2>
            {selectedRequest ? (
              <div className={`p-5 rounded-2xl border space-y-4 sticky top-24 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
              }`}>
                <div>
                  <span className="text-xs font-mono font-bold text-amber-600">{selectedRequest.referenceNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedRequest.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedRequest.reason}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Module:</span>
                    <span className="font-bold">{selectedRequest.module}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date/Time:</span>
                    <span>{selectedRequest.date} {selectedRequest.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested By:</span>
                    <span>{selectedRequest.requestedBy}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Approver Decision Notes</label>
                  <textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Add mandatory executive notes or remarks..."
                    rows={3}
                    className={`w-full p-2.5 text-xs rounded-xl border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDecision(selectedRequest.id, 'Approve')}
                    disabled={processing}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleDecision(selectedRequest.id, 'Reject')}
                    disabled={processing}
                    className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-6 text-center rounded-2xl border text-slate-400 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <p className="text-xs">Select a request from the left queue to review details and approve.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Business Approval Rules</h2>
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleForm({
                  ruleName: '',
                  module: 'Purchases',
                  conditionField: 'amount',
                  operator: '>',
                  thresholdValue: 1000000,
                  approvalLevels: ['Level 2 (Manager)', 'Level 3 (Owner)'],
                  enabled: true
                });
                setIsRuleModalOpen(true);
              }}
              className="px-3 py-2 bg-slate-900 dark:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Approval Rule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <div 
                key={rule.id}
                className={`p-5 rounded-2xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800">
                    {rule.module}
                  </span>
                  <button 
                    onClick={() => {
                      setEditingRule(rule);
                      setRuleForm({
                        ruleName: rule.ruleName,
                        module: rule.module,
                        conditionField: rule.conditionField,
                        operator: rule.operator,
                        thresholdValue: rule.thresholdValue,
                        approvalLevels: rule.approvalLevels,
                        enabled: rule.enabled
                      });
                      setIsRuleModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-sm mt-2">{rule.ruleName}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Condition: <span className="font-mono font-semibold">{rule.conditionField} {rule.operator} {rule.thresholdValue}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Levels: {rule.approvalLevels.join(' → ')}</span>
                  <span className={`font-bold ${rule.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === 'history' && (
        <div className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-slate-500 font-semibold uppercase tracking-wider ${
                darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <th className="p-4">Reference</th>
                <th className="p-4">Module</th>
                <th className="p-4">Title</th>
                <th className="p-4">Requested By</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-4 font-mono font-bold text-amber-600">{req.referenceNo}</td>
                  <td className="p-4 font-semibold">{req.module}</td>
                  <td className="p-4">{req.title}</td>
                  <td className="p-4">{req.requestedBy}</td>
                  <td className="p-4 font-bold text-emerald-600">
                    {req.amount ? `${req.amount.toLocaleString()} RWF` : 'N/A'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{req.date} {req.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {isNewReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg">Submit Approval Request</h3>
            <form onSubmit={handleCreateRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Module</label>
                <select
                  value={reqForm.module}
                  onChange={e => setReqForm({ ...reqForm, module: e.target.value as ApprovalModule })}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  {modulesList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Request Title</label>
                <input
                  type="text"
                  required
                  value={reqForm.title}
                  onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                  placeholder="e.g. Bulk Meat Restock PO #PO-2026-012"
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  value={reqForm.amount}
                  onChange={e => setReqForm({ ...reqForm, amount: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Justification / Reason</label>
                <textarea
                  required
                  value={reqForm.reason}
                  onChange={e => setReqForm({ ...reqForm, reason: e.target.value })}
                  placeholder="Explain why this request requires executive approval..."
                  rows={3}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewReqModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold"
                >
                  Submit & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg">{editingRule ? 'Edit Approval Rule' : 'New Approval Rule'}</h3>
            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleForm.ruleName}
                  onChange={e => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  placeholder="e.g. High Expense Authorization"
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Module</label>
                <select
                  value={ruleForm.module}
                  onChange={e => setRuleForm({ ...ruleForm, module: e.target.value as ApprovalModule })}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  {modulesList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Threshold Amount / Value</label>
                <input
                  type="number"
                  value={ruleForm.thresholdValue}
                  onChange={e => setRuleForm({ ...ruleForm, thresholdValue: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
