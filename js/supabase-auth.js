/**
 * Autenticacion en la nube (Supabase Auth).
 * Cuentas compartidas entre navegadores/dispositivos.
 */
import { APP_CONFIG } from './config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

let supabase = null;
let currentUser = null;
const listeners = new Set();

export function isCloudAuthConfigured() {
  return Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);
}

function client() {
  if (!supabase) {
    if (!isCloudAuthConfigured()) {
      throw new Error('Supabase no esta configurado en js/config.js');
    }
    supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabase;
}

function notify() {
  listeners.forEach(fn => fn(currentUser));
}

export function onAuthChange(fn) {
  listeners.add(fn);
  fn(currentUser);
}

export function getUser() {
  return currentUser;
}

export function isSuperAdmin() {
  return currentUser?.role === 'superadmin';
}

export function isAuthEnabled() {
  return true;
}

export function hasActiveSubscription() {
  if (!currentUser) return false;
  if (currentUser.role === 'superadmin') return true;
  const until = currentUser.subscriptionUntil;
  if (!until) return false;
  return new Date(until) > new Date();
}

function mapProfile(sessionUser, profile, sub) {
  const email = (profile?.email || sessionUser?.email || '').toLowerCase();
  const role = profile?.role
    || (email === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student');
  return {
    id: sessionUser?.id || profile?.id,
    email,
    name: profile?.name || email.split('@')[0],
    role,
    subscriptionUntil: sub?.until || null,
    plan: sub?.plan || null,
    disabled: !!profile?.disabled,
  };
}

async function loadProfileBundle(sessionUser) {
  const sb = client();
  const email = (sessionUser.email || '').toLowerCase();
  const [{ data: profile }, { data: sub }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle(),
    sb.from('subscriptions').select('*').eq('email', email).maybeSingle(),
  ]);

  if (!profile) {
    await sb.from('profiles').upsert({
      id: sessionUser.id,
      email,
      name: sessionUser.user_metadata?.name || email.split('@')[0],
      role: email === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student',
    });
  } else if (email === APP_CONFIG.superadminEmail.toLowerCase() && profile.role !== 'superadmin') {
    await sb.from('profiles').update({ role: 'superadmin' }).eq('id', sessionUser.id);
    profile.role = 'superadmin';
  }

  const [{ data: profile2 }, { data: sub2 }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle(),
    sb.from('subscriptions').select('*').eq('email', email).maybeSingle(),
  ]);
  return mapProfile(sessionUser, profile2 || profile, sub2 || sub);
}

export async function initAuth(onChange) {
  if (onChange) onAuthChange(onChange);
  const sb = client();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = await loadProfileBundle(session.user);
    if (currentUser.disabled) {
      await sb.auth.signOut();
      currentUser = null;
    }
  }
  sb.auth.onAuthStateChange(async (_event, sess) => {
    if (sess?.user) {
      try {
        currentUser = await loadProfileBundle(sess.user);
        if (currentUser.disabled) {
          await sb.auth.signOut();
          currentUser = null;
        }
      } catch {
        currentUser = null;
      }
    } else {
      currentUser = null;
    }
    notify();
  });
  notify();
  return null;
}

