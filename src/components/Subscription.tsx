'use client';

import { useState, useEffect } from 'react';
import { Users, Check, Star, AlertCircle, CheckCircle, Download, Trash2, RefreshCw, Mail, Lock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SetupEmailModal } from './SetupEmailModal';
import { CheckoutModal } from './CheckoutModal';

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
    const [accountToDelete, setAccountToDelete] = useState<{ id: string; email: string; isPrimary: boolean } | null>(null);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const [subscriptionToReactivate, setSubscriptionToReactivate] = useState<{ subscriptionId: string; email: string; isPrimary: boolean } | null>(null);
    const [showReactivatedMessage, setShowReactivatedMessage] = useState(false);
    const [basePlanPrice, setBasePlanPrice] = useState(29);
    const [userPrice, setUserPrice] = useState(19);
    const [isSyncing, setIsSyncing] = useState(false);
    const [paidAdditionalAccounts, setPaidAdditionalAccounts] = useState(0);
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);
    const [showSetupEmailModal, setShowSetupEmailModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const premierSubscription = subscriptions.find(sub => sub.subscription_type === 'premier');
    const additionalAccountSubscriptions = subscriptions.filter(sub => sub.subscription_type === 'additional_account');
    const subscription = premierSubscription;
    
    // Calculer la quantité réelle d'emails additionnels (sera mis à jour dans fetchPaidAdditionalAccounts)
    const [totalAdditionalQuantity, setTotalAdditionalQuantity] = useState(0);
    const additionalAccounts = totalAdditionalQuantity || paidAdditionalAccounts; // Priorité à la quantité réelle
    const totalPrice = premierSubscription ? basePlanPrice + (additionalAccounts * userPrice) : 0;

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
                fetchPaidAdditionalAccounts()
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: subData } = await supabase
                .from('stripe_user_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (subData) {
                setSubscriptions(subData);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        }
    };

    const fetchEmailAccountsCount = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let accounts: EmailAccount[] = [];

            const { data: allConfigs } = await supabase
                .from('email_configurations')
                .select('id, email, provider, is_primary, is_active, company_name')
                .eq('user_id', user.id)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: true });

            if (allConfigs) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (!currentUser) return;

                // Récupérer les subscriptions actives ET supprimées pour vérifier le statut de résiliation
                const { data: allSubs, error: subsError } = await supabase
                    .from('stripe_user_subscriptions')
                    .select('subscription_id, status, cancel_at_period_end, subscription_type, email_configuration_id, deleted_at')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (subsError) {
                    // Si la table n'existe pas ou si les colonnes sont manquantes
                    if (subsError.code === '42P01' || subsError.code === '42703' || subsError.message?.includes('does not exist') || subsError.message?.includes('column')) {
                        console.warn('stripe_user_subscriptions table or columns not found:', subsError);
                        // Continuer avec un tableau vide
                    } else {
                        console.error('Error fetching subscriptions:', subsError);
                        return;
                    }
                }

                // Récupérer uniquement les subscriptions actives pour l'association
                const activeSubs = allSubs?.filter(s => !s.deleted_at) || [];

                accounts = allConfigs.map((c) => {
                    let subscriptionInfo = {};
                    let isDeleted = false; // Flag pour savoir si ce compte spécifique est résilié

                    // Pour le compte principal, chercher la subscription "premier"
                    if (c.is_primary) {
                        const premierSub = activeSubs.find(s => 
                            s.subscription_type === 'premier' && 
                            ['active', 'trialing'].includes(s.status)
                        );

                        if (premierSub) {
                            subscriptionInfo = {
                                subscription_id: premierSub.subscription_id,
                                subscription_status: premierSub.status,
                                cancel_at_period_end: premierSub.cancel_at_period_end
                            };
                        } else {
                            // Vérifier si le compte principal a une subscription supprimée
                            const deletedPremierSub = allSubs?.find(s => 
                                s.subscription_type === 'premier' && 
                                s.deleted_at !== null
                            );
                            if (deletedPremierSub) {
                                isDeleted = true;
                                subscriptionInfo = {
                                    subscription_id: deletedPremierSub.subscription_id,
                                    subscription_status: deletedPremierSub.status,
                                    cancel_at_period_end: deletedPremierSub.cancel_at_period_end || true
                                };
                            }
                        }
                    } else {
                        // Pour les comptes additionnels, chercher d'abord la subscription liée à l'email_configuration_id
                        const configSubs = activeSubs.filter(s => s.email_configuration_id === c.id) || [];

                        let activeSub = configSubs.find(s =>
                            ['active', 'trialing'].includes(s.status)
                        );

                        // Si aucune subscription active n'est liée à ce compte, vérifier si une subscription supprimée existe
                        if (!activeSub) {
                            const deletedConfigSub = allSubs?.find(s => 
                                s.email_configuration_id === c.id && 
                                s.deleted_at !== null
                            );
                            
                            if (deletedConfigSub) {
                                // Ce compte a été résilié (subscription supprimée)
                                isDeleted = true;
                                subscriptionInfo = {
                                    subscription_id: deletedConfigSub.subscription_id,
                                    subscription_status: deletedConfigSub.status,
                                    cancel_at_period_end: true // Considéré comme résilié
                                };
                            } else {
                                // Chercher une subscription additionnelle non liée disponible
                                const unlinkedAdditionalSubs = activeSubs.filter(s => 
                                    s.subscription_type === 'additional_account' && 
                                    s.email_configuration_id === null &&
                                    ['active', 'trialing'].includes(s.status)
                                ) || [];

                                // Prendre la première subscription additionnelle non liée disponible
                                activeSub = unlinkedAdditionalSubs[0];
                                
                                if (activeSub) {
                                    subscriptionInfo = {
                                        subscription_id: activeSub.subscription_id,
                                        subscription_status: activeSub.status,
                                        cancel_at_period_end: activeSub.cancel_at_period_end
                                    };
                                }
                            }
                        } else {
                            if (activeSub) {
                                subscriptionInfo = {
                                    subscription_id: activeSub.subscription_id,
                                    subscription_status: activeSub.status,
                                    cancel_at_period_end: activeSub.cancel_at_period_end
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
                        ...subscriptionInfo
                    };
                });
            }

            // Récupérer le nombre total de slots payés
            console.log('🔍 [Subscription] Récupération des slots payés pour user:', user.id);
            
            const { data: allSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_type, status, subscription_id')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .is('deleted_at', null);

            console.log('📊 [Subscription] Subscriptions récupérées:', allSubs);

            let totalPaidSlots = 0;
            if (allSubs && allSubs.length > 0) {
                const premierCount = allSubs.filter(s => s.subscription_type === 'premier').length;
                
                // Récupérer la quantité réelle depuis Stripe pour chaque subscription additionnelle
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Récupérer les quantités réelles depuis Stripe
                    let totalAdditionalQuantity = 0;
                    const additionalSubs = allSubs.filter(s => s.subscription_type === 'additional_account');
                    
                    console.log(`🔍 [Subscription] Récupération des quantités pour ${additionalSubs.length} subscription(s) additionnelle(s)...`);
                    
                    for (const sub of additionalSubs) {
                        try {
                            const response = await fetch(
                                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-subscription-quantity`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${session.access_token}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        subscription_id: sub.subscription_id
                                    }),
                                }
                            );

                            if (response.ok) {
                                const data = await response.json();
                                const quantity = data.quantity || 1; // Par défaut 1 si pas de quantité
                                totalAdditionalQuantity += quantity;
                                console.log(`✅ [Subscription] Subscription ${sub.subscription_id}: quantité = ${quantity}`);
                            } else {
                                console.warn(`⚠️ [Subscription] Impossible de récupérer la quantité pour ${sub.subscription_id}, utilisation de 1 par défaut`);
                                totalAdditionalQuantity += 1; // Fallback : 1 par défaut
                            }
                        } catch (error) {
                            console.error(`❌ [Subscription] Erreur lors de la récupération de la quantité pour ${sub.subscription_id}:`, error);
                            totalAdditionalQuantity += 1; // Fallback : 1 par défaut
                        }
                    }
                    
                    totalPaidSlots = premierCount > 0 ? 1 + totalAdditionalQuantity : 0;
                    
                    console.log('✅ [Subscription] Premier:', premierCount, '| Additionnels (quantité totale):', totalAdditionalQuantity, '| Total:', totalPaidSlots);
                } else {
                    // Fallback si pas de session : compter les lignes (ancienne méthode)
                    console.warn('⚠️ [Subscription] Pas de session pour récupérer les quantités, utilisation de la méthode de comptage par lignes');
                    const additionalCount = allSubs.filter(s => s.subscription_type === 'additional_account').length;
                    totalPaidSlots = premierCount > 0 ? 1 + additionalCount : 0;
                    console.log('✅ [Subscription] Premier:', premierCount, '| Additionnels (lignes):', additionalCount, '| Total:', totalPaidSlots);
                }
            } else {
                console.log('⚠️ [Subscription] Aucune subscription trouvée');
            }

            // Ajouter des slots vides pour les emails payés mais non configurés
            const configuredCount = accounts.length;
            const slotsToAdd = totalPaidSlots - configuredCount;

            console.log('📧 [Subscription] Comptes configurés:', configuredCount, '| Slots à ajouter:', slotsToAdd);

            if (slotsToAdd > 0) {
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
                console.log('✅ [Subscription] Slots vides ajoutés:', slotsToAdd);
            }

            setEmailAccounts(accounts);
            setEmailAccountsCount(totalPaidSlots); // Utiliser le total payé au lieu des actifs
        } catch (error) {
            console.error('Error fetching email accounts count:', error);
        }
    };

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
                    setBasePlanPrice(data.basePlan.amount);
                }
                if (data.additionalAccount?.amount) {
                    setUserPrice(data.additionalAccount.amount);
                }
            }
        } catch (error) {
            console.error('Error fetching Stripe prices:', error);
        }
    };

    const fetchPaidAdditionalAccounts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('⚠️ [Subscription] Pas de session pour récupérer les quantités additionnelles');
                setTotalAdditionalQuantity(allSubs.length); // Fallback : nombre de lignes
                setPaidAdditionalAccounts(allSubs.length);
                return;
            }

            let totalQuantity = 0;
            
            for (const sub of allSubs) {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-subscription-quantity`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                subscription_id: sub.subscription_id
                            }),
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const quantity = data.quantity || 1;
                        totalQuantity += quantity;
                        console.log(`✅ [Subscription] Subscription additionnelle ${sub.subscription_id}: quantité = ${quantity}`);
                    } else {
                        console.warn(`⚠️ [Subscription] Impossible de récupérer la quantité pour ${sub.subscription_id}, utilisation de 1 par défaut`);
                        totalQuantity += 1; // Fallback
                    }
                } catch (error) {
                    console.error(`❌ [Subscription] Erreur lors de la récupération de la quantité pour ${sub.subscription_id}:`, error);
                    totalQuantity += 1; // Fallback
                }
            }
            
            console.log(`✅ [Subscription] Total quantité additionnelle calculée: ${totalQuantity}`);
            setTotalAdditionalQuantity(totalQuantity);
            setPaidAdditionalAccounts(totalQuantity);
        } catch (error) {
            console.error('Error fetching paid additional accounts:', error);
        }
    };

    const fetchInvoices = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('stripe_invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching invoices:', error);
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-sync-invoices`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const result = await response.json();
                const { data: { user } } = await supabase.auth.getUser();
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
        } catch (error) {
            console.error('Error syncing invoices:', error);
        }
    };

    const handleDeleteEmailAccount = async () => {
        if (!accountToDelete) return;

        setDeletingAccount(accountToDelete.id);

        try {
            if (accountToDelete.isPrimary) {
                const { data: { user } } = await supabase.auth.getUser();
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

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    showToast('Vous devez être connecté', 'error');
                    return;
                }

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            subscription_id: premierSub.subscription_id,
                            subscription_type: 'premier'
                        }),
                    }
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
                const { data: { user } } = await supabase.auth.getUser();
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
                    console.error('No subscription found for email_configuration_id:', accountToDelete.id);
                    setShowDeleteModal(false);
                    setAccountToDelete(null);
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    showToast('Vous devez être connecté', 'error');
                    return;
                }

                // TypeScript: subscriptionData est garanti non-null ici grâce à la vérification ci-dessus
                const finalSubscriptionId = subscriptionData.subscription_id;

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            subscription_id: finalSubscriptionId,
                            subscription_type: 'additional_account',
                            email_configuration_id: accountToDelete.id
                        })
                    }
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
            showToast(`Erreur lors de la suppression du compte: ${error.message || 'Erreur inconnue'}`, 'error');
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
            const { data: { user } } = await supabase.auth.getUser();
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
                const unlinkedSubs = allSubs.filter(sub => !sub.email_configuration_id);
                
                // Pour les slots additionnels, on commence à l'index 0 (le premier slot additionnel)
                const adjustedIndex = slotIndex - 1; // -1 car le premier slot (index 0) est le plan de base
                
                if (unlinkedSubs.length === 0 || adjustedIndex < 0 || adjustedIndex >= unlinkedSubs.length) {
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

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            setDeletingAccount(`slot-${slotIndex}`);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        subscription_id: subscriptionId
                    }),
                }
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
                    body: JSON.stringify({}),
                }
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
            window.location.href = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/outlook-oauth-init?user_id=${user.id}`;
        } else {
            setShowAddAccountModal(false);
            setShowSetupEmailModal(true);
        }
    };

    const handleForceSync = async () => {
        setIsSyncing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-force-sync`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
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
            const { data: { user } } = await supabase.auth.getUser();
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

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-update-subscription`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            additional_accounts: newAdditionalAccountsCount
                        })
                    }
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
            showToast(`Erreur lors de la réactivation du compte: ${error.message || 'Erreur inconnue'}`, 'error');
        } finally {
            setDeletingAccount(null);
        }
    };

    const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string | null) => {
        setDownloadingInvoice(invoiceId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-download-invoice?invoice_id=${invoiceId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                }
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
            const { data: { session } } = await supabase.auth.getSession();
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
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        price_id: basePlanPriceId,
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        mode: 'subscription',
                    }),
                }
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
        if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Il restera actif jusqu\'à la fin de la période de facturation en cours.')) {
            return;
        }

        setIsCanceling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
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
            console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
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

        // Ouvrir directement le modal de paiement pour ajouter un compte additionnel
        setShowUpgradeModal(true);
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-reactivate-subscription`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        subscription_id: subscriptionToReactivate.subscriptionId,
                        subscription_type: subscriptionToReactivate.isPrimary ? 'premier' : 'additional_account'
                    })
                }
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
            console.error('Erreur lors de la réactivation de l\'abonnement:', error);
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
        year: 'numeric'
    });

    const getStatusBadge = () => {
        if (subscription?.cancel_at_period_end && isActive) {
            return (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                    Annulation programmée
                </span>
            );
        }
        if (isActive) {
            return (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Actif
                </span>
            );
        }
        if (subscriptionStatus === 'past_due') {
            return (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Paiement en retard
                </span>
            );
        }
        if (subscriptionStatus === 'canceled') {
            return (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                    Annulé
                </span>
            );
        }
        return (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                Inactif
            </span>
        );
    };

    if (isInitialLoading) {
        return (
            <div className="mt-6 flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="relative inline-block mb-6">
                        {/* Cercle extérieur avec gradient orange */}
                        <div 
                            className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-transparent"
                            style={{
                                borderTopColor: '#FE9736',
                                borderRightColor: '#F4664C',
                                borderBottomColor: '#FE9736',
                                borderLeftColor: 'transparent'
                            }}
                        ></div>
                        {/* Point central orange qui pulse */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-900 font-semibold text-lg mb-1">Chargement de votre abonnement</p>
                        <p className="text-gray-500 text-sm">Veuillez patienter quelques instants...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-6">
            {/* Messages de succès/erreur */}
            {showSuccessMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-900">Paiement réussi !</p>
                        <p className="text-sm text-green-700">Votre abonnement a été activé avec succès.</p>
                    </div>
                </div>
            )}
            {showCanceledMessage && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div>
                        <p className="font-medium text-yellow-900">Paiement annulé</p>
                        <p className="text-sm text-yellow-700">Vous avez annulé le processus de paiement.</p>
                    </div>
                </div>
            )}
            {showReactivatedMessage && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-green-900">Abonnement réactivé avec succès !</p>
                        <p className="text-sm text-green-700">Votre abonnement est de nouveau actif et tous vos services sont disponibles.</p>
                    </div>
                </div>
            )}

            {/* Vos comptes email */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900">Vos comptes email</h3>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }} 
                        onClick={handleAddAccountClick}
                        className="group relative px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium text-xs md:text-sm text-white disabled:opacity-50 flex items-center gap-2 overflow-hidden w-full md:w-auto justify-center shadow-md hover:shadow-lg transition-all duration-300  hover:scale-105"
                        style={{background:`conic-gradient(
                            from 195.77deg at 84.44% -1.66%,
                            #FE9736 0deg,
                            #F4664C 76.15deg,
                            #F97E41 197.31deg,
                            #E3AB8D 245.77deg,
                            #FE9736 360deg
                        )`}}
                    >
                        <img src="/assets/icon/circle.png" alt="circle" className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                        <span className="relative z-10 ">
                            Ajouter un compte
                        </span>
                    
                    </motion.button>
                </div>

                {!isActive && emailAccountsCount === 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                        <p className="text-sm text-blue-900 mb-3">
                            <strong>Commencez par ajouter un compte email</strong>
                        </p>
                        <p className="text-sm text-blue-800 mb-4">
                            Pour activer votre abonnement, vous devez d'abord configurer au moins un compte email dans l'onglet Configuration.
                        </p>
                        <button
                            onClick={() => router.push('/settings')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Aller à la Configuration
                        </button>
                    </div>
                )}
                {!isActive && emailAccountsCount > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
                        <p className="text-sm text-yellow-800">
                            <strong>Abonnement requis :</strong> Vous devez d'abord souscrire au Plan Premier à 29€ HT/mois pour pouvoir ajouter des comptes additionnels.
                        </p>
                    </div>
                )}

                <div className={`space-y-0 ${emailAccounts.length > 7 ? 'overflow-y-auto max-h-[600px] pr-2' : ''}`}
                    style={emailAccounts.length > 7 ? {
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d1d5db #f3f4f6'
                    } as React.CSSProperties : undefined}
                >
                    {emailAccounts.length > 0 ? (
                        emailAccounts.map((account, index) => {
                            // Slot non configuré
                            if (account.isSlot) {
                                // Le premier compte de la liste (index 0) est toujours le plan de base
                                const isFirstSlot = index === 0;
                                const price = isFirstSlot ? '29€ HT/mois' : '+19€ HT/mois';
                                // Calculer l'index du slot parmi les slots non configurés
                                const slotIndex = emailAccounts.filter(a => a.isSlot).indexOf(account);
                                
                                return (
                                    <div key={account.id}>
                                        <div className="grid grid-cols-4 gap-6 items-center py-6">
                                            {/* Colonne 1: Logo + Nom */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                    <Mail className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <span className="font-medium text-gray-500">
                                                    Email non configuré
                                                </span>
                                            </div>

                                            {/* Colonne 2: Numéro du slot */}
                                            <div className="text-sm text-gray-500">
                                                {account.email}
                                            </div>

                                            {/* Colonne 3: Prix avec bg-gray */}
                                            <div className='flex items-center justify-center'>
                                                <span className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-500 text-xs font-medium rounded-full inline-block">
                                                    {price}
                                                </span>
                                            </div>

                                            {/* Colonne 4: Bouton Résilier */}
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleCancelSlot(slotIndex, isFirstSlot)}
                                                    disabled={deletingAccount === account.id}
                                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Résilier</span>
                                                </button>
                                            </div>
                                        </div>
                                        {index < emailAccounts.length - 1 && (
                                            <hr className="border-gray-200" />
                                        )}
                                    </div>
                                );
                            }

                            // Email configuré normal
                            const isPrimary = account.is_primary === true;
                            const isAccountActive = account.is_active !== false;
                            const isCanceled = account.cancel_at_period_end === true;
                            const price = isPrimary ? '29€ HT/mois' : '+19€ HT/mois';

                            return (
                                <div key={account.id}>
                                    <div className="grid grid-cols-4 gap-6 items-center py-6">
                                        {/* Colonne 1: Logo + Nom entreprise */}
                                        <div className="flex items-center gap-3">
                                            {account.provider === 'gmail' ? (
                                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                    <img src="/logo/gmail.png" alt="Gmail" className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                    <Mail className="w-6 h-6 text-blue-600" />
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-900">
                                                {account.company_name || 'Entreprise'}
                                            </span>
                                        </div>

                                        {/* Colonne 2: Email en gris */}
                                        <div className="text-sm text-gray-500">
                                            {account.email}
                                        </div>

                                        {/* Colonne 3: Prix avec bg-gray */}
                                        <div className='flex items-center justify-center'>
                                            <span className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-black text-xs font-medium rounded-full inline-block">
                                                {price}
                                            </span>
                                        </div>

                                        {/* Colonne 4: Trash rouge + Résilier */}
                                        <div className="flex items-center justify-end gap-2">
                                            {isAccountActive && !isCanceled && (isPrimary || account.subscription_id) && (
                                                <button
                                                    onClick={() => openDeleteModal(account.id, account.email, isPrimary)}
                                                    disabled={deletingAccount === account.id}
                                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Résilier</span>
                                                </button>
                                            )}
                                            {isCanceled && account.subscription_id && (
                                                <button
                                                    onClick={() => openReactivateModal(account.subscription_id!, account.email, isPrimary)}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Réactiver</span>
                                                </button>
                                            )}
                                            {!isAccountActive && !isCanceled && !isPrimary && (
                                                <button
                                                    onClick={() => handleReactivateEmailAccount(account.id)}
                                                    disabled={deletingAccount === account.id}
                                                    className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium">
                                                        {deletingAccount === account.id ? 'Réactivation...' : 'Réactiver'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {index < emailAccounts.length - 1 && (
                                        <hr className="border-gray-200" />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                            <p className="text-sm text-gray-600">Aucun compte email configuré</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Résumé de facturation */}
            {isActive && (
                <div className="mt-8">
                    <h3 className="font-bold text-gray-900 mb-6">Résumé de facturation</h3>

                    <div className="space-y-0">
                        {/* Ligne 1 : Premier compte */}
                        {premierSubscription && (
                            <>
                                <div className="grid grid-cols-3 gap-6 items-center py-4">
                                    <span className="text-sm font-medium text-gray-900">Premier compte</span>
                                    <span className="text-sm text-gray-700">1 compte</span>
                                    <span className="text-sm text-gray-900 font-medium text-right">{basePlanPrice}€ HT</span>
                                </div>
                                <hr className="border-gray-200" />
                            </>
                        )}

                        {/* Ligne 2 : Comptes additionnels */}
                        {additionalAccounts > 0 && (
                            <>
                                <div className="grid grid-cols-3 gap-6 items-center py-4">
                                    <span className="text-sm font-medium text-gray-900">Compte{additionalAccounts > 1 ? 's' : ''} additionnel{additionalAccounts > 1 ? 's' : ''}</span>
                                    <span className="text-sm text-gray-700">{additionalAccounts} × {userPrice}€</span>
                                    <span className="text-sm text-gray-900 font-medium text-right">{(additionalAccounts * userPrice).toFixed(2)}€ HT</span>
                                </div>
                                <hr className="border-gray-200" />
                            </>
                        )}

                        {/* Ligne 3 : Total HT */}
                        <div className="grid grid-cols-3 gap-6 items-center py-4">
                            <span className="text-sm font-medium text-gray-900">Total HT</span>
                            <span className="text-sm text-gray-700">{emailAccountsCount} compte{emailAccountsCount > 1 ? 's' : ''}</span>
                            <span className="text-sm text-gray-900 font-medium text-right">{totalPrice.toFixed(2)}€ HT</span>
                        </div>
                        <hr className="border-gray-200" />

                        {/* Ligne 4 : TVA */}
                        <div className="grid grid-cols-3 gap-6 items-center py-4">
                            <span className="text-sm font-medium text-gray-900">TVA</span>
                            <span className="text-sm text-gray-700">20%</span>
                            <span className="text-sm text-gray-900 font-medium text-right">{(totalPrice * 0.2).toFixed(2)}€</span>
                        </div>
                        <hr className="border-gray-200" />

                        {/* Ligne 5 : Total final TTC */}
                        <div className="grid grid-cols-3 gap-6 items-center py-4">
                            <span className="text-base font-bold text-gray-900">Total TTC</span>
                            <span className="text-sm font-bold text-gray-900">Mensuel</span>
                            <span className="text-base font-bold text-gray-900 text-right">{(totalPrice * 1.2).toFixed(2)}€</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Historique de facturation */}
            <div className="mt-8">
                <h3 className="font-bold text-gray-900 mb-6">Historique de facturation</h3>

                {invoices.length === 0 ? (
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-sm text-gray-600">Aucune facture disponible</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {invoices.map((invoice, index) => {
                            const paidDate = invoice.paid_at
                                ? new Date(invoice.paid_at * 1000).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })
                                : 'Date inconnue';

                            const amount = (invoice.amount_paid / 100).toFixed(2);

                            return (
                                <div key={invoice.id}>
                                    <div className="grid grid-cols-4 gap-6 items-center py-6">
                                        {/* Colonne 1: Icône + Date et Identifiant */}
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-200/50 p-1 rounded-xl flex-shrink-0">
                                                <img src="/assets/icon/file-lines.png" alt="Facture" className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm">{paidDate}</div>
                                                <div className="text-xs text-gray-500">
                                                    {invoice.invoice_number || invoice.invoice_id}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Colonne 2: Status */}
                                        <div className='flex items-center justify-center'>
                                            <span className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-black text-xs font-medium rounded-full inline-block">
                                                Payé
                                            </span>
                                        </div>

                                        {/* Colonne 3: Montant en gras */}
                                        <div className="text-sm font-bold text-gray-900">
                                            {amount}€
                                        </div>

                                        {/* Colonne 4: Télécharger en bleu avec icône */}
                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={() => handleDownloadInvoice(invoice.invoice_id, invoice.invoice_number)}
                                                disabled={downloadingInvoice === invoice.invoice_id || !invoice.invoice_pdf}
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    {downloadingInvoice === invoice.invoice_id ? 'Téléchargement...' : 'Télécharger'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                    {index < invoices.length - 1 && (
                                        <hr className="border-gray-200" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de suppression */}
            {showDeleteModal && accountToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {accountToDelete.isPrimary ? 'Annuler l\'abonnement' : 'Supprimer le compte'}
                            </h3>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700 mb-3">
                                {accountToDelete.isPrimary ? (
                                    <>
                                        Vous êtes sur le point d'annuler votre abonnement pour le compte <strong>{accountToDelete.email}</strong>.
                                    </>
                                ) : (
                                    <>
                                        Vous êtes sur le point de supprimer le compte additionnel <strong>{accountToDelete.email}</strong>.
                                    </>
                                )}
                            </p>

                            {accountToDelete.isPrimary ? (
                                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800 font-medium mb-2">
                                        Information importante :
                                    </p>
                                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                                        <li>Votre abonnement Premier sera annulé</li>
                                        <li>Un autre de vos comptes email deviendra automatiquement le compte de base</li>
                                        <li>L'abonnement restera actif jusqu'à la fin de la période de facturation</li>
                                    </ul>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800 font-medium mb-2">
                                        Information importante :
                                    </p>
                                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                                        <li>L'abonnement de ce compte additionnel sera annulé</li>
                                        <li>Le compte sera désactivé immédiatement</li>
                                        <li>L'abonnement restera actif jusqu'à la fin de la période de facturation</li>
                                        <li>Pour le réactiver, vous devrez souscrire à un nouvel abonnement additionnel</li>
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
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteEmailAccount}
                                disabled={deletingAccount !== null}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deletingAccount ? 'Suppression...' : accountToDelete.isPrimary ? 'Confirmer l\'annulation' : 'Confirmer la suppression'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de réactivation */}
            {showReactivateModal && subscriptionToReactivate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Réactiver l'abonnement
                            </h3>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700 mb-4 leading-relaxed">
                                Vous êtes sur le point de réactiver {subscriptionToReactivate.isPrimary ? 'votre abonnement' : 'le compte additionnel'} pour <strong className="text-gray-900">{subscriptionToReactivate.email}</strong>.
                            </p>

                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-green-900 font-medium mb-2">
                                            Avantages de la réactivation :
                                        </p>
                                        <ul className="text-sm text-green-800 space-y-1.5">
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-600 font-bold">•</span>
                                                <span>Accès immédiat à tous les services</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-600 font-bold">•</span>
                                                <span>Facturation {subscriptionToReactivate.isPrimary ? 'à 29€ HT/mois' : 'à 19€ HT/mois'}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-600 font-bold">•</span>
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
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmReactivateSubscription}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3, type: "spring" }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl font-inter max-h-[90vh] overflow-y-auto"
                        >
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ajouter un compte email</h2>
                            <p className="text-gray-600 text-sm">Sélectionnez votre fournisseur d'email</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => handleProviderSelect('gmail')}
                                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                                        G
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-gray-900">Gmail</div>
                                        <div className="text-sm text-gray-500">Google Workspace</div>
                                    </div>
                                </div>
                                <Check className="w-5 h-5 text-green-500" />
                            </button>

                            <button
                                onClick={() => handleProviderSelect('outlook')}
                                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M7 18h11v-2H7v2zm0-4h11v-2H7v2zm0-4h11V8H7v2zm14 8V6c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-gray-900">Outlook</div>
                                        <div className="text-sm text-gray-500">Microsoft 365</div>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Bientôt</span>
                            </button>

                            <button
                                onClick={() => handleProviderSelect('imap')}
                                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-gray-900">Autres emails</div>
                                        <div className="text-sm text-gray-500">SMTP / IMAP</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddAccountModal(false)}
                            className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
            {showUpgradeModal && user && (
                <CheckoutModal
                    userId={user.id}
                    isUpgrade={true}
                    onComplete={() => {
                        setShowUpgradeModal(false);
                        fetchEmailAccountsCount();
                        fetchSubscription();
                        fetchPaidAdditionalAccounts();
                    }}
                    onClose={() => setShowUpgradeModal(false)}
                />
            )}

            {/* Modal Checkout pour subscription (premier abonnement) */}
            {showSubscriptionModal && user && (
                <CheckoutModal
                    userId={user.id}
                    isUpgrade={false}
                    onComplete={() => {
                        setShowSubscriptionModal(false);
                        fetchEmailAccountsCount();
                        fetchSubscription();
                        fetchPaidAdditionalAccounts();
                    }}
                    onClose={() => setShowSubscriptionModal(false)}
                />
            )}
        </div>
    );
}
