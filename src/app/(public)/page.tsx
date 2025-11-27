'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HowItWorkSection, { ListItem } from '@/components/HowItWorkSection';
import AppPack from '@/components/pages/home/AppPack';
import CTASection from '@/components/pages/home/CTASection';
import { FaqSection } from '@/components/pages/home/FaqSection';
import Hero from '@/components/pages/home/Hero';
import ProductivitySection from '@/components/pages/home/ProductivitySection';
import TestimonialSection from '@/components/pages/home/TestimonialSection';

const sampleVideoItems: ListItem[] = [
  {
    id: '1',
    title: 'Réception Email',
    description: 'Nouvel email dans votre boite',
    videoUrl: '/assets/img/reception-email-item1.png',
    alt: "Interface de tri automatique d'emails par IA - Gestion intelligente de boîte mail professionnelle",
    keywords: [
      'tri emails automatique',
      'gestion boîte mail IA',
      'filtrage emails intelligent',
      'automatisation messagerie',
      'productivité email',
    ],
    category: 'Communication et Messagerie',
  },
  {
    id: '2',
    title: 'Analyse & Classification',
    description: 'Scan du contenu, expéditeur, context et tri automatique des emails.',
    videoUrl: '/assets/img/analyse-classification-item2.png',
    alt: "Image de l'analyse et classification des emails",
    keywords: [
      'analyse email IA',
      'classification email IA',
      'scan email IA',
      'tri email IA',
      'context email IA',
      'expéditeur email IA',
      'automatisation email IA',
      'productivité email IA',
      'gestion email IA',
    ],
    category: 'Automatisation et Productivité',
  },
  {
    id: '3',
    title: 'Génération de réponse',
    description: "Création d'un brouillon personnalisé et adapté.",
    videoUrl: '/assets/img/generation-reponse-item3.png',
    alt: 'Outil IA de transcription de réunions - Résumé automatique et compte-rendu intelligent',
    keywords: [
      'génération de réponse email IA',
      'brouillon email IA',
      'personnalisation email IA',
      'adaptation email IA',
      'automatisation email IA',
      'productivité email IA',
      'gestion email IA',
    ],
    category: 'Productivité et Collaboration',
  },

  {
    id: '4',
    title: 'Validation Humaine',
    description: "Vous validez ou modifiez avant l'envoi.",
    videoUrl: '/assets/img/validation-email.png',
    alt: 'Système automatisé de gestion de factures - Création, relance et suivi comptable par IA',
    keywords: [
      'validation email IA',
      'modification email IA',
      'envoi email IA',
      'automatisation email IA',
      'productivité email IA',
      'gestion email IA',
    ],
    category: 'Communication et Messagerie',
  },
];

export default function Accueil() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    // Vérifier si on doit ouvrir la popup de connexion
    const login = searchParams.get('login');
    const verified = searchParams.get('verified');

    if (login === 'true') {
      console.log('[Accueil] Paramètre login détecté, ouverture de la popup de connexion');
      
      // Afficher un message si l'email a été vérifié
      if (verified === 'true') {
        console.log('[Accueil] Email vérifié avec succès');
      }

      // Déclencher l'ouverture de la popup de connexion
      // On utilise un événement personnalisé que le Header peut écouter
      setTimeout(() => {
        const event = new CustomEvent('openLoginModal');
        window.dispatchEvent(event);
        
        // Nettoyer l'URL
        router.replace('/');
      }, 500);
    }
  }, [searchParams, router]);

  return (
    <section className="space-y-30 overflow-x-hidden">
      <Hero />
      <section id="etapes" className="lg:mb-90">
        <HowItWorkSection items={sampleVideoItems} brandColor="#F27732" />
      </section>
      <section>
        <ProductivitySection />
        <section id="prix">
          <AppPack />
        </section>
        <TestimonialSection />
        <FaqSection />
        <CTASection />
      </section>
    </section>
  );
}
