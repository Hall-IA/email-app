'use client';

import React, { useState, useEffect } from 'react';
import CustomButton from './CustomButton';
import { Plus, Minus, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  hidePrice?: boolean; // Masquer le prix et le hr dotted
  clearText?: string; // Texte claire
  id?: number; // Index pour placer le texte claire
  classNameButton?: string;
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
  hidePrice = false,
  clearText,
  id,
  classNameButton,
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
    const total = basePrice + additionalEmails * additionalPrice;
    return total.toString();
  };

  // Incrémenter le compteur
  const incrementCounter = () => {
    setAdditionalEmails((prev) => prev + 1);
  };

  // Décrémenter le compteur (minimum 0)
  const decrementCounter = () => {
    setAdditionalEmails((prev) => Math.max(0, prev - 1));
  };
  return (
    <div className="font-roboto relative flex w-full flex-col justify-between overflow-hidden rounded-2xl bg-white lg:w-96">
      {/* Gradient blur en haut */}
      <div
        className="pointer-events-none absolute -top-8 right-0 left-0 z-10 h-[200px] w-full rounded-t-2xl blur-xl"
        style={{
          background: topGradient,
        }}
      />

      {/* Section titre et features */}
      <div className="relative z-20 space-y-5 px-10 pt-30 pb-0">
        <h3 className="font-thunder mb-5 text-5xl font-semibold text-black">{title}</h3>

        {subtitle && <p>{subtitle}</p>}

        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex gap-2">
              <BadgeCheck className="shrink-0" />
              <span>
                {feature}
                {index === id && <p className="mt-1 text-gray-400 text-xs">{clearText}</p>}
              </span>
            </li>
          ))}
        </ul>

        {enableCounter && (
          <section className="space-y-2">
            <p className="mb-2 text-sm font-semibold text-gray-700">Emails additionnels</p>
            <div className="space-y-3 rounded-xl bg-gray-50">
              <div className="flex items-stretch justify-between gap-4">
                <button
                  onClick={decrementCounter}
                  disabled={additionalEmails === 0}
                  className="flex w-12 items-center justify-center rounded-lg bg-black transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-black"
                  aria-label="Diminuer"
                >
                  <Minus className="h-5 w-5 text-white" />
                </button>

                <div className="flex flex-1 flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{additionalEmails}</span>
                  <span className="$text-gray-500 mb-2 text-xs">
                    {additionalEmails === 0
                      ? '1 email inclus'
                      : `${additionalEmails + 1} emails au total`}
                  </span>
                </div>

                <button
                  onClick={incrementCounter}
                  className="flex w-12 items-center justify-center rounded-r-lg bg-black transition-all hover:bg-gray-800"
                  aria-label="Augmenter"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500">
              +{additionalPrice}€ par email additionnel
            </p>
          </section>
        )}
      </div>

      {/* Ligne de séparation */}
      {!hidePrice && (
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
      )}

      {/* Section prix et bouton */}
      <div className="relative z-20 space-y-5 px-10 pb-10">
        {/* Prix */}
        {!hidePrice && (
          <div className="space-y-2">
            <p className="font-thunder text-4xl font-black">
              {calculateTotalPrice()}€ <span className="text-lg font-normal">{priceUnit}</span>
            </p>

            {/* Détail du prix si compteur activé */}
            {enableCounter && additionalEmails > 0 && (
              <p className="text-sm text-gray-500">
                {basePrice}€ (base) + {additionalEmails * additionalPrice}€ ({additionalEmails}{' '}
                email
                {additionalEmails > 1 ? 's' : ''} additionnel{additionalEmails > 1 ? 's' : ''})
              </p>
            )}
          </div>
        )}

        {/* Compteur d'emails additionnels */}
        <CustomButton
          style={{
            background: buttonGradient,
          }}
          className={cn('w-full rounded-full!', classNameButton)}
          onClick={onButtonClick}
          href={buttonHref}
          target={buttonHref && buttonHref.startsWith('http') ? '_blank' : undefined}
        >
          {buttonText}
        </CustomButton>
      </div>
    </div>
  );
}
