import { supabase, isSupabaseConfigured } from './supabase';
import { 
  AppUser, SystemRole, Business, Subscription, 
  AuditLog, UserAccessStatus, SaaSSubscriptionStatus 
} from '../types';
import { 
  saveCurrentUser, clearCurrentUser, loadCurrentUser, 
  saveCurrentBusiness,
  addAuditLog,
  INITIAL_BUSINESS, INITIAL_SUBSCRIPTION
} from './storage';

// ==========================================
// MAPPERS: Supabase Database Rows -> Application Types
// ==========================================

export function mapProfileToAppUser(
  profileRow: any, 
  authEmail: string = '', 
  businessData?: Partial<Business>
): AppUser {
  const isSuper = Boolean(profileRow.is_super_admin || profileRow.role === 'Super Admin');
  
  return {
    id: profileRow.id,
    fullName: profileRow.full_name || profileRow.fullName || (isSuper ? 'Platform Super Admin' : 'User'),
    email: profileRow.email || authEmail || '',
    phone: profileRow.phone || '',
    role: (profileRow.role as SystemRole) || (isSuper ? 'Super Admin' : 'Cashier'),
    status: (profileRow.status as 'Active' | 'Inactive' | 'Suspended') || 'Active',
    accessStatus: (profileRow.access_status || profileRow.accessStatus || 'Approved') as UserAccessStatus,
    paymentStatus: (profileRow.payment_status || profileRow.paymentStatus || 'Paid'),
    authorizedBySuperAdmin: Boolean(profileRow.is_super_admin || profileRow.authorized_by_super_admin || isSuper),
    authorizedAt: profileRow.authorized_at || undefined,
    accessExpiresAt: profileRow.access_expires_at || undefined,
    gracePeriodDays: profileRow.grace_period_days || 0,
    paymentNotes: profileRow.payment_notes || undefined,
    pinCode: profileRow.pin_code || profileRow.pinCode || '1234',
    businessId: isSuper ? undefined : (profileRow.business_id || profileRow.businessId || undefined),
    isSuperAdmin: isSuper,
    createdAt: profileRow.created_at || new Date().toISOString(),
    lastLoginAt: profileRow.last_login_at || new Date().toISOString(),
    deviceInfo: profileRow.device_info || undefined,
  };
}

