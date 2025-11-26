'use client';

import { useState } from 'react';
import { Mail, Server, Eye, EyeOff, ArrowRight, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';

interface AdditionalEmailModalProps {
    userId: string;
    subscriptionId?: string;
    onComplete: (emailConfigId?: string, email?: string) => void;
    onClose?: () => void;
}

export function AdditionalEmailModal({ userId, subscriptionId, onComplete, onClose }: AdditionalEmailModalProps) {
    const { user } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [tested, setTested] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'smtp_imap' | null>(null);
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        imapHost: '',
        imapPort: 993,
    });

    const handleFormChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value });
        if (['email', 'password', 'imapHost', 'imapPort'].includes(field)) {
            setTested(false);
            setTestResult(null);
        }
    };

    const handleGmailConnect = async () => {
        try {
            const response = await fetch('/api/gmail/oauth-init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    redirectUrl: window.location.origin,
                    subscriptionId: subscriptionId 
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Échec de l\'initialisation Gmail';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch {
                    // Si la réponse n'est pas du JSON, c'est probablement une erreur serveur
                    errorMessage = 'Erreur serveur. Vérifiez que GOOGLE_CLIENT_ID est configuré dans .env.local';
                }
                showToast(errorMessage, 'error');
                return;
            }
            
            const data = await response.json();
            if (!data.authUrl) {
                showToast('Configuration OAuth manquante. Consultez CONFIGURATION_GMAIL_OAUTH.md', 'error');
                return;
            }
            const { authUrl } = data;
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const popup = window.open(authUrl, 'Gmail OAuth', `width=${width},height=${height},left=${left},top=${top}`);

            const checkPopup = setInterval(async () => {
                if (popup?.closed) {
                    clearInterval(checkPopup);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Vérifier si email ajouté
                    const { data } = await supabase
                        .from('email_configurations')
                        .select('id')
                        .eq('user_id', user?.id)
                        .eq('is_connected', true)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (data) {
                        // Récupérer l'email configuré pour le passer à onComplete
                        const { data: emailConfig } = await supabase
                            .from('email_configurations')
                            .select('id, email')
                            .eq('id', data.id)
                            .maybeSingle();
                        
                        onComplete(emailConfig?.id, emailConfig?.email);
                    } else {
                        setStep(1);
                    }
                }
            }, 1000);

        } catch (err) {
            console.error('Erreur connexion Gmail:', err);
            showToast('Erreur lors de la connexion Gmail', 'error');
        }
    };

    const handleTestConnection = async () => {
        if (!formData.email || !formData.password || !formData.imapHost) {
            showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/email/verify-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    imap_host: formData.imapHost,
                    imap_port: typeof formData.imapPort === 'number' ? formData.imapPort : parseInt(formData.imapPort),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setTestResult({ success: true, message: 'Connexion réussie !' });
                setTested(true);
            } else {
                setTestResult({ success: false, message: data.error || 'Échec de la connexion' });
                setTested(false);
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            setTestResult({ success: false, message: 'Erreur lors du test de connexion' });
            setTested(false);
        } finally {
            setTesting(false);
        }
    };

    const handleSmtpImapSubmit = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        
        if (!formData.email || !formData.password || !formData.imapHost) {
            showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        if (!tested) {
            showToast('Veuillez d\'abord tester la connexion avant d\'enregistrer', 'warning');
            return;
        }

        setLoading(true);
        try {
            // Vérifier si l'email existe déjà
            const { data: existing } = await supabase
                .from('email_configurations')
                .select('id')
                .eq('user_id', user?.id)
                .eq('email', formData.email)
                .maybeSingle();

            if (existing) {
                showToast('Cet email est déjà configuré', 'error');
                setLoading(false);
                return;
            }

            const { error } = await supabase.from('email_configurations').insert({
                user_id: user?.id,
                name: formData.email,
                email: formData.email,
                provider: 'smtp_imap',
                is_connected: true,
                is_primary: false, // Compte additionnel
                is_classement: false,
                password: formData.password,
                imap_host: formData.imapHost,
                imap_port: typeof formData.imapPort === 'number' ? formData.imapPort : parseInt(formData.imapPort),
                imap_username: formData.email,
                imap_password: formData.password,
            });

            if (error) throw error;

            // Récupérer l'email configuré pour le passer à onComplete
            const { data: emailConfig } = await supabase
                .from('email_configurations')
                .select('id, email')
                .eq('user_id', user?.id)
                .eq('email', formData.email)
                .maybeSingle();

            showToast('Email configuré avec succès !', 'success');
            onComplete(emailConfig?.id, emailConfig?.email);
        } catch (err) {
            console.error('Error adding email:', err);
            showToast('Erreur lors de l\'ajout du compte email', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastComponent />
            
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto font-inter">
                    
                    {/* Bouton fermer */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10 text-gray-600 hover:text-gray-900"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    
                    {/* Bouton retour en haut à gauche */}
                    {step === 2 && (
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10 text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                            ← Retour
                        </button>
                    )}
                    
                    {/* Header */}
                    <div className="relative px-8 pt-8 pb-4">
                        <div className="text-center mb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold font-thunder text-gray-900">Configuration Email</h2>
                            <p className="text-gray-600 text-sm mt-1">Ajoutez un compte email additionnel</p>
                        </div>
                    </div>

                    {/* Contenu scrollable */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-8 p-4">
                        {step === 1 ? (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Choisissez votre fournisseur</h3>

                                {/* Gmail */}
                                <button
                                    onClick={() => { setSelectedProvider('gmail'); setStep(2); }}
                                    className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        <img src="/logo/logo-gmail.png" alt="Gmail" className="w-10 h-10" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-bold text-lg text-gray-900">Gmail</h4>
                                        <p className="text-sm text-gray-600">Connexion rapide via Google</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </button>

                                {/* SMTP/IMAP */}
                                <button
                                    onClick={() => { setSelectedProvider('smtp_imap'); setStep(2); }}
                                    className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                        <Server className="w-9 h-9 text-gray-700" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-bold text-lg text-gray-900">SMTP/IMAP</h4>
                                        <p className="text-sm text-gray-600">Pour tout autre fournisseur</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        ) : selectedProvider === 'gmail' ? (
                            <div className="space-y-6 text-center py-6">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
                                    <img src="/logo/logo-gmail.png" alt="Gmail" className="w-14 h-14" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Connecter Gmail</h3>
                                <p className="text-gray-600 mb-6">
                                    Une popup va s'ouvrir pour vous connecter via Google
                                </p>
                                <button
                                    onClick={handleGmailConnect}
                                    disabled={loading}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Ouverture...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-5 h-5" />
                                            Connecter avec Google
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 mb-6">
                                {/* Messages d'erreur/succès en haut */}
                                {testResult && !testResult.success && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <div className="font-semibold text-red-800 text-sm">Erreur de connexion</div>
                                            <div className="text-xs text-red-700 mt-1">{testResult.message}</div>
                                        </div>
                                    </div>
                                )}

                                {testResult && testResult.success && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <div className="font-semibold text-green-800 text-sm">Connexion réussie</div>
                                            <div className="text-xs text-green-700 mt-1">Les paramètres sont valides. Vous pouvez terminer la configuration.</div>
                                        </div>
                                    </div>
                                )}

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Adresse email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="contact@hallia.ai"
                                        required
                                    />
                                </div>

                                {/* Mot de passe */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Mot de passe
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleFormChange('password', e.target.value)}
                                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Serveur IMAP */}
                                <div className="grid grid-cols-2 gap-4 pb-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Serveur IMAP Entrant
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.imapHost}
                                            onChange={(e) => handleFormChange('imapHost', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="imap.example.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Port IMAP
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.imapPort}
                                            onChange={(e) => handleFormChange('imapPort', parseInt(e.target.value))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="993"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Bouton test */}
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing || !formData.email || !formData.password || !formData.imapHost}
                                    className={`w-full px-4 py-2.5 border-2 rounded-full font-medium transition-all flex items-center justify-center gap-2 group ${
                                        (testing || !formData.email || !formData.password || !formData.imapHost) 
                                            ? 'opacity-50 cursor-not-allowed border-orange-500 text-orange-600' 
                                            : testResult?.success
                                                ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:border-green-400'
                                                : testResult && !testResult.success
                                                    ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200 hover:border-red-400'
                                                    : 'border-orange-500 text-orange-600 hover:bg-gradient-to-br hover:from-[#F35F4F] hover:to-[#FFAD5A] hover:text-white hover:border-transparent'
                                    }`}
                                >
                                    {testing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Test en cours...
                                        </>
                                    ) : testResult?.success ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Connexion réussie
                                        </>
                                    ) : testResult && !testResult.success ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 group-hover:animate-spin transition-transform" />
                                            Retester la connexion
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Tester la connexion
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bouton Annuler pour l'étape 1 */}
                    {step === 1 && onClose && (
                        <div className="px-8 pb-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    )}

                    {/* Bouton Annuler pour Gmail */}
                    {step === 2 && selectedProvider === 'gmail' && onClose && (
                        <div className="px-8 pb-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    )}

                    {/* Bouton de soumission pour SMTP/IMAP */}
                    {step === 2 && selectedProvider === 'smtp_imap' && (
                        <div className="px-8 pb-6 -mt-4">
                            <div className="flex gap-3">
                                {onClose && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                                    >
                                        Annuler
                                    </button>
                                )}
                                <div className="flex-1 relative group/tooltip">
                                    <button
                                        type="button"
                                        onClick={() => handleSmtpImapSubmit()}
                                        disabled={loading || !tested}
                                        title={!tested ? "Validez votre connexion avant de terminer la configuration" : ""}
                                        className={`w-full group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out ${
                                            tested && !loading
                                                ? 'hover:shadow-xl cursor-pointer'
                                                : 'opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span className="relative z-10 transition-transform duration-300">Configuration...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                                Terminer la configuration
                                            </span>
                                            {tested && (
                                                <svg
                                                    className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </>
                                    )}
                                    </button>
                                    {!tested && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                            Validez votre connexion avant de terminer la configuration
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                                <div className="border-4 border-transparent border-t-gray-900"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

