'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Check,
  Star,
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  RefreshCw,
  Mail,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SetupEmailModal } from './SetupEmailModal';
import { CheckoutModal } from './CheckoutModal';
import { CheckoutAdditionalModal } from './CheckoutAdditionalModal';

interface SubscriptionData {
  id: string;
  subscription_id: string;
  subscription_type: string;
  status: string;
  price_id: string | null;
  current_period_end: number | null;
  current_period_start: number | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  cancel_at_period_end: boolean;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  is_primary?: boolean;
  is_active?: boolean;
  subscription_id?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
  company_name?: string;
  isSlot?: boolean; // Slot payé mais non configuré
}

interface Invoice {
  id: number;
  invoice_id: string;
  invoice_number: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  paid_at: number | null;
  invoice_pdf: string | null;
}

export function Subscription() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastComponent } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCanceledMessage, setShowCanceledMessage] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [emailAccountsCount, setEmailAccountsCount] = useState(0);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{
    id: string;
    email: string;
    isPrimary: boolean;
  } | null>(null);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [subscriptionToReactivate, setSubscriptionToReactivate] = useState<{
    subscriptionId: string;
    email: string;
    isPrimary: boolean;
  } | null>(null);
  const [showReactivatedMessage, setShowReactivatedMessage] = useState(false);
  const [basePlanPrice, setBasePlanPrice] = useState(49);
  const [userPrice, setUserPrice] = useState(39);
  const [isSyncing, setIsSyncing] = useState(false);
  const [paidAdditionalAccounts, setPaidAdditionalAccounts] = useState(0);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showSetupEmailModal, setShowSetupEmailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCheckoutAdditionalModal, setShowCheckoutAdditionalModal] = useState(false);

  const premierSubscription = subscriptions.find((sub) => sub.subscription_type === 'premier');
  const additionalAccountSubscriptions = subscriptions.filter(
    (sub) => sub.subscription_type === 'additional_account',
  );
  const subscription = premierSubscription;

  // Calculer la quantité réelle d'emails additionnels (sera mis à jour dans fetchPaidAdditionalAccounts)
  const [totalAdditionalQuantity, setTotalAdditionalQuantity] = useState(0);
  const additionalAccounts = totalAdditionalQuantity || paidAdditionalAccounts; // Priorité à la quantité réelle
  const totalPrice = premierSubscription ? basePlanPrice + additionalAccounts * userPrice : 0;

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      await Promise.all([
        fetchSubscription(),
        fetchEmailAccountsCount(),
        fetchInvoices(),
        fetchStripePrices(),
        fetchPaidAdditionalAccounts(),
      ]);
      setIsInitialLoading(false);
    };

    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setShowSuccessMessage(true);
      router.replace('/user-settings?tab=subscription');

      const pollInterval = setInterval(() => {
        fetchSubscription();
        fetchEmailAccountsCount();
        fetchPaidAdditionalAccounts();
      }, 2000);

      setTimeout(() => {
        setShowSuccessMessage(false);
        clearInterval(pollInterval);
      }, 15000);

      loadInitialData();
      return () => clearInterval(pollInterval);
    }
    if (canceled === 'true') {
      setShowCanceledMessage(true);
      router.replace('/user-settings?tab=subscription');
      setTimeout(() => setShowCanceledMessage(false), 5000);
    }
    loadInitialData();
  }, [searchParams]);

  const fetchSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subData } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (subData) {
        setSubscriptions(subData);
      }
    } catch (error) {}
  };

  const fetchEmailAccountsCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let accounts: EmailAccount[] = [];

      const { data: allConfigs } = await supabase
        .from('email_configurations')
        .select('id, email, provider, is_primary, is_active, company_name')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (allConfigs) {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Récupérer les subscriptions actives ET supprimées pour vérifier le statut de résiliation
        const { data: allSubs, error: subsError } = await supabase
          .from('stripe_user_subscriptions')
          .select(
            'subscription_id, status, cancel_at_period_end, subscription_type, email_configuration_id, deleted_at',
          )
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (subsError) {
          // Si la table n'existe pas ou si les colonnes sont manquantes
          if (
            subsError.code === '42P01' ||
            subsError.code === '42703' ||
            subsError.message?.includes('does not exist') ||
            subsError.message?.includes('column')
          ) {
            // Continuer avec un tableau vide
          } else {
            return;
          }
        }

        // Récupérer uniquement les subscriptions actives pour l'association
        const activeSubs = allSubs?.filter((s) => !s.deleted_at) || [];

        accounts = allConfigs.map((c) => {
          let subscriptionInfo = {};
          let isDeleted = false; // Flag pour savoir si ce compte spécifique est résilié

          // Pour le compte principal, chercher la subscription "premier"
          if (c.is_primary) {
            const premierSub = activeSubs.find(
              (s) => s.subscription_type === 'premier' && ['active', 'trialing'].includes(s.status),
            );

            if (premierSub) {
              subscriptionInfo = {
                subscription_id: premierSub.subscription_id,
                subscription_status: premierSub.status,
                cancel_at_period_end: premierSub.cancel_at_period_end,
              };
            } else {
              // Vérifier si le compte principal a une subscription supprimée
              const deletedPremierSub = allSubs?.find(
                (s) => s.subscription_type === 'premier' && s.deleted_at !== null,
              );
              if (deletedPremierSub) {
                isDeleted = true;
                subscriptionInfo = {
                  subscription_id: deletedPremierSub.subscription_id,
                  subscription_status: deletedPremierSub.status,
                  cancel_at_period_end: deletedPremierSub.cancel_at_period_end || true,
                };
              }
            }
          } else {
            // Pour les comptes additionnels, chercher d'abord la subscription liée à l'email_configuration_id
            const configSubs = activeSubs.filter((s) => s.email_configuration_id === c.id) || [];

            let activeSub = configSubs.find((s) => ['active', 'trialing'].includes(s.status));

            // Si aucune subscription active n'est liée à ce compte, vérifier si une subscription supprimée existe
            if (!activeSub) {
              const deletedConfigSub = allSubs?.find(
                (s) => s.email_configuration_id === c.id && s.deleted_at !== null,
              );

              if (deletedConfigSub) {
                // Ce compte a été résilié (subscription supprimée)
                isDeleted = true;
                subscriptionInfo = {
                  subscription_id: deletedConfigSub.subscription_id,
                  subscription_status: deletedConfigSub.status,
                  cancel_at_period_end: true, // Considéré comme résilié
                };
              } else {
                // Chercher une subscription additionnelle non liée disponible
                const unlinkedAdditionalSubs =
                  activeSubs.filter(
                    (s) =>
                      s.subscription_type === 'additional_account' &&
                      s.email_configuration_id === null &&
                      ['active', 'trialing'].includes(s.status),
                  ) || [];

                // Prendre la première subscription additionnelle non liée disponible
                activeSub = unlinkedAdditionalSubs[0];

                if (activeSub) {
                  subscriptionInfo = {
                    subscription_id: activeSub.subscription_id,
                    subscription_status: activeSub.status,
                    cancel_at_period_end: activeSub.cancel_at_period_end,
                  };
                }
              }
            } else {
              if (activeSub) {
                subscriptionInfo = {
                  subscription_id: activeSub.subscription_id,
                  subscription_status: activeSub.status,
                  cancel_at_period_end: activeSub.cancel_at_period_end,
                };
              }
            }
          }

          return {
            id: c.id,
            email: c.email,
            provider: c.provider,
            is_primary: c.is_primary,
            is_active: c.is_active !== false,
            company_name: c.company_name,
            ...subscriptionInfo,
          };
        });
      }

      // Récupérer le nombre total de slots payés

      console.log('[Subscription.tsx] ===== DÉBUT CALCUL EMAILS NON CONFIGURÉS =====');
      
      const { data: allSubs } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_type, status, subscription_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .is('deleted_at', null);

      console.log('[Subscription.tsx] Toutes les subscriptions récupérées:', {
        total: allSubs?.length || 0,
        subscriptions: allSubs?.map(s => ({
          subscription_id: s.subscription_id,
          type: s.subscription_type,
          status: s.status,
          isSlot: s.subscription_id?.includes('_slot_')
        }))
      });

      let totalPaidSlots = 0;
      if (allSubs && allSubs.length > 0) {
        const premierCount = allSubs.filter((s) => s.subscription_type === 'premier').length;
        console.log('[Subscription.tsx] Nombre de subscriptions premier:', premierCount);

        // Récupérer la quantité réelle depuis Stripe pour chaque subscription additionnelle
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // Récupérer les quantités réelles depuis Stripe
          let totalAdditionalQuantity = 0;
          const additionalSubs = allSubs.filter(
            (s) => s.subscription_type === 'additional_account',
          );

          console.log('[Subscription.tsx] Subscriptions additionnelles trouvées:', {
            count: additionalSubs.length,
            subscriptions: additionalSubs.map(s => ({
              subscription_id: s.subscription_id,
              isSlot: s.subscription_id?.includes('_slot_')
            }))
          });

          for (const sub of additionalSubs) {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/get-subscription-quantity`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    subscription_id: sub.subscription_id,
                  }),
                },
              );

              if (response.ok) {
                const data = await response.json();
                const quantity = data.quantity || 1; // Par défaut 1 si pas de quantité
                console.log(`[Subscription.tsx] Quantité pour ${sub.subscription_id}:`, quantity);
                totalAdditionalQuantity += quantity;
              } else {
                console.warn(`[Subscription.tsx] Erreur pour ${sub.subscription_id}, fallback à 1`);
                totalAdditionalQuantity += 1; // Fallback : 1 par défaut
              }
            } catch (error) {
              console.error(`[Subscription.tsx] Exception pour ${sub.subscription_id}:`, error);
              totalAdditionalQuantity += 1; // Fallback : 1 par défaut
            }
          }

          console.log('[Subscription.tsx] Total quantité additionnelle:', totalAdditionalQuantity);
          totalPaidSlots = premierCount > 0 ? 1 + totalAdditionalQuantity : 0;
        } else {
          // Fallback si pas de session : compter les lignes (ancienne méthode)
          const additionalCount = allSubs.filter(
            (s) => s.subscription_type === 'additional_account',
          ).length;
          console.log('[Subscription.tsx] Pas de session, fallback - comptage des lignes:', additionalCount);
          totalPaidSlots = premierCount > 0 ? 1 + additionalCount : 0;
        }
      } else {
        console.log('[Subscription.tsx] Aucune subscription trouvée');
      }

      // Ajouter des slots vides pour les emails payés mais non configurés
      const configuredCount = accounts.length;
      const slotsToAdd = totalPaidSlots - configuredCount;
      
      console.log('[Subscription.tsx] Résultat final:', {
        totalPaidSlots,
        configuredCount,
        slotsToAdd,
        accountsCount: accounts.length
      });
      
      console.log('[Subscription.tsx] ===== FIN CALCUL EMAILS NON CONFIGURÉS =====');

      if (slotsToAdd > 0) {
        console.log(`[Subscription.tsx] Ajout de ${slotsToAdd} slot(s) artificiel(s) à la liste des comptes`);
        for (let i = 0; i < slotsToAdd; i++) {
          accounts.push({
            id: `slot-${i}`,
            email: `Email #${configuredCount + i + 1}`,
            provider: 'slot',
            is_primary: false,
            is_active: true,
            isSlot: true,
          });
        }
        console.log(`[Subscription.tsx] Après ajout des slots, nombre total de comptes: ${accounts.length}`);
        console.log(`[Subscription.tsx] Nombre de slots (isSlot=true): ${accounts.filter(a => a.isSlot).length}`);
      } else {
        console.log(`[Subscription.tsx] Aucun slot à ajouter (slotsToAdd=${slotsToAdd})`);
      }

      setEmailAccounts(accounts);
      setEmailAccountsCount(totalPaidSlots); // Utiliser le total payé au lieu des actifs
    } catch (error) {}
  };

  const fetchStripePrices = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/get-stripe-prices`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.basePlan?.amount) {
          setBasePlanPrice(data.basePlan.amount);
        }
        if (data.additionalAccount?.amount) {
          setUserPrice(data.additionalAccount.amount);
        }
      }
    } catch (error) {}
  };

  const fetchPaidAdditionalAccounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer toutes les subscriptions additionnelles avec leurs quantités réelles
      const { data: allSubs } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_type, status, subscription_id')
        .eq('user_id', user.id)
        .eq('subscription_type', 'additional_account')
        .in('status', ['active', 'trialing'])
        .is('deleted_at', null);

      if (!allSubs || allSubs.length === 0) {
        setTotalAdditionalQuantity(0);
        setPaidAdditionalAccounts(0);
        return;
      }

      // Récupérer la quantité réelle depuis Stripe pour chaque subscription additionnelle
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setTotalAdditionalQuantity(allSubs.length); // Fallback : nombre de lignes
        setPaidAdditionalAccounts(allSubs.length);
        return;
      }

      let totalQuantity = 0;

      for (const sub of allSubs) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/get-subscription-quantity`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription_id: sub.subscription_id,
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            const quantity = data.quantity || 1;
            totalQuantity += quantity;
          } else {
            totalQuantity += 1; // Fallback
          }
        } catch (error) {
          totalQuantity += 1; // Fallback
        }
      }

      setTotalAdditionalQuantity(totalQuantity);
      setPaidAdditionalAccounts(totalQuantity);
    } catch (error) {}
  };

  const fetchInvoices = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('stripe_invoices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(10);

      if (error) {
        return;
      }

      setInvoices(data || []);

      if ((!data || data.length === 0) && subscription?.status === 'active') {
        await syncInvoicesFromStripe();
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const syncInvoicesFromStripe = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-sync-invoices`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('stripe_invoices')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(10);

        setInvoices(data || []);
      }
    } catch (error) {}
  };

  const handleDeleteEmailAccount = async () => {
    if (!accountToDelete) return;

    setDeletingAccount(accountToDelete.id);

    try {
      if (accountToDelete.isPrimary) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          showToast('Vous devez être connecté', 'error');
          return;
        }

        // Récupérer le subscription_id de la subscription "premier"
        const { data: premierSub } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_id')
          .eq('user_id', user.id)
          .eq('subscription_type', 'premier')
          .in('status', ['active', 'trialing'])
          .is('deleted_at', null)
          .maybeSingle();

        if (!premierSub?.subscription_id) {
          showToast('Aucun abonnement de base trouvé', 'error');
          setDeletingAccount(null);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          showToast('Vous devez être connecté', 'error');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-cancel-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription_id: premierSub.subscription_id,
              subscription_type: 'premier',
            }),
          },
        );

        const data = await response.json();

        if (data.error) {
          showToast(`Erreur: ${data.error}`, 'error');
          return;
        }

        setShowDeleteModal(false);
        setAccountToDelete(null);
        await fetchEmailAccountsCount();
        await fetchSubscription();
        setShowCanceledMessage(true);
        setTimeout(() => setShowCanceledMessage(false), 5000);

        const pollInterval = setInterval(async () => {
          await fetchSubscription();
          await fetchEmailAccountsCount();
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
        }, 10000);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          showToast('Vous devez être connecté', 'error');
          return;
        }

        // Chercher d'abord une subscription liée à ce compte
        const { data: linkedSubscription } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_id, status')
          .eq('user_id', user.id)
          .eq('email_configuration_id', accountToDelete.id)
          .eq('subscription_type', 'additional_account')
          .is('deleted_at', null)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .maybeSingle();

        let subscriptionData = linkedSubscription;

        // Si aucune subscription liée n'est trouvée, chercher une subscription additionnelle non liée
        if (!subscriptionData?.subscription_id) {
          const { data: unlinkedSub } = await supabase
            .from('stripe_user_subscriptions')
            .select('subscription_id, status')
            .eq('user_id', user.id)
            .eq('subscription_type', 'additional_account')
            .is('email_configuration_id', null)
            .is('deleted_at', null)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (unlinkedSub?.subscription_id) {
            subscriptionData = unlinkedSub;
          }
        }

        if (!subscriptionData?.subscription_id) {
          showToast('Aucun abonnement actif trouvé pour ce compte additionnel.', 'error');
          setShowDeleteModal(false);
          setAccountToDelete(null);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          showToast('Vous devez être connecté', 'error');
          return;
        }

        // TypeScript: subscriptionData est garanti non-null ici grâce à la vérification ci-dessus
        const finalSubscriptionId = subscriptionData.subscription_id;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-cancel-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription_id: finalSubscriptionId,
              subscription_type: 'additional_account',
              email_configuration_id: accountToDelete.id,
            }),
          },
        );

        const data = await response.json();

        if (data.error) {
          showToast(`Erreur: ${data.error}`, 'error');
          return;
        }

        setShowDeleteModal(false);
        setAccountToDelete(null);
        await fetchEmailAccountsCount();
        await fetchSubscription();
        setShowCanceledMessage(true);
        setTimeout(() => setShowCanceledMessage(false), 5000);

        const pollInterval = setInterval(async () => {
          await fetchSubscription();
          await fetchEmailAccountsCount();
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
        }, 10000);
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showToast(
        `Erreur lors de la suppression du compte: ${error.message || 'Erreur inconnue'}`,
        'error',
      );
    } finally {
      setDeletingAccount(null);
    }
  };

  const openDeleteModal = (accountId: string, email: string, isPrimary: boolean) => {
    setAccountToDelete({ id: accountId, email, isPrimary });
    setShowDeleteModal(true);
  };

  const handleCancelSlot = async (slotIndex: number, isFirstSlot: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      let subscriptionId: string | null = null;

      if (isFirstSlot) {
        // Pour le premier slot, c'est le plan de base (premier)
        const { data: premierSub } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_id')
          .eq('user_id', user.id)
          .eq('subscription_type', 'premier')
          .in('status', ['active', 'trialing'])
          .is('deleted_at', null)
          .maybeSingle();

        if (!premierSub?.subscription_id) {
          showToast('Aucun abonnement de base trouvé', 'error');
          return;
        }

        subscriptionId = premierSub.subscription_id;
      } else {
        // Pour les autres slots, ce sont des additional_account
        const { data: allSubs } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_id, email_configuration_id')
          .eq('user_id', user.id)
          .eq('subscription_type', 'additional_account')
          .in('status', ['active', 'trialing'])
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (!allSubs || allSubs.length === 0) {
          showToast('Aucun abonnement additionnel trouvé', 'error');
          return;
        }

        // Trouver les subscriptions qui ne sont pas liées à un email configuré
        const unlinkedSubs = allSubs.filter((sub) => !sub.email_configuration_id);

        // Pour les slots additionnels, on commence à l'index 0 (le premier slot additionnel)
        const adjustedIndex = slotIndex - 1; // -1 car le premier slot (index 0) est le plan de base

        if (
          unlinkedSubs.length === 0 ||
          adjustedIndex < 0 ||
          adjustedIndex >= unlinkedSubs.length
        ) {
          showToast('Aucun slot disponible à résilier', 'error');
          return;
        }

        const slotToCancel = unlinkedSubs[adjustedIndex];

        if (!slotToCancel.subscription_id) {
          showToast('Aucun abonnement trouvé pour ce slot', 'error');
          return;
        }

        subscriptionId = slotToCancel.subscription_id;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      setDeletingAccount(`slot-${slotIndex}`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-cancel-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscriptionId,
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        showToast(`Erreur: ${data.error}`, 'error');
        setDeletingAccount(null);
        return;
      }

      showToast('Abonnement résilié avec succès', 'success');
      await fetchEmailAccountsCount();
      await fetchSubscription();
      setDeletingAccount(null);
    } catch (error: any) {
      console.error('Error canceling slot:', error);
      showToast(`Erreur lors de la résiliation: ${error.message || 'Erreur inconnue'}`, 'error');
      setDeletingAccount(null);
    }
  };

  const connectGmail = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/gmail-oauth-init`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();

      if (data.error) {
        showToast(`Erreur: ${data.error}`, 'error');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      showToast('Erreur lors de la connexion Gmail', 'error');
    }
  };

  const handleProviderSelect = async (provider: 'gmail' | 'outlook' | 'imap') => {
    if (provider === 'gmail') {
      await connectGmail();
    } else if (provider === 'outlook') {
      if (!user?.id) {
        showToast('Vous devez être connecté', 'error');
        return;
      }
      window.location.href = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/outlook-oauth-init?user_id=${user.id}`;
    } else {
      setShowAddAccountModal(false);
      setShowSetupEmailModal(true);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-force-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (data.error) {
        alert(`Erreur: ${data.error}`);
        return;
      }

      await fetchEmailAccountsCount();
      await fetchSubscription();
      showToast('Synchronisation réussie !', 'success');
    } catch (error: any) {
      console.error('Error syncing:', error);
      showToast('Erreur lors de la synchronisation', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReactivateEmailAccount = async (accountId: string) => {
    setDeletingAccount(accountId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .update({ is_active: true })
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Reactivation error:', error);
        showToast(`Erreur lors de la réactivation: ${error.message}`, 'error');
        return;
      }

      if (!data || data.length === 0) {
        console.error('No rows updated - account not found or not owned by user');
        showToast('Erreur: Impossible de réactiver ce compte', 'error');
        return;
      }

      const { data: allAccounts } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const newAdditionalAccountsCount = Math.max(0, (allAccounts?.length || 0) - 1);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-update-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              additional_accounts: newAdditionalAccountsCount,
            }),
          },
        );

        const responseData = await response.json();
        if (responseData.error) {
          console.error('Stripe update error:', responseData.error);
        }
      }

      await fetchEmailAccountsCount();
      await fetchSubscription();
    } catch (error: any) {
      console.error('Error reactivating account:', error);
      showToast(
        `Erreur lors de la réactivation du compte: ${error.message || 'Erreur inconnue'}`,
        'error',
      );
    } finally {
      setDeletingAccount(null);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string | null) => {
    setDownloadingInvoice(invoiceId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-download-invoice?invoice_id=${invoiceId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      showToast('Erreur lors du téléchargement de la facture', 'error');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleUpdateSubscription = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const basePlanPriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID;
      const additionalAccountPriceId = process.env.NEXT_PUBLIC_STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID;

      if (!basePlanPriceId || !additionalAccountPriceId) {
        showToast('Configuration Stripe manquante', 'error');
        return;
      }

      const successUrl = `${window.location.origin}/user-settings?tab=subscription&success=true`;
      const cancelUrl = `${window.location.origin}/user-settings?tab=subscription&canceled=true`;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: basePlanPriceId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            mode: 'subscription',
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        alert(`Erreur: ${data.error}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erreur lors de la création du checkout:', error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir annuler votre abonnement ? Il restera actif jusqu'à la fin de la période de facturation en cours.",
      )
    ) {
      return;
    }

    setIsCanceling(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-cancel-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (data.error) {
        alert(`Erreur: ${data.error}`);
        return;
      }

      if (data.success) {
        alert('Votre abonnement sera annulé à la fin de la période de facturation en cours.');

        await fetchSubscription();

        const pollInterval = setInterval(async () => {
          await fetchSubscription();
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
        }, 10000);
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'abonnement:", error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleAddAccountClick = async () => {
    if (!hasEverHadSubscription) {
      setShowSubscriptionModal(true);
      return;
    }

    if (hasEverHadSubscription && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }

    // Ouvrir directement CheckoutAdditionalModal pour ajouter un compte additionnel
    setShowCheckoutAdditionalModal(true);
  };
  const openReactivateModal = (subscriptionId: string, email: string, isPrimary: boolean) => {
    setSubscriptionToReactivate({ subscriptionId, email, isPrimary });
    setShowReactivateModal(true);
  };

  const closeReactivateModal = () => {
    setShowReactivateModal(false);
    setSubscriptionToReactivate(null);
  };

  const confirmReactivateSubscription = async () => {
    if (!subscriptionToReactivate) return;

    setIsLoading(true);
    setShowReactivateModal(false);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-reactivate-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscriptionToReactivate.subscriptionId,
            subscription_type: subscriptionToReactivate.isPrimary
              ? 'premier'
              : 'additional_account',
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        alert(`Erreur: ${data.error}`);
        return;
      }

      if (data.success) {
        await fetchSubscription();
        await fetchEmailAccountsCount();
        setSubscriptionToReactivate(null);
        setShowReactivatedMessage(true);
        setTimeout(() => setShowReactivatedMessage(false), 5000);

        const pollInterval = setInterval(async () => {
          await fetchSubscription();
          await fetchEmailAccountsCount();
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
        }, 10000);
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de la réactivation de l'abonnement:", error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const subscriptionStatus = subscription?.status || 'not_started';
  const isActive = ['active', 'trialing'].includes(subscriptionStatus);
  const hasActiveSubscription = isActive;
  const hasEverHadSubscription = subscriptions.length > 0 || subscriptionStatus !== 'not_started';
  const nextBillingTimestamp = subscription?.current_period_end;
  const actualNextBillingDate = nextBillingTimestamp
    ? new Date(nextBillingTimestamp * 1000)
    : nextBillingDate;
  const actualFormattedDate = actualNextBillingDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getStatusBadge = () => {
    if (subscription?.cancel_at_period_end && isActive) {
      return (
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
          Annulation programmée
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          Actif
        </span>
      );
    }
    if (subscriptionStatus === 'past_due') {
      return (
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
          Paiement en retard
        </span>
      );
    }
    if (subscriptionStatus === 'canceled') {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
          Annulé
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
        Inactif
      </span>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="text-center">
          <div className="relative mb-6 inline-block">
            {/* Cercle extérieur avec gradient orange */}
            <div
              className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-transparent"
              style={{
                borderTopColor: '#FE9736',
                borderRightColor: '#F4664C',
                borderBottomColor: '#FE9736',
                borderLeftColor: 'transparent',
              }}
            ></div>
            {/* Point central orange qui pulse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
              <div className="h-3 w-3 animate-pulse rounded-full bg-gradient-to-br from-orange-400 to-orange-600"></div>
            </div>
          </div>
          <div>
            <p className="mb-1 text-lg font-semibold text-gray-900">
              Chargement de votre abonnement
            </p>
            <p className="text-sm text-gray-500">Veuillez patienter quelques instants...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Messages de succès/erreur */}
      {showSuccessMessage && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Paiement réussi !</p>
            <p className="text-sm text-green-700">Votre abonnement a été activé avec succès.</p>
          </div>
        </div>
      )}
      {showCanceledMessage && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">Paiement annulé</p>
            <p className="text-sm text-yellow-700">Vous avez annulé le processus de paiement.</p>
          </div>
        </div>
      )}
      {showReactivatedMessage && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-md">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-green-900">Abonnement réactivé avec succès !</p>
            <p className="text-sm text-green-700">
              Votre abonnement est de nouveau actif et tous vos services sont disponibles.
            </p>
          </div>
        </div>
      )}

      {/* Vos comptes email */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Vos comptes email</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddAccountClick}
            className="group relative flex w-auto items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-2.5 text-xs font-medium text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 md:px-2.5 md:py-2 md:text-sm cursor-pointer"
            style={{
              background: `conic-gradient(
                    from 195.77deg at 84.44% -1.66%,
                    #FE9736 0deg,
                    #F4664C 76.15deg,
                    #F97E41 197.31deg,
                    #E3AB8D 245.77deg,
                    #FE9736 360deg
                )`,
            }}
          >
            <img
              src="/assets/icon/circle.png"
              alt="circle"
              className="h-3 w-3 transition-transform duration-300 group-hover:rotate-90"
            />
            <span className="relative z-10">Ajouter un compte</span>
          </motion.button>
        </div>

        {/* {!isActive && emailAccountsCount === 0 && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm text-blue-900">
              <strong>Commencez par ajouter un compte email</strong>
            </p>
            <p className="mb-4 text-sm text-blue-800">
              Pour activer votre abonnement, vous devez d'abord configurer au moins un compte email
              dans l'onglet Configuration.
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Aller à la Configuration
            </button>
          </div>
        )}
        {!isActive && emailAccountsCount > 0 && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Abonnement requis :</strong> Vous devez d'abord souscrire au Plan Premier à
              29€ HT/mois pour pouvoir ajouter des comptes additionnels.
            </p>
          </div>
        )} */}

        <div
          className={`space-y-0 ${emailAccounts.length > 7 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}
          style={
            emailAccounts.length > 7
              ? ({
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6',
                } as React.CSSProperties)
              : undefined
          }
        >
          {emailAccounts.length > 0 ? (
            emailAccounts.map((account, index) => {
              // Slot non configuré
              if (account.isSlot) {
                // Le premier compte de la liste (index 0) est toujours le plan de base
                const isFirstSlot = index === 0;
                const price = isFirstSlot ? '49€ HT/mois' : '+39€ HT/mois';
                // Calculer l'index du slot parmi les slots non configurés
                const slotIndex = emailAccounts.filter((a) => a.isSlot).indexOf(account);

                return (
                  <div key={account.id}>
                    <div className="flex flex-col gap-3 py-4 md:grid md:grid-cols-4 md:items-center md:gap-6 md:py-6">
                      {/* Colonne 1: Logo + Nom */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <Mail className="h-6 w-6 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-500">Email non configuré</span>
                      </div>

                      {/* Colonne 2: Numéro du slot */}
                      <div className="pl-9 text-sm text-gray-500 md:pl-0">{account.email}</div>

                      {/* Colonne 3: Prix avec bg-gray */}
                      <div className="flex items-center pl-9 md:justify-center md:pl-0">
                        <span className="inline-block rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                          {price}
                        </span>
                      </div>

                      {/* Colonne 4: Bouton Résilier */}
                      <div className="group relative flex items-center gap-2 pl-9 md:justify-end md:pl-0">
                        <button
                          onClick={() => handleCancelSlot(slotIndex, isFirstSlot)}
                          disabled={true}
                          className="flex cursor-not-allowed items-center gap-2 text-gray-400 opacity-50 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Résilier</span>
                        </button>
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute top-full right-0 z-50 mt-2 rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Vous ne pouvez pas résilier des comptes non configurés
                          <div className="absolute right-4 bottom-full border-4 border-transparent border-b-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    {index < emailAccounts.length - 1 && <hr className="border-gray-200" />}
                  </div>
                );
              }

              // Email configuré normal
              const isPrimary = account.is_primary === true;
              const isAccountActive = account.is_active !== false;
              const isCanceled = account.cancel_at_period_end === true;
              const price = isPrimary ? '49€ HT/mois' : '+39€ HT/mois';

              return (
                <div key={account.id}>
                  <div className="flex flex-col gap-3 py-4 md:grid md:grid-cols-4 md:items-center md:gap-6 md:py-6">
                    {/* Colonne 1: Logo + Nom entreprise */}
                    <div className="flex items-center gap-3">
                      {account.provider === 'gmail' ? (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <img
                            src="/logo/gmail.png"
                            alt="Gmail"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {account.company_name || 'Entreprise'}
                      </span>
                    </div>

                    {/* Colonne 2: Email en gris */}
                    <div className="pl-9 text-sm text-gray-500 md:pl-0">{account.email}</div>

                    {/* Colonne 3: Prix avec bg-gray */}
                    <div className="flex items-center pl-9 md:justify-center md:pl-0">
                      <span className="inline-block rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-black">
                        {price}
                      </span>
                    </div>

                    {/* Colonne 4: Trash rouge + Résilier */}
                    <div className="flex items-center gap-2 pl-9 md:justify-end md:pl-0">
                      {isAccountActive && !isCanceled && (isPrimary || account.subscription_id) && (
                        <button
                          onClick={() => openDeleteModal(account.id, account.email, isPrimary)}
                          disabled={deletingAccount === account.id}
                          className="flex items-center gap-2 text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Résilier</span>
                        </button>
                      )}
                      {isCanceled && account.subscription_id && (
                        <button
                          onClick={() =>
                            openReactivateModal(account.subscription_id!, account.email, isPrimary)
                          }
                          disabled={isLoading}
                          className="flex items-center gap-2 text-amber-600 transition-colors hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Réactiver</span>
                        </button>
                      )}
                      {!isAccountActive && !isCanceled && !isPrimary && (
                        <button
                          onClick={() => handleReactivateEmailAccount(account.id)}
                          disabled={deletingAccount === account.id}
                          className="flex items-center gap-2 text-green-600 transition-colors hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {deletingAccount === account.id ? 'Réactivation...' : 'Réactiver'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  {index < emailAccounts.length - 1 && <hr className="border-gray-200" />}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">Aucun compte email configuré</p>
            </div>
          )}
        </div>
      </div>

      {/* Résumé de facturation */}
      {isActive && (
        <div className="mt-8">
          <h3 className="mb-6 font-bold text-gray-900">Résumé de facturation</h3>

          <div className="space-y-0">
            {/* Ligne 1 : Premier compte */}
            {premierSubscription && (
              <>
                <div className="flex flex-col gap-2 py-4 md:grid md:grid-cols-3 md:items-center md:gap-6">
                  <span className="text-sm font-medium text-gray-900">Premier compte</span>
                  <span className="text-sm text-gray-700">1 compte</span>
                  <span className="text-sm font-medium text-gray-900 md:text-right">
                    {basePlanPrice}€ HT
                  </span>
                </div>
                <hr className="border-gray-200" />
              </>
            )}

            {/* Ligne 2 : Comptes additionnels */}
            {additionalAccounts > 0 && (
              <>
                <div className="flex flex-col gap-2 py-4 md:grid md:grid-cols-3 md:items-center md:gap-6">
                  <span className="text-sm font-medium text-gray-900">
                    Compte{additionalAccounts > 1 ? 's' : ''} additionnel
                    {additionalAccounts > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-gray-700">
                    {additionalAccounts} × {userPrice}€ HT
                  </span>
                  <span className="text-sm font-medium text-gray-900 md:text-right">
                    {(additionalAccounts * userPrice).toFixed(2)}€ HT
                  </span>
                </div>
                <hr className="border-gray-200" />
              </>
            )}

            {/* Ligne 3 : Total HT */}
            <div className="flex flex-col gap-2 py-4 md:grid md:grid-cols-3 md:items-center md:gap-6">
              <span className="text-sm font-medium text-gray-900">Total HT</span>
              <span className="text-sm text-gray-700">
                {emailAccountsCount} compte{emailAccountsCount > 1 ? 's' : ''}
              </span>
              <span className="text-sm font-medium text-gray-900 md:text-right">
                {totalPrice.toFixed(2)}€ HT
              </span>
            </div>
            <hr className="border-gray-200" />

            {/* Ligne 4 : TVA */}
            <div className="flex flex-col gap-2 py-4 md:grid md:grid-cols-3 md:items-center md:gap-6">
              <span className="text-sm font-medium text-gray-900">TVA</span>
              <span className="text-sm text-gray-700">20%</span>
              <span className="text-sm font-medium text-gray-900 md:text-right">
                {(totalPrice * 0.2).toFixed(2)}€
              </span>
            </div>
            <hr className="border-gray-200" />

            {/* Ligne 5 : Total final TTC */}
            <div className="flex flex-col gap-2 py-4 md:grid md:grid-cols-3 md:items-center md:gap-6">
              <span className="text-base font-bold text-gray-900">Total TTC</span>
              <span className="text-sm font-bold text-gray-900">Mensuel</span>
              <span className="text-base font-bold text-gray-900 md:text-right">
                {(totalPrice * 1.2).toFixed(2)}€
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Historique de facturation */}
      <div className="mt-8">
        <h3 className="mb-6 font-bold text-gray-900">Historique de facturation</h3>

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">Aucune facture disponible</p>
          </div>
        ) : (
          <div className="space-y-0">
            {invoices.map((invoice, index) => {
              const paidDate = invoice.paid_at
                ? new Date(invoice.paid_at * 1000).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Date inconnue';

              const amount = (invoice.amount_paid / 100).toFixed(2);

              return (
                <div key={invoice.id}>
                  <div className="flex flex-col gap-3 py-4 md:grid md:grid-cols-4 md:items-center md:gap-6 md:py-6">
                    {/* Colonne 1: Icône + Date et Identifiant */}
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 rounded-xl bg-blue-200/50 p-1">
                        <img src="/assets/icon/file-lines.png" alt="Facture" className="h-8 w-8" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{paidDate}</div>
                        <div className="text-xs text-gray-500">
                          {invoice.invoice_number || invoice.invoice_id}
                        </div>
                      </div>
                    </div>

                    {/* Colonne 2: Status */}
                    <div className="flex items-center pl-11 md:justify-center md:pl-0">
                      <span className="inline-block rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-black">
                        Payé
                      </span>
                    </div>

                    {/* Colonne 3: Montant en gras */}
                    <div className="pl-11 text-sm font-bold text-gray-900 md:pl-0">{amount}€</div>

                    {/* Colonne 4: Télécharger en bleu avec icône */}
                    <div className="flex items-center pl-11 md:justify-end md:pl-0">
                      <button
                        onClick={() =>
                          handleDownloadInvoice(invoice.invoice_id, invoice.invoice_number)
                        }
                        disabled={downloadingInvoice === invoice.invoice_id || !invoice.invoice_pdf}
                        className="flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {downloadingInvoice === invoice.invoice_id
                            ? 'Téléchargement...'
                            : 'Télécharger'}
                        </span>
                      </button>
                    </div>
                  </div>
                  {index < invoices.length - 1 && <hr className="border-gray-200" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && accountToDelete && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {accountToDelete.isPrimary ? "Annuler l'abonnement" : 'Supprimer le compte'}
              </h3>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-gray-700">
                {accountToDelete.isPrimary ? (
                  <>
                    Vous êtes sur le point d'annuler votre abonnement pour le compte{' '}
                    <strong>{accountToDelete.email}</strong>.
                  </>
                ) : (
                  <>
                    Vous êtes sur le point de supprimer le compte additionnel{' '}
                    <strong>{accountToDelete.email}</strong>.
                  </>
                )}
              </p>

              {accountToDelete.isPrimary ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="mb-2 text-sm font-medium text-yellow-800">
                    Information importante :
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                    <li>Votre abonnement Premier sera annulé</li>
                    <li>
                      Un autre de vos comptes email deviendra automatiquement le compte de base
                    </li>
                    <li>L'abonnement restera actif jusqu'à la fin de la période de facturation</li>
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="mb-2 text-sm font-medium text-yellow-800">
                    Information importante :
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                    <li>L'abonnement de ce compte additionnel sera annulé</li>
                    <li>Le compte sera désactivé immédiatement</li>
                    <li>L'abonnement restera actif jusqu'à la fin de la période de facturation</li>
                    <li>
                      Pour le réactiver, vous devrez souscrire à un nouvel abonnement additionnel
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAccountToDelete(null);
                }}
                disabled={deletingAccount !== null}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteEmailAccount}
                disabled={deletingAccount !== null}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount
                  ? 'Suppression...'
                  : accountToDelete.isPrimary
                    ? "Confirmer l'annulation"
                    : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réactivation */}
      {showReactivateModal && subscriptionToReactivate && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md transform rounded-xl bg-white p-6 shadow-2xl transition-all">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Réactiver l'abonnement</h3>
            </div>

            <div className="mb-6">
              <p className="mb-4 leading-relaxed text-gray-700">
                Vous êtes sur le point de réactiver{' '}
                {subscriptionToReactivate.isPrimary ? 'votre abonnement' : 'le compte additionnel'}{' '}
                pour <strong className="text-gray-900">{subscriptionToReactivate.email}</strong>.
              </p>

              <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="mb-2 text-sm font-medium text-green-900">
                      Avantages de la réactivation :
                    </p>
                    <ul className="space-y-1.5 text-sm text-green-800">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">•</span>
                        <span>Accès immédiat à tous les services</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">•</span>
                        <span>
                          Facturation{' '}
                          {subscriptionToReactivate.isPrimary ? 'à 49€ HT/mois' : 'à 39€ HT/mois'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-green-600">•</span>
                        <span>Aucune interruption de service</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeReactivateModal}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmReactivateSubscription}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-medium text-white shadow-md transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Réactivation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter un compte */}
      <AnimatePresence>
        {showAddAccountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="font-inter mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Ajouter un compte email</h2>
                <p className="text-sm text-gray-600">Sélectionnez votre fournisseur d'email</p>
              </div>

              <div className="mb-6 space-y-3">
                <button
                  onClick={() => handleProviderSelect('gmail')}
                  className="group flex w-full items-center justify-between rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-orange-500 hover:bg-orange-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-xl font-bold text-white shadow-md">
                      G
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Gmail</div>
                      <div className="text-sm text-gray-500">Google Workspace</div>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-green-500" />
                </button>

                <button
                  onClick={() => handleProviderSelect('outlook')}
                  className="group flex w-full items-center justify-between rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-orange-500 hover:bg-orange-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-50">
                      <svg
                        className="h-6 w-6 text-orange-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7 18h11v-2H7v2zm0-4h11v-2H7v2zm0-4h11V8H7v2zm14 8V6c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Outlook</div>
                      <div className="text-sm text-gray-500">Microsoft 365</div>
                    </div>
                  </div>
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    Bientôt
                  </span>
                </button>

                <button
                  onClick={() => handleProviderSelect('imap')}
                  className="group flex w-full items-center justify-between rounded-xl border-2 border-gray-200 p-4 transition-all hover:border-orange-500 hover:bg-orange-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <Lock className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Autres emails</div>
                      <div className="text-sm text-gray-500">SMTP / IMAP</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500" />
                </button>
              </div>

              <button
                onClick={() => setShowAddAccountModal(false)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Setup Email pour IMAP */}
      {showSetupEmailModal && user && (
        <SetupEmailModal
          userId={user.id}
          onComplete={() => {
            setShowSetupEmailModal(false);
            fetchEmailAccountsCount();
            fetchSubscription();
          }}
        />
      )}

      {/* Modal Checkout pour upgrade (ajouter un compte additionnel) */}
    

   

      {/* Modal CheckoutAdditionalModal pour ajouter des comptes additionnels */}
      {showCheckoutAdditionalModal && user && (
        <CheckoutAdditionalModal
          userId={user.id}
          onClose={() => setShowCheckoutAdditionalModal(false)}
          currentAdditionalAccounts={additionalAccounts}
          unlinkedSubscriptionsCount={Math.max(0, additionalAccounts - emailAccounts.length)}
        />
      )}
    </div>
  );
}