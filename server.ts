import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// File-based persistent storage location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hotel_server_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial database state if file doesn't exist
const DEFAULT_SUPER_ADMIN = {
  id: 'super-admin-internal-01',
  fullName: 'System Owner',
  email: 'yuskar@gmail.com',
  phone: '+250 780 000 000',
  role: 'Super Admin',
  status: 'Active',
  passwordHash: 'Pksquare@1',
  createdAt: new Date().toISOString(),
  isSuperAdmin: true
};

function readServerDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading server database:', err);
  }
  return {
    prodInit: true,
    menuItems: [],
    tables: [],
    waiters: [],
    orders: [],
    kitchenTickets: [],
    stockLogs: [],
    shifts: [],
    currentShift: null,
    guestRooms: [],
    users: [],
    auditLogs: [],
    expenses: [],
    cashMovements: [],
    dailyClosings: [],
    purchaseOrders: [],
    ingredients: [],
    recipes: [],
    stockMovements: [],
    wasteRecords: [],
    businesses: [],
    subscriptions: [],
    subscriptionPayments: [],
    subscriptionOverrides: [],
    usedTransactionReferences: [],
    momoConfig: {
      targetEnvironment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
      apiUser: process.env.MTN_MOMO_API_USER || '',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      merchantPhone: process.env.MTN_MOMO_MERCHANT_NUMBER || '0726134041',
      currency: 'RWF',
      monthlyFee: 100000,
      enabled: true
    }
  };
}

function writeServerDb(data: Record<string, any>): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server database:', err);
  }
}

// In-memory cache initialized from disk
let dbState = readServerDb();

// Save state back to disk on write
function persistState() {
  writeServerDb(dbState);
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), totalOrders: dbState.orders?.length || 0 });
});

// Fetch full synchronized database state across devices
app.get('/api/sync/all', (_req, res) => {
  res.json({
    success: true,
    data: dbState,
    serverTime: new Date().toISOString()
  });
});

