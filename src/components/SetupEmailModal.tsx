'use client';

import { useState } from 'react';
import { Mail, Server, Eye, EyeOff, CheckCircle, ArrowRight, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';

interface SetupEmailModalProps {
    userId: string;
    onComplete: () => void;
}

export function SetupEmailModal({ userId, onComplete }: SetupEmailModalProps) {
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
        companyName: '',
        activityDescription: '',
        services: '',
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
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmail-oauth-init`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ redirectUrl: window.location.origin }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Échec de l\'initialisation Gmail');
            }
            const { authUrl } = await response.json();
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
                        .maybeSingle();

                    if (data) {
                        localStorage.removeItem('selected_plan');
                        localStorage.removeItem('business_pass_email_counter');
                        onComplete();
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Session expirée', 'error');
                setTesting(false);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-email-connection`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        imap_host: formData.imapHost,
                        imap_port: typeof formData.imapPort === 'number' ? formData.imapPort : parseInt(formData.imapPort),
                    }),
                }
            );

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

    const handleSmtpImapSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
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
            const { error } = await supabase.from('email_configurations').insert({
                user_id: user?.id,
                name: formData.email,
                email: formData.email,
                provider: 'smtp_imap',
                is_connected: true,
                is_primary: true,
                is_classement: true, // ✅ Tri automatique activé par défaut
                password: formData.password,
                imap_host: formData.imapHost,
                imap_port: typeof formData.imapPort === 'number' ? formData.imapPort : parseInt(formData.imapPort),
                imap_username: formData.email,
                imap_password: formData.password,
                company_name: formData.companyName,
                activity_description: formData.activityDescription,
                services_offered: formData.services,
            });

            if (error) throw error;

            localStorage.removeItem('selected_plan');
            localStorage.removeItem('business_pass_email_counter');
            
            showToast('Email configuré avec succès !', 'success');
            setTimeout(() => onComplete(), 500);
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
            
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
            
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    
                    {/* Header */}
                    <div className="relative px-8 pt-8 pb-4">
                        <div className="text-center mb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold font-thunder text-gray-900">Configuration Email</h2>
                            <p className="text-gray-600 text-sm mt-1">Configurez votre premier compte email pour commencer</p>
                            <p className="text-orange-600 text-xs font-semibold mt-2">Étape obligatoire</p>
                        </div>
                    </div>

                    {/* Contenu scrollable */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-8 py-4">
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
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
                                >
                                    ← Retour
                                </button>
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
                            <form onSubmit={handleSmtpImapSubmit} className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
                                >
                                    ← Retour
                                </button>

                                <h3 className="text-xl font-bold text-gray-900">Configuration SMTP/IMAP</h3>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="votre@email.com"
                                        required
                                    />
                                </div>

                                {/* Mot de passe */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Mot de passe <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleFormChange('password', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Serveur IMAP */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Serveur IMAP <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.imapHost}
                                            onChange={(e) => handleFormChange('imapHost', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="imap.example.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Port</label>
                                        <input
                                            type="number"
                                            value={formData.imapPort}
                                            onChange={(e) => handleFormChange('imapPort', parseInt(e.target.value))}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Bouton test */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing || !formData.email || !formData.password || !formData.imapHost}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {testing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Test en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Server className="w-5 h-5" />
                                                Tester la connexion
                                            </>
                                        )}
                                    </button>

                                    {testResult && (
                                        <div className={`mt-3 p-4 rounded-lg flex items-start gap-3 ${
                                            testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                        }`}>
                                            {testResult.success ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <p className={`font-semibold ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                                    {testResult.success ? 'Succès' : 'Erreur'}
                                                </p>
                                                <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                    {testResult.message}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bouton enregistrer */}
                                <button
                                    type="submit"
                                    disabled={loading || !tested}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Configuration...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            {tested ? 'Terminer la configuration' : 'Testez d\'abord la connexion'}
                                        </>
                                    )}
                                </button>
                                
                                {!tested && (
                                    <p className="text-sm text-orange-600 text-center -mt-2">
                                        Vous devez d'abord tester la connexion avec succès
                                    </p>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Message informatif */}
                    <div className="px-8 pb-6">
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-800">
                                <strong>Obligatoire :</strong> Vous devez configurer au moins un email pour accéder à l'application.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

