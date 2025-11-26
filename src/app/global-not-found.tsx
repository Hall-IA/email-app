'use client';

import '../styles/globals.css';
import localFont from 'next/font/local';
import { Roboto, Inter } from 'next/font/google';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const thunder = localFont({
  src: [
    {
      path: './(fonts)/thunder-lc.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './(fonts)/thunder-mediumlc.ttf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-thunder',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-roboto',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export default function GlobalNotFound() {
  const router = useRouter();

  return (
    <html lang="fr" className={`${thunder.variable} ${roboto.variable} ${inter.variable}`}>
      <body className="bg-background antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            {/* Animation d'enveloppe perdue */}
            <div className="relative mb-12 inline-block">
              <div className="animate-fade-in-down-long">
                <svg
                  className="text-silverchalice-400 h-32 w-32 drop-shadow-lg sm:h-40 sm:w-40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <div className="absolute -top-2 -right-2 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-orange-500 text-2xl shadow-lg">
                  ?
                </div>
              </div>
            </div>

            {/* Code 404 */}
            <div className="animate-fade-in-up-long mb-6">
              <h1
                className="font-thunder text-8xl font-bold tracking-tight text-gray-900 sm:text-9xl"
                style={{
                  textShadow: '2px 2px 0px rgba(242, 119, 50, 0.2)',
                }}
              >
                404
              </h1>
            </div>

            {/* Message principal */}
            <div className="animate-fade-in-up mb-4 space-y-3">
              <h2 className="font-thunder text-3xl font-semibold text-gray-900 sm:text-4xl">
                Email introuvable
              </h2>
              <p className="font-inter text-silverchalice-600 text-lg sm:text-xl">
                Oups ! Cette page semble s&apos;être perdue dans la boîte de spam.
              </p>
              <p className="font-inter text-silverchalice-500 text-base">
                La page que vous recherchez n&apos;existe pas ou a été déplacée.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="animate-fade-in-up mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.back()}
                className="group font-inter relative inline-flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
              >
                <svg
                  className="h-5 w-5 transition-transform group-hover:-translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>Retour à la page précédente</span>
                <span
                  className="absolute inset-0 -translate-x-full transform bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-500 group-hover:translate-x-full group-hover:opacity-20"
                  style={{ transitionDuration: '600ms' }}
                  aria-hidden="true"
                />
              </button>

              <Link
                href="https://hallia.ai/contact"
                target="_blank"
                className="group font-inter inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-base font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
              >
                <span>Contactez-nous</span>
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Suggestions */}
            <div className="animate-fade-in-up mt-16 rounded-2xl border border-gray-200 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
              <p className="font-inter mb-4 text-sm font-medium text-gray-900">
                Suggestions utiles :
              </p>
              <ul className="text-silverchalice-600 space-y-2 text-left text-sm">
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Vérifiez l&apos;URL pour des erreurs de frappe</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Retournez à la page d&apos;accueil pour naviguer</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Contactez notre équipe si le problème persiste</span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
