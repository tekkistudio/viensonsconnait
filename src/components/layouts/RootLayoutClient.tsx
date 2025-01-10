// src/components/layouts/RootLayoutClient.tsx
'use client'

import { ThemeProvider } from '../../core/theme/ThemeProvider'
import { LayoutProvider } from '../../core/context/LayoutContext'
import { AppLayout } from './AppLayout'

interface RootLayoutClientProps {
  children: React.ReactNode
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  return (
    <LayoutProvider>
      <ThemeProvider>
        <AppLayout>
          {children}
        </AppLayout>
      </ThemeProvider>
    </LayoutProvider>
  )
}