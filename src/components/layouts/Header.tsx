// src/components/layouts/Header.tsx
"use client"

import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import useCountryStore from '../../core/hooks/useCountryStore';
import { CountrySelector } from '../../features/shared/components/CountrySelector';

const games = [
  {
    name: 'Pour les Couples',
    href: '/products/couples',
    image: '/images/products/couples-1.jpg'
  },
  {
    name: 'Pour les Mariés',
    href: '/products/couples-maries',
    image: '/images/products/maries-1.jpg'
  },
  {
    name: 'Pour la Famille',
    href: '/products/familles',
    image: '/images/products/famille-1.jpg'
  },
  {
    name: 'Pour les Amis',
    href: '/products/amis',
    image: '/images/products/amis-1.jpg'
  },
  {
    name: 'Pour les Collègues',
    href: '/products/collegues',
    image: '/images/products/collegues-1.jpg'
  }
];

const navigation = [
  { name: 'Accueil', href: '/' },
  { 
    name: 'Nos Jeux', 
    href: '#',
    hasSubmenu: true,
    submenu: games
  },
  { name: 'Le Concept', href: '/concept' },
  { name: 'Témoignages', href: '/temoignages' },
  { name: 'Blog', href: '/blog' }
];

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showCountrySelector, setShowCountrySelector] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const { currentCountry } = useCountryStore();
  
    // Gestion du scroll pour le header
    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 50);
      };
  
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);
  
    return (
      <header className={`bg-brand-blue text-white transition-shadow duration-300
        ${isScrolled ? 'shadow-lg' : ''}`}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center justify-between py-3 md:py-4">
            {/* Logo - Ajusté pour mobile */}
            <Link href="/" className="relative flex-shrink-0">
              <Image 
                src="/images/logos/logo-white.svg" 
                alt="VIENS ON S'CONNAÎT"
                width={140}
                height={40}
                className="h-10 md:h-12 w-auto"
                priority
              />
            </Link>
  
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {navigation.map((item) => (
                <div key={item.name} className="relative group">
                  {item.hasSubmenu ? (
                    <div className="relative">
                      <button className="flex items-center gap-1 text-white hover:text-brand-pink transition-colors py-2">
                        <span>{item.name}</span>
                        <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                      </button>
                      {/* Submenu avec animation */}
                      <div className="absolute top-full left-0 hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                        <div className="bg-white rounded-lg shadow-lg p-4 w-64">
                          {item.submenu?.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className="flex items-center gap-3 p-2 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={subItem.image}
                                  alt={subItem.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <span>{subItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-white hover:text-brand-pink transition-colors py-2"
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
  
            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Country Selector */}
              <button
                onClick={() => setShowCountrySelector(true)}
                className="text-sm hidden md:inline-flex items-center gap-2 hover:text-brand-pink transition-colors"
              >
                <span className="text-xl">{currentCountry?.flag}</span>
                <span className="text-base font-semibold hidden lg:inline">{currentCountry?.name}</span>
                {currentCountry?.currency && (
                  <span className="text-base text-white/100 font-semibold">({currentCountry.currency.symbol})</span>
                )}
              </button>
  
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg"
                aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </nav>
  
          {/* Mobile Menu - Amélioré avec animations */}
          {isMenuOpen && (
            <div className="md:hidden absolute inset-x-0 top-full bg-brand-blue border-t border-white/10 mobile-menu">
              <div className="p-4 space-y-4 animate-fadeIn">
                {navigation.map((item) => (
                  <div key={item.name}>
                    {item.hasSubmenu ? (
                      <div className="space-y-2">
                        <div className="font-medium text-lg">{item.name}</div>
                        <div className="ml-4 space-y-4 mt-4">
                          {item.submenu?.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className="flex items-center gap-3 text-white/80 hover:text-brand-pink"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={subItem.image}
                                  alt={subItem.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <span>{subItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className="block text-lg text-white hover:text-brand-pink"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
                
                {/* Country Selector dans le menu mobile */}
                <button
                  onClick={() => {
                    setShowCountrySelector(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-white hover:text-brand-pink w-full mt-6 pt-6 border-t border-white/10"
                >
                  <span className="text-xl">{currentCountry?.flag}</span>
                  <span className="text-base font-semibold">{currentCountry?.name}</span>
                  {currentCountry?.currency && (
                    <span className="text-base text-white/80">({currentCountry.currency.symbol})</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
  
        {/* Country Selector Modal */}
        <CountrySelector
          isOpen={showCountrySelector}
          onClose={() => setShowCountrySelector(false)}
        />
      </header>
    );
  }