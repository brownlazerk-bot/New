import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, CheckCircle, XCircle, Ban, 
  Trash2, Edit3, Key, Search, Phone, Mail, UserCheck,
  Smartphone, Laptop, Tablet, Clock, CreditCard,
  AlertTriangle, Lock, Unlock, LogOut, CheckCircle2,
  Calendar, RefreshCw, Zap, Building2
} from 'lucide-react';
import { AppUser, SystemRole, UserAccessStatus, UserPaymentStatus } from '../types';
import { 
  loadUsers, saveUsers, addAuditLog,
  grantUserGracePeriod, approveUserPaymentAccess, lockUserAccess,
  revokeUserSession, updateUserAccessAndPayment
} from '../lib/storage';
import { registerStaffUser } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UserManagementProps {
  currentUser: AppUser;
  darkMode?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, darkMode = false }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [accessFilter, setAccessFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'users' | 'devices' | 'licensing'>('users');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);
  
  // Grace Period Modal
  const [graceModalUser, setGraceModalUser] = useState<AppUser | null>(null);
  const [graceDays, setGraceDays] = useState(7);
  const [graceNotes, setGraceNotes] = useState('Allowed by Super Admin while client finishes payment');

  // Record Payment Modal
  const [paymentModalUser, setPaymentModalUser] = useState<AppUser | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money (MoMo)');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDurationMonths, setPaymentDurationMonths] = useState(1);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [role, setRole] = useState<SystemRole>('Manager');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Suspended'>('Active');
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus>('Approved');

  const [newPassword, setNewPassword] = useState('');

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin || currentUser?.role === 'Super Admin');

  useEffect(() => {
    refreshUserList();
    const interval = setInterval(refreshUserList, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshUserList = () => {
    // Strictly filter out Super Admin so Super Admin NEVER appears in standard user lists
    const allUsers = loadUsers().filter(
      u => !u.isSuperAdmin && u.role !== 'Super Admin'
    );
    setUsers(allUsers);
  };

  const handleOpenAdd = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPinCode('1234');
    setRole('Manager');
    setStatus('Active');
    setAccessStatus(isSuperAdmin ? 'Approved' : 'Pending Payment');
    setEditingUser(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    if (user.isSuperAdmin || user.role === 'Super Admin') {
      alert('Super Admin is a protected system account and cannot be modified.');
      return;
    }
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone);
    setPinCode(user.pinCode || '1234');
    setRole(user.role);
    setStatus(user.status);
    setAccessStatus(user.accessStatus || 'Approved');
    setIsAddModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const targetBizId = currentUser.businessId || 'biz-primary-01';

    let updatedList = [...users];

    if (editingUser) {
      // Edit mode
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: fullName.trim(),
              phone: phone.trim(),
              role,
              status,
              pin_code: pinCode.trim() || '1234'
            })
            .eq('id', editingUser.id);
        } catch (dbErr) {
          console.warn('[Supabase Profile Update Note]:', dbErr);
        }
      }

      updatedList = updatedList.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            fullName: fullName.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            pinCode: pinCode.trim() || '1234',
            role,
            status,
            accessStatus
          };
        }
        return u;
      });

      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Edit User Account',
        category: 'User Management',
        details: `Updated user account ${fullName} (${cleanEmail}) - Role: ${role}, Status: ${status}`
      });
    } else {
      // Create mode
      if (!password.trim()) {
        alert('Password is required for new staff members.');
        return;
      }

      if (updatedList.some(u => u.email.toLowerCase() === cleanEmail)) {
        alert('A user with this email address already exists.');
        return;
      }

      let newUserId = `usr-${Date.now()}`;

      // Register in Supabase
      if (isSupabaseConfigured()) {
        try {
          const regRes = await registerStaffUser({
            businessId: targetBizId,
            fullName: fullName.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            password: password.trim(),
            pin: pinCode.trim() || '1234',
            role
          });

          if (regRes.user) {
            newUserId = regRes.user.id;
          }
        } catch (err: any) {
          console.warn('[Supabase Staff Register Note]:', err);
        }
      }

      const newUser: AppUser = {
        id: newUserId,
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role,
        status: 'Active',
        accessStatus: 'Approved',
        paymentStatus: 'Paid',
        authorizedBySuperAdmin: true,
        authorizedAt: new Date().toISOString(),
        pinCode: pinCode.trim() || '1234',
        businessId: targetBizId,
        createdAt: new Date().toISOString()
      };

      updatedList.push(newUser);

      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Create Staff User Account',
        category: 'User Management',
        details: `Manager created staff user ${newUser.fullName} (${newUser.email}) with role ${role}`
      });
    }

    saveUsers(updatedList);
    setUsers(updatedList);
    setIsAddModalOpen(false);
  };

  const handleGrantGraceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!graceModalUser) return;

    grantUserGracePeriod(graceModalUser.id, graceDays, graceNotes);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Grant Grace Period Access',
      category: 'User Management',
      details: `Granted ${graceDays}-day payment grace period to ${graceModalUser.fullName} (${graceModalUser.email})`
    });

    setGraceModalUser(null);
    refreshUserList();
    alert(`✓ Granted ${graceDays}-day grace access to ${graceModalUser.fullName}! They can now use the system while completing payment.`);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalUser) return;

    const amt = Number(paymentAmount) || 0;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + paymentDurationMonths);

    updateUserAccessAndPayment(paymentModalUser.id, {
      accessStatus: 'Approved',
      paymentStatus: 'Paid',
      paymentAmountDue: 0,
      accessExpiresAt: expires.toISOString(),
      authorizedBySuperAdmin: true,
      authorizedAt: new Date().toISOString(),
      paymentNotes: `Paid ${amt.toLocaleString()} RWF via ${paymentMethod} (Ref: ${paymentReference || 'N/A'}) - Valid for ${paymentDurationMonths} month(s)`,
      sessionRevoked: false
    });

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Record Subscription Payment',
      category: 'User Management',
      details: `Recorded subscription payment of ${amt.toLocaleString()} RWF for ${paymentModalUser.fullName} via ${paymentMethod}`
    });

    setPaymentModalUser(null);
    refreshUserList();
    alert(`✓ Payment recorded and full access activated for ${paymentModalUser.fullName} for ${paymentDurationMonths} month(s)!`);
  };

  const handleApproveFullAccess = (user: AppUser) => {
    if (!confirm(`Confirm full access approval for ${user.fullName}?`)) return;

    approveUserPaymentAccess(user.id, 'Full access approved by Super Admin');

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Approve User Full Access',
      category: 'User Management',
      details: `Approved full access license for ${user.fullName} (${user.email})`
    });

    refreshUserList();
  };

  const handleLockUser = (user: AppUser) => {
    if (!confirm(`Are you sure you want to LOCK system access for ${user.fullName}? They will not be able to use POS or modules until authorized.`)) return;

    lockUserAccess(user.id, 'Access locked by Super Admin pending payment');

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Lock User System Access',
      category: 'User Management',
      details: `Locked system access for ${user.fullName} (${user.email})`
    });

    refreshUserList();
  };

  const handleRevokeSession = (user: AppUser) => {
    if (!confirm(`Force logout and revoke current active device session for ${user.fullName}?`)) return;

    revokeUserSession(user.id);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Revoke User Device Session',
      category: 'User Management',
      details: `Remotely terminated active device session for ${user.fullName} (${user.email})`
    });

    refreshUserList();
    alert(`✓ Active device session revoked for ${user.fullName}. Their screen will prompt for re-authentication.`);
  };

  const handleToggleStatus = (user: AppUser, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
    if (user.isSuperAdmin || user.role === 'Super Admin') {
      alert('Super Admin status cannot be altered.');
      return;
    }

    const updatedList = users.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
    saveUsers(updatedList);
    setUsers(updatedList);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Change User Status',
      category: 'User Management',
      details: `Changed status for ${user.fullName} to ${newStatus}`
    });
  };

  const handleDeleteUser = (user: AppUser) => {
    if (user.isSuperAdmin || user.role === 'Super Admin') {
      alert('Super Admin cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete user "${user.fullName}"?`)) {
      const updatedList = users.filter(u => u.id !== user.id);
      saveUsers(updatedList);
      setUsers(updatedList);

      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Delete User Account',
        category: 'User Management',
        details: `Deleted user account ${user.fullName} (${user.email})`
      });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword.trim()) return;

    const updatedList = users.map(u => {
      if (u.id === resetPasswordUser.id) {
        return { ...u, passwordHash: newPassword.trim() };
      }
      return u;
    });

    saveUsers(updatedList);
    setUsers(updatedList);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      action: 'Reset User Password',
      category: 'User Management',
      details: `Reset password for user ${resetPasswordUser.fullName} (${resetPasswordUser.email})`
    });

    setResetPasswordUser(null);
    setNewPassword('');
    alert(`Password for ${resetPasswordUser.fullName} has been updated successfully.`);
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesAccess = accessFilter === 'All' || 
      (accessFilter === 'Approved' && (u.accessStatus === 'Approved' || !u.accessStatus)) ||
      (accessFilter === 'Grace Period' && u.accessStatus === 'Grace Period') ||
      (accessFilter === 'Pending Payment' && (u.accessStatus === 'Pending Payment' || u.accessStatus === 'Payment Required')) ||
      (accessFilter === 'Locked' && u.accessStatus === 'Locked');

    return matchesSearch && matchesRole && matchesAccess;
  });

  const availableRoles: SystemRole[] = [
    'Admin', 'Manager', 'Cashier', 'Kitchen', 'Storekeeper', 
    'Receptionist', 'Accountant', 'Housekeeping', 'Waiter'
  ];

  // Stats calculation
  const totalUsers = users.length;
  const activeLicensed = users.filter(u => u.accessStatus === 'Approved' || !u.accessStatus).length;
  const gracePeriodCount = users.filter(u => u.accessStatus === 'Grace Period').length;
  const pendingPaymentCount = users.filter(u => u.accessStatus === 'Pending Payment' || u.accessStatus === 'Payment Required' || u.accessStatus === 'Locked').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Super Admin Remote Control Banner */}
      {isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-900 border border-purple-800/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  Super Admin Master Control
                </span>
                <span className="text-xs text-purple-300 font-semibold">
                  Cross-Device User & Payment Authorization Center
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                You can control, monitor devices, and authorize users from any phone, tablet, or PC while they complete payments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshUserList}
              className="p-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 text-purple-200 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync All Devices</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              User & Device Control Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage accounts, multi-device access, and payment subscription licenses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Total Registered Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalUsers}</p>
          <span className="text-[10px] text-slate-400">All registered system roles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Fully Approved / Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{activeLicensed}</p>
          <span className="text-[10px] text-slate-400">Full unlimited access</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-500 font-bold">Grace Period (Finishing Payment)</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 mt-2">{gracePeriodCount}</p>
          <span className="text-[10px] text-slate-400">Using while completing payment</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-500 font-bold">Pending Payment / Locked</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2">{pendingPaymentCount}</p>
          <span className="text-[10px] text-slate-400">Awaiting Super Admin activation</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('licensing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'licensing'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment & Grace Period Authorization</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'devices'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Active Devices & Remote Control</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Roles</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">Access Status:</span>
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved / Paid</option>
            <option value="Grace Period">Grace Period (Finishing Payment)</option>
            <option value="Pending Payment">Pending Payment</option>
            <option value="Locked">Locked</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: STANDARD USERS TABLE */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
              <p className="font-bold text-sm">No user accounts found</p>
              <p className="text-xs mt-1">
                {users.length === 0 
                  ? 'The user database is empty. Click "Create New User" to register admins and staff.' 
                  : 'Try adjusting your search terms or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Payment Access</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((u) => {
                    const isGrace = u.accessStatus === 'Grace Period';
                    const isLocked = u.accessStatus === 'Locked' || u.accessStatus === 'Pending Payment' || u.accessStatus === 'Payment Required';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-500 flex items-center justify-center font-black text-sm border border-slate-200 dark:border-slate-700">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {u.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                                <Mail className="w-3 h-3 inline" />
                                <span>{u.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Shield className="w-3 h-3 mr-1" />
                            {u.role}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone || 'N/A'}</span>
                          </span>
                        </td>

                        <td className="p-4">
                          {u.status === 'Active' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          )}
                          {u.status === 'Inactive' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </span>
                          )}
                          {u.status === 'Suspended' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              <Ban className="w-3 h-3 mr-1" />
                              Suspended
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {isGrace ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                🟡 Grace Period
                              </span>
                              {u.accessExpiresAt && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Until {new Date(u.accessExpiresAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : isLocked ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                🔒 Payment Required
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                🟢 Authorized / Paid
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isSuperAdmin && (
                              <button
                                onClick={() => setGraceModalUser(u)}
                                title="Grant Payment Grace Period (Allow to use while finishing payment)"
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit User"
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setResetPasswordUser(u)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {u.status === 'Active' ? (
                              <button
                                onClick={() => handleToggleStatus(u, 'Suspended')}
                                title="Suspend User"
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(u, 'Active')}
                                title="Activate User"
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User"
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PAYMENT & GRACE PERIOD LICENSING TAB */}
      {activeTab === 'licensing' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-1">Super Admin Payment & Grace Period System:</p>
            <p>
              Grant temporary Grace Period access to users while they are completing their payment settlements. Once verified, click <strong>"Approve Full License"</strong> or <strong>"Record Subscription Payment"</strong>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Access Status</th>
                    <th className="p-4">Payment Notes / Expiration</th>
                    <th className="p-4 text-right">Super Admin Fast Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-white">{u.fullName}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        {u.accessStatus === 'Grace Period' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            🟡 Grace Period (Active)
                          </span>
                        ) : u.accessStatus === 'Locked' || u.accessStatus === 'Pending Payment' || u.accessStatus === 'Payment Required' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            🔒 Payment Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            🟢 Full License (Paid)
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {u.accessExpiresAt ? (
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold">
                              Valid until {new Date(u.accessExpiresAt).toLocaleDateString()}
                            </p>
                            <p className="text-[11px] text-slate-400">{u.paymentNotes || 'Grace period authorized'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {u.paymentNotes || 'Standard authorized account'}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setGraceModalUser(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs border border-amber-500/30 flex items-center space-x-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Allow Grace Period</span>
                          </button>

                          <button
                            onClick={() => setPaymentModalUser(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-xs border border-emerald-500/30 flex items-center space-x-1 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>

                          {u.accessStatus === 'Locked' ? (
                            <button
                              onClick={() => handleApproveFullAccess(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLockUser(u)}
                              title="Lock Access"
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ACTIVE DEVICES & LIVE REMOTE MONITORING */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <div>
              <p className="font-bold mb-0.5">Super Admin Remote Device & Session Monitor:</p>
              <p>
                See every user logged in across phones, tablets, and computers. You can remotely force-logout or revoke any device session with 1 click.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const dev = u.deviceInfo;
              const isMobile = dev?.deviceType === 'Mobile';
              const isTablet = dev?.deviceType === 'Tablet';

              return (
                <div 
                  key={u.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500">
                        {isMobile ? <Smartphone className="w-5 h-5" /> : isTablet ? <Tablet className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{u.fullName}</h4>
                        <span className="text-[11px] text-slate-400 block">{u.role}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Active Session
                    </span>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Device Platform:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dev?.os || 'Multi-Device Browser'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Browser:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dev?.browser || 'Web Client'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dev?.screenResolution || 'Auto (Responsive)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Activity:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleRevokeSession(u)}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold flex items-center justify-center space-x-1 transition cursor-pointer border border-rose-500/20"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Force Logout Device</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => setGraceModalUser(u)}
                        className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold transition cursor-pointer border border-amber-500/20"
                        title="Allow Grace Period"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Grant Payment Grace Period Modal */}
      {graceModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Grant Grace Period (Use While Finishing Payment)
                </h3>
              </div>
              <button onClick={() => setGraceModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Allow <strong>{graceModalUser.fullName}</strong> ({graceModalUser.email}) to fully access the system while completing their payment.
            </p>

            <form onSubmit={handleGrantGraceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Grace Period Duration (Days)
                </label>
                <select
                  value={graceDays}
                  onChange={e => setGraceDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value={3}>3 Days (Quick Trial / Finishing Payment Today)</option>
                  <option value={7}>7 Days (1 Week Grace Window)</option>
                  <option value={14}>14 Days (2 Weeks Grace Window)</option>
                  <option value={30}>30 Days (Full 1 Month Window)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Authorization Note (Optional)
                </label>
                <input
                  type="text"
                  value={graceNotes}
                  onChange={e => setGraceNotes(e.target.value)}
                  placeholder="e.g. Allowed while client completes Momo payment"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGraceModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  Authorize Grace Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Subscription Payment Modal */}
      {paymentModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Record Subscription Payment
                </h3>
              </div>
              <button onClick={() => setPaymentModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Record verified payment settlement for <strong>{paymentModalUser.fullName}</strong> ({paymentModalUser.email}).
            </p>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Amount Paid (RWF) *
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="MTN Mobile Money (MoMo)">MTN Mobile Money (MoMo)</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Bank Transfer (BK / I&M / Equity)">Bank Transfer (BK / I&M / Equity)</option>
                  <option value="Cash Payment">Cash Payment</option>
                  <option value="Visa / Mastercard">Visa / Mastercard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Payment Reference / TxID
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="e.g. MOMO-99124 or BK-SLIP-102"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Subscription Duration
                </label>
                <select
                  value={paymentDurationMonths}
                  onChange={e => setPaymentDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value={1}>1 Month License</option>
                  <option value={3}>3 Months License (Quarterly)</option>
                  <option value={6}>6 Months License (Half-Year)</option>
                  <option value={12}>12 Months License (Annual)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                >
                  Confirm & Activate Full License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add/Edit User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Mugisha"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mugisha@hotel.rw"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set secure password"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  4-Digit POS PIN Code (For Quick Terminal Login)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as SystemRole)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Payment Access Level
                  </label>
                  <select
                    value={accessStatus}
                    onChange={(e) => setAccessStatus(e.target.value as UserAccessStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Approved">Approved (Full License)</option>
                    <option value="Grace Period">Grace Period (Use while paying)</option>
                    <option value="Pending Payment">Pending Payment (Require Super Admin Approval)</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  {editingUser ? 'Update Account' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Reset Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter a new password for user <strong>{resetPasswordUser.fullName}</strong> ({resetPasswordUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
