// src/core/theme/ThemeProvider.tsx
'use client';

import React, { createContext, useContext } from 'react';

interface ThemeContextType {
  colors: {
    primary: string;
    secondary: string;
  };
}

const defaultTheme: ThemeContextType = {
  colors: {
    primary: '#132D5D',    // Bleu
    secondary: '#FF7E93',  // Rose
  }
};

const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={defaultTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};