'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function AppNavbar() {
    const { user, signOut } = useAuth();
    const pathname = usePathname();

    // Fonction pour vérifier si le lien est actif
    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-white shadow-sm border-b pt-5 ">
            <div className="container mx-auto px-4">
                <div className="flex flex-col w-full gap-3 justify-between ">
                    <div className="flex justify-between gap-8">
                        <Link href="/dashboard" className="text-xl flex items-center gap-2 font-bold">
                            <img src="/logo/logo-navbar.png" alt="Logo" />
                            HALL MAIL
                        </Link>
                        <div className="flex items-center gap-4">
                            {user && (
                                <>
                                    <span className="text-sm text-gray-600">
                                        {user.email}
                                    </span>
                                    <button
                                        onClick={() => signOut()}
                                        className="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium overflow-hidden border-2 border-gray-300 rounded-full shadow-md hover:shadow-lg hover:border-red-400 transition-all duration-300"
                                    >
                                        <span className="relative z-10 transition-colors duration-300 text-gray-700 group-hover:text-red-600">
                                            Déconnexion
                                        </span>
                                        <LogOut className="relative z-10 w-4 h-4 text-gray-600 transition-all duration-300 group-hover:text-red-600 group-hover:translate-x-1" />
                                        
                                        {/* Fond qui apparaît au hover */}
                                        <div className="absolute inset-0 bg-red-50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {/* Dashboard Link */}
                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-2 pb-5 transition-colors transition-all duration-300 ${isActive('/dashboard')
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'hover:border-b-2 border-gray-400'
                                }`}
                        >
                            <img
                                src={isActive('/dashboard')
                                    ? "/assets/icon/home-active.png"
                                    : "/assets/icon/home.png"
                                }
                                alt="Home"
                            />
                            Tableau de bord
                        </Link>

                        {/* Settings Link */}
                        <Link
                            href="/settings"
                            className={`flex items-center gap-2 pb-5 transition-colors ${isActive('/settings')
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'hover:border-b-2 border-gray-400'
                                }`}
                        >
                            <img
                                src={isActive('/settings')
                                    ? "/assets/icon/adjustments-horizontal-active.png"
                                    : "/assets/icon/adjustments-horizontal.png"
                                }
                                alt="Settings"
                            />
                            Configuration Email
                        </Link>

                        {/* User Settings Link */}
                        <Link
                            href="/user-settings"
                            className={`flex items-center gap-2 pb-5 transition-colors ${isActive('/user-settings')
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'hover:border-b-2 border-gray-400'
                                }`}
                        >
                            <img
                                src={isActive('/user-settings')
                                    ? "/assets/icon/user-circle-active.png"
                                    : "/assets/icon/user-circle.png"
                                }
                                alt="User"
                            />
                            Compte
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}