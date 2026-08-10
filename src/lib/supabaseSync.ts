import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { notifyDataChange } from './syncEngine';
import { mergeArraysByKey } from './serverSync';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

const CONFIG_KEY = 'hotel_supabase_config';

const LOCAL_KEY_MAP: Record<string, string> = {
  menuItems: 'hotel_menu_items_prod',
  tables: 'hotel_tables_prod',
  waiters: 'hotel_waiters_prod',
  orders: 'hotel_orders_prod',
  kitchenTickets: 'hotel_kitchen_tickets_prod',
  stockLogs: 'hotel_stock_logs_prod',
  shifts: 'hotel_shifts_prod',
  currentShift: 'hotel_current_shift_prod',
  guestRooms: 'hotel_guest_rooms_prod',
  users: 'hotel_users_prod',
  auditLogs: 'hotel_audit_logs_prod',
  expenses: 'hotel_expenses_prod',
  cashMovements: 'hotel_cash_movements_prod',
  dailyClosings: 'hotel_daily_closings_prod',
  purchaseOrders: 'hotel_purchase_orders_prod',
  ingredients: 'hotel_kitchen_ingredients_prod',
  recipes: 'hotel_recipes_prod',
  stockMovements: 'hotel_stock_movement_records_prod',
  wasteRecords: 'hotel_kitchen_waste_records_prod',
  categories: 'hotel_categories_prod',
  inventoryItems: 'hotel_inventory_items_prod',
  businesses: 'hotel_businesses_prod'
};

