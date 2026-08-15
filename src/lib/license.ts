import { 
  SubscriptionLicense, SubscriptionPlanDuration, LicenseStatus, 
  Business, Subscription, AppUser 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { logAudit } from './auth';
import { 
  loadBusinesses, saveBusinesses, 
  loadSubscriptions, saveSubscriptions,
  loadCurrentBusiness, saveCurrentBusiness,
  loadCurrentUser, saveCurrentUser
} from './storage';

// ==============================================================================
// 1. SUBSCRIPTION PLANS CONFIGURATION (RWF CURRENCY)
// ==============================================================================
export interface SubscriptionPlanConfig {
  id: SubscriptionPlanDuration;
  name: string;
  durationDays: number;
  amount: number;
  currency: 'RWF';
  badge: string;
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanDuration, SubscriptionPlanConfig> = {
  MONTHLY: {
    id: 'MONTHLY',
    name: 'Monthly License',
    durationDays: 30,
    amount: 100000,
    currency: 'RWF',
    badge: '30 Days',
    description: 'Standard monthly operations terminal access'
  },
  QUARTERLY: {
    id: 'QUARTERLY',
    name: 'Quarterly License',
    durationDays: 90,
    amount: 280000,
    currency: 'RWF',
    badge: '90 Days',
    description: '3 months full enterprise terminal access'
  },
  SEMI_ANNUAL: {
    id: 'SEMI_ANNUAL',
    name: 'Semi-Annual License',
    durationDays: 180,
    amount: 550000,
    currency: 'RWF',
    badge: '180 Days',
    description: '6 months comprehensive multi-terminal license'
  },
  YEARLY: {
    id: 'YEARLY',
    name: 'Yearly Enterprise License',
    durationDays: 365,
    amount: 1000000,
    currency: 'RWF',
    badge: '365 Days',
    description: '1 full year priority enterprise license'
  }
};

const STORAGE_KEYS = {
  LICENSES: 'yuskar_subscription_licenses',
  ACTIVE_LICENSE: 'yuskar_active_license'
};

// ==============================================================================
// 2. CRYPTOGRAPHIC UTILITIES (SHA-256 HASHING & CODE GENERATION)
// ==============================================================================

/**
 * Generates an unpredictable, formatted business license code.
 * Format: [PREFIX]-[4-CHAR]-[4-CHAR] (e.g. SVR7-X92K-4M8P or YUSK-98AF-21C4)
 */
export function generateLicenseCode(customPrefix?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous set
  
  let prefix = (customPrefix || 'YUSK').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (prefix.length > 4) prefix = prefix.slice(0, 4);
  while (prefix.length < 4) prefix += 'X';

  const getRandomSegment = (len = 4) => {
    let res = '';
    const array = new Uint8Array(len);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < len; i++) {
        res += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < len; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return res;
  };

  return `${prefix}-${getRandomSegment(4)}-${getRandomSegment(4)}`;
}

/**
 * Computes secure SHA-256 hash of a license code.
 */
export async function hashLicenseCode(rawCode: string): Promise<string> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`YUSKAR-SALT-${cleanCode}`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hashing for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hsh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// ==============================================================================
// 3. PERSISTENCE HELPERS
// ==============================================================================

export function loadStoredLicenses(): SubscriptionLicense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LICENSES);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading stored licenses:', err);
  }
  return [];
}

export function saveStoredLicenses(licenses: SubscriptionLicense[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(licenses));
  } catch (err) {
    console.error('Error saving licenses:', err);
  }
}

// ==============================================================================
// 4. SUPER ADMIN ACTIONS: GENERATE, EXTEND, SUSPEND, REVOKE
// ==============================================================================

export interface GenerateLicenseParams {
  businessId: string;
  businessName?: string;
  plan: SubscriptionPlanDuration;
  customDurationDays?: number;
  createdBy: string;
  notes?: string;
}

export interface LicenseActionResult {
  success: boolean;
  license?: SubscriptionLicense;
  subscription?: Subscription;
  business?: Business;
  error?: string;
  message?: string;
}

/**
 * Super Admin generates a unique cryptographic license code for a business.
 */
