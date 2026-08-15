import React, { useState, useEffect } from 'react';
import { 
  Wine, Shield, UserCheck, Clock, Moon, Sun, 
  AlertTriangle, DollarSign, Key, LogOut, Lock, User, Globe
} from 'lucide-react';
import { Shift, UserRole, AppUser } from '../types';
import { formatCurrency } from '../lib/currency';
import { Language } from '../lib/translations';

interface HeaderProps {
  currentShift?: Shift | null;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  language?: Language;
  setLanguage?: (lang: Language) => void;
  lowStockCount: number;
  openShiftModal?: () => void;
  onNavigateToStock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentShift,
  userRole,
  setUserRole,
  currentUser,
  onLogout,
  darkMode,
  setDarkMode,
  language = 'rw',
  setLanguage,
  lowStockCount,
  openShiftModal,
  onNavigateToStock
}) => {
  const [time, setTime] = useState(new Date());
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoleToggle = () => {
    if (userRole === 'Cashier') {
      // Require Manager PIN (default: 1234)
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
    } else {
      setUserRole('Cashier');
    }
  };

  const verifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === '8888' || pinInput === 'Pksquare@1') {
      setUserRole('Manager');
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Invalid Manager PIN. Default PIN is 1234.');
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-30 transition-colors duration-200 border-b ${
        darkMode 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand / Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
                <Wine className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-black text-lg tracking-tight leading-tight">
                    YUSKAR MANAGEMENT SYSTEM
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    ENTERPRISE
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Hotel, Restaurant & POS Operations
                </p>
              </div>
            </div>

            {/* Time Status & Clock */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Realtime Clock */}
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Right Controls: Role, Auth User, & Theme Switcher */}
            <div className="flex items-center space-x-3">
              
              {currentUser && (
                <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[10px] text-amber-500 font-bold">
                      {currentUser.role}
                    </p>
                  </div>
                </div>
              )}



              {/* Language Selector */}
              {setLanguage && (
                <button
                  onClick={() => setLanguage(language === 'rw' ? 'en' : 'rw')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
                  title="Guhindura Ururimi / Switch Language"
                >
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span>{language === 'rw' ? 'Kinyarwanda 🇷🇼' : 'English 🇬🇧'}</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark/Light Mode"
              >
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer"
                  title="Logout Session"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Manager PIN Security Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-base">Manager Access Required</h3>
              </div>
              <button 
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter Manager PIN code to unlock override privileges, price edits, and manager settings.
            </p>

            <form onSubmit={verifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Manager PIN Code</label>
                <input
                  type="password"
                  maxLength={20}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN (Default: 1234)"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-center tracking-widest text-lg font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {pinError && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs text-center font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30"
                >
                  Unlock Manager Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

