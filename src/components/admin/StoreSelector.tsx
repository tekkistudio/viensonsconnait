// src/components/admin/StoreSelector.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, Bell } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

const stores = [
  { id: 'vosc-main', name: 'VIENS ON S\'CONNAÎT' },
  { id: 'amani', name: 'AMANI' },
  { id: 'ecoboom', name: 'ECOBOOM' },
];

export default function StoreSelector() {
  const [currentStore, setCurrentStore] = useState(stores[0]);

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <span className="font-medium text-gray-900 dark:text-white">{currentStore.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 p-1 min-w-[220px] animate-slideDownAndFade z-50" 
            sideOffset={5}
          >
            {stores.map((store) => (
              <DropdownMenu.Item
                key={store.id}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm rounded-md cursor-pointer outline-none",
                  store.id === currentStore.id 
                    ? "bg-[#2563EB] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                onClick={() => setCurrentStore(store)}
              >
                {store.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button className="relative p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
      </button>
    </div>
  );
}