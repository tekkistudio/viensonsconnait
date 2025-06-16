// src/components/layouts/AppLayout.tsx 
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-black transition-colors duration-300">
      {/* ✅ Barre d'annonce adaptative */}
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
      
      {/* ✅ Header adaptatif */}
      {!hideHeaderGroup && (
        <>
          <div className="md:hidden">
            <MobileHeader />
          </div>
          <div className="hidden md:block">
            <Header />
          </div>
        </>
      )}
      
      {/* ✅ Contenu principal */}
      <main className="flex-1 bg-theme-primary theme-container transition-colors duration-300" role="main">
        {children}
      </main>
      
      {/* ✅ Footer adaptatif */}
      <div className="md:hidden">
        <MobileFooter />
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Dukka Badge */}
      {!hideDukkaBadge && !isMobile && <DukkaBadge />}
    </div>
  );
}