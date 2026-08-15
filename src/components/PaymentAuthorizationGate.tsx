import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Key, LogOut, CheckCircle2, Lock, Smartphone, ExternalLink, HelpCircle } from 'lucide-react';
import { AppUser } from '../types';
import { loadUsers, saveCurrentUser, addAuditLog, grantUserGracePeriod } from '../lib/storage';
import { loginUser } from '../lib/auth';

interface PaymentAuthorizationGateProps {
  currentUser: AppUser;
  onRefreshUserStatus: (updatedUser: AppUser) => void;
  onLogout: () => void;
  darkMode: boolean;
}

export const PaymentAuthorizationGate: React.FC<PaymentAuthorizationGateProps> = ({
  currentUser,
  onRefreshUserStatus,
  onLogout,
  darkMode = false
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showSuperAdminUnlockModal, setShowSuperAdminUnlockModal] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [graceDays, setGraceDays] = useState(7);

  const handleRecheckStatus = () => {
    setIsChecking(true);
    setStatusNote('');

    setTimeout(() => {
      const allUsers = loadUsers();
      const freshUser = allUsers.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());

      if (freshUser) {
        // Check if grace period is active
        if (freshUser.accessStatus === 'Grace Period' && freshUser.accessExpiresAt) {
          const isExpired = new Date(freshUser.accessExpiresAt).getTime() < Date.now();
          if (!isExpired) {
            setStatusNote('✓ Super Admin has granted you Grace Period access! Entering system...');
            setTimeout(() => onRefreshUserStatus(freshUser), 700);
            return;
          }
        }

        if (freshUser.accessStatus === 'Approved') {
          setStatusNote('✓ Payment & Access verified by Super Admin! Entering system...');
          setTimeout(() => onRefreshUserStatus(freshUser), 700);
          return;
        }

        setStatusNote('Status is currently pending Super Admin approval. Please contact Super Admin.');
      } else {
        setStatusNote('Could not verify account. Please contact Super Admin.');
      }
      setIsChecking(false);
    }, 600);
  };

  const handleSuperAdminMasterUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    try {
      const { user: authAdmin } = await loginUser(superAdminEmail.trim(), superAdminPassword.trim());
      if (authAdmin && (authAdmin.isSuperAdmin || authAdmin.role === 'Super Admin')) {
        // Grant grace period or full approval
        grantUserGracePeriod(currentUser.id, graceDays, `Unlocked via Super Admin Direct Master Override by ${authAdmin.fullName}`);
        
        addAuditLog({
          userId: authAdmin.id,
          userName: authAdmin.fullName,
          userRole: 'Super Admin',
          userEmail: authAdmin.email,
          action: 'Super Admin Direct Override Unlock',
          category: 'Auth',
          details: `Directly granted ${graceDays}-day grace period to user ${currentUser.fullName} (${currentUser.email})`
        });

        const allUsers = loadUsers();
        const updatedUser = allUsers.find(u => u.id === currentUser.id);
        if (updatedUser) {
          saveCurrentUser(updatedUser);
          setShowSuperAdminUnlockModal(false);
          alert(`✓ Successfully unlocked! User ${currentUser.fullName} now has ${graceDays} days grace access to use the system.`);
          onRefreshUserStatus(updatedUser);
        }
      } else {
        setUnlockError('Access Denied: Provided credentials do not belong to an authorized Super Admin.');
      }
    } catch (err: any) {
      setUnlockError(err.message || 'Super Admin authentication failed.');
    }
  };

  const isExpiredGrace = currentUser.accessStatus === 'Grace Period' && currentUser.accessExpiresAt && new Date(currentUser.accessExpiresAt).getTime() < Date.now();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
    }`}>
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl p-6 md:p-8">
          
          {/* Header Icon */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              {isExpiredGrace ? 'Grace Period Expired — Payment Required' : 'Payment Authorization Required'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              System access is controlled by the Super Admin. You can use the system once authorized or granted a payment grace window.
            </p>
          </div>

          {/* User Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Name</span>
                <p className="font-bold text-sm text-white">{currentUser.fullName}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentUser.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>{currentUser.email}</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                currentUser.accessStatus === 'Pending Payment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                currentUser.accessStatus === 'Locked' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                'bg-slate-800 text-slate-300'
              }`}>
                Status: {currentUser.accessStatus || 'Pending Payment Approval'}
              </span>
            </div>
          </div>

          {/* Notice & Instructions */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 space-y-2 mb-6">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>How to Activate or Continue Using System:</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Super Admin can authorize your device from any phone or computer.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              2. You can request temporary Grace Period access to use POS, stock, and orders while completing your payment settlement.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              3. Once Super Admin activates your account remotely, click <strong>"Check Activation Status"</strong> below.
            </p>
          </div>

          {/* Super Admin Direct Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold block">Super Admin Contact</span>
                <span className="font-mono text-white font-bold">+250 780 000 000</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold block">Super Admin Support</span>
                <span className="font-mono text-white font-bold">admin@hospitality.rw</span>
              </div>
            </div>
          </div>

          {statusNote && (
            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 text-center text-xs text-amber-400 font-bold mb-4 animate-pulse">
              {statusNote}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleRecheckStatus}
              disabled={isChecking}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Super Admin Authorization...' : 'Check Activation Status (Instant)'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSuperAdminUnlockModal(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Super Admin Master Unlock</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-rose-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Direct Master Override Modal */}
      {showSuperAdminUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Super Admin Master Override</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSuperAdminUnlockModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Super Admin can enter master credentials to authorize this account directly with grace period days.
            </p>

            <form onSubmit={handleSuperAdminMasterUnlock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Super Admin Email</label>
                <input
                  type="email"
                  required
                  value={superAdminEmail}
                  onChange={e => setSuperAdminEmail(e.target.value)}
                  placeholder="yuskar@gmail.com"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Super Admin Password</label>
                <input
                  type="password"
                  required
                  value={superAdminPassword}
                  onChange={e => setSuperAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Grant Access Days (Grace Period)</label>
                <select
                  value={graceDays}
                  onChange={e => setGraceDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={3}>3 Days (Quick Trial / Finishing Payment)</option>
                  <option value={7}>7 Days (Standard Grace Period)</option>
                  <option value={14}>14 Days (Extended Grace Period)</option>
                  <option value={30}>30 Days (Full 1-Month Subscription)</option>
                </select>
              </div>

              {unlockError && (
                <p className="text-xs text-rose-400 font-bold">{unlockError}</p>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuperAdminUnlockModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Grant Grace Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
