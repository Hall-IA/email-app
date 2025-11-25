'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Mail, 
  Upload, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  Image as ImageIcon,
  HelpCircle,
  Bug,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TicketCategory = 'question' | 'bug' | 'feature' | 'other';

// Modal de succès
interface SuccessModalProps {
  isOpen: boolean;
  email: string;
  ticketId: string;
  onClose: () => void;
}

const SuccessModal = ({ isOpen, email, ticketId, onClose }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md rounded-lg bg-white shadow-2xl font-roboto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Message envoyé avec succès</h2>
              <p className="text-sm text-gray-500">Numéro de ticket : {ticketId}</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <p className="text-sm text-gray-700 mb-2">
              Notre équipe vous répondra dans les plus brefs délais à l'adresse :
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Mail className="h-4 w-4 text-gray-500" />
              {email}
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Un email de confirmation vous a été envoyé
          </p>

          <button
            onClick={onClose}
            className="w-full rounded-lg px-4 py-2.5 font-medium text-white transition-all hover:opacity-90"
            style={{
              background: `conic-gradient(
                from 195.77deg at 84.44% -1.66%,
                #FE9736 0deg,
                #F4664C 76.15deg,
                #F97E41 197.31deg,
                #E3AB8D 245.77deg,
                #FE9736 360deg
              )`,
            }}
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function SupportPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<TicketCategory>('question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState('');
  const [successEmail, setSuccessEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Charger les informations de l'utilisateur
  useEffect(() => {
    if (user) {
      const loadUserInfo = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setName(profile.full_name || user.email?.split('@')[0] || '');
          setEmail(profile.email || user.email || '');
        } else {
          setName(user.email?.split('@')[0] || '');
          setEmail(user.email || '');
        }
      };
      loadUserInfo();
    }
  }, [user]);

  // Créer les URLs de preview pour les screenshots
  useEffect(() => {
    const newUrls = screenshots.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newUrls);
    
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [screenshots]);

  const categories = [
    { id: 'question' as const, label: 'Question', icon: HelpCircle },
    { id: 'bug' as const, label: 'Bug / Problème technique', icon: Bug },
    { id: 'feature' as const, label: 'Demande de fonctionnalité', icon: Sparkles },
    { id: 'other' as const, label: 'Autre', icon: MessageSquare },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      setErrorMessage('Seules les images sont acceptées (PNG, JPG, GIF, etc.)');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
    
    const newScreenshots = [...screenshots, ...imageFiles].slice(0, 3);
    setScreenshots(newScreenshots);

    // Réinitialiser l'input
    e.target.value = '';
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Veuillez entrer une adresse email valide');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSending(true);
    setShowError(false);

    try {
      // Générer un ticketId unique
      const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Upload des screenshots vers le bucket Supabase Storage
      const screenshotUrls: string[] = [];
      
      if (screenshots.length > 0 && user) {
        for (let i = 0; i < screenshots.length; i++) {
          const file = screenshots[i];
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
          const timestamp = Date.now();
          const fileName = `${user.id}/${timestamp}_${i}_${ticketId}.${fileExt}`;

          try {
            // Upload vers Supabase Storage
            const { data, error } = await supabase.storage
              .from('support-screenshots')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'image/png',
              });

            if (error) {
              console.error('Erreur upload screenshot:', error);
              throw new Error(`Erreur lors de l'upload de ${file.name}`);
            }

            // Récupérer l'URL publique
            const { data: { publicUrl } } = supabase.storage
              .from('support-screenshots')
              .getPublicUrl(fileName);

            screenshotUrls.push(publicUrl);
          } catch (uploadError) {
            console.error('Erreur upload:', uploadError);
            throw new Error('Erreur lors de l\'upload des captures d\'écran');
          }
        }
      }

      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      // 1. Envoyer le ticket au support
      const { error: ticketError } = await supabase.functions.invoke('send-ticket-to-support', {
        body: {
          ticketId,
          name: name.trim(),
          email: email.trim(),
          category,
          subject: subject.trim(),
          message: message.trim(),
          screenshots: screenshotUrls,
        },
      });

      if (ticketError) {
        throw new Error(ticketError.message || 'Erreur lors de l\'envoi du ticket au support');
      }

      // 2. Envoyer la réponse automatique au client
      try {
        await supabase.functions.invoke('support-auto-reply', {
          body: {
            to: email.trim(),
            name: name.trim(),
            ticketId,
          },
        });
      } catch (autoReplyError) {
        console.warn('Erreur envoi réponse automatique (non bloquant):', autoReplyError);
      }

      // Succès ! Afficher le modal
      setSuccessEmail(email.trim());
      setSuccessTicketId(ticketId);
      setShowSuccessModal(true);

      // Reset le formulaire
      setCategory('question');
      setSubject('');
      setMessage('');
      setScreenshots([]);

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      setErrorMessage(error.message || 'Une erreur est survenue lors de l\'envoi');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="font-roboto mt-6 w-full"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-t-xl border border-b-0 border-gray-200 bg-white p-6"
        >
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Support</h1>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-b-xl border border-t-0 border-gray-200 bg-white p-6"
        >

          {/* Modal de succès */}
          <AnimatePresence>
            {showSuccessModal && (
              <SuccessModal
                isOpen={showSuccessModal}
                email={successEmail}
                ticketId={successTicketId}
                onClose={() => setShowSuccessModal(false)}
              />
            )}
          </AnimatePresence>

          {/* Message d'erreur */}
          <AnimatePresence>
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 text-sm">Erreur</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom et Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm  font-semibold text-gray-900">
                  Votre nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500"
                  disabled={isSending}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Votre email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500"
                  disabled={isSending}
                  required
                />
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    disabled={isSending}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      category === cat.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <cat.icon className={`w-6 h-6 ${category === cat.id ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className="text-xs font-medium text-gray-800">{cat.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sujet */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Sujet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Problème lors de la configuration d'un email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500"
                disabled={isSending}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Décrivez votre problème <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez en détail le problème rencontré, les étapes pour le reproduire, etc."
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500 resize-none"
                disabled={isSending}
                required
              />
            </div>

            {/* Upload de captures d'écran */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Captures d'écran (optionnel, max 3)
              </label>
              
              <div className="space-y-3">
                {/* Preview des images */}
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {screenshots.map((file, index) => (
                      <div key={index} className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                        {/* Image */}
                        <div className="aspect-video w-full bg-gray-50 flex items-center justify-center">
                          {previewUrls[index] ? (
                            <img
                              src={previewUrls[index]}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <ImageIcon className="w-10 h-10" />
                              <span className="text-xs">Chargement...</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Info bar */}
                        <div className="p-2.5 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <ImageIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                              <span className="text-xs text-gray-700 truncate" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeScreenshot(index)}
                              className="flex-shrink-0 p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                              title="Supprimer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bouton d'upload */}
                {screenshots.length < 3 && (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isSending}
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Cliquez pour ajouter des captures d'écran
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF (max 3 fichiers, 5MB chacun)
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Information</p>
                  <p className="mt-1">
                    Les captures d'écran nous aident à mieux comprendre votre problème et à le résoudre plus rapidement.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton d'envoi */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSending}
                className="flex-1 rounded-full px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{
                  background: `conic-gradient(
                    from 195.77deg at 84.44% -1.66%,
                    #FE9736 0deg,
                    #F4664C 76.15deg,
                    #F97E41 197.31deg,
                    #E3AB8D 245.77deg,
                    #FE9736 360deg
                  )`,
                }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer le message
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
