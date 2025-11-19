import AppPack from '@/components/pages/home/AppPack';
import CTASection from '@/components/pages/home/CTASection';
import { FaqSection } from '@/components/pages/home/FaqSection';
import Hero from '@/components/pages/home/Hero';
import HowItWorkSection from '@/components/pages/home/HowItWorkSection';
import ProductivitySection from '@/components/pages/home/ProductivitySection';
import TestimonialSection from '@/components/pages/home/TestimonialSection';

export default function Accueil() {
  return (
    <section className="space-y-30 overflow-x-hidden">
      <Hero />
      <section id="etapes">
        <HowItWorkSection />
      </section>
      <section>
        <section id="avantages">
          <ProductivitySection />
        </section>
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
