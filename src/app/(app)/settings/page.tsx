'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, FileText, Globe, Share2, X, Check, Lock, ChevronRight, Eye, EyeOff, Edit2Icon, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { HowItWorks } from '@/components/HowItWork';
import Container from '@/components/Container';
import { motion, AnimatePresence } from 'motion/react';

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

interface SettingsNewProps {
    onNavigateToEmailConfig?: () => void;
}

export default function Settings({ onNavigateToEmailConfig }: SettingsNewProps = {}) {
    const router = useRouter();
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
    const [autoSort, setAutoSort] = useState(false);
    const [adFilter, setAdFilter] = useState(true);
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);
    const [showImapModal, setShowImapModal] = useState(false);
    const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);
    const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
    const [companyInfoStep, setCompanyInfoStep] = useState(1);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<{ id: string; email: string; provider: string } | null>(null);
    const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
    const [duplicateEmail, setDuplicateEmail] = useState<string>('');
    const [accountMissingInfo, setAccountMissingInfo] = useState<string>('');
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
        services_offered: '',
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
    const [editTempValue, setEditTempValue] = useState('');

    useEffect(() => {
        loadAccounts();
        loadDocuments();
        checkCompanyInfo();
        checkSubscription();
    }, [user]);

    useEffect(() => {
        if (selectedAccount) {
            loadCompanyData();
        }
    }, [selectedAccount, user, showCompanyInfoModal]);

    useEffect(() => {
        const handleOAuthMessage = (event: MessageEvent) => {
            if (event.data.type === 'gmail-duplicate' || event.data.type === 'outlook-duplicate') {
                setDuplicateEmail(event.data.email);
                setShowDuplicateEmailModal(true);
            } else if (event.data.type === 'gmail-connected' || event.data.type === 'outlook-connected') {
                loadAccounts();
                checkSubscription();
                setShowAddAccountModal(false);
                setAccountMissingInfo(event.data.email || '');
                setShowCompanyInfoModal(true);
                setCompanyInfoStep(1);
            }
        };

        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, []);

    const checkSubscription = async () => {
        if (!user) return;

        try {
            const { data: allSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('subscription_type, status, cancel_at_period_end, current_period_end')
                .eq('user_id', user.id)
                .is('deleted_at', null);

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
        } catch (error) {
            console.error('Error checking subscription:', error);
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

        try {
            const { count } = await supabase
                .from('email_configurations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user?.id);

            const configuredAccounts = count || 0;

            if (configuredAccounts >= allowedAccounts) {
                setShowUpgradeModal(true);
                return;
            }

            setShowAddAccountModal(true);
        } catch (error) {
            console.error('Error checking account count:', error);
            setShowAddAccountModal(true);
        }
    };

    const handleUpgrade = async () => {
        setShowUpgradeModal(false);
        await checkSubscription();
    };

    const handleSubscribe = async () => {
        setIsCheckoutLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Vous devez être connecté');
                setIsCheckoutLoading(false);
                return;
            }

            const basePlanPriceId = process.env.NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID;

            if (!basePlanPriceId) {
                alert('Configuration Stripe manquante');
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
                alert(`Erreur: ${data.error}`);
                setIsCheckoutLoading(false);
                return;
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert('Erreur lors de la création de la session de paiement');
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

            if (allAccounts.length === 0) {
                setSelectedAccount(null);
                setCompanyFormData({
                    company_name: '',
                    activity_description: '',
                    services_offered: '',
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

    const checkCompanyInfo = async () => {
        if (!user) return;

        const { data: allConfigs } = await supabase
            .from('email_configurations')
            .select('email, company_name, activity_description, services_offered')
            .eq('user_id', user.id);

        if (!allConfigs || allConfigs.length === 0) return;

        const accountWithoutInfo = allConfigs.find(
            config => !config.activity_description || !config.company_name
        );

        if (accountWithoutInfo) {
            setAccountMissingInfo(accountWithoutInfo.email);
            setShowCompanyInfoModal(true);

            if (accountWithoutInfo.company_name && !accountWithoutInfo.activity_description) {
                setCompanyInfoStep(2);
                setCompanyFormData({
                    company_name: accountWithoutInfo.company_name,
                    activity_description: '',
                    services_offered: '',
                });
            } else {
                setCompanyInfoStep(1);
                setCompanyFormData({
                    company_name: accountWithoutInfo.company_name || '',
                    activity_description: '',
                    services_offered: '',
                });
            }
        }
    };

    const loadCompanyData = async () => {
        if (!user) return;

        const emailToLoad = accountMissingInfo || selectedAccount?.email;
        if (!emailToLoad) return;

        const { data: config } = await supabase
            .from('email_configurations')
            .select('company_name, activity_description, services_offered, is_classement')
            .eq('user_id', user.id)
            .eq('email', emailToLoad)
            .maybeSingle();

        if (config) {
            setCompanyFormData({
                company_name: config.company_name || '',
                activity_description: config.activity_description || '',
                services_offered: config.services_offered || '',
            });
            setAutoSort(config.is_classement ?? false);
        } else {
            setCompanyFormData({
                company_name: '',
                activity_description: '',
                services_offered: '',
            });
            setAutoSort(false);
        }
    };

    const handleEditCompanyInfo = () => {
        setShowEditCompanyModal(true);
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
                alert('Vous devez être connecté');
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
                console.error('Erreur lors de la suppression du compte:', data.error);
                alert(data.error || 'Erreur lors de la suppression du compte');
                return;
            }

            console.log('Compte email supprimé avec succès:', data);

            setShowDeleteModal(false);
            setAccountToDelete(null);
            loadAccounts();
            checkSubscription();
        } catch (error) {
            console.error('Erreur lors de la suppression du compte:', error);
            alert('Une erreur est survenue lors de la suppression');
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
                alert('Vous devez être connecté');
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
                alert('Erreur lors de la suppression du compte: ' + data.error);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du compte:', error);
            alert('Une erreur est survenue lors de la suppression du compte');
        } finally {
            setIsDeletingUser(false);
        }
    };

    const handleCompanyInfoNext = () => {
        if (companyInfoStep === 1 && !companyFormData.company_name) {
            alert('Veuillez entrer le nom de votre entreprise');
            return;
        }
        if (companyInfoStep === 2 && !companyFormData.activity_description) {
            alert('Veuillez décrire votre activité');
            return;
        }
        if (companyInfoStep < 3) {
            setCompanyInfoStep(companyInfoStep + 1);
        } else {
            handleCompanyInfoSubmit();
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

            if (!emailToUpdate) {
                alert('Aucun compte identifié');
                return;
            }

            const { data: existingConfig } = await supabase
                .from('email_configurations')
                .select('id')
                .eq('user_id', user?.id)
                .eq('email', emailToUpdate)
                .maybeSingle();

            if (existingConfig) {
                const { error } = await supabase
                    .from('email_configurations')
                    .update({
                        company_name: companyFormData.company_name,
                        activity_description: companyFormData.activity_description,
                        services_offered: companyFormData.services_offered,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingConfig.id);

                if (error) throw error;
            } else {
                let gmail_token_id = null;
                let outlook_token_id = null;

                if (selectedAccount?.provider === 'gmail') {
                    const { data: gmailToken } = await supabase
                        .from('gmail_tokens')
                        .select('id')
                        .eq('user_id', user?.id)
                        .eq('email', selectedAccount.email)
                        .maybeSingle();
                    gmail_token_id = gmailToken?.id;
                } else if (selectedAccount?.provider === 'outlook') {
                    const { data: outlookToken } = await supabase
                        .from('outlook_tokens')
                        .select('id')
                        .eq('user_id', user?.id)
                        .eq('email', selectedAccount.email)
                        .maybeSingle();
                    outlook_token_id = outlookToken?.id;
                }

                const { error } = await supabase
                    .from('email_configurations')
                    .insert({
                        user_id: user?.id,
                        name: selectedAccount?.email,
                        email: selectedAccount?.email,
                        provider: selectedAccount?.provider,
                        is_connected: true,
                        gmail_token_id,
                        outlook_token_id,
                        company_name: companyFormData.company_name,
                        activity_description: companyFormData.activity_description,
                        services_offered: companyFormData.services_offered,
                    });

                if (error) throw error;
            }

            setShowCompanyInfoModal(false);
            setShowSuccessModal(true);
            setCompanyInfoStep(1);
            setAccountMissingInfo('');
            await checkCompanyInfo();
            if (!showCompanyInfoModal) {
                await loadCompanyData();
            }
        } catch (err) {
            console.error('Erreur lors de l\'enregistrement:', err);
            alert('Erreur lors de l\'enregistrement des informations');
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
            console.error('Erreur connexion Gmail:', err);
            alert('Erreur lors de la connexion Gmail');
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
            console.error('Erreur vérification:', err);
            setTestError('Impossible de vérifier la connexion au serveur');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleImapSubmit = async () => {
        if (!imapFormData.email || !imapFormData.password || !imapFormData.imap_host) {
            alert('Veuillez remplir tous les champs obligatoires');
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
            setAccountMissingInfo(addedEmail);
            setShowCompanyInfoModal(true);
            setCompanyInfoStep(1);
        } catch (err) {
            console.error('Erreur ajout compte IMAP:', err);
            alert('Erreur lors de l\'ajout du compte');
        }
    };

    return (
        <>
        
            <Container>
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
                            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl font-inter"
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
                    <div className="mb-6 p-4 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
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
                        <div className="bg-white py-6 shadow-sm border border-gray-200 h-full rounded-bl-xl">
                            <div className="">
                                {accounts.map((account, index) => {
                                    const isDisabled = account.is_active === false || account.cancel_at_period_end === true;
                                    return (
                                    <div key={account.id} className="relative group">
                                    <motion.button
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                        whileHover={!isDisabled ? { scale: 1.02, x: 4 } : {}}
                                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                                        onClick={() => !isDisabled && setSelectedAccount(account)}
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

                                            const { error } = await supabase
                                                .from('email_configurations')
                                                .update({ is_classement: newValue })
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

                        {/* Informations du compte sélectionné */}
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

                                    
                                    {/* <button
                                        onClick={() => handleDeleteAccountClick(selectedAccount.id, selectedAccount.email, selectedAccount.provider)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button> */}
                              
                                <p className="text-sm text-gray-500">
                                  Flux de traitement automatique
                                </p>
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
                                </div>
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

                                                const { error } = await supabase
                                                    .from('email_configurations')
                                                    .update({ is_classement: newValue })
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
</Container>

            {/* Modal d'information de l'entreprise */}
            {showCompanyInfoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl font-inter">
                        <div className="flex items-center gap-3 mb-6">
                            {companyInfoStep > 1 && (
                                <button
                                    onClick={handleCompanyInfoBack}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-180 text-gray-600" />
                                </button>
                            )}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900">Description de votre activité</h2>
                            </div>
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
                                <span className="font-semibold">Étape {companyInfoStep}/3</span> - {
                                    companyInfoStep === 1 ? 'Nom de l\'entreprise' :
                                        companyInfoStep === 2 ? 'Description de l\'activité' :
                                            'Services proposés'
                                }
                            </p>
                        </div>

                        {companyInfoStep === 1 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Nom de l'entreprise
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
                                        Description de l'activité
                                    </label>
                                    <textarea
                                        value={companyFormData.activity_description}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, activity_description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Décrivez ce que fait votre entreprise..."
                                        
                                        rows={4}
                                    />
                                </div>
                            </div>
                        )}

                        {companyInfoStep === 3 && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Signature email
                                    </label>
                                    <textarea
                                        value={companyFormData.services_offered}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, services_offered: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Votre signature d'email..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleCompanyInfoNext}
                                className="group relative flex-1 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl"
                            >
                                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                                    {companyInfoStep === 3 ? 'Terminer' : 'Continuer'}
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
                            <button
                                onClick={() => {
                                    setShowCompanyInfoModal(false);
                                    setCompanyInfoStep(1);
                                    setAccountMissingInfo('');
                                    setCompanyFormData({
                                        company_name: '',
                                        activity_description: '',
                                        services_offered: '',
                                    });
                                }}
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                            >
                                Retour
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de succès */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl font-inter">
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800 text-center font-medium">
                                Étape 3/3 - Configuration terminée
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl font-inter">
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
                                className={`w-full px-4 py-2.5 border-2 border-orange-500 text-orange-600 rounded-full font-medium hover:bg-gradient-to-br hover:from-[#F35F4F] hover:to-[#FFAD5A] hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-2 ${(testingConnection || !imapFormData.email || !imapFormData.password || !imapFormData.imap_host || !imapFormData.imap_port) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {testingConnection ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Test en cours...
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
            {showEditCompanyModal && selectedAccount && (
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
                                console.error('Erreur lors de la mise à jour:', err);
                                alert('Erreur lors de la mise à jour des informations');
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
                                    placeholder="Décrivez en détail votre activité, vos services, votre secteur..."
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
                                    placeholder="Votre signature email habituelle..."
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
            )}

            {/* Modal de suppression de compte utilisateur */}
            {showDeleteUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden font-inter">
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 font-inter">
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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter">
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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter">
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
                                            console.error('Erreur lors de la mise à jour:', err);
                                            alert('Erreur lors de la mise à jour');
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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter">
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
                                    placeholder="Décrivez en détail votre activité, vos services, votre secteur..."
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
                                            console.error('Erreur lors de la mise à jour:', err);
                                            alert('Erreur lors de la mise à jour');
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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl font-inter">
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
                                    placeholder="Votre signature email habituelle..."
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
                                            console.error('Erreur lors de la mise à jour:', err);
                                            alert('Erreur lors de la mise à jour');
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

            {showUpgradeModal && (
                <UpgradeModal
                    onClose={() => setShowUpgradeModal(false)}
                    onUpgrade={handleUpgrade}
                    currentAdditionalAccounts={currentAdditionalAccounts}
                />
            )}
        </>
    );
}