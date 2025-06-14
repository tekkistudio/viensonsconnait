// src/components/layouts/MobileHeader.tsx
"use client"

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import useCountryStore from '@/core/hooks/useCountryStore';
import { CountrySelector } from '@/features/shared/components/CountrySelector';

const navigation = [
  { name: 'Accueil', href: '/' },
  { name: 'Nos Jeux', href: '/nos-jeux' },
  { name: 'Le Concept', href: '/concept' },
  { name: 'Témoignages', href: '/temoignages' },
  { name: 'Notre Histoire', href: '/notre-histoire' },
  { name: 'Blog', href: '/blog' }
];

export default function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const { currentCountry } = useCountryStore();

  return (
    <>
      {/* Header principal */}
      <header className="relative z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image 
              src="/images/logos/logo-white.svg" 
              alt="VIENS ON S'CONNAÎT"
              width={120}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Actions droite */}
          <div className="flex items-center gap-3">
            {/* Country Selector */}
            <button
              onClick={() => setShowCountrySelector(true)}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <span className="text-lg">{currentCountry?.flag}</span>
              <span className="text-sm font-medium">{currentCountry?.currency?.symbol}</span>
            </button>

            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white/90 hover:text-white transition-colors"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile avec overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu Panel */}
              <motion.div
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-80 bg-black/95 backdrop-blur-xl z-40 border-l border-white/10"
              >
                <div className="p-6">
                  {/* Header du menu */}
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-white text-lg font-semibold">Menu</h2>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Navigation */}
                  <nav className="space-y-2">
                    {navigation.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          href={item.href}
                          className="block w-full text-left px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Country selector dans le menu */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowCountrySelector(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <span className="text-xl">{currentCountry?.flag}</span>
                      <div className="text-left">
                        <div className="font-medium">{currentCountry?.name}</div>
                        <div className="text-sm text-white/60">Devise: {currentCountry?.currency?.symbol}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Country Selector Modal */}
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
      />
    </>
  );
}