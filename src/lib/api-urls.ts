/**
 * Conversion automatique des URLs Supabase Functions vers API Routes
 * Utilisez cette fonction au lieu de construire manuellement les URLs
 */

export function getApiUrl(endpoint: string): string {
  // Nettoyer l'endpoint
  const clean = endpoint
    .replace(/^\/+/, '') // Enlever les / au début
    .replace(/\/+$/, '') // Enlever les / à la fin
    .replace(/^functions\/v1\//, ''); // Enlever le préfixe Supabase

  // Mapper les endpoints Supabase vers nos API routes
  const mapping: Record<string, string> = {
    'gmail-oauth-init': '/api/gmail/oauth-init',
    'gmail-oauth-callback': '/api/gmail/oauth-callback',
    'outlook-oauth-init': '/api/outlook/oauth-init',
    'outlook-oauth-callback': '/api/outlook/oauth-callback',
    'verify-email-connection': '/api/email/verify-connection',
    'delete-email-account': '/api/email/delete-account',
    'delete-user-account': '/api/user/delete-account',
    'get-stripe-prices': '/api/stripe/prices',
    'get-subscription-quantity': '/api/stripe/subscription-quantity',
    'stripe-checkout': '/api/stripe/checkout',
    'stripe-add-account-checkout': '/api/stripe/add-account-checkout',
    'stripe-cancel-subscription': '/api/stripe/cancel-subscription',
    'stripe-reactivate-subscription': '/api/stripe/reactivate-subscription',
    'stripe-update-subscription': '/api/stripe/update-subscription',
    'stripe-sync-invoices': '/api/stripe/sync-invoices',
    'stripe-force-sync': '/api/stripe/force-sync',
    'stripe-download-invoice': '/api/stripe/download-invoice',
    'send-ticket-to-support': '/api/support/send-ticket',
  };

  // Retourner l'URL mappée ou construire une URL générique
  return mapping[clean] || `/api/${clean}`;
}

/**
 * Remplace les anciennes URLs Supabase dans une string
 */
export function replaceSupabaseUrl(url: string): string {
  if (!url) return '';
  
  // Si c'est déjà une URL API route, la retourner telle quelle
  if (url.startsWith('/api/') || url.startsWith('http://localhost') || url.startsWith('https://')) {
    // Extraire l'endpoint si c'est une URL Supabase
    const match = url.match(/\/functions\/v1\/([^?]+)/);
    if (match) {
      return getApiUrl(match[1]);
    }
    return url;
  }

  // Sinon, c'est probablement juste un nom d'endpoint
  return getApiUrl(url);
}

/**
 * Valeur par défaut pour NEXT_PUBLIC_SUPABASE_URL (pour compatibilité)
 */
export const SUPABASE_URL_FALLBACK = '';

/**
 * Helper pour faire des appels API avec authentification automatique
 */
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getApiUrl(endpoint);

  const defaultOptions: RequestInit = {
    credentials: 'include', // Important pour les cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

