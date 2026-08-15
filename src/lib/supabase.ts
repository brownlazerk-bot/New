import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    typeof supabaseUrl === 'string' && 
    supabaseUrl.startsWith('http') && 
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('xyzcompany') &&
    supabaseAnonKey && 
    typeof supabaseAnonKey === 'string' && 
    supabaseAnonKey.length > 20
  );
};

// Create the configured Supabase client
// If env vars are not yet populated, provide a fallback instance with placeholder credentials so imports won't throw
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);
