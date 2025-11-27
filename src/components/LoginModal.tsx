'use client';

import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSignupSuccess?: (userId: string) => void; // Callback après inscription réussie
}

export function LoginModal({ isOpen, onClose, initialEmail, onSignupSuccess }: LoginModalProps) {
  const router = useRouter();
  const { signIn, signUp, user } = useAuth();
  const [isLogin, setIsLogin] = useState(!initialEmail); // Si un email est fourni, on ouvre en mode inscription
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Vérifier si l'utilisateur vient de valider son email
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {m
      // Vérifier dans sessionStorage si l'email a été vérifié
      const emailVerified = sessionStorage.getItem('email_verified');
      
      if (emailVerified === 'true') {
        setSuccessMessage('✅ Adresse email bien validée ! Connectez-vous pour accéder à l\'application.');
        setIsLogin(true); // Afficher le formulaire de connexion
        
        // Supprimer le flag pour ne pas réafficher le message
        sessionStorage.removeItem('email_verified');
        
        // Garder le message visible pendant 10 secondes
        setTimeout(() => {
          setSuccessMessage(null);
        }, 10000);
      }
    }
  }, [isOpen]);

  // Bloquer le scroll quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fermer avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Réinitialiser le formulaire quand on ferme le modal
  useEffect(() => {
    if (!isOpen) {
      setEmail(initialEmail || '');
      setPassword('');
      setFullName('');
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
      setIsLogin(!initialEmail);
      setShowPassword(false);
    }
  }, [isOpen, initialEmail]);

  // Mettre à jour l'email quand initialEmail change
  useEffect(() => {
    if (initialEmail && isOpen) {
      setEmail(initialEmail);
      setIsLogin(false); // Passer en mode inscription
    }
  }, [initialEmail, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        
        if (error) {
          setError(error.message);
          setLoading(false);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
          router.push('/dashboard');
          onClose();
        }
      } else {
        if (!fullName.trim()) {
          setError('Veuillez entrer votre nom complet');
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          setError(error.message);
          setLoading(false);
        } else {
          // Forcer la déconnexion pour s'assurer qu'aucune session n'est créée
          await supabase.auth.signOut();
          
          // Afficher le message de confirmation d'email
          setSuccessMessage('Un email de confirmation a été envoyé. Vérifiez votre boîte mail et cliquez sur le lien pour activer votre compte.');
          setLoading(false);
          // Basculer automatiquement en mode connexion après l'inscription
          setTimeout(() => {
            setIsLogin(true);
            setSuccessMessage(null);
            setPassword(''); // Réinitialiser le mot de passe
          }, 2000);
        }
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal centré */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'relative flex flex-col items-start gap-8 w-full max-w-sm p-6 bg-[#F9F7F5] rounded-xl border border-[#F1EDEA] shadow-2xl transform transition-all duration-300 pointer-events-auto max-h-[90vh] overflow-y-auto',
            isOpen ? 'scale-100 opacity-100 animate-in slide-in-from-bottom-4' : 'scale-95 opacity-0'
          )}
          style={{
            width: '384px',
            maxWidth: '384px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Décoration en haut à gauche */}
          <div 
            className="absolute -left-48 -top-48 w-[479px] h-[479px] rounded-full opacity-24 pointer-events-none"
            style={{
              background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15deg, #CE7D2A 197.31deg, #FFAD5A 245.77deg)`,
              filter: 'blur(50px)',
            }}
          />

          {/* Header avec titre et bouton fermer */}
          <div className='relative flex justify-between items-center w-full'>
            <div className='flex items-center gap-3'>
              <img src="/logo/logo-hallia-orange.png" alt="HALL-IA Logo" className="w-10 h-10" />
              <h2 className='text-2xl font-bold font-roboto text-gray-800'>
                {isLogin ? 'Connexion' : 'Inscription'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-all hover:scale-110 cursor-pointer"
              aria-label="Fermer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Contenu du modal */}
          <div className="relative w-full px-2 py-6 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Loader pendant la connexion */}
            {loading && isLogin && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <div className="text-sm text-orange-800">
                    <div className="font-semibold">Connexion en cours...</div>
                    <div className="text-xs">Veuillez patienter quelques instants</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              {/* Nom complet (uniquement pour inscription) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Jean Dupont"
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="exemple@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full  rounded-full! bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white py-2.5 mt-2 font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="animate-spin  rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isLogin ? 'Connexion...' : 'Inscription...'}</span>
                  </>
                ) : (
                  isLogin ? 'Se connecter' : "S'inscrire"
                )}
              </button>
            </form>

            {/* Toggle entre connexion et inscription */}
            <div className="text-center w-full">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-orange-600 hover:text-orange-700 hover:underline text-sm font-medium cursor-pointer"
                disabled={loading}
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations CSS pour le message de validation */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        :global(.animate-fade-in) {
          animation: fade-in 0.4s ease-out;
        }

        :global(.animate-scale-in) {
          animation: scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </>
  );
}
