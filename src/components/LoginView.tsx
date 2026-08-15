import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, Hotel, Key, Eye, EyeOff, 
  ShieldCheck, CheckCircle2, AlertTriangle, User, Phone,
  Building2, Sparkles, CreditCard, Zap, Crown, ShieldAlert
} from 'lucide-react';
import { AppUser, SystemRole } from '../types';
import { loginUser, registerBusinessUser, logAudit } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { saveCurrentUser } from '../lib/storage';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  darkMode?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, darkMode = false }) => {
  // Login Mode State: 'email' | 'register'
  const [loginMode, setLoginMode] = useState<'email' | 'register'>('email');

  // Email/Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Business Registration Form State
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regBusinessId, setRegBusinessId] = useState('');
  const [isCustomBizId, setIsCustomBizId] = useState(false);
  const [regBusinessType, setRegBusinessType] = useState<'hotel' | 'restaurant' | 'bar' | 'cafe' | 'lounge'>('hotel');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPin, setRegPin] = useState('1234');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // General Auth State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security Cooldown System
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

  // Handle Failed Auth
  const handleAuthFailure = (reason: string, targetEmail: string) => {
    const newFailCount = failedAttempts + 1;
    setFailedAttempts(newFailCount);

    if (newFailCount >= 3) {
      setCooldownSeconds(20);
      setErrorMsg('Too many failed attempts. Security cooldown activated for 20 seconds.');
    } else {
      setErrorMsg(reason);
    }

    logAudit({
      userEmail: targetEmail || 'unknown',
      action: 'Failed Login Attempt',
      category: 'Auth',
      details: `Failed authentication attempt (${newFailCount}/3) - ${reason}`
    });
    setIsSubmitting(false);
  };

  // Handle Successful Auth
  const handleAuthSuccess = (loggedUser: AppUser, method: string) => {
    setFailedAttempts(0);
    setErrorMsg('');
    const updatedUser: AppUser = {
      ...loggedUser,
      lastLoginAt: new Date().toISOString()
    };
    saveCurrentUser(updatedUser);
    setIsSubmitting(false);
    onLoginSuccess(updatedUser);
  };

  // 1. Standard Email & Password Submit with Supabase Auth
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const result = await loginUser(cleanEmail, cleanPassword);

      if (result.success && result.user) {
        handleAuthSuccess(result.user, 'Supabase Auth');
      } else {
        handleAuthFailure(result.error || 'Invalid email address or password.', cleanEmail);
      }
    } catch (err: any) {
      handleAuthFailure(err.message || 'Authentication failed. Please try again.', cleanEmail);
    }
  };

  // 2. Register New Business Submit with Supabase Auth
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setErrorMsg('');
    setSuccessMsg('');

    const cleanFullName = regFullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();
    const cleanPin = regPin.trim() || '1234';
    const cleanBizName = regBusinessName.trim();

    if (!cleanBizName) {
      setErrorMsg('Please enter your Business or Hotel Name.');
      return;
    }

    if (!cleanFullName || !cleanEmail || !cleanPassword) {
      setErrorMsg('Please fill in all required manager details (Full Name, Email, and Password).');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Register New Business & Manager Profile in Supabase
      const regResult = await registerBusinessUser({
        businessName: cleanBizName,
        businessType: regBusinessType,
        businessId: regBusinessId.trim() || undefined,
        ownerFullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPassword,
        pin: cleanPin
      });

      if (!regResult.success || !regResult.user) {
        setErrorMsg(regResult.error || 'Registration failed.');
        setIsSubmitting(false);
        return;
      }

      if (regResult.requiresEmailConfirmation) {
        setSuccessMsg('Registration successful! Please check your email to confirm your account before logging in.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Business registered successfully! Redirecting to subscription license activation...`);
      setTimeout(() => {
        handleAuthSuccess(regResult.user!, 'Business Registration');
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-800'
    }`}>
      {/* Subtle Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Main Card Container */}
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">
          
          {/* Header Banner */}
          <div className="p-6 md:p-8 border-b border-slate-700/60 text-center relative bg-gradient-to-b from-slate-800 to-slate-800/80">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-3 shadow-inner">
              <Hotel className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              YusKar Management System
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Enterprise Hotel, Restaurant & Multi-Tenant Hospitality Operations Terminal
            </p>

            <div className="mt-4 flex items-center justify-center space-x-3 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-full text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Central Authentication Live</span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Supabase Cloud Auth</span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-900/50 p-1.5">
            <button
              id="tab-btn-signin"
              type="button"
              onClick={() => { setLoginMode('email'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                loginMode === 'email'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <button
              id="tab-btn-register-biz"
              type="button"
              onClick={() => { setLoginMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                loginMode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Register Business</span>
            </button>
          </div>

          {/* Form Content Body */}
          <div className="p-6 md:p-8">
            
            {/* Feedback Banners */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-rose-400 text-xs animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Authentication Notice</p>
                  <p className="mt-0.5 opacity-90">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Success</p>
                  <p className="mt-0.5 opacity-90">{successMsg}</p>
                </div>
              </div>
            )}

            {cooldownSeconds > 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center space-x-3 text-amber-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 animate-spin" />
                <p>Security lock active. Please wait <strong>{cooldownSeconds}s</strong> before retrying.</p>
              </div>
            )}

            {/* TAB 1: SIGN IN (STAFF, MANAGERS, SUPER ADMIN) */}
            {loginMode === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      id="signin-email-input"
                      required
                      value={email}
                      disabled={cooldownSeconds > 0}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@hotel.com or superadmin@system.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="signin-password-input"
                      required
                      value={password}
                      disabled={cooldownSeconds > 0}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                    />
                    <span>Keep session active on this terminal</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="signin-submit-btn"
                  disabled={isSubmitting || cooldownSeconds > 0}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Sign In to System</span>
                    </>
                  )}
                </button>

                {/* Staff Notice */}
                <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-400 text-center">
                  <span>Staff accounts (Cashier, Waiter, Receptionist, Kitchen, Accountant) are created directly by the Business Manager inside the management portal.</span>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Registering a new business facility?{' '}
                    <button
                      type="button"
                      onClick={() => { setLoginMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
                    >
                      Register Business
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER NEW BUSINESS */}
            {loginMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                
                {/* Business Info Header */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>New Business Registration</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                      Manager Account
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Creates your business profile and Manager administrative login. All employee accounts will share this business subscription.
                  </p>
                </div>

                {/* Business Details */}
                <div className="space-y-3 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-700/70">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Business / Hotel Name *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={regBusinessName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegBusinessName(val);
                            if (!isCustomBizId && val) {
                              const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                              setRegBusinessId(slug ? `biz-${slug}` : '');
                            }
                          }}
                          placeholder="e.g. Sky View Resort"
                          className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Business Category *
                      </label>
                      <select
                        value={regBusinessType}
                        onChange={(e) => setRegBusinessType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="hotel">Hotel & Resort</option>
                        <option value="restaurant">Restaurant & Dining</option>
                        <option value="bar">Bar & Lounge</option>
                        <option value="cafe">Coffee & Cafe</option>
                        <option value="lounge">Entertainment Lounge</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Business ID / Code
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Auto-generated or Custom</span>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={regBusinessId}
                        onChange={(e) => {
                          setIsCustomBizId(true);
                          setRegBusinessId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                        }}
                        placeholder="e.g. biz-sky-view"
                        className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Manager Account Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Manager Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Jean Paul Habimana"
                        className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Manager Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="manager@skyview.com"
                          className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+250 788 123 456"
                          className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Password (Min 6 chars) *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-8 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Manager 4-Digit Quick PIN (For Fast POS Access)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-amber-400 text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="register-business-submit-btn"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Register Business & Proceed to License Activation</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setLoginMode('email'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            )}

          </div>

          {/* Footer Security Badge */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-700/60 text-center text-slate-500 text-[11px] flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-end encrypted session • Multi-Tenant Isolation • YusKar 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};
