'use client';

import { Mail } from 'lucide-react';

export default function AnimatedCards() {
  return (
    <section className="flex flex-row flex-wrap gap-4 justify-center">
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />
        {/* Zone d'animation des enveloppes - en haut de la carte, au-dessus du "1" et du titre */}
        {/* <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
          <div className="relative h-full w-full overflow-hidden">
            <Mail
              className="envelope-slide-1 absolute h-17 w-17 text-white/90"
              style={{
                top: '25%',
                left: '0',
              }}
            />
            <Mail
              className="envelope-slide-2 absolute h-17 w-17 text-white/90"
              style={{
                top: '25%',
                left: '0',
              }}
            />
            <Mail
              className="envelope-slide-3 absolute h-17 w-17 text-white/90"
              style={{
                top: '25%',
                left: '0',
              }}
            />
          </div>
        </div> */}
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
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />
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
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />
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
      <div className="relative w-full overflow-hidden sm:w-[280px] md:w-[290px]">
        <img
          src="/assets/img/animated-card-bg.png"
          alt="Card background"
          className="h-full w-full object-contain"
        />
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
