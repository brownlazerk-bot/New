import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, ShieldAlert, Hotel, Key, Eye, EyeOff, 
  ShieldCheck, CheckCircle2, AlertTriangle, UserPlus, User, Phone
} from 'lucide-react';
import { AppUser, SystemRole } from '../types';
import { 
  SUPER_ADMIN_CREDENTIALS, loadUsers, saveUsers, addAuditLog, saveCurrentUser, INITIAL_STAFF_USERS 
} from '../lib/storage';

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

  // Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<SystemRole>('Cashier');
  const [regPin, setRegPin] = useState('1234');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // General Auth State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security Cooldown System
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Load active staff accounts
  const [staffUsers, setStaffUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const loaded = loadUsers();
    setStaffUsers(loaded.length > 0 ? loaded : INITIAL_STAFF_USERS);
  }, []);

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

    addAuditLog({
      userId: 'anonymous',
      userName: 'Guest',
      userRole: 'Visitor',
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
    addAuditLog({
      userId: updatedUser.id,
      userName: updatedUser.fullName,
      userRole: updatedUser.role,
      userEmail: updatedUser.email,
      action: 'User Login',
      category: 'Auth',
      details: `${updatedUser.role} authenticated via ${method}`
    });
    setIsSubmitting(false);
    onLoginSuccess(updatedUser);
  };

  // 1. Standard Email & Password Submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setTimeout(() => {
      // Check Super Admin Hidden Account
      if (
        cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() &&
        cleanPassword === SUPER_ADMIN_CREDENTIALS.passwordHash
      ) {
        handleAuthSuccess(SUPER_ADMIN_CREDENTIALS, 'Super Admin Secret Auth');
        return;
      }

      // Check Standard Users
      const users = loadUsers();
      const foundUser = users.find(
        u => u.email.toLowerCase() === cleanEmail && u.passwordHash === cleanPassword
      );

      if (foundUser) {
        if (foundUser.status !== 'Active') {
          handleAuthFailure(`Account is ${foundUser.status.toLowerCase()}. Please contact Administrator.`, cleanEmail);
          return;
        }
        handleAuthSuccess(foundUser, 'Standard Email/Password');
        return;
      }

      handleAuthFailure('Invalid email address or password.', cleanEmail);
    }, 300);
  };

  // 2. Register New User Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
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

    if (!cleanFullName || !cleanEmail || !cleanPassword) {
      setErrorMsg('Please fill in all required fields (Full Name, Email, and Password).');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (cleanPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const existingUsers = loadUsers();

      // Check if email already exists
      const isDuplicate = existingUsers.some(u => u.email.toLowerCase() === cleanEmail) || 
                          cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase();

      if (isDuplicate) {
        setErrorMsg('An account with this email address already exists. Please sign in instead.');
        setIsSubmitting(false);
        return;
      }

      const newUser: AppUser = {
        id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone || '+250 788 000 000',
        role: regRole,
        status: 'Active',
        passwordHash: cleanPassword,
        pinCode: cleanPin,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...existingUsers, newUser];
      saveUsers(updatedUsers);
      setStaffUsers(updatedUsers);

      addAuditLog({
        userId: newUser.id,
        userName: newUser.fullName,
        userRole: newUser.role,
        userEmail: newUser.email,
        action: 'Account Self-Registration',
        category: 'Auth',
        details: `New user self-registered account: ${newUser.fullName} (${newUser.role})`
      });

      setSuccessMsg(`Account created successfully! Logging you in as ${newUser.fullName}...`);

      setTimeout(() => {
        handleAuthSuccess(newUser, 'New User Registration');
      }, 600);
    }, 400);
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
              Sky View Resort Apartment
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Production POS & Management Authentication Terminal
            </p>

            <div className="mt-4 flex items-center justify-center space-x-3 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-full text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Terminal #01 Active</span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>256-Bit SSL Encrypted</span>
              </span>
            </div>
          </div>

          {/* Login Mode Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-700/60 bg-slate-900/50 p-1.5 gap-1.5 text-xs font-bold">
            <button
              onClick={() => { setLoginMode('email'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                loginMode === 'email'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => { setLoginMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                loginMode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </button>
          </div>

          {/* Form Content Area */}
          <div className="p-6 md:p-8">
            
            {/* Status Messages */}
            {cooldownSeconds > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-bold">Security Cooldown Active</p>
                  <p className="mt-0.5 opacity-90">Please wait <strong>{cooldownSeconds}s</strong> before trying again.</p>
                </div>
              </div>
            )}

            {errorMsg && cooldownSeconds === 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="font-bold">Authentication Error</p>
                  <p className="mt-0.5 opacity-90">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold">System Notification</p>
                  <p className="mt-0.5 opacity-90">{successMsg}</p>
                </div>
              </div>
            )}

            {/* TAB 1: STANDARD EMAIL & PASSWORD LOGIN */}
            {loginMode === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      disabled={cooldownSeconds > 0}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yuskar@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
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

                {/* Quick Demo Logins for Fast Access */}
                <div className="pt-3 border-t border-slate-700/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                    Quick Role Login (Click for Instant Portal Access)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('accountant@grandhorizon.com');
                        setPassword('Accountant@123');
                        setTimeout(() => {
                          const users = loadUsers();
                          const accUser = users.find(u => u.email.toLowerCase() === 'accountant@grandhorizon.com') || INITIAL_STAFF_USERS.find(u => u.email === 'accountant@grandhorizon.com');
                          if (accUser) handleAuthSuccess(accUser, 'Quick Accountant Demo Login');
                        }, 100);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-500 text-left transition cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300">Accountant Portal</div>
                      <div className="text-[10px] text-slate-400">accountant@grandhorizon.com</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail('manager@grandhorizon.com');
                        setPassword('Manager@123');
                        setTimeout(() => {
                          const users = loadUsers();
                          const mgrUser = users.find(u => u.email.toLowerCase() === 'manager@grandhorizon.com') || INITIAL_STAFF_USERS.find(u => u.email === 'manager@grandhorizon.com');
                          if (mgrUser) handleAuthSuccess(mgrUser, 'Quick Manager Demo Login');
                        }, 100);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-left transition cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">Manager Access</div>
                      <div className="text-[10px] text-slate-400">manager@grandhorizon.com</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail('yuskar@gmail.com');
                        setPassword('Pksquare@1');
                        setTimeout(() => {
                          handleAuthSuccess(SUPER_ADMIN_CREDENTIALS, 'Quick Super Admin Login');
                        }, 100);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-left transition cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300">Super Admin</div>
                      <div className="text-[10px] text-slate-400">yuskar@gmail.com</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail('cashier@grandhorizon.com');
                        setPassword('Cashier@123');
                        setTimeout(() => {
                          const users = loadUsers();
                          const cashUser = users.find(u => u.email.toLowerCase() === 'cashier@grandhorizon.com') || INITIAL_STAFF_USERS.find(u => u.email === 'cashier@grandhorizon.com');
                          if (cashUser) handleAuthSuccess(cashUser, 'Quick Cashier Demo Login');
                        }, 100);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-left transition cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-sky-400 group-hover:text-sky-300">POS Cashier</div>
                      <div className="text-[10px] text-slate-400">cashier@grandhorizon.com</div>
                    </button>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => { setLoginMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
                    >
                      Create an Account
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER NEW ACCOUNT */}
            {loginMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Create a new account for instant access to the POS and Resort Portal.</span>
                </div>

                {/* Full Name & Phone in grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Jean Paul Mugisha"
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
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="e.g. +250 788 123 456"
                        className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. staff@grandhorizon.com"
                      className="w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Role & PIN Code in grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Account Role *
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as SystemRole)}
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Cashier">Cashier / POS Operator</option>
                      <option value="Waiter">Waiter / Waitress</option>
                      <option value="Receptionist">Front Desk Receptionist</option>
                      <option value="Kitchen">Kitchen Staff / Chef</option>
                      <option value="Manager">Department Manager</option>
                      <option value="Accountant">Accountant / Auditor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      4-Digit POS PIN
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold tracking-widest focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Passwords in grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Password *
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

                <button
                  type="submit"
                  disabled={isSubmitting || cooldownSeconds > 0}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Access System</span>
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
                      Sign In Here
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* System Currency Footer */}
            <div className="mt-8 pt-6 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
              <p>
                Currency: <strong className="text-slate-300">RWF (Rwandan Franc)</strong>
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
