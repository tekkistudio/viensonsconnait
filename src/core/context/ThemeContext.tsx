// src/core/context/ThemeContext.tsx - VERSION SÉCURISÉE
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook sécurisé qui ne lance pas d'erreur
export function useSafeTheme() {
  const context = useContext(ThemeContext)
  return context // Peut être undefined
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light') // Thème par défaut : clair
  const [mounted, setMounted] = useState(false)

  // Charger le thème depuis localStorage au montage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('vosc-theme') as Theme
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeState(savedTheme)
      }
    } catch (error) {
      console.warn('Error loading theme from localStorage:', error)
    }
    setMounted(true)
  }, [])

  // Appliquer le thème au document
  useEffect(() => {
    if (mounted) {
      try {
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
        
        // Mettre à jour les variables CSS
        if (theme === 'light') {
          root.style.setProperty('--bg-primary', '#ffffff')
          root.style.setProperty('--bg-secondary', '#f8f9fa')
          root.style.setProperty('--text-primary', '#1a1a1a')
          root.style.setProperty('--text-secondary', '#6b7280')
          root.style.setProperty('--header-bg', '#132D5D')
          root.style.setProperty('--footer-bg', '#132D5D')
          root.style.setProperty('--card-bg', '#ffffff')
          root.style.setProperty('--border-color', '#e5e7eb')
        } else {
          root.style.setProperty('--bg-primary', '#000000')
          root.style.setProperty('--bg-secondary', '#1a1a1a')
          root.style.setProperty('--text-primary', '#ffffff')
          root.style.setProperty('--text-secondary', '#9ca3af')
          root.style.setProperty('--header-bg', '#000000')
          root.style.setProperty('--footer-bg', '#000000')
          root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.1)')
          root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)')
        }
      } catch (error) {
        console.warn('Error applying theme to document:', error)
      }
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('vosc-theme', newTheme)
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error)
    }
  }

  // Éviter le flash durant l'hydratation
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }} suppressHydrationWarning>
        {children}
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider