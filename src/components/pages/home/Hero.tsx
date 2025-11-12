'use client';

import Image from 'next/image';
import { MacbookScrollSection } from '../../MacbookScroll';
import { useState } from 'react';
import { LoginModal } from '../../LoginModal';

export default function Hero() {
  const [email, setEmail] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginModalOpen(true);
  };

  return (
    <section className="overflow-x-hidden">

      <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 z-0 h-[200px] w-[200px] rounded-full blur-3xl pointer-events-none
md:-top-[200px] md:h-[400px] md:w-[400px] xl:-top-[200px] xl:h-[400px] xl:w-[400px]" style={{background:  `conic-gradient(
  from 195.77deg at 84.44% -1.66%,
  #FE9736 0deg,
  #F4664C 76.15deg,
  #F97E41 197.31deg,
  #E3AB8D 245.77deg,
  #FE9736 360deg`}} />

<div className="absolute -bottom-160 left-1/2 -translate-x-1/2 z-0 h-[500px] w-[500px] rounded-full opacity-10 bg-[#F27732] blur-3xl pointer-events-none
md:h-[700px] md:w-[700px] xl:h-[900px] xl:w-[900px]" />


      <section className="mx-auto mt-4 flex min-h-screen w-full max-w-[1600px] items-center gap-12 px-6 pt-32 pb-16 sm:px-4 xl:flex-row xl:justify-between">
        <div className="space-y-12">
          <div className="flex items-center gap-2">
            <Image src={'assets/svg/hallia-orange-logo.svg'} height={48} width={48} alt="" />
            <p>Automatisation IA</p>
          </div>
          <div className="font-thunder space-y-6 text-7xl font-semibold">
            <div className="space-y-2">
              <h1>Automatisez vos emails</h1>
              <span className="bg-gradient-to-b from-[#F35F4F] to-[#FD9A00] bg-clip-text text-transparent">
                avec l’IA
              </span>
            </div>
            <p className="font-roboto max-w-[80%] text-base font-normal">
              Gagnez du temps, boostez votre productivité. L'intelligence artificielle au service de
              votre communication professionnelle.
            </p>
            <p className="font-roboto text-base text-[#333231]">
              Aucun engagement – Abonnement mensuel
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full flex-col items-center justify-between gap-4 rounded-2xl bg-white p-6 md:flex-row">
            <div className="flex w-full items-center gap-2 rounded-xl border border-[#F4F1EE] px-3 py-2.5 md:w-2/3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Jean.dupon@gmail.com"
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
              className="group relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#F35F4F] to-[#FFAD5A] px-4 py-2.5 font-medium text-nowrap text-white shadow-xl transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50 md:w-1/3"
            >
              <span className="relative z-10 translate-x-6 transition-transform duration-300 group-hover:-translate-x-0">
                Démarrez maintenant
                </span>
              <svg
                className={`relative z-10 h-8 w-8 -translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span
                className="absolute inset-0 -translate-x-full transform bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-500 group-hover:translate-x-full group-hover:opacity-20"
                style={{ transitionDuration: '600ms' }}
                aria-hidden="true"
              />
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
          <div className="absolute -top-45 right-0 z-10 flex items-center gap-2">
            <img
              src="/assets/svg/hallia-black-logo.svg"
              alt="Logo HALL-IA"
              width={42}
              height={42}
              loading="lazy"
            />
            <img
              src="/assets/svg/hallia-letter-picture-logo.svg"
              alt="HALL-IA"
              width={70}
              height={30}
              loading="lazy"
            />
          </div>

          {/* Badge Compatible Gmail */}
          <div className="absolute top-[25%] left-[4%] z-10 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-lg backdrop-blur-sm">
            <img src="/assets/logos/gmail.png" alt="Gmail" width={28} height={28} loading="lazy" />
            <span className="text-base font-medium text-gray-800">Compatible Gmail</span>
          </div>

          {/* Badge Compatible Outlook */}
          <div className="absolute top-[50%] right-0 z-10 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-lg backdrop-blur-sm">
            <img
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
            className="absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-[#F9F7F5] to-transparent"
            aria-hidden="true"
          />
        </div>



      </section>

      <MacbookScrollSection />
      
      {/* Modal de connexion/inscription */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        initialEmail={email}
      />
    </section>
  );
}
