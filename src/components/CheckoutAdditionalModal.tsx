'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './Toast';
import { Plus, Minus, CreditCard, Check, X, Mail, Info } from 'lucide-react';

interface CheckoutAdditionalModalProps {
    userId: string;
    onClose?: () => void;
    currentAdditionalAccounts?: number;
    unlinkedSubscriptionsCount?: number;
}

export function CheckoutAdditionalModal({
    userId,
    onClose,
    currentAdditionalAccounts = 0,
    unlinkedSubscriptionsCount = 0,
}: CheckoutAdditionalModalProps) {
    const { showToast, ToastComponent } = useToast();
    const [loading, setLoading] = useState(false);
    const [additionalAccounts, setAdditionalAccounts] = useState(0);
    const [additionalPrice, setAdditionalPrice] = useState(39); // Valeur par défaut en attendant le chargement

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
                    if (data.additionalAccount?.amount) {
                        setAdditionalPrice(data.additionalAccount.amount);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des prix Stripe:', error);
                // Garder la valeur par défaut en cas d'erreur
            }
        };

        fetchStripePrices();
    }, []);
    

    const incrementAccounts = () => {
        setAdditionalAccounts((prev) => prev + 1);
    };

    const decrementAccounts = () => {
        setAdditionalAccounts((prev) => (prev > 0 ? prev - 1 : 0));
    };

    const totalPrice = (additionalAccounts + 1) * additionalPrice;

    const handleCheckout = async () => {
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                showToast('Vous devez être connecté', 'error');
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-add-account-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                    },
                    body: JSON.stringify({
                        additional_accounts: additionalAccounts + 1,
                        success_url: `${window.location.origin}/settings?upgraded=success`,
                        cancel_url: `${window.location.origin}/settings?upgraded=cancelled`,
                    }),
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

    const nbAccounts = additionalAccounts + 1;

    return (
        <>
            <ToastComponent />
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full font-inter max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-sm uppercase tracking-wide text-orange-500 font-semibold">Ajout de compte</p>
                                <h2 className="text-2xl font-bold text-gray-900 mt-1">Compte additionnel</h2>
                               
                            </div>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex gap-3">
                            <CreditCard className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-orange-900 mb-2">
                                    Paiement automatique via Stripe
                                </p>
                                <p className="text-xs text-orange-800 leading-relaxed">
                                    Chaque compte additionnel coûte <strong>{additionalPrice}€ HT</strong> par mois. Le nombre minimum est de 1.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Mail className="w-5 h-5 text-gray-600" />
                                <p className="text-sm font-semibold text-gray-900">Nombre de comptes à ajouter</p>
                            </div>

                            <div className="flex items-center justify-between gap-4 mb-3">
                                <button
                                    onClick={decrementAccounts}
                                    disabled={additionalAccounts === 0 || loading}
                                    className="w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    <Minus className="w-5 h-5 text-gray-700" />
                                </button>

                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {nbAccounts}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {nbAccounts} compte{nbAccounts > 1 ? 's' : ''} additionnel{nbAccounts > 1 ? 's' : ''} seront ajoutés
                                    </span>
                                </div>

                                <button
                                    onClick={incrementAccounts}
                                    disabled={loading}
                                    className="w-10 h-10 rounded-lg bg-white border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center"
                                >
                                    <Plus className="w-5 h-5 text-gray-700" />
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 text-center">
                                {additionalPrice}€ HT / compte additionnel / mois
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        Montant total
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Facturé mensuellement</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-orange-600">{totalPrice}€</p>
                                    <p className="text-xs text-gray-500">HT / mois</p>
                                </div>
                            </div>
                        </div>

                        {unlinkedSubscriptionsCount > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                    Vous avez {unlinkedSubscriptionsCount} slot{unlinkedSubscriptionsCount > 1 ? 's' : ''} payé{unlinkedSubscriptionsCount > 1 ? 's' : ''} mais non configuré{unlinkedSubscriptionsCount > 1 ? 's' : ''}. Configurez-les avant d'en acheter de nouveaux pour éviter des frais inutiles.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Redirection vers Stripe…' : 'Confirmer et payer'}
                            {!loading && (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

