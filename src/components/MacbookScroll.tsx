import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

export function MacbookScrollSection() {
  const src = 'assets/videos/hallia-hero-video.webm';
  return (
    <div className="w-full overflow-hidden">
      {/* ✅ Conteneur relatif pour positionner les cartes */}
      <div className="relative hidden w-full md:block">
        <MacbookScroll
          badge={
            <Link href="https://hallia.ai" target="_blank">
              <Badge className="-rotate-12" />
            </Link>
          }
          src={src}
          isVideo
        />

        {/* ✅ Carte en haut à droite de l'écran du MacBook */}
        <div className="animate-fade-in absolute z-20 flex w-90 items-center gap-3 rounded-2xl border bg-white/50 px-6 py-3 shadow-lg backdrop-blur-md max-xl:right-[0%] md:top-[30%] xl:top-[10%] xl:right-[5%]">
          <span className="font-roboto text-3xl font-semibold">95%</span>
          <span className="font-roboto">
            <p className="font-semibold">De précision</p>
            <p className="text-sm text-gray-600">
              Gagnez du temps et réduisez le stress. Notre IA suggère des réponses, permettant de
              traiter plus de 60% de vos mails sans modification.
            </p>
          </span>
        </div>

        {/* ✅ Carte en bas à gauche de l'écran du MacBook */}
        <div className="animate-fade-in absolute top-[20%] z-20 flex w-90 items-center gap-3 rounded-2xl border bg-white/50 px-6 py-3 shadow-lg backdrop-blur-md md:top-[30%] lg:left-[0%] xl:left-[5%]">
          <span className="font-roboto text-3xl font-semibold">98%</span>
          <span className="font-roboto">
            <p className="font-semibold">De précision</p>
            <p className="text-sm text-gray-600">
              Nos modèles d'IA uniques atteignent jusqu'à 98% de précision dans la classification
              des emails entrants.
            </p>
          </span>
        </div>
      </div>

      {/* Video Mobile */}
      <div className="mx-auto mt-15 mb-20 h-full w-[90%] rounded-xl border shadow-2xl md:hidden">
        <div
          className={cn(
            'h-full w-full transform-gpu filter-[blur(120px)]',
            'bg-[linear-gradient(to_bottom,#ffffff,transparent_30%)]',
          )}
        />
        <video autoPlay loop muted playsInline src={src} className="h-auto w-full rounded-xl" />
      </div>
    </div>
  );
}

// Peerlist logo
const Badge = ({ className }: { className?: string }) => {
  return (
    <Image
      src="/assets/logos/logo-hallia.png"
      alt="Hallia Logo"
      height={30}
      width={30}
      className={cn(className)}
    />
  );
};