export function mapBusinessRow(row: any): Business {
  return {
    id: row.id,
    name: row.name || 'My Business Facility',
    code: row.code || `BIZ-${row.id?.slice(-4)}`,
    category: row.category || row.type || 'Hotel',
    type: row.type || row.category || 'hotel',
    ownerName: row.owner_name || row.ownerName || 'Owner',
    ownerEmail: row.owner_email || row.ownerEmail || row.email || '',
    ownerPhone: row.owner_phone || row.ownerPhone || row.phone || '',
    phone: row.phone || row.owner_phone || '',
    email: row.email || row.owner_email || '',
    momoPaymentNumber: row.momo_payment_number || row.momoPaymentNumber || '0726134041',
    address: row.address || 'Kigali, Rwanda',
    currency: row.currency || 'RWF',
    status: (row.status as SaaSSubscriptionStatus) || 'PENDING_PAYMENT',
    subscriptionId: row.subscription_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapSubscriptionRow(row: any, payments: any[] = []): Subscription {
  return {
    id: row.id,
    businessId: row.business_id || row.businessId,
    businessName: row.business_name || row.businessName || 'Business Facility',
    planName: row.plan_name || row.plan || 'Monthly SaaS Business License',
    plan: row.plan || row.plan_name || 'MONTHLY_STANDARD',
    amount: row.amount || row.monthly_fee || 100000,
    monthlyFee: row.monthly_fee || row.amount || 100000,
    pricePerMonth: row.price_per_month || row.amount || 100000,
    currency: row.currency || 'RWF',
    status: (row.status as SaaSSubscriptionStatus) || 'PENDING_PAYMENT',
    startDate: row.start_date || row.startDate || undefined,
    expiryDate: row.expiry_date || row.expiryDate || row.expires_at || undefined,
    expiresAt: row.expires_at || row.expiry_date || undefined,
    nextBillingDate: row.next_billing_date || undefined,
    gracePeriodDays: row.grace_period_days || 0,
    graceExpiresAt: row.grace_expires_at || undefined,
    gracePeriodExpiresAt: row.grace_period_expires_at || undefined,
    paymentMethod: row.payment_method || 'MTN_MOMO',
    momoNumber: row.momo_number || '0726134041',
    lastPaymentDate: row.last_payment_date || undefined,
    lastPaymentReference: row.last_payment_reference || row.payment_reference || undefined,
    paymentReference: row.payment_reference || row.last_payment_reference || undefined,
    lastPaymentAmount: row.last_payment_amount || undefined,
    transactionReference: row.transaction_reference || undefined,
    nextPaymentAmount: row.next_payment_amount || 100000,
    paymentHistory: payments || [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ==========================================
// AUDIT LOGGING TO SUPABASE & LOCAL
// ==========================================

export async function logAudit(entry: {
  userId?: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  action: string;
  category: 'Auth' | 'User Management' | 'Subscription' | 'Business' | 'Payment' | 'Inventory' | 'Sales' | 'System' | 'Reports' | 'Tables' | 'Approvals' | 'WhatsApp' | 'Notifications';
  details: string;
  businessId?: string;
}): Promise<void> {
  const timestamp = new Date().toISOString();
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. In-memory record for instant UI feedback
  addAuditLog({
    userId: entry.userId || 'sys',
    userName: entry.userName || 'System',
    userRole: entry.userRole || 'System',
    userEmail: entry.userEmail || '',
    action: entry.action,
    category: entry.category as any,
    details: entry.details
  });

  // 2. Persist to Supabase audit_logs table
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([{
        id: logId,
        business_id: entry.businessId || null,
        user_id: entry.userId || null,
        user_name: entry.userName || 'System',
        user_role: entry.userRole || 'System',
        user_email: entry.userEmail || '',
        action: entry.action,
        category: entry.category,
        details: entry.details,
        timestamp: timestamp,
        created_at: timestamp
      }]);
    } catch (err) {
      console.warn('[Supabase Audit Log] Sync note:', err);
    }
  }
}

// ==========================================
// CORE AUTHENTICATION FUNCTIONS
// ==========================================

export interface LoginResult {
  success: boolean;
  user?: AppUser;
  business?: Business;
  subscription?: Subscription;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: AppUser;
  business?: Business;
  subscription?: Subscription;
  requiresEmailConfirmation?: boolean;
  error?: string;
}

/**
 * Sign In User with Supabase Auth
 * Role & permissions are verified strictly from the database profile.
 */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Email and password are required.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase credentials are not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (authError || !authData?.user) {
      const msg = authError?.message || '';
      let userFriendlyErr = 'Invalid email address or password. Please verify your credentials.';
      if (msg.includes('Email not confirmed')) {
        userFriendlyErr = 'Your email is not confirmed yet. Please check your inbox or confirm your email.';
      } else if (msg.includes('Invalid login credentials')) {
        userFriendlyErr = 'Invalid email address or password. Please check and try again.';
      }
      return { 
        success: false, 
        error: userFriendlyErr 
      };
    }

    const authUserId = authData.user.id;

    // Fetch Profile from database public.profiles
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUserId)
      .maybeSingle();

    if (profileErr) {
      console.error('[Supabase Profile Query Error]:', profileErr);
    }

    let userProfile = profileRow;

    // If user exists in Auth but not in profiles yet, initialize safely
    if (!userProfile) {
      const metadata = authData.user.user_metadata || {};
      const isSuperAdminMetadata = metadata.role === 'Super Admin' || metadata.is_super_admin === true;

      const newProfile = {
        id: authUserId,
        business_id: isSuperAdminMetadata ? null : (metadata.business_id || null),
        full_name: metadata.full_name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: metadata.phone || '',
        role: metadata.role || 'Manager',
        status: 'Active',
        access_status: 'Approved',
        payment_status: 'Paid',
        is_super_admin: Boolean(isSuperAdminMetadata),
        pin_code: metadata.pin_code || '1234',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
      };

      const { data: insertedProfile } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      userProfile = insertedProfile || newProfile;
    } else {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authUserId);
    }

    const isSuper = Boolean(userProfile.is_super_admin || userProfile.role === 'Super Admin');

    // SUPER ADMIN AUTH PATH:
    // Super Admin is a system-level role with NO business_id required.
    if (isSuper) {
      const superAdminUser = mapProfileToAppUser(userProfile, cleanEmail);
      superAdminUser.role = 'Super Admin';
      superAdminUser.isSuperAdmin = true;
      superAdminUser.businessId = undefined;

      saveCurrentUser(superAdminUser);

      await logAudit({
        userId: superAdminUser.id,
        userName: superAdminUser.fullName,
        userRole: 'Super Admin',
        userEmail: superAdminUser.email,
        action: 'Super Admin Login',
        category: 'Auth',
        details: 'Super Admin signed in with platform master authorization'
      });

      return {
        success: true,
        user: superAdminUser,
        business: undefined,
        subscription: undefined
      };
    }

    // BUSINESS USER AUTH PATH:
    // Check account status
    if (userProfile.status === 'Suspended' || userProfile.status === 'Inactive') {
      await logAudit({
        userId: authUserId,
        userName: userProfile.full_name || cleanEmail,
        userRole: userProfile.role || 'User',
        userEmail: cleanEmail,
        action: 'Denied Login (Suspended Account)',
        category: 'Auth',
        details: `Access denied because user account status is ${userProfile.status}`
      });
      return {
        success: false,
        error: `Your account is currently ${userProfile.status.toLowerCase()}. Please contact your business administrator.`
      };
    }

    let business: Business = INITIAL_BUSINESS;
    if (userProfile.business_id) {
      const { data: bizRow } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userProfile.business_id)
        .maybeSingle();

      if (bizRow) {
        business = mapBusinessRow(bizRow);
      }
    }

    // Check business suspension status
    if (business && (business.status === 'SUSPENDED' || (business.status as string) === 'Inactive')) {
      await logAudit({
        userId: authUserId,
        userName: userProfile.full_name || cleanEmail,
        userRole: userProfile.role || 'User',
        userEmail: cleanEmail,
        businessId: business.id,
        action: 'Denied Login (Suspended Business)',
        category: 'Auth',
        details: `Access denied because business (${business.name}) is suspended`
      });
      return {
        success: false,
        error: 'Your business facility is currently suspended. Please contact platform support.'
      };
    }

    let subscription: Subscription = INITIAL_SUBSCRIPTION;
    if (business?.id) {
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', business.id)
        .maybeSingle();

      if (subRow) {
        subscription = mapSubscriptionRow(subRow);
      }
    }

    const appUser = mapProfileToAppUser(userProfile, cleanEmail, business);
    saveCurrentUser(appUser);
    saveCurrentBusiness(business);

    await logAudit({
      userId: appUser.id,
      userName: appUser.fullName,
      userRole: appUser.role,
      userEmail: appUser.email,
      businessId: business.id,
      action: 'User Login',
      category: 'Auth',
      details: `${appUser.role} (${appUser.fullName}) signed in to business ${business.name}`
    });

    return {
      success: true,
      user: appUser,
      business,
      subscription
    };
  } catch (err: any) {
    console.error('[Supabase Auth Error]:', err);
    return {
      success: false,
      error: err.message || 'Authentication failed. Please check your network connection.'
    };
  }
}

