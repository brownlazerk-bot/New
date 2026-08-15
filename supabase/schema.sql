-- ==============================================================================
-- SUPABASE PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant POS & Hotel Management SaaS with Complete Super Admin Architecture
-- ==============================================================================

-- 1. Enable UUID and Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- 2.1 Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT DEFAULT 'hotel',
  category TEXT DEFAULT 'Hotel',
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  phone TEXT,
  email TEXT,
  momo_payment_number TEXT DEFAULT '0726134041',
  address TEXT,
  currency TEXT DEFAULT 'RWF',
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING_PAYMENT', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED', 'CLOSED'
  subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Profiles Table (Linked to auth.users.id)
-- Super Admin has role = 'Super Admin', is_super_admin = TRUE, and business_id = NULL
-- Normal users MUST always have a non-null business_id
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Cashier', -- 'Super Admin', 'Admin', 'Manager', 'Accountant', 'Receptionist', 'Cashier', 'Waiter', 'Kitchen', 'Storekeeper', 'Housekeeping'
  status TEXT DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
  access_status TEXT DEFAULT 'Approved', -- 'Approved', 'Pending Payment', 'Grace Period', 'Payment Required', 'Locked'
  payment_status TEXT DEFAULT 'Paid', -- 'Paid', 'Unpaid', 'Pending Verification'
  authorized_by_super_admin BOOLEAN DEFAULT FALSE,
  authorized_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  grace_period_days INTEGER DEFAULT 0,
  payment_notes TEXT,
  pin_code TEXT DEFAULT '1234',
  is_super_admin BOOLEAN DEFAULT FALSE,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  plan_name TEXT DEFAULT 'Monthly SaaS Business License',
  plan TEXT DEFAULT 'MONTHLY_STANDARD',
  monthly_fee NUMERIC DEFAULT 100000, -- Standard 100,000 RWF per month
  amount NUMERIC DEFAULT 100000,
  currency TEXT DEFAULT 'RWF',
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING_PAYMENT', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED'
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  next_billing_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  grace_period_days INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'MTN_MOMO',
  momo_number TEXT DEFAULT '0726134041',
  last_payment_date TIMESTAMPTZ,
  last_payment_reference TEXT,
  payment_reference TEXT,
  last_payment_amount NUMERIC,
  transaction_reference TEXT,
  next_payment_amount NUMERIC DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Subscription Payments Table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 100000,
  currency TEXT DEFAULT 'RWF',
  payment_method TEXT DEFAULT 'MTN MoMo (Rwanda)',
  payer_phone TEXT,
  recipient_phone TEXT DEFAULT '0726134041',
  payment_reference TEXT,
  transaction_reference TEXT,
  status TEXT DEFAULT 'SUCCESSFUL', -- 'SUCCESSFUL', 'PENDING', 'FAILED', 'REVERSED'
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by TEXT DEFAULT 'Super Admin',
  notes TEXT,
  duration_months INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 System Settings Table (Global configuration managed by Super Admin)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Seed default global system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('pricing_plans', '{"standard_monthly_fee": 100000, "currency": "RWF", "grace_period_default_days": 7}'::jsonb, 'Default SaaS Subscription Pricing & Grace Period'),
  ('momo_config', '{"merchant_number": "0726134041", "merchant_name": "Smart Hospitality Cloud Ltd", "currency": "RWF", "enabled": true}'::jsonb, 'MTN MoMo Payment Gateway Configuration'),
  ('supported_business_types', '["Hotel", "Restaurant", "Bar / Lounge", "Cafe", "Resort", "Nightclub", "Multi-Service Hospitality"]'::jsonb, 'Permitted Business Facility Types')
ON CONFLICT (key) DO NOTHING;

-- 2.6 Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT, -- NULL for system-level Super Admin actions
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Auth', 'User Management', 'Subscription', 'Business', 'Payment', 'Inventory', 'Sales', 'System Settings', 'Reports'
  details TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Multi-Tenant Operational Tables (Menu, Orders, etc.)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 18,
  kitchen_department TEXT,
  stock_quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Serving',
  status TEXT DEFAULT 'Available',
  is_food BOOLEAN DEFAULT FALSE,
  image TEXT,
  description TEXT,
  has_recipe BOOLEAN DEFAULT FALSE,
  recipe JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  table_id TEXT,
  table_number TEXT,
  waiter_id TEXT,
  waiter_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'UNPAID',
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hotel_store (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. SECURITY DEFINER AUTHORIZATION FUNCTIONS
-- ==============================================================================

-- Helper Function 1: Check if the authenticated user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'Super Admin' OR is_super_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper Function 2: Get authenticated user's business_id
CREATE OR REPLACE FUNCTION public.get_auth_business_id()
RETURNS TEXT AS $$
DECLARE
  v_biz_id TEXT;
BEGIN
  SELECT business_id INTO v_biz_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_biz_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper Function 3: Prevent privilege escalation (Normal users cannot self-promote to Super Admin or switch businesses)
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If NOT super admin executing:
  IF NOT public.is_super_admin() THEN
    -- Cannot elevate role to Super Admin
    IF (NEW.role = 'Super Admin') AND (OLD.role IS DISTINCT FROM 'Super Admin') THEN
      RAISE EXCEPTION 'Privilege escalation rejected: Only Super Admins can assign the Super Admin role.';
    END IF;
    -- Cannot set is_super_admin flag
    IF (NEW.is_super_admin = TRUE) AND (OLD.is_super_admin IS DISTINCT FROM TRUE) THEN
      RAISE EXCEPTION 'Privilege escalation rejected: Cannot modify is_super_admin flag.';
    END IF;
    -- Cannot change own business_id to hijack another business
    IF (NEW.business_id IS DISTINCT FROM OLD.business_id) THEN
      RAISE EXCEPTION 'Business isolation violation: Normal users cannot change their business assignment.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- Trigger for New User Sign Up (Public signup ALWAYS creates non-super-admin user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_biz_id TEXT;
BEGIN
  -- Public registration is strictly forbidden from assigning Super Admin role
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Manager');
  IF v_role = 'Super Admin' THEN
    v_role := 'Manager';
  END IF;

  v_biz_id := COALESCE(NEW.raw_user_meta_data->>'business_id', 'biz-primary-01');

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    business_id,
    access_status,
    payment_status,
    is_super_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role,
    v_biz_id,
    'Approved',
    'Paid',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) ENABLEMENT & POLICIES
