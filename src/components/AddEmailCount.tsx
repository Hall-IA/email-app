'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Minus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';

interface AddEmailCountProps {
    onComplete?: () => void;
    onClose?: () => void;
}

export default function AddEmailCount({ onComplete, onClose }: AddEmailCountProps) {
    const { user } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const [loading, setLoading] = useState(false);
    const [additionalEmails, setAdditionalEmails] = useState(0);
    const [additionalPrice, setAdditionalPrice] = useState(39);
    const [isVisible, setIsVisible] = useState(true);

    // Récupérer les prix depuis Stripe
    useEffect(() => {
        const fetchStripePrices = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/get-stripe-prices`,
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
            }
        };

        fetchStripePrices();
    }, []);

    // On commence toujours à 0 (affichage 1 compte additionnel minimum)
    // Pas de chargement depuis localStorage car on est dans le mode "additionnel uniquement"

    // Calculer le total (comme CheckoutAdditionalModal : (additionalEmails + 1) * additionalPrice)
    const calculateTotal = () => {
        return (additionalEmails + 1) * additionalPrice;
    };

    // Incrémenter les emails
    const incrementEmails = () => {
        const newValue = additionalEmails + 1;
        setAdditionalEmails(newValue);
        // Ne pas sauvegarder dans localStorage car on est dans le mode "additionnel uniquement"
        // Le localStorage est utilisé pour le premier checkout, pas pour les additions
    };

    // Décrémenter les emails
    const decrementEmails = () => {
        if (additionalEmails > 0) {
            const newValue = additionalEmails - 1;
            setAdditionalEmails(newValue);
            // Ne pas sauvegarder dans localStorage car on est dans le mode "additionnel uniquement"
        }
    };

    // Fermer manuellement
    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            onClose();
        }
    };

    // Continuer vers le checkout Stripe (comme CheckoutAdditionalModal)
    const handleContinue = async () => {
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
                        additional_accounts: additionalEmails + 1,
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
                // Fermer les modals avant de rediriger
                setIsVisible(false);
                if (onComplete) {
                    onComplete();
                }
                // Rediriger vers Stripe
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Erreur lors de la création de la session de paiement', 'error');
            setLoading(false);
        }
    };

    if (!isVisible) return null;

    const totalPrice = calculateTotal();

    return (
        <>
            <ToastComponent />
            
            {/* Overlay - non cliquable */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré - style similaire à CompanyInfoModal */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                    
                    {/* Bouton fermer en haut à droite */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10 text-gray-600 hover:text-gray-900"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    
                    {/* Header avec gradient conique */}
                    <div className="relative px-6 pt-10 pb-0 overflow-hidden">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                     
                        <div className="relative z-10 py-5">
                            <h2 className='text-4xl font-bold font-thunder text-black text-center mb-2'>Compte additionnel</h2>
                            <p className="text-gray-600 text-sm mt-1 text-center">
                                Ajoutez des comptes email que vous configurerez plus tard
                            </p>
                        </div>
                    </div>

                    {/* Ligne blanche de séparation */}
                    <div className="h-1 bg-white"></div>

                    {/* Contenu scrollable */}
                    <div className="relative overflow-y-auto flex-1 min-h-0 py-5">
                        <div className="px-6 py-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Mail className="w-5 h-5 text-orange-600" />
                                    <h4 className="font-semibold text-gray-900 font-inter">Nombre de comptes à ajouter</h4>
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
                                            {additionalEmails + 1}
                                        </span>
                                        <span className="text-xs text-gray-600 font-inter">
                                            {additionalEmails + 1} compte{(additionalEmails + 1) > 1 ? 's' : ''} additionnel{(additionalEmails + 1) > 1 ? 's' : ''} seront ajoutés
                                        </span>
                                    </div>

                                    <button
                                        onClick={incrementEmails}
                                        className="w-10 h-10 rounded-lg bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center"
                                    >
                                        <Plus className="w-5 h-5 text-gray-700" />
                                    </button>
                                </div>

                                <p className="text-xs text-center text-gray-600 font-inter">
                                    {additionalPrice}€ HT / compte additionnel / mois
                                </p>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 font-inter">
                                            Montant total
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1 font-inter">Facturé mensuellement</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-orange-600">{totalPrice}€</p>
                                        <p className="text-xs text-gray-600 font-inter">HT / mois</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer avec boutons */}
                    <div className="px-6 pb-5 pt-4 border-t border-gray-100 bg-white">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold font-inter text-sm"
                            >
                                Passer
                            </button>
                            
                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={loading}
                                className="flex-1 max-w-[200px] mx-auto flex items-center justify-center gap-2 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-2.5 font-semibold text-white rounded-lg shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-inter text-sm"
                            >
                                {loading ? 'Redirection...' : 'Continuer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
