// src/app/admin/context/AdminContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';
import { useDashboardCounters } from '../hooks/useDashboardCounters';

interface AdminContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
  counters: {
    pendingOrders: number;
    activeConversations: number;
    unreadMessages: number;
  };
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState('overview');
  const { pendingOrders, activeConversations, unreadMessages, loading } = useDashboardCounters();

  return (
    <AdminContext.Provider 
      value={{
        activeSection,
        setActiveSection,
        counters: {
          pendingOrders,
          activeConversations,
          unreadMessages
        },
        loading
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};