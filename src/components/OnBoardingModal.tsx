'use client';

import { useState, useEffect } from 'react';
import { Building2, MapPin, Mail, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from './Toast';

interface OnboardingModalProps {
    userId: string;
    onComplete: () => void;
}

interface FormData {
    company_name: string;
    civility: string;
    first_name: string;
    last_name: string;
    job_title: string;
    street_address: string;
    address_complement: string;
    postal_code: string;
    city: string;
    country: string;
    contact_email: string;
    invoice_email: string;
    phone: string;
}

export function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        company_name: '',
        civility: '',
        first_name: '',
        last_name: '',
        job_title: '',
        street_address: '',
        address_complement: '',
        postal_code: '',
        city: '',
        country: 'France',
        contact_email: '',
        invoice_email: '',
        phone: '',
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [validationError, setValidationError] = useState('');
    const { showToast, ToastComponent } = useToast();

    const totalSteps = 3;

    useEffect(() => {
        loadProfileData();
    }, [userId]);

    const loadProfileData = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error loading profile:', error);
                setIsInitialized(true);
                return;
            }

            if (data) {
                if (data.onboarding_step) {
                    setCurrentStep(data.onboarding_step);
                }

                setFormData({
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
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsInitialized(true);
        }
    };

    useEffect(() => {
        if (!isInitialized) return;
        saveProgress();
    }, [currentStep, formData, isInitialized]);

    const saveProgress = async () => {
        try {
            await supabase
                .from('profiles')
                .update({
                    onboarding_step: currentStep,
                    company_name: formData.company_name || null,
                    civility: formData.civility || null,
                    first_name: formData.first_name || null,
                    last_name: formData.last_name || null,
                    job_title: formData.job_title || null,
                    street_address: formData.street_address || null,
                    address_complement: formData.address_complement || null,
                    postal_code: formData.postal_code || null,
                    city: formData.city || null,
                    country: formData.country || null,
                    contact_email: formData.contact_email || null,
                    invoice_email: formData.invoice_email || null,
                    phone: formData.phone || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    // Validation de l'email
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Validation du téléphone français
    const validatePhone = (phone: string) => {
        // Enlever les espaces et points
        const cleanPhone = phone.replace(/[\s.-]/g, '');
        // Formats acceptés : 0XXXXXXXXX ou +33XXXXXXXXX
        const phoneRegex = /^(0[1-9]\d{8}|(\+33|0033)[1-9]\d{8})$/;
        return phoneRegex.test(cleanPhone);
    };

    // Formater le téléphone
    const formatPhone = (phone: string) => {
        const cleanPhone = phone.replace(/[\s.-]/g, '');
        if (cleanPhone.startsWith('+33')) {
            return cleanPhone.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
        } else if (cleanPhone.startsWith('0')) {
            return cleanPhone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        }
        return phone;
    };

    // Auto-complétion d'adresse avec l'API officielle française (avec debounce)
    const searchAddress = (query: string) => {
        // Annuler la recherche précédente
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Si trop court, ne pas chercher
        if (query.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        // Attendre 400ms avant de lancer la recherche
        const timeout = setTimeout(async () => {
            try {
                // Utiliser l'API avec autocomplete pour de meilleurs résultats
                const response = await fetch(
                    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=10&autocomplete=1`
                );
                
                if (!response.ok) {
                    setAddressSuggestions([]);
                    setShowAddressSuggestions(false);
                    return;
                }
                
                const data = await response.json();
                
                if (data.features && data.features.length > 0) {
                    setAddressSuggestions(data.features);
                    setShowAddressSuggestions(true);
                } else {
                    setAddressSuggestions([]);
                    setShowAddressSuggestions(false);
                }
            } catch (error) {
                console.error('Error searching address:', error);
                setAddressSuggestions([]);
                setShowAddressSuggestions(false);
            }
        }, 400);

        setSearchTimeout(timeout);
    };

    // Sélectionner une adresse suggérée
    const selectAddress = (address: any) => {
        setFormData({
            ...formData,
            street_address: address.properties.name || '',
            postal_code: address.properties.postcode || '',
            city: address.properties.city || '',
        });
        setShowAddressSuggestions(false);
        setAddressSuggestions([]);
    };

    const isStep1Valid = () => {
        return (
            formData.company_name.trim() !== '' &&
            formData.civility !== '' &&
            formData.first_name.trim() !== '' &&
            formData.last_name.trim() !== ''
        );
    };

    const isStep2Valid = () => {
        return (
            formData.street_address.trim() !== '' &&
            formData.postal_code.trim() !== '' &&
            formData.city.trim() !== ''
        );
    };

    const isStep3Valid = () => {
        if (!formData.invoice_email.trim() || !formData.phone.trim()) {
            return false;
        }
        
        // Vérifier le format de l'email
        if (!validateEmail(formData.invoice_email)) {
            setEmailError('Format d\'email invalide');
            return false;
        }
        
        // Vérifier le format du téléphone
        if (!validatePhone(formData.phone)) {
            setPhoneError('Format de téléphone invalide (ex: 06 12 34 56 78)');
            return false;
        }
        
        return true;
    };

    const handleNext = () => {
        setValidationError(''); // Réinitialiser l'erreur
        if (currentStep === 1 && !isStep1Valid()) {
            setValidationError('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (currentStep === 2 && !isStep2Valid()) {
            setValidationError('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (currentStep < totalSteps) {
            setValidationError(''); // Réinitialiser l'erreur avant de passer à l'étape suivante
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setValidationError(''); // Réinitialiser l'erreur
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        // Réinitialiser les erreurs
        setEmailError('');
        setPhoneError('');
        setValidationError('');
        
        if (!isStep3Valid()) {
            if (emailError || phoneError) {
                setValidationError('Veuillez corriger les erreurs dans le formulaire');
            } else {
                setValidationError('Veuillez remplir tous les champs obligatoires');
            }
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    company_name: formData.company_name,
                    civility: formData.civility,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    job_title: formData.job_title,
                    street_address: formData.street_address,
                    address_complement: formData.address_complement,
                    postal_code: formData.postal_code,
                    city: formData.city,
                    country: formData.country,
                    contact_email: formData.contact_email,
                    invoice_email: formData.invoice_email,
                    phone: formData.phone,
                    is_configured: true,
                    onboarding_step: 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) {
                console.error('Error updating profile:', error);
                showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
                return;
            }

            showToast('Configuration enregistrée avec succès !', 'success');
            onComplete(); // Appel immédiat sans délai
        } catch (error) {
            console.error('Error:', error);
            showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastComponent />
            
            {/* Overlay */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-[#F9F7F5] rounded-3xl border border-[#F1EDEA] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    
                    {/* Décoration en haut à gauche */}
                    <div 
                        className="absolute -left-48 -top-48 w-[479px] h-[479px] rounded-full opacity-24 pointer-events-none"
                        style={{
                            background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15deg, #CE7D2A 197.31deg, #FFAD5A 245.77deg)`,
                            filter: 'blur(50px)',
                        }}
                    />

                    {/* Header avec logo et titre */}
                    <div className="relative px-8 pt-8 pb-4">
                        <div className='flex items-center gap-3 mb-2'>
                            <img src="/logo/logo-hallia-orange.png" alt="HALL-IA Logo" className="w-12 h-12" />
                            <div>
                                <h2 className='text-3xl font-bold font-roboto text-gray-900'>Bienvenue sur Hall IA !</h2>
                            </div>
                        </div>
                        <p className="text-gray-600 text-base ml-15 font-roboto">Configurons votre compte en quelques étapes</p>
                    </div>

                {/* Contenu scrollable */}
                <div className="relative overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Progress Steps */}
                    <div className="py-4 border-b border-gray-200">
                    <div className="relative flex items-center w-full">
                        {/* Étapes avec chiffres et mots */}
                        <div className="relative flex w-full items-center">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${step < currentStep
                                                ? 'bg-white border-2 border-orange-400 text-orange-500'
                                                : step === currentStep
                                                    ? 'bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white shadow-md'
                                                    : 'bg-gray-50 border-2 border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        {step < currentStep ? <Check className="w-4 h-4" /> : step}
                                    </div>
                                    <span
                                        className={`text-sm font-medium mt-4 font-roboto ${step === currentStep ? 'text-orange-500' : step < currentStep ? 'text-orange-400' : 'text-gray-400'
                                            }`}
                                    >
                                        {step === 1 ? 'Entreprise' : step === 2 ? 'Adresse' : 'Contact'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {/* Lignes de progression positionnées entre les cercles */}
                        <div className="absolute top-5 left-0 right-0 h-0.5 pointer-events-none z-0">
                            {/* Ligne entre étape 1 et 2 : de la fin du cercle 1 au début du cercle 2 */}
                            <div 
                                className={`absolute h-0.5 rounded-full transition-all ${1 < currentStep ? 'bg-orange-300' : 'bg-gray-200'}`}
                                style={{ 
                                    left: 'calc(16.666% + 20px)', 
                                    width: 'calc(33.333% - 40px)',
                                    top: '0'
                                }}
                            ></div>
                            {/* Ligne entre étape 2 et 3 : de la fin du cercle 2 au début du cercle 3 */}
                            <div 
                                className={`absolute h-0.5 rounded-full transition-all ${2 < currentStep ? 'bg-orange-300' : 'bg-gray-200'}`}
                                style={{ 
                                    left: 'calc(50% + 20px)', 
                                    width: 'calc(33.333% - 40px)',
                                    top: '0'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="px-8 py-6">
                    {/* Step 1: Informations Entreprise */}
                    {currentStep === 1 && (
                        <div className="space-y-5 font-roboto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 font-roboto">Informations entreprise</h3>
                                    <p className="text-gray-500 text-sm font-roboto">Renseignez les informations de votre entreprise</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Nom de l'entreprise <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                    placeholder="Nom de votre entreprise"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                        Civilité <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.civility}
                                        onChange={(e) => setFormData({ ...formData, civility: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="Monsieur">Monsieur</option>
                                        <option value="Madame">Madame</option>
                                        <option value="Autre">Autre</option>
                                        <option value="Ne souhaite pas être défini">Ne souhaite pas être défini</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                        Prénom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                        placeholder="Prénom"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                        Nom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                        placeholder="Nom"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Fonction
                                </label>
                                <input
                                    type="text"
                                    value={formData.job_title}
                                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                    placeholder="Directeur Général, Responsable Commercial..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Adresse */}
                    {currentStep === 2 && (
                        <div className="space-y-5 font-roboto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <MapPin className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 font-roboto">Adresse</h3>
                                    <p className="text-gray-500 text-sm font-roboto">Indiquez l'adresse de votre entreprise</p>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Numéro et rue <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.street_address}
                                    onChange={(e) => {
                                        setFormData({ ...formData, street_address: e.target.value });
                                        searchAddress(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (addressSuggestions.length > 0) {
                                            setShowAddressSuggestions(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Délai pour permettre le clic sur une suggestion
                                        setTimeout(() => setShowAddressSuggestions(false), 200);
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                    placeholder="Ex: 14 avenue Barthélémy Thimonnier"
                                    required
                                    autoComplete="off"
                                />
                                <p className="mt-1 text-xs text-gray-500 font-roboto">
                                    💡 Tapez votre adresse pour voir les suggestions automatiques
                                </p>
                                
                                {/* Suggestions d'adresses */}
                                {showAddressSuggestions && addressSuggestions.length > 0 && (
                                    <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto font-roboto">
                                        {addressSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => selectAddress(suggestion)}
                                                className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 font-roboto"
                                            >
                                                <div className="font-medium text-gray-900 text-sm font-roboto">{suggestion.properties.name}</div>
                                                <div className="text-xs text-gray-500 mt-1 font-roboto">
                                                    {suggestion.properties.postcode} {suggestion.properties.city}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Complément d'adresse (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={formData.address_complement}
                                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                    placeholder="Bâtiment, étage, porte..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                        Code postal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                        placeholder="75001"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                        Ville <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                        placeholder="Paris"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">Pays</label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto"
                                >
                                    <option value="France">France</option>
                                    <option value="Belgique">Belgique</option>
                                    <option value="Suisse">Suisse</option>
                                    <option value="Luxembourg">Luxembourg</option>
                                    <option value="Canada">Canada</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Contact */}
                    {currentStep === 3 && (
                        <div className="space-y-5 font-roboto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 font-roboto">Contact</h3>
                                    <p className="text-gray-500 text-sm font-roboto">Ajoutez vos coordonnées de contact</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Adresse email pour les factures <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.invoice_email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, invoice_email: e.target.value });
                                        setEmailError('');
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value && !validateEmail(e.target.value)) {
                                            setEmailError('Format d\'email invalide (ex: factures@entreprise.fr)');
                                        }
                                    }}
                                    className={`w-full px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto ${
                                        emailError ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="factures@entreprise.fr"
                                    required
                                />
                                {emailError && (
                                    <p className="mt-1 text-sm text-red-600 font-roboto">{emailError}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 font-roboto">
                                    Téléphone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData({ ...formData, phone: value });
                                        setPhoneError('');
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value) {
                                            if (validatePhone(e.target.value)) {
                                                // Formater automatiquement
                                                setFormData({ ...formData, phone: formatPhone(e.target.value) });
                                            } else {
                                                setPhoneError('Format invalide (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)');
                                            }
                                        }
                                    }}
                                    className={`w-full px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-roboto ${
                                        phoneError ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="06 12 34 56 78"
                                    required
                                />
                                {phoneError && (
                                    <p className="mt-1 text-sm text-red-600 font-roboto">{phoneError}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 font-roboto">
                                    Format: 06 12 34 56 78 ou +33 6 12 34 56 78
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                </div>

                {/* Footer with Navigation */}
                <div className="relative px-8 py-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
                    {/* Message d'erreur */}
                    {validationError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-roboto">{validationError}</p>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between font-roboto">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all font-roboto ${currentStep === 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Précédent
                        </button>

                        <div className="text-sm font-medium text-gray-500 font-roboto">
                            Étape {currentStep} sur {totalSteps}
                        </div>

                        {currentStep < totalSteps ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all font-roboto"
                            >
                                Suivant
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 font-roboto"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Terminer
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}
