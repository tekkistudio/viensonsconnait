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
      {/* ✅ NOUVEAU : AnnouncementBar en premier pour z-index correct */}
      <AnnouncementBar
        text="Livraison gratuite à Dakar 🇸🇳 | Livraison disponible à Abidjan 🇨🇮"
        phone="221781362728"
        whatsapp="221781362728"
      />
      
      {/* ✅ CORRECTION : Header avec positionnement optimisé */}
      {!hideHeaderGroup && (
        <div className="relative z-40 header-wrapper">
          <Header />
        </div>
      )}
      
      {/* ✅ CORRECTION : Contenu principal sans espacement automatique du body */}
      <div 
        className="flex-1 relative z-0 main-content-wrapper" 
        role="main"
        aria-label="Contenu principal"
        style={{
          // ✅ NOUVEAU : Compensier uniquement le header, pas l'announcement
          marginTop: hideHeaderGroup ? '0' : 'var(--header-height, 64px)'
        }}
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