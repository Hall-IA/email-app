'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CreditCard as Edit2,
  Mail,
  Lock,
  Building2,
  User,
  CreditCard,
  Edit,
  Edit2Icon,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { Subscription } from '@/components/Subscription';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileData {
  email: string;
  civility: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company_name: string;
  street_address: string;
  address_complement: string;
  postal_code: string;
  city: string;
  country: string;
  contact_email: string;
  invoice_email: string;
  phone: string;
  password_updated_at: string | null;
}

type Section = 'company' | 'personal' | 'subscription';

export default function UserSettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const getInitialSection = (): Section => {
    const tab = searchParams.get('tab');
    if (tab === 'subscription') return 'subscription';
    return 'personal';
  };

  const [activeSection, setActiveSection] = useState<Section>(getInitialSection());
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    civility: '',
    first_name: '',
    last_name: '',
    job_title: '',
    street_address: '',
    address_complement: '',
    postal_code: '',
    city: '',
    country: '',
    contact_email: '',
    invoice_email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'email, civility, first_name, last_name, job_title, company_name, street_address, address_complement, postal_code, city, country, contact_email, invoice_email, phone, password_updated_at',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (data) {
      setProfile(data);
      setEditFormData({
        company_name: data.company_name || '',
        civility: data.civility || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        job_title: data.job_title || '',
        street_address: data.street_address || '',
        address_complement: data.address_complement || '',
        postal_code: data.postal_code || '',
        city: data.city || '',
        country: data.country || 'France',
        contact_email: data.contact_email || '',
        invoice_email: data.invoice_email || '',
        phone: data.phone || '',
      });
    }
  };

  // Fonctions de validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePostalCode = (postalCode: string): boolean => {
    const postalCodeRegex = /^[0-9]{5}$/;
    return postalCodeRegex.test(postalCode);
  };

  const validateCompanyInfo = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!editFormData.civility || editFormData.civility.trim() === '') {
      errors.civility = 'La civilité est obligatoire';
    }

    if (!editFormData.first_name || editFormData.first_name.trim() === '') {
      errors.first_name = 'Le prénom est obligatoire';
    }

    if (!editFormData.last_name || editFormData.last_name.trim() === '') {
      errors.last_name = 'Le nom est obligatoire';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAddress = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!editFormData.street_address || editFormData.street_address.trim() === '') {
      errors.street_address = "L'adresse est obligatoire";
    }

    if (!editFormData.postal_code || editFormData.postal_code.trim() === '') {
      errors.postal_code = 'Le code postal est obligatoire';
    } else if (!validatePostalCode(editFormData.postal_code)) {
      errors.postal_code = 'Le code postal doit contenir 5 chiffres';
    }

    if (!editFormData.city || editFormData.city.trim() === '') {
      errors.city = 'La ville est obligatoire';
    }

    if (!editFormData.country || editFormData.country.trim() === '') {
      errors.country = 'Le pays est obligatoire';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateContact = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (editFormData.contact_email && !validateEmail(editFormData.contact_email)) {
      errors.contact_email = "L'email de contact n'est pas valide";
    }

    if (editFormData.invoice_email && !validateEmail(editFormData.invoice_email)) {
      errors.invoice_email = "L'email de facturation n'est pas valide";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateCompanyInfo = async () => {
    if (!user) return;

    // Valider les données avant l'envoi
    if (!validateCompanyInfo()) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: editFormData.company_name,
        civility: editFormData.civility,
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        job_title: editFormData.job_title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      await loadProfile();
      setIsEditingCompany(false);
      setValidationErrors({});
    }
  };

  const handleUpdateAddress = async () => {
    if (!user) return;

    // Valider les données avant l'envoi
    if (!validateAddress()) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        street_address: editFormData.street_address,
        address_complement: editFormData.address_complement,
        postal_code: editFormData.postal_code,
        city: editFormData.city,
        country: editFormData.country,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      await loadProfile();
      setIsEditingAddress(false);
      setValidationErrors({});
    }
  };

  const handleUpdateContact = async () => {
    if (!user) return;

    // Valider les données avant l'envoi
    if (!validateContact()) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        contact_email: editFormData.contact_email,
        invoice_email: editFormData.invoice_email,
        phone: editFormData.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      await loadProfile();
      setIsEditingContact(false);
      setValidationErrors({});
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      setPasswordError(error.message);
      return;
    }

    await supabase
      .from('profiles')
      .update({
        password_updated_at: new Date().toISOString(),
      })
      .eq('id', user?.id);

    setPasswordSuccess(true);
    setPasswordData({ newPassword: '', confirmPassword: '' });

    // Fermer le modal et afficher la notification
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordSuccess(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      // Afficher la notification
      setNotificationMessage('Mot de passe modifié avec succès');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      loadProfile();
    }, 1500);
  };

  if (!profile) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non modifié';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="font-inter mt-6 w-full"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-t-xl border border-b-0 border-gray-200 bg-white p-6"
        >
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Paramètres</h1>
        </motion.div>

         {/* Navbar horizontale */}
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.5, delay: 0.2 }}
           className="border-x border-gray-200 bg-white"
         >
           <nav className="overflow-x-auto overflow-y-hidden border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
             <div className="flex min-w-max">
               <motion.button
                 onClick={() => setActiveSection('personal')}
                 className={`flex flex-shrink-0 cursor-pointer items-center gap-2 px-6 py-4 font-medium transition-all ${
                   activeSection === 'personal'
                     ? 'border-b-2 border-blue-600 text-blue-600'
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`}
               >
                 <User className="h-5 w-5" />
                 <span>Informations personnelles</span>
               </motion.button>

               <motion.button
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => setActiveSection('company')}
                 className={`flex flex-shrink-0 cursor-pointer items-center gap-2 px-6 py-4 font-medium transition-all ${
                   activeSection === 'company'
                     ? 'border-b-2 border-blue-600 text-blue-600'
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`}
               >
                 <Building2 className="h-5 w-5" />
                 <span>Informations entreprise</span>
               </motion.button>

               <motion.button
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => setActiveSection('subscription')}
                 className={`flex flex-shrink-0 cursor-pointer items-center gap-2 px-6 py-4 font-medium transition-all ${
                   activeSection === 'subscription'
                     ? 'border-b-2 border-blue-600 text-blue-600'
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`}
               >
                 <CreditCard className="h-5 w-5" />
                 <span>Abonnement</span>
               </motion.button>
             </div>
           </nav>
         </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-b-xl border border-t-0 border-gray-200 bg-white p-6"
        >
          <AnimatePresence mode="wait">
            {/* Section Informations Entreprise */}
            {activeSection === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Informations entreprise et nom */}
                <div className="mb-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">
                      Informations sur l'entreprise
                    </h2>
                    {!isEditingCompany && (
                      <button
                        onClick={() => setIsEditingCompany(true)}
                        className="flex items-center space-x-1 font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Edit2Icon className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                    )}
                  </div>

                  {isEditingCompany ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Nom de votre entreprise ou association
                        </label>
                        <input
                          type="text"
                          value={editFormData.company_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, company_name: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Civilité <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editFormData.civility}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, civility: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.civility ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="">Sélectionner</option>
                          <option value="Monsieur">Monsieur</option>
                          <option value="Madame">Madame</option>
                          <option value="Autre">Autre</option>
                          <option value="Ne souhaite pas être défini">
                            Ne souhaite pas être défini
                          </option>
                        </select>
                        {validationErrors.civility && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors.civility}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.first_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, first_name: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.first_name ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        />
                        {validationErrors.first_name && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors.first_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.last_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, last_name: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.last_name ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        />
                        {validationErrors.last_name && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors.last_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Fonction (facultatif)
                        </label>
                        <input
                          type="text"
                          value={editFormData.job_title}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, job_title: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Directeur, Responsable, etc."
                        />
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleUpdateCompanyInfo}
                          className="rounded-full px-5 py-2.5 font-medium text-white transition-all duration-300 hover:scale-105 hover:opacity-90"
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
                        <button
                          onClick={() => {
                            setIsEditingCompany(false);
                            setEditFormData({
                              ...editFormData,
                              company_name: profile.company_name || '',
                              civility: profile.civility || '',
                              first_name: profile.first_name || '',
                              last_name: profile.last_name || '',
                              job_title: profile.job_title || '',
                            });
                          }}
                          className="rounded-lg bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!profile.company_name &&
                      !profile.civility &&
                      !profile.first_name &&
                      !profile.last_name ? (
                        <div className="py-12 text-center">
                          <div className="mb-4">
                            <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                            <p className="mb-2 text-lg font-medium text-gray-500">
                              Aucune information d'entreprise
                            </p>
                            <p className="text-sm text-gray-400">
                              Ajoutez les informations de votre entreprise
                            </p>
                          </div>
                          <button
                            onClick={() => setIsEditingCompany(true)}
                            className="rounded-lg px-6 py-3 font-medium text-white transition-all hover:opacity-90"
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
                            Ajouter des informations
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Nom de votre entreprise ou association
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.company_name || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Civilité
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.civility || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Prénom
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.first_name || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Nom
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.last_name || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Fonction
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.job_title || '-'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Adresse */}
                <div className="mb-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Adresse</h2>
                    {!isEditingAddress && (
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="flex items-center space-x-1 font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Edit2Icon className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                    )}
                  </div>

                  {isEditingAddress ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Numéro et rue <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.street_address}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, street_address: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.street_address ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        />
                        {validationErrors.street_address && (
                          <p className="mt-1 text-sm text-red-500">
                            {validationErrors.street_address}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Complément d'adresse (Zone industrielle, lieu-dit, BP, étage, etc.)
                        </label>
                        <input
                          type="text"
                          value={editFormData.address_complement}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, address_complement: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Code postal <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.postal_code}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, postal_code: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.postal_code ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                          maxLength={5}
                          placeholder="Ex: 75001"
                        />
                        {validationErrors.postal_code && (
                          <p className="mt-1 text-sm text-red-500">
                            {validationErrors.postal_code}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Ville <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.city}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, city: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        />
                        {validationErrors.city && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900">
                          Pays <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.country}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, country: e.target.value })
                          }
                          className={`w-full border px-4 py-2.5 ${validationErrors.country ? 'border-red-500' : 'border-gray-300'} rounded-lg transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                        />
                        {validationErrors.country && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors.country}</p>
                        )}
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleUpdateAddress}
                          className="rounded-full px-5 py-2.5 font-medium text-white transition-all duration-300 hover:scale-105 hover:opacity-90"
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
                        <button
                          onClick={() => {
                            setIsEditingAddress(false);
                            setEditFormData({
                              ...editFormData,
                              street_address: profile.street_address || '',
                              address_complement: profile.address_complement || '',
                              postal_code: profile.postal_code || '',
                              city: profile.city || '',
                              country: profile.country || 'France',
                            });
                          }}
                          className="rounded-lg bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!profile.street_address && !profile.postal_code && !profile.city ? (
                        <div className="py-12 text-center">
                          <div className="mb-4">
                            <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                            <p className="mb-2 text-lg font-medium text-gray-500">
                              Aucune adresse renseignée
                            </p>
                            <p className="text-sm text-gray-400">
                              Ajoutez l'adresse de votre entreprise
                            </p>
                          </div>
                          <button
                            onClick={() => setIsEditingAddress(true)}
                            className="rounded-lg px-6 py-3 font-medium text-white transition-all hover:opacity-90"
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
                            Ajouter une adresse
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Numéro et rue
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.street_address || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Complément d'adresse
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.address_complement || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Code postal
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.postal_code || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Ville
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.city || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Pays
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.country || '-'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="mb-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Contact</h2>
                    {!isEditingContact && (
                      <button
                        onClick={() => setIsEditingContact(true)}
                        className="flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        <Edit2Icon className="h-4 w-4" />
                        Modifier
                      </button>
                    )}
                  </div>

                  {isEditingContact ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Adresse email
                        </label>
                        <input
                          type="email"
                          value={editFormData.contact_email}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, contact_email: e.target.value })
                          }
                          className={`w-full border px-4 py-2 ${validationErrors.contact_email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                          placeholder="contact@entreprise.fr"
                        />
                        {validationErrors.contact_email && (
                          <p className="mt-1 text-sm text-red-500">
                            {validationErrors.contact_email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Adresse email supplémentaire pour la réception des factures
                        </label>
                        <input
                          type="email"
                          value={editFormData.invoice_email}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, invoice_email: e.target.value })
                          }
                          className={`w-full border px-4 py-2 ${validationErrors.invoice_email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:border-transparent focus:ring-2 focus:ring-blue-500`}
                          placeholder="factures@entreprise.fr"
                        />
                        {validationErrors.invoice_email && (
                          <p className="mt-1 text-sm text-red-500">
                            {validationErrors.invoice_email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={editFormData.phone}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, phone: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="+33 1 23 45 67 89"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleUpdateContact}
                          className="rounded-full px-5 py-2.5 font-medium text-white transition-all duration-300 hover:scale-105 hover:opacity-90"
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
                        <button
                          onClick={() => {
                            setIsEditingContact(false);
                            setEditFormData({
                              ...editFormData,
                              contact_email: profile.contact_email || '',
                              invoice_email: profile.invoice_email || '',
                              phone: profile.phone || '',
                            });
                          }}
                          className="rounded-lg bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!profile.contact_email && !profile.invoice_email && !profile.phone ? (
                        <div className="py-12 text-center">
                          <div className="mb-4">
                            <Mail className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                            <p className="mb-2 text-lg font-medium text-gray-500">
                              Aucune information de contact
                            </p>
                            <p className="text-sm text-gray-400">
                              Ajoutez vos coordonnées de contact
                            </p>
                          </div>
                          <button
                            onClick={() => setIsEditingContact(true)}
                            className="rounded-lg px-6 py-3 font-medium text-white transition-all hover:opacity-90"
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
                            Ajouter des informations
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Adresse email
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.contact_email || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Email de facturation
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.invoice_email || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3">
                            <span className="text-sm font-medium" style={{ color: '#ABA9A6' }}>
                              Téléphone
                            </span>
                            <span className="col-span-2 font-medium text-gray-900">
                              {profile.phone || '-'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Section Informations Personnelles */}
            {activeSection === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Logo/Icône */}

                {/* Identifiant email */}
                <div className="grid grid-cols-3 items-center gap-6 border-b border-gray-200 py-4">
                  <div className="text-sm font-medium text-gray-600">Identifiant email</div>
                  <div className="flex items-center gap-2 text-base font-medium text-gray-900">
                    <div className="flex justify-start">
                      {profile.email.includes('@gmail.com') ? (
                        <div className="flex h-5 w-5 items-center justify-center">
                          <img
                            src="/logo/gmail.png"
                            alt="Gmail"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-50">
                          <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {profile.email}
                  </div>
                  {/* <div className="flex items-center gap-2 text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                                    <Edit2Icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">Modifier</span>
                                </div> */}
                </div>

                {/* Mot de passe */}
                <div className="grid grid-cols-3 items-center gap-6 border-b border-gray-200 py-4">
                  <div className="text-sm font-medium text-gray-600">Mot de passe</div>
                  <div className="text-base font-medium text-gray-900">
                    Pas••••••d
                    <div className="text-xs text-gray-500">
                      Mot de passe modifié le : {formatDate(profile.password_updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700"
                  >
                    <Edit2Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">Modifier</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Section Abonnement */}
            {activeSection === 'subscription' && (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Subscription />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Modal changement de mot de passe */}
      <AnimatePresence>
        {showPasswordModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({ newPassword: '', confirmPassword: '' });
                setPasswordError('');
                setPasswordSuccess(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
              }}
            />

            {/* Modal */}
            <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, type: 'spring' }}
                className="pointer-events-auto relative flex w-full max-w-md flex-col gap-6 overflow-hidden rounded-2xl border border-[#F1EDEA] bg-[#F9F7F5] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Décoration en haut à gauche */}
                <div
                  className="pointer-events-none absolute -top-48 -left-48 h-[479px] w-[479px] rounded-full opacity-24"
                  style={{
                    background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15deg, #CE7D2A 197.31deg, #FFAD5A 245.77deg)`,
                    filter: 'blur(50px)',
                  }}
                />

                {/* Header */}
                <div className="relative flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] shadow-md">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-inter text-2xl font-bold text-gray-900">
                    Modifier le mot de passe
                  </h3>
                </div>

                {/* Messages */}
                {passwordError && (
                  <div className="relative flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
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
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="relative flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
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
                    <span>Mot de passe modifié avec succès!</span>
                  </div>
                )}

                {/* Formulaire */}
                <div className="relative space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500"
                        placeholder="Minimum 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-orange-500"
                        placeholder="Répétez le mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Boutons */}
                <div className="relative flex gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                      setPasswordSuccess(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }}
                    className="flex-1 rounded-full border-2 border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={!passwordData.newPassword || !passwordData.confirmPassword}
                    className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-5 py-2.5 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                      Modifier
                    </span>
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
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Notification toast */}
      {showNotification && (
        <div className="animate-fade-in-right font-inter fixed top-4 right-2 left-2 z-50 md:right-4 md:left-auto">
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
        </div>
      )}
    </div>
  );
}
