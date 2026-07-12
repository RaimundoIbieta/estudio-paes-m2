/**
 * Autenticación local — funciona sin Supabase ni configuración.
 * Los datos se guardan en el navegador (IndexedDB).
 * Superadmin: raimundoibieta@gmail.com
 */

import { APP_CONFIG } from './config.js';

const DB_NAME = 'preuniversitario-paes';
const DB_VERSION = 2;
let db = null;
let currentUser = null;
const listeners = new Set();

function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('users')) {
        d.createObjectStore('users', { keyPath: 'email' });
      }
      if (!d.objectStoreNames.contains('progress')) {
        d.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('subscriptions')) {
        d.createObjectStore('subscriptions', { keyPath: 'email' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password + ':paes-salt-v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
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

async function getSubscription(email) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    if (!d.objectStoreNames.contains('subscriptions')) return resolve(null);
    const tx = d.transaction('subscriptions', 'readonly');
    const req = tx.objectStore('subscriptions').get(email.toLowerCase());
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveSubscription(sub) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('subscriptions', 'readwrite');
    tx.objectStore('subscriptions').put(sub);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function attachSubscription(user) {
  const sub = await getSubscription(user.email);
  user.subscriptionUntil = sub?.until || null;
  user.plan = sub?.plan || null;
  return user;
}

export async function activateSubscription(months = 1) {
  if (!currentUser) throw new Error('Debes iniciar sesión.');
  const until = new Date();
  until.setMonth(until.getMonth() + months);
  const sub = {
    email: currentUser.email,
    plan: 'monthly',
    until: until.toISOString(),
    activatedAt: new Date().toISOString(),
  };
  await saveSubscription(sub);
  currentUser = { ...currentUser, subscriptionUntil: sub.until, plan: sub.plan };
  notify();
  return currentUser;
}

export async function grantSubscription(email, months = 1) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const until = new Date();
  until.setMonth(until.getMonth() + months);
  await saveSubscription({ email: email.toLowerCase(), plan: 'monthly', until: until.toISOString(), activatedAt: new Date().toISOString() });
  if (currentUser?.email === email.toLowerCase()) {
    currentUser = { ...currentUser, subscriptionUntil: until.toISOString(), plan: 'monthly' };
    notify();
  }
}

export async function initAuth(onChange) {
  if (onChange) onAuthChange(onChange);
  await openDb();
  try {
    const saved = localStorage.getItem('paes-session');
    if (saved) {
      const email = JSON.parse(saved).email;
      const user = await getUserByEmail(email);
      if (user) currentUser = await attachSubscription({ email: user.email, name: user.name, role: user.role });
    }
  } catch (_) {}
  notify();
  return null;
}

async function getUserByEmail(email) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('users', 'readonly');
    const req = tx.objectStore('users').get(email.toLowerCase());
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveUser(user) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('users', 'readwrite');
    tx.objectStore('users').put(user);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function signUp(email, password, name = '') {
  const em = email.trim().toLowerCase();
  if (!em || !password || password.length < 6) throw new Error('Correo válido y contraseña de al menos 6 caracteres.');
  if (await getUserByEmail(em)) throw new Error('Este correo ya está registrado.');
  const role = em === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student';
  const user = {
    email: em,
    name: name || em.split('@')[0],
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  await saveUser(user);
  currentUser = await attachSubscription({ email: user.email, name: user.name, role: user.role });
  localStorage.setItem('paes-session', JSON.stringify({ email: em }));
  notify();
  return currentUser;
}

/**
 * Crea un usuario desde el panel admin sin iniciar sesión como él.
 * @param {{ email: string, password: string, name?: string, months?: number }} opts
 */
export async function adminCreateUser({ email, password, name = '', months = 0 }) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  const nm = (name || '').trim();
  if (!em || !password || password.length < 6) {
    throw new Error('Correo válido y contraseña de al menos 6 caracteres.');
  }
  if (await getUserByEmail(em)) throw new Error('Este correo ya está registrado.');
  const role = em === APP_CONFIG.superadminEmail.toLowerCase() ? 'superadmin' : 'student';
  const user = {
    email: em,
    name: nm || em.split('@')[0],
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
    createdBy: currentUser?.email || 'admin',
  };
  await saveUser(user);
  const monthsN = Number(months) || 0;
  if (monthsN > 0 && role !== 'superadmin') {
    const until = new Date();
    until.setMonth(until.getMonth() + monthsN);
    await saveSubscription({
      email: em,
      plan: 'monthly',
      until: until.toISOString(),
      activatedAt: new Date().toISOString(),
      grantedBy: currentUser?.email || 'admin',
    });
  }
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.createdAt,
    monthsGranted: monthsN,
  };
}

export async function adminResetPassword(email, newPassword) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  if (!newPassword || newPassword.length < 6) throw new Error('Contraseña de al menos 6 caracteres.');
  const user = await getUserByEmail(em);
  if (!user) throw new Error('Usuario no encontrado.');
  user.passwordHash = await hashPassword(newPassword);
  await saveUser(user);
  return true;
}

export async function adminDeleteUser(email) {
  if (!isSuperAdmin()) throw new Error('Sin permisos.');
  const em = email.trim().toLowerCase();
  if (em === APP_CONFIG.superadminEmail.toLowerCase()) {
    throw new Error('No puedes eliminar la cuenta superadmin.');
  }
  if (em === currentUser?.email) throw new Error('No puedes eliminar tu propia sesión activa.');
  const d = await openDb();
  await new Promise((resolve, reject) => {
    const tx = d.transaction(['users', 'subscriptions'], 'readwrite');
    tx.objectStore('users').delete(em);
    if (d.objectStoreNames.contains('subscriptions')) {
      tx.objectStore('subscriptions').delete(em);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return true;
}

export async function signIn(email, password) {
  const em = email.trim().toLowerCase();
  const user = await getUserByEmail(em);
  if (!user) throw new Error('Correo o contraseña incorrectos.');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Correo o contraseña incorrectos.');
  currentUser = await attachSubscription({ email: user.email, name: user.name, role: user.role });
  localStorage.setItem('paes-session', JSON.stringify({ email: em }));
  notify();
  return currentUser;
}

export async function signOut() {
  currentUser = null;
  localStorage.removeItem('paes-session');
  notify();
}

export async function fetchAllProfiles() {
  if (!isSuperAdmin()) return [];
  const d = await openDb();
  const users = await new Promise((resolve, reject) => {
    const tx = d.transaction('users', 'readonly');
    const req = tx.objectStore('users').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const out = [];
  for (const u of users) {
    const sub = await getSubscription(u.email);
    const until = sub?.until || null;
    const active = until ? new Date(until) > new Date() : false;
    out.push({
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.createdAt,
      subscriptionUntil: until,
      subscriptionActive: u.role === 'superadmin' ? true : active,
    });
  }
  return out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}
