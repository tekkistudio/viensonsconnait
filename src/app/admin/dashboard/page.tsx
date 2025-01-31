// src/app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/admin/AuthProvider';
import { Loader2 } from 'lucide-react';
import DashboardContent from '@/components/admin/dashboard/DashboardContent';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Pendant le chargement de l'authentification
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  // Si non authentifié
  if (!isAuthenticated) {
    return null;
  }

  // Vérifions que le composant est bien importé
  console.log('DashboardContent:', DashboardContent);

  // Si authentifié, on affiche le contenu avec un wrapper pour le debug
  return (
    <div data-testid="dashboard-wrapper" className="dashboard-wrapper">
      <DashboardContent />
    </div>
  );
}