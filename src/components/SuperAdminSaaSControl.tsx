import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, DollarSign, Users, AlertTriangle, 
  CheckCircle2, Clock, Search, Filter, KeyRound, Smartphone, 
  RefreshCw, Download, Settings, Sliders, ExternalLink, Calendar,
  ArrowUpRight, Plus, Eye, History, Lock, Unlock, Sparkles, MessageSquare
} from 'lucide-react';
import { Business, Subscription, SubscriptionPayment, SubscriptionOverrideRecord, MomoApiConfig, AppUser } from '../types';
import { 
  SAAS_MONTHLY_FEE, SAAS_MOMO_MERCHANT_NUMBER,
  loadBusinesses, saveBusinesses, loadSubscriptions, saveSubscriptions,
  loadSubscriptionPayments, saveSubscriptionPayments, loadSubscriptionOverrides,
  saveSubscriptionOverrides, apiSuperAdminGetSaaSStats, apiSuperAdminOverride,
  apiSuperAdminSetGracePeriod, apiSuperAdminGetMomoConfig, apiSuperAdminSaveMomoConfig,
  evaluateSubscriptionMetrics, addAuditLog
} from '../lib/storage';

interface SuperAdminSaaSControlProps {
  currentUser: AppUser;
  darkMode?: boolean;
}

