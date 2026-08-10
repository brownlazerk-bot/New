import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, CheckCircle, XCircle, Ban, 
  Trash2, Edit3, Key, Search, Phone, Mail, UserCheck
} from 'lucide-react';
import { AppUser, SystemRole } from '../types';
import { 
  loadUsers, saveUsers, addAuditLog, SUPER_ADMIN_CREDENTIALS 
} from '../lib/storage';

interface UserManagementProps {
  currentUser: AppUser;
  darkMode?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, darkMode = false }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [role, setRole] = useState<SystemRole>('Manager');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Suspended'>('Active');

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    refreshUserList();
  }, []);

  const refreshUserList = () => {
    // Strictly filter out Super Admin so Super Admin NEVER appears in user management lists!
    const allUsers = loadUsers().filter(
      u => u.email.toLowerCase() !== SUPER_ADMIN_CREDENTIALS.email.toLowerCase() && !u.isSuperAdmin
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
    setEditingUser(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    if (user.isSuperAdmin || user.email.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
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
    setIsAddModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // Prevent using Super Admin email
    if (cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
      alert('Cannot use reserved Super Admin email address.');
      return;
    }

    let updatedList = [...users];

    if (editingUser) {
      // Edit mode
      updatedList = updatedList.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            fullName: fullName.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            pinCode: pinCode.trim() || '1234',
            role,
            status
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
        alert('Password is required for new users.');
        return;
      }

      // Check email uniqueness
      if (updatedList.some(u => u.email.toLowerCase() === cleanEmail)) {
        alert('A user with this email address already exists.');
        return;
      }

      const newUser: AppUser = {
        id: `usr-${Date.now()}`,
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role,
        status,
        passwordHash: password.trim(),
        pinCode: pinCode.trim() || '1234',
        createdAt: new Date().toISOString()
      };

      updatedList.push(newUser);

      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Create User Account',
        category: 'User Management',
        details: `Created new user ${newUser.fullName} (${newUser.email}) with role ${role}`
      });
    }

    saveUsers(updatedList);
    setUsers(updatedList);
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (user: AppUser, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
    if (user.isSuperAdmin || user.email.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
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
    if (user.isSuperAdmin || user.email.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
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

    return matchesSearch && matchesRole;
  });

  const availableRoles: SystemRole[] = [
    'Admin', 'Manager', 'Cashier', 'Kitchen', 'Storekeeper', 
    'Receptionist', 'Accountant', 'Housekeeping', 'Waiter'
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                User & Admin Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage staff accounts, administrative roles, and system permissions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone number..."
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
            className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Roles ({users.length})</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User Table */}
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
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredUsers.map((u) => (
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

                    <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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

      {/* Reset Password Modal */}
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