export async function generateBusinessLicense(params: GenerateLicenseParams): Promise<LicenseActionResult> {
  try {
    const planConfig = SUBSCRIPTION_PLANS[params.plan] || SUBSCRIPTION_PLANS.MONTHLY;
    const durationDays = params.customDurationDays || planConfig.durationDays;
    
    // Prefix based on business name or standard
    const prefixCandidate = params.businessName 
      ? params.businessName.split(' ').map(w => w[0]).join('').slice(0, 4) 
      : 'YUSK';
    const licenseCode = generateLicenseCode(prefixCandidate || 'YUSK');
    const licenseHash = await hashLicenseCode(licenseCode);

    const licenseId = `LIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const newLicense: SubscriptionLicense = {
      id: licenseId,
      businessId: params.businessId,
      businessName: params.businessName || 'Business Facility',
      licenseCode,
      licenseHash,
      plan: params.plan,
      durationDays,
      status: 'PENDING',
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      notes: params.notes || `Generated by Super Admin for ${durationDays} days (${planConfig.name})`
    };

    // 1. Save to Supabase `subscription_licenses` table if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('subscription_licenses').insert([{
          id: newLicense.id,
          business_id: newLicense.businessId,
          business_name: newLicense.businessName,
          license_code: newLicense.licenseCode,
          license_hash: newLicense.licenseHash,
          plan: newLicense.plan,
          duration_days: newLicense.durationDays,
          status: newLicense.status,
          created_by: newLicense.createdBy,
          created_at: newLicense.createdAt,
          updated_at: newLicense.updatedAt,
          notes: newLicense.notes
        }]);
      } catch (dbErr) {
        console.warn('[Supabase License Insert Note]:', dbErr);
      }
    }

    // 2. Save locally
    const existing = loadStoredLicenses();
    const updatedList = [newLicense, ...existing];
    saveStoredLicenses(updatedList);

    // 3. Log Audit
    await logAudit({
      userId: params.createdBy,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      businessId: params.businessId,
      action: 'Generate Business License Code',
      category: 'Subscription',
      details: `Generated ${durationDays}-day (${params.plan}) license code [${licenseCode}] for business ${params.businessName || params.businessId}`
    });

    return {
      success: true,
      license: newLicense,
      message: `License code ${licenseCode} generated successfully for ${durationDays} days.`
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to generate license code.'
    };
  }
}

/**
 * Activates a business subscription using a valid license code.
 * Used by Business Manager on the Payment / Activation Gate.
 */
export async function activateBusinessWithLicense(
  businessId: string, 
  rawLicenseCode: string,
  activatedByUser?: AppUser
): Promise<LicenseActionResult> {
  const cleanCode = rawLicenseCode.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode) {
    return { success: false, error: 'Please enter a valid license code.' };
  }

  try {
    let targetLicense: SubscriptionLicense | null = null;

    // 1. Verify in Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data: licenseRow, error: licErr } = await supabase
          .from('subscription_licenses')
          .select('*')
          .eq('license_code', cleanCode)
          .maybeSingle();

        if (licenseRow) {
          targetLicense = {
            id: licenseRow.id,
            businessId: licenseRow.business_id,
            businessName: licenseRow.business_name,
            licenseCode: licenseRow.license_code,
            licenseHash: licenseRow.license_hash,
            plan: licenseRow.plan,
            durationDays: licenseRow.duration_days,
            startDate: licenseRow.start_date,
            endDate: licenseRow.end_date,
            status: licenseRow.status,
            activatedAt: licenseRow.activated_at,
            expiresAt: licenseRow.expires_at,
            createdBy: licenseRow.created_by,
            createdAt: licenseRow.created_at,
            updatedAt: licenseRow.updated_at,
            notes: licenseRow.notes
          };
        }
      } catch (e) {
        console.warn('[Supabase License Fetch Note]:', e);
      }
    }

    // Fallback to local storage
    if (!targetLicense) {
      const stored = loadStoredLicenses();
      targetLicense = stored.find(l => l.licenseCode === cleanCode) || null;
    }

    if (!targetLicense) {
      return {
        success: false,
        error: 'Invalid license code. Please check the code or contact your Super Admin for verification.'
      };
    }

    // Security check: Must match business
    if (targetLicense.businessId && targetLicense.businessId !== businessId) {
      return {
        success: false,
        error: 'This license code was issued for another business establishment and cannot be used here.'
      };
    }

    // Check status
    if (targetLicense.status === 'REVOKED') {
      return {
        success: false,
        error: 'This license code has been revoked by the Super Admin.'
      };
    }

    if (targetLicense.status === 'ACTIVE' && targetLicense.expiresAt) {
      const expTime = new Date(targetLicense.expiresAt).getTime();
      if (expTime < Date.now()) {
        return {
          success: false,
          error: 'This license code has already expired. Please request a new renewal code.'
        };
      }
    }

    const durationDays = targetLicense.durationDays || 30;
    const now = new Date();
    
    // Check if extending active subscription or starting fresh
    const allSubs = loadSubscriptions();
    const currentSub = allSubs.find(s => s.businessId === businessId);
    
    let startDate = now;
    let expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // If currently active with remaining time, extend from existing expiry date
    if (currentSub?.expiryDate && new Date(currentSub.expiryDate).getTime() > now.getTime()) {
      startDate = new Date(currentSub.startDate || now.toISOString());
      expiryDate = new Date(new Date(currentSub.expiryDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // Update License Object
    targetLicense.status = 'ACTIVE';
    targetLicense.startDate = startDate.toISOString();
    targetLicense.endDate = expiryDate.toISOString();
    targetLicense.activatedAt = now.toISOString();
    targetLicense.expiresAt = expiryDate.toISOString();
    targetLicense.updatedAt = now.toISOString();

    // 2. Persist License in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('subscription_licenses')
          .update({
            status: 'ACTIVE',
            start_date: targetLicense.startDate,
            end_date: targetLicense.endDate,
            activated_at: targetLicense.activatedAt,
            expires_at: targetLicense.expiresAt,
            updated_at: targetLicense.updatedAt
          })
          .eq('id', targetLicense.id);

        // Update Business to ACTIVE
        await supabase
          .from('businesses')
          .update({
            status: 'ACTIVE',
            updated_at: now.toISOString()
          })
          .eq('id', businessId);

        // Update or Create Subscription Record in Supabase
        await supabase
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            plan: targetLicense.plan,
            start_date: targetLicense.startDate,
            expiry_date: targetLicense.endDate,
            expires_at: targetLicense.endDate,
            next_billing_date: targetLicense.endDate,
            updated_at: now.toISOString()
          })
          .eq('business_id', businessId);
      } catch (err) {
        console.warn('[Supabase Sync License Activation Note]:', err);
      }
    }

    // 3. Update Local Storage for Instant Responsiveness
    const allLicenses = loadStoredLicenses();
    const updatedLicenses = allLicenses.map(l => l.id === targetLicense!.id ? targetLicense! : l);
    if (!updatedLicenses.some(l => l.id === targetLicense!.id)) {
      updatedLicenses.unshift(targetLicense);
    }
    saveStoredLicenses(updatedLicenses);

    // Update Businesses List
    const allBusinesses = loadBusinesses();
    const updatedBusinesses = allBusinesses.map(b => b.id === businessId ? {
      ...b,
      status: 'ACTIVE' as const,
      updatedAt: now.toISOString()
    } : b);
    saveBusinesses(updatedBusinesses);

    // Update Subscriptions List
    const updatedSubs = allSubs.map(s => s.businessId === businessId ? {
      ...s,
      status: 'ACTIVE' as const,
      plan: targetLicense!.plan,
      startDate: targetLicense!.startDate,
      expiryDate: targetLicense!.endDate,
      expiresAt: targetLicense!.endDate,
      nextBillingDate: targetLicense!.endDate,
      updatedAt: now.toISOString()
    } : s);
    saveSubscriptions(updatedSubs);

    const activeBiz = updatedBusinesses.find(b => b.id === businessId) || loadCurrentBusiness();
    const activeSub = updatedSubs.find(s => s.businessId === businessId);

    saveCurrentBusiness(activeBiz);

    // 4. Log Audit Trail
    await logAudit({
      userId: activatedByUser?.id || 'mgr',
      userName: activatedByUser?.fullName || 'Business Manager',
      userRole: activatedByUser?.role || 'Manager',
      businessId: businessId,
      action: 'Activate Business License',
      category: 'Subscription',
      details: `Activated ${durationDays}-day license (${targetLicense.plan}) until ${expiryDate.toLocaleDateString()} using code [${cleanCode}]`
    });

    return {
      success: true,
      license: targetLicense,
      subscription: activeSub,
      business: activeBiz,
      message: `✓ License activated! Business subscription active for ${durationDays} days until ${expiryDate.toLocaleDateString()}.`
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Activation failed. Please check your network and try again.'
    };
  }
}

/**
 * Super Admin directly extends a business subscription.
 */
export async function extendBusinessSubscription(
  businessId: string,
  daysToAdd: number,
  adminUser: AppUser,
  reason: string = 'Super Admin Direct Extension'
): Promise<LicenseActionResult> {
  const now = new Date();
  const allSubs = loadSubscriptions();
  const currentSub = allSubs.find(s => s.businessId === businessId);

  const baseDate = currentSub?.expiryDate && new Date(currentSub.expiryDate).getTime() > now.getTime()
    ? new Date(currentSub.expiryDate)
    : now;

  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          expiry_date: newExpiry.toISOString(),
          expires_at: newExpiry.toISOString(),
          next_billing_date: newExpiry.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('business_id', businessId);

      await supabase
        .from('businesses')
        .update({
          status: 'ACTIVE',
          updated_at: now.toISOString()
        })
        .eq('id', businessId);
    }

    const updatedBusinesses = loadBusinesses().map(b => b.id === businessId ? {
      ...b,
      status: 'ACTIVE' as const,
      updatedAt: now.toISOString()
    } : b);
    saveBusinesses(updatedBusinesses);

    const updatedSubs = allSubs.map(s => s.businessId === businessId ? {
      ...s,
      status: 'ACTIVE' as const,
      expiryDate: newExpiry.toISOString(),
      expiresAt: newExpiry.toISOString(),
      nextBillingDate: newExpiry.toISOString(),
      updatedAt: now.toISOString()
    } : s);
    saveSubscriptions(updatedSubs);

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.fullName,
      userRole: 'Super Admin',
      businessId,
      action: 'Extend Subscription',
      category: 'Subscription',
      details: `Extended business subscription by ${daysToAdd} days until ${newExpiry.toLocaleDateString()}. Reason: ${reason}`
    });

    return {
      success: true,
      message: `Subscription extended by ${daysToAdd} days until ${newExpiry.toLocaleDateString()}.`
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin suspends a business subscription.
 */
export async function suspendBusinessSubscription(
  businessId: string,
  adminUser: AppUser,
  reason: string = 'Administrative suspension'
): Promise<LicenseActionResult> {
  const now = new Date().toISOString();
  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('businesses')
        .update({ status: 'SUSPENDED', updated_at: now })
        .eq('id', businessId);

      await supabase
        .from('subscriptions')
        .update({ status: 'SUSPENDED', updated_at: now })
        .eq('business_id', businessId);
    }

    const updatedBiz = loadBusinesses().map(b => b.id === businessId ? { ...b, status: 'SUSPENDED' as const } : b);
    saveBusinesses(updatedBiz);

    const updatedSubs = loadSubscriptions().map(s => s.businessId === businessId ? { ...s, status: 'SUSPENDED' as const } : s);
    saveSubscriptions(updatedSubs);

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.fullName,
      userRole: 'Super Admin',
      businessId,
      action: 'Suspend Business Subscription',
      category: 'Subscription',
      details: `Suspended business subscription. Reason: ${reason}`
    });

    return { success: true, message: 'Business subscription suspended.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin reactivates a suspended business subscription.
 */
export async function reactivateBusinessSubscription(
  businessId: string,
  adminUser: AppUser
): Promise<LicenseActionResult> {
  const now = new Date().toISOString();
  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('businesses')
        .update({ status: 'ACTIVE', updated_at: now })
        .eq('id', businessId);

      await supabase
        .from('subscriptions')
        .update({ status: 'ACTIVE', updated_at: now })
        .eq('business_id', businessId);
    }

    const updatedBiz = loadBusinesses().map(b => b.id === businessId ? { ...b, status: 'ACTIVE' as const } : b);
    saveBusinesses(updatedBiz);

    const updatedSubs = loadSubscriptions().map(s => s.businessId === businessId ? { ...s, status: 'ACTIVE' as const } : s);
    saveSubscriptions(updatedSubs);

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.fullName,
      userRole: 'Super Admin',
      businessId,
      action: 'Reactivate Business Subscription',
      category: 'Subscription',
      details: `Reactivated business subscription to ACTIVE`
    });

    return { success: true, message: 'Business subscription reactivated to ACTIVE.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin revokes a license.
 */
export async function revokeLicense(
  licenseId: string,
  adminUser: AppUser,
  reason: string = 'Revoked by Super Admin'
): Promise<LicenseActionResult> {
  const now = new Date().toISOString();
  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('subscription_licenses')
        .update({ status: 'REVOKED', updated_at: now, notes: reason })
        .eq('id', licenseId);
    }

    const stored = loadStoredLicenses();
    const updated = stored.map(l => l.id === licenseId ? { ...l, status: 'REVOKED' as const, notes: reason } : l);
    saveStoredLicenses(updated);

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.fullName,
      userRole: 'Super Admin',
      action: 'Revoke License Code',
      category: 'Subscription',
      details: `Revoked license [${licenseId}]. Reason: ${reason}`
    });

    return { success: true, message: 'License revoked successfully.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
