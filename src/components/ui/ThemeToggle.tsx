// src/components/ui/ThemeToggle.tsx - VERSION CORRIGÉE
'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/core/context/ThemeContext'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Hook sécurisé qui gère le cas où le ThemeProvider n'est pas disponible
function useSafeTheme() {
  const [mounted, setMounted] = useState(false);
  const [fallbackTheme, setFallbackTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    // Lire le thème depuis localStorage en fallback
    const savedTheme = localStorage.getItem('vosc-theme') as 'light' | 'dark';
    if (savedTheme) {
      setFallbackTheme(savedTheme);
    }
  }, []);

  try {
    // Essayer d'utiliser le contexte thème
    const themeContext = useTheme();
    return { ...themeContext, mounted };
  } catch (error) {
    // Fallback si le contexte n'est pas disponible
    console.warn('ThemeProvider not found, using fallback theme');
    
    const toggleTheme = () => {
      const newTheme = fallbackTheme === 'light' ? 'dark' : 'light';
      setFallbackTheme(newTheme);
      localStorage.setItem('vosc-theme', newTheme);
      
      // Appliquer manuellement le thème
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
      
      if (newTheme === 'light') {
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--text-primary', '#1a1a1a');
        root.style.setProperty('--header-bg', '#132D5D');
        root.style.setProperty('--footer-bg', '#132D5D');
      } else {
        root.style.setProperty('--bg-primary', '#000000');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--header-bg', '#000000');
        root.style.setProperty('--footer-bg', '#000000');
      }
    };

    return { 
      theme: fallbackTheme, 
      toggleTheme, 
      setTheme: setFallbackTheme,
      mounted 
    };
  }
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useSafeTheme();

  // Ne pas rendre le composant côté serveur pour éviter l'hydratation mismatch
  if (!mounted) {
    return (
      <div className={`${getSizeClasses(size)} relative bg-gray-200 rounded-full ${className}`}>
        <div className="animate-pulse bg-gray-300 rounded-full w-full h-full" />
      </div>
    );
  }

  const sizeClasses = getSizeClasses(size);
  const iconSizes = getIconSizes(size);

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        ${sizeClasses}
        relative
        bg-theme-card
        border-theme
        border
        rounded-full
        flex items-center justify-center
        hover:bg-brand-pink/10
        transition-all duration-300
        group
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={theme === 'light' ? 'Passer au mode sombre' : 'Passer au mode clair'}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 180 : 0,
          scale: theme === 'dark' ? 0.8 : 1
        }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {theme === 'light' ? (
          <Sun className={`${iconSizes} text-brand-blue group-hover:text-brand-pink transition-colors`} />
        ) : (
          <Moon className={`${iconSizes} text-brand-pink group-hover:text-white transition-colors`} />
        )}
      </motion.div>

      {/* Indicateur de thème actuel */}
      <motion.div
        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
        initial={false}
        animate={{
          backgroundColor: theme === 'light' ? '#132D5D' : '#FF7E93'
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

// Version avec label pour les footers
export function ThemeToggleWithLabel({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useSafeTheme();

  if (!mounted) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-200 animate-pulse ${className}`}>
        <div className="w-5 h-5 bg-gray-300 rounded" />
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded mb-1" />
          <div className="h-3 bg-gray-300 rounded w-2/3" />
        </div>
        <div className="w-8 h-4 bg-gray-300 rounded-full" />
      </div>
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        flex items-center gap-3 p-3 rounded-lg
        bg-theme-card border-theme border
        hover:bg-brand-pink/10 transition-all duration-300
        group w-full text-left
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-shrink-0">
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-brand-blue group-hover:text-brand-pink transition-colors" />
        ) : (
          <Moon className="w-5 h-5 text-brand-pink group-hover:text-white transition-colors" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="text-theme-primary font-medium text-sm">
          {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
        </div>
        <div className="text-theme-secondary text-xs">
          {theme === 'light' ? 'Basculer vers le thème sombre' : 'Basculer vers le thème clair'}
        </div>
      </div>

      <motion.div
        className="flex-shrink-0 w-8 h-4 rounded-full border-2 relative"
        initial={false}
        animate={{
          backgroundColor: theme === 'dark' ? '#FF7E93' : '#e5e7eb',
          borderColor: theme === 'dark' ? '#FF7E93' : '#d1d5db'
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white"
          initial={false}
          animate={{
            x: theme === 'dark' ? 14 : 2
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.button>
  );
}

// Fonctions utilitaires
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };
  return sizeClasses[size];
}

function getIconSizes(size: 'sm' | 'md' | 'lg') {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  return iconSizes[size];
}