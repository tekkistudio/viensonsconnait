// src/components/layouts/AppLayout.tsx
'use client'

import { useLayoutContext } from '../../core/context/LayoutContext'
import Header from './Header'
import Footer from './Footer'
import { AnnouncementBar } from '../../features/home/components/sections/AnnouncementBar'
import { DukkaBadge } from '../../components/ui/DukkaBadge'

const ANNOUNCEMENT_DATA = {
  text: "Livraison gratuite à Dakar • Paiement à la livraison disponible",
  phone: "+221781362728",
  whatsapp: "221781362728"
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge, hideHeaderGroup } = useLayoutContext()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header group avec z-index, caché quand hideHeaderGroup est true */}
      {!hideHeaderGroup && (
        <div className="sticky top-0 z-50 bg-white">
          <AnnouncementBar {...ANNOUNCEMENT_DATA} />
          <Header />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 relative z-0">
        {children}
      </main>

      {/* Footer */}
      <Footer />
      
      {/* Dukka Badge */}
      {!hideDukkaBadge && <DukkaBadge />}
    </div>
  )
}