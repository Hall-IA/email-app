'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  Trash2,
  FileText,
  Globe,
  X,
  Check,
  Eye,
  EyeOff,
  Edit2Icon,
  Mail,
  Upload,
  Loader2,
  Download,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { CheckoutAdditionalModal } from '@/components/CheckoutAdditionalModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { AdditionalEmailModal } from '@/components/AdditionalEmailModal';
import { CompanyInfoModal } from '@/components/CompanyInfoModal';
import { HowItWorks } from '@/components/HowItWork';
import Container from '@/components/Container';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/components/Toast';
import {
  syncKnowledgeBase,
  fileToBase64,
  isValidUrl,
  validatePdfFile,
} from '@/utils/knowledgeBaseService';

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
  const [selectedSlot, setSelectedSlot] = useState<{
    index: number;
    subscription_id: string;
  } | null>(null);
  const [unlinkedSubscriptions, setUnlinkedSubscriptions] = useState<{ subscription_id: string }[]>(
    [],
  );
  const [autoSort, setAutoSort] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showImapModal, setShowImapModal] = useState(false);
  const [showSlotConfigModal, setShowSlotConfigModal] = useState(false);
  const [selectedSlotForConfig, setSelectedSlotForConfig] = useState<{
    index: number;
    subscription_id: string;
  } | null>(null);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);
  const [companyInfoStep, setCompanyInfoStep] = useState(1);
  const [accountMissingInfo, setAccountMissingInfo] = useState<string>('');
  const [hasCheckedCompanyInfo, setHasCheckedCompanyInfo] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{
    id: string;
    email: string;
    provider: string;
  } | null>(null);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState<string>('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
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
  const [modalError, setModalError] = useState<string>('');
  const [totalPaidSlots, setTotalPaidSlots] = useState(0); // Nombre total d'emails payés (base + additionnels)

  // Knowledge base states
  const [currentConfig, setCurrentConfig] = useState<{
    id: string;
    email: string;
    knowledge_base_urls: any;
    knowledge_base_pdfs: any;
  } | null>(null);
  const [knowledgeUrls, setKnowledgeUrls] = useState<string[]>(['']);
  const [knowledgePdfFiles, setKnowledgePdfFiles] = useState<File[]>([]);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const connectGmail = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmail-oauth-init`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ redirectUrl: window.location.origin }),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Échec de l'initialisation Gmail");
      }
      const { authUrl } = await response.json();
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(
        authUrl,
        'Gmail OAuth',
        `width=${width},height=${height},left=${left},top=${top}`,
      );
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-email-connection`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: imapFormData.email,
            password: imapFormData.password,
            imap_host: imapFormData.imap_host,
            imap_port: parseInt(imapFormData.imap_port),
          }),
        },
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
        is_classement: false,
        password: imapFormData.password,
        imap_host: imapFormData.imap_host,
        imap_port: parseInt(imapFormData.imap_port),
        imap_username: imapFormData.email,
        imap_password: imapFormData.password,
      });

      if (error) throw error;

      setShowImapModal(false);
      setImapFormData({
        email: '',
        password: '',
        imap_host: '',
        imap_port: '993',
      });
      await loadAccounts();
    } catch (err) {
      showToast("Erreur lors de l'ajout du compte", 'error');
    }
  };

  const checkCompanyInfoForAccount = async () => {
    if (!user || !selectedAccount) return;

    // Ne pas ouvrir automatiquement si la modal est déjà ouverte ou si on a déjà vérifié
    if (hasCheckedCompanyInfo) return;

    try {
      // Recharger les données pour être sûr d'avoir les dernières valeurs
      const emailToLoad = selectedAccount.email;
      const { data: config } = await supabase
        .from('email_configurations')
        .select('company_name, activity_description, services_offered')
        .eq('user_id', user.id)
        .eq('email', emailToLoad)
        .maybeSingle();

      // Vérifier si les champs obligatoires sont manquants (nom, description, signature d'email)
      const companyName = config?.company_name?.trim() || '';
      const activityDescription = config?.activity_description?.trim() || '';
      const signatureEmail = config?.services_offered?.trim() || '';

      const missingCompanyName = !companyName;
      const missingActivityDescription = !activityDescription;
      const missingSignatureEmail = !signatureEmail;

      const isMissingMandatoryInfo =
        missingCompanyName || missingActivityDescription || missingSignatureEmail;

      if (isMissingMandatoryInfo) {
        // Déterminer l'étape de départ basée sur les données actuelles
        let startStep = 1;
        if (missingCompanyName) {
          startStep = 1;
        } else if (missingActivityDescription) {
          startStep = 2;
        } else if (missingSignatureEmail) {
          startStep = 3;
        }

        setCompanyInfoStep(startStep);
        setAccountMissingInfo(selectedAccount.email);
        setHasCheckedCompanyInfo(true);

        // Ouvrir la modal d'édition des informations de l'entreprise
        setShowCompanyInfoModal(true);
      } else {
        // Si les informations sont complètes, s'assurer que la modal est fermée
        setShowCompanyInfoModal(false);
        setAccountMissingInfo('');
        setHasCheckedCompanyInfo(true);
      }
    } catch (error) {
      console.error('Error checking company info:', error);
      // En cas d'erreur, ne pas afficher la modal
      setShowCompanyInfoModal(false);
      setHasCheckedCompanyInfo(true);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadDocuments();
    checkSubscription();
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      // Réinitialiser le flag quand on change de compte
      setHasCheckedCompanyInfo(false);
      // Ne pas afficher la modal immédiatement - attendre que les données soient chargées
      setShowCompanyInfoModal(false);
      // Charger les données d'abord, puis vérifier
      const loadAndCheck = async () => {
        await loadCompanyData();
        await loadCurrentConfig();
        // Attendre que le state soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 200));
        checkCompanyInfoForAccount();
      };
      loadAndCheck();
    } else if (selectedSlot && !selectedAccount) {
      // Pour les slots non configurés, réinitialiser les données (ne pas charger celles du compte principal)
      setCompanyFormData({
        company_name: '',
        activity_description: '',
        services_proposed: '',
        services_offered: '',
        signature_image_base64: '',
      });
      setAutoSort(false);
      // Ne pas charger les données du compte principal
      /* const loadPrimaryForSlot = async () => {
                if (!user) return;
                const primaryAccount = accounts.find(acc => acc.is_active !== false && acc.cancel_at_period_end !== true) || accounts[0];
                if (primaryAccount) {
                    // Charger les données du compte principal
                    const { data: config } = await supabase
                        .from('email_configurations')
                        .select('company_name, activity_description, services_offered, is_classement, signature_image_base64')
                        .eq('user_id', user.id)
                        .eq('email', primaryAccount.email)
                        .maybeSingle();

                    if (config) {
                        setCompanyFormData({
                            company_name: config.company_name || '',
                            activity_description: config.activity_description || '',
                            services_proposed: '',
                            services_offered: config.services_offered || '',
                            signature_image_base64: config.signature_image_base64 || '',
                        });
                    }

                    // Charger la config pour la base de connaissances
                    const { data: knowledgeConfig } = await supabase
                        .from('email_configurations')
                        .select('id, email, knowledge_base_urls, knowledge_base_pdfs')
                        .eq('user_id', user.id)
                        .eq('email', primaryAccount.email)
                        .maybeSingle();

                    if (knowledgeConfig) {
                        setCurrentConfig({
                            id: knowledgeConfig.id,
                            email: knowledgeConfig.email,
                            knowledge_base_urls: knowledgeConfig.knowledge_base_urls,
                            knowledge_base_pdfs: knowledgeConfig.knowledge_base_pdfs,
                        });
                    }
                }
            }; */
      // Ne plus charger les données du compte principal pour les slots non configurés
      // Réinitialiser aussi la config de la base de connaissances
      setCurrentConfig(null);
      setKnowledgeUrls(['']);
      setKnowledgePdfFiles([]);
    }
  }, [selectedAccount, selectedSlot, user, accounts]);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-force-sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {}

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
        if (
          error.code === '42P01' ||
          error.code === '42703' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('column')
        ) {
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

      const premierSub = allSubs?.find(
        (s) => s.subscription_type === 'premier' && ['active', 'trialing'].includes(s.status),
      );

      const isActive = !!premierSub;
      setHasActiveSubscription(isActive);
      setIsCanceled(premierSub?.cancel_at_period_end || false);

      if (premierSub?.current_period_end) {
        setSubscriptionEndDate(new Date(premierSub.current_period_end * 1000));
      }

      if (isActive) {
        const additionalSubs =
          allSubs?.filter(
            (s) =>
              s.subscription_type === 'additional_account' &&
              ['active', 'trialing'].includes(s.status),
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
        if (
          subsError.code === '42P01' ||
          subsError.code === '42703' ||
          subsError.message?.includes('does not exist') ||
          subsError.message?.includes('column')
        ) {
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
      const premierCount = allSubs.filter((s) => s.subscription_type === 'premier').length;

      // Récupérer la quantité réelle depuis Stripe pour chaque subscription additionnelle
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error('⚠️ Pas de session pour récupérer les quantités');
        const additionalCount = allSubs.filter(
          (s) => s.subscription_type === 'additional_account',
        ).length;
        const total = premierCount > 0 ? 1 + additionalCount : 0;
        setTotalPaidSlots(total);
        return;
      }

      // Récupérer les quantités depuis Stripe via une fonction backend
      let totalAdditionalQuantity = 0;
      const additionalSubs = allSubs.filter((s) => s.subscription_type === 'additional_account');

      for (const sub of additionalSubs) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-subscription-quantity`,
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
            totalAdditionalQuantity += quantity;
          } else {
            console.warn(
              `⚠️ Impossible de récupérer la quantité pour ${sub.subscription_id}, utilisation de 1 par défaut`,
            );
            totalAdditionalQuantity += 1; // Fallback : 1 par défaut
          }
        } catch (error) {
          console.error(
            `❌ Erreur lors de la récupération de la quantité pour ${sub.subscription_id}:`,
            error,
          );
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

    setShowAddAccountModal(true);
  };

  const handleSubscribe = async () => {
    setIsCheckoutLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        .select(
          'subscription_id, status, cancel_at_period_end, subscription_type, email_configuration_id',
        )
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const allAccounts: EmailAccount[] = (emailConfigs || []).map((config) => {
        let subscriptionInfo = {};

        const configSubs = allSubs?.filter((s) => s.email_configuration_id === config.id) || [];

        const activeSub = configSubs.find((s) => ['active', 'trialing'].includes(s.status));

        if (activeSub) {
          subscriptionInfo = {
            cancel_at_period_end: activeSub.cancel_at_period_end,
            subscription_status: activeSub.status,
          };
        }

        return {
          id: config.id,
          email: config.email,
          provider: config.provider || 'imap',
          is_active: config.is_active !== false,
          ...subscriptionInfo,
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
        (acc) => acc.id === selectedAccount?.id && acc.provider === selectedAccount?.provider,
      );

      if (!currentAccountStillExists) {
        // Sélectionner le premier compte ACTIF (non désactivé et non en résiliation)
        const firstActiveAccount = allAccounts.find(
          (acc) => acc.is_active !== false && acc.cancel_at_period_end !== true,
        );
        setSelectedAccount(firstActiveAccount || allAccounts[0]);
      } else if (!selectedAccount) {
        // Sélectionner le premier compte ACTIF (non désactivé et non en résiliation)
        const firstActiveAccount = allAccounts.find(
          (acc) => acc.is_active !== false && acc.cancel_at_period_end !== true,
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
      .select(
        'company_name, activity_description, services_proposed, services_offered, signature_image_base64',
      )
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

    try {
      const { data: config, error } = await supabase
        .from('email_configurations')
        .select(
          'company_name, activity_description, services_offered, is_classement, signature_image_base64',
        )
        .eq('user_id', user.id)
        .eq('email', emailToLoad)
        .maybeSingle();

      if (error) {
        console.error('Error loading company data:', error);
        return;
      }

      if (config) {
        setCompanyFormData({
          company_name: config.company_name || '',
          activity_description: config.activity_description || '',
          services_proposed: '',
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
    } catch (error) {
      console.error('Error in loadCompanyData:', error);
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
        if (
          error.code === '42703' ||
          error.message?.includes('column') ||
          error.message?.includes('does not exist')
        ) {
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

    const confirmDelete = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette URL de la base de connaissances ?',
    );
    if (!confirmDelete) return;

    try {
      const existingUrls = currentConfig.knowledge_base_urls
        ? Array.isArray(currentConfig.knowledge_base_urls)
          ? currentConfig.knowledge_base_urls
          : JSON.parse(currentConfig.knowledge_base_urls || '[]')
        : [];

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
      showToast("Erreur lors de la suppression de l'URL", 'error');
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

    const confirmDelete = window.confirm(
      'Êtes-vous sûr de vouloir supprimer ce PDF de la base de connaissances ?',
    );
    if (!confirmDelete) return;

    try {
      const existingPdfs = currentConfig.knowledge_base_pdfs
        ? Array.isArray(currentConfig.knowledge_base_pdfs)
          ? currentConfig.knowledge_base_pdfs
          : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')
        : [];

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

    const newUrls = knowledgeUrls.filter((url) => url.trim() !== '');

    const existingUrls = currentConfig.knowledge_base_urls
      ? Array.isArray(currentConfig.knowledge_base_urls)
        ? currentConfig.knowledge_base_urls
        : JSON.parse(currentConfig.knowledge_base_urls || '[]')
      : [];

    const existingPdfs = currentConfig.knowledge_base_pdfs
      ? Array.isArray(currentConfig.knowledge_base_pdfs)
        ? currentConfig.knowledge_base_pdfs
        : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')
      : [];

    if (
      newUrls.length === 0 &&
      knowledgePdfFiles.length === 0 &&
      existingUrls.length === 0 &&
      existingPdfs.length === 0
    ) {
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
            base64: base64,
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
        if (
          dbError.code === '42703' ||
          dbError.message?.includes('column') ||
          dbError.message?.includes('does not exist')
        ) {
          console.error('Knowledge base columns not found. Please run migration:', dbError);
          showToast(
            'Les colonnes de base de connaissances ne sont pas encore créées. Veuillez appliquer la migration.',
            'error',
          );
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-email-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_configuration_id: accountToDelete.id,
          }),
        },
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
    setDocuments(documents.filter((doc) => doc.id !== docToDelete));
    setDocToDelete(null);
  };

  const handleDeleteUserAccount = async () => {
    if (!user) return;

    setIsDeletingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showToast('Vous devez être connecté', 'error');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
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

  return (
    <section className="mx-auto max-w-7xl">
      <ToastComponent />

      <Container>
        <HowItWorks />

        {/* Contenu principal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="font-inter mt-6 w-full"
        >
          {/* Header avec bouton */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-inter flex flex-col items-center justify-between rounded-t-xl border border-gray-200 bg-white p-6 sm:flex-row"
          >
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Configuration de vos emails</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddAccountClick}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-3 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 sm:w-fit md:px-4 md:py-2"
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
                className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
              />
              <span className="relative z-10">Ajouter un compte</span>
            </motion.button>
          </motion.div>

          {/* Bannière d'abonnement annulé */}
          {isCanceled && hasActiveSubscription && subscriptionEndDate && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <div className="mb-1 font-bold text-amber-900">Abonnement annulé</div>
                  <div className="mb-3 text-sm text-amber-800">
                    Votre abonnement a été annulé et restera actif jusqu'au{' '}
                    <strong>
                      {subscriptionEndDate.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                    . Après cette date, vos comptes email seront désactivés et vous n'aurez plus
                    accès aux fonctionnalités de Hall IA.
                  </div>
                  <button
                    onClick={() => router.push('/user-settings?tab=subscription')}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                  >
                    Réactiver mon abonnement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Layout principal */}
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
            {/* Colonne gauche - Liste des comptes */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="flex h-full flex-col rounded-bl-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '1300px' }}>
                  {accounts.map((account, index) => {
                    const isDisabled =
                      account.is_active === false || account.cancel_at_period_end === true;
                    return (
                      <div key={account.id} className="group relative">
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
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            isDisabled
                              ? 'cursor-not-allowed border-2 border-gray-300 bg-gray-100 text-gray-200 opacity-40 grayscale'
                              : selectedAccount?.id === account.id
                                ? 'border-l-4 border-orange-500 bg-orange-50 text-black shadow-md'
                                : 'text-black hover:bg-gray-100'
                          }`}
                          disabled={isDisabled}
                        >
                          <div className="flex items-center gap-3">
                            {/* Icône Gmail ou Mail */}
                            {account.provider === 'gmail' ? (
                              <div className="flex h-10 w-10 items-center justify-center">
                                <img
                                  src="/logo/gmail.png"
                                  alt="Gmail
                    "
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center">
                                <Mail
                                  className={`h-5 w-5 ${isDisabled ? 'text-gray-400' : 'text-orange-500'}`}
                                />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <div
                                  className={`truncate font-medium ${isDisabled ? 'text-gray-400' : ''}`}
                                >
                                  {account.email}
                                </div>
                                {isDisabled && (
                                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                                    {account.cancel_at_period_end ? 'En résiliation' : 'Inactif'}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}
                              >
                                {account.provider === 'gmail'
                                  ? 'Gmail'
                                  : account.provider === 'outlook'
                                    ? 'Outlook'
                                    : 'IMAP'}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                        {/* Tooltip pour les comptes désactivés */}
                        {isDisabled && (
                          <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            Réactiver vos emails dans Compte &gt; Abonnement
                            <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Slots d'emails payés mais non configurés */}
                  {totalPaidSlots > accounts.length &&
                    Array.from({ length: totalPaidSlots - accounts.length }).map((_, index) => {
                      const slotSub = unlinkedSubscriptions[index];
                      const isSelected = selectedSlot?.index === index;

                      return (
                        <motion.button
                          key={`slot-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.3 + (accounts.length + index) * 0.1,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slotSub?.subscription_id) {
                              // Ouvrir directement la modal de configuration
                              setSelectedSlotForConfig({
                                index,
                                subscription_id: slotSub.subscription_id,
                              });
                              setShowSlotConfigModal(true);
                              // Sélectionner aussi le slot pour afficher la colonne de droite
                              setSelectedSlot({ index, subscription_id: slotSub.subscription_id });
                              setSelectedAccount(null); // Désélectionner le compte configuré
                            } else {
                              setShowAddAccountModal(true);
                            }
                          }}
                          className={`w-full border-2 border-dashed bg-gray-50 px-4 py-3 text-left transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 shadow-md'
                              : 'border-gray-300 hover:border-orange-300 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Icône Mail grisée */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-600">
                                Email #{accounts.length + index + 1}
                              </div>
                              <div className="text-xs text-gray-500">Non configuré</div>
                            </div>

                            {/* Badge */}
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-green-700">
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
                    className="mb-0 border-t border-r border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 rounded-md border p-1">
                        <div className="relative flex items-center gap-2">
                          {autoSort && (
                            <>
                              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                            </>
                          )}
                          {!autoSort && (
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-400"></span>
                          )}
                          <span className="text-sm font-medium text-gray-600">État</span>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${
                            autoSort ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {autoSort ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      {(() => {
                        // Vérifier si les informations obligatoires sont renseignées
                        const missingInfo = [];
                        if (!companyFormData.company_name?.trim()) {
                          missingInfo.push("Nom de l'entreprise");
                        }
                        if (!companyFormData.activity_description?.trim()) {
                          missingInfo.push("Description de l'activité et services");
                        }
                        if (!companyFormData.services_offered?.trim()) {
                          missingInfo.push('Signature email');
                        }

                        const hasRequiredInfo = missingInfo.length === 0;
                        const isDisabled =
                          (hasEverHadSubscription && !hasActiveSubscription) || !hasRequiredInfo;

                        // Déterminer l'étape à ouvrir si des informations manquent
                        const getMissingStep = () => {
                          if (!companyFormData.company_name?.trim()) {
                            return 1;
                          } else if (!companyFormData.activity_description?.trim()) {
                            return 2;
                          }
                          return 1;
                        };

                        return (
                          <div className="group/tooltip relative">
                            <button
                              disabled={isDisabled}
                              onClick={async () => {
                                if (!user || !selectedAccount) return;

                                // Si des informations manquent, ouvrir la modal au lieu de toggle
                                if (!hasRequiredInfo) {
                                  const stepToOpen = getMissingStep();
                                  setCompanyInfoStep(stepToOpen);
                                  setAccountMissingInfo(selectedAccount.email);
                                  setHasCheckedCompanyInfo(false);
                                  // Ouvrir la modal d'édition des informations de l'entreprise
                                  setShowCompanyInfoModal(true);
                                  return;
                                }

                                if (isDisabled) return;
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
                                  setNotificationMessage(
                                    newValue
                                      ? 'Tri automatique activé'
                                      : 'Tri automatique désactivé',
                                  );
                                  setShowNotification(true);
                                  setTimeout(() => setShowNotification(false), 3000);
                                }
                              }}
                              className={`relative h-8 w-14 rounded-full transition-colors ${
                                isDisabled
                                  ? 'cursor-not-allowed bg-gray-200'
                                  : autoSort
                                    ? 'bg-green-500'
                                    : 'bg-gray-300'
                              }`}
                            >
                              <div
                                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition-transform ${
                                  autoSort ? 'translate-x-6' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            {!hasRequiredInfo && (
                              <div className="pointer-events-none absolute right-full bottom-full z-50 mr-2 mb-2 min-w-[200px] rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover/tooltip:opacity-100">
                                <div className="mb-2 font-semibold">
                                  Informations manquantes pour l'activation du traitement
                                  automatique :
                                </div>
                                <ul className="list-inside list-disc space-y-1">
                                  {missingInfo.map((info, index) => (
                                    <li key={index}>{info}</li>
                                  ))}
                                </ul>
                                <div className="absolute top-full right-4 -mt-1">
                                  <div className="border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Informations du compte sélectionné ou du slot sélectionné */}
              <AnimatePresence mode="wait">
                {(selectedAccount || selectedSlot) && (
                  <motion.div
                    key={
                      selectedAccount
                        ? `info-${selectedAccount.id}`
                        : `slot-info-${selectedSlot?.index}`
                    }
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="font-inter border-r border-gray-200 bg-white p-6"
                  >
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedAccount
                        ? selectedAccount.email
                        : `Email #${accounts.length + (selectedSlot?.index || 0) + 1}`}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedAccount ? 'Flux de traitement automatique' : 'Non configuré'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Informations de l'entreprise */}
              <AnimatePresence mode="wait">
                {(selectedAccount || selectedSlot) && (
                  <motion.div
                    key={
                      selectedAccount
                        ? `company-${selectedAccount.id}`
                        : `slot-company-${selectedSlot?.index}`
                    }
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="font-inter relative rounded-br-xl border-r border-b border-gray-200 bg-white p-6 shadow-sm"
                  >
                    {/* Fond blanc avec bouton pour les slots non configurés */}
                    {selectedSlot && !selectedAccount && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-br-xl bg-white">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const slotSub = unlinkedSubscriptions[selectedSlot.index];
                            if (slotSub?.subscription_id) {
                              // Ouvrir la modal de configuration
                              setSelectedSlotForConfig({
                                index: selectedSlot.index,
                                subscription_id: slotSub.subscription_id,
                              });
                              setShowSlotConfigModal(true);
                            } else {
                              setShowAddAccountModal(true);
                            }
                          }}
                          className="rounded-lg bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                        >
                          Configurer l'email
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Nom de l'entreprise:</span>
                          <button
                            onClick={() => {
                              setEditTempValue(companyFormData.company_name);
                              setModalError('');
                              setShowEditCompanyNameModal(true);
                            }}
                          >
                            <Edit2Icon className="h-5 w-5 cursor-pointer text-blue-500 hover:text-blue-700" />
                          </button>
                        </div>
                        <p className="mt-2 font-medium text-gray-900">
                          {companyFormData.company_name || 'Non renseigné'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="mb-2 text-gray-500">Description de l'activité:</span>
                          <button
                            onClick={() => {
                              setEditTempValue(companyFormData.activity_description);
                              setModalError('');
                              setShowEditActivityModal(true);
                            }}
                          >
                            <Edit2Icon className="h-5 w-5 cursor-pointer text-blue-500 hover:text-blue-700" />
                          </button>
                        </div>
                        <p className="mt-2 font-medium whitespace-pre-wrap text-gray-900">
                          {companyFormData.activity_description || 'Non renseignée'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="mb-2 text-gray-500">Signature email:</span>
                          <button
                            onClick={() => {
                              setEditTempValue(companyFormData.services_offered);
                              setModalError('');
                              setShowEditSignatureModal(true);
                            }}
                          >
                            <Edit2Icon className="h-5 w-5 cursor-pointer text-blue-500 hover:text-blue-700" />
                          </button>
                        </div>
                        <p className="mt-2 font-medium whitespace-pre-wrap text-gray-900">
                          {companyFormData.services_offered || 'Non renseignée'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="mb-2 text-gray-500">Logo de signature:</span>
                          <button onClick={() => setShowEditLogoModal(true)}>
                            <Edit2Icon className="h-5 w-5 cursor-pointer text-blue-500 hover:text-blue-700" />
                          </button>
                        </div>
                        {companyFormData.signature_image_base64 ? (
                          <img
                            src={companyFormData.signature_image_base64}
                            alt="Logo de signature"
                            className="mt-2 max-h-24 max-w-full object-contain"
                          />
                        ) : (
                          <p className="mt-2 font-medium text-gray-900">Non renseigné</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Base de connaissances */}
              <AnimatePresence mode="wait">
                {(selectedAccount || selectedSlot) && (
                  <motion.div
                    key={
                      selectedAccount
                        ? `knowledge-${selectedAccount.id}`
                        : `slot-knowledge-${selectedSlot?.index}`
                    }
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="font-inter relative border-r border-b border-gray-200 bg-white p-6 shadow-sm"
                  >
                    {/* Fond blanc avec bouton pour les slots non configurés */}
                    {selectedSlot && !selectedAccount && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const slotSub = unlinkedSubscriptions[selectedSlot.index];
                            if (slotSub?.subscription_id) {
                              setSelectedSlotForConfig({
                                index: selectedSlot.index,
                                subscription_id: slotSub.subscription_id,
                              });
                              setShowSlotConfigModal(true);
                            } else {
                              setShowAddAccountModal(true);
                            }
                          }}
                          className="rounded-lg bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                        >
                          Configurer l'email
                        </button>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="mb-2 text-lg font-bold text-[#3D2817]">
                        Base de connaissances
                      </h3>
                      <p className="text-sm text-gray-500">
                        Ajoutez des ressources pour enrichir les réponses de l'IA
                      </p>
                    </div>

                    {currentConfig ? (
                      <div className="space-y-6">
                        {/* Configuration Info */}
                        <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                              <FileText className="h-5 w-5 text-[#EF6855]" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">Configuration pour</div>
                              <div className="font-semibold text-[#3D2817]">
                                {currentConfig.email}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* URLs Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="h-5 w-5 text-[#EF6855]" />
                              <label className="block text-sm font-semibold text-gray-700">
                                URLs de la base de connaissance
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddKnowledgeUrl}
                              className="flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-[#EF6855] transition-colors hover:bg-orange-50"
                            >
                              <Plus className="h-4 w-4" />
                              Ajouter
                            </button>
                          </div>

                          {/* Display existing URLs */}
                          {(() => {
                            const existingUrls = currentConfig?.knowledge_base_urls
                              ? Array.isArray(currentConfig.knowledge_base_urls)
                                ? currentConfig.knowledge_base_urls
                                : JSON.parse(currentConfig.knowledge_base_urls || '[]')
                              : [];

                            return (
                              existingUrls.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {existingUrls.map((url: string, index: number) => (
                                    <div
                                      key={`existing-url-${index}`}
                                      className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3"
                                    >
                                      <Globe className="h-5 w-5 flex-shrink-0 text-green-600" />
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block truncate text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                          title={url}
                                        >
                                          {url}
                                        </a>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveExistingUrl(index)}
                                        className="flex-shrink-0 rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                                        title="Supprimer cette URL"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )
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
                                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[#EF6855]"
                                  placeholder="https://example.com/documentation"
                                />
                                {knowledgeUrls.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKnowledgeUrl(index)}
                                    className="rounded-lg p-3 text-red-600 transition-colors hover:bg-red-50"
                                    title="Supprimer cette URL"
                                  >
                                    <Trash2 className="h-5 w-5" />
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
                            <span className="bg-white px-4 font-medium text-gray-500">ET/OU</span>
                          </div>
                        </div>

                        {/* PDF Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-[#EF6855]" />
                            <label className="block text-sm font-semibold text-gray-700">
                              Documents PDF
                            </label>
                          </div>

                          {/* Display existing and new PDFs */}
                          {(() => {
                            const existingPdfs = currentConfig?.knowledge_base_pdfs
                              ? Array.isArray(currentConfig.knowledge_base_pdfs)
                                ? currentConfig.knowledge_base_pdfs
                                : JSON.parse(currentConfig.knowledge_base_pdfs || '[]')
                              : [];

                            return (
                              (existingPdfs.length > 0 || knowledgePdfFiles.length > 0) && (
                                <div className="space-y-2">
                                  {/* Existing PDFs */}
                                  {existingPdfs.map((pdf: any, index: number) => (
                                    <div
                                      key={`existing-${index}`}
                                      className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3"
                                    >
                                      <FileText className="h-5 w-5 flex-shrink-0 text-green-600" />
                                      <div className="min-w-0 flex-1">
                                        <button
                                          onClick={() => handleDownloadPdf(pdf.name, pdf.base64)}
                                          className="block w-full truncate text-left text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                          title={`Cliquer pour télécharger ${pdf.name}`}
                                        >
                                          {pdf.name}
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => handleDownloadPdf(pdf.name, pdf.base64)}
                                        className="flex-shrink-0 rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
                                        title="Télécharger le PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveExistingPdf(index)}
                                        className="flex-shrink-0 rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                                        title="Supprimer ce PDF"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}

                                  {/* New PDFs to be uploaded */}
                                  {knowledgePdfFiles.map((file, index) => (
                                    <div
                                      key={`new-${index}`}
                                      className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"
                                    >
                                      <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-700">
                                          {file.name}
                                        </div>
                                        <div className="text-xs text-blue-600">
                                          Nouveau - À enregistrer (
                                          {(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePdf(index)}
                                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )
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
                              className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all ${
                                isDraggingPdf
                                  ? 'scale-[1.02] border-[#EF6855] bg-orange-50'
                                  : 'border-gray-300 hover:border-[#EF6855] hover:bg-gray-50'
                              }`}
                            >
                              <div className="pointer-events-none flex flex-col items-center justify-center py-4">
                                {isDraggingPdf ? (
                                  <>
                                    <Upload className="mb-2 h-6 w-6 animate-bounce text-[#EF6855]" />
                                    <p className="text-xs font-semibold text-[#EF6855] md:text-sm">
                                      Déposez les fichiers PDF ici
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      Plusieurs fichiers supportés
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mb-2 h-6 w-6 text-gray-400" />
                                    <p className="text-xs text-gray-600 md:text-sm">
                                      <span className="font-medium text-[#EF6855]">
                                        Cliquez pour ajouter
                                      </span>{' '}
                                      ou glissez des fichiers PDF
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      Plusieurs fichiers supportés (max 10 MB chacun)
                                    </p>
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
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#EF6855] to-[#F9A459] py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {knowledgeSaving ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                <Check className="h-5 w-5" />
                                Enregistrer la base de connaissance
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        <Mail className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                        <p className="text-sm font-medium">Aucun compte email configuré</p>
                        <p className="mt-2 text-xs">Veuillez d'abord configurer un compte email</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          {/* </div> */}
        </motion.div>
      </Container>

      {/* Modal de succès */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-center text-sm font-medium text-green-800">
                Étape 4/4 - Configuration terminée
              </p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
                <Check className="h-10 w-10 stroke-[3] text-white" />
              </div>
            </div>

            <h2 className="mb-3 text-center text-3xl font-bold text-gray-900">Compte ajouté !</h2>

            <p className="mb-8 text-center text-gray-600">
              Votre compte email est maintenant configuré et prêt à être utilisé.
            </p>

            <div className="mb-6 rounded-lg border border-orange-100 bg-orange-50 p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Prochaines étapes :</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-gray-700">
                    Vos emails commencent à être triés automatiquement
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-gray-700">Des brouillons de réponse sont générés</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-gray-700">
                    Les publicités sont automatiquement filtrées
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="group relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Ajouter un compte IMAP</h2>
              <p className="text-sm text-gray-600">Configurez votre compte email personnalisé</p>
            </div>

            <div className="mb-6 space-y-4">
              {testError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-red-800">Erreur de connexion</div>
                    <div className="mt-1 text-xs text-red-700">{testError}</div>
                  </div>
                </div>
              )}

              {testSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-green-800">Connexion réussie</div>
                    <div className="mt-1 text-xs text-green-700">
                      Les paramètres sont valides. Vous pouvez ajouter le compte.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={imapFormData.email}
                  onChange={(e) => handleImapFormChange('email', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-orange-500"
                  placeholder="contact@hallia.ai"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={imapFormData.password}
                    onChange={(e) => handleImapFormChange('password', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-transparent focus:ring-2 focus:ring-orange-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Serveur IMAP Entrant
                  </label>
                  <input
                    type="text"
                    value={imapFormData.imap_host}
                    onChange={(e) => handleImapFormChange('imap_host', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-orange-500"
                    placeholder="imap.example.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Port IMAP</label>
                  <input
                    type="text"
                    value={imapFormData.imap_port}
                    onChange={(e) => handleImapFormChange('imap_port', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-orange-500"
                    placeholder="993"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={
                  testingConnection ||
                  !imapFormData.email ||
                  !imapFormData.password ||
                  !imapFormData.imap_host ||
                  !imapFormData.imap_port
                }
                className={`flex w-full items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 font-medium transition-all ${
                  testingConnection ||
                  !imapFormData.email ||
                  !imapFormData.password ||
                  !imapFormData.imap_host ||
                  !imapFormData.imap_port
                    ? 'cursor-not-allowed border-orange-500 text-orange-600 opacity-50'
                    : testSuccess
                      ? 'border-green-600 bg-green-600 text-white hover:border-green-700 hover:bg-green-700'
                      : 'border-orange-500 text-orange-600 hover:border-transparent hover:bg-gradient-to-br hover:from-[#F35F4F] hover:to-[#FFAD5A] hover:text-white'
                }`}
              >
                {testingConnection ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Test en cours...
                  </>
                ) : testSuccess ? (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Connexion réussie
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
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
                className={`group relative inline-flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out ${
                  testSuccess ? 'cursor-pointer hover:shadow-xl' : 'cursor-not-allowed opacity-50'
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
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
                className="rounded-full border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification des informations entreprise */}
      {showCompanyInfoModal && selectedAccount && user && (
        <CompanyInfoModal
          userId={user.id}
          emailAccountId={selectedAccount.id}
          email={selectedAccount.email}
          initialStep={companyInfoStep}
          onComplete={async () => {
            setShowCompanyInfoModal(false);
            setHasCheckedCompanyInfo(false);
            setNotificationMessage('Informations mises à jour avec succès');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 3000);
            await loadCompanyData();
          }}
          onClose={() => {
            setShowCompanyInfoModal(false);
            setHasCheckedCompanyInfo(false);
          }}
        />
      )}

      {/* Modal de suppression de compte utilisateur */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-md overflow-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-opacity-20 rounded-lg bg-white p-3">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Supprimer le compte</h2>
                </div>
                <button
                  onClick={() => setShowDeleteUserModal(false)}
                  className="text-white transition-colors hover:text-gray-200"
                  disabled={isDeletingUser}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-opacity-90 text-white">
                Cette action est <span className="font-semibold">irréversible</span>
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-medium text-red-900">
                    Les données suivantes seront définitivement supprimées :
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-red-800">
                    <li>Tous vos comptes email configurés</li>
                    <li>Historique complet de classification</li>
                    <li>Informations de l'entreprise</li>
                    <li>Profil et préférences</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-1 text-sm font-medium text-amber-900">Abonnement Stripe</p>
                  <p className="text-sm text-amber-800">
                    Votre abonnement sera <strong>immédiatement résilié</strong> sur Stripe. Aucun
                    remboursement ne sera effectué.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteUserModal(false)}
                  disabled={isDeletingUser}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteUserAccount}
                  disabled={isDeletingUser}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingUser ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
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
        <CheckoutAdditionalModal
          userId={user?.id!}
          onClose={() => setShowSubscriptionModal(false)}
          currentAdditionalAccounts={currentAdditionalAccounts}
          unlinkedSubscriptionsCount={unlinkedSubscriptions.length}
        />
      )}

      {/* Modal email en double */}
      {showDuplicateEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Compte déjà existant</h2>
              <button
                onClick={() => {
                  setShowDuplicateEmailModal(false);
                  setDuplicateEmail('');
                }}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold text-orange-900">Compte déjà configuré</h3>
                    <p className="text-sm text-orange-800">
                      Le compte <span className="font-bold">{duplicateEmail}</span> est déjà
                      configuré dans votre application.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">💡</div>
                  <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-orange-900">Conseil</h4>
                    <p className="text-sm text-orange-800">
                      Vous ne pouvez pas ajouter deux fois le même compte email. Si vous souhaitez
                      modifier les paramètres de ce compte, rendez-vous dans la liste de vos
                      comptes.
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
                  className="flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {showNotification && (
        <div className="animate-fade-in-right fixed top-4 right-4 z-50">
          <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-2xl">
            {/* Barre latérale colorée */}
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-[#F35F4F] to-[#FFAD5A]" />

            {/* Contenu */}
            <div className="flex items-center gap-4 py-4 pr-6 pl-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] shadow-md">
                <Check className="h-6 w-6 stroke-[3] text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{notificationMessage}</p>
                <p className="mt-0.5 text-xs text-gray-500">Modification enregistrée</p>
              </div>
            </div>

            {/* Effet de brillance */}
            <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>
      )}

      {/* Modal d'édition du nom de l'entreprise */}
      {showEditCompanyNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Modifier le nom de l'entreprise</h2>
              <button
                onClick={() => {
                  setShowEditCompanyNameModal(false);
                  setModalError('');
                }}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  value={editTempValue}
                  onChange={(e) => {
                    setEditTempValue(e.target.value);
                    setModalError('');
                  }}
                  className={`w-full rounded-lg border-2 px-4 py-3 transition-colors focus:outline-none ${
                    modalError ? 'border-red-500' : 'border-gray-200 focus:border-orange-500'
                  }`}
                  placeholder="Ex: Hall IA"
                />
                {modalError && <p className="mt-2 text-sm text-red-600">{modalError}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCompanyNameModal(false);
                    setModalError('');
                  }}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedAccount || !user) return;

                    // Validation : le champ ne doit pas être vide
                    if (!editTempValue?.trim()) {
                      setModalError("Le nom de l'entreprise est obligatoire");
                      return;
                    }

                    setModalError('');
                    try {
                      const { error } = await supabase
                        .from('email_configurations')
                        .update({
                          company_name: editTempValue.trim(),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', selectedAccount.id);

                      if (error) throw error;

                      setCompanyFormData({
                        ...companyFormData,
                        company_name: editTempValue.trim(),
                      });
                      setShowEditCompanyNameModal(false);
                      setModalError('');
                      setNotificationMessage("Nom de l'entreprise mis à jour");
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 3000);
                    } catch (err) {
                      showToast('Erreur lors de la mise à jour', 'error');
                    }
                  }}
                  className="flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition de la description de l'activité */}
      {showEditActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Modifier la description de l'activité
              </h2>
              <button
                onClick={() => {
                  setShowEditActivityModal(false);
                  setModalError('');
                }}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Description de l'activité
                </label>
                <textarea
                  value={editTempValue}
                  onChange={(e) => {
                    setEditTempValue(e.target.value);
                    setModalError('');
                  }}
                  className={`w-full resize-none rounded-lg border-2 px-4 py-3 transition-colors focus:outline-none ${
                    modalError ? 'border-red-500' : 'border-gray-200 focus:border-orange-500'
                  }`}
                  rows={6}
                  placeholder="Exemple : Nous sommes une agence de marketing digital spécialisée dans la création de contenu et la gestion des réseaux sociaux pour les PME. Nous aidons nos clients à développer leur présence en ligne et à atteindre leurs objectifs commerciaux."
                />
                {modalError && <p className="mt-2 text-sm text-red-600">{modalError}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  Cette description sera utilisée par l'IA pour mieux comprendre votre contexte et
                  classer vos e-mails.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditActivityModal(false);
                    setModalError('');
                  }}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedAccount || !user) return;

                    // Validation : le champ ne doit pas être vide
                    if (!editTempValue?.trim()) {
                      setModalError("La description de l'activité est obligatoire");
                      return;
                    }

                    setModalError('');
                    try {
                      const { error } = await supabase
                        .from('email_configurations')
                        .update({
                          activity_description: editTempValue.trim(),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', selectedAccount.id);

                      if (error) throw error;

                      setCompanyFormData({
                        ...companyFormData,
                        activity_description: editTempValue.trim(),
                      });
                      setShowEditActivityModal(false);
                      setModalError('');
                      setNotificationMessage("Description de l'activité mise à jour");
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 3000);
                    } catch (err) {
                      showToast('Erreur lors de la mise à jour', 'error');
                    }
                  }}
                  className="flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition du logo de signature */}
      {showEditLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Modifier le logo de signature</h2>
              <button
                onClick={() => {
                  setShowEditLogoModal(false);
                  setIsDraggingLogo(false);
                }}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Logo de signature (optionnel)
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Logo de votre entreprise ou signature manuscrite scannée
                </p>

                <div
                  className={`rounded-lg border-2 border-dashed p-6 text-center transition-all ${
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
                        showToast("L'image ne doit pas dépasser 2MB", 'error');
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
                          showToast("L'image ne doit pas dépasser 2MB", 'error');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setCompanyFormData({
                            ...companyFormData,
                            signature_image_base64: base64,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="edit-signature-logo-upload"
                  />
                  <label
                    htmlFor="edit-signature-logo-upload"
                    className="flex cursor-pointer flex-col items-center"
                  >
                    {companyFormData.signature_image_base64 ? (
                      <div className="space-y-3">
                        <img
                          src={companyFormData.signature_image_base64}
                          alt="Logo de signature"
                          className="mx-auto max-h-32 max-w-full object-contain"
                        />
                        <p className="text-sm font-medium text-green-600">✓ Logo téléchargé</p>
                        <p className="text-xs text-gray-500">Cliquez ou glissez pour changer</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Cliquez ou glissez pour télécharger
                          </p>
                          <p className="mt-1 text-xs text-gray-500">PNG, JPG jusqu'à 2MB</p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {companyFormData.signature_image_base64 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCompanyFormData({ ...companyFormData, signature_image_base64: '' })
                    }
                    className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
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
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
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
                  className="flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition de la signature email */}
      {showEditSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="font-inter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Modifier la signature email</h2>
              <button
                onClick={() => {
                  setShowEditSignatureModal(false);
                  setModalError('');
                }}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Signature email
                </label>
                <textarea
                  value={editTempValue}
                  onChange={(e) => {
                    setEditTempValue(e.target.value);
                    setModalError('');
                  }}
                  className={`w-full resize-none rounded-lg border-2 px-4 py-3 transition-colors focus:outline-none ${
                    modalError ? 'border-red-500' : 'border-gray-200 focus:border-orange-500'
                  }`}
                  rows={4}
                  placeholder={`Exemple :\nCordialement,\nJean Dupont\nCEO - Mon Entreprise\nTel: +33 6 12 34 56 78\nEmail: contact@entreprise.fr`}
                />
                {modalError && <p className="mt-2 text-sm text-red-600">{modalError}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSignatureModal(false);
                    setModalError('');
                  }}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedAccount || !user) return;

                    // Validation : le champ ne doit pas être vide
                    if (!editTempValue?.trim()) {
                      setModalError('La signature email est obligatoire');
                      return;
                    }

                    setModalError('');
                    try {
                      const { error } = await supabase
                        .from('email_configurations')
                        .update({
                          services_offered: editTempValue.trim(),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', selectedAccount.id);

                      if (error) throw error;

                      setCompanyFormData({
                        ...companyFormData,
                        services_offered: editTempValue.trim(),
                      });
                      setShowEditSignatureModal(false);
                      setModalError('');
                      setNotificationMessage('Signature email mise à jour');
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 3000);
                    } catch (err) {
                      showToast('Erreur lors de la mise à jour', 'error');
                    }
                  }}
                  className="flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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

      {showAddAccountModal && user && (
        <CheckoutAdditionalModal
          userId={user.id}
          onClose={() => setShowAddAccountModal(false)}
          currentAdditionalAccounts={currentAdditionalAccounts}
          unlinkedSubscriptionsCount={unlinkedSubscriptions.length}
        />
      )}

      {/* Modal de configuration pour slot non configuré */}
      {showSlotConfigModal && selectedSlotForConfig && user && (
        <AdditionalEmailModal
          userId={user.id}
          subscriptionId={selectedSlotForConfig.subscription_id}
          onComplete={async () => {
            setShowSlotConfigModal(false);
            setSelectedSlotForConfig(null);
            setSelectedSlot(null);
            await loadAccounts();
          }}
          onClose={() => {
            setShowSlotConfigModal(false);
            setSelectedSlotForConfig(null);
          }}
        />
      )}
    </section>
  );
}
