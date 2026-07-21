import { APP_CONFIG, CACHE_VERSION } from './config.js';

function cloudEnabled() {
  return Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);
}

const mod = cloudEnabled()
  ? await import(`./supabase-auth.js?v=${CACHE_VERSION}`)
  : await import(`./local-auth.js?v=${CACHE_VERSION}`);

export const getAuthBackend = () => (cloudEnabled() ? 'supabase' : 'local');
export const isCloudAuthConfigured = () => cloudEnabled();

export const {
  initAuth,
  getUser,
  isSuperAdmin,
  isAuthEnabled,
  hasActiveSubscription,
  onAuthChange,
  signIn,
  signUp,
  signOut,
  activateSubscription,
  grantSubscription,
  adminCreateUser,
  adminResetPassword,
  adminDeleteUser,
  fetchAllProfiles,
} = mod;
