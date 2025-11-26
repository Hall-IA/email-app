'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, CreditCard, Check, X, Star, Mail, Info, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';

interface CheckoutModalProps {
    userId: string;
    onComplete: () => void;
    onClose?: () => void;
    isUpgrade?: boolean;
    currentAdditionalAccounts?: number;
    // On garde la prop mais on va la recalculer dynamiquement
    unlinkedSubscriptionsCount?: number;
}

export function CheckoutModal({ 
    userId, 
    onComplete, 
    onClose, 
    isUpgrade = false, 
    currentAdditionalAccounts = 0,
    unlinkedSubscriptionsCount: initialUnlinkedCount = 0 
}: CheckoutModalProps) {
    const { user } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [additionalEmails, setAdditionalEmails] = useState(0);
    const [basePrice, setBasePrice] = useState(49);
    const [additionalPrice, setAdditionalPrice] = useState(39);
    
    // État local pour les slots non configurés - calculé dynamiquement
    const [unlinkedSubscriptionsCount, setUnlinkedSubscriptionsCount] = useState(initialUnlinkedCount);
    const [unlinkedSubscriptions, setUnlinkedSubscriptions] = useState<any[]>([]);

    // Fonction pour récupérer les slots non configurés (même logique que AdditionalEmailModal)
    const fetchUnlinkedSubscriptions = async () => {
        try {
            console.log('[CheckoutModal] Récupération des slots non configurés...');
            
            // 1. Récupérer toutes les subscriptions actives
            const { data: subscriptions, error: subsError } = await supabase
                .from('stripe_subscriptions')
                .select('*')
                .eq('user_id', user?.id)
                .eq('status', 'active');
            
                console.log('[CheckoutModal] Raw subscriptions data:', subscriptions);
                subscriptions?.forEach((sub, idx) => {
                    console.log(`[CheckoutModal] Subscription ${idx}:`, {
                        id: sub.id,
                        stripe_subscription_id: sub.stripe_subscription_id,
                        additional_accounts: sub.additional_accounts,
                        subscription_items: sub.subscription_items // Si vous avez cette colonne
                    });
                });

            if (subsError) {
                console.error('[CheckoutModal] Erreur subscriptions:', subsError);
                return;
            }

            // 2. Récupérer tous les comptes email connectés
            const { data: accounts, error: accountsError } = await supabase
                .from('email_configurations')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_connected', true);

            if (accountsError) {
                console.error('[CheckoutModal] Erreur accounts:', accountsError);
                return;
            }

            // 3. Calculer le total de slots payés
            const totalPaidSlots = subscriptions?.reduce((sum, sub) => {
                return sum + (sub.additional_accounts || 0);
            }, 0) || 0;

            // 4. Calculer les slots non configurés
            const accountsLength = accounts?.length || 0;
            const calculatedUnconfigured = Math.max(0, totalPaidSlots - accountsLength);

            // 5. Identifier les subscriptions non liées
            const unlinked = subscriptions?.filter(sub => {
                // Si la subscription n'a pas d'email_configuration_id, elle est non liée
                return !sub.email_configuration_id && sub.additional_accounts > 0;
            }) || [];

            console.log('[CheckoutModal] Résultats:', {
                totalPaidSlots,
                accountsLength,
                calculatedUnconfigured,
                unlinkedSubscriptions: unlinked,
                unlinkedCount: unlinked.length
            });

            setUnlinkedSubscriptionsCount(calculatedUnconfigured);
            setUnlinkedSubscriptions(unlinked);

        } catch (error) {
            console.error('[CheckoutModal] Erreur lors de la récupération des slots:', error);
        }
    };

    // Récupérer les prix depuis Stripe
    useEffect(() => {
        const fetchStripePrices = async () => {
            try {
                const response = await fetch('/api/stripe/prices', {
                    method: 'GET',
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.basePlan?.amount) {
                        setBasePrice(data.basePlan.amount);
                    }
                    if (data.additionalAccount?.amount) {
                        setAdditionalPrice(data.additionalAccount.amount);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des prix Stripe:', error);
            }
        };

        fetchStripePrices();
    }, []);

    // Récupérer les slots non configurés au montage et quand l'utilisateur change
    useEffect(() => {
        if (user?.id && isUpgrade) {
            fetchUnlinkedSubscriptions();
        }
    }, [user?.id, isUpgrade]);

    // Écouter les changements en temps réel sur les subscriptions et email_configurations
    useEffect(() => {
        if (!user?.id || !isUpgrade) return;

        console.log('[CheckoutModal] Configuration real-time...');

        const subscriptionsChannel = supabase
            .channel('checkout_subscriptions_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'stripe_subscriptions',
                    filter: `user_id=eq.${user.id}`
                }, 
                (payload: any) => {
                    console.log('[CheckoutModal] Changement détecté sur subscriptions:', payload);
                    fetchUnlinkedSubscriptions();
                }
            )
            .subscribe();

        const emailConfigsChannel = supabase
            .channel('checkout_email_configs_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'email_configurations',
                    filter: `user_id=eq.${user.id}`
                }, 
                (payload: any) => {
                    console.log('[CheckoutModal] Changement détecté sur email_configurations:', payload);
                    fetchUnlinkedSubscriptions();
                }
            )
            .subscribe();

        return () => {
            subscriptionsChannel.unsubscribe();
            emailConfigsChannel.unsubscribe();
        };
    }, [user?.id, isUpgrade]);

    // Vérifier le retour de Stripe
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const upgraded = urlParams.get('upgraded');
        const payment = urlParams.get('payment');
        
        if ((upgraded === 'success' || payment === 'success') && isUpgrade) {
            console.log('[CheckoutModal] Retour de Stripe détecté, refresh des slots...');
            
            // Attendre un peu que le webhook Stripe ait traité
            setTimeout(() => {
                fetchUnlinkedSubscriptions();
            }, 2000);
        }
    }, [isUpgrade]);

    // Fonction pour récupérer le compteur depuis localStorage
    const loadEmailCounter = () => {
        if (!isUpgrade && typeof window !== 'undefined') {
            const saved = localStorage.getItem('business_pass_email_counter');
            console.log('[CheckoutModal] Compteur récupéré depuis localStorage:', saved);
            if (saved) {
                const count = parseInt(saved, 10) || 0;
                console.log('[CheckoutModal] Compteur parsé:', count);
                setAdditionalEmails(count);
                return count;
            } else {
                console.log('[CheckoutModal] Aucun compteur trouvé dans localStorage, utilisation de 0');
                setAdditionalEmails(0);
                return 0;
            }
        }
        return additionalEmails;
    };

    // Récupérer le compteur au montage et quand isUpgrade change
    useEffect(() => {
        loadEmailCounter();
    }, [isUpgrade]);

    // Re-vérifier le compteur au montage de la modal
    useEffect(() => {
        if (!isUpgrade && typeof window !== 'undefined') {
            loadEmailCounter();
            
            const timeout = setTimeout(() => {
                loadEmailCounter();
            }, 100);
            
            const timeout2 = setTimeout(() => {
                loadEmailCounter();
            }, 500);
            
            return () => {
                clearTimeout(timeout);
                clearTimeout(timeout2);
            };
        }
    }, []);
    
    // Écouter les changements dans localStorage
    useEffect(() => {
        if (!isUpgrade && typeof window !== 'undefined') {
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === 'business_pass_email_counter') {
                    console.log('[CheckoutModal] Changement détecté dans localStorage:', e.newValue);
                    loadEmailCounter();
                }
            };
            
            window.addEventListener('storage', handleStorageChange);
            
            const handleCustomStorageChange = () => {
                console.log('[CheckoutModal] Changement détecté via custom event');
                loadEmailCounter();
            };
            
            window.addEventListener('localStorageChange', handleCustomStorageChange);
            
            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('localStorageChange', handleCustomStorageChange);
            };
        }
    }, [isUpgrade]);

    const calculateTotal = () => {
        if (isUpgrade) {
            return (additionalEmails + 1) * additionalPrice;
        }
        // Pour le premier abonnement, on paie uniquement le basePrice
        return basePrice;
    };

    const incrementEmails = () => {
        const newValue = additionalEmails + 1;
        setAdditionalEmails(newValue);
        if (!isUpgrade && typeof window !== 'undefined') {
            localStorage.setItem('business_pass_email_counter', newValue.toString());
        }
    };

    const decrementEmails = () => {
        if (additionalEmails > 0) {
            const newValue = additionalEmails - 1;
            setAdditionalEmails(newValue);
            if (!isUpgrade && typeof window !== 'undefined') {
                localStorage.setItem('business_pass_email_counter', newValue.toString());
            }
        }
    };

    const handleInitialClick = () => {
        if (isUpgrade) {
            setShowConfirmation(true);
        } else {
            handleCheckout();
        }
    };

    const handleCheckout = async () => {
        setLoading(true);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                setLoading(false);
                return;
            }

            let endpoint, body;

            if (isUpgrade) {
                endpoint = 'stripe-add-account-checkout';
                body = {
                    additional_accounts: additionalEmails + 1,
                    success_url: `${window.location.origin}/settings?upgraded=success`,
                    cancel_url: `${window.location.origin}/settings?upgraded=cancelled`,
                };
            } else {
                // Pour le premier abonnement, on paie uniquement le plan de base (pas de compteur)
                const basePlanPriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID;
                
                if (!basePlanPriceId) {
                    showToast('Configuration Stripe manquante - Plan de base', 'error');
                    setLoading(false);
                    return;
                }

                endpoint = 'stripe-checkout';
                body = {
                    price_id: basePlanPriceId,
                    additional_account_price_id: null,
                    additional_accounts: 0,
                    success_url: `${window.location.origin}/dashboard?payment=success`,
                    cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
                    mode: 'subscription',
                };
                
                console.log('[CheckoutModal] handleCheckout - Body envoyé à Stripe (premier abonnement uniquement):', body);
            }
            
            console.log('[CheckoutModal] Envoi à Stripe:', {
                endpoint,
                body
            });

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/${endpoint}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();
            if (data.error) {
                showToast(`Erreur: ${data.error}`, 'error');
                setLoading(false);
                return;
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Erreur lors de la création de la session de paiement', 'error');
            setLoading(false);
        }
    };

    const totalPrice = calculateTotal();

    // Le reste du JSX reste identique...
    // (showConfirmation et le return avec tout le JSX)
    
    if (showConfirmation) {
        const nbComptes = additionalEmails + 1;
        const prixTotal = totalPrice;
        
        return (
            <>
                <ToastComponent />
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full font-inter max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Confirmer l'upgrade</h2>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex gap-3">
                                <CreditCard className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-orange-900 mb-2">
                                        Paiement automatique
                                    </p>
                                    <p className="text-xs text-orange-800 leading-relaxed">
                                        En cliquant sur "Confirmer et payer", votre carte bancaire enregistrée sera immédiatement débitée de <strong>{prixTotal}€ HT</strong> pour {nbComptes} compte{nbComptes > 1 ? 's' : ''} additionnel{nbComptes > 1 ? 's' : ''}.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Mail className="w-5 h-5 text-gray-600" />
                                    <p className="text-sm font-semibold text-gray-900">Détails de facturation</p>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <div className="flex justify-between">
                                        <span>{nbComptes} compte{nbComptes > 1 ? 's' : ''} additionnel{nbComptes > 1 ? 's' : ''} :</span>
                                        <span className="font-semibold">{nbComptes} × {additionalPrice}€ = {prixTotal}€ HT/mois</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Renouvellement automatique chaque mois
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    Vous obtiendrez immédiatement :
                                </p>
                                <ul className="text-xs text-green-800 space-y-1 ml-6">
                                    <li>• {nbComptes} compte{nbComptes > 1 ? 's' : ''} email supplémentaire{nbComptes > 1 ? 's' : ''}</li>
                                    <li>• Tri automatique illimité</li>
                                    <li>• Réponses automatiques IA</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900 text-center">
                                    ✓ Sans engagement - Résiliez à tout moment
                                </p>
                            </div>

                            {unlinkedSubscriptionsCount > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">
                                            Vous avez {unlinkedSubscriptionsCount} slot{unlinkedSubscriptionsCount > 1 ? 's' : ''} non configuré{unlinkedSubscriptionsCount > 1 ? 's' : ''}. Configurez-le{unlinkedSubscriptionsCount > 1 ? 's' : ''} avant de pouvoir résilier.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
                            >
                                Retour
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className="group relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-4 py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                    {loading ? 'Traitement...' : 'Confirmer et payer'}
                                </span>
                                {!loading && (
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
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </>
        );
    }

    return (
        <>
            <ToastComponent />
            
            {/* Overlay - non cliquable */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré - style similaire à CompanyInfoModal */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                    
                    {/* Header avec gradient conique */}
                    <div 
                        className="relative px-6 pt-7 pb-0 overflow-hidden"
                       
                    >
                        {/* Pattern de plus signs */}
                        <div 
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px),
                                                  repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px)`,
                            }}
                        />
                        
                        {/* Bouton fermer en haut à droite */}
                        {isUpgrade && onClose && (
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-20"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        )}
                        
                        <div className="relative z-10 py-5">
                            {/* Icône cadenas */}
                            <div className="w-16 h-16 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            
                            <h2 className='text-4xl font-bold font-thunder text-black mb-2 text-center'>
                                {isUpgrade ? 'Ajouter un compte' : 'Finaliser l\'abonnement'}
                            </h2>
                            <p className="text-gray-600 text-sm mt-1 text-center">
                                {isUpgrade ? 'Upgrade de votre plan' : 'Passez au paiement de votre premier email pour commencer à utiliser Business Pass !'}
                            </p>
                            {!isUpgrade && (
                                <p className="text-orange-600 text-xs text-center font-semibold mt-2 font-roboto!important">
                                    Étape obligatoire
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Ligne blanche de séparation */}
                    <div className="h-1 bg-white"></div>

                    {/* Contenu scrollable */}
                    <div className="relative overflow-y-auto flex-1 min-h-0 py-5">
                        <div className="px-6">
                            <div className="mb-6">
                                <div className="rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-inter">
                                        Tarification :
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 font-inter">
                                                {isUpgrade ? 'Compte additionnel' : 'Votre premier email'}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-900 font-inter">
                                                {isUpgrade ? `${additionalPrice}€` : `${basePrice}€`} HT/mois
                                            </span>
                                        </div>
                                        {!isUpgrade && (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                <span className="text-sm text-gray-700 font-inter">
                                                    Les suivants
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900 font-inter">
                                                    {additionalPrice}€ HT/mois
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/*<div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Mail className="w-5 h-5 text-orange-600" />
                                    <h4 className="font-semibold text-gray-900">Emails additionnels</h4>
                                </div>
                                
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <button
                                        onClick={decrementEmails}
                                        disabled={additionalEmails === 0}
                                        className="w-10 h-10 rounded-lg bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                    >
                                        <Minus className="w-5 h-5 text-gray-700" />
                                    </button>

                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-2xl font-bold text-gray-900">
                                            {additionalEmails}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                            {isUpgrade 
                                                ? (additionalEmails === 0 ? '1 compte à ajouter' : `${additionalEmails + 1} comptes à ajouter`)
                                                : (additionalEmails === 0 ? '1 email inclus' : `${additionalEmails + 1} emails au total`)
                                            }
                                        </span>
                                    </div>

                                    <button
                                        onClick={incrementEmails}
                                        className="w-10 h-10 rounded-lg bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center"
                                    >
                                        <Plus className="w-5 h-5 text-gray-700" />
                                    </button>
                                </div>

                                <p className="text-xs text-center text-gray-600">
                                    +{additionalPrice}€ HT/mois par email additionnel
                                </p>
                            </div>*/}

                                {!isUpgrade && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 font-inter">
                                                    Montant total
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1 font-inter">Facturé mensuellement</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-orange-600">{basePrice}€</p>
                                                <p className="text-xs text-gray-600 font-inter">HT/mois</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                    <p className="text-sm font-medium text-blue-900 text-center font-inter">
                                        ✓ Sans engagement - Résiliez à tout moment
                                    </p>
                                </div>

                            {isUpgrade && unlinkedSubscriptionsCount > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">
                                            Vous avez {unlinkedSubscriptionsCount} slot{unlinkedSubscriptionsCount > 1 ? 's' : ''} non configuré{unlinkedSubscriptionsCount > 1 ? 's' : ''}. Configurez-le{unlinkedSubscriptionsCount > 1 ? 's' : ''} avant de pouvoir résilier.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                    {/* Footer avec boutons */}
                    <div className="px-6 pb-5 pt-4 border-t border-gray-100 bg-white">
                        <button
                            onClick={handleInitialClick}
                            disabled={loading}
                            className="group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-4 py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                        >
                            <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                {loading ? 'Traitement...' : isUpgrade ? 'Continuer' : 'Procéder au paiement'}
                            </span>
                            {!loading && (
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
                        </button>

                        <p className="text-xs text-gray-500 text-center mt-4 font-inter">
                            Paiement sécurisé par Stripe
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}