/**
 * Register New Business & Owner Profile in Supabase
 */
export async function registerBusinessUser(params: {
  businessName: string;
  businessType: string;
  businessId?: string;
  ownerFullName: string;
  email: string;
  phone: string;
  password: string;
  pin?: string;
}): Promise<RegisterResult> {
  const cleanBizName = params.businessName.trim() || 'My Business Facility';
  const cleanFullName = params.ownerFullName.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim() || '+250 788 000 000';
  const cleanPassword = params.password.trim();
  const cleanPin = params.pin?.trim() || '1234';

  if (!cleanFullName || !cleanEmail || !cleanPassword) {
    return { success: false, error: 'Full Name, Email, and Password are required.' };
  }

  if (cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    };
  }

  // Format custom entered business ID or generate formatted ID
  const rawEnteredId = params.businessId?.trim();
  const sanitizedId = rawEnteredId 
    ? rawEnteredId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    : '';
  const newBizId = sanitizedId || `biz-${Date.now()}`;
  const bizCode = rawEnteredId ? rawEnteredId.toUpperCase() : `BIZ-${newBizId.slice(-6).toUpperCase()}`;
  const newSubId = `sub-${Date.now()}`;

  try {
    // 1. Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          full_name: cleanFullName,
          phone: cleanPhone,
          role: 'Manager',
          business_id: newBizId,
          business_name: cleanBizName,
          is_business_owner: true,
        }
      }
    });

    if (authError) {
      let errText = authError.message;
      if (authError.message.includes('already registered')) {
        errText = 'An account with this email address already exists. Please sign in.';
      }
      return { success: false, error: errText };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return {
        success: false,
        error: 'Unable to initialize user account with authentication provider.'
      };
    }

    // 2. Create Business Record
    const newBusinessRow = {
      id: newBizId,
      name: cleanBizName,
      code: bizCode,
      type: params.businessType,
      category: params.businessType,
      owner_name: cleanFullName,
      owner_email: cleanEmail,
      owner_phone: cleanPhone,
      phone: cleanPhone,
      email: cleanEmail,
      momo_payment_number: '0726134041',
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      subscription_id: newSubId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase.from('businesses').insert([newBusinessRow]);

    // 3. Create Profile Record linked to auth.users.id
    const newProfileRow = {
      id: authUserId,
      business_id: newBizId,
      full_name: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'Manager',
      status: 'Active',
      access_status: 'Pending Payment',
      payment_status: 'Unpaid',
      pin_code: cleanPin,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };

    await supabase.from('profiles').upsert([newProfileRow]);

    // 4. Create Initial Subscription Record
    const newSubRow = {
      id: newSubId,
      business_id: newBizId,
      business_name: cleanBizName,
      plan_name: 'Monthly SaaS Business License',
      plan: 'MONTHLY_STANDARD',
      monthly_fee: 100000,
      price_per_month: 100000,
      amount: 100000,
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      grace_period_days: 7,
      payment_method: 'MTN_MOMO',
      momo_number: '0726134041',
      next_payment_amount: 100000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase.from('subscriptions').insert([newSubRow]);

    const appUser = mapProfileToAppUser(newProfileRow, cleanEmail);
    const businessObj = mapBusinessRow(newBusinessRow);
    const subObj = mapSubscriptionRow(newSubRow);

    saveCurrentUser(appUser);
    saveCurrentBusiness(businessObj);

    await logAudit({
      userId: appUser.id,
      userName: appUser.fullName,
      userRole: appUser.role,
      userEmail: appUser.email,
      businessId: newBizId,
      action: 'Business Registration',
      category: 'Auth',
      details: `New business registered: ${cleanBizName} by ${cleanFullName} (${cleanEmail})`
    });

    return {
      success: true,
      user: appUser,
      business: businessObj,
      subscription: subObj,
      requiresEmailConfirmation: authData.session === null
    };
  } catch (err: any) {
    console.error('[Supabase Registration Error]:', err);
    return { success: false, error: err.message || 'Registration failed. Please check your details.' };
  }
}

