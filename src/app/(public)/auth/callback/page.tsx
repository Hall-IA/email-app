'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification en cours...');
  const hasHandled = useRef(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSuccess = async () => {
      if (hasHandled.current) return;
      hasHandled.current = true;

      console.log('[Auth Callback] ✅ Email confirmé !');
      setStatus('success');
      setMessage('Email vérifié avec succès !');

      // Stocker le flag AVANT de déconnecter
      sessionStorage.setItem('email_just_verified', 'true');

      // Déconnecter localement pour forcer une reconnexion manuelle
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        console.log('[Auth Callback] SignOut error (ignoré):', e);
      }

      // Rediriger vers l'accueil avec les paramètres pour ouvrir la modal
      setTimeout(() => {
        window.location.href = '/?login=true&verified=true';
      }, 2000);
    };

    const handleError = (msg: string) => {
      if (hasHandled.current) return;
      hasHandled.current = true;
      setStatus('error');
      setMessage(msg);
    };

    const checkSession = async () => {
      try {
        // Attendre que Supabase traite le token dans l'URL
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('[Auth Callback] Session:', {
          hasSession: !!session,
          emailConfirmed: !!session?.user?.email_confirmed_at,
          error: error?.message
        });

        if (error) {
          handleError('Erreur: ' + error.message);
          return;
        }

        if (session?.user?.email_confirmed_at) {
          await handleSuccess();
        } else if (session?.user) {
          // Email pas encore marqué comme confirmé, réessayer
          console.log('[Auth Callback] En attente de confirmation...');
          setTimeout(checkSession, 1000);
        } else {
          handleError('Lien de validation invalide ou expiré.');
        }
      } catch (err) {
        console.error('[Auth Callback] Erreur:', err);
        handleError('Une erreur inattendue s\'est produite.');
      }
    };

    // Écouter les events Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth Callback] Event:', event);
        if (hasHandled.current) return;
        
        if (session?.user?.email_confirmed_at) {
          await handleSuccess();
        }
      }
    );

    checkSession();

    // Timeout de sécurité
    timeoutId = setTimeout(() => {
      if (!hasHandled.current) {
        handleError('Délai d\'attente dépassé.');
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6 flex justify-center">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-thunder">
            {status === 'loading' && 'Vérification en cours'}
            {status === 'success' && 'Email vérifié !'}
            {status === 'error' && 'Erreur de validation'}
          </h1>

          <p className="text-gray-600 mb-6 font-inter text-sm">{message}</p>

          {status === 'success' && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full"
                  style={{ animation: 'progress 2s ease-in-out forwards' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-inter">
                Redirection vers la connexion...
              </p>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 font-inter"
            >
              Retour à l'accueil
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4 font-inter">
          Besoin d'aide ?{' '}
          <a href="/support" className="text-orange-600 hover:underline">
            Contactez-nous
          </a>
        </p>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}