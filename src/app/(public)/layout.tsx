'use client';

import { useRouter } from 'next/navigation';
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

    useEffect(() => {
        if (!loading && user) {
            // Vérifier si l'utilisateur vient de valider son email
            // Dans ce cas, ne pas le rediriger automatiquement vers le dashboard
            if (typeof window !== 'undefined') {
                const justVerified = sessionStorage.getItem('email_just_verified');
                if (justVerified === 'true') {
                    // Nettoyer le flag et ne pas rediriger
                    sessionStorage.removeItem('email_just_verified');
                    console.log('[PublicLayout] Email vient d\'être vérifié, pas de redirection auto');
                    return;
                }
            }
            
            // Redirection normale vers le dashboard
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Afficher un loader pendant le chargement de l'authentification
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                <Loading />

                </div>
            </div>
        );
    }

    // Si l'utilisateur est connecté, ne rien afficher (redirection en cours)
    // SAUF s'il vient de valider son email
    if (user) {
        if (typeof window !== 'undefined') {
            const justVerified = sessionStorage.getItem('email_just_verified');
            if (justVerified === 'true') {
                // Afficher la page normalement pour qu'il puisse se connecter via la popup
                // Le flag sera nettoyé dans le useEffect ci-dessus
                console.log('[PublicLayout] Email vient d\'être vérifié, affichage de la page');
            } else {
                // Redirection en cours, ne rien afficher
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
            
            {/* Indicateur taille écran */}
            {/* <div className="fixed right-0 bottom-0 m-2 flex items-center space-x-2 rounded border border-black bg-black p-2 text-sm text-white">
                <img className="mx-auto h-5 w-auto" src="/favicon.ico" alt="Favicon" />
                <span className="ml-1 sm:hidden md:hidden lg:hidden xl:hidden">
                    {'default (< 640px)'}
                </span>
                <span className="ml-1 hidden font-extrabold sm:block md:hidden">SM</span>
                <span className="ml-1 hidden font-extrabold md:block lg:hidden">MD</span>
                <span className="ml-1 hidden font-extrabold lg:block xl:hidden">LG</span>
                <span className="ml-1 hidden font-extrabold xl:block 2xl:hidden">XL</span>
                <span className="3xl:hidden ml-1 hidden font-extrabold 2xl:block">2XL</span>
                <span className="3xl:block ml-1 hidden font-extrabold">3XL</span>
            </div> */}
            
            <Footer />
        </>
    );
}