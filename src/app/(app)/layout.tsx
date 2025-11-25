'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import AppNavbar from '@/components/layout/AppNavbar';
import { supabase } from '@/lib/supabase';
import { OnboardingModal } from '@/components/OnBoardingModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { SetupEmailModal } from '@/components/SetupEmailModal';
import { Loading } from '@/components/Loading';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasEmail, setHasEmail] = useState<boolean | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showSetupEmail, setShowSetupEmail] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isProcessingPaymentReturn, setIsProcessingPaymentReturn] = useState(false);

    // Vérifier tout en une seule fois au chargement
    useEffect(() => {
        if (!user || loading || isChecked || isProcessingPaymentReturn) return;
        checkAllRequirements();
    }, [user, loading, isProcessingPaymentReturn]);

    // Gérer le retour du paiement Stripe
    useEffect(() => {
        if (!user || loading) return;
        
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        
        if (paymentStatus === 'success') {
            // Nettoyer l'URL
            window.history.replaceState({}, '', pathname);
            
            // Marquer qu'on est en train de traiter le retour du paiement
            setIsProcessingPaymentReturn(true);
            
            // Réinitialiser l'état pour permettre un nouveau check
            setIsChecked(false);
            setHasEmail(false); // Permettre l'affichage de SetupEmail si nécessaire
            setShowCheckout(false); // Masquer la modal checkout
            
            // Synchroniser les factures depuis Stripe immédiatement
            syncInvoicesFromStripe();
            
            // Vérifier immédiatement le statut du paiement
            const handlePaymentReturn = async () => {
                // Attendre un peu pour que la synchronisation soit terminée
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Vérifier le paiement
                const hasPayment = await checkPaymentStatus();
                
                if (hasPayment) {
                    // Paiement confirmé, vérifier l'email immédiatement
                    await checkEmailStatus();
                    setIsProcessingPaymentReturn(false);
                } else {
                    // Continuer le polling si le paiement n'est pas encore détecté
                    let pollCount = 0;
                    const maxPolls = 5; // 5 tentatives = 10 secondes max
                    
                    const pollInterval = setInterval(async () => {
                        pollCount++;
                        const hasPayment = await checkPaymentStatus();
                        
                        if (hasPayment || pollCount >= maxPolls) {
                            clearInterval(pollInterval);
                            await checkEmailStatus();
                            setIsProcessingPaymentReturn(false);
                        }
                    }, 2000);
                }
            };
            
            handlePaymentReturn();
        } else if (paymentStatus === 'cancelled') {
            window.history.replaceState({}, '', pathname);
            setShowCheckout(true);
            setHasEmail(false);
        }
    }, [user, loading, pathname]);

    const syncInvoicesFromStripe = async () => {
        if (!user) return;

        try {
            console.log('🔄 [CHECKOUT MODAL] Synchronisation des factures depuis Stripe pour user_id:', user.id);
            
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('🔄 [CHECKOUT MODAL] Pas de session pour synchroniser les factures');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')}/functions/v1/stripe-sync-invoices`,
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
                console.error('🔄 [CHECKOUT MODAL] Erreur lors de la synchronisation des factures:', data.error);
            } else {
                console.log('✅ [CHECKOUT MODAL] Factures synchronisées:', data);
            }
        } catch (error) {
            console.error('🔄 [CHECKOUT MODAL] Erreur lors de la synchronisation des factures:', error);
        }
    };

    const checkAllRequirements = async () => {
        if (!user) return;
        
        setIsChecked(true);

        try {
            // 1. Vérifier onboarding
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_configured')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile?.is_configured) {
                setShowOnboarding(true);
                setHasEmail(false);
                return;
            }

            // 2. Vérifier paiement - Même logique que pour SetupEmail
            // Si on arrive à SetupEmail, c'est que le paiement est passé
            // Donc on vérifie : subscriptions actives OU factures payées OU commandes complétées
            console.log('🔍 [CHECKOUT MODAL] Vérification du statut de paiement pour user_id:', user.id);
            
            // Vérifier les subscriptions actives
            const { data: allSubs, error: subsError } = await supabase
                .from('stripe_user_subscriptions')
                .select('status, subscription_type, subscription_id, created_at, updated_at, deleted_at')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .is('deleted_at', null);

            console.log('📊 [CHECKOUT MODAL] Résultat subscriptions actives:', {
                allSubs,
                subsError,
                count: allSubs?.length || 0
            });

            // Vérifier les factures payées (comme dans Stripe)
            const { data: paidInvoices, error: invoicesError } = await supabase
                .from('stripe_invoices')
                .select('invoice_id, status, amount_paid, paid_at')
                .eq('user_id', user.id)
                .eq('status', 'paid')
                .is('deleted_at', null)
                .limit(1);

            console.log('📊 [CHECKOUT MODAL] Résultat factures payées:', {
                paidInvoices,
                invoicesError,
                count: paidInvoices?.length || 0
            });

            // Vérifier les commandes complétées (via customer_id)
            // D'abord récupérer le customer_id
            const { data: customer } = await supabase
                .from('stripe_customers')
                .select('customer_id')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .maybeSingle();

            let hasCompletedOrder = false;
            if (customer?.customer_id) {
                const { data: completedOrders, error: ordersError } = await supabase
                    .from('stripe_orders')
                    .select('id, status, payment_status')
                    .eq('customer_id', customer.customer_id)
                    .eq('status', 'completed')
                    .is('deleted_at', null)
                    .limit(1);

                console.log('📊 [CHECKOUT MODAL] Résultat commandes complétées:', {
                    completedOrders,
                    ordersError,
                    count: completedOrders?.length || 0
                });

                hasCompletedOrder = (completedOrders?.length || 0) > 0;
            } else {
                console.log('📊 [CHECKOUT MODAL] Pas de customer_id trouvé pour vérifier les commandes');
            }

            // Le paiement est passé si : subscription active OU facture payée OU commande complétée
            const hasActiveSubscription = (allSubs?.length || 0) > 0;
            const hasPaidInvoice = (paidInvoices?.length || 0) > 0;
            const hasPayment = hasActiveSubscription || hasPaidInvoice || hasCompletedOrder;

            console.log('✅ [CHECKOUT MODAL] Résultat final:', {
                hasActiveSubscription,
                hasPaidInvoice,
                hasCompletedOrder,
                hasPayment,
                willShowCheckout: !hasPayment
            });

            if (!hasPayment) {
                console.log('⚠️ [CHECKOUT MODAL] Aucun paiement trouvé - Tentative de synchronisation des factures depuis Stripe');
                // Essayer de synchroniser les factures depuis Stripe au cas où elles ne seraient pas encore dans la DB
                syncInvoicesFromStripe();
                
                // Attendre un peu puis re-vérifier
                setTimeout(async () => {
                    const { data: recheckInvoices } = await supabase
                        .from('stripe_invoices')
                        .select('invoice_id, status, amount_paid, paid_at')
                        .eq('user_id', user.id)
                        .eq('status', 'paid')
                        .is('deleted_at', null)
                        .limit(1);
                    
                    if (recheckInvoices && recheckInvoices.length > 0) {
                        console.log('✅ [CHECKOUT MODAL] Factures trouvées après synchronisation - Masquage modal');
                        setShowCheckout(false);
                        checkEmailStatus();
                    } else {
                        console.log('⚠️ [CHECKOUT MODAL] Aucune facture trouvée après synchronisation - Affichage de la modal checkout');
                        setShowCheckout(true);
                        setHasEmail(false);
                    }
                }, 3000);
                return;
            } else {
                console.log('✅ [CHECKOUT MODAL] Paiement trouvé - Pas d\'affichage de la modal checkout');
            }

            // 3. Vérifier email
            const { data: emailData } = await supabase
                .from('email_configurations')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_connected', true);

            const hasConfiguredEmail = (emailData?.length || 0) > 0;

            if (!hasConfiguredEmail) {
                setShowSetupEmail(true);
                setHasEmail(false);
            } else {
                setHasEmail(true);
                // Vérifier les étapes obligatoires de description de l'activité
                checkCompanyInfo();
            }
        } catch (error) {
            console.error('Error checking requirements:', error);
            setHasEmail(true); // En cas d'erreur, laisser passer
        }
    };

    const checkPaymentStatus = async (): Promise<boolean> => {
        if (!user) return false;

        console.log('🔄 [CHECKOUT MODAL] checkPaymentStatus appelé pour user_id:', user.id);

        // Vérifier les subscriptions actives
        const { data: allSubs, error: subsError } = await supabase
            .from('stripe_user_subscriptions')
            .select('status, subscription_type, subscription_id, created_at, updated_at, deleted_at')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .is('deleted_at', null);

        console.log('📊 [CHECKOUT MODAL] checkPaymentStatus - Subscriptions actives:', {
            allSubs,
            subsError,
            count: allSubs?.length || 0
        });

        // Vérifier les factures payées
        const { data: paidInvoices, error: invoicesError } = await supabase
            .from('stripe_invoices')
            .select('invoice_id, status, amount_paid, paid_at')
            .eq('user_id', user.id)
            .eq('status', 'paid')
            .is('deleted_at', null)
            .limit(1);

        console.log('📊 [CHECKOUT MODAL] checkPaymentStatus - Factures payées:', {
            paidInvoices,
            invoicesError,
            count: paidInvoices?.length || 0
        });

        // Vérifier les commandes complétées (via customer_id)
        // D'abord récupérer le customer_id
        const { data: customer } = await supabase
            .from('stripe_customers')
            .select('customer_id')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .maybeSingle();

        let hasCompletedOrder = false;
        if (customer?.customer_id) {
            const { data: completedOrders, error: ordersError } = await supabase
                .from('stripe_orders')
                .select('id, status, payment_status')
                .eq('customer_id', customer.customer_id)
                .eq('status', 'completed')
                .is('deleted_at', null)
                .limit(1);

            console.log('📊 [CHECKOUT MODAL] checkPaymentStatus - Commandes complétées:', {
                completedOrders,
                ordersError,
                count: completedOrders?.length || 0
            });

            hasCompletedOrder = (completedOrders?.length || 0) > 0;
        } else {
            console.log('📊 [CHECKOUT MODAL] checkPaymentStatus - Pas de customer_id trouvé pour vérifier les commandes');
        }

        // Le paiement est passé si : subscription active OU facture payée OU commande complétée
        const hasActiveSubscription = (allSubs?.length || 0) > 0;
        const hasPaidInvoice = (paidInvoices?.length || 0) > 0;
        const hasPayment = hasActiveSubscription || hasPaidInvoice || hasCompletedOrder;

        console.log('✅ [CHECKOUT MODAL] checkPaymentStatus - Résultat final:', {
            hasActiveSubscription,
            hasPaidInvoice,
            hasCompletedOrder,
            hasPayment,
            willShowCheckout: !hasPayment
        });

        if (!hasPayment) {
            console.log('⚠️ [CHECKOUT MODAL] checkPaymentStatus - Aucun paiement trouvé');
            // Synchroniser en arrière-plan sans bloquer l'affichage de la modal
            syncInvoicesFromStripe().then(async () => {
                // Re-vérifier après synchronisation (en arrière-plan)
                const { data: recheckInvoices } = await supabase
                    .from('stripe_invoices')
                    .select('invoice_id, status, amount_paid, paid_at')
                    .eq('user_id', user.id)
                    .eq('status', 'paid')
                    .is('deleted_at', null)
                    .limit(1);
                
                if (recheckInvoices && recheckInvoices.length > 0) {
                    console.log('✅ [CHECKOUT MODAL] checkPaymentStatus - Factures trouvées après synchronisation - Masquage modal');
                    setShowCheckout(false);
                    checkEmailStatus();
                }
            }).catch(err => {
                console.error('Erreur lors de la synchronisation:', err);
            });
            // Retourner false immédiatement pour permettre l'affichage de la modal
            return false;
        } else {
            console.log('✅ [CHECKOUT MODAL] checkPaymentStatus - Paiement trouvé - Masquage modal');
            setShowCheckout(false);
            checkEmailStatus();
            return true;
        }
    };

    const checkEmailStatus = async () => {
        if (!user) return;

        const { data: emailData } = await supabase
            .from('email_configurations')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_connected', true);

        const hasConfiguredEmail = (emailData?.length || 0) > 0;

        if (!hasConfiguredEmail) {
            setShowSetupEmail(true);
            setHasEmail(false); // S'assurer que hasEmail est false pour permettre l'affichage
        } else {
            setShowSetupEmail(false);
            setHasEmail(true);
            // Vérifier les étapes obligatoires de description de l'activité
            checkCompanyInfo();
        }
    };

    const checkCompanyInfo = async () => {
        if (!user) return;

        try {
            const { data: allConfigs } = await supabase
                .from('email_configurations')
                .select('email, company_name, activity_description, services_offered')
                .eq('user_id', user.id)
                .eq('is_connected', true);

            if (!allConfigs || allConfigs.length === 0) return;

            // Vérifier les 3 champs obligatoires : nom, description, signature email
            const accountWithoutInfo = allConfigs.find(
                config => !config.company_name?.trim() || !config.activity_description?.trim() || !config.services_offered?.trim()
            );

            if (accountWithoutInfo) {
                // Rediriger vers settings avec un paramètre pour ouvrir la modal
                if (pathname !== '/settings') {
                    router.push('/settings?companyInfo=required');
                } else {
                    // Si on est déjà sur settings, déclencher l'ouverture via un événement ou un paramètre
                    window.dispatchEvent(new CustomEvent('openCompanyInfoModal'));
                }
            }
        } catch (error) {
            console.error('Error checking company info:', error);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || hasEmail === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loading />
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen">
            <AppNavbar />
            <section className="px-4 py-8">
                {children}
            </section>

            {/* Modals obligatoires */}
            {showOnboarding && user && (
                <OnboardingModal
                    userId={user.id}
                    onComplete={async () => {
                        setShowOnboarding(false);
                        // Vérifier rapidement le statut du paiement
                        const hasPayment = await checkPaymentStatus();
                        // Si aucun paiement, afficher immédiatement la CheckoutModal
                        if (!hasPayment) {
                            setShowCheckout(true);
                        }
                    }}
                />
            )}

            {showCheckout && user && (
                <CheckoutModal
                    userId={user.id}
                    onComplete={() => {
                        setShowCheckout(false);
                        checkEmailStatus();
                    }}
                />
            )}


            {showSetupEmail && user && (
                <SetupEmailModal
                    userId={user.id}
                    onComplete={() => {
                        // Fermer toutes les modals
                        setShowOnboarding(false);
                        setShowCheckout(false);
                        setShowSetupEmail(false);
                        setHasEmail(true);
                        setTimeout(() => {
                            checkCompanyInfo();
                        }, 1000);
                    }}
                />
            )}
        </main>
    );
}