/**
 * Helper pour appeler les API routes au lieu des Supabase Edge Functions
 * Remplace les appels à /functions/v1/xxx par /api/xxx
 */

/**
 * Obtenir l'URL de base de l'API
 */
export function getApiUrl(endpoint: string): string {
  // Enlever le préfixe /functions/v1/ si présent
  const cleanEndpoint = endpoint.replace(/^\/functions\/v1\//, '').replace(/^functions\/v1\//, '');
  
  // Convertir les noms d'endpoints Supabase vers nos API routes
  const endpointMap: Record<string, string> = {
    'gmail-oauth-init': '/api/gmail/oauth-init',
    'gmail-oauth-callback': '/api/gmail/oauth-callback',
    'outlook-oauth-init': '/api/outlook/oauth-init',
    'outlook-oauth-callback': '/api/outlook/oauth-callback',
    'verify-email-connection': '/api/email/verify-connection',
    'get-stripe-prices': '/api/stripe/prices',
    'stripe-checkout': '/api/stripe/checkout',
    'stripe-add-account-checkout': '/api/stripe/add-account-checkout',
    'stripe-cancel-subscription': '/api/stripe/cancel-subscription',
    'stripe-reactivate-subscription': '/api/stripe/reactivate-subscription',
    'stripe-update-subscription': '/api/stripe/update-subscription',
    'stripe-sync-invoices': '/api/stripe/sync-invoices',
    'stripe-force-sync': '/api/stripe/force-sync',
    'stripe-download-invoice': '/api/stripe/download-invoice',
    'get-subscription-quantity': '/api/stripe/subscription-quantity',
    'delete-email-account': '/api/email/delete-account',
    'delete-user-account': '/api/user/delete-account',
    'send-ticket-to-support': '/api/support/send-ticket',
  };

  // Retourner l'URL mappée ou construire une URL générique
  return endpointMap[cleanEndpoint] || `/api/${cleanEndpoint}`;
}

/**
 * Faire un appel API avec authentification
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = getApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    credentials: 'include', // Important pour les cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || `Erreur ${response.status}`);
  }

  return response.json();
}

