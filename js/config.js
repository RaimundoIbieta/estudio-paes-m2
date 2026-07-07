/** Incrementar en cada deploy para forzar recarga de modulos JS (ensayo, banco, etc.) */
export const CACHE_VERSION = '24';

export const APP_CONFIG = {
  superadminEmail: 'raimundoibieta@gmail.com',
  supabaseUrl: '',
  supabaseAnonKey: '',
  brandName: 'Preuniversitario PAES',
  tagline: 'Tu camino a la educación superior',
  pricing: {
    monthlyCLP: 4990,
    currency: 'CLP',
    label: '$4.990 / mes',
    trialDays: 0,
  },
  essays: {
    unitCount: 30,
    unitDurationMinutes: 45,
    checkpointEveryUnits: 2,
  },
};
