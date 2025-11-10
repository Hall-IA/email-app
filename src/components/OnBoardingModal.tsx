'use client';

import { useState, useEffect } from 'react';
import { Building2, MapPin, Mail, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
        return formData.contact_email.trim() !== '' && formData.phone.trim() !== '';
    };

    const handleNext = () => {
        if (currentStep === 1 && !isStep1Valid()) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (currentStep === 2 && !isStep2Valid()) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (!isStep3Valid()) {
            alert('Veuillez remplir tous les champs obligatoires');
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
                alert('Une erreur est survenue. Veuillez réessayer.');
                return;
            }

            onComplete();
        } catch (error) {
            console.error('Error:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-[#F9F7F5] rounded-3xl border border-[#F1EDEA] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    
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
                        <p className="text-gray-600 text-base ml-15">Configurons votre compte en quelques étapes</p>
                    </div>

                {/* Contenu scrollable */}
                <div className="relative overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Progress Steps */}
                    <div className="px-8 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center flex-1">
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
                                {step < totalSteps && (
                                    <div
                                        className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${step < currentStep ? 'bg-orange-300' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4">
                        <span
                            className={`text-sm font-medium ${currentStep === 1 ? 'text-orange-500' : currentStep > 1 ? 'text-orange-400' : 'text-gray-400'
                                }`}
                        >
                            Entreprise
                        </span>
                        <span
                            className={`text-sm font-medium ${currentStep === 2 ? 'text-orange-500' : currentStep > 2 ? 'text-orange-400' : 'text-gray-400'
                                }`}
                        >
                            Adresse
                        </span>
                        <span className={`text-sm font-medium ${currentStep === 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                            Contact
                        </span>
                    </div>
                </div>

                {/* Form Content */}
                <div className="px-8 py-6">
                    {/* Step 1: Informations Entreprise */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Informations entreprise</h3>
                                    <p className="text-gray-500 text-sm">Renseignez les informations de votre entreprise</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nom de l'entreprise <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Nom de votre entreprise"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Civilité <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.civility}
                                        onChange={(e) => setFormData({ ...formData, civility: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="M.">M.</option>
                                        <option value="Mme">Mme</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prénom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="Prénom"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="Nom"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fonction
                                </label>
                                <input
                                    type="text"
                                    value={formData.job_title}
                                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Directeur Général, Responsable Commercial..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Adresse */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <MapPin className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Adresse</h3>
                                    <p className="text-gray-500 text-sm">Indiquez l'adresse de votre entreprise</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Numéro et rue <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.street_address}
                                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="123 rue de la République"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Complément d'adresse (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={formData.address_complement}
                                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Bâtiment, étage, porte..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Code postal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="75001"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ville <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="Paris"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] flex items-center justify-center shadow-md">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Contact</h3>
                                    <p className="text-gray-500 text-sm">Ajoutez vos coordonnées de contact</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Adresse email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="contact@entreprise.fr"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Adresse email pour les factures (optionnel)
                                </label>
                                <input
                                    type="email"
                                    value={formData.invoice_email}
                                    onChange={(e) => setFormData({ ...formData, invoice_email: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="factures@entreprise.fr"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Téléphone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="+33 1 23 45 67 89"
                                    required
                                />
                            </div>
                        </div>
                    )}
                </div>
                </div>

                {/* Footer with Navigation */}
                <div className="relative px-8 py-6 bg-white/80 backdrop-blur-sm border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${currentStep === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Précédent
                    </button>

                    <div className="text-sm font-medium text-gray-500">
                        Étape {currentStep} sur {totalSteps}
                    </div>

                    {currentStep < totalSteps ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                        >
                            Suivant
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                    
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50"
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
        </>
    );
}
