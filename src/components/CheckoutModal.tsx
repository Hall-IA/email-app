'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, CreditCard, Check, X, Star, Mail, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';

interface CheckoutModalProps {
    userId: string;
    onComplete: () => void;
    onClose?: () => void; // Pour fermer le modal sans action
    isUpgrade?: boolean; // true si c'est un upgrade, false si premier abonnement
    currentAdditionalAccounts?: number;
    unlinkedSubscriptionsCount?: number; // Nombre de slots payés mais non configurés
}

export function CheckoutModal({ userId, onComplete, onClose, isUpgrade = false, currentAdditionalAccounts = 0, unlinkedSubscriptionsCount = 0 }: CheckoutModalProps) {
    const { user } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [additionalEmails, setAdditionalEmails] = useState(0);
    const [basePrice, setBasePrice] = useState(29); // Valeur par défaut en attendant le chargement
    const [additionalPrice, setAdditionalPrice] = useState(19); // Valeur par défaut en attendant le chargement
    
    // Récupérer les prix depuis Stripe
    useEffect(() => {
        const fetchStripePrices = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-stripe-prices`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                    }
                );

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
                // Garder les valeurs par défaut en cas d'erreur
            }
        };

        fetchStripePrices();
    }, []);

    useEffect(() => {
        if (!isUpgrade && typeof window !== 'undefined') {
            // Premier abonnement : récupérer depuis localStorage
            const saved = localStorage.getItem('business_pass_email_counter');
            if (saved) {
                setAdditionalEmails(parseInt(saved, 10));
            }
        }
    }, [isUpgrade]);

    const calculateTotal = () => {
        if (isUpgrade) {
            // Upgrade : compter à partir de 1
            return (additionalEmails + 1) * additionalPrice;
        }
        // Premier abonnement : base + additionnels
        return basePrice + (additionalEmails * additionalPrice);
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
            // Pour upgrade, afficher confirmation
            setShowConfirmation(true);
        } else {
            // Pour premier abonnement, payer directement
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
                // Upgrade : ajouter des comptes
                endpoint = 'stripe-add-account-checkout';
                body = {
                    additional_accounts: additionalEmails + 1, // +1 car on commence à 0
                    success_url: `${window.location.origin}/settings?upgraded=success`,
                    cancel_url: `${window.location.origin}/settings?upgraded=cancelled`,
                };
            } else {
                // Premier abonnement
                const basePlanPriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID;
                const additionalAccountPriceId = process.env.NEXT_PUBLIC_STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID;
                
                if (!basePlanPriceId) {
                    showToast('Configuration Stripe manquante - Plan de base', 'error');
                    setLoading(false);
                    return;
                }
                
                if (!additionalAccountPriceId) {
                    showToast('Configuration Stripe incomplète - Prix additionnel manquant', 'error');
                    setLoading(false);
                    return;
                }

                endpoint = 'stripe-checkout';
                body = {
                    price_id: basePlanPriceId,
                    additional_account_price_id: additionalAccountPriceId,
                    additional_accounts: additionalEmails,
                    success_url: `${window.location.origin}/dashboard?payment=success`,
                    cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
                    mode: 'subscription',
                };
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
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

                            {/* Avertissement pour les comptes non configurés */}
                            {unlinkedSubscriptionsCount > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">
                                            Impossible de résilier un compte non configuré. Configurez-le d'abord dans les paramètres.
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full font-inter max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="mb-6 relative">
                        {isUpgrade && onClose && (
                            <button
                                onClick={onClose}
                                className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 text-center">
                            {isUpgrade ? 'Ajouter un compte' : 'Finaliser l\'abonnement'}
                        </h2>
                        <p className="text-sm text-gray-600 text-center mt-1">
                            {isUpgrade ? 'Upgrade de votre plan' : 'Cette étape est obligatoire'}
                        </p>
                    </div>

                    <div className="mb-6">
                        {/* Informations de prix */}
                        <div className=" rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                
                                Tarification :
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">
                                        {isUpgrade ? 'Compte additionnel' : 'Votre premier email'}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {isUpgrade ? `${additionalPrice}€` : `${basePrice}€`} HT/mois
                                    </span>
                                </div>
                                {!isUpgrade && (
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                        <span className="text-sm text-gray-700">
                                            Les suivants
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {additionalPrice}€ HT/mois
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compteur d'emails additionnels */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
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
                            </div>

                        {/* Récapitulatif prix */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        {isUpgrade ? 'Compte additionnel' : 'Total de votre abonnement'}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">Facturé mensuellement</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-orange-600">{totalPrice}€</p>
                                    <p className="text-xs text-gray-600">HT/mois</p>
                                </div>
                            </div>
                        </div>

                        {/* Message sans engagement */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <p className="text-sm font-medium text-blue-900 text-center">
                                ✓ Sans engagement - Résiliez à tout moment
                            </p>
                        </div>

                        {/* Avertissement pour les comptes non configurés */}
                        {isUpgrade && unlinkedSubscriptionsCount > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800">
                                        Impossible de résilier un compte non configuré. Configurez-le d'abord dans les paramètres.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bouton */}
                    <button
                        onClick={handleInitialClick}
                        disabled={loading}
                        className="group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-4 py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Paiement sécurisé par Stripe
                    </p>
                </div>
            </div>
        </div>
        </>
    );
}
