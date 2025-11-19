'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, FileText, Globe, Share2, X, Check, Lock, ChevronRight, Eye, EyeOff, Edit2Icon, Mail, Upload, Loader2, Download, AlertCircle, HelpCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { CheckoutModal } from '@/components/CheckoutModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { HowItWorks } from '@/components/HowItWork';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/components/Toast';
import { syncKnowledgeBase, fileToBase64, isValidUrl, validatePdfFile } from '@/utils/knowledgeBaseService';

interface EmailAccount {
    id: string;
    email: string;
    provider: string;
    is_active?: boolean;
    cancel_at_period_end?: boolean;
    subscription_status?: string;
}

interface Document {
    id: string;
    name: string;
}

export default function Settings() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{ index: number; subscription_id: string } | null>(null);
    const [unlinkedSubscriptions, setUnlinkedSubscriptions] = useState<{ subscription_id: string }[]>([]);
    const [autoSort, setAutoSort] = useState(false);
    const [adFilter, setAdFilter] = useState(true);
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);
    const [showImapModal, setShowImapModal] = useState(false);
    const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
    const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);
    const [companyInfoStep, setCompanyInfoStep] = useState(1);
    const [accountMissingInfo, setAccountMissingInfo] = useState<string>('');
    const [hasCheckedCompanyInfo, setHasCheckedCompanyInfo] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<{ id: string; email: string; provider: string } | null>(null);
    const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
    const [duplicateEmail, setDuplicateEmail] = useState<string>('');
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [allowedAccounts, setAllowedAccounts] = useState(1);
    const [currentAdditionalAccounts, setCurrentAdditionalAccounts] = useState(0);
    const [hasEverHadSubscription, setHasEverHadSubscription] = useState(false);
    const [companyFormData, setCompanyFormData] = useState({
        company_name: '',
        activity_description: '',
        services_proposed: '',
        services_offered: '',
        signature_image_base64: '',
    });
    const [imapFormData, setImapFormData] = useState({
        email: '',
        password: '',
        imap_host: '',
        imap_port: '993',
    });
    const [testingConnection, setTestingConnection] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [testSuccess, setTestSuccess] = useState(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
    const [isCanceled, setIsCanceled] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [showEditCompanyNameModal, setShowEditCompanyNameModal] = useState(false);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);
    const [showEditSignatureModal, setShowEditSignatureModal] = useState(false);
    const [showEditLogoModal, setShowEditLogoModal] = useState(false);
    const [editTempValue, setEditTempValue] = useState('');
    const [totalPaidSlots, setTotalPaidSlots] = useState(0); // Nombre total d'emails payés (base + additionnels)
    
    // Knowledge base states
    const [currentConfig, setCurrentConfig] = useState<{ id: string; email: string; knowledge_base_urls: any; knowledge_base_pdfs: any } | null>(null);
    const [knowledgeUrls, setKnowledgeUrls] = useState<string[]>(['']);
    const [knowledgePdfFiles, setKnowledgePdfFiles] = useState<File[]>([]);
    const [knowledgeSaving, setKnowledgeSaving] = useState(false);
    const [isDraggingPdf, setIsDraggingPdf] = useState(false);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);

    useEffect(() => {
        loadAccounts();
        loadDocuments();
        checkSubscription();
    }, [user]);


    useEffect(() => {
        if (selectedAccount) {
            loadCompanyData();
            loadCurrentConfig();
            // Réinitialiser le flag quand on change de compte
            setHasCheckedCompanyInfo(false);
            // Vérifier si le compte nécessite une configuration
            checkCompanyInfoForAccount();
        }
    }, [selectedAccount, user]);

    const checkCompanyInfoForAccount = async () => {
        if (!user || !selectedAccount) return;
        
        // Ne pas ouvrir automatiquement si la modal est déjà ouverte ou si on a déjà vérifié
        if (showCompanyInfoModal || hasCheckedCompanyInfo) return;

        try {
            const { data: config } = await supabase
                .from('email_configurations')
                .select('company_name, activity_description, services_offered, signature_image_base64, services_proposed')
                .eq('user_id', user.id)
                .eq('email', selectedAccount.email)
                .maybeSingle();

            // Vérifier si les champs obligatoires sont manquants
            const isMissingMandatoryInfo = !config || !config.company_name?.trim() || !config.activity_description?.trim();

            if (isMissingMandatoryInfo) {
                // Charger les données existantes dans le formulaire
                if (config) {
                    setCompanyFormData({
                        company_name: config.company_name || '',
                        activity_description: config.activity_description || '',
                        services_proposed: config.services_proposed || '',
                        services_offered: config.services_offered || '',
                        signature_image_base64: config.signature_image_base64 || '',
                    });
                } else {
                    setCompanyFormData({
                        company_name: '',
                        activity_description: '',
                        services_proposed: '',
                        services_offered: '',
                        signature_image_base64: '',
                    });
                }

                // Déterminer l'étape de départ
                let startStep = 1;
                if (config) {
                    if (!config.company_name?.trim()) {
                        startStep = 1;
                    } else if (!config.activity_description?.trim()) {
                        startStep = 2;
                    } else if (!config.services_offered?.trim()) {
                        startStep = 3;
                    } else if (!config.signature_image_base64?.trim()) {
                        startStep = 4;
                    } else {
                        startStep = 5;
                    }
                }

                setCompanyInfoStep(startStep);
                setAccountMissingInfo(selectedAccount.email);
                setHasCheckedCompanyInfo(true);
                
                // Ouvrir la modal après un court délai pour laisser le temps au chargement
                setTimeout(() => {
                    setShowCompanyInfoModal(true);
                }, 300);
            } else {
                // Si les informations sont complètes, s'assurer que la modal est fermée
                setShowCompanyInfoModal(false);
                setAccountMissingInfo('');
                setHasCheckedCompanyInfo(true);
            }
        } catch (error) {
            console.error('Error checking company info:', error);
        }
    };

    useEffect(() => {
        const handleOAuthMessage = async (event: MessageEvent) => {
            if (event.data.type === 'gmail-duplicate' || event.data.type === 'outlook-duplicate') {
                setDuplicateEmail(event.data.email);
                setShowDuplicateEmailModal(true);
            } else if (event.data.type === 'gmail-connected' || event.data.type === 'outlook-connected') {
                // Rediriger vers settings si on n'y est pas déjà
                if (window.location.pathname !== '/settings') {
                    router.push('/settings');
                }
                loadAccounts();
                checkSubscription();
                setShowAddAccountModal(false);
            }
        };

        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, [user, router]);

    // Détecter le retour du paiement Stripe
    useEffect(() => {
        const upgraded = searchParams.get('upgrade');
        
        if (upgraded === 'success') {
            router.replace('/settings');
            handleUpgradeReturn();
        }
    }, [searchParams]);


    const handleUpgradeReturn = async () => {
        // Forcer la synchronisation avec Stripe
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-force-sync`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
            }
        } catch (error) {
        }
        
        // Rafraîchir les données
        await fetchPaidEmailSlots();
        await checkSubscription();
        await loadAccounts();
        
        // Polling pendant 10 secondes
        const pollInterval = setInterval(async () => {
            await fetchPaidEmailSlots();
        }, 2000);
        
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 10000);
    };

    const checkSubscription = async () => {
        if (!user) return;

        try {
            const { data: allSubs, error } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_type, status, cancel_at_period_end, current_period_end')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (error) {
                // Si la table n'existe pas ou si les colonnes sont manquantes, utiliser des valeurs par défaut
                if (error.code === '42P01' || error.code === '42703' || error.message?.includes('does not exist') || error.message?.includes('column')) {
                    setHasEverHadSubscription(false);
                    setHasActiveSubscription(false);
                    setCurrentAdditionalAccounts(0);
                    setAllowedAccounts(1);
                    return;
                }
                throw error;
            }

            const hasAnySubscription = (allSubs?.length || 0) > 0;
            setHasEverHadSubscription(hasAnySubscription);

            const premierSub = allSubs?.find(s => s.subscription_type === 'premier' && ['active', 'trialing'].includes(s.status));

            const isActive = !!premierSub;
            setHasActiveSubscription(isActive);
            setIsCanceled(premierSub?.cancel_at_period_end || false);

            if (premierSub?.current_period_end) {
                setSubscriptionEndDate(new Date(premierSub.current_period_end * 1000));
            }

            if (isActive) {
                const additionalSubs = allSubs?.filter(s =>
                    s.subscription_type === 'additional_account' &&
                    ['active', 'trialing'].includes(s.status)
                ) || [];

                const additionalAccounts = additionalSubs.length;
                setCurrentAdditionalAccounts(additionalAccounts);
                setAllowedAccounts(1 + additionalAccounts);
            } else {
                setCurrentAdditionalAccounts(0);
                setAllowedAccounts(1);
            }

            // Récupérer le nombre d'emails payés depuis stripe_subscriptions
            await fetchPaidEmailSlots();
        } catch (error) {
            // En cas d'erreur, utiliser des valeurs par défaut
            setHasEverHadSubscription(false);
            setHasActiveSubscription(false);
            setCurrentAdditionalAccounts(0);
            setAllowedAccounts(1);
        }
    };

    const fetchPaidEmailSlots = async () => {
        if (!user) return;

        try {
            
            // Compter DIRECTEMENT depuis stripe_user_subscriptions (pas stripe_subscriptions)
            const { data: allSubs, error: subsError } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_type, status, subscription_id')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .is('deleted_at', null);


            if (subsError) {
                // Si la table n'existe pas ou si les colonnes sont manquantes
                if (subsError.code === '42P01' || subsError.code === '42703' || subsError.message?.includes('does not exist') || subsError.message?.includes('column')) {
                    console.warn('stripe_user_subscriptions table or columns not found:', subsError);
                    setTotalPaidSlots(0);
                    return;
                }
                console.error('Erreur lors de la récupération:', subsError);
                setTotalPaidSlots(0);
                return;
            }

            if (!allSubs || allSubs.length === 0) {
                setTotalPaidSlots(0);
                return;
            }

            // Compter : 1 pour le plan de base + quantité pour chaque subscription additionnelle
            const premierCount = allSubs.filter(s => s.subscription_type === 'premier').length;
            
            // Récupérer la quantité réelle depuis Stripe pour chaque subscription additionnelle
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('⚠️ Pas de session pour récupérer les quantités');
                const additionalCount = allSubs.filter(s => s.subscription_type === 'additional_account').length;
                const total = premierCount > 0 ? 1 + additionalCount : 0;
                setTotalPaidSlots(total);
                return;
            }

            // Récupérer les quantités depuis Stripe via une fonction backend
            let totalAdditionalQuantity = 0;
            const additionalSubs = allSubs.filter(s => s.subscription_type === 'additional_account');
            
            
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
                    } else {
                        console.warn(`⚠️ Impossible de récupérer la quantité pour ${sub.subscription_id}, utilisation de 1 par défaut`);
                        totalAdditionalQuantity += 1; // Fallback : 1 par défaut
                    }
                } catch (error) {
                    console.error(`❌ Erreur lors de la récupération de la quantité pour ${sub.subscription_id}:`, error);
                    totalAdditionalQuantity += 1; // Fallback : 1 par défaut
                }
            }
            
            const total = premierCount > 0 ? 1 + totalAdditionalQuantity : 0;
            
            
            setTotalPaidSlots(total);
        } catch (error) {
            console.error('Error fetching paid email slots:', error);
            setTotalPaidSlots(0);
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

    const handleUpgrade = async () => {
        setShowUpgradeModal(false);
        
        // Forcer la synchronisation avec Stripe immédiatement
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-force-sync`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
            }
        } catch (error) {
        }
        
        // Attendre un peu puis rafraîchir
        setTimeout(async () => {
            await fetchPaidEmailSlots();
            await checkSubscription();
            await loadAccounts();
        }, 2000);
        
        // Polling pour vérifier les changements toutes les 2 secondes pendant 10 secondes
        const pollInterval = setInterval(async () => {
            await fetchPaidEmailSlots();
        }, 2000);
        
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 10000);
    };

    const handleSubscribe = async () => {
        setIsCheckoutLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                setIsCheckoutLoading(false);
                return;
            }

            const basePlanPriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID;

            if (!basePlanPriceId) {
                showToast('Configuration Stripe manquante', 'error');
                setIsCheckoutLoading(false);
                return;
            }

            const successUrl = `${window.location.origin}/dashboard`;
            const cancelUrl = `${window.location.origin}/dashboard`;

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
                showToast(`Erreur: ${data.error}`, 'error');
                setIsCheckoutLoading(false);
                return;
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            showToast('Erreur lors de la création de la session de paiement', 'error');
            setIsCheckoutLoading(false);
        }
    };

    const loadAccounts = async () => {
        if (!user) return;

        try {
            const { data: profileExists, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Profile check error:', profileError);
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                router.push('/');
                return;
            }

            if (!profileExists) {
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                router.push('/');
                return;
            }

            const { data: emailConfigs, error: configError } = await supabase
                .from('email_configurations')
                .select('id, email, provider, is_active, gmail_token_id, outlook_token_id')
                .eq('user_id', user.id);

            if (configError) {
                console.error('Email configs error:', configError);
                if (configError.message?.includes('JWT') || configError.message?.includes('session')) {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    sessionStorage.clear();
                    router.push('/');
                }
                return;
            }

            // Charger les informations d'abonnement
            const { data: allSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_id, status, cancel_at_period_end, subscription_type, email_configuration_id')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            const allAccounts: EmailAccount[] = (emailConfigs || []).map(config => {
                let subscriptionInfo = {};

                const configSubs = allSubs?.filter(s => s.email_configuration_id === config.id) || [];

                const activeSub = configSubs.find(s =>
                    ['active', 'trialing'].includes(s.status)
                );

                if (activeSub) {
                    subscriptionInfo = {
                        cancel_at_period_end: activeSub.cancel_at_period_end,
                        subscription_status: activeSub.status
                    };
                }

                return {
                    id: config.id,
                    email: config.email,
                    provider: config.provider || 'imap',
                    is_active: config.is_active !== false,
                    ...subscriptionInfo
                };
            });

            // Trier les comptes : actifs d'abord (alphabétique), puis désactivés (alphabétique)
            const sortedAccounts = allAccounts.sort((a, b) => {
                const aIsDisabled = a.is_active === false || a.cancel_at_period_end === true;
                const bIsDisabled = b.is_active === false || b.cancel_at_period_end === true;
                
                // Si un compte est désactivé et l'autre non, le compte actif vient en premier
                if (aIsDisabled && !bIsDisabled) return 1;
                if (!aIsDisabled && bIsDisabled) return -1;
                
                // Si les deux sont dans le même état, trier par ordre alphabétique
                return a.email.localeCompare(b.email);
            });

            setAccounts(sortedAccounts);

            // Récupérer les subscriptions non liées (slots non configurés)
            const { data: unlinkedSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_id')
                .eq('user_id', user.id)
                .eq('subscription_type', 'additional_account')
                .is('email_configuration_id', null)
                .in('status', ['active', 'trialing'])
                .is('deleted_at', null)
                .order('created_at', { ascending: true });
            
            setUnlinkedSubscriptions(unlinkedSubs || []);

            if (allAccounts.length === 0) {
                setSelectedAccount(null);
                setCompanyFormData({
                    company_name: '',
                    activity_description: '',
                    services_proposed: '',
                    services_offered: '',
                    signature_image_base64: '',
                });
                return;
            }

            const currentAccountStillExists = allAccounts.find(
                acc => acc.id === selectedAccount?.id && acc.provider === selectedAccount?.provider
            );

            if (!currentAccountStillExists) {
                // Sélectionner le premier compte ACTIF (non désactivé et non en résiliation)
                const firstActiveAccount = allAccounts.find(acc => 
                    acc.is_active !== false && acc.cancel_at_period_end !== true
                );
                setSelectedAccount(firstActiveAccount || allAccounts[0]);
            } else if (!selectedAccount) {
                // Sélectionner le premier compte ACTIF (non désactivé et non en résiliation)
                const firstActiveAccount = allAccounts.find(acc => 
                    acc.is_active !== false && acc.cancel_at_period_end !== true
                );
                setSelectedAccount(firstActiveAccount || allAccounts[0]);
            }
        } catch (err) {
            console.error('Load accounts error:', err);
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            router.push('/');
        }
    };


    const loadPrimaryAccountData = async () => {
        if (!user) return null;

        // Charger le premier compte avec des informations complètes
        const { data: allConfigs } = await supabase
            .from('email_configurations')
            .select('company_name, activity_description, services_proposed, services_offered, signature_image_base64')
            .eq('user_id', user.id)
            .not('company_name', 'is', null)
            .not('activity_description', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        return allConfigs;
    };

    const loadCompanyData = async () => {
        if (!user) return;

        const emailToLoad = selectedAccount?.email;
        if (!emailToLoad) return;

        const { data: config } = await supabase
            .from('email_configurations')
            .select('company_name, activity_description, services_offered, is_classement, signature_image_base64')
            .eq('user_id', user.id)
            .eq('email', emailToLoad)
            .maybeSingle();

        if (config) {
            setCompanyFormData({
                company_name: config.company_name || '',
                activity_description: config.activity_description || '',
                services_proposed: (config as any).services_proposed || '',
                services_offered: config.services_offered || '',
                signature_image_base64: config.signature_image_base64 || '',
            });
            setAutoSort(config.is_classement ?? false);
        } else {
            setCompanyFormData({
                company_name: '',
                activity_description: '',
                services_proposed: '',
                services_offered: '',
                signature_image_base64: '',
            });
            setAutoSort(false);
        }
    };

    const loadCurrentConfig = async () => {
        if (!user || !selectedAccount) return;

        try {
            // Essayer d'abord avec toutes les colonnes (y compris knowledge_base)
            const { data, error } = await supabase
                .from('email_configurations')
                .select('id, email, knowledge_base_urls, knowledge_base_pdfs')
                .eq('user_id', user.id)
                .eq('email', selectedAccount.email)
                .maybeSingle();

            if (error) {
                // Si erreur 400 (colonnes n'existent pas), essayer sans ces colonnes
                if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
                    console.warn('Knowledge base columns not found, using basic query');
                    const { data: basicData } = await supabase
                        .from('email_configurations')
                        .select('id, email')
                        .eq('user_id', user.id)
                        .eq('email', selectedAccount.email)
                        .maybeSingle();

                    if (basicData) {
                        setCurrentConfig({
                            id: basicData.id,
                            email: basicData.email,
                            knowledge_base_urls: null,
                            knowledge_base_pdfs: null,
                        });
                    } else {
                        setCurrentConfig(null);
                    }
                } else {
                    console.error('Error loading config:', error);
                    setCurrentConfig(null);
                }
                setKnowledgeUrls(['']);
                return;
            }

            if (data) {
                setCurrentConfig({
                    id: data.id,
                    email: data.email,
                    knowledge_base_urls: data.knowledge_base_urls || null,
                    knowledge_base_pdfs: data.knowledge_base_pdfs || null,
                });
                setKnowledgeUrls(['']);
            } else {
                setCurrentConfig(null);
                setKnowledgeUrls(['']);
            }
        } catch (err) {
            console.error('Error in loadCurrentConfig:', err);
            setCurrentConfig(null);
            setKnowledgeUrls(['']);
        }
    };

    const handleKnowledgeUrlChange = (index: number, value: string) => {
        const newUrls = [...knowledgeUrls];
        newUrls[index] = value;
        setKnowledgeUrls(newUrls);
    };

    const handleAddKnowledgeUrl = () => {
        setKnowledgeUrls([...knowledgeUrls, '']);
    };

    const handleRemoveKnowledgeUrl = (index: number) => {
        if (knowledgeUrls.length > 1) {
            setKnowledgeUrls(knowledgeUrls.filter((_, i) => i !== index));
        }
    };

    const handleRemoveExistingUrl = async (index: number) => {
        if (!currentConfig) return;

        const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette URL de la base de connaissances ?');
        if (!confirmDelete) return;

        try {
            const existingUrls = currentConfig.knowledge_base_urls ?
                (Array.isArray(currentConfig.knowledge_base_urls) ? currentConfig.knowledge_base_urls : JSON.parse(currentConfig.knowledge_base_urls || '[]')) :
                [];

            const updatedUrls = existingUrls.filter((_: any, i: number) => i !== index);

            const { error } = await supabase
                .from('email_configurations')
                .update({
                    knowledge_base_urls: JSON.stringify(updatedUrls),
                    knowledge_base_synced_at: new Date().toISOString(),
                })
                .eq('id', currentConfig.id);

            if (error) throw error;

            setCurrentConfig({
                ...currentConfig,
                knowledge_base_urls: updatedUrls,
            });

            setKnowledgeUrls(updatedUrls.length > 0 ? updatedUrls : ['']);

            showToast('URL supprimée avec succès', 'success');
        } catch (err) {
            console.error('Error removing URL:', err);
            showToast('Erreur lors de la suppression de l\'URL', 'error');
        }
    };

    const handleKnowledgePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const validation = validatePdfFile(file);

            if (!validation.valid) {
                showToast(`${file.name}: ${validation.error || 'Fichier invalide'}`, 'error');
                continue;
            }

            newFiles.push(file);
        }

        if (newFiles.length > 0) {
            setKnowledgePdfFiles([...knowledgePdfFiles, ...newFiles]);
        }

        e.target.value = '';
    };

    const handleRemovePdf = (index: number) => {
        setKnowledgePdfFiles(knowledgePdfFiles.filter((_, i) => i !== index));
    };

    const handleDownloadPdf = (pdfName: string, pdfBase64: string) => {
        try {
            const byteCharacters = atob(pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = pdfName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erreur lors du téléchargement du PDF:', error);
            showToast('Erreur lors du téléchargement du PDF', 'error');
        }
    };

    const handleRemoveExistingPdf = async (index: number) => {
        if (!currentConfig) return;

        const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer ce PDF de la base de connaissances ?');
        if (!confirmDelete) return;

        try {
            const existingPdfs = currentConfig.knowledge_base_pdfs ?
                (Array.isArray(currentConfig.knowledge_base_pdfs) ? currentConfig.knowledge_base_pdfs : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')) :
                [];

            const updatedPdfs = existingPdfs.filter((_: any, i: number) => i !== index);

            const { error } = await supabase
                .from('email_configurations')
                .update({
                    knowledge_base_pdfs: JSON.stringify(updatedPdfs),
                    knowledge_base_synced_at: new Date().toISOString(),
                })
                .eq('id', currentConfig.id);

            if (error) throw error;

            setCurrentConfig({
                ...currentConfig,
                knowledge_base_pdfs: updatedPdfs,
            });

            showToast('PDF supprimé avec succès', 'success');
        } catch (err) {
            console.error('Error removing PDF:', err);
            showToast('Erreur lors de la suppression du PDF', 'error');
        }
    };

    const handlePdfDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(true);
    };

    const handlePdfDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(false);
    };

    const handlePdfDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handlePdfDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const newFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (file.type !== 'application/pdf') {
                showToast(`${file.name}: Ce fichier n'est pas un PDF`, 'error');
                continue;
            }

            const validation = validatePdfFile(file);
            if (!validation.valid) {
                showToast(`${file.name}: ${validation.error || 'Fichier invalide'}`, 'error');
                continue;
            }

            newFiles.push(file);
        }

        if (newFiles.length > 0) {
            setKnowledgePdfFiles([...knowledgePdfFiles, ...newFiles]);
        }
    };

    const handleSaveKnowledge = async () => {
        if (!currentConfig) return;

        const newUrls = knowledgeUrls.filter(url => url.trim() !== '');

        const existingUrls = currentConfig.knowledge_base_urls ?
            (Array.isArray(currentConfig.knowledge_base_urls) ? currentConfig.knowledge_base_urls : JSON.parse(currentConfig.knowledge_base_urls || '[]')) :
            [];

        const existingPdfs = currentConfig.knowledge_base_pdfs ?
            (Array.isArray(currentConfig.knowledge_base_pdfs) ? currentConfig.knowledge_base_pdfs : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')) :
            [];

        if (newUrls.length === 0 && knowledgePdfFiles.length === 0 && existingUrls.length === 0 && existingPdfs.length === 0) {
            showToast('Veuillez fournir au moins une URL ou un fichier PDF', 'warning');
            return;
        }

        for (const url of newUrls) {
            if (!isValidUrl(url)) {
                showToast(`URL invalide: ${url}`, 'error');
                return;
            }
        }

        setKnowledgeSaving(true);

        try {
            const newPdfsWithBase64: Array<{ name: string; base64: string }> = [];

            for (const file of knowledgePdfFiles) {
                try {
                    const base64 = await fileToBase64(file);
                    newPdfsWithBase64.push({
                        name: file.name,
                        base64: base64
                    });
                } catch (conversionError) {
                    throw new Error(`Erreur lors de la conversion de ${file.name}`);
                }
            }

            const allUrls = [...existingUrls, ...newUrls];
            const allPdfs = [...existingPdfs, ...newPdfsWithBase64];

            const result = await syncKnowledgeBase({
                email: currentConfig.email,
                id: currentConfig.id,
                urls: allUrls.length > 0 ? allUrls : undefined,
                pdfs: allPdfs.length > 0 ? allPdfs : undefined,
            });

            if (!result.success) {
                throw new Error(result.error || 'Échec de la synchronisation');
            }

            const updateData: any = {
                knowledge_base_synced_at: new Date().toISOString(),
            };

            if (allUrls.length > 0) {
                updateData.knowledge_base_urls = JSON.stringify(allUrls);
            }

            if (allPdfs.length > 0) {
                updateData.knowledge_base_pdfs = JSON.stringify(allPdfs);
            }

            const { error: dbError } = await supabase
                .from('email_configurations')
                .update(updateData)
                .eq('id', currentConfig.id);

            if (dbError) {
                // Si les colonnes n'existent pas encore, informer l'utilisateur
                if (dbError.code === '42703' || dbError.message?.includes('column') || dbError.message?.includes('does not exist')) {
                    console.error('Knowledge base columns not found. Please run migration:', dbError);
                    showToast('Les colonnes de base de connaissances ne sont pas encore créées. Veuillez appliquer la migration.', 'error');
                } else {
                    throw dbError;
                }
                return;
            }

            showToast('Base de connaissance enregistrée avec succès !', 'success');
            await loadCurrentConfig();
            setKnowledgePdfFiles([]);
        } catch (err) {
            console.error('Error saving knowledge base:', err);
            showToast(err instanceof Error ? err.message : 'Une erreur est survenue', 'error');
        } finally {
            setKnowledgeSaving(false);
        }
    };

    const handleEditCompanyInfo = async () => {
        if (!user || !selectedAccount) return;

        // Charger les données existantes
        const { data: config } = await supabase
            .from('email_configurations')
            .select('company_name, activity_description, services_offered, signature_image_base64, services_proposed')
            .eq('user_id', user.id)
            .eq('email', selectedAccount.email)
            .maybeSingle();

        if (config) {
            // Charger les données dans le formulaire
            setCompanyFormData({
                company_name: config.company_name || '',
                activity_description: config.activity_description || '',
                services_proposed: config.services_proposed || '',
                services_offered: config.services_offered || '',
                signature_image_base64: config.signature_image_base64 || '',
            });

            // Déterminer l'étape de départ en fonction des données complétées
            let startStep = 1;
            if (!config.company_name?.trim()) {
                startStep = 1;
            } else if (!config.activity_description?.trim()) {
                startStep = 2;
            } else if (!config.services_offered?.trim()) {
                startStep = 3;
            } else if (!config.signature_image_base64?.trim()) {
                startStep = 4;
            } else {
                startStep = 5;
            }

            setCompanyInfoStep(startStep);
        } else {
            // Aucune donnée existante, commencer à l'étape 1
            setCompanyFormData({
                company_name: '',
                activity_description: '',
                services_proposed: '',
                services_offered: '',
                signature_image_base64: '',
            });
            setCompanyInfoStep(1);
        }

        setShowCompanyInfoModal(true);
    };

    const handleCompanyInfoNext = async () => {
        // Validation uniquement pour les étapes obligatoires (1 et 2)
        if (companyInfoStep === 1 && !companyFormData.company_name?.trim()) {
            showToast('Veuillez entrer le nom de votre entreprise', 'warning');
            return;
        }
        if (companyInfoStep === 2 && !companyFormData.activity_description?.trim()) {
            showToast('Veuillez décrire votre activité et les services proposés', 'warning');
            return;
        }

        // Sauvegarder automatiquement après chaque étape
        await saveCompanyInfoProgress();

        if (companyInfoStep < 5) {
            setCompanyInfoStep(companyInfoStep + 1);
        } else {
            handleCompanyInfoSubmit();
        }
    };

    const saveCompanyInfoProgress = async () => {
        try {
            const emailToUpdate = accountMissingInfo || selectedAccount?.email;
            if (!emailToUpdate || !user) return;

            // Vérifier si une configuration existe déjà
            const { data: existingConfig } = await supabase
                .from('email_configurations')
                .select('id')
                .eq('user_id', user.id)
                .eq('email', emailToUpdate)
                .maybeSingle();

            if (existingConfig) {
                // Mettre à jour la configuration existante
                await supabase
                    .from('email_configurations')
                    .update({
                        company_name: companyFormData.company_name || null,
                        activity_description: companyFormData.activity_description || null,
                        services_proposed: companyFormData.services_proposed || null,
                        services_offered: companyFormData.services_offered || null,
                        signature_image_base64: companyFormData.signature_image_base64 || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingConfig.id);
            } else {
                // Créer une nouvelle configuration si elle n'existe pas
                const { data: account } = await supabase
                    .from('email_configurations')
                    .select('provider, gmail_token_id, outlook_token_id')
                    .eq('user_id', user.id)
                    .eq('email', emailToUpdate)
                    .maybeSingle();

                if (account) {
                    await supabase
                        .from('email_configurations')
                        .update({
                            company_name: companyFormData.company_name || null,
                            activity_description: companyFormData.activity_description || null,
                            services_proposed: companyFormData.services_proposed || null,
                            services_offered: companyFormData.services_offered || null,
                            signature_image_base64: companyFormData.signature_image_base64 || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('user_id', user.id)
                        .eq('email', emailToUpdate);
                }
            }
        } catch (err) {
            console.error('Error saving progress:', err);
        }
    };

    const handleCompanyInfoBack = () => {
        if (companyInfoStep > 1) {
            setCompanyInfoStep(companyInfoStep - 1);
        }
    };

    const handleCompanyInfoSubmit = async () => {
        try {
            const emailToUpdate = accountMissingInfo || selectedAccount?.email;

            if (!emailToUpdate || !user) {
                showToast('Aucun compte identifié', 'error');
                return;
            }

            // Vérifier que les 2 étapes obligatoires sont complètes (nom et description)
            const isMandatoryComplete = 
                companyFormData.company_name?.trim() &&
                companyFormData.activity_description?.trim();

            if (!isMandatoryComplete) {
                showToast('Veuillez compléter les étapes obligatoires (nom et description)', 'warning');
                return;
            }

            const { data: existingConfig } = await supabase
                .from('email_configurations')
                .select('id, gmail_token_id, outlook_token_id')
                .eq('user_id', user.id)
                .eq('email', emailToUpdate)
                .maybeSingle();

            if (existingConfig) {
                const { error } = await supabase
                    .from('email_configurations')
                    .update({
                        company_name: companyFormData.company_name,
                        activity_description: companyFormData.activity_description,
                        services_proposed: companyFormData.services_proposed,
                        services_offered: companyFormData.services_offered,
                        signature_image_base64: companyFormData.signature_image_base64 || null,
                        is_classement: isMandatoryComplete ? true : false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingConfig.id);

                if (error) throw error;

                if (isMandatoryComplete) {
                    if (existingConfig.gmail_token_id) {
                        await supabase
                            .from('gmail_tokens')
                            .update({ is_classement: true })
                            .eq('id', existingConfig.gmail_token_id);
                    }

                    if (existingConfig.outlook_token_id) {
                        await supabase
                            .from('outlook_tokens')
                            .update({ is_classement: true })
                            .eq('id', existingConfig.outlook_token_id);
                    }
                }
            }

            setShowCompanyInfoModal(false);
            setShowSuccessModal(true);
            setCompanyInfoStep(1);
            setAccountMissingInfo('');
            await loadCompanyData();
            // Ne pas rouvrir automatiquement après avoir complété
        } catch (err) {
            showToast('Erreur lors de l\'enregistrement des informations', 'error');
        }
    };

    const handleCompanyInfoFinish = async () => {
        // Pour les étapes optionnelles (3, 4, 5), on peut terminer sans compléter
        // Sauvegarder d'abord les données actuelles
        await saveCompanyInfoProgress();
        
        // Ensuite, valider et soumettre (qui vérifie les étapes obligatoires)
        try {
            const emailToUpdate = accountMissingInfo || selectedAccount?.email;
            if (!emailToUpdate || !user) {
                setShowCompanyInfoModal(false);
                await loadCompanyData();
                return;
            }

            // Vérifier que les 2 étapes obligatoires sont complètes
            const isMandatoryComplete = 
                companyFormData.company_name?.trim() &&
                companyFormData.activity_description?.trim();

            const { data: existingConfig } = await supabase
                .from('email_configurations')
                .select('id, gmail_token_id, outlook_token_id')
                .eq('user_id', user.id)
                .eq('email', emailToUpdate)
                .maybeSingle();

            if (existingConfig) {
                await supabase
                    .from('email_configurations')
                    .update({
                        company_name: companyFormData.company_name,
                        activity_description: companyFormData.activity_description,
                        services_proposed: companyFormData.services_proposed,
                        services_offered: companyFormData.services_offered,
                        signature_image_base64: companyFormData.signature_image_base64 || null,
                        is_classement: isMandatoryComplete ? true : false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingConfig.id);

                if (isMandatoryComplete) {
                    if (existingConfig.gmail_token_id) {
                        await supabase
                            .from('gmail_tokens')
                            .update({ is_classement: true })
                            .eq('id', existingConfig.gmail_token_id);
                    }

                    if (existingConfig.outlook_token_id) {
                        await supabase
                            .from('outlook_tokens')
                            .update({ is_classement: true })
                            .eq('id', existingConfig.outlook_token_id);
                    }
                }
            }

            setShowCompanyInfoModal(false);
            setCompanyInfoStep(1);
            setAccountMissingInfo('');
            setHasCheckedCompanyInfo(true); // Marquer comme vérifié pour éviter de rouvrir
            await loadCompanyData();
        } catch (err) {
            console.error('Error finishing company info:', err);
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    };

    const loadDocuments = async () => {
        setDocuments([
            { id: '1', name: 'Document client 2024' },
            { id: '2', name: 'Politique commerciale' },
        ]);
    };

    const handleDeleteAccountClick = (accountId: string, email: string, provider: string) => {
        setAccountToDelete({ id: accountId, email, provider });
        setShowDeleteModal(true);
    };

    const handleDeleteAccount = async () => {
        if (!accountToDelete || !user) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-email-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email_configuration_id: accountToDelete.id,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                showToast(data.error || 'Erreur lors de la suppression du compte', 'error');
                return;
            }


            setShowDeleteModal(false);
            setAccountToDelete(null);
            loadAccounts();
            checkSubscription();
        } catch (error) {
            showToast('Une erreur est survenue lors de la suppression', 'error');
        }
    };

    const handleDeleteDocumentClick = (docId: string) => {
        setDocToDelete(docId);
        setShowDeleteDocModal(true);
    };

    const handleDeleteDocument = () => {
        if (!docToDelete) return;
        setDocuments(documents.filter(doc => doc.id !== docToDelete));
        setDocToDelete(null);
    };

    const handleDeleteUserAccount = async () => {
        if (!user) return;

        setIsDeletingUser(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Vous devez être connecté', 'error');
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                await supabase.auth.signOut();
                router.push('/');
            } else {
                showToast('Erreur lors de la suppression du compte: ' + data.error, 'error');
            }
        } catch (error) {
            showToast('Une erreur est survenue lors de la suppression du compte', 'error');
        } finally {
            setIsDeletingUser(false);
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
                    body: JSON.stringify({ redirectUrl: window.location.origin }),
                }
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Échec de l\'initialisation Gmail');
            }
            const { authUrl } = await response.json();
            const width = 600; const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            window.open(authUrl, 'Gmail OAuth', `width=${width},height=${height},left=${left},top=${top}`);

        } catch (err) {
            showToast('Erreur lors de la connexion Gmail', 'error');
        }
    };

    const handleProviderSelect = async (provider: 'gmail' | 'outlook' | 'imap') => {
        if (provider === 'gmail') {
            await connectGmail();
        } else if (provider === 'outlook') {
            window.location.href = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/outlook-oauth-init?user_id=${user?.id}`;
        } else {
            setShowAddAccountModal(false);
            setShowImapModal(true);
            setTestSuccess(false);
            setTestError(null);
        }
    };

    const handleImapFormChange = (field: string, value: string) => {
        setImapFormData({ ...imapFormData, [field]: value });
        setTestSuccess(false);
        setTestError(null);
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestError(null);
        setTestSuccess(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-email-connection`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: imapFormData.email,
                        password: imapFormData.password,
                        imap_host: imapFormData.imap_host,
                        imap_port: parseInt(imapFormData.imap_port),
                    }),
                }
            );

            const result = await response.json();

            if (result.success) {
                setTestSuccess(true);
            } else {
                setTestError(result.error || 'Échec de la vérification de la connexion');
            }
        } catch (err) {
            setTestError('Impossible de vérifier la connexion au serveur');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleImapSubmit = async () => {
        if (!imapFormData.email || !imapFormData.password || !imapFormData.imap_host) {
            showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        try {
            const { data: existing } = await supabase
                .from('email_configurations')
                .select('id')
                .eq('user_id', user?.id as string)
                .eq('email', imapFormData.email)
                .maybeSingle();

            if (existing) {
                setDuplicateEmail(imapFormData.email);
                setShowDuplicateEmailModal(true);
                return;
            }

            const { error } = await supabase.from('email_configurations').insert({
                user_id: user?.id as string,
                name: imapFormData.email,
                email: imapFormData.email,
                provider: 'smtp_imap',
                is_connected: true,
                is_classement: false, // Tri automatique désactivé par défaut - sera activé après configuration de l'entreprise
                password: imapFormData.password,
                imap_host: imapFormData.imap_host,
                imap_port: parseInt(imapFormData.imap_port),
                imap_username: imapFormData.email,
                imap_password: imapFormData.password,
            });

            if (error) throw error;

            setShowImapModal(false);
            const addedEmail = imapFormData.email;
            setImapFormData({
                email: '',
                password: '',
                imap_host: '',
                imap_port: '993',
            });
            await loadAccounts();
        } catch (err) {
            showToast('Erreur lors de l\'ajout du compte', 'error');
        }
    };

    return (
        <>
            <ToastComponent />
            
            <div className="mx-auto max-w-7xl">
            <HowItWorks />

                {/* Contenu principal */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full mt-6 font-inter"
                >
                    {/* Header avec bouton */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white flex justify-between items-center font-inter p-6 rounded-t-xl border border-gray-200"
                    >
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Configuration de vos emails
                    </h2>
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
                </motion.div>

            {/* Modal d'ajout de compte */}
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

                {/* Bannière d'abonnement annulé */}
                {isCanceled && hasActiveSubscription && subscriptionEndDate && (
                    <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <div className="font-bold text-amber-900 mb-1">Abonnement annulé</div>
                                <div className="text-sm text-amber-800 mb-3">
                                    Votre abonnement a été annulé et restera actif jusqu'au <strong>{subscriptionEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Après cette date, vos comptes email seront désactivés et vous n'aurez plus accès aux fonctionnalités de Hall IA.
                                </div>
                                <button
                                    onClick={() => router.push('/user-settings?tab=subscription')}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                                >
                                    Réactiver mon abonnement
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Layout principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    {/* Colonne gauche - Liste des comptes */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-1"
                    >
                        <div className="bg-white shadow-sm border border-gray-200 h-full rounded-bl-xl flex flex-col">
                            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '1300px' }}>
                                {accounts.map((account, index) => {
                                    const isDisabled = account.is_active === false || account.cancel_at_period_end === true;
                                    return (
                                    <div key={account.id} className="relative group">
                                    <motion.button
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                        // whileHover={!isDisabled ? { scale: 1.02, x: 4 } : {}}
                                        // whileTap={!isDisabled ? { scale: 0.98 } : {}}
                                        onClick={() => {
                                            if (!isDisabled) {
                                                setSelectedAccount(account);
                                                setSelectedSlot(null); // Désélectionner le slot si un compte est sélectionné
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 transition-colors ${isDisabled
                                            ? 'bg-gray-100 border-2 border-gray-300 opacity-40 text-gray-200 cursor-not-allowed grayscale'
                                                : selectedAccount?.id === account.id
                                                ? 'bg-orange-50 text-black shadow-md border-l-4 border-orange-500'
                                                : 'text-black hover:bg-gray-100'
                                            }`}
                                            
                                            
                                        disabled={isDisabled}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icône Gmail ou Mail */}
                                            {account.provider === 'gmail' ? (
                                                <div className=" w-10 h-10 flex  items-center justify-center">
                                                    <img src="/logo/gmail.png" alt="Gmail
                    " />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 flex items-center justify-center">
                                                    <Mail className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-orange-500'}`} />
                                                </div>
                                            )}
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className={`font-medium truncate ${isDisabled ? 'text-gray-400' : ''}`}>{account.email}</div>
                                                    {isDisabled && (
                                                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-medium rounded">
                                                            {account.cancel_at_period_end ? 'En résiliation' : 'Inactif'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {account.provider === 'gmail' ? 'Gmail' : account.provider === 'outlook' ? 'Outlook' : 'IMAP'}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                    {/* Tooltip pour les comptes désactivés */}
                                    {isDisabled && (
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                            Réactiver vos emails dans Compte &gt; Abonnement
                                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                                        </div>
                                    )}
                                    </div>
                                    );
                                })}

                                {/* Slots d'emails payés mais non configurés */}
                                {totalPaidSlots > accounts.length && Array.from({ length: totalPaidSlots - accounts.length }).map((_, index) => {
                                    const slotSub = unlinkedSubscriptions[index];
                                    const isSelected = selectedSlot?.index === index;
                                    
                                    return (
                                        <motion.button
                                            key={`slot-${index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: 0.3 + (accounts.length + index) * 0.1 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (slotSub?.subscription_id) {
                                                    setSelectedSlot({ index, subscription_id: slotSub.subscription_id });
                                                    setSelectedAccount(null); // Désélectionner le compte configuré
                                                } else {
                                                    setShowAddAccountModal(true);
                                                }
                                            }}
                                            className={`w-full px-4 py-3 bg-gray-50 border-2 border-dashed transition-all text-left ${
                                                isSelected 
                                                    ? 'bg-orange-50 border-orange-500 shadow-md' 
                                                    : 'border-gray-300 hover:bg-gray-100 hover:border-orange-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Icône Mail grisée */}
                                                <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full">
                                                    <Mail className="w-5 h-5 text-gray-400" />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-600">
                                                        Email #{accounts.length + index + 1}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Non configuré
                                                    </div>
                                                </div>

                                                {/* Badge */}
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                    ✓ Payé
                                                </span>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                              
                            </div>
                        </div>
                    </motion.div>

                    {/* Colonne droite - Détails du compte */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="lg:col-span-2"
                    >
                        {/* Indicateur d'état du tri automatique */}
                        <AnimatePresence mode="wait">
                            {selectedAccount && (
                                <motion.div 
                                    key={selectedAccount.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white p-6 shadow-sm border-t border-r border-gray-200 mb-0"
                                >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 border rounded-md p-1">
                                        <div className="relative flex items-center gap-2">
                                            {autoSort && (
                                                <>
                                                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75 animate-ping"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </>
                                            )}
                                            {!autoSort && (
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                                            )}
                                            <span className="text-sm font-medium text-gray-600">État</span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${autoSort
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {autoSort ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                    <button
                                        disabled={hasEverHadSubscription && !hasActiveSubscription}
                                        onClick={async () => {
                                            if (!user || !selectedAccount) return;
                                            if (hasEverHadSubscription && !hasActiveSubscription) return;
                                            const newValue = !autoSort;
                                            setAutoSort(newValue);

                                            // Préparer les données à mettre à jour
                                            const updateData: any = { is_classement: newValue };
                                            if (newValue) {
                                                updateData.is_classement_activated_at = new Date().toISOString();
                                            }

                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update(updateData)
                                                .eq('user_id', user.id)
                                                .eq('email', selectedAccount.email);

                                            const { data: configData } = await supabase
                                                .from('email_configurations')
                                                .select('gmail_token_id, outlook_token_id')
                                                .eq('user_id', user.id)
                                                .eq('email', selectedAccount.email)
                                                .maybeSingle();

                                            if (configData?.gmail_token_id) {
                                                await supabase
                                                    .from('gmail_tokens')
                                                    .update({ is_classement: newValue })
                                                    .eq('id', configData.gmail_token_id);
                                            }

                                            if (!error) {
                                                setNotificationMessage(newValue ? 'Tri automatique activé' : 'Tri automatique désactivé');
                                                setShowNotification(true);
                                                setTimeout(() => setShowNotification(false), 3000);
                                            }
                                        }}
                                        className={`relative w-14 h-8 rounded-full transition-colors ${hasEverHadSubscription && !hasActiveSubscription ? 'bg-gray-200 cursor-not-allowed' : autoSort ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div
                                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${autoSort ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Informations du compte sélectionné ou du slot sélectionné */}
                        <AnimatePresence mode="wait">
                            {selectedAccount && (
                                <motion.div 
                                    key={`info-${selectedAccount.id}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="font-inter bg-white p-6 border-r border-gray-200"
                                >
                                    <h2 className="text-lg font-semibold text-gray-900">{selectedAccount.email}</h2>
                                    <p className="text-sm text-gray-500">
                                      Flux de traitement automatique
                                    </p>
                                </motion.div>
                            )}
                            {selectedSlot && !selectedAccount && (
                                <motion.div 
                                    key={`slot-info-${selectedSlot.index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="font-inter bg-white p-6 border-r border-gray-200"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Email #{accounts.length + selectedSlot.index + 1}</h2>
                                            <p className="text-sm text-gray-500">Non configuré</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => setShowAddAccountModal(true)}
                                            className="flex-1 px-4 py-2 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-lg font-medium hover:shadow-lg transition-all"
                                        >
                                            Configurer
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!selectedSlot?.subscription_id || !user) return;
                                                
                                                if (!confirm('Êtes-vous sûr de vouloir résilier cet abonnement ? Il restera actif jusqu\'à la fin de la période de facturation en cours.')) {
                                                    return;
                                                }

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
                                                            body: JSON.stringify({
                                                                subscription_id: selectedSlot.subscription_id
                                                            }),
                                                        }
                                                    );

                                                    const data = await response.json();

                                                    if (data.error) {
                                                        showToast(`Erreur: ${data.error}`, 'error');
                                                        return;
                                                    }

                                                    showToast('Abonnement résilié avec succès', 'success');
                                                    setSelectedSlot(null);
                                                    loadAccounts();
                                                    checkSubscription();
                                                } catch (error: any) {
                                                    showToast('Une erreur est survenue lors de la résiliation', 'error');
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                        >
                                            Résilier
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Informations de l'entreprise */}
                        <AnimatePresence mode="wait">
                            {selectedAccount && (
                                <motion.div 
                                    key={`company-${selectedAccount.id}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="bg-white font-inter p-6 shadow-sm border-r border-b border-gray-200 rounded-br-xl"
                                >
                               
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <div className="flex items-center justify-between ">
                                        <span className="text-gray-500">Nom de l'entreprise:</span>
                                        <button onClick={() => {
                                            setEditTempValue(companyFormData.company_name);
                                            setShowEditCompanyNameModal(true);
                                        }}>
                                            <Edit2Icon className='w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer' />
                                        </button>
                                        </div>
                                        <p className="font-medium text-gray-900 mt-2">{companyFormData.company_name || 'Non renseigné'}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between ">
                                        <span className="text-gray-500  mb-2">Description de l'activité:</span>
                                        <button onClick={() => {
                                            setEditTempValue(companyFormData.activity_description);
                                            setShowEditActivityModal(true);
                                        }}>
                                            <Edit2Icon className='w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer' />
                                        </button>

                                        </div>
                                        <p className="font-medium text-gray-900 whitespace-pre-wrap mt-2">{companyFormData.activity_description || 'Non renseignée'}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between ">    
                                        <span className="text-gray-500 mb-2">Signature email:</span>
                                        <button onClick={() => {
                                            setEditTempValue(companyFormData.services_offered);
                                            setShowEditSignatureModal(true);
                                        }}>
                                            <Edit2Icon className='w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer' />
                                        </button>
                                        </div>
                                        <p className="font-medium text-gray-900 whitespace-pre-wrap mt-2">{companyFormData.services_offered || 'Non renseignée'}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between ">    
                                        <span className="text-gray-500 mb-2">Logo de signature:</span>
                                        <button onClick={() => setShowEditLogoModal(true)}>
                                            <Edit2Icon className='w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer' />
                                        </button>
                                        </div>
                                        {companyFormData.signature_image_base64 ? (
                                            <img
                                                src={companyFormData.signature_image_base64}
                                                alt="Logo de signature"
                                                className="max-h-24 max-w-full object-contain mt-2"
                                            />
                                        ) : (
                                            <p className="font-medium text-gray-900 mt-2">Non renseigné</p>
                                        )}
                                    </div>
                                </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Base de connaissances */}
                        <AnimatePresence mode="wait">
                            {selectedAccount && (
                                <motion.div 
                                    key={`knowledge-${selectedAccount.id}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="bg-white font-inter p-6 shadow-sm border-r border-b border-gray-200"
                                >
                                    <div className="mb-6">
                                        <h3 className="font-bold text-[#3D2817] text-lg mb-2">Base de connaissances</h3>
                                        <p className="text-sm text-gray-500">Ajoutez des ressources pour enrichir les réponses de l'IA</p>
                                    </div>

                                    {currentConfig ? (
                                        <div className="space-y-6">
                                            {/* Configuration Info */}
                                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-[#EF6855]" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-600">Configuration pour</div>
                                                        <div className="font-semibold text-[#3D2817]">{currentConfig.email}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* URLs Section */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-5 h-5 text-[#EF6855]" />
                                                        <label className="block text-sm font-semibold text-gray-700">
                                                            URLs de la base de connaissance
                                                        </label>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddKnowledgeUrl}
                                                        className="flex items-center gap-1 px-3 py-1 text-sm text-[#EF6855] hover:bg-orange-50 rounded-lg transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Ajouter
                                                    </button>
                                                </div>

                                                {/* Display existing URLs */}
                                                {(() => {
                                                    const existingUrls = currentConfig?.knowledge_base_urls ? 
                                                        (Array.isArray(currentConfig.knowledge_base_urls) ? currentConfig.knowledge_base_urls : JSON.parse(currentConfig.knowledge_base_urls || '[]')) : 
                                                        [];
                                                    
                                                    return existingUrls.length > 0 && (
                                                        <div className="space-y-2 mb-3">
                                                            {existingUrls.map((url: string, index: number) => (
                                                                <div key={`existing-url-${index}`} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                                    <Globe className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <a 
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                                                            title={url}
                                                                        >
                                                                            {url}
                                                                        </a>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleRemoveExistingUrl(index)}
                                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                                                        title="Supprimer cette URL"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Add new URLs */}
                                                <div className="space-y-2">
                                                    {knowledgeUrls.map((url, index) => (
                                                        <div key={index} className="flex gap-2">
                                                            <input
                                                                type="url"
                                                                value={url}
                                                                onChange={(e) => handleKnowledgeUrlChange(index, e.target.value)}
                                                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                                                                placeholder="https://example.com/documentation"
                                                            />
                                                            {knowledgeUrls.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveKnowledgeUrl(index)}
                                                                    className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Supprimer cette URL"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                <p className="text-xs text-gray-500">
                                                    URLs de sites web contenant des informations sur votre entreprise
                                                </p>
                                            </div>

                                            {/* Divider */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-300"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-4 bg-white text-gray-500 font-medium">ET/OU</span>
                                                </div>
                                            </div>

                                            {/* PDF Section */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Upload className="w-5 h-5 text-[#EF6855]" />
                                                    <label className="block text-sm font-semibold text-gray-700">
                                                        Documents PDF
                                                    </label>
                                                </div>

                                                {/* Display existing and new PDFs */}
                                                {(() => {
                                                    const existingPdfs = currentConfig?.knowledge_base_pdfs ? 
                                                        (Array.isArray(currentConfig.knowledge_base_pdfs) ? currentConfig.knowledge_base_pdfs : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')) : 
                                                        [];
                                                    
                                                    return (existingPdfs.length > 0 || knowledgePdfFiles.length > 0) && (
                                                        <div className="space-y-2">
                                                            {/* Existing PDFs */}
                                                            {existingPdfs.map((pdf: any, index: number) => (
                                                                <div key={`existing-${index}`} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <button
                                                                            onClick={() => handleDownloadPdf(pdf.name, pdf.base64)}
                                                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left truncate block w-full"
                                                                            title={`Cliquer pour télécharger ${pdf.name}`}
                                                                        >
                                                                            {pdf.name}
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDownloadPdf(pdf.name, pdf.base64)}
                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                                                                        title="Télécharger le PDF"
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveExistingPdf(index)}
                                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                                                        title="Supprimer ce PDF"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            
                                                            {/* New PDFs to be uploaded */}
                                                            {knowledgePdfFiles.map((file, index) => (
                                                                <div key={`new-${index}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-medium text-gray-700">{file.name}</div>
                                                                        <div className="text-xs text-blue-600">
                                                                            Nouveau - À enregistrer ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemovePdf(index)}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Upload zone */}
                                                <input
                                                    id="knowledge-pdf-upload"
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    multiple
                                                    onChange={handleKnowledgePdfChange}
                                                    className="hidden"
                                                />
                                                <div
                                                    onDragEnter={handlePdfDragEnter}
                                                    onDragLeave={handlePdfDragLeave}
                                                    onDragOver={handlePdfDragOver}
                                                    onDrop={handlePdfDrop}
                                                >
                                                    <label
                                                        htmlFor="knowledge-pdf-upload"
                                                        className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                                            isDraggingPdf
                                                                ? 'border-[#EF6855] bg-orange-50 scale-[1.02]'
                                                                : 'border-gray-300 hover:border-[#EF6855] hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex flex-col items-center justify-center py-4 pointer-events-none">
                                                            {isDraggingPdf ? (
                                                                <>
                                                                    <Upload className="w-8 h-8 text-[#EF6855] mb-2 animate-bounce" />
                                                                    <p className="text-sm text-[#EF6855] font-semibold">
                                                                        Déposez les fichiers PDF ici
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-1">Plusieurs fichiers supportés</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                                    <p className="text-sm text-gray-600">
                                                                        <span className="font-medium text-[#EF6855]">Cliquez pour ajouter</span> ou glissez des fichiers PDF
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-1">Plusieurs fichiers supportés (max 10 MB chacun)</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                                
                                                <p className="text-xs text-gray-500">
                                                    Documents PDF contenant des informations sur vos produits/services
                                                </p>
                                            </div>

                                            {/* Save Button */}
                                            <div className="pt-4">
                                                <button
                                                    onClick={handleSaveKnowledge}
                                                    disabled={knowledgeSaving}
                                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#EF6855] to-[#F9A459] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {knowledgeSaving ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Enregistrement...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-5 h-5" />
                                                            Enregistrer la base de connaissance
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                            <p className="text-sm font-medium">Aucun compte email configuré</p>
                                            <p className="text-xs mt-2">Veuillez d'abord configurer un compte email</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Fonctionnalités */}
                        {/* <div className="bg-white  p-6 shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-6">Fonctionnalités</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className={`font-semibold ${hasEverHadSubscription && !hasActiveSubscription ? 'text-gray-400' : 'text-gray-900'}`}>Tri automatique</div>
                                            <div className={`text-sm ${hasEverHadSubscription && !hasActiveSubscription ? 'text-gray-400' : 'text-gray-600'}`}>Classement dans Info, Traités, Pub</div>
                                        </div>
                                        <button
                                            disabled={hasEverHadSubscription && !hasActiveSubscription}
                                            onClick={async () => {
                                                if (!user || !selectedAccount) return;
                                                if (hasEverHadSubscription && !hasActiveSubscription) return;
                                                const newValue = !autoSort;
                                                setAutoSort(newValue);

                                                // Préparer les données à mettre à jour
                                                const updateData: any = { is_classement: newValue };
                                                if (newValue) {
                                                    updateData.is_classement_activated_at = new Date().toISOString();
                                                }

                                                const { error } = await supabase
                                                    .from('email_configurations')
                                                    .update(updateData)
                                                    .eq('user_id', user.id)
                                                    .eq('email', selectedAccount.email);

                                                const { data: configData } = await supabase
                                                    .from('email_configurations')
                                                    .select('gmail_token_id, outlook_token_id')
                                                    .eq('user_id', user.id)
                                                    .eq('email', selectedAccount.email)
                                                    .maybeSingle();

                                                if (configData?.gmail_token_id) {
                                                    await supabase
                                                        .from('gmail_tokens')
                                                        .update({ is_classement: newValue })
                                                        .eq('id', configData.gmail_token_id);
                                                }

                                                if (!error) {
                                                    setNotificationMessage(newValue ? 'Tri automatique activé' : 'Tri automatique désactivé');
                                                    setShowNotification(true);
                                                    setTimeout(() => setShowNotification(false), 3000);
                                                }
                                            }}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${hasEverHadSubscription && !hasActiveSubscription ? 'bg-gray-200 cursor-not-allowed' : autoSort ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${autoSort ? 'translate-x-6' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                    {hasEverHadSubscription && !hasActiveSubscription ? (
                                        <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="flex items-start gap-3">
                                                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-red-800 mb-1">Abonnement expiré</div>
                                                    {accounts.length === 0 ? (
                                                        <>
                                                            <div className="text-sm text-red-700 mb-3">
                                                                Votre abonnement a expiré et vous n'avez plus de compte email configuré. Pour réactiver le tri automatique, vous devez d'abord ajouter un compte email.
                                                            </div>
                                                            <button
                                                                onClick={() => setShowAddAccountModal(true)}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                            >
                                                                Ajouter un compte email
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-sm text-red-700 mb-3">
                                                                Votre abonnement a expiré. Pour réactiver le tri automatique et accéder à toutes les fonctionnalités, veuillez renouveler votre abonnement.
                                                            </div>
                                                            <button
                                                                onClick={() => router.push('/user-settings?tab=subscription')}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                            >
                                                                Réactiver mon abonnement
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : autoSort ? (
                                        <div className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                            <p className="text-sm text-gray-800 mb-2">
                                                Les e-mails entrants sont <strong>automatiquement classés</strong> dans trois dossiers selon leur contenu :
                                            </p>
                                            <ul className="text-sm text-gray-700 space-y-1 ml-4">
                                                <li><strong>INFO</strong> → e-mails informatifs (notifications, confirmations, etc.)</li>
                                                <li><strong>TRAITE</strong> → e-mails nécessitant une action ou une réponse</li>
                                                <li><strong>PUB</strong> → e-mails promotionnels ou publicitaires filtrés</li>
                                            </ul>
                                            <p className="text-sm text-gray-800 mt-2">
                                                Ce tri permet de <strong>structurer la boîte de réception</strong> et de <strong>prioriser les messages utiles</strong>.
                                            </p>
                                            <p className="text-sm text-gray-800 mt-1">
                                                Si <strong>Réponses automatiques</strong> est <strong>activé</strong>, l'IA génère en plus des <strong>brouillons de réponses</strong> pour les e-mails <strong>pertinents</strong>.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-800">
                                                • Aucun classement : les e-mails <strong>restent dans la boîte de réception</strong>.
                                            </p>
                                            <p className="text-sm text-gray-800 mt-1">
                                                • Aucune création ou déplacement dans les dossiers <strong>INFO / TRAITE / PUB</strong>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div> 
                        </div>*/}

                        {/* Base de connaissances */}
                        {/* <div className="bg-white  p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-900">Base de connaissances</h3>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                    v2
                                </span>
                            </div>
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700">{doc.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocumentClick(doc.id)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-orange-500 text-orange-600 font-medium hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                                    <Plus className="w-4 h-4" />
                                    Ajouter un document
                                </button>
                            </div>
                        </div> */}

                        {/* Ressources avancées */}
                        {/* <div className="bg-white  p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-900">Ressources avancées</h3>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                    v2
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors opacity-50 cursor-not-allowed">
                                    <Globe className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">Liens web</span>
                                </button>
                                <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors opacity-50 cursor-not-allowed">
                                    <Share2 className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">Réseaux Sociaux</span>
                                </button>
                            </div>
                        </div> */}
                    {/* </motion.div> */}

                        {/* Zone de danger */}
                        {/* <div className="bg-white p-6 shadow-sm border-2 border-red-200">
                            <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Zone de danger
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-sm text-gray-800 mb-3">
                                        La suppression de votre compte est <strong>irréversible</strong>. Toutes vos données seront <strong>définitivement supprimées</strong> :
                                    </p>
                                    <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                                        <li>Tous vos comptes email configurés</li>
                                        <li>Historique de classification des emails</li>
                                        <li>Informations de l'entreprise</li>
                                        <li>Votre abonnement sera <strong>résilié sur Stripe</strong></li>
                                    </ul>
                                </div>
                                <button
                                    onClick={() => setShowDeleteUserModal(true)}
                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer définitivement mon compte
                                </button>
                            </div>
                        </div>*/}
                    </motion.div>
                </div>
                {/* </div> */}
</motion.div> 
</div>

            {/* Modal d'information de l'entreprise */}
            {showCompanyInfoModal && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        // Permettre la fermeture uniquement si on clique en dehors et qu'on est sur une étape optionnelle (3, 4, 5)
                        if (e.target === e.currentTarget && companyInfoStep >= 3) {
                            handleCompanyInfoFinish();
                        } else if (e.target === e.currentTarget && companyInfoStep < 3) {
                            // Pour les étapes obligatoires, vérifier qu'elles sont complètes
                            const isStep1Complete = companyInfoStep === 1 && companyFormData.company_name?.trim();
                            const isStep2Complete = companyInfoStep === 2 && companyFormData.activity_description?.trim();
                            
                            if (isStep1Complete || isStep2Complete) {
                                handleCompanyInfoFinish();
                            } else {
                                showToast('Veuillez compléter cette étape obligatoire', 'warning');
                            }
                        }
                    }}
                >
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl font-inter max-h-[95vh] overflow-y-auto relative">
                        {/* Bouton retour en haut à gauche */}
                        {companyInfoStep > 1 && (
                            <button
                                onClick={handleCompanyInfoBack}
                                className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180 text-gray-600" />
                            </button>
                        )}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Description de votre activité</h2>
                        </div>

                        {accountMissingInfo && (
                            <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-sm text-gray-800">
                                    <span className="font-semibold text-orange-600">Compte concerné :</span>{' '}
                                    <span className="font-medium">{accountMissingInfo}</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Ce compte nécessite des informations supplémentaires pour fonctionner correctement.
                                </p>
                            </div>
                        )}

                        <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-800">
                                <span className="font-semibold">Étape {companyInfoStep}/5</span> - {
                                    companyInfoStep === 1 ? 'Nom de l\'entreprise' :
                                        companyInfoStep === 2 ? 'Description de l\'activité et des services proposés' :
                                            companyInfoStep === 3 ? 'Signature email (optionnel)' :
                                                companyInfoStep === 4 ? 'Logo de signature (optionnel)' :
                                                    'Base de connaissances (optionnel)'
                                }
                            </p>
                        </div>

                        {companyInfoStep === 1 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Nom de l'entreprise <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={companyFormData.company_name}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Ex: Hall IA"
                                    />
                                </div>
                            </div>
                        )}

                        {companyInfoStep === 2 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Description de l'activité et des services <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={companyFormData.activity_description}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, activity_description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Exemple : Hall IA développe des outils intelligents pour automatiser la gestion des emails. Nous proposons : classification automatique d'emails (INFO, TRAITÉ, PUB), réponses automatiques par IA, tri intelligent des messages, et optimisation de la productivité email."
                                        rows={6}
                                    />
                                </div>
                            </div>
                        )}

                        {companyInfoStep === 3 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Signature email <span className="text-gray-500 text-xs">(optionnel)</span>
                                    </label>
                                    <textarea
                                        value={companyFormData.services_offered}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, services_offered: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder={`Exemple :\nCordialement,\nJean Dupont\nCEO - Mon Entreprise\nTel: +33 6 12 34 56 78\nEmail: contact@entreprise.fr`}
                                        rows={8}
                                    />
                                </div>
                            </div>
                        )}

                        {companyInfoStep === 4 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Logo de signature <span className="text-gray-500 text-xs">(optionnel)</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Logo de votre entreprise ou signature manuscrite scannée
                                    </p>
                                    
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                                            isDraggingLogo 
                                                ? 'border-orange-500 bg-orange-50' 
                                                : 'border-gray-300 hover:border-orange-400'
                                        }`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingLogo(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDraggingLogo(false);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDraggingLogo(false);
                                            
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && file.type.startsWith('image/')) {
                                                if (file.size > 2 * 1024 * 1024) {
                                                    showToast('L\'image ne doit pas dépasser 2MB', 'error');
                                                    return;
                                                }
                                                
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    const base64 = event.target?.result as string;
                                                    setCompanyFormData({ ...companyFormData, signature_image_base64: base64 });
                                                };
                                                reader.readAsDataURL(file);
                                            } else {
                                                showToast('Veuillez déposer une image valide', 'error');
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        showToast('L\'image ne doit pas dépasser 2MB', 'error');
                                                        return;
                                                    }
                                                    
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const base64 = event.target?.result as string;
                                                        setCompanyFormData({ ...companyFormData, signature_image_base64: base64 });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="hidden"
                                            id="signature-logo-upload"
                                        />
                                        <label
                                            htmlFor="signature-logo-upload"
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            {companyFormData.signature_image_base64 ? (
                                                <div className="space-y-3">
                                                    <img
                                                        src={companyFormData.signature_image_base64}
                                                        alt="Logo de signature"
                                                        className="max-h-32 max-w-full object-contain mx-auto"
                                                    />
                                                    <p className="text-sm text-green-600 font-medium">✓ Logo téléchargé</p>
                                                    <p className="text-xs text-gray-500">Cliquez ou glissez pour changer</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">
                                                            Cliquez ou glissez pour télécharger
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            PNG, JPG jusqu'à 2MB
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    
                                    {companyFormData.signature_image_base64 && (
                                        <button
                                            type="button"
                                            onClick={() => setCompanyFormData({ ...companyFormData, signature_image_base64: '' })}
                                            className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                                        >
                                            <X className="w-4 h-4" />
                                            Supprimer le logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {companyInfoStep === 5 && (
                            <div className="space-y-4 mb-6">
                                <div className="flex items-start gap-2 mb-4">
                                    <HelpCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700">
                                        La base de connaissances permet de faire performer l'IA en enrichissant ses réponses avec des informations spécifiques à votre entreprise. Vous pourrez la configurer plus tard dans les paramètres.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            URLs de sites web <span className="text-gray-500 text-xs">(optionnel)</span>
                                        </label>
                                        <input
                                            type="url"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="https://example.com/documentation"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            URLs de sites web contenant des informations sur votre entreprise
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Documents PDF <span className="text-gray-500 text-xs">(optionnel)</span>
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-600">
                                                Vous pourrez ajouter des PDFs dans les paramètres
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {companyInfoStep >= 3 ? (
                                // Pour les étapes optionnelles (3, 4, 5), afficher un bouton "Terminer"
                                <>
                                    <button
                                        onClick={handleCompanyInfoFinish}
                                        className="group relative flex-1 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl"
                                    >
                                        <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                            Terminer
                                        </span>
                                        <svg
                                            className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                    {companyInfoStep < 5 && (
                                        <button
                                            onClick={handleCompanyInfoNext}
                                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            Suivant
                                        </button>
                                    )}
                                </>
                            ) : (
                                // Pour les étapes obligatoires (1, 2), afficher "Continuer"
                                <>
                                    <button
                                        onClick={handleCompanyInfoNext}
                                        className="group relative flex-1 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl"
                                    >
                                        <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                            Continuer
                                        </span>
                                        <svg
                                            className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de succès */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800 text-center font-medium">
                                Étape 4/4 - Configuration terminée
                            </p>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-white stroke-[3]" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                            Compte ajouté !
                        </h2>

                        <p className="text-gray-600 text-center mb-8">
                            Votre compte email est maintenant configuré et prêt à être utilisé.
                        </p>

                        <div className="bg-orange-50 rounded-lg p-6 mb-6 border border-orange-100">
                            <h3 className="font-semibold text-gray-900 mb-4">Prochaines étapes :</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">Vos emails commencent à être triés automatiquement</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">Des brouillons de réponse sont générés</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">Les publicités sont automatiquement filtrées</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="group relative w-full inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-4 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl text-lg"
                        >
                            <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-2">
                                Retourner aux paramètres
                            </span>
                            <svg
                                className="relative z-10 h-6 w-6 -translate-x-3 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal IMAP */}
            {showImapModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ajouter un compte IMAP</h2>
                            <p className="text-gray-600 text-sm">Configurez votre compte email personnalisé</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            {testError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1">
                                        <div className="font-semibold text-red-800 text-sm">Erreur de connexion</div>
                                        <div className="text-xs text-red-700 mt-1">{testError}</div>
                                    </div>
                                </div>
                            )}

                            {testSuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1">
                                        <div className="font-semibold text-green-800 text-sm">Connexion réussie</div>
                                        <div className="text-xs text-green-700 mt-1">Les paramètres sont valides. Vous pouvez ajouter le compte.</div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Adresse email
                                </label>
                                <input
                                    type="email"
                                    value={imapFormData.email}
                                    onChange={(e) => handleImapFormChange('email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="contact@hallia.ai"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={imapFormData.password}
                                        onChange={(e) => handleImapFormChange('password', e.target.value)}
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Serveur IMAP Entrant
                                    </label>
                                    <input
                                        type="text"
                                        value={imapFormData.imap_host}
                                        onChange={(e) => handleImapFormChange('imap_host', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="imap.example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Port IMAP
                                    </label>
                                    <input
                                        type="text"
                                        value={imapFormData.imap_port}
                                        onChange={(e) => handleImapFormChange('imap_port', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="993"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testingConnection || !imapFormData.email || !imapFormData.password || !imapFormData.imap_host || !imapFormData.imap_port}
                                className={`w-full px-4 py-2.5 border-2 rounded-full font-medium transition-all flex items-center justify-center gap-2 ${
                                    (testingConnection || !imapFormData.email || !imapFormData.password || !imapFormData.imap_host || !imapFormData.imap_port) 
                                        ? 'opacity-50 cursor-not-allowed border-orange-500 text-orange-600' 
                                        : testSuccess
                                            ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                                            : 'border-orange-500 text-orange-600 hover:bg-gradient-to-br hover:from-[#F35F4F] hover:to-[#FFAD5A] hover:text-white hover:border-transparent'
                                }`}
                            >
                                {testingConnection ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Test en cours...
                                    </>
                                ) : testSuccess ? (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Connexion réussie
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Tester la connexion
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleImapSubmit}
                                disabled={!testSuccess}
                                className={`group relative flex-1 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out ${testSuccess
                                    ? 'hover:shadow-xl cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                    Ajouter le compte
                                </span>
                                {testSuccess && (
                                    <svg
                                        className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowImapModal(false);
                                    setImapFormData({
                                        email: '',
                                        password: '',
                                        imap_host: '',
                                        imap_port: '993',
                                    });
                                    setTestError(null);
                                    setTestSuccess(false);
                                }}
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de modification des informations entreprise */}
            {/* {showEditCompanyModal && selectedAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl font-inter">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Modifier les informations de l'entreprise</h2>
                            <button
                                onClick={() => setShowEditCompanyModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const { error } = await supabase
                                    .from('email_configurations')
                                    .update({
                                        company_name: companyFormData.company_name,
                                        activity_description: companyFormData.activity_description,
                                        services_offered: companyFormData.services_offered,
                                        updated_at: new Date().toISOString(),
                                    })
                                    .eq('id', selectedAccount.id);

                                if (error) throw error;

                                setShowEditCompanyModal(false);
                                setNotificationMessage('Informations mises à jour avec succès');
                                setShowNotification(true);
                                setTimeout(() => setShowNotification(false), 3000);
                                await loadCompanyData();
                            } catch (err) {
                                showToast('Erreur lors de la mise à jour des informations', 'error');
                            }
                        }} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nom de l'entreprise
                                </label>
                                <input
                                    type="text"
                                    value={companyFormData.company_name}
                                    onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                                    placeholder="Ex: HalliA Solutions"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description de l'activité
                                </label>
                                <textarea
                                    value={companyFormData.activity_description}
                                    onChange={(e) => setCompanyFormData({ ...companyFormData, activity_description: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                    rows={6}
                                    placeholder="Exemple : Nous sommes une agence de marketing digital spécialisée dans la création de contenu et la gestion des réseaux sociaux pour les PME. Nous aidons nos clients à développer leur présence en ligne et à atteindre leurs objectifs commerciaux."
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Cette description sera utilisée par l'IA pour mieux comprendre votre contexte et classer vos e-mails.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Signature email
                                </label>
                                <textarea
                                    value={companyFormData.services_offered}
                                    onChange={(e) => setCompanyFormData({ ...companyFormData, services_offered: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                    rows={4}
                                    placeholder={`Exemple :\nCordialement,\nJean Dupont\nCEO - Mon Entreprise\nTel: +33 6 12 34 56 78\nEmail: contact@entreprise.fr`}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditCompanyModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="group relative flex-1 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl"
                                >
                                    <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                        Enregistrer
                                    </span>
                                    <svg
                                        className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )} */}

            {/* Modal de suppression de compte utilisateur */}
            {showDeleteUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden font-inter max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold">Supprimer le compte</h2>
                                </div>
                                <button
                                    onClick={() => setShowDeleteUserModal(false)}
                                    className="text-white hover:text-gray-200 transition-colors"
                                    disabled={isDeletingUser}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-white text-opacity-90">
                                Cette action est <span className="font-semibold">irréversible</span>
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4 mb-6">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-900 mb-2">
                                        Les données suivantes seront définitivement supprimées :
                                    </p>
                                    <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                                        <li>Tous vos comptes email configurés</li>
                                        <li>Historique complet de classification</li>
                                        <li>Informations de l'entreprise</li>
                                        <li>Profil et préférences</li>
                                    </ul>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-amber-900 mb-1">
                                        Abonnement Stripe
                                    </p>
                                    <p className="text-sm text-amber-800">
                                        Votre abonnement sera <strong>immédiatement résilié</strong> sur Stripe. Aucun remboursement ne sera effectué.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteUserModal(false)}
                                    disabled={isDeletingUser}
                                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteUserAccount}
                                    disabled={isDeletingUser}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeletingUser ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Suppression...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Supprimer définitivement
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'abonnement requis */}
            {showSubscriptionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 font-inter max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full mb-4">
                                <Lock className="w-8 h-8 text-orange-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Abonnement requis</h2>
                            <p className="text-gray-600">
                                Pour accéder à Hall IA, souscrivez au Plan Premier
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 border-2 border-orange-500 mb-6">
                            <div className="flex items-baseline justify-center mb-4">
                                <span className="text-5xl font-bold text-gray-900">29€</span>
                                <span className="text-xl text-gray-600 ml-2">HT/mois</span>
                            </div>
                            <p className="text-center text-sm font-medium text-orange-600 mb-6">Plan Premier</p>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">1 compte email inclus</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Tri automatique des emails (INFO, TRAITE, PUB)</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Réponses automatiques personnalisées par IA</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Statistiques détaillées et tableaux de bord</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Compatible Gmail et IMAP</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">Support prioritaire</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-orange-200">
                                <p className="text-sm text-gray-600 text-center">
                                    <span className="font-semibold">Comptes supplémentaires :</span> +19€ HT/mois par compte
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubscriptionModal(false)}
                                disabled={isCheckoutLoading}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubscribe}
                                disabled={isCheckoutLoading}
                                className="group relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                    {isCheckoutLoading ? 'Redirection...' : 'S\'abonner maintenant'}
                                </span>
                                {!isCheckoutLoading && (
                                    <svg
                                        className="relative z-10 h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
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
            )}

            {/* Modal email en double */}
            {showDuplicateEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Compte déjà existant</h2>
                            <button
                                onClick={() => {
                                    setShowDuplicateEmailModal(false);
                                    setDuplicateEmail('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-orange-900 mb-1">Compte déjà configuré</h3>
                                        <p className="text-sm text-orange-800">
                                            Le compte <span className="font-bold">{duplicateEmail}</span> est déjà configuré dans votre application.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 text-2xl">💡</div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-orange-900 mb-1">Conseil</h4>
                                        <p className="text-sm text-orange-800">
                                            Vous ne pouvez pas ajouter deux fois le même compte email. Si vous souhaitez modifier les paramètres de ce compte, rendez-vous dans la liste de vos comptes.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowDuplicateEmailModal(false);
                                        setDuplicateEmail('');
                                    }}
                                    className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                                    style={{background:`conic-gradient(
                                        from 195.77deg at 84.44% -1.66%,
                                        #FE9736 0deg,
                                        #F4664C 76.15deg,
                                        #F97E41 197.31deg,
                                        #E3AB8D 245.77deg,
                                        #FE9736 360deg
                                    )`}}
                                >
                                    J'ai compris
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification toast */}
            {showNotification && (
                <div className="fixed top-4 right-4 z-50 animate-fade-in-right">
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-orange-200">
                        {/* Barre latérale colorée */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F35F4F] to-[#FFAD5A]" />
                        
                        {/* Contenu */}
                        <div className="pl-6 pr-6 py-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-6 h-6 text-white stroke-[3]" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{notificationMessage}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Modification enregistrée</p>
                            </div>
                        </div>
                        
                        {/* Effet de brillance */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    </div>
                </div>
            )}

            {/* Modal d'édition du nom de l'entreprise */}
            {showEditCompanyNameModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Modifier le nom de l'entreprise</h2>
                            <button
                                onClick={() => setShowEditCompanyNameModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nom de l'entreprise
                                </label>
                                <input
                                    type="text"
                                    value={editTempValue}
                                    onChange={(e) => setEditTempValue(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                                    placeholder="Ex: Hall IA"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditCompanyNameModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!selectedAccount || !user) return;
                                        try {
                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update({
                                                    company_name: editTempValue,
                                                    updated_at: new Date().toISOString(),
                                                })
                                                .eq('id', selectedAccount.id);

                                            if (error) throw error;

                                            setCompanyFormData({ ...companyFormData, company_name: editTempValue });
                                            setShowEditCompanyNameModal(false);
                                            setNotificationMessage('Nom de l\'entreprise mis à jour');
                                            setShowNotification(true);
                                            setTimeout(() => setShowNotification(false), 3000);
                                        } catch (err) {
                                            showToast('Erreur lors de la mise à jour', 'error');
                                        }
                                    }}
                                    className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                                    style={{background:`conic-gradient(
                                        from 195.77deg at 84.44% -1.66%,
                                        #FE9736 0deg,
                                        #F4664C 76.15deg,
                                        #F97E41 197.31deg,
                                        #E3AB8D 245.77deg,
                                        #FE9736 360deg
                                    )`}}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'édition de la description de l'activité */}
            {showEditActivityModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Modifier la description de l'activité</h2>
                            <button
                                onClick={() => setShowEditActivityModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description de l'activité
                                </label>
                                <textarea
                                    value={editTempValue}
                                    onChange={(e) => setEditTempValue(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                    rows={6}
                                    placeholder="Exemple : Nous sommes une agence de marketing digital spécialisée dans la création de contenu et la gestion des réseaux sociaux pour les PME. Nous aidons nos clients à développer leur présence en ligne et à atteindre leurs objectifs commerciaux."
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Cette description sera utilisée par l'IA pour mieux comprendre votre contexte et classer vos e-mails.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditActivityModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!selectedAccount || !user) return;
                                        try {
                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update({
                                                    activity_description: editTempValue,
                                                    updated_at: new Date().toISOString(),
                                                })
                                                .eq('id', selectedAccount.id);

                                            if (error) throw error;

                                            setCompanyFormData({ ...companyFormData, activity_description: editTempValue });
                                            setShowEditActivityModal(false);
                                            setNotificationMessage('Description de l\'activité mise à jour');
                                            setShowNotification(true);
                                            setTimeout(() => setShowNotification(false), 3000);
                                        } catch (err) {
                                            showToast('Erreur lors de la mise à jour', 'error');
                                        }
                                    }}
                                    className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                                    style={{background:`conic-gradient(
                                        from 195.77deg at 84.44% -1.66%,
                                        #FE9736 0deg,
                                        #F4664C 76.15deg,
                                        #F97E41 197.31deg,
                                        #E3AB8D 245.77deg,
                                        #FE9736 360deg
                                    )`}}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'édition du logo de signature */}
            {showEditLogoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Modifier le logo de signature</h2>
                            <button
                                onClick={() => {
                                    setShowEditLogoModal(false);
                                    setIsDraggingLogo(false);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Logo de signature (optionnel)
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Logo de votre entreprise ou signature manuscrite scannée
                                </p>
                                
                                <div 
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                                        isDraggingLogo 
                                            ? 'border-orange-500 bg-orange-50' 
                                            : 'border-gray-300 hover:border-orange-400'
                                    }`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDraggingLogo(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setIsDraggingLogo(false);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDraggingLogo(false);
                                        
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && file.type.startsWith('image/')) {
                                            if (file.size > 2 * 1024 * 1024) {
                                                showToast('L\'image ne doit pas dépasser 2MB', 'error');
                                                return;
                                            }
                                            
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const base64 = event.target?.result as string;
                                                setCompanyFormData({ ...companyFormData, signature_image_base64: base64 });
                                            };
                                            reader.readAsDataURL(file);
                                        } else {
                                            showToast('Veuillez déposer une image valide', 'error');
                                        }
                                    }}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 2 * 1024 * 1024) {
                                                    showToast('L\'image ne doit pas dépasser 2MB', 'error');
                                                    return;
                                                }
                                                
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    const base64 = event.target?.result as string;
                                                    setCompanyFormData({ ...companyFormData, signature_image_base64: base64 });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="edit-signature-logo-upload"
                                    />
                                    <label
                                        htmlFor="edit-signature-logo-upload"
                                        className="cursor-pointer flex flex-col items-center"
                                    >
                                        {companyFormData.signature_image_base64 ? (
                                            <div className="space-y-3">
                                                <img
                                                    src={companyFormData.signature_image_base64}
                                                    alt="Logo de signature"
                                                    className="max-h-32 max-w-full object-contain mx-auto"
                                                />
                                                <p className="text-sm text-green-600 font-medium">✓ Logo téléchargé</p>
                                                <p className="text-xs text-gray-500">Cliquez ou glissez pour changer</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Cliquez ou glissez pour télécharger
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        PNG, JPG jusqu'à 2MB
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                
                                {companyFormData.signature_image_base64 && (
                                    <button
                                        type="button"
                                        onClick={() => setCompanyFormData({ ...companyFormData, signature_image_base64: '' })}
                                        className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                                    >
                                        <X className="w-4 h-4" />
                                        Supprimer le logo
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditLogoModal(false);
                                        setIsDraggingLogo(false);
                                    }}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!selectedAccount || !user) return;
                                        try {
                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update({
                                                    signature_image_base64: companyFormData.signature_image_base64 || null,
                                                    updated_at: new Date().toISOString(),
                                                })
                                                .eq('id', selectedAccount.id);

                                            if (error) throw error;

                                            setShowEditLogoModal(false);
                                            setIsDraggingLogo(false);
                                            setNotificationMessage('Logo de signature mis à jour');
                                            setShowNotification(true);
                                            setTimeout(() => setShowNotification(false), 3000);
                                        } catch (err) {
                                            showToast('Erreur lors de la mise à jour', 'error');
                                        }
                                    }}
                                    className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                                    style={{background:`conic-gradient(
                                        from 195.77deg at 84.44% -1.66%,
                                        #FE9736 0deg,
                                        #F4664C 76.15deg,
                                        #F97E41 197.31deg,
                                        #E3AB8D 245.77deg,
                                        #FE9736 360deg
                                    )`}}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'édition de la signature email */}
            {showEditSignatureModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Modifier la signature email</h2>
                            <button
                                onClick={() => setShowEditSignatureModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Signature email
                                </label>
                                <textarea
                                    value={editTempValue}
                                    onChange={(e) => setEditTempValue(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                    rows={4}
                                    placeholder={`Exemple :\nCordialement,\nJean Dupont\nCEO - Mon Entreprise\nTel: +33 6 12 34 56 78\nEmail: contact@entreprise.fr`}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditSignatureModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!selectedAccount || !user) return;
                                        try {
                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update({
                                                    services_offered: editTempValue,
                                                    updated_at: new Date().toISOString(),
                                                })
                                                .eq('id', selectedAccount.id);

                                            if (error) throw error;

                                            setCompanyFormData({ ...companyFormData, services_offered: editTempValue });
                                            setShowEditSignatureModal(false);
                                            setNotificationMessage('Signature email mise à jour');
                                            setShowNotification(true);
                                            setTimeout(() => setShowNotification(false), 3000);
                                        } catch (err) {
                                            showToast('Erreur lors de la mise à jour', 'error');
                                        }
                                    }}
                                    className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
                                    style={{background:`conic-gradient(
                                        from 195.77deg at 84.44% -1.66%,
                                        #FE9736 0deg,
                                        #F4664C 76.15deg,
                                        #F97E41 197.31deg,
                                        #E3AB8D 245.77deg,
                                        #FE9736 360deg
                                    )`}}
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals de confirmation */}
            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setAccountToDelete(null);
                }}
                onConfirm={handleDeleteAccount}
                email={accountToDelete?.email || ''}
                currentTotalAccounts={accounts.length}
                hasActiveSubscription={hasActiveSubscription}
            />

            <ConfirmationModal
                isOpen={showDeleteDocModal}
                onClose={() => {
                    setShowDeleteDocModal(false);
                    setDocToDelete(null);
                }}
                onConfirm={handleDeleteDocument}
                title="Supprimer le document"
                message="Êtes-vous sûr de vouloir supprimer définitivement ce document ? Cette action est irréversible."
                confirmText="Supprimer"
                cancelText="Annuler"
            />

            {showUpgradeModal && user && (
                <CheckoutModal
                    userId={user.id}
                    onComplete={handleUpgrade}
                    onClose={() => setShowUpgradeModal(false)}
                    isUpgrade={true}
                    currentAdditionalAccounts={currentAdditionalAccounts}
                    unlinkedSubscriptionsCount={unlinkedSubscriptions.length}
                />
            )}
        </>
    );
}