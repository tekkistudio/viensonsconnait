// src/components/layouts/AppLayout.tsx - CORRIGÉ
'use client'

import React from 'react'
import { useLayoutContext } from '../../core/context/LayoutContext'
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint'
import Header from './Header'
import Footer from './Footer'
import { DukkaBadge } from '../../components/ui/DukkaBadge'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge, hideHeaderGroup } = useLayoutContext();
  const { isMobile } = useBreakpoint();
  
  return (
    <div className="min-h-screen flex flex-col safe-container">
      {/* Header group avec z-index */}
      {!hideHeaderGroup && (
        <div className="sticky top-0 z-50 bg-white">
          <Header />
        </div>
      )}
      
      {/* ✅ CORRECTION: Utilisation de div au lieu de main pour éviter l'erreur TypeScript */}
      <div 
        className="flex-1 relative z-0 no-horizontal-overflow" 
        role="main"
        aria-label="Contenu principal"
      >
        {children}
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* ✅ Dukka Badge masqué sur mobile et quand hideDukkaBadge est true */}
      {!hideDukkaBadge && !isMobile && <DukkaBadge />}
    </div>
  );
}