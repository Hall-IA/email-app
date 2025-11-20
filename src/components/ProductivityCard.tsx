'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronsUp, Flame, Lightbulb, ListChecks, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProductivityElementProps {
  icon?: ReactNode;
  title: string;
  paragraph: string;
}

const productivityElement: ProductivityElementProps[] = [
  {
    icon: <Brain className="text-silverchalice-50" />,
    title: 'Automatisation intelligente',
    paragraph:
      'L’IA analyse  le message reçu et étudie le contexte. Elle détermine si une réponse et nécessaire.',
  },
  {
    icon: <Lightbulb className="text-silverchalice-50" />,
    title: 'Personnalisation avancée',
    paragraph:
      'Chaque message s’ajuste à votre style — professionnel ou informel. L’IA reste authentique, alignée à votre image.',
  },
  {
    icon: <ChevronsUp className="text-silverchalice-50" />,
    title: 'Productivité maximale',
    paragraph:
      'Laissez l’IA gérer les emails courants pendant que vous traitez l’essentiel. Optimisez vos priorités en un clic.',
  },
  {
    icon: <ListChecks className="text-silverchalice-50" />,
    title: 'Classification intelligente',
    paragraph:
      'Emails triés instantanément (INFO, TRAITÉ, PUB) avec 98 % de précision. Concentrez-vous sur les messages clés.',
  },
  {
    icon: <LockKeyhole className="text-silverchalice-50" />,
    title: 'Contrôle total',
    paragraph:
      'Gardez la main : chaque réponse est proposée, jamais envoyée sans votre validation. Ajustez, validez, envoyez.',
  },
  {
    icon: <Flame className="text-silverchalice-50" />,
    title: 'Déploiement instantané',
    paragraph:
      'Connectez simplement votre boîte mail : tout est prêt en quelques minutes, sans aucune configuration technique.',
  },
];

export function ProductivityCard() {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  return (
    <section
      ref={cardRef}
      className={`w-full py-30 transition-all duration-700 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{
        background: `conic-gradient(
          from 195.77deg at 84.44% -1.66%,
          #FE9736 0deg,
          #F4664C 76.15deg,
          #F97E41 197.31deg,
          #E3AB8D 245.77deg,
          #FE9736 360deg
        )`,
      }}
      itemScope
      itemType="https://schema.org/CreativeWork"
      aria-label="Résumé des bénéfices de productivité avec HALL-IA"
    >
      <h3
        className="font-thunder p-10 pb-20 text-center text-6xl! font-semibold text-white sm:text-3xl"
        itemProp="headline"
      >
        Pourquoi choisir cette solution ?
      </h3>

      <section className="mx-auto max-w-7xl">
        {/* Padding pour xs à md */}
        <div className="px-6 lg:px-0">
          {/* Conteneur avec grille complète et dividers verticaux qui traversent */}
          <div className="relative">
            {/* Dividers verticaux qui traversent toute la hauteur (desktop only) */}
            <div
              className="absolute top-0 bottom-0 left-1/3 hidden w-px lg:block"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />
            <div
              className="absolute top-0 bottom-0 left-2/3 hidden w-px lg:block"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />

            {/* Divider vertical tablette (md) au milieu */}
            <div
              className="absolute top-0 bottom-0 left-[49%] hidden w-px md:block lg:hidden"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />

            {/* Vue Mobile (xs-sm) : 1 colonne avec dividers entre chaque */}
            <div className="md:hidden" itemProp="text">
              {productivityElement.map((element, index) => (
                <div key={index}>
                  <div className="flex flex-col gap-4">
                    {element.icon && (
                      <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                        {element.icon}
                      </div>
                    )}
                    <div className="font-roboto space-y-4 font-semibold text-white">
                      <h4 className="text-2xl">{element.title}</h4>
                      <p className="font-normal opacity-90">{element.paragraph}</p>
                    </div>
                  </div>
                  {index < 5 && (
                    <div
                      className="my-6 h-px"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Vue Tablette (md) : 2 colonnes, 3 lignes avec dividers horizontaux */}
            <div className="hidden md:block lg:hidden" itemProp="text">
              {/* Ligne 1 */}
              <div className="grid grid-cols-2 gap-6">
                {productivityElement.slice(0, 2).map((element, index) => (
                  <div key={index}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-white">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                {productivityElement.slice(2, 4).map((element, index) => (
                  <div key={index + 2}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-white">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 3 */}
              <div className="grid grid-cols-2 gap-6">
                {productivityElement.slice(4, 6).map((element, index) => (
                  <div key={index + 4}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-white">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vue Desktop (lg+) : 3 colonnes, 2 lignes avec divider au milieu */}
            <div className="hidden lg:block" itemProp="text">
              <style jsx>{`
                .card-gradient-hover {
                  position: relative;
                }

                .card-gradient-hover::before {
                  content: '';
                  position: absolute;
                  inset: 0;
                  opacity: 0;
                  transition: opacity 0.2s ease-in-out;
                  pointer-events: none;
                }

                .card-gradient-hover:hover::before {
                  opacity: 1;
                }

                .gradient-tl::before {
                  background: linear-gradient(
                    to top left,
                    transparent 55%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-top: -25px;
                  margin-left: -15px;
                }

                .gradient-t::before {
                  background: linear-gradient(
                    to top,
                    transparent 52%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-top: -20px;
                  /* Ajoute un léger scale pour "boucher" les padding sur les côtés */
                  transform: scale(1.04);
                }

                .gradient-tr::before {
                  background: linear-gradient(
                    to top right,
                    transparent 52%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-top: -25px;
                  margin-right: -16px;
                }

                .gradient-bl::before {
                  background: linear-gradient(
                    to bottom left,
                    transparent 52%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-bottom: -25px;
                  margin-left: -15px;
                }

                .gradient-b::before {
                  background: linear-gradient(
                    to bottom,
                    transparent 52%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-bottom: -20px;
                  /* Ajoute un léger scale pour "boucher" les padding sur les côtés */
                  transform: scale(1.04);
                }

                .gradient-br::before {
                  background: linear-gradient(
                    to bottom right,
                    transparent 52%,
                    rgba(255, 255, 255, 0.4) 90%
                  );
                  margin-bottom: -25px;
                  margin-right: -16px;
                }
              `}</style>
              {/* Ligne 1 */}
              <div className="grid grid-cols-3 gap-6">
                {productivityElement.slice(0, 3).map((element, index) => (
                  <div
                    key={index}
                    className={cn(
                      'card-gradient-hover',
                      index === 0 && 'gradient-br',
                      index === 1 && 'gradient-b',
                      index === 2 && 'gradient-bl pl-3',
                    )}
                  >
                    <div className="relative z-10 flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-white">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="grid grid-cols-3 gap-6">
                {productivityElement.slice(3, 6).map((element, index) => (
                  <div
                    key={index + 3}
                    className={cn(
                      'card-gradient-hover',
                      index === 0 && 'gradient-tr',
                      index === 1 && 'gradient-t',
                      index === 2 && 'gradient-tl pl-3',
                    )}
                  >
                    <div className="relative z-10 flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-[#FEFDFDA3]/64 bg-[#FEFDFDA3]/16 p-2 text-white">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-white">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
