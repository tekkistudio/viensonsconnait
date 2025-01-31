// src/core/context/LayoutContext.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface LayoutContextType {
  hideDukkaBadge: boolean
  setHideDukkaBadge: (hide: boolean) => void
  hideHeaderGroup: boolean
  setHideHeaderGroup: (hide: boolean) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [hideDukkaBadge, setHideDukkaBadge] = useState(false)
  const [hideHeaderGroup, setHideHeaderGroup] = useState(false)

  return (
    <LayoutContext.Provider 
      value={{ 
        hideDukkaBadge, 
        setHideDukkaBadge,
        hideHeaderGroup,
        setHideHeaderGroup
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutProvider')
  }
  return context
}