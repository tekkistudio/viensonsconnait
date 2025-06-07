// src/components/layouts/AppLayout.tsx 
'use client'

import React from 'react'
import { useLayoutContext } from '../../core/context/LayoutContext'
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint'
import Header from './Header'
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
      
      {/* ✅ CORRECTION : Header sans sticky problématique */}
      {!hideHeaderGroup && (
        <Header />
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