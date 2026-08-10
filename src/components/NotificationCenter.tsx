import React, { useState } from 'react';
import { 
  Bell, Check, X, ShieldAlert, Plus, Edit2, Trash2, Search, Sliders, 
  Send, MessageSquare, Mail, Smartphone, CheckCircle, RefreshCw, AlertTriangle, 
  DollarSign, ShoppingBag, Utensils, Package, Shield, Settings, Users
} from 'lucide-react';
import { 
  NotificationItem, 
  NotificationRule, 
  NotificationCategory, 
  NotificationChannel, 
  AppUser 
} from '../types';
import { 
  loadNotifications, 
  saveNotifications, 
  loadNotificationRules, 
  saveNotificationRules,
  addNotificationItem 
} from '../lib/storage';

interface NotificationCenterProps {
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  loggedInUser,
  darkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'rules' | 'channels'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotifications);
  const [rules, setRules] = useState<NotificationRule[]>(loadNotificationRules);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    category: 'Sales' as NotificationCategory,
    conditionField: 'sale_amount',
    operator: '>' as any,
    thresholdValue: 500000,
    channels: ['WhatsApp', 'In-App'] as NotificationChannel[],
    enabled: true,
    messageTemplate: '🎉 High Sale Alert: Invoice #{{invoice_number}} of {{amount}} RWF completed.'
  });

  const categories: (NotificationCategory | 'All')[] = [
    'All', 'Sales', 'Purchases', 'Kitchen', 'Inventory', 'Hotel', 'Bar', 
    'Pool & Sauna', 'Cashier', 'Accounting', 'Staff', 'Security', 'Audit Logs', 
    'Maintenance', 'Reservations', 'Customers', 'Payments'
  ];

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, status: 'Read' as const }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    let updated: NotificationRule[];
    if (editingRule) {
      updated = rules.map(r => r.id === editingRule.id ? { ...r, ...ruleForm } : r);
    } else {
      const newRule: NotificationRule = {
        id: `rule-notif-${Date.now()}`,
        ...ruleForm,
        recipientIds: ['rec-1', 'rec-2'],
        createdAt: new Date().toISOString()
      };
      updated = [newRule, ...rules];
    }
    setRules(updated);
    saveNotificationRules(updated);
    setIsRuleModalOpen(false);
  };

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight">Real-Time Notification & Alert Center</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Automated multi-channel business triggers for Sales, Kitchen, Stock, Cashier Shortages, and Security Events.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center space-x-2 border border-slate-700"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleForm({
                  name: '',
                  category: 'Sales',
                  conditionField: 'sale_amount',
                  operator: '>',
                  thresholdValue: 500000,
                  channels: ['WhatsApp', 'In-App'],
                  enabled: true,
                  messageTemplate: '🎉 High Sale Alert: Invoice #{{invoice_number}} of {{amount}} RWF completed.'
                });
                setIsRuleModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Alert Rule</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-t border-slate-800 mt-6 pt-4">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'inbox' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Live Alert Feed ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Notification Rules ({rules.length})
          </button>
        </div>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  categoryFilter === cat 
                    ? 'bg-slate-900 text-white dark:bg-indigo-600' 
                    : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {notifications
              .filter(n => categoryFilter === 'All' || n.category === categoryFilter)
              .map(notif => (
                <div 
                  key={notif.id}
                  className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                    notif.status === 'Unread'
                      ? darkMode ? 'bg-indigo-950/20 border-indigo-800' : 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                      : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl text-white ${
                      notif.priority === 'Critical' ? 'bg-rose-500' :
                      notif.priority === 'High' ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {notif.category}
                        </span>
                        <h3 className="font-bold text-sm">{notif.title}</h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                        <span>{new Date(notif.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Channels: {notif.channels.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(rule => (
            <div 
              key={rule.id}
              className={`p-5 rounded-2xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                    {rule.category}
                  </span>
                  <h3 className="font-bold text-sm mt-2">{rule.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setEditingRule(rule);
                    setRuleForm({
                      name: rule.name,
                      category: rule.category,
                      conditionField: rule.conditionField,
                      operator: rule.operator,
                      thresholdValue: rule.thresholdValue,
                      channels: rule.channels,
                      enabled: rule.enabled,
                      messageTemplate: rule.messageTemplate
                    });
                    setIsRuleModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Trigger: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{rule.conditionField} {rule.operator} {rule.thresholdValue}</span>
              </p>

              <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Channels: {rule.channels.join(', ')}</span>
                <span className={`font-bold ${rule.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg">{editingRule ? 'Edit Notification Rule' : 'New Notification Rule'}</h3>
            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleForm.name}
                  onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="e.g. Large Sale Alert"
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={ruleForm.category}
                  onChange={e => setRuleForm({ ...ruleForm, category: e.target.value as NotificationCategory })}
                  className={`w-full p-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
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

              <div>
                <label className="block font-semibold mb-1">Message Template</label>
                <textarea
                  value={ruleForm.messageTemplate}
                  onChange={e => setRuleForm({ ...ruleForm, messageTemplate: e.target.value })}
                  rows={3}
                  className={`w-full p-2.5 rounded-xl border font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
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
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold"
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
