'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Plus, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface AddEmailCountProps {
    onComplete?: () => void;
    onClose?: () => void;
}

export default function AddEmailCount({ onComplete, onClose }: AddEmailCountProps) {
    const { user } = useAuth();
    const [additionalEmails, setAdditionalEmails] = useState(0);
    const [basePrice, setBasePrice] = useState(49);
    const [additionalPrice, setAdditionalPrice] = useState(39);
    const [timeRemaining, setTimeRemaining] = useState(5); // 5 secondes
    const [isPaused, setIsPaused] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Charger le compteur depuis localStorage au montage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('business_pass_email_counter');
            if (saved) {
                const count = parseInt(saved, 10) || 0;
                setAdditionalEmails(count);
            }
        }
    }, []);

    // Gérer le compte à rebours de 5 secondes
    useEffect(() => {
        if (!isVisible || isPaused) return;

        setTimeRemaining(5);

        intervalRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    // Fermer la modal après 5 secondes
                    setIsVisible(false);
                    if (onClose) {
                        onClose();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isVisible, isPaused]);

    // Calculer le total
    const calculateTotal = () => {
        return basePrice + (additionalEmails * additionalPrice);
    };

    // Incrémenter les emails
    const incrementEmails = () => {
        const newValue = additionalEmails + 1;
        setAdditionalEmails(newValue);
        if (typeof window !== 'undefined') {
            localStorage.setItem('business_pass_email_counter', newValue.toString());
        }
    };

    // Décrémenter les emails
    const decrementEmails = () => {
        if (additionalEmails > 0) {
            const newValue = additionalEmails - 1;
            setAdditionalEmails(newValue);
            if (typeof window !== 'undefined') {
                localStorage.setItem('business_pass_email_counter', newValue.toString());
            }
        }
    };

    // Gérer le clic sur la modal (pause le compte à rebours)
    const handleModalClick = () => {
        setIsPaused(true);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // Fermer manuellement
    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            onClose();
        }
    };

    // Continuer vers le checkout
    const handleContinue = () => {
        setIsVisible(false);
        if (onComplete) {
            onComplete();
        }
    };

    if (!isVisible) return null;

    const totalPrice = calculateTotal();
    const progressPercentage = ((5 - timeRemaining) / 5) * 100;

    return (
        <>
            {/* Overlay - non cliquable */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré - style similaire à CompanyInfoModal */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div 
                    className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
                    onClick={handleModalClick}
                >
                    
                    {/* Header avec gradient conique */}
                    <div 
                        className="relative px-6 pt-7 pb-0 overflow-hidden"
                        style={{
                            background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15384697914124deg, #CE7D2A 197.30769395828247deg, #FFAD5A 245.76922416687012deg), #F9F7F5`,
                        }}
                    >
                        {/* Pattern de plus signs */}
                        <div 
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px),
                                                  repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px)`,
                            }}
                        />
                        <div className="relative z-10 py-5">
                            <h2 className='text-4xl font-bold font-thunder text-white mb-2'>Emails additionnels</h2>
                            <p className="text-white/90 text-sm font-inter">
                                Ajoutez des emails que vous configurerez plus tard
                            </p>
                        </div>
                        {/* Barre de progression en bas du header orange */}
                        <div className="relative z-10 px-0 pb-3">
                            <div className="w-full bg-orange-500/30 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-white h-full rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
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
                                    <h4 className="font-semibold text-gray-900 font-inter">Emails additionnels</h4>
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
                                        <span className="text-xs text-gray-600 font-inter">
                                            {additionalEmails === 0 ? '1 email inclus' : `${additionalEmails + 1} emails au total`}
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
                                    +{additionalPrice}€ HT/mois par email additionnel
                                </p>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 font-inter">
                                            Total de votre abonnement
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1 font-inter">Facturé mensuellement</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-orange-600">{totalPrice}€</p>
                                        <p className="text-xs text-gray-600 font-inter">HT/mois</p>
                                    </div>
                                </div>
                            </div>

                            {!isPaused && (
                                <div className="mt-4 text-center">
                                    <p className="text-xs text-gray-500 font-inter">
                                        La modal se fermera automatiquement dans {timeRemaining} seconde{timeRemaining > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 font-inter mt-1">
                                        Cliquez sur la modal pour la garder ouverte
                                    </p>
                                </div>
                            )}
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
                                className="flex-1 max-w-[200px] mx-auto flex items-center justify-center gap-2 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-2.5 font-semibold text-white rounded-lg shadow-lg transition-all duration-300 ease-out hover:shadow-xl font-inter text-sm"
                            >
                                Continuer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
