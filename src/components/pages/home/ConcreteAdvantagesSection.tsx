'use client';

import { ConcreteAdvantagesCard } from '@/components/ConcreteAdvantagesCard';

export default function ConcreteAdvantagesSection() {
  return (
    <section
      className="flex w-full flex-col items-center"
      aria-labelledby="concrete-advantages-section-heading"
      itemScope
      itemType="https://schema.org/CreativeWork"
    >
      <ConcreteAdvantagesCard />
    </section>
  );
}

