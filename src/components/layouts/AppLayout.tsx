// src/components/layouts/AppLayout.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useBreakpoint } from '../../core/theme/hooks/useBreakpoint'
import { useLayoutContext } from '../../core/context/LayoutContext'
import Header from './Header'
import Footer from './Footer'
import { AnnouncementBar } from '../../features/home/components/sections/AnnouncementBar'
import { DukkaBadge } from '../../components/ui/DukkaBadge'

const ANNOUNCEMENT_DATA = {
  text: "Livraison gratuite à Dakar • Paiement à la livraison disponible",
  phone: "+221781362728",
  whatsapp: "221781362728"
};

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge } = useLayoutContext();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Pour les routes admin, retourner juste le contenu sans header/footer/badge
  if (isAdminRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Pour les autres routes, retourner le layout complet
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar {...ANNOUNCEMENT_DATA} />
      
      <div className="header-wrapper">
        <Header />
      </div>
      
      <main className="flex-1">
        {children}
      </main>

      <Footer />
      {!hideDukkaBadge && !isAdminRoute && <DukkaBadge />}
    </div>
  );
}