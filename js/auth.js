import { APP_CONFIG } from './config.js';

let supabase = null;
let currentUser = null;

export function getUser() {
  return currentUser;
}

export function isSuperAdmin() {
  return currentUser?.email?.toLowerCase() === APP_CONFIG.superadminEmail.toLowerCase();
}

export function isAuthEnabled() {
  return !!(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);
}

export async function initAuth(onChange) {
  if (!isAuthEnabled()) {
    currentUser = null;
    onChange?.(null);
    return null;
  }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  if (currentUser) await ensureProfile(currentUser);
  onChange?.(currentUser);
  supabase.auth.onAuthStateChange(async (_e, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) await ensureProfile(currentUser);
    onChange?.(currentUser);
  });
  return supabase;
}

async function ensureProfile(user) {
  if (!supabase) return;
  const role = user.email?.toLowerCase() === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student';
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    role,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function signUp(email, password, name) {
  if (!supabase) throw new Error('Auth no configurado');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Auth no configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchAllProfiles() {
  if (!supabase || !isSuperAdmin()) return [];
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
}
