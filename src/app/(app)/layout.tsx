'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import AppNavbar from '@/components/layout/AppNavbar';
import { supabase } from '@/lib/supabase';
import { OnboardingModal } from '@/components/OnBoardingModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { SetupEmailModal } from '@/components/SetupEmailModal';

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

    // Vérifier tout en une seule fois au chargement
    useEffect(() => {
        if (!user || loading || isChecked) return;
        checkAllRequirements();
    }, [user, loading]);

    // Gérer le retour du paiement Stripe
    useEffect(() => {
        if (!user || loading) return;
        
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        
        if (paymentStatus === 'success') {
            // Nettoyer l'URL
            window.history.replaceState({}, '', pathname);
            
            // Polling pour attendre la mise à jour du webhook
            const pollInterval = setInterval(() => {
                checkPaymentStatus();
                checkEmailStatus();
            }, 2000);
            
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 10000);
        } else if (paymentStatus === 'cancelled') {
            window.history.replaceState({}, '', pathname);
            setShowCheckout(true);
        }
    }, [user, loading, pathname]);

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

            // 2. Vérifier paiement
            const { data: allSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('status, subscription_type')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .is('deleted_at', null);

            const hasActiveSubscription = (allSubs?.length || 0) > 0;

            if (!hasActiveSubscription) {
                setShowCheckout(true);
                setHasEmail(false);
                return;
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

    const checkPaymentStatus = async () => {
        if (!user) return;

        const { data: allSubs } = await supabase
            .from('stripe_user_subscriptions')
            .select('status, subscription_type')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .is('deleted_at', null);

        const hasActiveSubscription = (allSubs?.length || 0) > 0;

        if (!hasActiveSubscription) {
            setShowCheckout(true);
        } else {
            setShowCheckout(false);
            checkEmailStatus();
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
                .select('email, company_name, activity_description, services_offered, signature_image_base64')
                .eq('user_id', user.id);

            if (!allConfigs || allConfigs.length === 0) return;

            // Vérifier les 4 champs obligatoires (sans la base de connaissances)
            const accountWithoutInfo = allConfigs.find(
                config => !config.company_name || !config.activity_description || !config.services_offered || !config.signature_image_base64
            );

            if (accountWithoutInfo) {
                // Rediriger vers settings avec un paramètre pour ouvrir la modal
                router.push('/settings?companyInfo=required');
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <AppNavbar />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>

            {/* Modals obligatoires */}
            {showOnboarding && user && (
                <OnboardingModal
                    userId={user.id}
                    onComplete={() => {
                        setShowOnboarding(false);
                        checkPaymentStatus();
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
                        setShowSetupEmail(false);
                        setHasEmail(true);
                        // Vérifier les étapes obligatoires après la configuration de l'email
                        setTimeout(() => {
                            checkCompanyInfo();
                        }, 1000);
                    }}
                />
            )}
        </div>
    );
}