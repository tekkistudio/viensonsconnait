// src/components/admin/UserMenu.tsx
'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '@/core/theme/AdminThemeProvider';
import {
  User,
  LogOut,
  Settings,
  Moon,
  Sun,
  Monitor,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  user: {
    email: string;
    name: string;
  };
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  const { theme, setTheme, actualTheme } = useTheme();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 p-4 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-blue" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="z-[100] w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-800 mt-1 p-1"
          align="end"
          sideOffset={5}
        >
          <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </DropdownMenu.Item>
          
          {/* Section des thèmes */}
          <div className="px-3 py-2">
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

          <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          
          <DropdownMenu.Item
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}