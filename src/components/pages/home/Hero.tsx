'use client';

import Image from 'next/image';
import { MacbookScrollSection } from '../../MacbookScroll';
import { useState } from 'react';
import { LoginModal } from '../../LoginModal';
import AnimatedCards from '@/components/AnimatedCards';
import { HelpCircle, User, XCircle } from 'lucide-react';

export default function Hero() {
  const [email, setEmail] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginModalOpen(true);
  };

  return (
    <section className="m-auto max-w-7xl overflow-x-hidden">
      <div
        className="pointer-events-none absolute -top-[100px] left-1/2 z-0 h-[200px] w-[200px] -translate-x-1/2 rounded-full blur-3xl max-sm:hidden md:-top-[200px] md:h-[400px] md:w-[400px] xl:-top-[200px] xl:h-[400px] xl:w-[400px]"
        style={{
          background: `conic-gradient(
          from 195.77deg at 84.44% -1.66%,
          #FE9736 0deg,
          #F4664C 76.15deg,
          #F97E41 197.31deg,
          #E3AB8D 245.77deg,
          #FE9736 360deg`,
        }}
      />
      <div className="pointer-events-none absolute -bottom-160 left-1/2 z-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#F27732] opacity-10 blur-3xl max-sm:hidden md:h-[700px] md:w-[700px] xl:h-[900px] xl:w-[900px]" />

      <section className="mx-auto mt-4 flex min-h-screen w-full max-w-[1600px] items-center gap-12 px-6 pt-32 pb-10 sm:px-4 xl:flex-row xl:justify-between">
        <div className="space-y-12">
          <div className="font-roboto flex items-center gap-2 font-medium">
            <Image src={'assets/svg/hallia-orange-logo.svg'} height={48} width={48} alt="" />
            <p>HALL MAIL</p>
          </div>
          <div className="font-thunder space-y-6 text-7xl font-semibold">
            <div className="space-y-2">
              <h1>Automatisez le traitement de vos emails</h1>
              <span className="bg-gradient-to-b from-[#F35F4F] to-[#FD9A00] bg-clip-text text-transparent">
                avec l’IA
              </span>
            </div>
            <p className="font-roboto max-w-[80%] text-base font-normal">
              Gagnez du temps, boostez votre productivité. L'intelligence artificielle au service de
              votre communication professionnelle.
            </p>
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="mt-8 mb-16 flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
            >
              <span className="font-roboto text-sm">Aucun engagement – Abonnement mensuel</span>
              <HelpCircle className="h-4 w-5" />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col items-center justify-between gap-4 rounded-2xl bg-white p-6 md:flex-row"
          >
            <div className="flex w-full items-center gap-2 rounded-xl border border-[#F4F1EE] px-3 py-2.5 md:w-2/3">
              <User
                fill="none"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                size={18}
              />
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="jean.dupon@gmail.com"
                className="w-full bg-white focus:ring-0 focus:outline-none"
                required
                aria-required="true"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-full bg-linear-to-br from-[#F35F4F] to-[#FFAD5A] px-6 py-2.5 font-semibold whitespace-nowrap text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl md:w-auto"
            >
              Démarrez maintenant
            </button>
          </form>
          <div className="flex items-center gap-6">
            <p className="flex justify-center font-bold">Excellent</p>
            <div className="flex justify-center gap-4">
              {Array.from({ length: 5 }).map((_, index) => {
                return (
                  <div className="bg-[#219653] p-1.5" key={index}>
                    <Image src={'/assets/svg/star.svg'} width={19.6} height={18.55} alt="" />
                  </div>
                );
              })}
            </div>
            <p className="text-center">
              Basé sur <span className="font-semibold underline">456 avis</span>
            </p>
          </div>
        </div>

        <div className="relative hidden xl:block">
          {/* Cercle gradient en arrière-plan */}
          <div className="h-[500px] w-[500px] rounded-t-full bg-gradient-to-br from-[#FF6B5A] via-[#FF8A5A] to-[#FFB75A]" />

          {/* Image de la personne qui dépasse */}
          <Image
            src={'/assets/img/stand-person-1.png'}
            alt="Personne souriante avec tablette"
            height={630}
            width={830}
            className="absolute bottom-0 left-1/2 h-[630px] w-auto -translate-x-1/2 overflow-visible object-cover"
            style={{ width: 'auto' }}
          />

          {/* Logo */}
          <div className="absolute -top-20 right-0 z-10 flex items-center gap-2">
            <Image
              src="/assets/svg/hallia-black-logo.svg"
              alt="Logo HALL-IA"
              width={42}
              height={42}
              loading="lazy"
            />
            <Image
              src="/assets/svg/hallia-letter-picture-logo.svg"
              alt="HALL-IA"
              width={70}
              height={30}
              loading="lazy"
            />
          </div>

          {/* Badge Compatible Gmail */}
          <div className="absolute top-[25%] left-[4%] z-10 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-lg backdrop-blur-sm">
            <Image
              src="/assets/logos/gmail.png"
              alt="Gmail"
              width={28}
              height={28}
              loading="lazy"
            />
            <span className="text-base font-medium text-gray-800">Compatible Gmail</span>
          </div>

          {/* Badge Compatible Outlook */}
          <div className="absolute top-[50%] right-0 z-10 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-lg backdrop-blur-sm">
            <Image
              src="/assets/logos/outlook.png"
              alt="Outlook"
              width={28}
              height={28}
              loading="lazy"
            />
            <span className="text-base font-medium text-gray-800">Compatible Outlook</span>
          </div>

          {/* Badge Compatible SMTP */}
          <div className="absolute bottom-[15%] left-[5%] z-10 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800">
              <span className="text-lg font-bold text-white">@</span>
            </div>
            <span className="text-base font-medium text-gray-800">Compatible SMTP</span>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-[#F4F1EE] to-transparent"
            aria-hidden="true"
          />
        </div>
      </section>

      <section className="md:my-20 flex w-full justify-center px-6">
        <AnimatedCards />
      </section>

      <MacbookScrollSection />

      {/* Modal de connexion/inscription */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialEmail={email}
      />

      {/* Modal Conditions d'abonnement */}
      {showSubscriptionModal && (
        <div
          className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300"
          onClick={() => setShowSubscriptionModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Conditions d'abonnement</h2>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-200/50 transition-all duration-300 hover:bg-gray-300"
              >
                <XCircle className="h-5 w-5 text-black transition-transform duration-300 group-hover:scale-110" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              <p className="text-base text-gray-700">
                Nos applications sont disponibles sous forme d'abonnement mensuel ou annuel, selon
                les conditions ci-dessous.
              </p>

              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">1. Durée et reconduction</h3>
                  <p className="text-base text-gray-700">
                    Chaque abonnement, qu'il soit mensuel ou annuel, est conclu pour la durée
                    initialement choisie par le client. À l'issue de cette période, l'abonnement se
                    renouvelle automatiquement par tacite reconduction pour une durée identique,
                    sauf résiliation préalable du client.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">2. Paiement</h3>
                  <p className="mb-2 text-base text-gray-700">
                    <strong>Abonnement mensuel :</strong> le montant est facturé et payable d'avance
                    chaque mois.
                  </p>
                  <p className="text-base text-gray-700">
                    <strong>Abonnement annuel :</strong> le montant est facturé et payable d'avance
                    pour une période de 12 mois.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">3. Résiliation</h3>
                  <p className="mb-2 text-base text-gray-700">
                    Le client peut demander la résiliation de son abonnement à tout moment.
                  </p>
                  <p className="mb-2 text-base text-gray-700">
                    Pour un abonnement mensuel, la résiliation prend effet à la fin du mois en
                    cours.
                  </p>
                  <p className="mb-2 text-base text-gray-700">
                    Pour un abonnement annuel, la résiliation prend effet à la fin de la période
                    annuelle en cours.
                  </p>
                  <p className="text-base text-gray-700">
                    Aucun remboursement, même partiel, ne sera effectué pour une période déjà
                    commencée, les abonnements étant payables d'avance.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    4. Modalités d'annulation
                  </h3>
                  <p className="mb-2 text-base text-gray-700">
                    La demande de résiliation peut être effectuée :
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-base text-gray-700">
                    <li>Depuis l'espace client</li>
                  </ul>
                  <p className="mt-2 text-base text-gray-700">
                    Une confirmation de résiliation sera envoyée par email. Pour éviter le
                    renouvellement automatique, la résiliation doit être faite avant la date
                    d'échéance de la période en cours.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">5. Réactivation</h3>
                  <p className="text-base text-gray-700">
                    Le client peut réactiver son abonnement à tout moment en souscrivant à nouveau
                    via la plateforme.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
