'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import { Loading } from '@/components/Loading';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Vérifier si on est sur la page de callback d'authentification
    const isAuthCallback = pathname?.startsWith('/auth/callback');

    useEffect(() => {
        // NE JAMAIS rediriger si on est sur /auth/callback
        // Cette page gère elle-même la logique de redirection
        if (isAuthCallback) {
            console.log('[PublicLayout] Sur /auth/callback, pas de redirection auto');
            return;
        }

        if (!loading && user) {
            // Vérifier si l'utilisateur vient de valider son email
            if (typeof window !== 'undefined') {
                const justVerified = sessionStorage.getItem('email_just_verified');
                if (justVerified === 'true') {
                    sessionStorage.removeItem('email_just_verified');
                    console.log('[PublicLayout] Email vient d\'être vérifié, pas de redirection auto');
                    return;
                }
            }
            
            // Redirection normale vers le dashboard
            router.push('/dashboard');
        }
    }, [user, loading, router, isAuthCallback]);

    // Afficher un loader pendant le chargement de l'authentification
    // SAUF sur /auth/callback qui gère son propre état
    if (loading && !isAuthCallback) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loading />
                </div>
            </div>
        );
    }

    // Si on est sur /auth/callback, toujours afficher le contenu
    if (isAuthCallback) {
        return <>{children}</>;
    }

    // Si l'utilisateur est connecté, ne rien afficher (redirection en cours)
    // SAUF s'il vient de valider son email
    if (user) {
        if (typeof window !== 'undefined') {
            const justVerified = sessionStorage.getItem('email_just_verified');
            if (justVerified === 'true') {
                // Afficher la page normalement
                console.log('[PublicLayout] Email vient d\'être vérifié, affichage de la page');
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    return (
        <>
            <NavBar />
            <main>{children}</main>
            <Footer />
        </>
    );
}