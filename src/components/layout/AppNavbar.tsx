'use client';

import { LogOut, Home, Settings, User, Headphones } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import Image from 'next/image';

export default function AppNavbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkBaseClasses = 'flex items-center gap-1.5 transition-colors px-4 py-2.5 font-medium';
  const linkSelectedClasses = 'text-blue-500 bg-background rounded-t-lg';

  const handleSignOut = () => {
    signOut();
    setOpen(false);
  };

  return (
    <header className="bg-white px-4 pt-6">
      <nav className="mx-auto flex max-w-7xl flex-col gap-5 text-nowrap">
        {/* Partie fixe : Logo et titre */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image src={'/logo/logo-navbar.png'} alt="Logo" width={35} height={35} />
            <h1 className="font-thunder -mb-2 text-3xl font-semibold text-black">HALL MAIL</h1>
          </span>
          {/* Email et bouton déconnexion */}
          {user && (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-gray-300 px-4 py-2 text-sm font-medium shadow-md transition-all duration-300 hover:border-red-400 hover:shadow-lg"
              >
                <span className="relative z-10 text-gray-700 transition-colors duration-300 group-hover:text-red-600">
                  Déconnexion
                </span>
                <LogOut className="relative z-10 h-4 w-4 text-gray-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-red-600" />

                {/* Fond qui apparaît au hover */}
                <div className="absolute inset-0 origin-left scale-x-0 transform bg-red-50 transition-transform duration-300 group-hover:scale-x-100" />
              </button>
            </div>
          )}
        </div>

        {/* Partie scrollable : Navigation */}
        <div className="overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-max items-center font-medium">
            <li className="flex-shrink-0">
              <Link
                href={'/dashboard'}
                className={cn(
                  linkBaseClasses,
                  pathname?.startsWith('/dashboard') && linkSelectedClasses,
                )}
              >
                <span>
                  <Home size={20} />
                </span>
                Tableau de bord
              </Link>
            </li>
            <li>
              <Link
                href={'/settings'}
                className={cn(
                  linkBaseClasses,
                  pathname?.startsWith('/settings') && linkSelectedClasses,
                )}
              >
                <span>
                  <Settings size={20} />
                </span>
                Configuration Email
              </Link>
            </li>
            <li>
              <Link
                href={'/user-settings'}
                className={cn(
                  linkBaseClasses,
                  pathname?.startsWith('/user-settings')
                    ? linkSelectedClasses
                    : 'border-transparent',
                )}
              >
                <span>
                  <User size={20} />
                </span>
                Compte
              </Link>
            </li>
            <li>
              <Link
                href={'/support'}
                className={cn(
                  linkBaseClasses,
                  pathname?.startsWith('/support') && linkSelectedClasses,
                )}
              >
                <span>
                  <Headphones size={20} />
                </span>
                Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Modal de confirmation */}
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Déconnexion"
          description="Voulez-vous vraiment vous déconnecter ?"
          onConfirm={handleSignOut}
        />
      </nav>
    </header>
  );
}
