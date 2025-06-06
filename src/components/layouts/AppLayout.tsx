// src/components/layouts/AppLayout.tsx - ESPACEMENT MOBILE CORRIGÉ
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
    <div className="min-h-screen flex flex-col">
      {/* ✅ CORRECTION: Header sans sticky pour éviter les espaces */}
      {!hideHeaderGroup && (
        <div className="relative z-50">
          <Header />
        </div>
      )}
      
      {/* ✅ CORRECTION: Contenu principal sans espacement superflu */}
      <div 
        className="flex-1 relative z-0" 
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