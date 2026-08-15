import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Building2, Users, CreditCard, DollarSign, Activity, 
  Settings, FileText, CheckCircle2, AlertTriangle, XCircle, 
  Clock, Plus, Search, Filter, RefreshCw, Edit3, Trash2, 
  Lock, Unlock, ArrowUpRight, ArrowDownRight, Check, Ban, 
  Eye, Download, Phone, Mail, Calendar, UserCheck, ShieldAlert,
  Smartphone, Database, Server, ChevronRight, Layers, Sparkles,
  Zap, AlertCircle, HelpCircle, LogOut, ArrowRight, Sun, Moon,
  KeyRound, Copy
} from 'lucide-react';
import { 
  AppUser, Business, Subscription, SubscriptionPayment, 
  AuditLog, SystemRole, SaaSSubscriptionStatus, UserAccessStatus,
  SubscriptionLicense, SubscriptionPlanDuration
} from '../types';
import { 
  loadBusinesses, saveBusinesses, loadSubscriptions, saveSubscriptions,
  loadSubscriptionPayments, saveSubscriptionPayments, loadAuditLogs,
  loadUsers, saveUsers, addAuditLog
} from '../lib/storage';
import { 
  generateBusinessLicense, loadStoredLicenses, revokeLicense, 
  SUBSCRIPTION_PLANS 
} from '../lib/license';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logAudit } from '../lib/auth';

interface SuperAdminControlCenterProps {
  currentUser: AppUser;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SuperAdminControlCenter: React.FC<SuperAdminControlCenterProps> = ({
  currentUser,
  onLogout,
  darkMode,
  onToggleDarkMode
}) => {
  // Navigation Tabs: 8 required domains
  const [activeTab, setActiveTab] = useState<
    'overview' | 'businesses' | 'users' | 'subscriptions' | 'payments' | 'audit' | 'reports' | 'settings'
  >('overview');

  // Platform Data State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Search & Filter States
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<string>('ALL');
  
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userBizFilter, setUserBizFilter] = useState<string>('ALL');

  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<string>('ALL');

  const [paySearch, setPaySearch] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState<string>('ALL');

  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('ALL');

