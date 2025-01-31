// src/app/admin/settings/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  CreditCard,
  Truck,
  Bell,
  Users,
  Database,
  Link as LinkIcon,
  Bot,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/toaster';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

interface SettingsItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Général',
    items: [
      {
        label: 'Ma Boutique',
        icon: Store,
        href: '/admin/settings/store'
      },
      {
        label: 'Assistant IA',
        icon: Bot,
        href: '/admin/settings/assistant'
      }
    ]
  },
  {
    title: 'Commerce',
    items: [
      {
        label: 'Paiements',
        icon: CreditCard,
        href: '/admin/settings/payments'
      },
      {
        label: 'Livraison',
        icon: Truck,
        href: '/admin/settings/delivery'
      }
    ]
  },
  {
    title: 'Communication',
    items: [
      {
        label: 'Notifications',
        icon: Bell,
        href: '/admin/settings/notifications'
      }
    ]
  },
  {
    title: 'Équipe',
    items: [
      {
        label: 'Utilisateurs',
        icon: Users,
        href: '/admin/settings/users'
      }
    ]
  },
  {
    title: 'Technique',
    items: [
      {
        label: 'Données',
        icon: Database,
        href: '/admin/settings/data'
      },
      {
        label: 'Intégrations',
        icon: LinkIcon,
        href: '/admin/settings/integrations'
      }
    ]
  }
];

function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative">
      <div className="container mx-auto p-6">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          {/* Sidebar */}
          <aside className="lg:w-1/5">
            <ScrollArea className="h-[calc(100vh-10rem)]">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Paramètres
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gérez les paramètres de votre boutique
                  </p>
                </div>
                <Separator />
                <nav className="space-y-6">
                  {settingsSections.map((section) => (
                    <div key={section.title}>
                      <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {section.title}
                      </h3>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                              pathname === item.href
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </ScrollArea>
          </aside>

          {/* Content */}
          <main className="flex-1">
            <div className="h-full space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default SettingsLayout;