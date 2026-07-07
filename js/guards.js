import { getUser, isSuperAdmin, hasActiveSubscription } from './auth.js';

const PUBLIC_ROUTES = new Set(['landing', 'login', 'registro', 'home']);
const AUTH_ONLY_ROUTES = new Set(['suscripcion']);

export function getAppShellMode(path) {
  if (PUBLIC_ROUTES.has(path) && path !== 'home') return 'public';
  if (path === 'home' && !getUser()) return 'public';
  return 'app';
}

export function requireAuth(path) {
  if (PUBLIC_ROUTES.has(path) && path !== 'home') return true;
  if (path === 'home' && !getUser()) return true;
  return !!getUser();
}

export function requireSubscription(path) {
  if (PUBLIC_ROUTES.has(path) && path !== 'home') return true;
  if (path === 'home' && !getUser()) return true;
  if (AUTH_ONLY_ROUTES.has(path)) return true;
  if (isSuperAdmin()) return true;
  return hasActiveSubscription();
}

export function getRedirectForGuest(path) {
  if (PUBLIC_ROUTES.has(path) && path !== 'home') return null;
  if (path === 'home' && !getUser()) return null;
  if (!getUser()) return '#/login';
  if (!requireSubscription(path)) return '#/suscripcion';
  return null;
}

export function getRedirectIfLoggedIn(path) {
  if (!getUser()) return null;
  if (path === 'login' || path === 'registro' || path === 'home') return '#/app';
  return null;
}
