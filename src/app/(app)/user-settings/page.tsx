'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard as Edit2, Mail, Lock, Building2, User, CreditCard, Edit, Edit2Icon, Eye, EyeOff, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { Subscription } from '@/components/Subscription';
import Container from '@/components/Container';
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
        return 'company';
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
            .select('email, civility, first_name, last_name, job_title, company_name, street_address, address_complement, postal_code, city, country, contact_email, invoice_email, phone, password_updated_at')
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

    const handleUpdateCompanyInfo = async () => {
        if (!user) return;

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
        }
    };

    const handleUpdateAddress = async () => {
        if (!user) return;

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
        }
    };

    const handleUpdateContact = async () => {
        if (!user) return;

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
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
        <Container>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full mt-6 font-inter"
            >
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-t-xl p-6 shadow-sm border border-gray-200"
                >
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Paramètres</h1>
                    <p className="text-gray-600">Gérez vos informations personnelles et votre abonnement</p>
                </motion.div>

                {/* Navbar horizontale */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white border-x border-gray-200"
                >
                    <nav className="flex border-b border-gray-200">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSection('personal')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                                activeSection === 'personal'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <User className="w-5 h-5" />
                            <span>Informations personnelles</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSection('company')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                                activeSection === 'company'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <Building2 className="w-5 h-5" />
                            <span>Informations entreprise</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSection('subscription')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                                activeSection === 'subscription'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <CreditCard className="w-5 h-5" />
                            <span>Abonnement</span>
                        </motion.button>
                    </nav>
                </motion.div>

                {/* Main Content */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6"
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
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Informations sur l'entreprise et nom
                                    </h2>
                                    {!isEditingCompany && (
                                        <button
                                            onClick={() => setIsEditingCompany(true)}
                                            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 font-medium"
                                        >
                                            <Edit2Icon className="w-4 h-4" />
                                            <span>Modifier</span>
                                        </button>
                                    )}
                                </div>

                                {isEditingCompany ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                                Nom de votre entreprise ou association
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.company_name}
                                                onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Civilité</label>
                                            <select
                                                value={editFormData.civility}
                                                onChange={(e) => setEditFormData({ ...editFormData, civility: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">Sélectionner</option>
                                                <option value="Monsieur">Monsieur</option>
                                                <option value="Madame">Madame</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Prénom</label>
                                            <input
                                                type="text"
                                                value={editFormData.first_name}
                                                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Nom</label>
                                            <input
                                                type="text"
                                                value={editFormData.last_name}
                                                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Fonction (facultatif)</label>
                                            <input
                                                type="text"
                                                value={editFormData.job_title}
                                                onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="Ex: Directeur, Responsable, etc."
                                            />
                                        </div>

                                        <div className="flex space-x-3 pt-4">
                                            <button
                                                onClick={handleUpdateCompanyInfo}
                                                className="px-5 py-2.5 text-white rounded-full hover:opacity-90 hover:scale-105 transition-all duration-300 font-medium"
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
                                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!profile.company_name && !profile.civility && !profile.first_name && !profile.last_name ? (
                                            <div className="text-center py-12">
                                                <div className="mb-4">
                                                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500 text-lg font-medium mb-2">Aucune information d'entreprise</p>
                                                    <p className="text-gray-400 text-sm">Ajoutez les informations de votre entreprise</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsEditingCompany(true)}
                                                    className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-medium"
                                                    style={{background:`conic-gradient(
                                                        from 195.77deg at 84.44% -1.66%,
                                                        #FE9736 0deg,
                                                        #F4664C 76.15deg,
                                                        #F97E41 197.31deg,
                                                        #E3AB8D 245.77deg,
                                                        #FE9736 360deg
                                                    )`}}
                                                >
                                                    Ajouter des informations
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>
                                                        Nom de votre entreprise ou association
                                                    </span>
                                                    <span className="col-span-2 text-gray-900 font-medium">
                                                        {profile.company_name || '-'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Civilité</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.civility || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Prénom</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.first_name || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Nom</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.last_name || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Fonction</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.job_title || '-'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Adresse */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-gray-900">Adresse</h2>
                                    {!isEditingAddress && (
                                        <button
                                            onClick={() => setIsEditingAddress(true)}
                                            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 font-medium"
                                        >
                                            <Edit2Icon className="w-4 h-4" />
                                            <span>Modifier</span>
                                        </button>
                                    )}
                                </div>

                                {isEditingAddress ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                                Numéro et rue
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.street_address}
                                                onChange={(e) => setEditFormData({ ...editFormData, street_address: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                                Complément d'adresse (Zone industrielle, lieu-dit, BP, étage, etc.)
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.address_complement}
                                                onChange={(e) => setEditFormData({ ...editFormData, address_complement: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Code postal</label>
                                            <input
                                                type="text"
                                                value={editFormData.postal_code}
                                                onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Ville</label>
                                            <input
                                                type="text"
                                                value={editFormData.city}
                                                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Pays</label>
                                            <input
                                                type="text"
                                                value={editFormData.country}
                                                onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <div className="flex space-x-3 pt-4">
                                            <button
                                                onClick={handleUpdateAddress}
                                                className="px-5 py-2.5 text-white rounded-full hover:opacity-90 hover:scale-105 transition-all duration-300 font-medium"
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
                                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!profile.street_address && !profile.postal_code && !profile.city ? (
                                            <div className="text-center py-12">
                                                <div className="mb-4">
                                                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500 text-lg font-medium mb-2">Aucune adresse renseignée</p>
                                                    <p className="text-gray-400 text-sm">Ajoutez l'adresse de votre entreprise</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsEditingAddress(true)}
                                                    className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-medium"
                                                    style={{background:`conic-gradient(
                                                        from 195.77deg at 84.44% -1.66%,
                                                        #FE9736 0deg,
                                                        #F4664C 76.15deg,
                                                        #F97E41 197.31deg,
                                                        #E3AB8D 245.77deg,
                                                        #FE9736 360deg
                                                    )`}}
                                                >
                                                    Ajouter une adresse
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Numéro et rue</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">
                                                        {profile.street_address || '-'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>
                                                        Complément d'adresse
                                                    </span>
                                                    <span className="col-span-2 text-gray-900 font-medium">
                                                        {profile.address_complement || '-'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Code postal</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.postal_code || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Ville</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.city || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Pays</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.country || '-'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Contact */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-gray-900">Contact</h2>
                                    {!isEditingContact && (
                                        <button
                                            onClick={() => setIsEditingContact(true)}
                                            className="text-blue-600 hover:text-blue-700 transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Edit2Icon className="w-4 h-4" />
                                            Modifier
                                        </button>
                                    )}
                                </div>

                                {isEditingContact ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Adresse email
                                            </label>
                                            <input
                                                type="email"
                                                value={editFormData.contact_email}
                                                onChange={(e) =>
                                                    setEditFormData({ ...editFormData, contact_email: e.target.value })
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="contact@entreprise.fr"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Adresse email supplémentaire pour la réception des factures
                                            </label>
                                            <input
                                                type="email"
                                                value={editFormData.invoice_email}
                                                onChange={(e) =>
                                                    setEditFormData({ ...editFormData, invoice_email: e.target.value })
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="factures@entreprise.fr"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Téléphone
                                            </label>
                                            <input
                                                type="tel"
                                                value={editFormData.phone}
                                                onChange={(e) =>
                                                    setEditFormData({ ...editFormData, phone: e.target.value })
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="+33 1 23 45 67 89"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={handleUpdateContact}
                                                className="px-5 py-2.5 text-white rounded-full hover:opacity-90 hover:scale-105 transition-all duration-300 font-medium"
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
                                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!profile.contact_email && !profile.invoice_email && !profile.phone ? (
                                            <div className="text-center py-12">
                                                <div className="mb-4">
                                                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500 text-lg font-medium mb-2">Aucune information de contact</p>
                                                    <p className="text-gray-400 text-sm">Ajoutez vos coordonnées de contact</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsEditingContact(true)}
                                                    className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-medium"
                                                    style={{background:`conic-gradient(
                                                        from 195.77deg at 84.44% -1.66%,
                                                        #FE9736 0deg,
                                                        #F4664C 76.15deg,
                                                        #F97E41 197.31deg,
                                                        #E3AB8D 245.77deg,
                                                        #FE9736 360deg
                                                    )`}}
                                                >
                                                    Ajouter des informations
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Adresse email</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">
                                                        {profile.contact_email || '-'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>
                                                        Email de facturation
                                                    </span>
                                                    <span className="col-span-2 text-gray-900 font-medium">
                                                        {profile.invoice_email || '-'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 py-3">
                                                    <span className="text-sm font-medium" style={{color: '#ABA9A6'}}>Téléphone</span>
                                                    <span className="col-span-2 text-gray-900 font-medium">{profile.phone || '-'}</span>
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
                            <div className="grid grid-cols-3 gap-6 items-center py-4 border-b border-gray-200">
                                <div className="text-sm font-medium text-gray-600">
                                    Identifiant email
                                </div>
                                <div className="text-base flex items-center gap-2 font-medium text-gray-900">
                                <div className="flex justify-start">
                                {profile.email.includes('@gmail.com') ? (
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <img src="/logo/gmail.png" alt="Gmail" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Mail className="w-8 h-8 text-blue-600" />
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
                            <div className="grid grid-cols-3 gap-6 items-center py-4 border-b border-gray-200">
                                <div className="text-sm font-medium text-gray-600">
                                    Mot de passe
                                </div>
                                <div className="text-base font-medium text-gray-900">
                                    Pas••••••d
                                    <div className="text-xs text-gray-500 ">
                                Mot de passe modifié le : {formatDate(profile.password_updated_at)}
                            </div>
                                </div>
                                <button
                                    onClick={() => setShowPasswordModal(true)}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <Edit2Icon className="w-4 h-4" />
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
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
                            onClick={() => {
                        setShowPasswordModal(false);
                        setPasswordData({ newPassword: '', confirmPassword: '' });
                        setPasswordError('');
                        setPasswordSuccess(false);
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                    }} />

                        {/* Modal */}
                        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ duration: 0.3, type: "spring" }}
                                className="relative flex flex-col gap-6 w-full max-w-md bg-[#F9F7F5] rounded-2xl border border-[#F1EDEA] shadow-2xl pointer-events-auto overflow-hidden p-6" 
                                onClick={(e) => e.stopPropagation()}
                            >
                            
                            {/* Décoration en haut à gauche */}
                            <div 
                                className="absolute -left-48 -top-48 w-[479px] h-[479px] rounded-full opacity-24 pointer-events-none"
                                style={{
                                    background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15deg, #CE7D2A 197.31deg, #FFAD5A 245.77deg)`,
                                    filter: 'blur(50px)',
                                }}
                            />

                            {/* Header */}
                            <div className="relative flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center shadow-md">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 font-inter">Modifier le mot de passe</h3>
                            </div>

                            {/* Messages */}
                            {passwordError && (
                                <div className="relative p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="relative p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Mot de passe modifié avec succès!</span>
                                </div>
                            )}

                            {/* Formulaire */}
                            <div className="relative space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Nouveau mot de passe
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full px-4 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            placeholder="Minimum 6 caractères"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Confirmer le mot de passe
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full px-4 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            placeholder="Répétez le mot de passe"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                                    className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={!passwordData.newPassword || !passwordData.confirmPassword}
                                    className="group relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-5 py-2.5 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
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
                <div className="fixed top-4 right-2 md:right-4 left-2 md:left-auto z-50 animate-fade-in-right font-inter">
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-orange-200">
                        {/* Barre latérale colorée */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F35F4F] to-[#FFAD5A]" />
                        
                        {/* Contenu */}
                        <div className="pl-6 pr-6 py-4 flex items-center gap-3 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                                <Check className="w-5 h-5 md:w-6 md:h-6 text-white stroke-[3]" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm md:text-base">{notificationMessage}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Modification enregistrée</p>
                            </div>
                        </div>
                        
                        {/* Effet de brillance */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    </div>
                </div>
            )}
        </Container>
    );
} 