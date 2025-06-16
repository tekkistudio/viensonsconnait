// src/components/providers/ClientThemeWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { ThemeProvider } from '@/core/context/ThemeContext'

interface ClientThemeWrapperProps {
  children: React.ReactNode
}

export function ClientThemeWrapper({ children }: ClientThemeWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // Rendu côté serveur sans le ThemeProvider
    return <div suppressHydrationWarning>{children}</div>
  }

  // Rendu côté client avec le ThemeProvider
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}