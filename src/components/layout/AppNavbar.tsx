'use client';

import { LogOut, Home, Settings, User } from 'lucide-react';
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

  const linkBaseClasses = 'flex items-center gap-1.5 pb-4 border-b transition-colors';

  const toggleOpen = () => {
    setOpen(!open);
  };

  const handleSignOut = () => {
    signOut();
    setOpen(false);
  };

  return (
    <header className="border-b border-[#E5E7EB] bg-white px-4 pt-6">
      <nav className="mx-auto flex max-w-7xl flex-col gap-5 text-nowrap">
        {/* Partie fixe : Logo et titre */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image src={'/logo/logo-navbar.png'} alt="Logo" width={35} height={35} />
            <h1 className="font-thunder text-2xl font-semibold text-black">HALL MAIL</h1>
          </span>
          {/* Email et bouton déconnexion */}
          {user && (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
              <button
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 shadow-md transition-all hover:scale-105 hover:shadow-lg"
                onClick={toggleOpen}
              >
                Déconnexion
                <span>
                  <LogOut size={16} />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Partie scrollable : Navigation */}
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-max gap-6 font-medium md:min-w-0">
            <li>
              <Link
                href={'/dashboard'}
                className={cn(
                  linkBaseClasses,
                  pathname?.startsWith('/dashboard')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent',
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
                  pathname?.startsWith('/settings')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent',
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent',
                )}
              >
                <span>
                  <User size={20} />
                </span>
                Compte
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
