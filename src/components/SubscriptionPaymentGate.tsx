import React, { useState } from 'react';
import { 
  KeyRound, ShieldCheck, Clock, Building2, CheckCircle2, 
  AlertTriangle, PhoneCall, Sparkles, Lock, LogOut, ArrowRight,
  RefreshCw, Check, Zap, Smartphone, ExternalLink, HelpCircle,
  Copy, ShieldAlert
} from 'lucide-react';
import { Business, Subscription, AppUser, SubscriptionPlanDuration } from '../types';
import { 
  SUBSCRIPTION_PLANS, activateBusinessWithLicense, 
  SubscriptionPlanConfig 
} from '../lib/license';
import { loadCurrentBusiness, saveCurrentBusiness, loadSubscriptions, saveSubscriptions } from '../lib/storage';

interface SubscriptionPaymentGateProps {
  currentUser: AppUser;
  currentBusiness?: Business | null;
  onSubscriptionActivated: (updatedBusiness: Business, updatedSub: Subscription) => void;
  onLogout: () => void;
  darkMode?: boolean;
}

export const SubscriptionPaymentGate: React.FC<SubscriptionPaymentGateProps> = ({
  currentUser,
  currentBusiness,
  onSubscriptionActivated,
  onLogout,
  darkMode = true
}) => {
  const [business, setBusiness] = useState<Business>(() => {
    return currentBusiness || loadCurrentBusiness();
  });

  const [activeTab, setActiveTab] = useState<'license' | 'pricing' | 'superadmin'>('license');
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Super Admin Emergency Bypass
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [bypassReason, setBypassReason] = useState('Super Admin Terminal Unlock');
  const [bypassDays, setBypassDays] = useState(30);
  const [isSubmittingBypass, setIsSubmittingBypass] = useState(false);
  const [bypassError, setBypassError] = useState('');
  const [copiedMoMo, setCopiedMoMo] = useState(false);

  // Format license input with dashes (e.g. YUSK-XXXX-XXXX)
  const handleLicenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 12) val = val.slice(0, 12);
    
    // Group into 4-4-4
    const parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.slice(i, i + 4));
    }
    setLicenseInput(parts.join('-'));
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) {
      setActivationMessage({ type: 'error', text: 'Please enter your business license code.' });
      return;
    }

    setIsActivating(true);
    setActivationMessage(null);

    try {
      const res = await activateBusinessWithLicense(business.id, licenseInput.trim(), currentUser);
      
      if (res.success && res.business && res.subscription) {
        setActivationMessage({ type: 'success', text: res.message || 'License activated successfully!' });
        setTimeout(() => {
          onSubscriptionActivated(res.business!, res.subscription!);
        }, 1500);
      } else {
        setActivationMessage({ type: 'error', text: res.error || 'Invalid or unassigned license code.' });
      }
    } catch (err: any) {
      setActivationMessage({ type: 'error', text: err.message || 'Failed to communicate with license authority.' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleSuperAdminBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBypass(true);
    setBypassError('');

    try {
      // Direct emergency unlock
      const now = new Date();
      const newExpiry = new Date(now.getTime() + bypassDays * 24 * 60 * 60 * 1000);

      const updatedBiz: Business = {
        ...business,
        status: 'ACTIVE',
        updatedAt: now.toISOString()
      };

      const updatedSub: Subscription = {
        id: `SUB-${business.id}`,
        businessId: business.id,
        businessName: business.name,
        planName: `${bypassDays}-Day Enterprise Access`,
        plan: 'ENTERPRISE',
        amount: 100000,
        currency: 'RWF',
        status: 'ACTIVE',
        startDate: now.toISOString(),
        expiryDate: newExpiry.toISOString(),
        expiresAt: newExpiry.toISOString(),
        nextBillingDate: newExpiry.toISOString(),
        gracePeriodDays: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      const allBiz = loadCurrentBusiness();
      saveCurrentBusiness(updatedBiz);

      const allSubs = loadSubscriptions();
      const updatedSubs = allSubs.map(s => s.businessId === business.id ? updatedSub : s);
      if (!updatedSubs.some(s => s.businessId === business.id)) {
        updatedSubs.push(updatedSub);
      }
      saveSubscriptions(updatedSubs);

      setActivationMessage({ type: 'success', text: `Super Admin emergency unlock applied for ${bypassDays} days.` });
      setTimeout(() => {
        onSubscriptionActivated(updatedBiz, updatedSub);
      }, 1000);
    } catch (err: any) {
      setBypassError(err.message || 'Bypass failed.');
    } finally {
      setIsSubmittingBypass(false);
    }
  };

  const handleCopyMoMo = () => {
    navigator.clipboard.writeText('0726134041');
    setCopiedMoMo(true);
    setTimeout(() => setCopiedMoMo(false), 2500);
  };

  const plansList = Object.values(SUBSCRIPTION_PLANS);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                YusKar Business Subscription
              </h1>
              <p className="text-xs text-slate-400">Enterprise License & Terminal Activation Authority</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-white">{business?.name || 'Business Account'}</span>
              <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-400">
                {business?.code || business?.id || 'BIZ-01'}
              </span>
            </div>

            <button
              id="subscription-gate-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 flex flex-col justify-center">
        
        {/* Banner Alert for Business Subscription Status */}
        <div className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-300">Business Subscription Required for Terminal Operations</h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                <strong>{business?.name || 'Your business'}</strong> requires an active subscription license. 
                All employees (Managers, Cashiers, Waiters, Kitchen, Reception) share this single business subscription.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {business?.status || 'PENDING_PAYMENT'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
          <button
            id="tab-activate-license"
            onClick={() => setActiveTab('license')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'license'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Enter License Code</span>
          </button>

          <button
            id="tab-view-pricing"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pricing'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Subscription Plans & MoMo Payment</span>
          </button>

          <button
            id="tab-admin-bypass"
            onClick={() => setActiveTab('superadmin')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ml-auto transition-all ${
              activeTab === 'superadmin'
                ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Super Admin Terminal Unlock</span>
          </button>
        </div>

        {/* TAB 1: ACTIVATE WITH LICENSE CODE */}
        {activeTab === 'license' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Card: Input Form */}
            <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl">
              <div>
                <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Activate Business License</h2>
                    <p className="text-xs text-slate-400">Enter the cryptographic license code issued for your business</p>
                  </div>
                </div>

                <form onSubmit={handleActivateLicense} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Business License Code (12 Characters)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="license-code-input"
                        value={licenseInput}
                        onChange={handleLicenseInputChange}
                        placeholder="e.g. SVR7-X92K-4M8P"
                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-amber-500 text-white font-mono text-lg font-bold tracking-widest uppercase transition placeholder:text-slate-600 focus:outline-none"
                        maxLength={14}
                        required
                        autoFocus
                      />
                      <div className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-mono font-bold uppercase">
                        CODE
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      License codes are generated and verified exclusively for <strong>{business?.name || 'this business'}</strong>.
                    </p>
                  </div>

                  {/* Feedback Message */}
                  {activationMessage && (
                    <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                      activationMessage.type === 'success'
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                    }`}>
                      {activationMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <p className="font-medium leading-relaxed">{activationMessage.text}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    id="activate-license-submit-btn"
                    disabled={isActivating || !licenseInput.trim()}
                    className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying License Authority...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-slate-950" />
                        <span>Activate Business Subscription</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Single Subscription Architecture Rule */}
              <div className="mt-8 pt-5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Single Business License Policy</span>
                </div>
                <p>
                  Once activated, all employees (Cashiers, Waiters, Accountants, Kitchen, Reception) will immediately inherit full access without individual subscription fees.
                </p>
              </div>
            </div>

            {/* Right Card: How to get code / MoMo Contact */}
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    Need a License Code?
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">Instant License Issuance via MTN MoMo</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Pay via MTN Mobile Money to receive your single-use cryptographic license code.
                  </p>
                </div>

                {/* MoMo Number Box */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      MTN MoMo Recipient (Rwanda)
                    </span>
                    <button
                      onClick={handleCopyMoMo}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center gap-1"
                    >
                      {copiedMoMo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedMoMo ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-mono font-black text-white tracking-wider">0726134041</span>
                    <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">MTN RW</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Account Name: <strong>Smart Hospitality Cloud / YusKar</strong>
                  </p>
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </div>
                    <span>Send the subscription amount for your selected plan to <strong>0726134041</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </div>
                    <span>Contact Super Admin on WhatsApp with your payment SMS reference and business name.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </div>
                    <span>Enter the delivered license code on this screen to instantly unlock all terminals.</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Support Button */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <a
                  href="https://wa.me/250726134041?text=Hello%20Super%20Admin,%20I%20want%20to%20activate%20my%20business%20subscription%20for%20"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Contact Super Admin on WhatsApp (+250 726 134 041)</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SUBSCRIPTION PLANS & PRICING */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-xl font-black text-white">Select Your Business Subscription Plan</h2>
              <p className="text-xs text-slate-400">
                All plans include unlimited POS terminals, kitchen order routing, stock management, and full multi-user access.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plansList.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                    plan.id === 'MONTHLY'
                      ? 'bg-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {plan.badge}
                      </span>
                      {plan.id === 'YEARLY' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Best Value
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <div className="mt-3 mb-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {plan.amount.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-400">RWF</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {plan.durationDays} Days Total Validity
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300 my-4 border-t border-slate-800 pt-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>All Staff Accounts Included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Unlimited Orders & POS</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Daily Financial Reports</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setActiveTab('license')}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition flex items-center justify-center gap-1.5 mt-4"
                  >
                    <span>Enter License Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Official MoMo Info Banner */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Payment via MTN Mobile Money (Rwanda)</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Send subscription amount to Merchant Number <strong>0726134041</strong> and request your license key.
                </p>
              </div>
              <button
                onClick={handleCopyMoMo}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedMoMo ? 'Copied Number!' : 'Copy 0726134041'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUPER ADMIN DIRECT UNLOCK */}
        {activeTab === 'superadmin' && (
          <div className="max-w-xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Super Admin Direct Terminal Unlock</h2>
                <p className="text-xs text-slate-400">Emergency administrative override for testing & maintenance</p>
              </div>
            </div>

            <form onSubmit={handleSuperAdminBypass} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Extension Duration
                </label>
                <select
                  value={bypassDays}
                  onChange={(e) => setBypassDays(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                  <option value={180}>180 Days (Semi-Annual)</option>
                  <option value={365}>365 Days (1 Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Override
                </label>
                <input
                  type="text"
                  value={bypassReason}
                  onChange={(e) => setBypassReason(e.target.value)}
                  placeholder="e.g. Master system provisioning / Super admin test"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {bypassError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs">
                  {bypassError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingBypass}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmittingBypass ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying Direct Terminal Unlock...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Apply Super Admin Unlock ({bypassDays} Days)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 text-center text-xs text-slate-500">
        <p>YusKar Management System • Central Licensing Authority • MTN MoMo Rwanda: 0726134041</p>
      </footer>

    </div>
  );
};
