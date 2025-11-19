'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { BriefcaseBusiness, ChartLine, Check, Lightbulb, Minimize, Paperclip } from 'lucide-react';

interface ConcreteAdvantageElementProps {
  icon?: ReactNode;
  title: string;
  paragraph: string;
}

const concreteAdvantageElement: ConcreteAdvantageElementProps[] = [
  {
    icon: <ChartLine />,
    title: 'Pour entrepreneurs',
    paragraph:
      "Économisez jusqu'à 10 heures par semaine en automatisant vos réponses clients. Maintenez une communication professionnelle et cohérente même pendant vos périodes les plus chargées.",
  },
  {
    icon: <BriefcaseBusiness />,
    title: 'Pour commerciaux',
    paragraph:
      'Augmentez votre taux de réponse de 95% en identifiant instantanément les prospects chauds. Ne laissez plus jamais une opportunité se perdre dans votre boîte de réception.',
  },
  {
    icon: <Paperclip />,
    title: 'Pour managers',
    paragraph:
      "Réduisez le temps de gestion des emails de votre équipe de 60%. Boostez leur productivité en les libérant des tâches répétitives pour qu'ils se concentrent sur les priorités stratégiques.",
  },
  {
    icon: <Minimize />,
    title: 'Classification ultra-précise',
    paragraph:
      'Atteignez 98% de précision dans le tri automatique de vos emails. INFO, TRAITE, PUB : chaque message trouve sa place sans aucune intervention manuelle.',
  },
  {
    icon: <Lightbulb />,
    title: 'Adaptation à votre style',
    paragraph:
      "L'IA apprend continuellement de vos préférences et reproduit fidèlement votre ton, qu'il soit formel, amical ou technique. Vos correspondants ne verront aucune différence.",
  },
  {
    icon: <Check />,
    title: 'Sécurité et contrôle',
    paragraph:
      "Zéro risque : 100% des réponses restent en brouillon jusqu'à votre validation. Vous gardez le contrôle total tout en gagnant un temps précieux sur la rédaction.",
  },
];

export function ConcreteAdvantagesCard() {
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
      className={`w-full bg-[#F4F1EE] py-30 transition-all duration-700 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      itemScope
      itemType="https://schema.org/CreativeWork"
      aria-label="Les avantages concrets de HALL-IA"
    >
      <h3
        className="font-thunder p-10 pb-20 text-center text-6xl! font-semibold text-black sm:text-3xl"
        itemProp="headline"
      >
        Les avantages concrets
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
                  'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 10%, #D1D5DB 90%, rgba(0, 0, 0, 0) 100%)',
              }}
            />
            <div
              className="absolute top-0 bottom-0 left-2/3 hidden w-px lg:block"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 10%, #D1D5DB 90%, rgba(0, 0, 0, 0) 100%)',
              }}
            />

            {/* Divider vertical tablette (md) au milieu */}
            <div
              className="absolute top-0 bottom-0 left-[49%] hidden w-px md:block lg:hidden"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 10%, #D1D5DB 90%, rgba(0, 0, 0, 0) 100%)',
              }}
            />

            {/* Vue Mobile (xs-sm) : 1 colonne avec dividers entre chaque */}
            <div className="md:hidden" itemProp="text">
              {concreteAdvantageElement.map((element, index) => (
                <div key={index}>
                  <div className="flex flex-col gap-4">
                    {element.icon && (
                      <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                        {element.icon}
                      </div>
                    )}
                    <div className="font-roboto space-y-4 font-semibold text-black">
                      <h4 className="text-2xl">{element.title}</h4>
                      <p className="font-normal text-gray-700">{element.paragraph}</p>
                    </div>
                  </div>
                  {index < 5 && (
                    <div
                      className="my-6 h-px"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 25%, #D1D5DB 75%, rgba(0, 0, 0, 0) 100%)',
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
                {concreteAdvantageElement.slice(0, 2).map((element, index) => (
                  <div key={index}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-black">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal text-gray-700">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 25%, #D1D5DB 75%, rgba(0, 0, 0, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                {concreteAdvantageElement.slice(2, 4).map((element, index) => (
                  <div key={index + 2}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-black">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal text-gray-700">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 25%, #D1D5DB 75%, rgba(0, 0, 0, 0) 100%)',
                }}
              />

              {/* Ligne 3 */}
              <div className="grid grid-cols-2 gap-6">
                {concreteAdvantageElement.slice(4, 6).map((element, index) => (
                  <div key={index + 4}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-black">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal text-gray-700">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vue Desktop (lg+) : 3 colonnes, 2 lignes avec divider au milieu */}
            <div className="hidden lg:block" itemProp="text">
              {/* Ligne 1 */}
              <div className="grid grid-cols-3 gap-6">
                {concreteAdvantageElement.slice(0, 3).map((element, index) => (
                  <div key={index} className={cn(index === 2 && 'pl-3')}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-black">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal text-gray-700">{element.paragraph}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="my-6 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, #D1D5DB 25%, #D1D5DB 75%, rgba(0, 0, 0, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="grid grid-cols-3 gap-6">
                {concreteAdvantageElement.slice(3, 6).map((element, index) => (
                  <div key={index + 3} className={cn(index === 2 && 'pl-3')}>
                    <div className="flex flex-col gap-6 p-3">
                      {element.icon && (
                        <div className="w-fit shrink-0 rounded-md border border-gray-700 bg-gray-300 p-2 text-gray-700">
                          {element.icon}
                        </div>
                      )}
                      <div className="font-roboto space-y-6 font-semibold text-black">
                        <h4 className="text-2xl">{element.title}</h4>
                        <p className="font-normal text-gray-700">{element.paragraph}</p>
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