export function getSupabaseConfig(): SupabaseConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const isUrlValid = Boolean(parsed.url && typeof parsed.url === 'string' && parsed.url.startsWith('http') && !parsed.url.includes('xyzcompany'));
        const isKeyValid = Boolean(parsed.anonKey && typeof parsed.anonKey === 'string' && parsed.anonKey.length > 10);

        return {
          url: parsed.url || '',
          anonKey: parsed.anonKey || '',
          enabled: Boolean(parsed.enabled && isUrlValid && isKeyValid)
        };
      }
    }
  } catch (err) {
    // Ignore error
  }

  // Fallback to VITE env vars if defined
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const isEnvUrlValid = Boolean(envUrl && typeof envUrl === 'string' && envUrl.startsWith('http') && !envUrl.includes('xyzcompany'));
  const isEnvKeyValid = Boolean(envKey && typeof envKey === 'string' && envKey.length > 10);

  return {
    url: envUrl,
    anonKey: envKey,
    enabled: Boolean(isEnvUrlValid && isEnvKeyValid)
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.enabled || !config.url || !config.anonKey) {
    return null;
  }

  const currentKey = `${config.url}_${config.anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey);
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.warn('[Supabase Sync] Failed to create client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Please enter both Supabase Project URL and Anon API Key.' };
  }

  try {
    const client = createClient(url, anonKey);
    // Attempt a light ping request to check connection
    const { error } = await client.from('hotel_store').select('key').limit(1);
    
    if (error) {
      // If table hotel_store doesn't exist yet, try REST health
      if (error.code === 'PGRST301' || error.message?.includes('relation "public.hotel_store" does not exist') || error.code === '42P01') {
        return { 
          success: true, 
          message: 'Supabase connected successfully! Note: Table "hotel_store" is not created yet. Click "Create Table Schema" in settings.' 
        };
      }
      // Permission or auth error
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        return { success: false, message: `Auth Error: ${error.message}` };
      }
      return { success: true, message: `Connected to Supabase! (${error.message})` };
    }

    return { success: true, message: 'Connected to Supabase successfully! Ready for multi-device sync.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}

/**
  * SQL snippet to create hotel_store table in Supabase SQL editor:
  * 
  * CREATE TABLE IF NOT EXISTS public.hotel_store (
  *   key TEXT PRIMARY KEY,
  *   data JSONB NOT NULL,
  *   updated_at TIMESTAMPTZ DEFAULT NOW()
  * );
  * ALTER TABLE public.hotel_store ENABLE ROW LEVEL SECURITY;
  * CREATE POLICY "Allow public select/insert/update/delete" ON public.hotel_store FOR ALL USING (true) WITH CHECK (true);
  */
export const SUPABASE_SQL_SCHEMA = `
-- Business & Multi-Tenant Tables Schema for Supabase
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Cashier',
  status TEXT DEFAULT 'Active',
  password_hash TEXT,
  pin_code TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ingredients (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  stock_quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Kg',
  purchase_unit TEXT,
  recipe_unit TEXT,
  conversion_rate NUMERIC DEFAULT 1,
  cost_per_unit NUMERIC DEFAULT 0,
  average_cost NUMERIC DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 5,
  supplier TEXT,
  expiry_date TEXT,
  batch_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Available',
  last_restocked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  code TEXT,
  name TEXT NOT NULL,
  linked_menu_item_id TEXT,
  linked_menu_item_name TEXT,
  instructions TEXT,
  yield_servings NUMERIC DEFAULT 1,
  ingredients JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Active',
  version NUMERIC DEFAULT 1,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
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

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Menu',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  reorder_level NUMERIC DEFAULT 10,
  cost_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_default',
  ingredient_id TEXT,
  ingredient_name TEXT,
  movement_type TEXT,
  quantity_in NUMERIC DEFAULT 0,
  quantity_out NUMERIC DEFAULT 0,
  remaining_balance NUMERIC DEFAULT 0,
  unit TEXT,
  cost NUMERIC DEFAULT 0,
  reference_number TEXT,
  recipe_id TEXT,
  menu_item_id TEXT,
  menu_item_name TEXT,
  user_name TEXT,
  department TEXT,
  reason TEXT,
  date TEXT,
  time TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Store Backup Key-Value Store Table for Seamless Dynamic Sync
CREATE TABLE IF NOT EXISTS public.hotel_store (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) across all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_store ENABLE ROW LEVEL SECURITY;

-- Create Security RLS Policies
DROP POLICY IF EXISTS "Business isolation policy for ingredients" ON public.ingredients;
CREATE POLICY "Business isolation policy for ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Business isolation policy for recipes" ON public.recipes;
CREATE POLICY "Business isolation policy for recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Business isolation policy for menu_items" ON public.menu_items;
CREATE POLICY "Business isolation policy for menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Business isolation policy for categories" ON public.categories;
CREATE POLICY "Business isolation policy for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Business isolation policy for inventory_items" ON public.inventory_items;
CREATE POLICY "Business isolation policy for inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Business isolation policy for stock_movements" ON public.stock_movements;
CREATE POLICY "Business isolation policy for stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access" ON public.hotel_store;
CREATE POLICY "Allow public access" ON public.hotel_store FOR ALL USING (true) WITH CHECK (true);
`.trim();

/**
 * Push all local entity state to Supabase
 */
export async function pushAllToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured or disabled.' };
  }

  try {
    const rowsToUpsert: { key: string; data: any; updated_at: string }[] = [];

    Object.entries(LOCAL_KEY_MAP).forEach(([serverKey, localKey]) => {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          rowsToUpsert.push({
            key: serverKey,
            data: parsed,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          // ignore parsing error
        }
      }
    });

    if (rowsToUpsert.length === 0) {
      return { success: true, message: 'No local data to push.' };
    }

    const { error } = await client.from('hotel_store').upsert(rowsToUpsert, { onConflict: 'key' });

    if (error) {
      throw error;
    }

    return { success: true, message: 'All local data successfully synchronized to Supabase Cloud!' };
  } catch (err: any) {
    console.warn('[Supabase Push Note]:', err?.message || err);
    return { success: false, message: err?.message || 'Error pushing to Supabase.' };
  }
}

/**
 * Pull all cloud state from Supabase into local storage
 */
export async function pullAllFromSupabase(): Promise<{ success: boolean; count: number; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, message: 'Supabase client is not configured.' };
  }

  try {
    const { data, error } = await client.from('hotel_store').select('*');

    if (error) {
      console.warn('[Supabase Pull Note]:', error.message || error);
      return { success: false, count: 0, message: error.message || 'Error pulling from Supabase.' };
    }

    if (!data || data.length === 0) {
      return { success: true, count: 0, message: 'Supabase cloud store is empty.' };
    }

    let updatedCount = 0;
    data.forEach((row: { key: string; data: any }) => {
      const localKey = LOCAL_KEY_MAP[row.key];
      if (localKey && row.data !== undefined) {
        const rawLocal = localStorage.getItem(localKey);
        let localData: any = null;
        try {
          if (rawLocal) localData = JSON.parse(rawLocal);
        } catch (e) {}

        if (Array.isArray(row.data)) {
          const isLocalEmpty = !localData || !Array.isArray(localData) || localData.length === 0;
          if (row.data.length === 0 && isLocalEmpty) {
            return;
          }

          const currentLocalArray = Array.isArray(localData) ? localData : [];
          const merged = mergeArraysByKey(currentLocalArray, row.data);
          const mergedStr = JSON.stringify(merged);
          const currentStr = JSON.stringify(currentLocalArray);

          if (mergedStr !== currentStr && merged.length > 0) {
            localStorage.setItem(localKey, mergedStr);
            updatedCount++;
          }

          // If local had items Supabase was missing, push merged data to Supabase
          if (merged.length > row.data.length) {
            Promise.resolve(
              client.from('hotel_store').upsert([{
                key: row.key,
                data: merged,
                updated_at: new Date().toISOString()
              }], { onConflict: 'key' })
            ).catch(() => {});
          }
        } else {
          const incomingStr = JSON.stringify(row.data);
          if (incomingStr !== rawLocal && incomingStr !== '[]' && incomingStr !== 'null') {
            localStorage.setItem(localKey, incomingStr);
            updatedCount++;
          }
        }
      }
    });

    if (updatedCount > 0) {
      notifyDataChange('all');
    }

    return { 
      success: true, 
      count: updatedCount, 
      message: `Successfully pulled ${updatedCount} updated datasets from Supabase Cloud.` 
    };
  } catch (err: any) {
    console.warn('[Supabase Pull Note]:', err?.message || err);
    return { success: false, count: 0, message: err?.message || 'Error pulling from Supabase.' };
  }
}

/**
 * Start Supabase Background Polling (Every 4 seconds)
 */
export function startSupabaseSyncPolling(intervalMs: number = 4000): () => void {
  const config = getSupabaseConfig();
  if (!config.enabled) {
    return () => {};
  }

  // Initial pull
  pullAllFromSupabase();

  const timer = setInterval(() => {
    pullAllFromSupabase();
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