export const SuperAdminSaaSControl: React.FC<SuperAdminSaaSControlProps> = ({
  currentUser,
  darkMode = false
}) => {
  const [businesses, setBusinesses] = useState<Business[]>(() => loadBusinesses());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadSubscriptions());
  const [payments, setPayments] = useState<SubscriptionPayment[]>(() => loadSubscriptionPayments());
  const [overrides, setOverrides] = useState<SubscriptionOverrideRecord[]>(() => loadSubscriptionOverrides());
  const [momoConfig, setMomoConfig] = useState<MomoApiConfig>({
    primarySubscriptionKey: 'momo-rw-sub-key-2026',
    apiUser: 'momo-rw-api-user-01',
    apiKey: '••••••••••••••••',
    environment: 'sandbox',
    merchantNumber: SAAS_MOMO_MERCHANT_NUMBER,
    subscriptionAmount: SAAS_MONTHLY_FEE
  });

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'PAYMENTS' | 'OVERRIDES' | 'MOMO_CONFIG'>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Business for Override Modal
  const [selectedBizForOverride, setSelectedBizForOverride] = useState<Business | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideDays, setOverrideDays] = useState(14);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Selected Business for Grace Period Modal
  const [selectedBizForGrace, setSelectedBizForGrace] = useState<Business | null>(null);
  const [graceDaysInput, setGraceDaysInput] = useState(0);

  // New Business Modal
  const [showAddBizModal, setShowAddBizModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwner, setNewBizOwner] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizEmail, setNewBizEmail] = useState('');
  const [newBizCategory, setNewBizCategory] = useState<'Hotel' | 'Restaurant' | 'Bar' | 'Resort' | 'Cafe'>('Hotel');

  // Load from backend if available
  useEffect(() => {
    fetchBackendStats();
  }, []);

  const fetchBackendStats = async () => {
    try {
      const data = await apiSuperAdminGetSaaSStats();
      if (data.success) {
        if (data.businesses) setBusinesses(data.businesses);
        if (data.subscriptions) setSubscriptions(data.subscriptions);
        if (data.payments) setPayments(data.payments);
        if (data.overrides) setOverrides(data.overrides);
        if (data.momoConfig) setMomoConfig(data.momoConfig);
      }
    } catch (err) {
      console.warn('Using local SaaS database state:', err);
    }
  };

  // KPI Calculations
  const totalBusinesses = businesses.length;
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE').length;
  const pendingSubs = subscriptions.filter(s => s.status === 'PENDING_PAYMENT').length;
  const expiredSubs = subscriptions.filter(s => s.status === 'EXPIRED').length;
  const totalRevenue = payments
    .filter(p => p.status === 'SUCCESSFUL')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthlyRecurringRevenue = activeSubs * SAAS_MONTHLY_FEE;

  // Filtered Businesses
  const filteredBusinesses = businesses.filter(b => {
    const sub = subscriptions.find(s => s.businessId === b.id);
    const metrics = evaluateSubscriptionMetrics(sub);
    
    const matchesSearch = 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'ALL' || 
      metrics.status === statusFilter ||
      b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Manual Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizForOverride) return;

    if (!adminPassword || !overrideReason.trim()) {
      setOverrideError('Super Admin password and justification reason are strictly required.');
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideError('');

    try {
      const res = await apiSuperAdminOverride({
        businessId: selectedBizForOverride.id,
        adminEmail: currentUser.email || '',
        adminPassword: adminPassword.trim(),
        reason: overrideReason.trim(),
        daysGranted: overrideDays
      });

      if (res.success) {
        alert(`Emergency override granted to ${selectedBizForOverride.name} for ${overrideDays} days.`);
        setSelectedBizForOverride(null);
        setAdminPassword('');
        setOverrideReason('');
        fetchBackendStats();
      } else {
        setOverrideError(res.error || 'Failed to authorize override.');
      }
    } catch (err: any) {
      setOverrideError(err.message || 'Error granting override.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Handle Grace Period Update
  const handleUpdateGracePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizForGrace) return;

    try {
      const res = await apiSuperAdminSetGracePeriod(selectedBizForGrace.id, graceDaysInput);
      if (res.success) {
        alert(`Grace period for ${selectedBizForGrace.name} updated to ${graceDaysInput} days.`);
        setSelectedBizForGrace(null);
        fetchBackendStats();
      }
    } catch (err) {
      alert('Failed to update grace period.');
    }
  };

  // Handle Save MoMo Gateway Config
  const handleSaveMomoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiSuperAdminSaveMomoConfig(momoConfig);
      if (res.success) {
        alert('MTN MoMo Gateway settings updated successfully!');
      }
    } catch (err) {
      alert('Failed to save MoMo configuration.');
    }
  };

  // Create Business
  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newBizOwner.trim()) {
      alert('Business name and owner name are required.');
      return;
    }

    const newId = `biz-${Date.now()}`;
    const code = `BIZ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBiz: Business = {
      id: newId,
      name: newBizName.trim(),
      code,
      category: newBizCategory,
      ownerName: newBizOwner.trim(),
      phone: newBizPhone.trim() || '+250 780 000 000',
      email: newBizEmail.trim() || `${code.toLowerCase()}@hotel.rw`,
      momoPaymentNumber: SAAS_MOMO_MERCHANT_NUMBER,
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      subscriptionId: `SUB-${newId}`,
      createdAt: new Date().toISOString()
    };

    const newSub: Subscription = {
      id: `SUB-${newId}`,
      businessId: newId,
      businessName: newBiz.name,
      planName: 'Monthly SaaS Business License',
      amount: SAAS_MONTHLY_FEE,
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      gracePeriodDays: 0,
      nextPaymentAmount: SAAS_MONTHLY_FEE,
      createdAt: new Date().toISOString()
    };

    const updatedBizList = [newBiz, ...businesses];
    const updatedSubList = [newSub, ...subscriptions];

    setBusinesses(updatedBizList);
    setSubscriptions(updatedSubList);
    saveBusinesses(updatedBizList);
    saveSubscriptions(updatedSubList);

    setShowAddBizModal(false);
    setNewBizName('');
    setNewBizOwner('');
    setNewBizPhone('');
    setNewBizEmail('');
    alert(`Business "${newBiz.name}" created with status PENDING_PAYMENT. It will require 100,000 RWF MoMo payment to activate.`);
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">Super Admin SaaS Control Panel</h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MASTER ROOT ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-Tenant Subscriptions, MTN MoMo Gateway (0726134041) & Financial Revenue Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddBizModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Business Tenant</span>
          </button>
          <button
            onClick={fetchBackendStats}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh All Database Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Total Businesses */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Tenants</span>
          <div className="text-2xl font-extrabold text-white mt-1">{totalBusinesses}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Registered properties</p>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Active</span>
          <div className="text-2xl font-extrabold text-emerald-300 mt-1">{activeSubs}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Paid & operational</p>
        </div>

        {/* Pending Payment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Pending</span>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">{pendingSubs}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting first MoMo</p>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Expired</span>
          <div className="text-2xl font-extrabold text-rose-300 mt-1">{expiredSubs}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Restricted access</p>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Est. MRR</span>
          <div className="text-lg font-extrabold text-white mt-1 font-mono">
            {(monthlyRecurringRevenue / 1000).toLocaleString()}k <span className="text-xs text-blue-400">RWF</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Monthly revenue base</p>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Revenue</span>
          <div className="text-lg font-extrabold text-amber-300 mt-1 font-mono">
            {totalRevenue.toLocaleString()} <span className="text-xs">RWF</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime MoMo settled</p>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'DIRECTORY'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Tenant Subscriptions Directory ({businesses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'PAYMENTS'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>All MoMo Payment Transactions ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('OVERRIDES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'OVERRIDES'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Super Admin Override Logs ({overrides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MOMO_CONFIG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'MOMO_CONFIG'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>MTN MoMo Gateway API Settings</span>
        </button>
      </div>

      {/* TAB 1: BUSINESS TENANT DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business, owner, phone..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Paid)</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="EXPIRED">Expired</option>
                <option value="GRACE_PERIOD">Grace Period</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Business Tenant</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Owner & Contact</th>
                  <th className="p-3.5">Subscription Status</th>
                  <th className="p-3.5">Expiry Date</th>
                  <th className="p-3.5">Days Left</th>
                  <th className="p-3.5">Grace Period</th>
                  <th className="p-3.5 rounded-r-xl text-right">Master Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBusinesses.map((b) => {
                  const sub = subscriptions.find(s => s.businessId === b.id);
                  const metrics = evaluateSubscriptionMetrics(sub);

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{b.name}</div>
                        <div className="font-mono text-[10px] text-amber-400">{b.code || b.id}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
                          {b.category || 'Hotel'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{b.ownerName || 'Admin'}</div>
                        <div className="text-slate-400 text-[11px]">{b.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          metrics.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : metrics.status === 'GRACE_PERIOD'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {metrics.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'None'}
                      </td>
                      <td className="p-3.5 font-bold">
                        <span className={metrics.daysRemaining > 3 ? 'text-emerald-400' : 'text-rose-400'}>
                          {metrics.daysRemaining}d
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            setSelectedBizForGrace(b);
                            setGraceDaysInput(sub?.gracePeriodDays || 0);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-mono"
                        >
                          {sub?.gracePeriodDays || 0} Days
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBizForOverride(b);
                            setOverrideDays(14);
                            setOverrideReason('');
                            setOverrideError('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Emergency Override</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL MOMO PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span>All Multi-Tenant Subscription Payments</span>
            </h3>
            <span className="text-xs text-slate-400">Total: {payments.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Timestamp</th>
                  <th className="p-3.5">Business Name</th>
                  <th className="p-3.5">Amount (RWF)</th>
                  <th className="p-3.5">Payer Phone</th>
                  <th className="p-3.5">Recipient (MoMo)</th>
                  <th className="p-3.5">Payment Reference</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl">Verified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3.5 font-mono text-slate-300">
                      {new Date(p.paidAt || p.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-white">{p.businessName || 'Hotel Tenant'}</td>
                    <td className="p-3.5 font-bold text-amber-400 font-mono">
                      {p.amount.toLocaleString()} RWF
                    </td>
                    <td className="p-3.5 font-mono">{p.payerPhone || 'N/A'}</td>
                    <td className="p-3.5 font-mono text-yellow-400">{p.recipientPhone || SAAS_MOMO_MERCHANT_NUMBER}</td>
                    <td className="p-3.5 font-mono text-slate-300">{p.paymentReference}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        p.status === 'SUCCESSFUL'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{p.verifiedBy || 'Gateway API'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OVERRIDE LOGS */}
      {activeTab === 'OVERRIDES' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Super Admin Manual Override Audit Trail</span>
            </h3>
            <span className="text-xs text-slate-400">Strict Immutable Ledger</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Date & Time</th>
                  <th className="p-3.5">Business</th>
                  <th className="p-3.5">Authorized By</th>
                  <th className="p-3.5">Days Granted</th>
                  <th className="p-3.5 rounded-r-xl">Mandatory Justification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No manual overrides recorded. System has operated strictly on automated MoMo payments.
                    </td>
                  </tr>
                ) : (
                  overrides.map((ov) => (
                    <tr key={ov.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-mono text-slate-300">
                        {new Date(ov.grantedAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-bold text-white">{ov.businessId}</td>
                      <td className="p-3.5 font-mono text-amber-400">{ov.authorizedBy}</td>
                      <td className="p-3.5 font-bold text-emerald-400">{ov.daysGranted} Days</td>
                      <td className="p-3.5 text-slate-300 italic">"{ov.reason}"</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MOMO GATEWAY CONFIG */}
      {activeTab === 'MOMO_CONFIG' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl max-w-3xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-yellow-400" />
              <span>MTN Mobile Money Gateway API Settings (Rwanda)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure official MTN MoMo Collections API credentials to automate 100,000 RWF payments.
            </p>
          </div>

          <form onSubmit={handleSaveMomoConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Official Merchant MoMo Number</label>
                <input
                  type="text"
                  value={momoConfig.merchantNumber}
                  onChange={(e) => setMomoConfig({ ...momoConfig, merchantNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Subscription Rate (RWF)</label>
                <input
                  type="number"
                  value={momoConfig.subscriptionAmount}
                  onChange={(e) => setMomoConfig({ ...momoConfig, subscriptionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">MTN Primary Subscription Key</label>
                <input
                  type="password"
                  value={momoConfig.primarySubscriptionKey}
                  onChange={(e) => setMomoConfig({ ...momoConfig, primarySubscriptionKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">API User (X-Reference-Id)</label>
                <input
                  type="text"
                  value={momoConfig.apiUser}
                  onChange={(e) => setMomoConfig({ ...momoConfig, apiUser: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">API Key / Secret</label>
                <input
                  type="password"
                  value={momoConfig.apiKey}
                  onChange={(e) => setMomoConfig({ ...momoConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Gateway Environment</label>
                <select
                  value={momoConfig.environment}
                  onChange={(e) => setMomoConfig({ ...momoConfig, environment: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="sandbox">Sandbox (Testing / Demo Simulation)</option>
                  <option value="production">Production (Live MTN MoMo Rwanda)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                Save MoMo API Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EMERGENCY OVERRIDE */}
      {selectedBizForOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <KeyRound className="w-5 h-5" />
                <span>Super Admin Emergency Override</span>
              </div>
              <button onClick={() => setSelectedBizForOverride(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-4">
              <p className="text-xs text-slate-300">
                Grant temporary license to <strong>{selectedBizForOverride.name}</strong> without automated MoMo verification.
              </p>

              {overrideError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700 text-rose-300 text-xs">
                  {overrideError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Super Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Pksquare@1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Duration Granted</label>
                <select
                  value={overrideDays}
                  onChange={(e) => setOverrideDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value={3}>3 Days Emergency Extension</option>
                  <option value={7}>7 Days One-Week License</option>
                  <option value={14}>14 Days Grace Override</option>
                  <option value={30}>30 Days Full Month Access</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mandatory Justification Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Paid in Cash / Bank transfer confirmation received"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBizForOverride(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition"
                >
                  {isSubmittingOverride ? 'Authorizing...' : 'Authorize Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRACE PERIOD */}
      {selectedBizForGrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Set Grace Period Days</h4>
              <button onClick={() => setSelectedBizForGrace(null)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleUpdateGracePeriod} className="mt-4 space-y-3">
              <p className="text-xs text-slate-400">
                Set allowable grace days after expiration for <strong>{selectedBizForGrace.name}</strong> (Default: 0 days).
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Grace Period Days</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={graceDaysInput}
                  onChange={(e) => setGraceDaysInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBizForGrace(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl"
                >
                  Save Grace Days
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW BUSINESS */}
      {showAddBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Register New Business Tenant</h4>
              <button onClick={() => setShowAddBizModal(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreateBusiness} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Business / Property Name</label>
                <input
                  type="text"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="e.g. Serena Vista Hotel & Lounge"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={newBizCategory}
                  onChange={(e) => setNewBizCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="Hotel">Hotel</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Bar">Bar & Lounge</option>
                  <option value="Resort">Resort & Spa</option>
                  <option value="Cafe">Cafe & Bistro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Owner / Manager Full Name</label>
                <input
                  type="text"
                  value={newBizOwner}
                  onChange={(e) => setNewBizOwner(e.target.value)}
                  placeholder="e.g. Jean Paul Mugisha"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Owner Contact Phone</label>
                <input
                  type="tel"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={newBizEmail}
                  onChange={(e) => setNewBizEmail(e.target.value)}
                  placeholder="manager@hotel.rw"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ℹ️ The new business will be created in <strong>PENDING_PAYMENT</strong> status and must pay 100,000 RWF via MTN MoMo to activate.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBizModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl"
                >
                  Register Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
