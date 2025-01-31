// src/core/theme/AdminThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
  };
}

const defaultColors = {
  primary: '#132D5D',
  secondary: '#FF7E93',
};

const AdminThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin-theme') as Theme) || 'light'; // Changé 'system' en 'light'
    }
    return 'light'; // Changé 'system' en 'light'
  });
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let newTheme: 'light' | 'dark';
      if (theme === 'system') {
        newTheme = 'light'; // Force le thème clair pour 'system'
      } else {
        newTheme = theme as 'dark' | 'light';
      }

      root.classList.remove('dark', 'light');
      root.classList.add(newTheme);
      setActualTheme(newTheme);
    };

    applyTheme();
    localStorage.setItem('admin-theme', theme);

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <AdminThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      actualTheme,
      colors: defaultColors 
    }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within an AdminThemeProvider');
  }
  return context;
};