'use client';

import Image from "next/image";
import CustomButton from "../../CustomButton";
import CardPack from "../../CardPack";
import { useState } from "react";
import { LoginModal } from "../../LoginModal";
import { useRouter } from "next/navigation";

export default function AppPack() {
    const router = useRouter();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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
            <section className="flex relative flex-col items-center overflow-hidden bg-[#F4F1EE] w-full px-4">
                <Image
                    src={'/assets/img/shape-yellow.png'}
                    alt=""
                    width={700}
                    height={700}
                    className="absolute -top-60 -left-60 z-10 rotate-6 max-lg:hidden "
                    aria-hidden="true"
                    loading="lazy"
                />

                <h2 className="font-thunder font-black text-7xl mb-16 text-center lg:mt-10">
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
                        buttonText="Commencer"
                        onButtonClick={() => handleStartClick('custom_solution')}
                    />
                </section>
            </section>

            {/* Modal de connexion/inscription */}
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                onSignupSuccess={handleSignupSuccess}
            />
        </>
    );
}