import { ReactNode } from 'react';

// Forcer le rendu dynamique pour cette route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CallbackLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

