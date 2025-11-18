'use client';

import Image from "next/image";
import CustomButton from "../../CustomButton";
import CardPack from "../../CardPack";
import { useState } from "react";
import { LoginModal } from "../../LoginModal";
import { useRouter } from "next/navigation";
import { HelpCircle, XCircle } from "lucide-react";

export default function AppPack() {
    const router = useRouter();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const handleStartClick = (planType: string) => {
        setSelectedPlan(planType);
        // Sauvegarder le plan sélectionné dans le localStorage
        localStorage.setItem('selected_plan', planType);
        setShowLoginModal(true);
    };

    const handleSignupSuccess = (userId: string) => {
        setShowLoginModal(false);
        // Le plan est déjà sauvegardé dans localStorage
        // L'utilisateur validera son email et sera redirigé vers le dashboard
        // où les modals s'enchaîneront automatiquement
    };

    return (
        <>
            <section className="flex relative flex-col items-center overflow-hidden bg-[#F4F1EE] w-full px-4 max-md:py-10">
                <Image
                    src={'/assets/img/shape-yellow.png'}
                    alt=""
                    width={700}
                    height={700}
                    className="absolute -top-60 -left-60 z-10 rotate-6 max-lg:hidden "
                    aria-hidden="true"
                    loading="lazy"
                />

                <h2 className="font-thunder font-black text-7xl mb-16 text-center lg:mt-20 max-md:text-5xl">
                    Essayer, et commencez aujourd'hui
                </h2>

                <section className="flex flex-col lg:flex-row justify-center gap-8 w-full max-w-7xl">
                    <div className="w-full lg:w-96 flex flex-col justify-between rounded-2xl" style={{
                        background: `conic-gradient(
                            from 195.77deg at 84.44% -1.66%,
                            #FE9736 0deg,
                            #F4664C 76.15deg,
                            #F97E41 197.31deg,
                            #E3AB8D 245.77deg,
                            #FE9736 360deg
                        )`,
                    }}>
                        <div className="space-y-5 px-10 pt-30 pb-0">
                            <h3 className="font-thunder text-white mb-5 text-5xl font-semibold">
                                Essai Gratuit
                            </h3>
                            <p className="font-roboto text-white">
                                1 compte mail et toutes les fonctionnalité accessible dans un temps limité !
                            </p>
                            <CustomButton
                                onClick={() => handleStartClick('free_trial')}
                                className=" animate-fade-in-left-long w-full rounded-full! bg-white px-6 py-3 text-base font-medium text-orange-500! shadow-lg transition-colors hover:bg-white/20 hover:text-white! sm:w-auto sm:px-7 sm:py-3.5 sm:text-lg md:px-8 md:py-4 md:text-xl"
                            >
                                Commencer
                            </CustomButton>
                        </div>
                        <div className="flex justify-end">
                            <img className="w-fit rounded-2xl" src="/img/femme-pack.png" alt="" />
                        </div>
                    </div>

                    <CardPack
                        title="Business Pass"
                        subtitle="Avec code de parainage uniquement"
                        features={[
                            '4 compte mail inclus',
                            'Classification intelligente des emails',
                            'Réponses automatiques personnalisées',
                            'Support prioritaire',
                            'IA avancée personnalisée',
                            'Statistiques détaillées',
                        ]}
                        price="20"
                        priceUnit="/par mois"
                        buttonText="Commencer"
                        enableCounter={true}
                        basePrice={29}
                        additionalPrice={19}
                        localStorageKey="business_pass_email_counter"
                        onButtonClick={() => handleStartClick('business_pass')}
                    />

                    <CardPack
                        topGradient={`radial-gradient(
                            ellipse 90% 90% at 50% 0%,
                            #9F78FF 0%,
                            #815AF3 50%,
                            #D1AAFF 50%,
                            transparent 80%
                        )`}
                        title="Solution sur mesure"
                        subtitle="Avec code de parainage uniquement"
                        features={[
                            'Emails illimités',
                            'Compte illimités',
                            'Support dédié',
                            'Api complète',
                            'Développement sur mesure',
                            'Intégration sur mesure',
                        ]}
                        price="20"
                        priceUnit="/par mois"
                        buttonText="Nous contacter"
                        buttonHref="https://hallia.ai/contact"
                        hidePrice={true}
                    />
                </section>

                <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mt-8 mb-16"
                >
                    <span className="text-sm">Aucun engagement – Abonnement mensuel</span>
                    <HelpCircle className="w-5 h-4" />
                </button>
            </section>

            {/* Modal de connexion/inscription */}
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                onSignupSuccess={handleSignupSuccess}
            />

            {/* Modal Conditions d'abonnement */}
            {showSubscriptionModal && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4"
                    onClick={() => setShowSubscriptionModal(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                               
                                <h2 className="text-2xl font-bold text-gray-900">Conditions d'abonnement</h2>
                            </div>
                            <button
                                onClick={() => setShowSubscriptionModal(false)}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200/50 hover:bg-gray-300 transition-all duration-300 group"
                            >
                                <XCircle className="w-5 h-5 text-black group-hover:scale-110 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <p className="text-base text-gray-700">
                                Nos applications sont disponibles sous forme d'abonnement mensuel ou annuel, selon les conditions ci-dessous.
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">1. Durée et reconduction</h3>
                                    <p className="text-base text-gray-700">
                                        Chaque abonnement, qu'il soit mensuel ou annuel, est conclu pour la durée initialement choisie par le client. À l'issue de cette période, l'abonnement se renouvelle automatiquement par tacite reconduction pour une durée identique, sauf résiliation préalable du client.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">2. Paiement</h3>
                                    <p className="text-base text-gray-700 mb-2">
                                        <strong>Abonnement mensuel :</strong> le montant est facturé et payable d'avance chaque mois.
                                    </p>
                                    <p className="text-base text-gray-700">
                                        <strong>Abonnement annuel :</strong> le montant est facturé et payable d'avance pour une période de 12 mois.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">3. Résiliation</h3>
                                    <p className="text-base text-gray-700 mb-2">
                                        Le client peut demander la résiliation de son abonnement à tout moment.
                                    </p>
                                    <p className="text-base text-gray-700 mb-2">
                                        Pour un abonnement mensuel, la résiliation prend effet à la fin du mois en cours.
                                    </p>
                                    <p className="text-base text-gray-700 mb-2">
                                        Pour un abonnement annuel, la résiliation prend effet à la fin de la période annuelle en cours.
                                    </p>
                                    <p className="text-base text-gray-700">
                                        Aucun remboursement, même partiel, ne sera effectué pour une période déjà commencée, les abonnements étant payables d'avance.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">4. Modalités d'annulation</h3>
                                    <p className="text-base text-gray-700 mb-2">
                                        La demande de résiliation peut être effectuée :
                                    </p>
                                    <ul className="list-disc list-inside text-base text-gray-700 space-y-1 ml-4">
                                        <li>Depuis l'espace client</li>
                                    </ul>
                                    <p className="text-base text-gray-700 mt-2">
                                        Une confirmation de résiliation sera envoyée par email. Pour éviter le renouvellement automatique, la résiliation doit être faite avant la date d'échéance de la période en cours.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">5. Réactivation</h3>
                                    <p className="text-base text-gray-700">
                                        Le client peut réactiver son abonnement à tout moment en souscrivant à nouveau via la plateforme.
                                    </p>
                                </div>
                            </div>
                        </div>

                        
                    </div>
                </div>
            )}
        </>
    );
}