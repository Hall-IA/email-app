'use client';

import React, { useState, useEffect } from 'react';
import CustomButton from './CustomButton';
import { Plus, Minus } from 'lucide-react';

interface CardPackProps {
    title: string;
    subtitle?: string;
    features: string[];
    price: string;
    priceUnit: string;
    buttonText: string;
    buttonGradient?: string;
    topGradient?: string;
    onButtonClick?: () => void;
    buttonHref?: string;
    // Nouvelles props pour le compteur
    enableCounter?: boolean;
    basePrice?: number; // Prix de base (premier email)
    additionalPrice?: number; // Prix par email additionnel
    localStorageKey?: string; // Clé pour le localStorage
}

export default function CardPack({
    title,
    subtitle,
    features,
    price,
    priceUnit,
    buttonText,
    buttonGradient = `conic-gradient(
    from 195.77deg at 84.44% -1.66%,
    #FE9736 0deg,
    #F4664C 76.15deg,
    #F97E41 197.31deg,
    #E3AB8D 245.77deg,
    #FE9736 360deg
  )`,
    topGradient = `radial-gradient(
    ellipse 90% 90% at 50% 0%,
    #FE9736 0%,
    #F97E41 50%,
    #F4664C 50%,
    transparent 80%
  )`,
    onButtonClick,
    buttonHref,
    enableCounter = false,
    basePrice = 29,
    additionalPrice = 19,
    localStorageKey = 'email_counter',
}: CardPackProps) {
    // État pour le compteur d'emails additionnels
    const [additionalEmails, setAdditionalEmails] = useState(0);
    const [mounted, setMounted] = useState(false);

    // Charger depuis localStorage au montage
    useEffect(() => {
        setMounted(true);
        if (enableCounter && typeof window !== 'undefined') {
            const saved = localStorage.getItem(localStorageKey);
            if (saved) {
                setAdditionalEmails(parseInt(saved, 10));
            }
        }
    }, [enableCounter, localStorageKey]);

    // Sauvegarder dans localStorage quand le compteur change
    useEffect(() => {
        if (mounted && enableCounter && typeof window !== 'undefined') {
            localStorage.setItem(localStorageKey, additionalEmails.toString());
        }
    }, [additionalEmails, enableCounter, localStorageKey, mounted]);

    // Calculer le prix total
    const calculateTotalPrice = () => {
        if (!enableCounter) return price;
        const total = basePrice + (additionalEmails * additionalPrice);
        return total.toString();
    };

    // Incrémenter le compteur
    const incrementCounter = () => {
        setAdditionalEmails(prev => prev + 1);
    };

    // Décrémenter le compteur (minimum 0)
    const decrementCounter = () => {
        setAdditionalEmails(prev => Math.max(0, prev - 1));
    };
    return (
        <div className="relative w-full lg:w-96 font-roboto flex flex-col justify-between rounded-2xl bg-white overflow-hidden">
            {/* Gradient blur en haut */}
            <div
                className="absolute -top-8 left-0 right-0 z-10 h-[200px] w-full blur-xl rounded-t-2xl pointer-events-none"
                style={{
                    background: topGradient,
                }}
            />

            {/* Section titre et features */}
            <div className="relative z-20 space-y-5 px-10 pt-30 pb-0">
                <h3 className="font-thunder text-black mb-5 text-5xl font-semibold">
                    {title}
                </h3>

                {subtitle && (
                    <p className="text-gray-400">{subtitle}</p>
                )}

                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex gap-2">
                            <img src="/img/check.png" alt="" className="w-5 h-5" />
                            {feature}
                        </li>
                    ))}
                </ul>
            

            {enableCounter && (
                <section>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Emails additionnels
                        </p>
                    <div className="bg-gray-50 rounded-xl space-y-3">
                        <div className="flex items-stretch justify-between gap-4 ">
                            <button
                                onClick={decrementCounter}
                                disabled={additionalEmails === 0}
                                className="flex items-center justify-center w-12 rounded-lg bg-black hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black transition-all"
                                aria-label="Diminuer"
                            >
                                <Minus className="w-5 h-5 text-white" />
                            </button>
                            
                            <div className="flex flex-col items-center justify-center flex-1">
                                <span className="text-2xl font-bold text-gray-900">
                                    {additionalEmails}
                                </span>
                                <span className="text-xs  mb-2 $text-gray-500">
                                    {additionalEmails === 0 ? '1 email inclus' : `${additionalEmails + 1} emails au total`}
                                </span>
                            </div>
                            
                            <button
                                onClick={incrementCounter}
                                className="flex items-center justify-center w-12 rounded-r-lg bg-black hover:bg-gray-800 transition-all"
                                aria-label="Augmenter"
                            >
                                <Plus className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        </div>
                        <p className="text-xs text-center text-gray-500">
                            +{additionalPrice}€ par email additionnel
                        </p>
                    
                    </section>
                )}

</div>
            {/* Ligne de séparation */}
            <div
                className="relative z-20 my-10"
                style={{
                    height: '1px',
                    backgroundImage:
                        'linear-gradient(to right, #d1d5db 0%, #d1d5db 50%, transparent 50%, transparent 100%)',
                    backgroundSize: '20px 1px',
                    backgroundRepeat: 'repeat-x',
                }}
            />

            {/* Section prix et bouton */}
            <div className="relative z-20 space-y-5 px-10 pb-10">
           

                {/* Prix */}
                <div className="space-y-2">
                    <p className="text-4xl font-black font-thunder">
                        {calculateTotalPrice()}€ <span className="text-lg font-normal">{priceUnit}</span>
                    </p>
                    
                    {/* Détail du prix si compteur activé */}
                    {enableCounter && additionalEmails > 0 && (
                        <p className="text-sm text-gray-500">
                            {basePrice}€ (base) + {additionalEmails} × {additionalPrice}€
                        </p>
                    )}
                </div>

                {/* Compteur d'emails additionnels */}
                
                <CustomButton
                    style={{
                        background: buttonGradient,
                    }}
                    className="w-full rounded-full!"
                    onClick={onButtonClick}
                    href={buttonHref}
                >
                    {buttonText}
                </CustomButton>
            </div>
        </div>
    );
}