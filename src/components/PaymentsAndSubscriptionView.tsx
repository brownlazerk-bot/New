import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, Clock, Calendar, CheckCircle2, AlertTriangle, 
  RotateCw, Smartphone, Download, FileText, ArrowUpRight, History, 
  Building2, Phone, Hash, RefreshCw, Zap, Sparkles, KeyRound,
  Copy, Check, PhoneCall, Lock
} from 'lucide-react';
import { Business, Subscription, SubscriptionPayment, AppUser, SubscriptionLicense } from '../types';
import { 
  loadCurrentBusiness, loadSubscriptions, loadSubscriptionPayments, 
  saveSubscriptions, saveCurrentBusiness, evaluateSubscriptionMetrics 
} from '../lib/storage';
import { 
  SUBSCRIPTION_PLANS, activateBusinessWithLicense, 
  loadStoredLicenses, SubscriptionPlanConfig 
} from '../lib/license';

interface PaymentsAndSubscriptionViewProps {
  currentUser: AppUser;
  darkMode?: boolean;
}

export const PaymentsAndSubscriptionView: React.FC<PaymentsAndSubscriptionViewProps> = ({
  currentUser,
  darkMode = false
}) => {
  const [business, setBusiness] = useState<Business>(() => loadCurrentBusiness());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadSubscriptions());
  const [payments, setPayments] = useState<SubscriptionPayment[]>(() => loadSubscriptionPayments());
  const [licenses, setLicenses] = useState<SubscriptionLicense[]>(() => loadStoredLicenses());
  
  // Current subscription for active business
  const currentSub = subscriptions.find(s => s.businessId === business.id) || subscriptions[0];
  const metrics = evaluateSubscriptionMetrics(currentSub);

  // License Activation Modal State
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);
  const [licenseFeedback, setLicenseFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedMoMo, setCopiedMoMo] = useState(false);

  // Business licenses list
  const businessLicenses = licenses.filter(l => l.businessId === business.id);

  // Format license input with dashes
  const handleLicenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 12) val = val.slice(0, 12);
    const parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.slice(i, i + 4));
    }
    setLicenseInput(parts.join('-'));
  };

  const handleActivateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    setIsActivatingLicense(true);
    setLicenseFeedback(null);

    try {
      const res = await activateBusinessWithLicense(business.id, licenseInput.trim(), currentUser);
      if (res.success && res.business && res.subscription) {
        setLicenseFeedback({ type: 'success', text: res.message || 'License activated successfully!' });
        setBusiness(res.business);
        setSubscriptions(loadSubscriptions());
        setLicenses(loadStoredLicenses());
        setTimeout(() => {
          setShowLicenseModal(false);
          setLicenseInput('');
          setLicenseFeedback(null);
        }, 1500);
      } else {
        setLicenseFeedback({ type: 'error', text: res.error || 'Failed to activate license.' });
      }
    } catch (err: any) {
      setLicenseFeedback({ type: 'error', text: err.message || 'License verification failed.' });
    } finally {
      setIsActivatingLicense(false);
    }
  };

  const handleCopyMoMo = () => {
    navigator.clipboard.writeText('0726134041');
    setCopiedMoMo(true);
    setTimeout(() => setCopiedMoMo(false), 2500);
  };

  const plansList = Object.values(SUBSCRIPTION_PLANS);

  // Days calculation
  const expiryDate = currentSub?.expiryDate ? new Date(currentSub.expiryDate) : null;
  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const isExpiringSoon = daysLeft <= 5 && daysLeft > 0;
  const isExpired = daysLeft <= 0 && Boolean(expiryDate);

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Business License Authority
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Business Subscription & Licensing</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centralized SaaS license status, plan renewals, and payment verification for <strong>{business.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLicenseModal(true)}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Renew / Enter License Code</span>
          </button>
        </div>
      </div>

      {/* Main License Overview Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } shadow-xl relative overflow-hidden`}>
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          
          {/* Left info */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">{business.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                  <span>Business ID: {business.code || business.id}</span>
                  <span>•</span>
                  <span>{business.category || 'Hotel & Hospitality'}</span>
                </div>
              </div>
            </div>

            {/* Single subscription policy */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Enterprise Unified License: </span>
                <span>
                  All staff members (Cashiers, Waiters, Accountants, Receptionists, Kitchen staff) inherit access from this single business subscription.
                </span>
              </div>
            </div>
          </div>

          {/* Right Status Block */}
          <div className={`lg:col-span-5 p-6 rounded-2xl border ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          } flex flex-col justify-between space-y-4`}>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                business.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : business.status === 'PENDING_PAYMENT'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {business.status || 'ACTIVE'}
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight">
                  {daysLeft > 0 ? `${daysLeft} Days` : isExpired ? 'Expired' : 'Active'}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {expiryDate ? `Expires: ${expiryDate.toLocaleDateString()}` : 'Standard Active'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isExpired ? 'bg-rose-500 w-full' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, (daysLeft / 30) * 100))}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowLicenseModal(true)}
              className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter New License Code</span>
            </button>
          </div>

        </div>
      </div>

      {/* Subscription Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">Available Subscription Plans</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upgrade or renew with our standard durations. Pay via MTN MoMo and enter your license code.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plansList.map(plan => (
            <div 
              key={plan.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              } hover:border-amber-500/40`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {plan.badge}
                  </span>
                  {plan.id === 'YEARLY' && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Best Value
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">{plan.amount.toLocaleString()}</span>
                    <span className="text-xs font-bold text-amber-500">RWF</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{plan.description}</p>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>All Employees Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Multi-Device Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Cloud Backup & Sync</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setShowLicenseModal(true)}
                className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-amber-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-amber-500 dark:hover:text-slate-950 transition flex items-center justify-center gap-1.5"
              >
                <span>Renew with this Plan</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Official MoMo Payment Details */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } flex flex-col md:flex-row items-center justify-between gap-6`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
            <Smartphone className="w-4 h-4" />
            <span>Official MTN MoMo Recipient (Rwanda)</span>
          </div>
          <p className="text-xl font-mono font-black tracking-wider">0726134041</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account Name: <strong>Smart Hospitality Cloud / YusKar Billing</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyMoMo}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            {copiedMoMo ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedMoMo ? 'Copied Number!' : 'Copy MoMo Number'}</span>
          </button>

          <a
            href="https://wa.me/250726134041?text=Hello%20Super%20Admin,%20I%20have%20paid%20the%20subscription%20for%20"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Contact Super Admin on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* License History Table */}
      {businessLicenses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black tracking-tight">Issued Business Licenses</h2>
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">License Code</th>
                  <th className="py-3 px-4">Plan & Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Activated At</th>
                  <th className="py-3 px-4">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {businessLicenses.map(lic => (
                  <tr key={lic.id}>
                    <td className="py-3 px-4 font-mono font-bold text-amber-500">{lic.licenseCode}</td>
                    <td className="py-3 px-4 font-semibold">{lic.durationDays} Days ({lic.plan})</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lic.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {lic.activatedAt ? new Date(lic.activatedAt).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENEW / ENTER LICENSE MODAL */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">Activate License Code</h3>
              </div>
              <button
                onClick={() => { setShowLicenseModal(false); setLicenseFeedback(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateLicenseSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  12-Character License Code
                </label>
                <input
                  type="text"
                  value={licenseInput}
                  onChange={handleLicenseInputChange}
                  placeholder="e.g. SVR7-X92K-4M8P"
                  className="w-full px-4 py-3 rounded-xl border-2 font-mono text-base font-bold tracking-widest uppercase bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:border-amber-500 focus:outline-none text-center"
                  maxLength={14}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Single-use code issued by the Super Admin upon verified MoMo payment.
                </p>
              </div>

              {licenseFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  licenseFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {licenseFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{licenseFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isActivatingLicense || !licenseInput.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isActivatingLicense ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Authority...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Apply License Activation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
