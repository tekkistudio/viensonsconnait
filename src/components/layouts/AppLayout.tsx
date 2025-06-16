// src/components/layouts/AppLayout.tsx - VERSION AVEC LIEN APP STORE
'use client'

import React from 'react'
import { useLayoutContext } from '../../core/context/LayoutContext'
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint'
import Header from './Header'
import MobileHeader from './MobileHeader'
import Footer from './Footer'
import MobileFooter from './MobileFooter'
import { DukkaBadge } from '../../components/ui/DukkaBadge'
import { AnnouncementBar } from '../../features/home/components/sections/AnnouncementBar'
import { MobileAnnouncementBar } from '../../features/home/components/mobile/MobileAnnouncementBar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge, hideHeaderGroup } = useLayoutContext();
  const { isMobile } = useBreakpoint();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ NOUVEAU : Barre d'annonce adaptative avec lien App Store */}
      {isMobile ? (
        <MobileAnnouncementBar
          text="🌟 Téléchargez notre App Mobile 📲"
          phone="221781362728"
          whatsapp="221781362728"
          href="https://apps.apple.com/app/viensonsconnait/id6464125284"
          linkText="🌟 Téléchargez notre App Mobile 📲"
        />
      ) : (
        <AnnouncementBar
          text="Livraison gratuite à Dakar 🇸🇳 | Livraison disponible à Abidjan 🇨🇮"
          phone="221781362728"
          whatsapp="221781362728"
        />
      )}
      
      {/* ✅ NOUVEAU : Header adaptatif selon la taille d'écran - POSITION ABSOLUE POUR MOBILE */}
      {!hideHeaderGroup && (
        <>
          {/* Mobile Header - Position absolue */}
          <div className="md:hidden">
            <MobileHeader />
          </div>
          
          {/* Desktop Header - Position normale */}
          <div className="hidden md:block">
            <Header />
          </div>
        </>
      )}
      
      {/* ✅ CORRECTION : Contenu principal simple */}
      <main className="flex-1" role="main" aria-label="Contenu principal">
        {children}
      </main>
      
      {/* ✅ NOUVEAU : Footer adaptatif selon la taille d'écran */}
      {/* Mobile Footer */}
      <div className="md:hidden">
        <MobileFooter />
      </div>
      
      {/* Desktop Footer */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Dukka Badge */}
      {!hideDukkaBadge && !isMobile && <DukkaBadge />}
    </div>
  );
}