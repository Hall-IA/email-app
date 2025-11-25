import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Roboto, Inter, Azeret_Mono } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from './providers';

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
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

const azeret = Azeret_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-azeret',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'HALL MAIL - Gestion Intelligente de vos Emails',
    template: '%s | HALL MAIL',
  },

  description:
    'Solution de tri automatique et intelligent de vos emails. Gagnez du temps avec notre système de classification automatique des emails professionnels.',
  keywords: [
    'tri email',
    'gestion email',
    'email automatique',
    'organisation email',
    'productivité',
  ],
  authors: [{ name: 'Hallia' }],
  creator: 'Hallia',
  publisher: 'Hallia',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://mail.hallia.ai',
    siteName: 'HALL MAIL',
    title: 'HALL MAIL - Gestion Intelligente de vos Emails',
    description: 'Solution de tri automatique et intelligent de vos emails.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'HALL MAIL',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HALL MAIL',
    description: 'Solution de tri automatique et intelligent de vos emails.',
    images: ['/twitter-image.jpg'],
    creator: '@votre_compte',
  },
  verification: {
    google: 'votre-code-verification-google',
  },
  alternates: {
    canonical: 'https://mail.hallia.ai',
  },
  icons: {
    icon: '/icon.svg',
    // shortcut: '/favicon-16x16.png', // Fichier manquant - décommenter quand disponible
    // apple: '/apple-touch-icon.png', // Fichier manquant - décommenter quand disponible
  },
  manifest: '/site.webmanifest',
  // JSON-LD via metadata
  other: {
    'script:ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'HALL MAIL',
      description: 'Solution de tri automatique et intelligent de vos emails',
      url: 'https://mail.hallia.ai',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${thunder.variable} ${roboto.variable} ${inter.variable} ${azeret.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
