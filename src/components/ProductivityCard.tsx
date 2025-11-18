'use client';

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { Brain, Lightbulb, TrendingUp, List, Lock, Flame } from "lucide-react";

interface ProductivityElementProps {
    title: string;
    // subtitle: string;
    paragraph: string;
}

const productivityElement: ProductivityElementProps[] = [
    {
        title: "Automatisation intelligente",
        paragraph: "L’IA analyse le message reçu et étudie le contexte. Elle détermine si une réponse et nécessaire."
    },
    {
        
        title: "Personnalisation avancée",
        paragraph: "Chaque message s'ajuste à votre style — professionnel ou informel. L'IA reste authentique, alignée à votre image."
    },
    {
        
        title: "Productivité maximale",
        paragraph: "Laissez l’IA gérer les emails courants pendant que vous traitez l’essentiel. Optimisez vos priorités en un clic."
    },
    {
        
        title: "Classification intelligente",
        paragraph: "Emails triés instantanément (INFO, TRAITÉ, PUB) avec 98 % de précision. Concentrez-vous sur les messages clés"
    },
    {
        
        title: "Contrôle total",
        paragraph: "Gardez la main : chaque réponse est proposée, jamais envoyée sans votre validation. Ajustez, validez, envoyez."
    },
    {
        
        title: "Déploiement instantané",
        paragraph: "Connectez simplement votre boîte mail : tout est prêt en quelques minutes, sans aucune configuration technique."
    },
];

const productivityIcons = [
    Brain,
    Lightbulb,
    TrendingUp,
    List,
    Lock,
    Flame,
];

export function ProductivityCard() {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => {
            if (cardRef.current) observer.unobserve(cardRef.current);
        };
    }, []);

    return (
      <section
        ref={cardRef}
        className={` w-full py-20 transition-all duration-700 ${
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
          <h3 className="font-thunder text-center text-6xl! font-semibold text-white sm:text-3xl p-10 pb-20" itemProp="headline">
          Pourquoi choisir cette solution ?
         </h3>
         
        <Container>
        {/* Padding pour xs à md */}
        <div className="px-6 md:px-0">
          {/* Conteneur avec grille complète et dividers verticaux qui traversent */}
          <div className="relative">
            {/* Dividers verticaux qui traversent toute la hauteur (desktop only) */}
            <div className="hidden lg:block absolute left-1/3 top-0 bottom-0 w-[1px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />
            <div className="hidden lg:block absolute left-2/3 top-0 bottom-0 w-[1px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />

            {/* Divider vertical tablette (md) au milieu */}
            <div className="hidden md:block lg:hidden absolute left-1/2 top-0 bottom-0 w-[1px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 10%, #FFFFFF 90%, rgba(255, 255, 255, 0) 100%)',
              }}
            />

            {/* Vue Mobile (xs-sm) : 1 colonne avec dividers entre chaque */}
            <div className="md:hidden space-y-0" itemProp="text">
              {productivityElement.map((element, index) => {
                const IconComponent = productivityIcons[index];
                return (
                  <div key={index}>
                    <div className="flex flex-col gap-3">
                      {IconComponent && (
                        <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="font-roboto font-semibold text-white">
                        <h4 className="mb-1 text-lg">{element.title}</h4>
                        <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                      </div>
                    </div>
                    {index < 5 && (
                      <div
                        className="my-6 h-[1px]"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vue Tablette (md) : 2 colonnes, 3 lignes avec dividers horizontaux */}
            <div className="hidden md:block lg:hidden px-10" itemProp="text">
              {/* Ligne 1 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {productivityElement.slice(0, 2).map((element, index) => {
                  const IconComponent = productivityIcons[index];
                  return (
                    <div key={index}>
                      <div className="flex flex-col gap-3">
                        {IconComponent && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="font-roboto font-semibold text-white">
                          <h4 className="mb-1 text-lg">{element.title}</h4>
                          <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="h-[1px] my-6"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {productivityElement.slice(2, 4).map((element, index) => {
                  const IconComponent = productivityIcons[index + 2];
                  return (
                    <div key={index + 2}>
                      <div className="flex flex-col gap-3">
                        {IconComponent && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="font-roboto font-semibold text-white">
                          <h4 className="mb-1 text-lg">{element.title}</h4>
                          <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="h-[1px] my-6"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 3 */}
              <div className="grid grid-cols-2 gap-6">
                {productivityElement.slice(4, 6).map((element, index) => {
                  const IconComponent = productivityIcons[index + 4];
                  return (
                    <div key={index + 4}>
                      <div className="flex flex-col gap-3">
                        {IconComponent && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="font-roboto font-semibold text-white">
                          <h4 className="mb-1 text-lg">{element.title}</h4>
                          <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vue Desktop (lg+) : 3 colonnes, 2 lignes avec divider au milieu */}
            <div className="hidden lg:block py-20" itemProp="text">
              {/* Ligne 1 */}
              <div className="grid grid-cols-3 gap-6 mb-6 pb-10">
                {productivityElement.slice(0, 3).map((element, index) => {
                  const IconComponent = productivityIcons[index];
                  return (
                    <div key={index} className={index === 1 ? 'px-6' : ''}>
                      <div className="flex flex-col gap-3">
                        {IconComponent && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="font-roboto font-semibold text-white">
                          <h4 className="mb-1 text-3xl font-black">{element.title}</h4>
                          <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="h-[1px] my-6"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 25%, #FFFFFF 75%, rgba(255, 255, 255, 0) 100%)',
                }}
              />

              {/* Ligne 2 */}
              <div className="grid grid-cols-3 gap-6">
                {productivityElement.slice(3, 6).map((element, index) => {
                  const IconComponent = productivityIcons[index + 3];
                  return (
                    <div key={index + 3} className={index === 1 ? 'px-6' : ''}>
                      <div className="flex flex-col gap-3">
                        {IconComponent && (
                          <div className="w-12 h-12 rounded-lg border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="font-roboto font-semibold text-white">
                          <h4 className="mb-1 text-3xl font-black">{element.title}</h4>
                          <p className="text-base font-normal opacity-90">{element.paragraph}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </Container>
      </section>
    );
}
