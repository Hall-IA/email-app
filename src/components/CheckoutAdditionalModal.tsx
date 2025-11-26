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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-stripe-prices`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            additional_accounts: additionalAccounts + 1,
            success_url: `${window.location.origin}/settings?upgraded=success`,
            cancel_url: `${window.location.origin}/settings?upgraded=cancelled`,
          }),
        },
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="font-inter relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Bouton fermer en haut à droite */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="p-6">
            <div className="mb-6 flex items-center justify-between"></div>

            <div className="relative overflow-hidden px-6 pb-0">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A]">
                <Mail className="h-8 w-8 text-white" />
              </div>

              <div className="relative z-10 py-5">
                <h2 className="font-thunder mb-2 text-center text-4xl font-bold text-black">
                  Compte additionnel
                </h2>
                <p className="mt-1 text-center text-sm text-gray-600">
                  Ajoutez des comptes email que vous pouvez configurerez plus tard
                </p>
              </div>
            </div>

            {/* <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex gap-3">
                            <CreditCard className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-orange-900 mb-2">
                                    Paiement automatique via Stripe
                                </p>
                                <p className="text-xs text-orange-800 leading-relaxed">
                                    Chaque compte additionnel coûte <strong>{additionalPrice}€ HT</strong> par mois. Le nombre minimum est de 1.
                                </p>
                            </div>
                        </div> */}

            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600" />
                <h4 className="font-inter font-semibold text-gray-900">
                  Nombre de comptes à ajouter
                </h4>
              </div>

              <div className="mb-3 flex items-center justify-between gap-4">
                <button
                  onClick={decrementAccounts}
                  disabled={additionalAccounts === 0 || loading}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 bg-white transition-all hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus className="h-5 w-5 text-gray-700" />
                </button>

                <div className="flex flex-1 flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">{nbAccounts}</span>
                  <span className="font-inter text-xs text-gray-600">
                    {nbAccounts} compte{nbAccounts > 1 ? 's' : ''} additionnel
                    {nbAccounts > 1 ? 's' : ''} seront ajoutés
                  </span>
                </div>

                <button
                  onClick={incrementAccounts}
                  disabled={loading}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-300 bg-white transition-all hover:border-orange-400 hover:bg-orange-50"
                >
                  <Plus className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <p className="font-inter text-center text-xs text-gray-600">
                {additionalPrice}€ HT / compte additionnel / mois
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-inter text-sm font-medium text-gray-700">Montant total</p>
                  <p className="font-inter mt-1 text-xs text-gray-600">Facturé mensuellement</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{totalPrice}€ HT</p>
                  <p className="font-inter text-xs text-gray-600">/ mois</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Redirection vers Stripe…' : 'Confirmer et payer'}
              {!loading && (
                <svg
                  className="h-5 w-5"
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
    </>
  );
}