-- ==============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_store ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles Policies
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy"
ON public.profiles FOR SELECT
USING (
  public.is_super_admin() OR
  id = auth.uid() OR 
  (business_id IS NOT NULL AND business_id = public.get_auth_business_id())
);

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
ON public.profiles FOR UPDATE
USING (
  public.is_super_admin() OR
  id = auth.uid()
);

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy"
ON public.profiles FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  id = auth.uid()
);

DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
CREATE POLICY "Profiles delete policy"
ON public.profiles FOR DELETE
USING (
  public.is_super_admin()
);

-- 4.2 Businesses Policies
DROP POLICY IF EXISTS "Businesses select policy" ON public.businesses;
CREATE POLICY "Businesses select policy"
ON public.businesses FOR SELECT
USING (
  public.is_super_admin() OR
  id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Businesses insert policy" ON public.businesses;
CREATE POLICY "Businesses insert policy"
ON public.businesses FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Businesses update policy" ON public.businesses;
CREATE POLICY "Businesses update policy"
ON public.businesses FOR UPDATE
USING (
  public.is_super_admin() OR
  id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Businesses delete policy" ON public.businesses;
CREATE POLICY "Businesses delete policy"
ON public.businesses FOR DELETE
USING (
  public.is_super_admin()
);

-- 4.3 Subscriptions Policies
DROP POLICY IF EXISTS "Subscriptions select policy" ON public.subscriptions;
CREATE POLICY "Subscriptions select policy"
ON public.subscriptions FOR SELECT
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Subscriptions insert policy" ON public.subscriptions;
CREATE POLICY "Subscriptions insert policy"
ON public.subscriptions FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Subscriptions update policy" ON public.subscriptions;
CREATE POLICY "Subscriptions update policy"
ON public.subscriptions FOR UPDATE
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Subscriptions delete policy" ON public.subscriptions;
CREATE POLICY "Subscriptions delete policy"
ON public.subscriptions FOR DELETE
USING (
  public.is_super_admin()
);

-- 4.4 Subscription Payments Policies
DROP POLICY IF EXISTS "Payments select policy" ON public.subscription_payments;
CREATE POLICY "Payments select policy"
ON public.subscription_payments FOR SELECT
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Payments insert policy" ON public.subscription_payments;
CREATE POLICY "Payments insert policy"
ON public.subscription_payments FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Payments update policy" ON public.subscription_payments;
CREATE POLICY "Payments update policy"
ON public.subscription_payments FOR UPDATE
USING (
  public.is_super_admin()
);

-- 4.5 System Settings Policies
DROP POLICY IF EXISTS "System settings select policy" ON public.system_settings;
CREATE POLICY "System settings select policy"
ON public.system_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "System settings manage policy" ON public.system_settings;
CREATE POLICY "System settings manage policy"
ON public.system_settings FOR ALL
USING (
  public.is_super_admin()
)
WITH CHECK (
  public.is_super_admin()
);

-- 4.6 Audit Logs Policies
DROP POLICY IF EXISTS "Audit logs select policy" ON public.audit_logs;
CREATE POLICY "Audit logs select policy"
ON public.audit_logs FOR SELECT
USING (
  public.is_super_admin() OR
  (business_id IS NOT NULL AND business_id = public.get_auth_business_id())
);

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy"
ON public.audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 4.7 Menu Items & Orders Policies
DROP POLICY IF EXISTS "Menu items select policy" ON public.menu_items;
CREATE POLICY "Menu items select policy"
ON public.menu_items FOR SELECT
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Menu items modify policy" ON public.menu_items;
CREATE POLICY "Menu items modify policy"
ON public.menu_items FOR ALL
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
)
WITH CHECK (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy"
ON public.orders FOR SELECT
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

DROP POLICY IF EXISTS "Orders modify policy" ON public.orders;
CREATE POLICY "Orders modify policy"
ON public.orders FOR ALL
USING (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
)
WITH CHECK (
  public.is_super_admin() OR
  business_id = public.get_auth_business_id()
);

-- 4.8 Hotel Store Policy
DROP POLICY IF EXISTS "Hotel store sync policy" ON public.hotel_store;
CREATE POLICY "Hotel store sync policy"
ON public.hotel_store FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 5. SUPER ADMIN SETUP INSTRUCTIONS (FOR PROJECT OWNER/ADMINISTRATOR)
-- ==============================================================================
-- To promote an authenticated account to Super Admin, run the following command
-- in the Supabase SQL Editor:
--
-- UPDATE public.profiles
-- SET 
--   role = 'Super Admin',
--   is_super_admin = TRUE,
--   business_id = NULL,
--   access_status = 'Approved',
--   payment_status = 'Paid',
--   status = 'Active'
-- WHERE email = 'YOUR_SUPER_ADMIN_EMAIL';
-- ==============================================================================
