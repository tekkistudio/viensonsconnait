// src/components/layouts/AppLayout.tsx - VERSION COMPLÈTE CORRIGÉE
'use client'

import React from 'react'
import { useLayoutContext } from '../../core/context/LayoutContext'
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint'
import Header from './Header'
import MobileHeader from './MobileHeader'
import Footer from './Footer'
import { DukkaBadge } from '../../components/ui/DukkaBadge'
import { AnnouncementBar } from '../../features/home/components/sections/AnnouncementBar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge, hideHeaderGroup } = useLayoutContext();
  const { isMobile } = useBreakpoint();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ NOUVEAU : AnnouncementBar simple sans positionnement complexe */}
      <AnnouncementBar
        text="Livraison gratuite à Dakar 🇸🇳 | Livraison disponible à Abidjan 🇨🇮"
        phone="221781362728"
        whatsapp="221781362728"
      />
      
      {/* ✅ NOUVEAU : Header adaptatif selon la taille d'écran */}
      {!hideHeaderGroup && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden">
            <MobileHeader />
          </div>
          
          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>
        </>
      )}
      
      {/* ✅ CORRECTION : Contenu principal simple */}
      <main className="flex-1" role="main" aria-label="Contenu principal">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Dukka Badge */}
      {!hideDukkaBadge && !isMobile && <DukkaBadge />}
    </div>
  );
}