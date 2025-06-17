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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { currentCountry } = useCountryStore();

  // Gestion du scroll pour le header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ NOUVEAU : Fermer le menu mobile lors du resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ NOUVEAU : Gérer les clics en dehors pour fermer les dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ✅ AMÉLIORATION : Gestion du dropdown desktop
  const handleDropdownToggle = (itemName: string) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
  };

  return (
    <header className={`bg-brand-blue text-white transition-shadow duration-300 relative z-40
      ${isScrolled ? 'shadow-lg' : ''}`}>
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between py-3 md:py-4">
          {/* Logo */}
          <Link href="/" className="relative flex-shrink-0">
            <Image 
              src="/images/logos/logo-white.svg" 
              alt="VIENS ON S'CONNAÎT"
              width={145}
              height={45}
              className="h-12 md:h-14 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navigation.map((item) => (
              <div key={item.name} className="relative dropdown-container">
                {item.hasSubmenu ? (
                  <div className="relative">
                    <button 
                      className="flex items-center gap-1 text-white hover:text-brand-pink transition-colors py-2"
                      onClick={() => handleDropdownToggle(item.name)}
                      onMouseEnter={() => setOpenDropdown(item.name)}
                    >
                      <span>{item.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                        openDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* ✅ CORRECTION : Submenu avec animation et positionnement fixe */}
                    <div 
                      className={`absolute top-full left-0 pt-2 transition-all duration-200 ${
                        openDropdown === item.name 
                          ? 'opacity-100 visible translate-y-0' 
                          : 'opacity-0 invisible -translate-y-2'
                      }`}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <div className="bg-white rounded-lg shadow-xl border p-4 w-64 max-h-96 overflow-y-auto">
                        {item.submenu?.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="flex items-center gap-3 p-3 text-gray-900 rounded-md hover:bg-gray-50 transition-colors group"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={subItem.image}
                                alt={subItem.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <span className="font-medium">{subItem.name}</span>
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
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* ✅ CORRECTION : Mobile Menu avec hauteur dynamique optimisée */}
        <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isMenuOpen 
            ? 'max-h-[80vh] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="pb-6 space-y-4 border-t border-white/10 pt-4 overflow-y-auto max-h-[70vh]">
            {navigation.map((item) => (
              <div key={item.name} className="mobile-menu-item">
                {item.hasSubmenu ? (
                  <div className="space-y-3">
                    <div className="font-medium text-lg text-white border-b border-white/10 pb-2">{item.name}</div>
                    <div className="ml-2 space-y-3">
                      {item.submenu?.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="flex items-center gap-3 text-theme-secondary hover:text-brand-pink transition-colors py-2 px-2 rounded-lg hover:bg-white/5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={subItem.image}
                              alt={subItem.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm">{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="block text-lg text-white hover:text-brand-pink transition-colors py-3 px-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            
            {/* ✅ AMÉLIORATION : Country Selector dans le menu mobile avec meilleur espacement */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <button
                onClick={() => {
                  setShowCountrySelector(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-3 text-white hover:text-brand-pink w-full transition-colors py-3 px-2 rounded-lg hover:bg-white/5"
              >
                <span className="text-2xl">{currentCountry?.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold">{currentCountry?.name}</span>
                  {currentCountry?.currency && (
                    <span className="text-sm text-theme-secondary">Devise: {currentCountry.currency.symbol}</span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Country Selector Modal */}
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
      />
    </header>
  );
}