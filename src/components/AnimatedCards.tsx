'use client';

import { Mail, Check, CheckCircle, Info, X, Brain, Pencil } from 'lucide-react';

export default function AnimatedCards() {
  return (
    <section className="flex flex-row flex-wrap justify-center gap-4">
      {/* Élément 1 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Enveloppes en haut */}
        <div className="absolute top-15 right-0 left-0 flex items-center justify-center gap-3 px-6">
          {/* Barre de progression */}
          <div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-white/30" />

          {/* Enveloppe 1 */}
          <div className="relative z-10">
            <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
              <Mail className="h-7 w-7 text-gray-400" strokeWidth={2} />
            </div>
          </div>

          {/* Enveloppe 2 */}
          <div className="relative z-10">
            <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
              <Mail className="h-7 w-7 text-gray-400" strokeWidth={2} />
            </div>
          </div>

          {/* Enveloppe 3 orange avec coche */}
          <div className="relative z-10">
            <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <Mail className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md">
              <Check className="h-2 w-2 text-white" strokeWidth={4} />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                1
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Analyse d'email par l'IA
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 2 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Enveloppes avec catégories */}
        <div className="absolute top-8 right-0 left-0 ps-4">
          <div className="absolute top-14 right-40 left-0 h-0.5 -translate-y-1/2 bg-white/30" />
          <div className="relative flex items-center justify-between">
            {/* Groupe d'enveloppes à gauche */}
            <div className="flex gap-3">
              {/* Enveloppe 1 */}
              <div className="relative z-10">
                <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                  <Mail className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md">
                  <Check className="h-2 w-2 text-white" strokeWidth={4} />
                </div>
              </div>

              {/* Enveloppe 2 */}
              <div className="relative z-10">
                <div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                  <Mail className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-md">
                  <Check className="h-2 w-2 text-white" strokeWidth={4} />
                </div>
              </div>
            </div>

            {/* Badges à droite */}
            <div className="flex w-full flex-col gap-3.5 justify-end ml-[52px]">
              {/* Badge Traité */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-green-500 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-md">
                <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Traité</span>
              </div>

              {/* Badge Info */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-blue-500 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-md">
                <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Info</span>
              </div>

              {/* Badge Pub */}
              <div className="flex items-center gap-1.5 rounded-l-md bg-red-500 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-md">
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Pub</span>
              </div>
            </div>

            {/* Lignes diagonales de connexion */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ zIndex: 1 }}
            >
              {/* Ligne vers Traité */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="25%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Ligne vers Info */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="50%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Ligne vers Pub */}
              <line
                x1="40%"
                y1="50%"
                x2="70%"
                y2="75%"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                2
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Tri de l'email par catégories
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 3 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Carte IA avec cerveau et logo */}
        <div className="absolute top-8 left-1/2 flex -translate-x-1/2 items-center justify-center px-4">
          <div className="flex items-center gap-4 rounded-2xl border-2 border-white/40 bg-white/15 px-10 py-5 shadow-xl backdrop-blur-sm">
            {/* Icône Cerveau */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-lg">
              <Brain className="h-9 w-9 text-orange-500" strokeWidth={2} />
            </div>

            {/* Séparateur */}
            <div className="h-14 w-px bg-white/50" />

            {/* Logo IA stylisé */}
            <div className="flex items-center text-white">
              <span
                className="text-4xl font-black tracking-wide"
                style={{ fontFamily: 'monospace' }}
              >
                IA
              </span>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                3
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Réflexion IA autonome
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Élément 4 */}
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />

        {/* Champ Brouillons et Crayon */}
        <div className="absolute top-15 left-1/2 flex -translate-x-1/2 items-center gap-3">
          {/* Champ Brouillons */}
          <div className="rounded-lg bg-white px-8 py-3 shadow-lg">
            <span className="text-lg font-semibold text-gray-800">Brouillons</span>
          </div>

          {/* Icône Crayon dans un carré noir */}
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 shadow-lg">
            <Pencil className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="-mb-5 flex w-full items-end gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span
                className="font-roboto -mb-3 -ml-3 text-center text-[138px] leading-none font-black"
                style={{
                  background:
                    'linear-gradient(180deg, #FEFDFD 48.52%, rgba(254, 253, 253, 0.00) 79.01%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                4
              </span>
              <h2
                className="text-2xl leading-[30px] font-bold"
                style={{
                  color: 'var(--neoncarrot-50, #FFFEFD)',
                  fontFamily: 'var(--body-family, Roboto)',
                }}
              >
                Réponse adaptée générée
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
