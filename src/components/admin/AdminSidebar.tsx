// src/components/admin/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import useConversations from '@/hooks/useConversation';
import { useTheme } from '@/core/theme/AdminThemeProvider';
import { useAuth } from '@/components/admin/AuthProvider';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import useOrders from '@/hooks/useOrders';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  MessageSquare, 
  Package, 
  Users, 
  Activity,
  Settings,
  Globe,
  Truck,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  Loader2,
  Megaphone,
  Menu,
  X as XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  count?: number;
}

const PRINCIPAL: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Commandes',
    href: '/admin/orders',
    icon: ShoppingBag
  },
  {
    label: 'Conversations',
    href: '/admin/conversations',
    icon: MessageSquare
  },
  {
    label: 'Produits',
    href: '/admin/products',
    icon: Package
  },
  {
    label: 'Clients',
    href: '/admin/customers',
    icon: Users
  },
  {
    label: 'Livraison',
    href: '/admin/delivery',
    icon: Truck
  },
  {
    label: 'Marketing',
    href: '/admin/marketing',
    icon: Megaphone
  },
  {
    label: 'Performance',
    href: '/admin/analytics',
    icon: Activity
  }
];

const PARAMETRES: NavItem[] = [
  {
    label: 'Ma Boutique',
    href: '/admin/settings/store',
    icon: Globe
  },
  {
    label: 'Paramètres',
    href: '/admin/settings',
    icon: Settings
  }
];

function getFirstName(fullName: string) {
  return fullName?.split(' ')[0] || '';
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme, actualTheme } = useTheme();
  const { user, isLoading, signOut } = useAuth();
  const activeConversations = useConversations();
  const pendingOrders = useOrders();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const navigationItems = PRINCIPAL.map(item => {
    if (item.label === 'Conversations') {
      return { ...item, count: activeConversations };
    }
    if (item.label === 'Commandes') {
      return { ...item, count: pendingOrders };
    }
    return item;
  });

  const renderNavItems = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive(item.href)
                ? "text-[#2563EB] bg-[#2563EB]/10 dark:bg-[#2563EB]/20 font-medium"
                : "text-gray-600 dark:text-gray-300 hover:text-[#2563EB] hover:bg-[#2563EB]/10 dark:hover:bg-[#2563EB]/20"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="ml-auto bg-[#2563EB]/10 dark:bg-[#2563EB]/20 text-[#2563EB] py-0.5 px-2 rounded-full text-xs">
                {item.count}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  const renderUserMenu = () => {
    if (isLoading) {
      return (
        <div className="px-4 py-3 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      );
    }

    if (!user) return null;

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 dark:bg-[#2563EB]/20 flex items-center justify-center">
              <span className="text-[#2563EB] text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {getFirstName(user.name)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-[100] w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-800 py-2 mt-1"
            align="end"
            sideOffset={5}
          >
            <div className="px-4 py-2 border-b dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <div className="px-4 py-2">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                Thème
              </p>
              <div className="space-y-1">
                {[
                  { label: 'Clair', value: 'light', icon: Sun },
                  { label: 'Sombre', value: 'dark', icon: Moon },
                  { label: 'Système', value: 'system', icon: Monitor }
                ].map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                      theme === value
                        ? "text-[#2563EB] bg-[#2563EB]/10"
                        : "text-gray-600 dark:text-gray-300 hover:bg-[#2563EB]/10 hover:text-[#2563EB]"
                    )}
                    onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <DropdownMenu.Separator className="my-2 border-t dark:border-gray-800" />

            <DropdownMenu.Item 
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  };

  return (
    <>
      {/* Bouton Menu Mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 right-4 md:hidden z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-800"
      >
        {isMobileMenuOpen ? (
          <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <div className="md:hidden">
        {/* Overlay avec z-index plus bas que le sidebar */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>

      {/* Sidebar avec z-index plus élevé et fond opaque */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <Image
            src={actualTheme === 'dark'
              ? '/images/logos/dukka_white.svg'
              : '/images/logos/logo_dukka.svg'}
            alt="Logo Dukka"
            width={150}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Navigation scrollable */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto bg-white dark:bg-gray-900">
          {/* Principal */}
          <div>
            <div className="px-3 mb-3">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Principal
              </span>
            </div>
            {renderNavItems(navigationItems)}
          </div>

          {/* Paramètres */}
          <div className="mt-8">
            <div className="px-3 mb-3">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Paramètres
              </span>
            </div>
            {renderNavItems(PARAMETRES)}
          </div>
        </nav>

        {/* User Menu avec fond opaque */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {renderUserMenu()}
        </div>
      </aside>
    </>
  );
}