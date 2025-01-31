// src/components/layouts/RootLayoutClient.tsx
'use client'

import { ThemeProvider } from '../../core/theme/ThemeProvider'
import { LayoutProvider } from '../../core/context/LayoutContext'

interface RootLayoutClientProps {
  children: React.ReactNode
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  return (
    <ThemeProvider>
      <LayoutProvider>
        {children}
      </LayoutProvider>
    </ThemeProvider>
  )
}