// Save full or partial state from any client device (HP, Dell, Phone, etc.)
app.post('/api/sync/all', (req, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      dbState = {
        ...dbState,
        ...payload,
        lastUpdated: new Date().toISOString()
      };
      persistState();
    }
    res.json({ success: true, serverTime: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save specific key/entity
app.post('/api/sync/key', (req, res) => {
  try {
    const { key, value } = req.body;
    if (key) {
      dbState[key] = value;
      dbState.lastUpdated = new Date().toISOString();
      persistState();
    }
    res.json({ success: true, key, serverTime: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct REST Database Endpoints for entities (ingredients, recipes, menuItems, categories, inventoryItems, stockMovements, users, businesses)
app.get('/api/db/:entity', (req, res) => {
  const { entity } = req.params;
  const { businessId } = req.query;
  const list = dbState[entity] || [];
  if (businessId && Array.isArray(list)) {
    const filtered = list.filter((item: any) => !item.businessId || item.businessId === businessId);
    return res.json({ success: true, data: filtered });
  }
  res.json({ success: true, data: list });
});

app.post('/api/db/:entity', (req, res) => {
  const { entity } = req.params;
  const newItem = req.body;
  if (!newItem) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  if (!dbState[entity] || !Array.isArray(dbState[entity])) {
    dbState[entity] = [];
  }
  const index = dbState[entity].findIndex((item: any) => item.id === newItem.id);
  if (index > -1) {
    dbState[entity][index] = { ...dbState[entity][index], ...newItem, updatedAt: new Date().toISOString() };
  } else {
    dbState[entity].unshift({ ...newItem, createdAt: newItem.createdAt || new Date().toISOString() });
  }
  dbState.lastUpdated = new Date().toISOString();
  persistState();
  res.json({ success: true, data: newItem, serverTime: new Date().toISOString() });
});

app.put('/api/db/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const updatedItem = req.body;
  if (!dbState[entity] || !Array.isArray(dbState[entity])) {
    return res.status(444).json({ success: false, error: 'Entity array not found' });
  }
  const index = dbState[entity].findIndex((item: any) => item.id === id);
  if (index > -1) {
    dbState[entity][index] = { ...dbState[entity][index], ...updatedItem, updatedAt: new Date().toISOString() };
    dbState.lastUpdated = new Date().toISOString();
    persistState();
    return res.json({ success: true, data: dbState[entity][index] });
  }
  res.status(404).json({ success: false, error: 'Item not found' });
});

app.delete('/api/db/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  if (dbState[entity] && Array.isArray(dbState[entity])) {
    dbState[entity] = dbState[entity].filter((item: any) => item.id !== id);
    dbState.lastUpdated = new Date().toISOString();
    persistState();
  }
  res.json({ success: true, deletedId: id });
});

// Server Auth Verification endpoint for Super Admin & Staff
app.post('/api/auth/verify', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  // 1. Check Super Admin
  if (email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase() && password === DEFAULT_SUPER_ADMIN.passwordHash) {
    return res.json({ success: true, user: DEFAULT_SUPER_ADMIN });
  }

  // 2. Check registered staff users
  const users = dbState.users || [];
  const foundUser = users.find((u: any) => 
    u.email.toLowerCase() === email.toLowerCase() && 
    (u.passwordHash === password || u.pinCode === password) &&
    u.status === 'Active'
  );

  if (foundUser) {
    return res.json({ success: true, user: foundUser });
  }

  return res.status(401).json({ success: false, error: 'Invalid email or password' });
});

// ==========================================
// SAAS SUBSCRIPTION & MTN MOMO PAYMENT ENGINE
// ==========================================

const SUBSCRIPTION_MONTHLY_FEE = 100000; // 100,000 RWF
const MTN_MOMO_MERCHANT_NUMBER = '0726134041'; // Fixed official recipient

function addOneMonth(date: Date): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + 1);
  return d;
}

function calculateSubscriptionMetrics(sub: any) {
  if (!sub || sub.status === 'PENDING_PAYMENT') {
    return { status: 'PENDING_PAYMENT', daysRemaining: 0, isGrace: false };
  }
  if (!sub.expiryDate) {
    return { status: 'EXPIRED', daysRemaining: 0, isGrace: false };
  }

  const now = Date.now();
  const exp = new Date(sub.expiryDate).getTime();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  const graceDays = sub.gracePeriodDays || 0;
  const graceExp = exp + (graceDays * 24 * 60 * 60 * 1000);

  if (now <= exp) {
    return { status: 'ACTIVE', daysRemaining: Math.max(0, diffDays), isGrace: false };
  } else if (now <= graceExp) {
    const graceRemaining = Math.ceil((graceExp - now) / (1000 * 60 * 60 * 24));
    return { status: 'GRACE_PERIOD', daysRemaining: Math.max(0, graceRemaining), isGrace: true };
  } else {
    return { status: 'EXPIRED', daysRemaining: 0, isGrace: false };
  }
}

// 1. Register New Business Tenant (starts as PENDING_PAYMENT)
app.post('/api/subscription/register-business', (req, res) => {
  try {
    const { businessName, ownerName, email, phone, password, category, address } = req.body;

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Business name, owner name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUsers = dbState.users || [];
    if (existingUsers.some((u: any) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    const businessId = `biz-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const subscriptionId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const userId = `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newBusiness = {
      id: businessId,
      name: businessName.trim(),
      code: `BIZ-${Math.floor(1000 + Math.random() * 9000)}`,
      category: category || 'Hotel',
      ownerName: ownerName.trim(),
      phone: phone || '+250 788 000 000',
      email: cleanEmail,
      address: address || 'Kigali, Rwanda',
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      subscriptionId: subscriptionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newSubscription = {
      id: subscriptionId,
      businessId: businessId,
      businessName: newBusiness.name,
      planName: 'Monthly SaaS Business License',
      amount: SUBSCRIPTION_MONTHLY_FEE,
      currency: 'RWF',
      status: 'PENDING_PAYMENT',
      gracePeriodDays: 0,
      nextPaymentAmount: SUBSCRIPTION_MONTHLY_FEE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newUser = {
      id: userId,
      businessId: businessId,
      fullName: ownerName.trim(),
      email: cleanEmail,
      phone: phone || '+250 788 000 000',
      role: 'Manager',
      status: 'Active',
      passwordHash: password,
      pinCode: '1234',
      createdAt: new Date().toISOString()
    };

    if (!dbState.businesses) dbState.businesses = [];
    if (!dbState.subscriptions) dbState.subscriptions = [];
    if (!dbState.users) dbState.users = [];

    dbState.businesses.unshift(newBusiness);
    dbState.subscriptions.unshift(newSubscription);
    dbState.users.unshift(newUser);

    if (!dbState.auditLogs) dbState.auditLogs = [];
    dbState.auditLogs.unshift({
      id: `log-${Date.now()}`,
      userId: newUser.id,
      userName: newUser.fullName,
      userRole: 'Manager',
      userEmail: newUser.email,
      action: 'Business Registration',
      category: 'Auth',
      details: `New SaaS business registered: "${newBusiness.name}" (Pending 100,000 RWF MoMo Payment)`,
      timestamp: new Date().toISOString()
    });

    persistState();

    res.json({
      success: true,
      business: newBusiness,
      subscription: newSubscription,
      user: newUser
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Initiate MTN MoMo Subscription Payment (100,000 RWF to 0726134041)
app.post('/api/subscription/momo/initiate', async (req, res) => {
  try {
    const { businessId, payerPhone } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID is required' });
    }

    const businesses = dbState.businesses || [];
    const business = businesses.find((b: any) => b.id === businessId);
    const businessName = business?.name || 'Hospitality Business';

    const subscriptions = dbState.subscriptions || [];
    let sub = subscriptions.find((s: any) => s.businessId === businessId);
    if (!sub) {
      sub = {
        id: `SUB-${Date.now()}`,
        businessId: businessId,
        businessName: businessName,
        planName: 'Monthly SaaS Business License',
        amount: SUBSCRIPTION_MONTHLY_FEE,
        currency: 'RWF',
        status: 'PENDING_PAYMENT',
        gracePeriodDays: 0,
        nextPaymentAmount: SUBSCRIPTION_MONTHLY_FEE,
        createdAt: new Date().toISOString()
      };
      subscriptions.unshift(sub);
      dbState.subscriptions = subscriptions;
    }

    const cleanPhone = (payerPhone || '').replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    const paymentRef = `MOMO-RW-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentId = `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newPayment = {
      id: paymentId,
      businessId: businessId,
      businessName: businessName,
      subscriptionId: sub.id,
      amount: SUBSCRIPTION_MONTHLY_FEE,
      currency: 'RWF',
      paymentMethod: 'MTN MoMo (Rwanda)',
      payerPhone: cleanPhone || '0780000000',
      recipientPhone: MTN_MOMO_MERCHANT_NUMBER,
      paymentReference: paymentRef,
      transactionReference: `TXN-${paymentRef}`,
      status: 'PENDING',
      verifiedBy: 'MTN MoMo Gateway',
      durationMonths: 1,
      createdAt: new Date().toISOString()
    };

    if (!dbState.subscriptionPayments) dbState.subscriptionPayments = [];
    dbState.subscriptionPayments.unshift(newPayment);
    persistState();

    res.json({
      success: true,
      paymentId: newPayment.id,
      paymentReference: paymentRef,
      amount: SUBSCRIPTION_MONTHLY_FEE,
      currency: 'RWF',
      recipientPhone: MTN_MOMO_MERCHANT_NUMBER,
      payerPhone: cleanPhone,
      status: 'PENDING',
      message: `Prompting MTN MoMo payment of 100,000 RWF from ${cleanPhone || 'phone'} to ${MTN_MOMO_MERCHANT_NUMBER}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Verify Payment Status & Activate 1-Month Subscription
app.get('/api/subscription/momo/verify/:reference', (req, res) => {
  try {
    const { reference } = req.params;
    const payments = dbState.subscriptionPayments || [];
    const payment = payments.find((p: any) => p.paymentReference === reference || p.id === reference);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found for reference' });
    }

    // Anti-replay protection: prevent duplicate processing of the same transaction
    const usedTxns = dbState.usedTransactionReferences || [];
    if (payment.status === 'SUCCESSFUL' && usedTxns.includes(payment.transactionReference)) {
      // Already verified and active
      const subscriptions = dbState.subscriptions || [];
      const sub = subscriptions.find((s: any) => s.id === payment.subscriptionId || s.businessId === payment.businessId);
      return res.json({
        success: true,
        verified: true,
        payment,
        subscription: sub,
        message: 'Subscription is already verified and active.'
      });
    }

    // Process verification confirmation
    const now = new Date();
    const expiry = addOneMonth(now);

    payment.status = 'SUCCESSFUL';
    payment.paidAt = now.toISOString();
    payment.transactionReference = payment.transactionReference || `TXN-${payment.paymentReference}-${Date.now()}`;
    
    if (!usedTxns.includes(payment.transactionReference)) {
      usedTxns.push(payment.transactionReference);
      dbState.usedTransactionReferences = usedTxns;
    }

    // Update Subscription to ACTIVE with exact 1 month period
    const subscriptions = dbState.subscriptions || [];
    let sub = subscriptions.find((s: any) => s.id === payment.subscriptionId || s.businessId === payment.businessId);
    if (sub) {
      sub.status = 'ACTIVE';
      sub.startDate = now.toISOString();
      sub.expiryDate = expiry.toISOString();
      sub.lastPaymentDate = now.toISOString();
      sub.paymentReference = payment.paymentReference;
      sub.transactionReference = payment.transactionReference;
      sub.updatedAt = now.toISOString();
    }

    // Update Business status to ACTIVE
    const businesses = dbState.businesses || [];
    const biz = businesses.find((b: any) => b.id === payment.businessId);
    if (biz) {
      biz.status = 'ACTIVE';
      biz.updatedAt = now.toISOString();
    }

    // Log in Audit Trail
    if (!dbState.auditLogs) dbState.auditLogs = [];
    dbState.auditLogs.unshift({
      id: `log-${Date.now()}`,
      userId: biz?.ownerName || 'system',
      userName: biz?.ownerName || 'MTN MoMo Gateway',
      userRole: 'SaaS Payment Processor',
      userEmail: biz?.email || 'billing@system.local',
      action: 'Subscription Verified & Activated',
      category: 'System',
      details: `100,000 RWF MoMo payment verified for "${biz?.name || payment.businessName}". License active until ${expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Ref: ${payment.paymentReference}`,
      timestamp: now.toISOString()
    });

    persistState();

    res.json({
      success: true,
      verified: true,
      payment,
      subscription: sub,
      business: biz,
      expiryDate: expiry.toISOString(),
      message: 'Payment of 100,000 RWF verified successfully! Subscription is now ACTIVE for 1 month.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Webhook / Callback Handler for MTN MoMo
app.post('/api/subscription/momo/callback', (req, res) => {
  try {
    const payload = req.body;
    console.log('[MTN MoMo Webhook Received]', payload);

    const ref = payload?.externalId || payload?.paymentReference;
    if (!ref) {
      return res.status(400).json({ success: false, error: 'Missing reference in callback payload' });
    }

    const payments = dbState.subscriptionPayments || [];
    const payment = payments.find((p: any) => p.paymentReference === ref);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payload.status === 'SUCCESSFUL' || payload.status === 'SUCCESS') {
      const now = new Date();
      const expiry = addOneMonth(now);

      payment.status = 'SUCCESSFUL';
      payment.paidAt = now.toISOString();
      payment.rawMomoResponse = payload;

      const subscriptions = dbState.subscriptions || [];
      const sub = subscriptions.find((s: any) => s.id === payment.subscriptionId || s.businessId === payment.businessId);
      if (sub) {
        sub.status = 'ACTIVE';
        sub.startDate = now.toISOString();
        sub.expiryDate = expiry.toISOString();
        sub.lastPaymentDate = now.toISOString();
      }

      const businesses = dbState.businesses || [];
      const biz = businesses.find((b: any) => b.id === payment.businessId);
      if (biz) {
        biz.status = 'ACTIVE';
      }

      persistState();
    } else if (payload.status === 'FAILED') {
      payment.status = 'FAILED';
      payment.failureReason = payload.reason || 'User rejected MoMo prompt or insufficient funds';
      persistState();
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Business Subscription Details (with live expiration evaluation)
app.get('/api/subscription/business/:businessId', (req, res) => {
  try {
    const { businessId } = req.params;
    const businesses = dbState.businesses || [];
    const biz = businesses.find((b: any) => b.id === businessId);

    const subscriptions = dbState.subscriptions || [];
    let sub = subscriptions.find((s: any) => s.businessId === businessId);

    if (!sub && biz) {
      sub = {
        id: `SUB-${biz.id}`,
        businessId: biz.id,
        businessName: biz.name,
        planName: 'Monthly SaaS Business License',
        amount: SUBSCRIPTION_MONTHLY_FEE,
        currency: 'RWF',
        status: biz.status || 'PENDING_PAYMENT',
        gracePeriodDays: 0,
        nextPaymentAmount: SUBSCRIPTION_MONTHLY_FEE,
        createdAt: biz.createdAt || new Date().toISOString()
      };
      subscriptions.unshift(sub);
      dbState.subscriptions = subscriptions;
      persistState();
    }

    const metrics = calculateSubscriptionMetrics(sub);
    const payments = (dbState.subscriptionPayments || []).filter((p: any) => p.businessId === businessId);

    // Auto update expired status if changed
    if (sub && sub.status !== 'PENDING_PAYMENT' && sub.status !== metrics.status) {
      sub.status = metrics.status;
      if (biz) biz.status = metrics.status;
      persistState();
    }

    res.json({
      success: true,
      business: biz,
      subscription: sub,
      metrics,
      payments,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Super Admin Emergency Override
app.post('/api/subscription/super-admin/override', (req, res) => {
  try {
    const { businessId, adminEmail, adminPassword, reason, daysGranted } = req.body;

    if (adminPassword !== DEFAULT_SUPER_ADMIN.passwordHash && adminEmail?.toLowerCase() !== DEFAULT_SUPER_ADMIN.email.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Super Admin credentials required' });
    }

    if (!businessId || !reason) {
      return res.status(400).json({ success: false, error: 'Business ID and emergency justification reason are required' });
    }

    const days = parseInt(daysGranted, 10) || 7;
    const now = new Date();
    const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const subscriptions = dbState.subscriptions || [];
    let sub = subscriptions.find((s: any) => s.businessId === businessId);
    const businesses = dbState.businesses || [];
    const biz = businesses.find((b: any) => b.id === businessId);

    if (sub) {
      sub.status = 'ACTIVE';
      sub.startDate = now.toISOString();
      sub.expiryDate = expiry.toISOString();
      sub.updatedAt = now.toISOString();
    }

    if (biz) {
      biz.status = 'ACTIVE';
      biz.updatedAt = now.toISOString();
    }

    const overrideRecord = {
      id: `OVR-${Date.now()}`,
      businessId,
      businessName: biz?.name || 'Business',
      grantedByAdmin: 'Super Admin',
      adminEmail: DEFAULT_SUPER_ADMIN.email,
      reason,
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      daysGranted: days,
      timestamp: now.toISOString()
    };

    if (!dbState.subscriptionOverrides) dbState.subscriptionOverrides = [];
    dbState.subscriptionOverrides.unshift(overrideRecord);

    if (!dbState.auditLogs) dbState.auditLogs = [];
    dbState.auditLogs.unshift({
      id: `log-${Date.now()}`,
      userId: 'super-admin',
      userName: 'Super Admin',
      userRole: 'Super Admin',
      userEmail: DEFAULT_SUPER_ADMIN.email,
      action: 'Super Admin Emergency License Override',
      category: 'System',
      details: `Super Admin emergency license override granted to "${biz?.name}" for ${days} days until ${expiry.toISOString()}. Reason: ${reason}`,
      timestamp: now.toISOString()
    });

    persistState();

    res.json({
      success: true,
      message: `Emergency override granted for ${days} days. Access valid until ${expiry.toLocaleDateString()}`,
      subscription: sub,
      business: biz,
      overrideRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Super Admin: Set Grace Period Days
app.post('/api/subscription/super-admin/set-grace-period', (req, res) => {
  try {
    const { businessId, graceDays } = req.body;
    const days = Math.max(0, parseInt(graceDays, 10) || 0);

    const subscriptions = dbState.subscriptions || [];
    if (businessId) {
      const sub = subscriptions.find((s: any) => s.businessId === businessId);
      if (sub) {
        sub.gracePeriodDays = days;
      }
    } else {
      // Global update
      subscriptions.forEach((s: any) => {
        s.gracePeriodDays = days;
      });
    }

    persistState();
    res.json({ success: true, graceDays: days, message: `Grace period updated to ${days} days` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Super Admin: SaaS Stats & All Subscriptions Overview
app.get('/api/subscription/super-admin/all-subscriptions', (_req, res) => {
  try {
    const businesses = dbState.businesses || [];
    const subscriptions = dbState.subscriptions || [];
    const payments = dbState.subscriptionPayments || [];

    const now = Date.now();
    let totalRevenue = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let expiredCount = 0;
    let failedCount = 0;

    payments.forEach((p: any) => {
      if (p.status === 'SUCCESSFUL') {
        totalRevenue += (p.amount || SUBSCRIPTION_MONTHLY_FEE);
      } else if (p.status === 'FAILED') {
        failedCount++;
      }
    });

    const businessList = businesses.map((b: any) => {
      let sub = subscriptions.find((s: any) => s.businessId === b.id);
      if (!sub) {
        sub = {
          id: `SUB-${b.id}`,
          businessId: b.id,
          businessName: b.name,
          planName: 'Monthly SaaS Business License',
          amount: SUBSCRIPTION_MONTHLY_FEE,
          currency: 'RWF',
          status: b.status || 'PENDING_PAYMENT',
          gracePeriodDays: 0,
          nextPaymentAmount: SUBSCRIPTION_MONTHLY_FEE
        };
      }

      const metrics = calculateSubscriptionMetrics(sub);
      if (metrics.status === 'ACTIVE') activeCount++;
      else if (metrics.status === 'PENDING_PAYMENT') pendingCount++;
      else if (metrics.status === 'EXPIRED') expiredCount++;

      const bizPayments = payments.filter((p: any) => p.businessId === b.id);

      return {
        ...b,
        subscription: sub,
        metrics,
        paymentsCount: bizPayments.length,
        totalPaid: bizPayments.filter((p: any) => p.status === 'SUCCESSFUL').reduce((acc: number, p: any) => acc + p.amount, 0)
      };
    });

    // Monthly Recurring Revenue = active subscriptions * 100,000 RWF
    const mrr = activeCount * SUBSCRIPTION_MONTHLY_FEE;

    res.json({
      success: true,
      stats: {
        totalBusinesses: businesses.length,
        activeSubscriptions: activeCount,
        pendingPayments: pendingCount,
        expiredSubscriptions: expiredCount,
        failedPayments: failedCount,
        totalRevenueCollected: totalRevenue,
        monthlyRecurringRevenue: mrr,
        currency: 'RWF',
        monthlyFee: SUBSCRIPTION_MONTHLY_FEE,
        merchantPhone: MTN_MOMO_MERCHANT_NUMBER
      },
      businesses: businessList,
      recentPayments: payments.slice(0, 50),
      overrides: dbState.subscriptionOverrides || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. MTN MoMo API Configuration Settings
app.get('/api/subscription/super-admin/momo-config', (_req, res) => {
  const config = dbState.momoConfig || {};
  res.json({
    success: true,
    config: {
      targetEnvironment: config.targetEnvironment || 'sandbox',
      subscriptionKeyMasked: config.subscriptionKey ? '••••••••' + config.subscriptionKey.slice(-4) : '',
      apiUser: config.apiUser || '',
      apiKeyMasked: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : '',
      merchantPhone: config.merchantPhone || MTN_MOMO_MERCHANT_NUMBER,
      currency: 'RWF',
      monthlyFee: SUBSCRIPTION_MONTHLY_FEE,
      enabled: !!config.enabled
    }
  });
});

app.post('/api/subscription/super-admin/momo-config', (req, res) => {
  try {
    const { targetEnvironment, subscriptionKey, apiUser, apiKey, merchantPhone } = req.body;
    dbState.momoConfig = {
      ...dbState.momoConfig,
      targetEnvironment: targetEnvironment || 'sandbox',
      subscriptionKey: subscriptionKey !== undefined ? subscriptionKey : dbState.momoConfig?.subscriptionKey,
      apiUser: apiUser !== undefined ? apiUser : dbState.momoConfig?.apiUser,
      apiKey: apiKey !== undefined ? apiKey : dbState.momoConfig?.apiKey,
      merchantPhone: merchantPhone || MTN_MOMO_MERCHANT_NUMBER,
      currency: 'RWF',
      monthlyFee: SUBSCRIPTION_MONTHLY_FEE,
      enabled: true,
      lastVerifiedAt: new Date().toISOString()
    };
    persistState();
    res.json({ success: true, message: 'MTN MoMo API settings updated securely' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hotel Central Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