/**
 * Register Staff Member linked to an authorized business
 */
export async function registerStaffUser(params: {
  businessId: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  pin: string;
  role: SystemRole;
}): Promise<RegisterResult> {
  const cleanFullName = params.fullName.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim();
  const cleanPassword = params.password.trim();
  const cleanPin = params.pin.trim() || '1234';

  if (!cleanFullName || !cleanEmail || !cleanPassword) {
    return { success: false, error: 'Full Name, Email, and Password are required.' };
  }

  if (cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    };
  }

  // Allowed staff roles (Strictly forbid selecting Super Admin)
  const allowedRoles: SystemRole[] = ['Cashier', 'Waiter', 'Receptionist', 'Kitchen', 'Manager', 'Accountant'];
  const safeRole: SystemRole = allowedRoles.includes(params.role) ? params.role : 'Cashier';

  try {
    // 1. Verify target business exists
    const { data: targetBiz, error: bizErr } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', params.businessId)
      .maybeSingle();

    if (bizErr || !targetBiz) {
      return {
        success: false,
        error: `Business identifier "${params.businessId}" was not found. Please verify with your manager.`
      };
    }

    // 2. Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          full_name: cleanFullName,
          phone: cleanPhone,
          role: safeRole,
          business_id: params.businessId,
        }
      }
    });

    if (authError) {
      let errText = authError.message;
      if (authError.message.includes('already registered')) {
        errText = 'An account with this email address already exists. Please sign in.';
      }
      return { success: false, error: errText };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return {
        success: false,
        error: 'Unable to initialize staff account with authentication provider.'
      };
    }

    const newProfileRow = {
      id: authUserId,
      business_id: params.businessId,
      full_name: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      role: safeRole,
      status: 'Active',
      access_status: 'Approved',
      payment_status: 'Paid',
      pin_code: cleanPin,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };

    await supabase.from('profiles').upsert([newProfileRow]);

    const appUser = mapProfileToAppUser(newProfileRow, cleanEmail);

    await logAudit({
      userId: appUser.id,
      userName: appUser.fullName,
      userRole: appUser.role,
      userEmail: appUser.email,
      businessId: params.businessId,
      action: 'Staff Registration',
      category: 'Auth',
      details: `Staff member registered: ${appUser.fullName} (${appUser.role}) for business ${targetBiz.name} (${params.businessId})`
    });

    return { 
      success: true, 
      user: appUser,
      requiresEmailConfirmation: authData.session === null
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Staff registration failed.' };
  }
}