export async function signUp(email, password, name = '') {
  const em = email.trim().toLowerCase();
  if (!em || !password || password.length < 6) {
    throw new Error('Correo valido y contrasena de al menos 6 caracteres.');
  }
  const sb = client();
  const { data, error } = await sb.auth.signUp({
    email: em,
    password,
    options: {
      data: {
        name: name || em.split('@')[0],
        role: em === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student',
        superadmin_email: APP_CONFIG.superadminEmail.toLowerCase(),
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear la cuenta.');
  if (!data.session) {
    throw new Error('Cuenta creada. Confirma el correo (o desactiva Confirm email en Supabase) e inicia sesion.');
  }
  currentUser = await loadProfileBundle(data.user);
  notify();
  return currentUser;
}

export async function signIn(email, password) {
  const em = email.trim().toLowerCase();
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email: em, password });
  if (error) throw new Error('Correo o contrasena incorrectos.');
  currentUser = await loadProfileBundle(data.user);
  if (currentUser.disabled) {
    await sb.auth.signOut();
    currentUser = null;
    throw new Error('Esta cuenta esta deshabilitada.');
  }
  notify();
  return currentUser;
}

export async function signOut() {
  await client().auth.signOut();
  currentUser = null;
  notify();
}

export async function activateSubscription(months = 1) {
  if (!currentUser) throw new Error('Debes iniciar sesion.');
  if (currentUser.role === 'superadmin') return currentUser;
  const sb = client();
  const monthsN = Math.max(1, Number(months) || 1);
  const { data: existing } = await sb.from('subscriptions').select('*').eq('email', currentUser.email).maybeSingle();
  let until = new Date();
  if (existing?.until && new Date(existing.until) > until) {
    until = new Date(existing.until);
  }
  until.setMonth(until.getMonth() + monthsN);
  const row = {
    email: currentUser.email,
    user_id: currentUser.id,
    plan: 'monthly',
    until: until.toISOString(),
    activated_at: new Date().toISOString(),
    granted_by: 'self',
  };
  const { error } = await sb.from('subscriptions').upsert(row);
  if (error) throw new Error(error.message);
  currentUser = { ...currentUser, subscriptionUntil: row.until, plan: 'monthly' };
  notify();
  return currentUser;
}

export async function grantSubscription(email, months = 1) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const sb = client();
  const { data, error } = await sb.rpc('grant_subscription', {
    p_email: email.trim().toLowerCase(),
    p_months: Number(months) || 1,
  });
  if (error) throw new Error(error.message);
  if (currentUser?.email === email.trim().toLowerCase()) {
    currentUser = {
      ...currentUser,
      subscriptionUntil: data?.until || currentUser.subscriptionUntil,
      plan: data?.plan || 'monthly',
    };
    notify();
  }
  return data;
}

export async function adminCreateUser({ email, password, name = '', months = 0 }) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  const nm = (name || '').trim() || em.split('@')[0];
  if (!em || !password || password.length < 6) {
    throw new Error('Correo valido y contrasena de al menos 6 caracteres.');
  }

  const temp = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await temp.auth.signUp({
    email: em,
    password,
    options: {
      data: {
        name: nm,
        role: 'student',
        superadmin_email: APP_CONFIG.superadminEmail.toLowerCase(),
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear el usuario.');

  const sb = client();
  await sb.from('profiles').upsert({
    id: data.user.id,
    email: em,
    name: nm,
    role: 'student',
  });

  const monthsN = Number(months) || 0;
  if (monthsN > 0) {
    await grantSubscription(em, monthsN);
  }

  try { await temp.auth.signOut(); } catch (_) {}

  return {
    email: em,
    name: nm,
    role: 'student',
    created_at: new Date().toISOString(),
    monthsGranted: monthsN,
  };
}

export async function adminResetPassword(email, _newPassword) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  const { error } = await client().auth.resetPasswordForEmail(em, {
    redirectTo: `${location.origin}${location.pathname}#/login`,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function adminDeleteUser(email) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  if (em === APP_CONFIG.superadminEmail.toLowerCase()) {
    throw new Error('No puedes eliminar la cuenta superadmin.');
  }
  const sb = client();
  const { data: profile, error } = await sb.from('profiles').select('id').eq('email', em).maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error('Usuario no encontrado.');
  const { error: upErr } = await sb.from('profiles').update({ disabled: true, updated_at: new Date().toISOString() }).eq('id', profile.id);
  if (upErr) throw new Error(upErr.message);
  return true;
}

export async function fetchAllProfiles() {
  if (!isSuperAdmin()) return [];
  const sb = client();
  const { data: profiles, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const emails = (profiles || []).map(p => p.email);
  const { data: subs } = await sb.from('subscriptions').select('*').in('email', emails.length ? emails : ['__none__']);
  const byEmail = Object.fromEntries((subs || []).map(s => [s.email, s]));
  return (profiles || []).map(p => {
    const sub = byEmail[p.email];
    const until = sub?.until || null;
    const active = until ? new Date(until) > new Date() : false;
    return {
      email: p.email,
      name: p.name,
      role: p.role,
      created_at: p.created_at,
      subscriptionUntil: until,
      subscriptionActive: p.role === 'superadmin' ? true : active,
      disabled: !!p.disabled,
    };
  });
}

export function getAuthBackend() {
  return 'supabase';
}
