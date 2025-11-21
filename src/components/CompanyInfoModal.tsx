'use client';

import { useState, useEffect, useCallback } from 'react';
import { Image, Check, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from './Toast';
import { syncKnowledgeBase, fileToBase64, validatePdfFile } from '@/utils/knowledgeBaseService';

interface CompanyInfoModalProps {
    userId: string;
    emailAccountId?: string;
    email?: string;
    initialStep?: number;
    onComplete: () => void;
    onClose?: () => void;
    onShowAddEmailCount?: () => void;
}

export function CompanyInfoModal({ userId, emailAccountId, email, initialStep = 1, onComplete, onClose, onShowAddEmailCount }: CompanyInfoModalProps) {
    const { showToast, ToastComponent } = useToast();
    
    // Clé unique pour sauvegarder l'étape dans localStorage
    const stepStorageKey = email ? `company_info_step_${userId}_${email}` : `company_info_step_${userId}`;
    
    // Restaurer l'étape sauvegardée ou utiliser initialStep
    const getSavedStep = () => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(stepStorageKey);
            if (saved) {
                const step = parseInt(saved, 10);
                if (step >= 1 && step <= 5) {
                    return step;
                }
            }
        }
        return initialStep;
    };
    
    const [currentStep, setCurrentStep] = useState(getSavedStep());
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        activity_description: '',
        services_offered: '', // Utilisé pour la signature d'email
        signature_image_base64: '',
    });
    const [knowledgeUrls, setKnowledgeUrls] = useState<string[]>(['']);
    const [knowledgePdfFiles, setKnowledgePdfFiles] = useState<File[]>([]);
    const [isDraggingPdf, setIsDraggingPdf] = useState(false);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const [validationError, setValidationError] = useState<{ step: number; message: string } | null>(null);
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

    const totalSteps = 5;

    // Fonction pour sauvegarder automatiquement les données dans la base de données
    const saveProgress = useCallback(async (silent = true) => {
        if (!userId || !email) return;

        try {
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            // Sauvegarder les données selon l'étape actuelle
            if (formData.company_name?.trim()) {
                updateData.company_name = formData.company_name.trim();
            }
            if (formData.activity_description?.trim()) {
                updateData.activity_description = formData.activity_description.trim();
            }
            if (formData.services_offered?.trim()) {
                updateData.services_offered = formData.services_offered.trim();
            }
            if (formData.signature_image_base64) {
                updateData.signature_image_base64 = formData.signature_image_base64;
            }

            // Sauvegarder les URLs de la base de connaissances si elles existent
            const validUrls = knowledgeUrls.filter(url => url.trim() !== '');
            if (validUrls.length > 0) {
                updateData.knowledge_base_urls = JSON.stringify(validUrls);
            }

            // Ne pas sauvegarder les PDFs ici car ils nécessitent un traitement spécial
            // Ils seront sauvegardés lors de la soumission finale

            // Mettre à jour dans la base de données
            if (emailAccountId) {
                await supabase
                    .from('email_configurations')
                    .update(updateData)
                    .eq('id', emailAccountId);
            } else if (email) {
                await supabase
                    .from('email_configurations')
                    .update(updateData)
                    .eq('user_id', userId)
                    .eq('email', email);
            }

            if (!silent) {
            }
        } catch (error) {
            console.error('[CompanyInfoModal] Erreur lors de la sauvegarde automatique:', error);
        }
    }, [userId, email, emailAccountId, formData.company_name, formData.activity_description, formData.services_offered, formData.signature_image_base64, knowledgeUrls]);

    // Sauvegarder l'étape dans localStorage quand elle change
    useEffect(() => {
        if (typeof window !== 'undefined' && currentStep >= 1 && currentStep <= 5) {
            localStorage.setItem(stepStorageKey, currentStep.toString());
        }
    }, [currentStep, stepStorageKey]);

    // Sauvegarder automatiquement les données avec debounce quand les champs changent
    useEffect(() => {
        // Annuler la sauvegarde précédente si elle existe
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Ne sauvegarder que si on a au moins un champ rempli
        const hasData = formData.company_name?.trim() || 
                       formData.activity_description?.trim() || 
                       formData.services_offered?.trim() || 
                       formData.signature_image_base64;

        if (hasData && userId && email) {
            // Sauvegarder après 2 secondes d'inactivité
            const timeout = setTimeout(() => {
                saveProgress(true); 
            }, 2000);
            setSaveTimeout(timeout);
        }

        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [formData.company_name, formData.activity_description, formData.services_offered, formData.signature_image_base64, userId, email, saveProgress]);

    useEffect(() => {
        loadCompanyData();
    }, [userId, email]);

    useEffect(() => {
        // Si initialStep est fourni explicitement, l'utiliser (par exemple lors d'une réouverture depuis un lien)
        if (initialStep && initialStep !== currentStep) {
            setCurrentStep(initialStep);
        }
    }, [initialStep]);

    const loadCompanyData = async () => {
        if (!userId || !email) return;

        try {
            const { data, error } = await supabase
                .from('email_configurations')
                .select('company_name, activity_description, services_offered, signature_image_base64, knowledge_base_urls, knowledge_base_pdfs')
                .eq('user_id', userId)
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error('Error loading company data:', error);
                return;
            }

            if (data) {
                setFormData({
                    company_name: data.company_name || '',
                    activity_description: data.activity_description || '',
                    services_offered: data.services_offered || '', // Signature d'email
                    signature_image_base64: data.signature_image_base64 || '',
                });
                
                // Charger les URLs de la base de connaissances
                if (data.knowledge_base_urls) {
                    const urls = Array.isArray(data.knowledge_base_urls) 
                        ? data.knowledge_base_urls 
                        : JSON.parse(data.knowledge_base_urls || '[]');
                    setKnowledgeUrls(urls.length > 0 ? urls : ['']);
                }
                
                // Restaurer l'étape sauvegardée après avoir chargé les données
                // Si aucune étape n'est sauvegardée, déterminer l'étape en fonction des données remplies
                if (typeof window !== 'undefined') {
                    const savedStep = localStorage.getItem(stepStorageKey);
                    if (savedStep) {
                        const step = parseInt(savedStep, 10);
                        if (step >= 1 && step <= 5) {
                            setCurrentStep(step);
                        }
                    } else {
                        // Déterminer l'étape en fonction des données remplies
                        let determinedStep = 1;
                        if (data.company_name) determinedStep = 2;
                        if (data.activity_description) determinedStep = 3;
                        if (data.services_offered) determinedStep = 4;
                        if (data.signature_image_base64) determinedStep = 5;
                        if (data.knowledge_base_urls || data.knowledge_base_pdfs) determinedStep = 5;
                        
                        if (determinedStep > 1) {
                            setCurrentStep(determinedStep);
                            localStorage.setItem(stepStorageKey, determinedStep.toString());
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleNext = async () => {
        const trimmedCompanyName = formData.company_name?.trim();
        const trimmedActivityDescription = formData.activity_description?.trim();
        const trimmedSignature = formData.services_offered?.trim();

        if (currentStep === 1 && !trimmedCompanyName) {
            if (validationError?.step !== 1) {
                setValidationError({ step: 1, message: 'Veuillez remplir le nom de l\'entreprise' });
            }
            return;
        }
        if (currentStep === 2 && !trimmedActivityDescription) {
            if (validationError?.step !== 2) {
                setValidationError({ step: 2, message: 'Veuillez remplir la description de l\'activité' });
            }
            return;
        }
        if (currentStep === 3 && !trimmedSignature) {
            if (validationError?.step !== 3) {
                setValidationError({ step: 3, message: 'Veuillez remplir la signature d\'email' });
            }
            return;
        }

        setValidationError(null);
        
        // Sauvegarder la progression avant de passer à l'étape suivante
        await saveProgress();
        
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = async () => {
        if (currentStep > 1) {
            // Sauvegarder la progression avant de revenir en arrière
            await saveProgress();
            setCurrentStep(currentStep - 1);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processImageFile(file);
    };

    const processImageFile = (file: File) => {
        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
            showToast('Veuillez sélectionner un fichier image', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('L\'image ne doit pas dépasser 5 Mo', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData({ ...formData, signature_image_base64: base64String });
        };
        reader.readAsDataURL(file);
    };

    const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(true);
    };

    const handleLogoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(false);
    };

    const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            processImageFile(imageFiles[0]); // Prendre le premier fichier image
        } else if (files.length > 0) {
            showToast('Veuillez sélectionner un fichier image', 'error');
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

    const handleKnowledgePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        processPdfFiles(Array.from(files));
    };

    const processPdfFiles = (files: File[]) => {
        const newFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type === 'application/pdf') {
                const validation = validatePdfFile(file);
                if (validation.valid) {
                    newFiles.push(file);
                } else {
                    showToast(validation.error || 'Erreur de validation', 'error');
                }
            } else {
                showToast('Seuls les fichiers PDF sont acceptés', 'error');
            }
        }
        if (newFiles.length > 0) {
            setKnowledgePdfFiles([...knowledgePdfFiles, ...newFiles]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPdf(false);

        const files = Array.from(e.dataTransfer.files);
        const pdfFiles = files.filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length > 0) {
            processPdfFiles(pdfFiles);
        } else if (files.length > 0) {
            showToast('Seuls les fichiers PDF sont acceptés', 'error');
        }
    };

    const handleRemoveKnowledgePdf = (index: number) => {
        setKnowledgePdfFiles(knowledgePdfFiles.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // Vérifier les champs obligatoires - empêcher les valeurs vides
        const companyName = formData.company_name?.trim() || '';
        const activityDescription = formData.activity_description?.trim() || '';
        const signatureEmail = formData.services_offered?.trim() || '';

        if (!companyName) {
            setCurrentStep(1);
            setValidationError({ step: 1, message: 'Le nom de l\'entreprise est obligatoire' });
            return;
        }

        if (!activityDescription) {
            setCurrentStep(2);
            setValidationError({ step: 2, message: 'La description de l\'activité est obligatoire' });
            return;
        }

        if (!signatureEmail) {
            setCurrentStep(3);
            setValidationError({ step: 3, message: 'La signature d\'email est obligatoire' });
            return;
        }
        setValidationError(null);

        setLoading(true);
        try {
            // S'assurer qu'on n'envoie pas de valeurs vides pour les champs obligatoires
            const updateData: any = {
                company_name: companyName,
                activity_description: activityDescription,
                services_offered: signatureEmail, // Signature d'email
                signature_image_base64: formData.signature_image_base64 || null,
                is_classement: true, // Activer le flux automatique de l'email
                updated_at: new Date().toISOString(),
            };

            // Gérer la base de connaissances si des URLs ou PDFs sont fournis
            const newUrls = knowledgeUrls.filter(url => url.trim() !== '');
            if (newUrls.length > 0 || knowledgePdfFiles.length > 0) {
                try {
                    // Convertir les PDFs en base64
                    const pdfPromises = knowledgePdfFiles.map(file => fileToBase64(file));
                    const pdfBase64Array = await Promise.all(pdfPromises);
                    const pdfsData = pdfBase64Array.map((base64, index) => ({
                        name: knowledgePdfFiles[index].name,
                        base64: base64
                    }));

                    // Récupérer les PDFs existants
                    let existingPdfs: any[] = [];
                    if (emailAccountId || email) {
                        const { data: existingData } = await supabase
                            .from('email_configurations')
                            .select('knowledge_base_pdfs')
                            .eq(emailAccountId ? 'id' : 'user_id', emailAccountId || userId)
                            .eq(email ? 'email' : 'id', email || emailAccountId || '')
                            .maybeSingle();
                        
                        if (existingData?.knowledge_base_pdfs) {
                            existingPdfs = Array.isArray(existingData.knowledge_base_pdfs)
                                ? existingData.knowledge_base_pdfs
                                : JSON.parse(existingData.knowledge_base_pdfs || '[]');
                        }
                    }

                    const allPdfs = [...existingPdfs, ...pdfsData];
                    const allUrls = newUrls;

                    // Récupérer l'ID de la configuration email
                    let configId = emailAccountId;
                    if (!configId && email) {
                        const { data: configData } = await supabase
                            .from('email_configurations')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('email', email)
                            .maybeSingle();
                        configId = configData?.id;
                    }

                    // Synchroniser avec la base de connaissances
                    if (configId) {
                        await syncKnowledgeBase({
                            id: configId,
                            email: email || '',
                            urls: allUrls,
                            pdfs: allPdfs
                        });
                    }

                    updateData.knowledge_base_urls = JSON.stringify(allUrls);
                    updateData.knowledge_base_pdfs = JSON.stringify(allPdfs);
                    updateData.knowledge_base_synced_at = new Date().toISOString();
                } catch (kbError) {
                    console.error('Error syncing knowledge base:', kbError);
                    // Ne pas bloquer la sauvegarde si la base de connaissances échoue
                }
            }

            let error;
            if (emailAccountId) {
                const { error: updateError } = await supabase
                    .from('email_configurations')
                    .update(updateData)
                    .eq('id', emailAccountId);
                error = updateError;
            } else if (email) {
                const { error: updateError } = await supabase
                    .from('email_configurations')
                    .update(updateData)
                    .eq('user_id', userId)
                    .eq('email', email);
                error = updateError;
            }

            if (error) {
                console.error('Error updating company info:', error);
                showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
                return;
            }

            // Récupérer l'ID de la configuration email pour l'appel du webhook
            let finalConfigId = emailAccountId;
            if (!finalConfigId && email) {
                const { data: configData } = await supabase
                    .from('email_configurations')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('email', email)
                    .maybeSingle();
                finalConfigId = configData?.id;
            }

            // Appeler le webhook N8N pour activer le flux automatique (si configuré)
            if (finalConfigId) {
                try {
                    // Récupérer l'email depuis la config si pas fourni
                    let emailForWebhook = email;
                    if (!emailForWebhook) {
                        const { data: emailConfigData } = await supabase
                            .from('email_configurations')
                            .select('email')
                            .eq('id', finalConfigId)
                            .maybeSingle();
                        emailForWebhook = emailConfigData?.email;
                    }

                    if (emailForWebhook) {
                        const { data: webhookData } = await supabase
                            .from('webhook_settings')
                            .select('n8n_webhook_url')
                            .eq('user_id', userId)
                            .maybeSingle();

                        const webhookUrl = webhookData?.n8n_webhook_url;

                        if (webhookUrl) {
                            try {
                                // Récupérer les informations complètes de l'email pour le webhook
                                const { data: emailConfig } = await supabase
                                    .from('email_configurations')
                                    .select('email, password, imap_host, imap_port, provider, company_name, activity_description, services_offered')
                                    .eq('id', finalConfigId)
                                    .maybeSingle();

                                if (emailConfig) {
                                    // Préparer le payload pour le webhook N8N
                                    const payload = {
                                        user_id: userId,
                                        email: emailConfig.email,
                                        password: emailConfig.password || '',
                                        imap_host: emailConfig.imap_host || '',
                                        imap_port: emailConfig.imap_port || 993,
                                        company_name: emailConfig.company_name || companyName,
                                        activity_description: emailConfig.activity_description || activityDescription,
                                        services: emailConfig.services_offered || signatureEmail,
                                    };

                                    // Appeler le webhook N8N (non bloquant)
                                    const response = await fetch(webhookUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(payload),
                                    });

                                    if (response.ok) {
                                    } else {
                                        console.warn('[CompanyInfoModal] Erreur lors de l\'appel du webhook (non bloquant):', response.statusText);
                                    }
                                }
                            } catch (webhookError) {
                                // Erreur webhook non bloquante
                                console.warn('[CompanyInfoModal] Erreur lors de l\'appel du webhook (non bloquant):', webhookError);
                            }
                        } else {
                        }
                    }
                } catch (error) {
                    console.error('[CompanyInfoModal] Erreur lors de l\'appel du webhook:', error);
                }
            }


            showToast('Informations enregistrées avec succès !', 'success');
            
            // Nettoyer la sauvegarde de l'étape dans localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem(stepStorageKey);
            }
            
            // Vérifier si c'est le premier email (is_primary) pour afficher AddEmailCount
            if (onShowAddEmailCount && finalConfigId) {
                try {
                    const { data: emailConfig } = await supabase
                        .from('email_configurations')
                        .select('is_primary')
                        .eq('id', finalConfigId)
                        .maybeSingle();
                    
                    if (emailConfig?.is_primary) {
                        // C'est le premier email, fermer la modal et afficher AddEmailCount après un court délai
                        setTimeout(() => {
                            onComplete(); // Fermer CompanyInfoModal
                            onShowAddEmailCount(); // Afficher AddEmailCount
                        }, 500);
                        return;
                    }
                } catch (error) {
                    console.error('[CompanyInfoModal] Erreur lors de la vérification is_primary:', error);
                }
            }
            
            setTimeout(() => onComplete(), 500);
        } catch (error) {
            console.error('Error:', error);
            showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll et focus pour l'étape initiale
    useEffect(() => {
        if (initialStep && initialStep > 0) {
            setTimeout(() => {
                let fieldToScroll: HTMLElement | null = null;
                if (initialStep === 1) {
                    fieldToScroll = document.getElementById('company-name-field');
                } else if (initialStep === 2) {
                    fieldToScroll = document.getElementById('activity-description-field');
                } else if (initialStep === 3) {
                    fieldToScroll = document.getElementById('signature-text-field');
                }
                if (fieldToScroll) {
                    fieldToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => {
                        const input = fieldToScroll?.querySelector('input, textarea') as HTMLElement;
                        if (input) {
                            input.focus();
                        }
                    }, 300);
                }
            }, 300);
        }
    }, [initialStep]);

    return (
        <>
            <ToastComponent />
            
            {/* Overlay - non cliquable */}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            {/* Modal centré - style compact */}
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                    
                    {/* Header avec gradient conique */}
                    <div 
                        className="relative px-6 pt-7 pb-0 overflow-hidden"
                        style={{
                            background: `conic-gradient(from 194deg at 84% -3.1%, #FF9A34 0deg, #F35F4F 76.15384697914124deg, #CE7D2A 197.30769395828247deg, #FFAD5A 245.76922416687012deg), #F9F7F5`,
                        }}
                    >
                        {/* Pattern de plus signs */}
                        <div 
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px),
                                                  repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 22px)`,
                            }}
                        />
                        <div className="relative z-10 py-5">
                            <h2 className='text-4xl font-bold font-thunder text-white mb-2'>Configuration</h2>
                            <p className="text-white/90 text-sm font-inter">
                                {currentStep === 1 && "Nom de l'entreprise"}
                                {currentStep === 2 && "Description de l'activité"}
                                {currentStep === 3 && "Signature d'email"}
                                {currentStep === 4 && "Logo de signature"}
                                {currentStep === 5 && "Base de connaissance"}
                            </p>
                        </div>
                        {/* Barre de progression en bas du header orange */}
                        <div className="relative z-10 px-0 pb-3">
                            <div className="w-full bg-orange-500/30 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ligne blanche de séparation */}
                    <div className="h-1 bg-white"></div>

                    {/* Section d'information jaune */}
                    {email && (
                        <div className="px-6 pt-4 pb-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-800 font-inter mb-0.5">Compte concerné</p>
                                    <p className="text-xs text-gray-700 font-inter mb-0.5">{email}</p>
                                    <p className="text-xs text-gray-600 font-inter">Ce compte nécessite des informations supplémentaires pour fonctionner correctement.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contenu scrollable */}
                    <div className="relative overflow-y-auto flex-1 min-h-0 py-5">
                        {validationError && validationError.step === currentStep && (
                            <div className="px-6 mb-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-800">{validationError.message}</p>
                                        <p className="text-xs text-red-600">Corrigez ce champ pour continuer.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="px-6 py-4">
                            {/* Step 1: Nom de l'entreprise */}
                            {currentStep === 1 && (
                                <div className="space-y-3 font-inter" id="company-name-field">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 font-inter">
                                            Nom de l'entreprise <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_name}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFormData({ ...formData, company_name: value });
                                                if (validationError?.step === 1) {
                                                    setValidationError(null);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-inter text-sm"
                                            placeholder="Ex: Hall IA"
                                            required
                                            minLength={1}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Description de l'activité */}
                            {currentStep === 2 && (
                                <div className="space-y-3 font-inter" id="activity-description-field">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 font-inter">
                                            Description de l'activité <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.activity_description}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFormData({ ...formData, activity_description: value });
                                                if (validationError?.step === 2) {
                                                    setValidationError(null);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none font-inter text-sm"
                                            rows={4}
                                            placeholder="Ex: Hall-IA développe des solutions intelligentes, dont HallMail, un outil qui organise automatiquement vos emails en catégories comme PUB, INFO ou TRAITÉ."
                                            required
                                            minLength={1}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Signature d'email */}
                            {currentStep === 3 && (
                                <div className="space-y-3 font-inter" id="signature-text-field">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 font-inter">
                                            Signature d'email <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.services_offered}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFormData({ ...formData, services_offered: value });
                                                if (validationError?.step === 3) {
                                                    setValidationError(null);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none font-inter text-sm"
                                            rows={4}
                                            placeholder="Ex: Cordialement,&#10;Votre nom&#10;Votre fonction"
                                            required
                                            minLength={1}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Logo de signature (optionnel) */}
                            {currentStep === 4 && (
                                <div className="space-y-3 font-inter">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 font-inter">
                                            Logo de signature (optionnel)
                                        </label>
                                        <div
                                            onDragOver={handleLogoDragOver}
                                            onDragLeave={handleLogoDragLeave}
                                            onDrop={handleLogoDrop}
                                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                                isDraggingLogo 
                                                    ? 'border-orange-400 bg-orange-50' 
                                                    : formData.signature_image_base64
                                                        ? 'border-gray-300'
                                                        : 'border-gray-300 hover:border-orange-400'
                                            }`}
                                        >
                                            {formData.signature_image_base64 ? (
                                                <div className="space-y-3">
                                                    <img
                                                        src={formData.signature_image_base64}
                                                        alt="Signature"
                                                        className="max-h-20 mx-auto object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, signature_image_base64: '' })}
                                                        className="text-xs text-red-600 hover:text-red-700 font-inter"
                                                    >
                                                        Supprimer l'image
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Image className="w-8 h-8 text-gray-400 mx-auto" />
                                                    <div>
                                                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors font-inter text-xs">
                                                            <span>Choisir une image</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleImageUpload}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-inter">
                                                        PNG, JPG jusqu'à 5 Mo ou glissez-déposez une image ici
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Base de connaissance (optionnel) */}
                            {currentStep === 5 && (
                                <div className="space-y-3 font-inter">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3 font-inter">
                                            Base de connaissance (optionnel)
                                        </label>
                                        
                                        {/* URLs */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-600 font-inter">URLs</span>
                                                <button
                                                    type="button"
                                                    onClick={handleAddKnowledgeUrl}
                                                    className="text-xs text-orange-600 hover:text-orange-700 font-inter"
                                                >
                                                    + Ajouter une URL
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {knowledgeUrls.map((url, index) => (
                                                    <div key={index} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={url}
                                                            onChange={(e) => handleKnowledgeUrlChange(index, e.target.value)}
                                                            className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-inter"
                                                            placeholder="https://exemple.com"
                                                        />
                                                        {knowledgeUrls.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveKnowledgeUrl(index)}
                                                                className="px-2 py-2 text-xs text-red-600 hover:text-red-700 font-inter"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* PDFs */}
                                        <div>
                                            <div className="mb-2">
                                                <span className="text-xs text-gray-600 font-inter">Documents PDF</span>
                                            </div>
                                            
                                            {/* Zone de drag and drop */}
                                            <div
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                                    isDraggingPdf 
                                                        ? 'border-orange-400 bg-orange-50' 
                                                        : 'border-gray-300 hover:border-orange-400'
                                                }`}
                                            >
                                                <div className="space-y-3">
                                                    <Image className="w-8 h-8 text-gray-400 mx-auto" />
                                                    <div>
                                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors font-inter text-xs">
                                                            <span>Choisir un PDF</span>
                                                            <input
                                                                type="file"
                                                                accept="application/pdf"
                                                                onChange={handleKnowledgePdfChange}
                                                                className="hidden"
                                                                multiple
                                                            />
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-inter">
                                                        ou glissez-déposez un fichier PDF ici
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Liste des PDFs ajoutés */}
                                            {knowledgePdfFiles.length > 0 && (
                                                <div className="space-y-2 mt-3">
                                                    {knowledgePdfFiles.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                            <span className="text-xs text-gray-700 font-inter truncate flex-1">{file.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveKnowledgePdf(index)}
                                                                className="text-xs text-red-600 hover:text-red-700 font-inter ml-2"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer avec boutons */}
                    <div className="px-6 pb-5 pt-4 border-t border-gray-100 bg-white">
                        <div className="flex items-center justify-between gap-3">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold font-inter text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Retour
                                </button>
                            )}
                            
                            <div className="flex-1" />

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 max-w-[200px] mx-auto flex items-center justify-center gap-2 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-2.5 font-semibold text-white rounded-lg shadow-lg transition-all duration-300 ease-out hover:shadow-xl font-inter text-sm"
                                >
                                    Continuer
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 max-w-[200px] mx-auto flex items-center justify-center gap-2 bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-2.5 font-semibold text-white rounded-lg shadow-lg transition-all duration-300 ease-out hover:shadow-xl disabled:opacity-50 font-inter text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            Terminer
                                            <Check className="w-4 h-4" />
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
