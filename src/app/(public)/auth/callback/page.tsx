'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Check, X, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification en cours...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Récupérer les paramètres de l'URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | null;
        
        console.log('[Auth Callback] Type:', type);
        console.log('[Auth Callback] Token hash:', token_hash ? 'présent' : 'absent');

        if (!token_hash || !type) {
          console.error('[Auth Callback] Paramètres manquants');
          setStatus('error');
          setMessage('Lien de validation invalide ou expiré');
          return;
        }

        // Échanger le token contre une session
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (error) {
          console.error('[Auth Callback] Erreur lors de la vérification:', error);
          setStatus('error');
          
          if (error.message.includes('expired')) {
            setMessage('Le lien de validation a expiré. Veuillez demander un nouvel email de confirmation.');
          } else if (error.message.includes('invalid')) {
            setMessage('Le lien de validation est invalide. Veuillez vérifier votre email.');
          } else {
            setMessage('Erreur lors de la validation de votre email. Veuillez réessayer.');
          }
          return;
        }

        console.log('[Auth Callback] ✅ Email vérifié avec succès');

        // Vérifier si c'est une validation d'email ou une récupération de mot de passe
        if (type === 'recovery') {
          setStatus('success');
          setMessage('Email vérifié avec succès ! Redirection...');
          // Rediriger vers la page de reset password
          setTimeout(() => {
            router.push('/reset-password');
          }, 2000);
        } else {
          // IMPORTANT : Déconnecter complètement l'utilisateur IMMÉDIATEMENT
          // avant d'afficher le message de succès
          console.log('[Auth Callback] Déconnexion immédiate...');
          await supabase.auth.signOut();
          
          // Nettoyer le storage local (sauf les compteurs et données importantes)
          if (typeof window !== 'undefined') {
            // Sauvegarder les données à préserver
            const businessPassCounter = localStorage.getItem('business_pass_email_counter');
            const selectedPlan = localStorage.getItem('selected_plan');
            
            // Nettoyer tous les storages
            localStorage.clear();
            sessionStorage.clear();
            

            // Restaurer les données préservées
            if (businessPassCounter) {
              localStorage.setItem('business_pass_email_counter', businessPassCounter);
            }
            if (selectedPlan) {
              localStorage.setItem('selected_plan', selectedPlan);
            }
            
            
            sessionStorage.setItem('email_just_verified', 'true');
          }
          
          // Attendre un peu pour être sûr que la déconnexion est effective
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('[Auth Callback] Déconnexion terminée, affichage du message de succès');
          setStatus('success');
          setMessage('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
          
          // Rediriger vers la page d'accueil avec paramètre pour ouvrir la popup de connexion
          console.log('[Auth Callback] Redirection vers la page d\'accueil avec popup de connexion');
          setTimeout(() => {
            // Utiliser window.location.href pour forcer un rechargement complet
            // et éviter que le router garde une session en cache
            window.location.href = '/?login=true&verified=true';
          }, 2000);
        }

      } catch (error) {
        console.error('[Auth Callback] Erreur inattendue:', error);
        setStatus('error');
        setMessage('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône animée */}
          <div className="mb-6 flex justify-center">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-scale-in">
                <X className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-thunder">
            {status === 'loading' && 'Vérification en cours'}
            {status === 'success' && 'Email vérifié !'}
            {status === 'error' && 'Erreur de validation'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6 font-inter text-sm">
            {message}
          </p>

          {/* Barre de progression pour le succès */}
          {status === 'success' && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full animate-progress" />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-inter">
                Redirection en cours...
              </p>
            </div>
          )}

          {/* Bouton pour les erreurs */}
          {status === 'error' && (
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 font-inter"
            >
              Retour à l'accueil
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-4 font-inter">
          Besoin d'aide ? <a href="/support" className="text-orange-600 hover:underline">Contactez-nous</a>
        </p>
      </div>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 2s ease-in-out;
        }
      `}</style>
    </div>
  );
}