/**
 * Sign Out User from Supabase and clear session
 */
export async function logoutUser(): Promise<void> {
  const currentUser = loadCurrentUser();
  if (currentUser) {
    await logAudit({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      userEmail: currentUser.email,
      businessId: currentUser.businessId,
      action: 'User Logout',
      category: 'Auth',
      details: `${currentUser.role} (${currentUser.fullName}) signed out of system`
    });
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase SignOut Note]:', err);
    }
  }

  clearCurrentUser();
}

/**
 * Restore Authenticated Session (on page load / cross-device)
 */
export async function getCurrentUser(): Promise<{
  user: AppUser | null;
  business: Business | null;
  subscription: Subscription | null;
}> {
  if (isSupabaseConfigured()) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        const localUser = loadCurrentUser();
        return { user: localUser, business: null, subscription: null };
      }

      const authUser = session.user;
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profileRow) {
        const localUser = loadCurrentUser();
        return { user: localUser, business: null, subscription: null };
      }

      const isSuper = Boolean(profileRow.is_super_admin || profileRow.role === 'Super Admin');

      if (isSuper) {
        const appUser = mapProfileToAppUser(profileRow, authUser.email || '');
        appUser.role = 'Super Admin';
        appUser.isSuperAdmin = true;
        appUser.businessId = undefined;
        saveCurrentUser(appUser);
        return { user: appUser, business: null, subscription: null };
      }

      // Check account suspension
      if (profileRow.status === 'Suspended' || profileRow.status === 'Inactive') {
        return { user: null, business: null, subscription: null };
      }

      // Fetch Business
      let business: Business = INITIAL_BUSINESS;
      if (profileRow.business_id) {
        const { data: bizRow } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', profileRow.business_id)
          .maybeSingle();

        if (bizRow) {
          business = mapBusinessRow(bizRow);
        }
      }

      // If business is suspended, deny session
      if (business && (business.status === 'SUSPENDED' || (business.status as string) === 'Inactive')) {
        return { user: null, business: null, subscription: null };
      }

      // Fetch Subscription
      let subscription: Subscription = INITIAL_SUBSCRIPTION;
      if (business?.id) {
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', business.id)
          .maybeSingle();

        if (subRow) {
          subscription = mapSubscriptionRow(subRow);
        }
      }

      const appUser = mapProfileToAppUser(profileRow, authUser.email || '', business);
      saveCurrentUser(appUser);
      saveCurrentBusiness(business);

      return { user: appUser, business, subscription };
    } catch (err) {
      console.warn('[Supabase GetSession Note]:', err);
    }
  }

  const localUser = loadCurrentUser();
  return { user: localUser, business: null, subscription: null };
}

/**
 * Get active Supabase session
 */
export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Subscribe to Supabase Auth State changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} };
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
}

