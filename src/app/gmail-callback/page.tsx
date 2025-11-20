'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function GmailCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connexion à Gmail en cours...');
  const hasCalledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Empêcher le double appel en Strict Mode
    if (hasCalledRef.current) {
      console.log('⏭️ Callback déjà exécuté, skip');
      return;
    }
    hasCalledRef.current = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          throw new Error('Code d\'autorisation manquant');
        }

        // Récupérer les données depuis le state
        let stateData: { token?: string; redirectUrl?: string } = {};

        if (state) {
          try {
            stateData = JSON.parse(atob(state));
          } catch (e) {
            console.error('Erreur parsing state:', e);
          }
        }

        const accessToken = stateData.token;

        if (!accessToken) {
          throw new Error('Token d\'authentification introuvable. Veuillez réessayer.');
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // Utiliser le même redirect_uri que celui utilisé pour obtenir le code
        const redirectUri = `${window.location.origin}/gmail-callback`;

        console.log('📡 Envoi à la Edge Function...');

        const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de la connexion Gmail');
        }

        setStatus('success');
        setMessage(`Gmail connecté avec succès ! (${result.email})`);

        // Notifier la fenêtre parente
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GMAIL_AUTH_SUCCESS',
              email: result.email
            }, '*');
          } catch (e) {
            console.error('Erreur notification opener:', e);
          }
        }

        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (error: any) {
        console.error('Erreur callback Gmail:', error);
        setStatus('error');
        setMessage(error.message || 'Erreur lors de la connexion Gmail');

        // Notifier la fenêtre parente de l'erreur
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GMAIL_AUTH_ERROR',
              error: error.message
            }, '*');
          } catch (e) {
            console.error('Erreur notification opener:', e);
          }
        }
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion en cours...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Succès !</h2>
            <p className="text-gray-700">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Cette fenêtre va se fermer automatiquement...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-md"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
