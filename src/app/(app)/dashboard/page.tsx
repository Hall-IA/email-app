'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, RefreshCw, Check, MailIcon, Clock } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type TimePeriod = 'today' | 'week' | 'month';

interface EmailStats {
  emailsRepondus: number;
  emailsTries: number;
  publicitiesFiltrees: number;
  emailsRepondusHier: number;
  emailsTriesHier: number;
  publicitiesHier: number;
  emailsInfo: number;
  emailsInfoHier: number;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'smtp_imap';
  is_classement: boolean;
  company_name?: string | null;
  is_active?: boolean;
  cancel_at_period_end?: boolean;
  subscription_status?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [stats, setStats] = useState<EmailStats>({
    emailsRepondus: 0,
    emailsTries: 0,
    publicitiesFiltrees: 0,
    emailsRepondusHier: 0,
    emailsTriesHier: 0,
    publicitiesHier: 0,
    emailsInfo: 0,
    emailsInfoHier: 0,
  });
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isClassementActive, setIsClassementActive] = useState(false);

  const [autoSort, setAutoSort] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasEverHadSubscription, setHasEverHadSubscription] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [companyFormData, setCompanyFormData] = useState({
    company_name: '',
    activity_description: '',
    services_offered: '',
    signature_image_base64: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && selectedEmail) {
      loadStats();
      loadCompanyData();
    }
  }, [user?.id, timePeriod, selectedEmail]);

  const loadCompanyData = async () => {
    if (!user || !selectedEmail) return;

    try {
      const { data: config } = await supabase
        .from('email_configurations')
        .select('company_name, activity_description, services_offered, signature_image_base64')
        .eq('user_id', user.id)
        .eq('email', selectedEmail)
        .maybeSingle();

      if (config) {
        setCompanyFormData({
          company_name: config.company_name || '',
          activity_description: config.activity_description || '',
          services_offered: config.services_offered || '',
          signature_image_base64: config.signature_image_base64 || '',
        });
      } else {
        setCompanyFormData({
          company_name: '',
          activity_description: '',
          services_offered: '',
          signature_image_base64: '',
        });
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadAccounts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, email, provider, is_classement, company_name, is_active, is_connected')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading accounts:', error);
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

      const allAccounts: EmailAccount[] = (data || []).map((acc: any) => {
        let subscriptionInfo = {};

        const configSubs = allSubs?.filter((s) => s.email_configuration_id === acc.id) || [];

        const activeSub = configSubs.find((s) => ['active', 'trialing'].includes(s.status));

        if (activeSub) {
          subscriptionInfo = {
            cancel_at_period_end: activeSub.cancel_at_period_end,
            subscription_status: activeSub.status,
          };
        }

        return {
          id: acc.id,
          email: acc.email,
          provider: acc.provider as 'gmail' | 'outlook' | 'smtp_imap',
          is_classement: acc.is_classement ?? true,
          company_name: acc.company_name || null,
          is_active: acc.is_active !== false,
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

      // Seulement initialiser la sélection si aucun compte n'est actuellement sélectionné
      if (allAccounts.length > 0 && !selectedAccountId) {
        // Sélectionner le premier compte ACTIF (non désactivé et non en résiliation)
        const firstActiveAccount = allAccounts.find(
          (acc) => acc.is_active !== false && acc.cancel_at_period_end !== true,
        );
        if (firstActiveAccount) {
          setSelectedAccountId(firstActiveAccount.id);
          setSelectedEmail(firstActiveAccount.email);
          setIsClassementActive(firstActiveAccount.is_classement);
          setAutoSort(firstActiveAccount.is_classement);
        }
      } else if (selectedAccountId) {
        // Mettre à jour l'état du compte actuellement sélectionné
        const currentAccount = allAccounts.find((acc) => acc.id === selectedAccountId);
        if (currentAccount) {
          setIsClassementActive(currentAccount.is_classement);
          setAutoSort(currentAccount.is_classement);
        }
      }
    } catch (err) {
      console.error('Load accounts error:', err);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (timePeriod) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          previousStart: yesterday.toISOString(),
          previousEnd: today.toISOString(),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(weekStart.getDate() - 7);
        return {
          start: weekStart.toISOString(),
          end: now.toISOString(),
          previousStart: previousWeekStart.toISOString(),
          previousEnd: weekStart.toISOString(),
        };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          start: monthStart.toISOString(),
          end: now.toISOString(),
          previousStart: previousMonthStart.toISOString(),
          previousEnd: monthStart.toISOString(),
        };
    }
  };

  const loadStats = async () => {
    if (!user?.id || !selectedEmail) return;

    setLoading(true);
    try {
      const { start, end, previousStart, previousEnd } = getDateRange();

      const { count: emailsRepondus } = await supabase
        .from('email_traite')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', start)
        .lt('created_at', end);

      const { count: emailsRepondusHier } = await supabase
        .from('email_traite')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      const { count: emailsTries } = await supabase
        .from('email_info')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', start)
        .lt('created_at', end);

      const { count: emailsTriesHier } = await supabase
        .from('email_info')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      const { count: publicitiesFiltrees } = await supabase
        .from('email_pub')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', start)
        .lt('created_at', end);

      const { count: publicitiesHier } = await supabase
        .from('email_pub')
        .select('*', { count: 'exact', head: true })
        .eq('email', selectedEmail)
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      const totalEmailsTries =
        (emailsRepondus || 0) + (emailsTries || 0) + (publicitiesFiltrees || 0);
      const totalEmailsTriesHier =
        (emailsRepondusHier || 0) + (emailsTriesHier || 0) + (publicitiesHier || 0);

      setStats({
        emailsRepondus: emailsRepondus || 0,
        emailsTries: totalEmailsTries,
        publicitiesFiltrees: publicitiesFiltrees || 0,
        emailsRepondusHier: emailsRepondusHier || 0,
        emailsTriesHier: totalEmailsTriesHier,
        publicitiesHier: publicitiesHier || 0,
        emailsInfo: emailsTries || 0,
        emailsInfoHier: emailsTriesHier || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeSaved = () => {
    const totalMinutes =
      stats.emailsRepondus * 2 + stats.emailsInfo * 0.5 + stats.publicitiesFiltrees * 0.17;

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);

    if (hours === 0 && mins === 0) return '0m';
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getDiffText = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return 'Aucun changement';
    const sign = diff > 0 ? '+' : '';
    const period = timePeriod === 'today' ? 'depuis hier' : 'vs période précédente';
    return `${sign}${diff} ${period}`;
  };

  const handleToggleAutoSort = async () => {
    if (!user || !selectedEmail || !selectedAccountId) return;
    if (hasEverHadSubscription && !hasActiveSubscription) return;

    const newValue = !autoSort;
    setAutoSort(newValue);

    try {
      const { error } = await supabase
        .from('email_configurations')
        .update({ is_classement: newValue })
        .eq('user_id', user.id)
        .eq('email', selectedEmail);

      if (error) {
        console.error('Error updating classement:', error);
        setAutoSort(!newValue);
        return;
      }

      const { data: configData } = await supabase
        .from('email_configurations')
        .select('gmail_token_id, outlook_token_id')
        .eq('user_id', user.id)
        .eq('email', selectedEmail)
        .maybeSingle();

      if (configData?.gmail_token_id) {
        await supabase
          .from('gmail_tokens')
          .update({ is_classement: newValue })
          .eq('id', configData.gmail_token_id);
      }

      setNotificationMessage(newValue ? 'Tri automatique activé' : 'Tri automatique désactivé');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      // Mettre à jour localement l'état du compte au lieu de tout recharger
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.id === selectedAccountId ? { ...acc, is_classement: newValue } : acc,
        ),
      );
      setIsClassementActive(newValue);
    } catch (error) {
      console.error('Error toggling auto sort:', error);
      setAutoSort(!newValue);
    }
  };

  return (
    <div className="font-inter mx-auto flex max-w-7xl space-y-6 md:space-y-10 md:px-0">
      {/* Ajout du style pour les animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-line {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes pulse-opacity {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes bounce-alert {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes flow-orange {
          0% {
            background-position: 200% 0%;
          }
          100% {
            background-position: 0% 0%;
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-pulse-line {
          animation: pulse-line 2s ease-in-out infinite;
        }

        .animate-pulse-opacity {
          animation: pulse-opacity 2.5s ease-in-out infinite;
        }

        .animate-bounce-alert {
          animation: bounce-alert 1s ease-in-out infinite;
        }

        .animate-flow-orange-1 {
          background: linear-gradient(
            90deg,
            #fe9736 0%,
            #fe9736 30%,
            rgba(255, 255, 255, 0.8) 40%,
            rgba(255, 255, 255, 0.9) 50%,
            rgba(255, 255, 255, 0.8) 60%,
            #fe9736 70%,
            #fe9736 100%
          );
          background-size: 200% 100%;
          animation: flow-orange 2s linear infinite;
        }

        .animate-flow-orange-2 {
          background: linear-gradient(
            90deg,
            #fe9736 0%,
            #fe9736 30%,
            rgba(255, 255, 255, 0.8) 40%,
            rgba(255, 255, 255, 0.9) 50%,
            rgba(255, 255, 255, 0.8) 60%,
            #fe9736 70%,
            #fe9736 100%
          );
          background-size: 200% 100%;
          animation: flow-orange 2s linear infinite;
          animation-delay: 1s;
        }
      `}</style>

      {accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full rounded-xl bg-white p-6 text-center shadow-sm md:p-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
            className="mb-4 flex justify-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 md:h-16 md:w-16">
              <Mail className="h-6 w-6 text-blue-600 md:h-8 md:w-8" />
            </div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-2 text-lg font-bold text-gray-900 md:text-xl"
          >
            Aucun compte email configuré
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-4 text-sm text-gray-600 md:mb-6 md:text-base"
          >
            Ajoutez votre premier compte email pour commencer
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full rounded-xl bg-white p-4 shadow-sm md:p-6"
        >
          <div className="mb-4 flex flex-col gap-4 md:mb-6 md:gap-8">
            <div>
              <h3 className="font-roboto mb-3 text-base font-semibold text-black md:mb-4 md:text-lg">
                Compte Email
              </h3>
              <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-3 [&::-webkit-scrollbar]:hidden">
                {accounts.map((account, index) => {
                  const isDisabled =
                    account.is_active === false || account.cancel_at_period_end === true;
                  return (
                    <motion.button
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedAccountId(account.id);
                        setSelectedEmail(account.email);
                        setIsClassementActive(account.is_classement);
                        setAutoSort(account.is_classement);
                      }}
                      disabled={isDisabled}
                      className={cn(
                        'flex min-w-max flex-shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all md:gap-3 md:px-4 md:py-3 md:text-base',
                        isDisabled
                          ? 'pointer-events-none cursor-not-allowed border-2 border-gray-300 bg-gray-100 opacity-40 grayscale'
                          : selectedAccountId === account.id
                            ? 'border-2 border-blue-200 bg-blue-50 shadow-md'
                            : 'border-1 border-transparent bg-gray-50 hover:border-gray-300',
                      )}
                    >
                      {/* Logo selon le type de compte */}
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center md:h-10 md:w-10">
                        {account.provider === 'gmail' ? (
                          <img
                            src="/logo/logo-gmail.png"
                            alt="Gmail"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <MailIcon
                            className={`h-6 w-6 ${isDisabled ? 'text-gray-400' : 'text-blue-600'}`}
                          />
                        )}
                      </div>

                      <div className="flex flex-1 flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className={isDisabled ? 'text-gray-400' : ''}>
                            {account.company_name?.trim() || 'Nom non défini'}
                          </span>
                          {isDisabled && (
                            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                              {account.cancel_at_period_end ? 'En résiliation' : 'Inactif'}
                            </span>
                          )}
                        </div>
                        <span className={isDisabled ? 'text-gray-400' : ''}>{account.email}</span>
                      </div>

                      <div className="flex items-center">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            selectedAccountId === account.id ? 'border-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {selectedAccountId === account.id && (
                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Flux de traitement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative w-full bg-white"
              style={{
                borderTop: '2px solid',
                borderBottom: '2px solid',
                borderImage:
                  'linear-gradient(to right, rgba(229, 231, 235, 0) 0%, #E5E7EB 25%, #E5E7EB 75%, rgba(229, 231, 235, 0) 100%) 1',
              }}
            >
              <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
                {/* Section Toggle et Informations */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative flex w-full flex-col gap-6 border-b-2 px-2 py-6 md:px-6 md:py-8 lg:w-[30%] lg:border-r-2 lg:border-b-0"
                  style={{
                    borderImage:
                      'linear-gradient(to bottom, rgba(229, 231, 235, 0) 0%, #E5E7EB 10%, #E5E7EB 90%, rgba(229, 231, 235, 0) 100%) 1',
                  }}
                >
                  <div className="flex justify-between gap-3">
                    {(() => {
                      // Vérifier si les informations obligatoires sont renseignées
                      const missingInfo = [];
                      if (!companyFormData.company_name?.trim()) {
                        missingInfo.push("Nom de l'entreprise");
                      }
                      if (!companyFormData.activity_description?.trim()) {
                        missingInfo.push("Description de l'activité et services");
                      }

                      const hasRequiredInfo = missingInfo.length === 0;
                      const isDisabled =
                        (hasEverHadSubscription && !hasActiveSubscription) || !hasRequiredInfo;

                      return (
                        <div className="group/tooltip relative">
                          <button
                            disabled={isDisabled}
                            onClick={handleToggleAutoSort}
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
                            <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 min-w-[200px] rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover/tooltip:opacity-100">
                              <div className="mb-2 font-semibold">
                                Informations manquantes pour l'activation du traitement automatique
                                :
                              </div>
                              <ul className="list-inside list-disc space-y-1">
                                {missingInfo.map((info, index) => (
                                  <li key={index}>{info}</li>
                                ))}
                              </ul>
                              <div className="absolute top-full left-4 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h3 className="font-roboto text-base font-semibold text-black md:text-lg">
                      Flux de traitement automatique
                    </h3>
                    <p className="text-sm text-gray-600">Désactivable à tout moment</p>
                  </motion.div>
                </motion.div>

                {/* Section des icônes de flux */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex w-full items-center justify-center gap-3 pb-4 sm:flex-row md:px-0 md:py-6 lg:w-[70%]"
                >
                  {/* Email Icon */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    className={`flex flex-col items-center gap-2 rounded-md bg-blue-200/50 p-3 md:p-5`}
                  >
                    <div className="relative flex h-10 w-10 items-center justify-center bg-transparent md:h-12 md:w-12">
                      <img
                        src="/assets/icon/icon-email.png"
                        alt="Email"
                        className={autoSort ? 'animate-pulse-opacity' : ''}
                      />
                      {autoSort && (
                        <div className="animate-bounce-alert absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-md">
                          !
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-blue-500 md:text-sm">Email</p>
                  </motion.div>

                  {/* Ligne animée 1 */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex w-full max-w-[40px] flex-1 items-center py-2 md:max-w-[80px] md:px-2 md:py-0"
                  >
                    <div
                      className={`h-0.5 w-full rounded-full ${
                        !autoSort ? 'bg-gray-200' : 'animate-flow-orange-1'
                      }`}
                    />
                  </motion.div>

                  {/* Logo IA avec rotation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
                    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                    className={`flex flex-col items-center gap-2 rounded-md p-3 transition-opacity md:p-5`}
                    style={{
                      background: !autoSort
                        ? '#000000'
                        : `conic-gradient(
                              from 195.77deg at 84.44% -1.66%,
                              #FE9736 0deg,
                              #F4664C 76.15deg,
                              #F97E41 197.31deg,
                              #E3AB8D 245.77deg,
                              #FE9736 360deg
                          )`,
                    }}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center bg-transparent md:h-12 md:w-12`}
                    >
                      <span className="rounded-md border p-1.5 md:p-2">
                        <img
                          src={
                            autoSort
                              ? '/assets/icon/icon-actualise.png'
                              : '/assets/icon/icon-stop.png'
                          }
                          className={autoSort ? 'animate-spin-slow' : ''}
                          alt="IA"
                        />
                      </span>
                    </div>
                    <img
                      src="/assets/icon/icon-logo.png"
                      alt="Logo"
                      className={!autoSort ? 'grayscale' : ''}
                    />
                  </motion.div>

                  {/* Ligne animée 2 */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="flex w-full max-w-[40px] flex-1 items-center py-2 md:max-w-[80px] md:px-2 md:py-0"
                  >
                    <div
                      className={`h-0.5 w-full rounded-full ${
                        !autoSort ? 'bg-gray-200' : 'animate-flow-orange-2'
                      }`}
                    />
                  </motion.div>

                  {/* Traité, Pub, Info - grisés si inactif */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: !autoSort ? 0.4 : 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className={`font-roboto flex flex-col gap-1.5 transition-opacity sm:flex-row ${
                      !autoSort ? 'opacity-40 grayscale' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 rounded-t-md bg-green-200/50 p-3 sm:rounded-t-none sm:rounded-tl-md sm:rounded-bl-md md:p-5">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:h-11 md:w-11 ${
                          !autoSort ? 'bg-gray-300' : 'bg-white'
                        }`}
                      >
                        <img src="assets/icon/icon-check.png" alt="Check" />
                      </div>
                      <p className="mt-1 text-xs font-medium text-green-500 md:text-sm">Traîté</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 bg-red-200/50 p-3 md:p-5">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:h-11 md:w-11 ${
                          !autoSort ? 'bg-gray-300' : 'bg-white'
                        }`}
                      >
                        <img src="/assets/icon/icon-close.png" alt="Croix" />
                      </div>
                      <p className="mt-1 text-xs font-medium text-red-500 md:text-sm">Pub</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-b-md bg-blue-200/50 p-3 sm:rounded-tr-md sm:rounded-b-none sm:rounded-br-md md:p-5">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:h-11 md:w-11 ${
                          !autoSort ? 'bg-gray-300' : 'bg-white'
                        }`}
                      >
                        <img src="/assets/icon/icon-info.png" alt="Info" />
                      </div>
                      <p className="mt-1 text-xs font-medium text-blue-500 md:text-sm">Info</p>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            <div className="mt-2 flex flex-col items-start gap-3 md:flex-row md:items-center">
              <h3 className="font-roboto text-base font-semibold text-black md:text-lg">
                Statistiques
              </h3>
              <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 p-1 md:w-auto md:gap-2">
                <button
                  onClick={() => setTimePeriod('today')}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all md:flex-none md:px-4 md:py-2 md:text-sm ${
                    timePeriod === 'today'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setTimePeriod('week')}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all md:flex-none md:px-4 md:py-2 md:text-sm ${
                    timePeriod === 'week'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cette semaine
                </button>
                <button
                  onClick={() => setTimePeriod('month')}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all md:flex-none md:px-4 md:py-2 md:text-sm ${
                    timePeriod === 'month'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ce mois
                </button>
              </div>
              <button
                onClick={() => loadStats()}
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-full px-4 py-4 text-xs font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 md:w-auto md:px-4 md:py-2 md:text-sm"
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
                <RefreshCw
                  className={`h-4 w-4 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`}
                />
                Actualiser
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="rounded-xl border-2 bg-white p-4 md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="md:text-md font-inter text-sm text-black">Temps économisé</span>
                <Clock className="w-9 h-9 bg-blue-200/50 rounded-md p-2 text-blue-600" />
              </div>
              {loading ? (
                <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">...</div>
              ) : (
                <>
                  <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
                    {calculateTimeSaved()}
                  </div>
                  <div className="md:text-md font-inter text-sm text-[#4A5565]">
                    2 min/réponse + 30s/tri + 10s/pub
                  </div>
                </>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="rounded-xl border-2 bg-white p-4 md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="md:text-md font-inter text-sm text-black">Emails répondus</span>
                <img
                  src="/assets/icon/icon-check.png"
                  alt="check"
                  className="rounded-2xl bg-green-200/50 p-2"
                />
              </div>
              {loading ? (
                <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">...</div>
              ) : (
                <>
                  <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
                    {stats.emailsRepondus}
                  </div>
                  <div className={'md:text-md font-inter text-sm text-[#4A5565]'}>
                    {getDiffText(stats.emailsRepondus, stats.emailsRepondusHier)}
                  </div>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="rounded-xl border-2 bg-white p-4 md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="md:text-md font-inter text-sm text-black">Emails triés</span>
                <img
                  src="/assets/icon/icon-actualise.png"
                  alt="actualise"
                  className="rounded-2xl  p-2" style={{
                    background: `conic-gradient(
                        from 195.77deg at 84.44% -1.66%,
                        #FE9736 0deg,
                        #F4664C 76.15deg,
                        #F97E41 197.31deg,
                        #E3AB8D 245.77deg,
                        #FE9736 360deg
                    )`,
                  }}
                />
              </div>
              {/* CHANGER LE BACKGROUND */}
              {loading ? (
                <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">...</div>
              ) : (
                <>
                  <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
                    {stats.emailsTries}
                  </div>
                  <div className="md:text-md font-inter text-sm text-[#4A5565]">
                    {getDiffText(stats.emailsTries, stats.emailsTriesHier)}
                  </div>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="rounded-xl border-2 bg-white p-4 md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="md:text-md font-inter text-sm text-black">
                  Publicités filtrées
                </span>
                <img
                  src="/assets/icon/icon-close.png"
                  alt="info"
                  className="rounded-2xl bg-red-200/50 p-2"
                />
              </div>
              {loading ? (
                <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">...</div>
              ) : (
                <>
                  <div className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">
                    {stats.publicitiesFiltrees}
                  </div>
                  <div className="md:text-md font-inter text-sm text-[#4A5565]">
                    {getDiffText(stats.publicitiesFiltrees, stats.publicitiesHier)}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Notification toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            className="font-inter fixed top-4 right-2 left-2 z-50 md:right-4 md:left-auto"
          >
            <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-2xl">
              {/* Barre latérale colorée */}
              <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-[#F35F4F] to-[#FFAD5A]" />

              {/* Contenu */}
              <div className="flex items-center gap-3 py-4 pr-6 pl-6 md:gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] shadow-md md:h-10 md:w-10">
                  <Check className="h-5 w-5 stroke-[3] text-white md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 md:text-base">
                    {notificationMessage}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Modification enregistrée</p>
                </div>
              </div>

              {/* Effet de brillance */}
              <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
