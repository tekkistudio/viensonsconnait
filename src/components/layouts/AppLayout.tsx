// src/components/layouts/AppLayout.tsx
'use client'

import { useLayoutContext } from '../../core/context/LayoutContext'
import Header from './Header'
import Footer from './Footer'
import { DukkaBadge } from '../../components/ui/DukkaBadge'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { hideDukkaBadge, hideHeaderGroup } = useLayoutContext();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header group avec z-index */}
      {!hideHeaderGroup && (
        <div className="sticky top-0 z-50 bg-white">
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
  );
}