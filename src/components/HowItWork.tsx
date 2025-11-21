'use client';

export function HowItWorks() {
  return (
    <div className="mb-6">
      <h2 className="font-roboto mb-5 text-lg font-bold text-gray-900">
        Comment fonctionne HALL MAIL
      </h2>

      <div className="relative">
        <style jsx>{`
          @keyframes dashProgress {
            0% {
              stroke-dashoffset: 1000;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          .dashed-path {
            stroke-dasharray: 8 8;
            stroke-dashoffset: 1000;
            animation: dashProgress 3s ease-out forwards;
          }
          .step-card-1 {
            animation: fadeInUp 0.6s ease-out 0.2s backwards;
          }
          .step-card-2 {
            animation: fadeInUp 0.6s ease-out 0.4s backwards;
          }
          .step-card-3 {
            animation: fadeInUp 0.6s ease-out 0.6s backwards;
          }
          .step-card-4 {
            animation: fadeInUp 0.6s ease-out 0.8s backwards;
          }
          .step-badge {
            animation: pulse 2s ease-in-out infinite;
          }
        `}</style>

        <svg
          className="pointer-events-none absolute top-0 left-0 hidden h-full w-full lg:block"
          style={{ zIndex: 0 }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
        >
          <path
            d="M 12.5 50 L 37.5 50 M 37.5 50 L 62.5 50 M 62.5 50 L 87.5 50"
            stroke="url(#gradient)"
            strokeWidth="2"
            fill="none"
            className="dashed-path"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="33%" stopColor="#22C55E" />
              <stop offset="66%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF6855" />
            </linearGradient>
          </defs>
        </svg>

        <div className="font-roboto relative flex flex-col gap-4" style={{ zIndex: 1 }}>
          {/* Étape 1 */}
          <div className="step-card-1 relative">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10">
                <img src="/assets/icon/arrow-right-alt.png" alt="arrow" />
              </div>
              <div>
                <h3 className="text-md mb-2 text-gray-900">
                  Étape 1 : <span className="font-semibold">Créez votre compte mail</span>
                </h3>
                <p className="text-sm text-[#ABA9A6]">
                  Ajoutez votre adresse e-mail professionnelle pour activer la gestion automatique
                  et la réponse assistée par IA.
                </p>
              </div>
            </div>
          </div>
          <hr />
          {/* Étape 2 */}
          <div className="step-card-1 relative">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10">
                <img src="/assets/icon/arrow-right-alt.png" alt="arrow" />
              </div>
              <div>
                <h3 className="text-md mb-2 text-gray-900">
                  Étape 2 : <span className="font-semibold">Description de votre activité</span>
                </h3>
                <p className="text-sm text-[#ABA9A6]">
                  Décrivez votre entreprise et les services pour adapter les réponses automatiques a
                  votre image
                </p>
              </div>
            </div>
          </div>

          <hr />
          {/* Étape 3 */}
          <div className="step-card-1 relative">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10">
                <img src="/assets/icon/arrow-right-alt.png" alt="arrow" />
              </div>
              <div>
                <h3 className="text-md mb-2 text-gray-900">
                  Étape 3 : <span className="font-semibold">Classification & réponse</span>
                </h3>
                <p className="text-sm text-[#ABA9A6]">
                  Tri automatiques dans les dossiers “Traités”, “Pubs” ou “Infos”, L’IA prépare vos
                  réponses dans les Brouillons
                </p>
              </div>
            </div>
          </div>

          <hr />
          {/* Étape 4 */}
          <div className="step-card-1 relative">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10">
                <img src="/assets/icon/arrow-right-alt.png" alt="arrow" />
              </div>
              <div>
                <h3 className="text-md mb-2 text-gray-900">
                  Étape 4 : <span className="font-semibold">Validation & envoi</span>
                </h3>
                <p className="text-sm text-[#ABA9A6]">
                  Vérifier la réponse proposée et envoyez la depuis les Brouillon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