  // Modal States
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [isCreateBizModalOpen, setIsCreateBizModalOpen] = useState(false);
  const [isEditBizModalOpen, setIsEditBizModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isExtendSubModalOpen, setIsExtendSubModalOpen] = useState(false);
  const [extendDaysCount, setExtendDaysCount] = useState(30);

  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  // License Authority State
  const [licenses, setLicenses] = useState<SubscriptionLicense[]>(() => loadStoredLicenses());
  const [isGenerateLicenseModalOpen, setIsGenerateLicenseModalOpen] = useState(false);
  const [licenseGenBizId, setLicenseGenBizId] = useState('');
  const [licenseGenPlan, setLicenseGenPlan] = useState<SubscriptionPlanDuration>('MONTHLY');
  const [licenseGenPrefix, setLicenseGenPrefix] = useState('');
  const [licenseGenNotes, setLicenseGenNotes] = useState('');
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // New Business Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState('hotel');
  const [newBizOwnerName, setNewBizOwnerName] = useState('');
  const [newBizOwnerEmail, setNewBizOwnerEmail] = useState('');
  const [newBizOwnerPhone, setNewBizOwnerPhone] = useState('');
  const [newBizAddress, setNewBizAddress] = useState('Kigali, Rwanda');
  const [newBizMonthlyFee, setNewBizMonthlyFee] = useState(100000);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('Manager');
  const [newUserBizId, setNewUserBizId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Manual Payment Form State
  const [payBizId, setPayBizId] = useState('');
  const [payAmount, setPayAmount] = useState(100000);
  const [payPhone, setPayPhone] = useState('');
  const [payTxnRef, setPayTxnRef] = useState('');
  const [payNotes, setPayNotes] = useState('Manual payment recorded by Super Admin');

  // System Settings State
  const [sysMonthlyFee, setSysMonthlyFee] = useState(100000);
  const [sysCurrency, setSysCurrency] = useState('RWF');
  const [sysGraceDays, setSysGraceDays] = useState(7);
  const [sysMomoMerchantNumber, setSysMomoMerchantNumber] = useState('0726134041');
  const [sysMomoMerchantName, setSysMomoMerchantName] = useState('Smart Hospitality Cloud Ltd');
  const [sysAnnouncement, setSysAnnouncement] = useState('');

  // Load All Platform Data from Supabase & Storage
  const loadPlatformData = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        // Fetch from Supabase
        const [
          { data: bizRows },
          { data: subRows },
          { data: payRows },
          { data: profileRows },
          { data: logRows },
          { data: settingRows }
        ] = await Promise.all([
          supabase.from('businesses').select('*').order('created_at', { ascending: false }),
          supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
          supabase.from('subscription_payments').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
          supabase.from('system_settings').select('*')
        ]);

        if (bizRows) {
          const mappedBiz: Business[] = bizRows.map(r => ({
            id: r.id,
            name: r.name,
            code: r.code || `BIZ-${r.id.slice(-4)}`,
            category: r.category || r.type || 'Hotel',
            type: r.type || 'hotel',
            ownerName: r.owner_name || 'Owner',
            ownerEmail: r.owner_email || '',
            ownerPhone: r.owner_phone || '',
            phone: r.phone || r.owner_phone || '',
            email: r.email || r.owner_email || '',
            momoPaymentNumber: r.momo_payment_number || '0726134041',
            address: r.address || 'Kigali, Rwanda',
            currency: r.currency || 'RWF',
            status: r.status as SaaSSubscriptionStatus,
            subscriptionId: r.subscription_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
          setBusinesses(mappedBiz);
        }

        if (subRows) {
          const mappedSubs: Subscription[] = subRows.map(r => ({
            id: r.id,
            businessId: r.business_id,
            businessName: r.business_name,
            planName: r.plan_name || 'Monthly SaaS Business License',
            plan: r.plan || 'MONTHLY_STANDARD',
            amount: Number(r.amount) || 100000,
            monthlyFee: Number(r.monthly_fee) || 100000,
            pricePerMonth: Number(r.monthly_fee) || 100000,
            currency: r.currency || 'RWF',
            status: r.status as SaaSSubscriptionStatus,
            startDate: r.start_date,
            expiryDate: r.expiry_date || r.expires_at,
            expiresAt: r.expires_at || r.expiry_date,
            nextBillingDate: r.next_billing_date,
            gracePeriodDays: r.grace_period_days || 0,
            paymentMethod: r.payment_method || 'MTN_MOMO',
            momoNumber: r.momo_number || '0726134041',
            lastPaymentDate: r.last_payment_date,
            lastPaymentReference: r.last_payment_reference,
            transactionReference: r.transaction_reference,
            nextPaymentAmount: Number(r.next_payment_amount) || 100000,
            paymentHistory: [],
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
          setSubscriptions(mappedSubs);
        }

        if (payRows) {
          const mappedPay: SubscriptionPayment[] = payRows.map(r => ({
            id: r.id,
            businessId: r.business_id,
            businessName: r.business_name,
            subscriptionId: r.subscription_id,
            amount: Number(r.amount) || 100000,
            currency: r.currency || 'RWF',
            paymentMethod: r.payment_method || 'MTN MoMo (Rwanda)',
            payerPhone: r.payer_phone || '',
            recipientPhone: r.recipient_phone || '0726134041',
            paymentReference: r.payment_reference || '',
            transactionReference: r.transaction_reference || '',
            status: r.status || 'SUCCESSFUL',
            paidAt: r.paid_at || r.created_at,
            verifiedBy: r.verified_by || 'Super Admin',
            durationMonths: r.duration_months || 1,
            createdAt: r.created_at
          }));
          setPayments(mappedPay);
        }

        if (profileRows) {
          const mappedUsers: AppUser[] = profileRows.map(r => ({
            id: r.id,
            fullName: r.full_name || 'User',
            email: r.email,
            phone: r.phone || '',
            role: r.role as SystemRole,
            status: r.status || 'Active',
            accessStatus: r.access_status || 'Approved',
            paymentStatus: r.payment_status || 'Paid',
            authorizedBySuperAdmin: Boolean(r.is_super_admin || r.authorized_by_super_admin),
            pinCode: r.pin_code || '1234',
            businessId: r.business_id || undefined,
            isSuperAdmin: Boolean(r.is_super_admin || r.role === 'Super Admin'),
            createdAt: r.created_at,
            lastLoginAt: r.last_login_at
          }));
          setUsers(mappedUsers);
        }

        if (logRows) {
          const mappedLogs: AuditLog[] = logRows.map(r => ({
            id: r.id,
            userId: r.user_id || 'sys',
            userName: r.user_name || 'System',
            userRole: r.user_role || 'System',
            userEmail: r.user_email || '',
            action: r.action,
            category: r.category as any,
            details: r.details,
            timestamp: r.timestamp
          }));
          setAuditLogs(mappedLogs);
        }

        if (settingRows && settingRows.length > 0) {
          const pricing = settingRows.find(s => s.key === 'pricing_plans');
          if (pricing?.value) {
            setSysMonthlyFee(pricing.value.standard_monthly_fee || 100000);
            setSysGraceDays(pricing.value.grace_period_default_days || 7);
          }
          const momo = settingRows.find(s => s.key === 'momo_config');
          if (momo?.value) {
            setSysMomoMerchantNumber(momo.value.merchant_number || '0726134041');
            setSysMomoMerchantName(momo.value.merchant_name || 'Smart Hospitality Cloud Ltd');
          }
        }
      } else {
        // Fallback to local storage
        setBusinesses(loadBusinesses());
        setSubscriptions(loadSubscriptions());
        setPayments(loadSubscriptionPayments());
        setUsers(loadUsers());
        setAuditLogs(loadAuditLogs());
      }
    } catch (err: any) {
      console.error('[Super Admin Data Load Error]:', err);
      // Fallback
      setBusinesses(loadBusinesses());
      setSubscriptions(loadSubscriptions());
      setPayments(loadSubscriptionPayments());
      setUsers(loadUsers());
      setAuditLogs(loadAuditLogs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ==============================================================================
  // OVERVIEW METRICS COMPUTATION
  // ==============================================================================
  const metrics = useMemo(() => {
    const totalBiz = businesses.length;
    const activeBiz = businesses.filter(b => b.status === 'ACTIVE').length;
    const pendingBiz = businesses.filter(b => b.status === 'PENDING_PAYMENT').length;
    const graceBiz = businesses.filter(b => b.status === 'GRACE_PERIOD').length;
    const suspendedBiz = businesses.filter(b => b.status === 'SUSPENDED' || b.status === 'EXPIRED').length;

    const totalUsers = users.length;
    const superAdminsCount = users.filter(u => u.role === 'Super Admin' || u.isSuperAdmin).length;
    const managersCount = users.filter(u => u.role === 'Manager').length;

    const totalRevenue = payments
      .filter(p => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const successfulPaymentsCount = payments.filter(p => p.status === 'SUCCESSFUL').length;
    const pendingPaymentsCount = payments.filter(p => p.status === 'PENDING').length;

    const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const expiredSubs = subscriptions.filter(s => s.status === 'EXPIRED').length;

    return {
      totalBiz,
      activeBiz,
      pendingBiz,
      graceBiz,
      suspendedBiz,
      totalUsers,
      superAdminsCount,
      managersCount,
      totalRevenue,
      successfulPaymentsCount,
      pendingPaymentsCount,
      activeSubs,
      expiredSubs
    };
  }, [businesses, users, payments, subscriptions]);

  // ==============================================================================
  // BUSINESSES ACTIONS
  // ==============================================================================
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newBizOwnerName.trim() || !newBizOwnerEmail.trim()) {
      showToast('error', 'Business Name, Owner Name, and Owner Email are required.');
      return;
    }

    const newBizId = `biz-${Date.now()}`;
    const newSubId = `sub-${Date.now()}`;

    const newBiz: Business = {
      id: newBizId,
      name: newBizName.trim(),
      code: `BIZ-${newBizId.slice(-4)}`,
      category: newBizType,
      type: newBizType as any,
      ownerName: newBizOwnerName.trim(),
      ownerEmail: newBizOwnerEmail.trim().toLowerCase(),
      ownerPhone: newBizOwnerPhone.trim() || '+250 788 000 000',
      phone: newBizOwnerPhone.trim() || '+250 788 000 000',
      email: newBizOwnerEmail.trim().toLowerCase(),
      momoPaymentNumber: sysMomoMerchantNumber,
      address: newBizAddress.trim() || 'Kigali, Rwanda',
      currency: 'RWF',
      status: 'ACTIVE',
      subscriptionId: newSubId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newSub: Subscription = {
      id: newSubId,
      businessId: newBizId,
      businessName: newBiz.name,
      planName: 'Monthly SaaS Business License',
      plan: 'MONTHLY_STANDARD',
      amount: newBizMonthlyFee,
      monthlyFee: newBizMonthlyFee,
      pricePerMonth: newBizMonthlyFee,
      currency: 'RWF',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      gracePeriodDays: sysGraceDays,
      paymentMethod: 'MTN_MOMO',
      momoNumber: sysMomoMerchantNumber,
      nextPaymentAmount: newBizMonthlyFee,
      paymentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('businesses').insert([{
          id: newBiz.id,
          name: newBiz.name,
          type: newBiz.type,
          category: newBiz.category,
          owner_name: newBiz.ownerName,
          owner_email: newBiz.ownerEmail,
          owner_phone: newBiz.ownerPhone,
          phone: newBiz.phone,
          email: newBiz.email,
          address: newBiz.address,
          currency: newBiz.currency,
          status: newBiz.status,
          subscription_id: newSub.id,
          momo_payment_number: newBiz.momoPaymentNumber
        }]);

        await supabase.from('subscriptions').insert([{
          id: newSub.id,
          business_id: newSub.businessId,
          business_name: newSub.businessName,
          plan_name: newSub.planName,
          plan: newSub.plan,
          monthly_fee: newSub.monthlyFee,
          amount: newSub.amount,
          currency: newSub.currency,
          status: newSub.status,
          start_date: newSub.startDate,
          expiry_date: newSub.expiryDate,
          expires_at: newSub.expiresAt,
          next_billing_date: newSub.nextBillingDate,
          grace_period_days: newSub.gracePeriodDays,
          payment_method: newSub.paymentMethod,
          momo_number: newSub.momoNumber,
          next_payment_amount: newSub.nextPaymentAmount
        }]);
      }

      const updatedBusinesses = [newBiz, ...businesses];
      const updatedSubs = [newSub, ...subscriptions];
      setBusinesses(updatedBusinesses);
      setSubscriptions(updatedSubs);
      saveBusinesses(updatedBusinesses);
      saveSubscriptions(updatedSubs);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: newBiz.id,
        action: 'Create Business',
        category: 'Business',
        details: `Super Admin created business: ${newBiz.name} (Owner: ${newBiz.ownerName}, Email: ${newBiz.ownerEmail})`
      });

      showToast('success', `Business "${newBiz.name}" created successfully with Active 30-day license.`);
      setIsCreateBizModalOpen(false);
      setNewBizName('');
      setNewBizOwnerName('');
      setNewBizOwnerEmail('');
      setNewBizOwnerPhone('');
    } catch (err: any) {
      showToast('error', `Failed to create business: ${err.message}`);
    }
  };

  const handleUpdateBusinessStatus = async (biz: Business, newStatus: SaaSSubscriptionStatus) => {
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('businesses')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', biz.id);

        await supabase
          .from('subscriptions')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('business_id', biz.id);
      }

      const updatedBizList = businesses.map(b => b.id === biz.id ? { ...b, status: newStatus } : b);
      const updatedSubList = subscriptions.map(s => s.businessId === biz.id ? { ...s, status: newStatus } : s);
      setBusinesses(updatedBizList);
      setSubscriptions(updatedSubList);
      saveBusinesses(updatedBizList);
      saveSubscriptions(updatedSubList);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: biz.id,
        action: `Update Business Status to ${newStatus}`,
        category: 'Business',
        details: `Super Admin changed status of ${biz.name} from ${biz.status} to ${newStatus}`
      });

      showToast('success', `Business "${biz.name}" status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast('error', `Failed to update status: ${err.message}`);
    }
  };

  // ==============================================================================
  // USERS ACTIONS
  // ==============================================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('error', 'Name and Email are required.');
      return;
    }

    const cleanEmail = newUserEmail.trim().toLowerCase();
    const isSuperAdminRole = newUserRole === 'Super Admin';
    const cleanBizId = isSuperAdminRole ? undefined : (newUserBizId || (businesses[0]?.id || 'biz-primary-01'));

    const newUserId = `usr-${Date.now()}`;
    const newUserObj: AppUser = {
      id: newUserId,
      fullName: newUserName.trim(),
      email: cleanEmail,
      phone: newUserPhone.trim() || '+250 788 000 000',
      role: newUserRole,
      status: 'Active',
      accessStatus: 'Approved',
      paymentStatus: 'Paid',
      authorizedBySuperAdmin: true,
      pinCode: newUserPin || '1234',
      businessId: cleanBizId,
      isSuperAdmin: isSuperAdminRole,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        // Create in auth.users if password provided
        if (newUserPassword.trim()) {
          const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: newUserPassword.trim(),
            options: {
              data: {
                full_name: newUserObj.fullName,
                phone: newUserObj.phone,
                role: newUserRole,
                business_id: cleanBizId || null,
                is_super_admin: isSuperAdminRole
              }
            }
          });

          if (authErr) {
            console.warn('[Supabase Auth User Create Note]:', authErr);
          } else if (authData.user) {
            newUserObj.id = authData.user.id;
          }
        }

        await supabase.from('profiles').upsert([{
          id: newUserObj.id,
          business_id: cleanBizId || null,
          full_name: newUserObj.fullName,
          email: cleanEmail,
          phone: newUserObj.phone,
          role: newUserRole,
          status: 'Active',
          access_status: 'Approved',
          payment_status: 'Paid',
          is_super_admin: isSuperAdminRole,
          pin_code: newUserObj.pinCode,
          authorized_by_super_admin: true,
          authorized_at: new Date().toISOString()
        }]);
      }

      const updatedUsers = [newUserObj, ...users];
      setUsers(updatedUsers);
      saveUsers(updatedUsers);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: cleanBizId,
        action: 'Create User Account',
        category: 'User Management',
        details: `Super Admin created user: ${newUserObj.fullName} (${newUserObj.email}) with Role: ${newUserRole}`
      });

      showToast('success', `User "${newUserObj.fullName}" created successfully.`);
      setIsCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
    } catch (err: any) {
      showToast('error', `Failed to create user: ${err.message}`);
    }
  };

  const handleUpdateUserStatus = async (user: AppUser, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', user.id);
      }

      const updated = users.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
      setUsers(updated);
      saveUsers(updated);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: user.businessId,
        action: `Update User Status to ${newStatus}`,
        category: 'User Management',
        details: `Super Admin updated status for ${user.fullName} (${user.email}) to ${newStatus}`
      });

      showToast('success', `User status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast('error', `Failed to update user: ${err.message}`);
    }
  };

  const handleUpdateUserRole = async (user: AppUser, newRole: SystemRole) => {
    const isSuper = newRole === 'Super Admin';
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('profiles')
          .update({ 
            role: newRole,
            is_super_admin: isSuper,
            business_id: isSuper ? null : user.businessId
          })
          .eq('id', user.id);
      }

      const updated = users.map(u => u.id === user.id ? { 
        ...u, 
        role: newRole, 
        isSuperAdmin: isSuper,
        businessId: isSuper ? undefined : u.businessId 
      } : u);
      
      setUsers(updated);
      saveUsers(updated);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: user.businessId,
        action: 'Change User Role',
        category: 'User Management',
        details: `Super Admin changed role of ${user.fullName} (${user.email}) to ${newRole}`
      });

      showToast('success', `Role for ${user.fullName} changed to ${newRole}.`);
    } catch (err: any) {
      showToast('error', `Failed to update role: ${err.message}`);
    }
  };

  // ==============================================================================
  // SUBSCRIPTIONS & EXTENSION ACTIONS
  // ==============================================================================
  const handleExtendSubscription = async () => {
    if (!selectedSub) return;
    const daysToAdd = Number(extendDaysCount) || 30;

    const currentExpiry = selectedSub.expiryDate ? new Date(selectedSub.expiryDate) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            expiry_date: newExpiry.toISOString(),
            expires_at: newExpiry.toISOString(),
            next_billing_date: newExpiry.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSub.id);

        await supabase
          .from('businesses')
          .update({
            status: 'ACTIVE',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSub.businessId);
      }

      const updatedSubs = subscriptions.map(s => s.id === selectedSub.id ? {
        ...s,
        status: 'ACTIVE' as const,
        expiryDate: newExpiry.toISOString(),
        expiresAt: newExpiry.toISOString(),
        nextBillingDate: newExpiry.toISOString()
      } : s);

      const updatedBiz = businesses.map(b => b.id === selectedSub.businessId ? {
        ...b,
        status: 'ACTIVE' as const
      } : b);

      setSubscriptions(updatedSubs);
      setBusinesses(updatedBiz);
      saveSubscriptions(updatedSubs);
      saveBusinesses(updatedBiz);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: selectedSub.businessId,
        action: 'Extend Subscription Validity',
        category: 'Subscription',
        details: `Super Admin extended subscription for "${selectedSub.businessName}" by ${daysToAdd} days (New expiry: ${newExpiry.toLocaleDateString()})`
      });

      showToast('success', `Subscription extended by ${daysToAdd} days until ${newExpiry.toLocaleDateString()}.`);
      setIsExtendSubModalOpen(false);
      setSelectedSub(null);
    } catch (err: any) {
      showToast('error', `Failed to extend subscription: ${err.message}`);
    }
  };

  // ==============================================================================
  // PAYMENTS ACTIONS
  // ==============================================================================
  const handleVerifyPayment = async (pay: SubscriptionPayment) => {
    try {
      const updatedStatus = 'SUCCESSFUL';
      if (isSupabaseConfigured()) {
        await supabase
          .from('subscription_payments')
          .update({
            status: updatedStatus,
            verified_by: 'Super Admin'
          })
          .eq('id', pay.id);

        // Also activate the related subscription and business
        const duration = pay.durationMonths || 1;
        const newExp = new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            expiry_date: newExp,
            expires_at: newExp,
            last_payment_date: new Date().toISOString(),
            last_payment_reference: pay.paymentReference,
            transaction_reference: pay.transactionReference
          })
          .eq('business_id', pay.businessId);

        await supabase
          .from('businesses')
          .update({ status: 'ACTIVE' })
          .eq('id', pay.businessId);
      }

      const updatedPayments = payments.map(p => p.id === pay.id ? { ...p, status: 'SUCCESSFUL' as const, verifiedBy: 'Super Admin' } : p);
      setPayments(updatedPayments);
      saveSubscriptionPayments(updatedPayments);

      // Auto update subs & biz in state
      const duration = pay.durationMonths || 1;
      const newExp = new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString();
      const updatedSubs = subscriptions.map(s => s.businessId === pay.businessId ? { ...s, status: 'ACTIVE' as const, expiryDate: newExp } : s);
      const updatedBiz = businesses.map(b => b.id === pay.businessId ? { ...b, status: 'ACTIVE' as const } : b);
      setSubscriptions(updatedSubs);
      setBusinesses(updatedBiz);
      saveSubscriptions(updatedSubs);
      saveBusinesses(updatedBiz);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: pay.businessId,
        action: 'Verify Payment',
        category: 'Payment',
        details: `Super Admin verified MTN MoMo payment of ${pay.amount.toLocaleString()} RWF for ${pay.businessName} (Ref: ${pay.paymentReference || pay.transactionReference})`
      });

      showToast('success', `Payment of ${pay.amount.toLocaleString()} RWF verified. Subscription activated.`);
    } catch (err: any) {
      showToast('error', `Failed to verify payment: ${err.message}`);
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBizId) {
      showToast('error', 'Please select a business facility.');
      return;
    }

    const targetBiz = businesses.find(b => b.id === payBizId);
    if (!targetBiz) {
      showToast('error', 'Business not found.');
      return;
    }

    const payId = `PAY-${Date.now()}`;
    const txnRef = payTxnRef.trim() || `MANUAL-RW-${Date.now()}`;
    const newPayment: SubscriptionPayment = {
      id: payId,
      businessId: targetBiz.id,
      businessName: targetBiz.name,
      subscriptionId: targetBiz.subscriptionId || `sub-${targetBiz.id}`,
      amount: Number(payAmount) || 100000,
      currency: 'RWF',
      paymentMethod: 'MTN MoMo (Rwanda)',
      payerPhone: payPhone.trim() || targetBiz.phone || '0788123456',
      recipientPhone: sysMomoMerchantNumber,
      paymentReference: txnRef,
      transactionReference: txnRef,
      status: 'SUCCESSFUL',
      paidAt: new Date().toISOString(),
      verifiedBy: 'Super Admin Master Override',
      durationMonths: 1,
      createdAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('subscription_payments').insert([{
          id: newPayment.id,
          business_id: newPayment.businessId,
          business_name: newPayment.businessName,
          subscription_id: newPayment.subscriptionId,
          amount: newPayment.amount,
          currency: newPayment.currency,
          payment_method: newPayment.paymentMethod,
          payer_phone: newPayment.payerPhone,
          recipient_phone: newPayment.recipientPhone,
          payment_reference: newPayment.paymentReference,
          transaction_reference: newPayment.transactionReference,
          status: newPayment.status,
          verified_by: newPayment.verifiedBy,
          notes: payNotes
        }]);

        // Auto extend 30 days
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('subscriptions').update({
          status: 'ACTIVE',
          expiry_date: newExpiry,
          expires_at: newExpiry,
          last_payment_date: new Date().toISOString(),
          last_payment_reference: txnRef
        }).eq('business_id', targetBiz.id);

        await supabase.from('businesses').update({ status: 'ACTIVE' }).eq('id', targetBiz.id);
      }

      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      saveSubscriptionPayments(updatedPayments);

      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updatedSubs = subscriptions.map(s => s.businessId === targetBiz.id ? { ...s, status: 'ACTIVE' as const, expiryDate: newExpiry } : s);
      const updatedBiz = businesses.map(b => b.id === targetBiz.id ? { ...b, status: 'ACTIVE' as const } : b);
      setSubscriptions(updatedSubs);
      setBusinesses(updatedBiz);
      saveSubscriptions(updatedSubs);
      saveBusinesses(updatedBiz);

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        businessId: targetBiz.id,
        action: 'Record Manual Payment',
        category: 'Payment',
        details: `Super Admin manually recorded payment of ${newPayment.amount.toLocaleString()} RWF for ${targetBiz.name} (Txn: ${txnRef})`
      });

      showToast('success', `Payment of ${newPayment.amount.toLocaleString()} RWF recorded successfully.`);
      setIsRecordPaymentModalOpen(false);
      setPayTxnRef('');
      setPayPhone('');
    } catch (err: any) {
      showToast('error', `Failed to record payment: ${err.message}`);
    }
  };

  // ==============================================================================
  // LICENSE AUTHORITY ACTIONS
  // ==============================================================================
  const handleGenerateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedBizObj = businesses.find(b => b.id === licenseGenBizId);
      const result = await generateBusinessLicense({
        businessId: licenseGenBizId || '',
        businessName: selectedBizObj?.name || 'Master Business License',
        plan: licenseGenPlan,
        createdBy: currentUser.id,
        notes: licenseGenNotes.trim() || undefined
      });

      if (!result.success || !result.license) {
        throw new Error(result.error || 'Failed to generate license');
      }

      setNewlyGeneratedCode(result.license.licenseCode);
      setLicenses(loadStoredLicenses());

      showToast('success', `Business license code ${result.license.licenseCode} generated!`);
    } catch (err: any) {
      showToast('error', `Failed to generate license: ${err.message}`);
    }
  };

  const handleRevokeLicense = async (licenseId: string) => {
    if (!confirm('Are you sure you want to REVOKE this business license? It will immediately stop working.')) return;
    try {
      await revokeLicense(licenseId, currentUser, 'Revoked by Super Admin');
      setLicenses(loadStoredLicenses());
      showToast('info', 'License revoked successfully.');
    } catch (err: any) {
      showToast('error', `Failed to revoke license: ${err.message}`);
    }
  };

  // ==============================================================================
  // SYSTEM SETTINGS ACTIONS
  // ==============================================================================
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('system_settings').upsert([
          {
            key: 'pricing_plans',
            value: {
              standard_monthly_fee: sysMonthlyFee,
              currency: sysCurrency,
              grace_period_default_days: sysGraceDays
            },
            updated_at: new Date().toISOString(),
            updated_by: currentUser.email
          },
          {
            key: 'momo_config',
            value: {
              merchant_number: sysMomoMerchantNumber,
              merchant_name: sysMomoMerchantName,
              currency: sysCurrency,
              enabled: true
            },
            updated_at: new Date().toISOString(),
            updated_by: currentUser.email
          }
        ]);
      }

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        userEmail: currentUser.email,
        action: 'Update System Settings',
        category: 'System',
        details: `Super Admin updated global SaaS settings: Standard Fee = ${sysMonthlyFee} ${sysCurrency}, MoMo Merchant = ${sysMomoMerchantNumber}`
      });

      showToast('success', 'System settings saved and synchronized successfully.');
    } catch (err: any) {
      showToast('error', `Failed to save settings: ${err.message}`);
    }
  };

  // ==============================================================================
  // FILTERED DATASETS
  // ==============================================================================
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const matchSearch = 
        b.name.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.ownerName.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.email.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.phone.includes(bizSearch);
      const matchStatus = bizStatusFilter === 'ALL' || b.status === bizStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [businesses, bizSearch, bizStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(userSearch));
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchBiz = userBizFilter === 'ALL' || u.businessId === userBizFilter;
      return matchSearch && matchRole && matchBiz;
    });
  }, [users, userSearch, userRoleFilter, userBizFilter]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const matchSearch = 
        s.businessName.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.planName.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.businessId.toLowerCase().includes(subSearch.toLowerCase());
      const matchStatus = subStatusFilter === 'ALL' || s.status === subStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [subscriptions, subSearch, subStatusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = 
        p.businessName.toLowerCase().includes(paySearch.toLowerCase()) ||
        (p.paymentReference && p.paymentReference.toLowerCase().includes(paySearch.toLowerCase())) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(paySearch.toLowerCase())) ||
        (p.payerPhone && p.payerPhone.includes(paySearch));
      const matchStatus = payStatusFilter === 'ALL' || p.status === payStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, paySearch, payStatusFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      const matchSearch = 
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.details.toLowerCase().includes(auditSearch.toLowerCase());
      const matchCategory = auditCategoryFilter === 'ALL' || l.category === auditCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [auditLogs, auditSearch, auditCategoryFilter]);

  return (
    <div id="super-admin-root" className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold border ${
            feedbackMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
            feedbackMsg.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
            'bg-sky-600 text-white border-sky-500'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Super Admin Top Control Bar */}
      <header id="super-admin-header" className={`border-b sticky top-0 z-40 backdrop-blur-md ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight">YusKar Management System — Super Admin Control</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Platform Root
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.fullName}</span> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="refresh-data-btn"
              onClick={loadPlatformData}
              disabled={isLoading}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' 
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
              }`}
              title="Refresh Platform Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              id="theme-toggle-btn"
              onClick={onToggleDarkMode}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              id="superadmin-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* 8 Required Super Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 border-t border-slate-200/40 dark:border-slate-800/60">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'businesses', label: `Businesses (${businesses.length})`, icon: Building2 },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
            { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: Sparkles },
            { id: 'payments', label: `Payments (${payments.length})`, icon: DollarSign },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'reports', label: 'Reports & Analytics', icon: Layers },
            { id: 'settings', label: 'System Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ============================================================================== */}
        {/* 1. OVERVIEW TAB */}
        {/* ============================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Revenue</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black">{metrics.totalRevenue.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-bold">RWF</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {metrics.successfulPaymentsCount} verified MoMo transactions
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Businesses</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black">{metrics.totalBiz}</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                  {metrics.activeBiz} Active • {metrics.pendingBiz} Pending • {metrics.graceBiz} Grace
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Licenses</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black">{metrics.activeSubs}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {metrics.expiredSubs} expired / renewal due
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black">{metrics.totalUsers}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {metrics.superAdminsCount} Super Admins • {metrics.managersCount} Managers
                </p>
              </div>
            </div>

            {/* Quick Actions & Recent Platform Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions Panel */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Quick Platform Actions</h2>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setIsCreateBizModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Add New Business Facility
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsCreateUserModalOpen(true)}
                    className={`w-full py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Create Platform / Business User
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsRecordPaymentModalOpen(true)}
                    className={`w-full py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Record Manual MoMo Payment
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Database: {isSupabaseConfigured() ? 'Supabase Cloud (Connected)' : 'Local Offline Mode'}</span>
                  </div>
                </div>
              </div>

              {/* Recent Audit Activities */}
              <div className={`lg:col-span-2 p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Live Platform Audit Feed</h2>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {auditLogs.slice(0, 6).map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {log.category}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          Actor: {log.userName} ({log.userRole})
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No audit records logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 2. BUSINESSES TAB */}
        {/* ============================================================================== */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Business Facilities Management</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage all hotels, restaurants, bars, and resorts on the platform.
                </p>
              </div>
              <button
                id="btn-add-business"
                onClick={() => setIsCreateBizModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 self-start transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Business</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  placeholder="Search by business name, owner, email, or phone..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={bizStatusFilter}
                onChange={(e) => setBizStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="GRACE_PERIOD">Grace Period</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Businesses Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                    darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Business Facility</th>
                      <th className="py-3.5 px-4">Type / Category</th>
                      <th className="py-3.5 px-4">Owner & Contact</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Subscription</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredBusinesses.map((biz) => {
                      const relatedSub = subscriptions.find(s => s.businessId === biz.id);
                      return (
                        <tr key={biz.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{biz.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {biz.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {biz.category || biz.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>{biz.ownerName}</div>
                            <div className="text-[10px] text-slate-400">{biz.email} • {biz.phone}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              biz.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                              biz.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                              biz.status === 'GRACE_PERIOD' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30' :
                              'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}>
                              {biz.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>{relatedSub?.planName || 'Monthly SaaS Standard'}</div>
                            <div className="text-[10px] text-slate-400">
                              Expires: {relatedSub?.expiryDate ? new Date(relatedSub.expiryDate).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {biz.status !== 'ACTIVE' ? (
                                <button
                                  onClick={() => handleUpdateBusinessStatus(biz, 'ACTIVE')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] transition-all"
                                  title="Activate Business"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateBusinessStatus(biz, 'SUSPENDED')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] transition-all"
                                  title="Suspend Business"
                                >
                                  Suspend
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedBiz(biz);
                                  setIsEditBizModalOpen(true);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Edit Business Info"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredBusinesses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No business facilities found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 3. USERS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">System-Wide User Accounts</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage all staff, managers, and system administrators across the platform.
                </p>
              </div>
              <button
                id="btn-add-user"
                onClick={() => setIsCreateUserModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 self-start transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, phone..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Roles</option>
                <option value="Super Admin">Super Admin (System Root)</option>
                <option value="Manager">Manager</option>
                <option value="Accountant">Accountant</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Cashier">Cashier</option>
                <option value="Waiter">Waiter</option>
                <option value="Kitchen">Kitchen Staff</option>
              </select>

              <select
                value={userBizFilter}
                onChange={(e) => setUserBizFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Businesses</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Users Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                    darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Assigned Business</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">PIN</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredUsers.map((u) => {
                      const assignedBiz = businesses.find(b => b.id === u.businessId);
                      const isSuper = u.role === 'Super Admin' || u.isSuperAdmin;
                      return (
                        <tr key={u.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {u.fullName}
                              {isSuper && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                            <div className="text-[10px] text-slate-400">{u.email} • {u.phone}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateUserRole(u, e.target.value as SystemRole)}
                              disabled={u.id === currentUser.id}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none ${
                                isSuper 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                                  : darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="Super Admin">Super Admin</option>
                              <option value="Manager">Manager</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Receptionist">Receptionist</option>
                              <option value="Cashier">Cashier</option>
                              <option value="Waiter">Waiter</option>
                              <option value="Kitchen">Kitchen</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            {isSuper ? (
                              <span className="text-amber-500 font-semibold text-[11px]">System Level (All Businesses)</span>
                            ) : (
                              <span>{assignedBiz?.name || 'Unassigned / Default'}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                              u.status === 'Suspended' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                              'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                            {u.pinCode || '1234'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {u.id !== currentUser.id && (
                              <div className="flex items-center justify-end gap-1.5">
                                {u.status !== 'Active' ? (
                                  <button
                                    onClick={() => handleUpdateUserStatus(u, 'Active')}
                                    className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]"
                                  >
                                    Activate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateUserStatus(u, 'Suspended')}
                                    className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px]"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 4. SUBSCRIPTIONS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Platform SaaS Subscriptions & Licenses</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage license validity, issue cryptographically secured license codes, and configure plans.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-generate-license"
                  onClick={() => {
                    setNewlyGeneratedCode(null);
                    setLicenseGenBizId('');
                    setLicenseGenNotes('');
                    setIsGenerateLicenseModalOpen(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Generate License Code</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search by business name or subscription ID..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All License Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="GRACE_PERIOD">Grace Period</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Subscriptions Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                    darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Business Facility</th>
                      <th className="py-3.5 px-4">Plan & Monthly Fee</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Validity / Expiration</th>
                      <th className="py-3.5 px-4">Grace Period</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredSubscriptions.map((sub) => {
                      const expDate = sub.expiryDate ? new Date(sub.expiryDate) : null;
                      const isExp = expDate ? expDate.getTime() < Date.now() : false;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{sub.businessName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {sub.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold">{sub.amount.toLocaleString()} {sub.currency || 'RWF'} / mo</div>
                            <div className="text-[10px] text-slate-400">{sub.planName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                              sub.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                              'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className={isExp ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                              {expDate ? expDate.toLocaleDateString() : 'Not Set'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {expDate ? `${Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold">{sub.gracePeriodDays || 0} days</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedSub(sub);
                                setIsExtendSubModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Extend
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated Licenses Audit Block */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Issued Business Activation Codes & Records ({licenses.length})</span>
                </h3>
              </div>

              <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-3.5 px-4">License Code</th>
                        <th className="py-3.5 px-4">Target Business</th>
                        <th className="py-3.5 px-4">Plan & Validity</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Issued By & Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                      {licenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No license codes generated yet. Click "Generate License Code" to issue one.
                          </td>
                        </tr>
                      ) : (
                        licenses.map(lic => (
                          <tr key={lic.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-amber-500">{lic.licenseCode}</span>
                              <div className="text-[9px] text-slate-500 font-mono">Hash: {lic.licenseKeyHash.slice(0, 16)}...</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold">{lic.businessName || lic.businessId || 'Unbound (Any Business)'}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span>{lic.durationDays} Days ({lic.plan})</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                lic.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                lic.status === 'PENDING_ACTIVATION' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20' :
                                'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                {lic.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              <div>{lic.issuedBy}</div>
                              <div className="text-[10px]">{new Date(lic.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {lic.status !== 'REVOKED' && (
                                  <button
                                    onClick={() => handleRevokeLicense(lic.id)}
                                    className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px]"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================================== */}
        {/* 5. PAYMENTS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">MTN MoMo & Platform Payments</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verify MoMo merchant transactions (Recipient: 0726134041), view references, and reconcile fees.
                </p>
              </div>
              <button
                onClick={() => setIsRecordPaymentModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 self-start transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  placeholder="Search by transaction reference, payer phone, business name..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={payStatusFilter}
                onChange={(e) => setPayStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="SUCCESSFUL">Successful / Verified</option>
                <option value="PENDING">Pending Verification</option>
                <option value="FAILED">Failed</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            {/* Payments Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                    darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Transaction / Reference</th>
                      <th className="py-3.5 px-4">Business Facility</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">MoMo Details</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {pay.paymentReference || pay.transactionReference || pay.id}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(pay.paidAt || pay.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {pay.businessName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {pay.amount.toLocaleString()} {pay.currency || 'RWF'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>Payer: {pay.payerPhone || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400">Merchant: {pay.recipientPhone || '0726134041'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            pay.status === 'SUCCESSFUL' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                            pay.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {pay.status === 'PENDING' && (
                            <button
                              onClick={() => handleVerifyPayment(pay)}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all"
                            >
                              Verify & Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No payment records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 6. AUDIT LOGS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">System-Wide Security Audit Logs</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Immutable log of all Super Admin, authentication, business, and staff operations.
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by action, user, or details..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-amber-500 ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Categories</option>
                <option value="Auth">Auth</option>
                <option value="User Management">User Management</option>
                <option value="Business">Business</option>
                <option value="Subscription">Subscription</option>
                <option value="Payment">Payment</option>
                <option value="System Settings">System Settings</option>
              </select>
            </div>

            {/* Audit Log Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b uppercase font-bold text-[10px] tracking-wider text-slate-400 ${
                    darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {log.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-slate-400">{log.userRole}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {filteredAuditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No audit log records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 7. REPORTS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black tracking-tight">Platform Analytics & Intelligence</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revenue metrics, business health, and operational statistics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Health Breakdown */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Business Facility Status Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      Active Licenses
                    </span>
                    <span className="font-black">{metrics.activeBiz} ({metrics.totalBiz ? Math.round((metrics.activeBiz / metrics.totalBiz) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      Pending Payment
                    </span>
                    <span className="font-black">{metrics.pendingBiz} ({metrics.totalBiz ? Math.round((metrics.pendingBiz / metrics.totalBiz) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-sky-500" />
                      Grace Period
                    </span>
                    <span className="font-black">{metrics.graceBiz}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500" />
                      Suspended / Expired
                    </span>
                    <span className="font-black">{metrics.suspendedBiz}</span>
                  </div>
                </div>
              </div>

              {/* Revenue & Transaction Performance */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Payment Channel Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      MTN MoMo (Rwanda 0726134041)
                    </span>
                    <span className="font-black">{metrics.totalRevenue.toLocaleString()} RWF (100%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-400" />
                      Other Gateways
                    </span>
                    <span className="font-black">0 RWF (0%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* 8. SYSTEM SETTINGS TAB */}
        {/* ============================================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-lg font-black tracking-tight">Global SaaS Platform Configuration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure default license pricing, MTN MoMo recipient details, and system rules.
              </p>
            </div>

            <form onSubmit={handleSaveSystemSettings} className={`p-6 rounded-2xl border space-y-5 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Standard Monthly SaaS Fee (RWF)
                  </label>
                  <input
                    type="number"
                    value={sysMonthlyFee}
                    onChange={(e) => setSysMonthlyFee(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Default Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={sysGraceDays}
                    onChange={(e) => setSysGraceDays(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    MTN MoMo Merchant Number (Rwanda)
                  </label>
                  <input
                    type="text"
                    value={sysMomoMerchantNumber}
                    onChange={(e) => setSysMomoMerchantNumber(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-bold text-amber-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Merchant Name / Account Title
                  </label>
                  <input
                    type="text"
                    value={sysMomoMerchantName}
                    onChange={(e) => setSysMomoMerchantName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all shadow-md"
                >
                  Save Platform Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ============================================================================== */}
      {/* MODALS */}
      {/* ============================================================================== */}

      {/* 1. Create Business Modal */}
      {isCreateBizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Create New Business Facility
              </h3>
              <button
                onClick={() => setIsCreateBizModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="e.g. Kigali Sky View Lounge"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Facility Category
                  </label>
                  <select
                    value={newBizType}
                    onChange={(e) => setNewBizType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="hotel">Hotel & Resort</option>
                    <option value="restaurant">Restaurant & Dining</option>
                    <option value="bar">Bar & Lounge</option>
                    <option value="cafe">Cafe & Bakery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Monthly Fee (RWF)
                  </label>
                  <input
                    type="number"
                    value={newBizMonthlyFee}
                    onChange={(e) => setNewBizMonthlyFee(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBizOwnerName}
                    onChange={(e) => setNewBizOwnerName(e.target.value)}
                    placeholder="Jean Paul"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Owner Phone *
                  </label>
                  <input
                    type="text"
                    value={newBizOwnerPhone}
                    onChange={(e) => setNewBizOwnerPhone(e.target.value)}
                    placeholder="0788123456"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Owner Email *
                </label>
                <input
                  type="email"
                  required
                  value={newBizOwnerEmail}
                  onChange={(e) => setNewBizOwnerEmail(e.target.value)}
                  placeholder="owner@business.rw"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBizModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Create Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create User Modal */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Create User Account
              </h3>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Marie Claire"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@business.rw"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="0788123456"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as SystemRole)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Manager">Manager</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Waiter">Waiter</option>
                    <option value="Kitchen">Kitchen Staff</option>
                    <option value="Super Admin">Super Admin (System Root)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Assigned Business
                  </label>
                  <select
                    disabled={newUserRole === 'Super Admin'}
                    value={newUserBizId}
                    onChange={(e) => setNewUserBizId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    4-Digit POS PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="1234"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Extend Subscription Modal */}
      {isExtendSubModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Extend License Validity
              </h3>
              <button
                onClick={() => setIsExtendSubModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Business Facility:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedSub.businessName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Current Expiry: {selectedSub.expiryDate ? new Date(selectedSub.expiryDate).toLocaleDateString() : 'Expired / Not Set'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Extension Period
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 30, 90].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtendDaysCount(days)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        extendDaysCount === days
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExtendSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtendSubscription}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Confirm Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Record Manual Payment Modal */}
      {isRecordPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Record Manual MoMo Payment
              </h3>
              <button
                onClick={() => setIsRecordPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordManualPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select Business Facility *
                </label>
                <select
                  required
                  value={payBizId}
                  onChange={(e) => setPayBizId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">Select a facility...</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Amount (RWF) *
                  </label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Payer Phone
                  </label>
                  <input
                    type="text"
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    placeholder="0788123456"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Transaction / SMS Reference ID
                </label>
                <input
                  type="text"
                  value={payTxnRef}
                  onChange={(e) => setPayTxnRef(e.target.value)}
                  placeholder="e.g. MOMO-RW-89234"
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Record & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Generate Business License Code Modal */}
      {isGenerateLicenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Generate Business License Code
                  </h3>
                  <p className="text-[11px] text-slate-400">Cryptographically signed code for business activation</p>
                </div>
              </div>
              <button
                onClick={() => { setIsGenerateLicenseModalOpen(false); setNewlyGeneratedCode(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {newlyGeneratedCode ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-500">License Code Generated!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Send this code to the client to activate their business subscription.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-center">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">
                    Business Activation License
                  </p>
                  <p className="text-2xl font-mono font-black tracking-widest text-amber-400 select-all">
                    {newlyGeneratedCode}
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newlyGeneratedCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy License Code'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hello, here is your YusKar Management System Business License Activation Code: ${newlyGeneratedCode}. Please enter it on your portal to activate your subscription.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Send via WhatsApp</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setNewlyGeneratedCode(null); }}
                    className="text-xs text-amber-500 hover:underline font-semibold"
                  >
                    Generate Another License Code
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateLicenseSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Target Business Facility
                  </label>
                  <select
                    value={licenseGenBizId}
                    onChange={(e) => setLicenseGenBizId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">Unbound (Can activate ANY business)</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code || b.id})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Subscription Plan / Duration *
                    </label>
                    <select
                      value={licenseGenPlan}
                      onChange={(e) => setLicenseGenPlan(e.target.value as SubscriptionPlanDuration)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-bold ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="MONTHLY">Monthly (30 Days) - 100,000 RWF</option>
                      <option value="QUARTERLY">Quarterly (90 Days) - 270,000 RWF</option>
                      <option value="SEMI_ANNUAL">Semi-Annual (180 Days) - 500,000 RWF</option>
                      <option value="YEARLY">Yearly (365 Days) - 950,000 RWF</option>
                      <option value="LIFETIME">Lifetime / Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Optional Prefix (e.g. SVR7, YUSK)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={licenseGenPrefix}
                      onChange={(e) => setLicenseGenPrefix(e.target.value.toUpperCase())}
                      placeholder="e.g. YUSK"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Internal Issuance Notes
                  </label>
                  <input
                    type="text"
                    value={licenseGenNotes}
                    onChange={(e) => setLicenseGenNotes(e.target.value)}
                    placeholder="e.g. Paid via MoMo 0726134041 ref 98124"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateLicenseModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Issue License Code</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
