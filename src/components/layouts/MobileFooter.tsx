// src/components/layouts/MobileFooter.tsx - VERSION COMPLÈTE CORRIGÉE
"use client";

import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { TikTokIcon } from '@/components/icons/TikTokIcon';
// ✅ TEMPORAIREMENT COMMENTÉ pour éviter l'erreur ThemeProvider
// import { ThemeToggleWithLabel } from '@/components/ui/ThemeToggle';
import Link from "next/link";
import Image from "next/image";

const socialLinks = [
  {
    name: "Facebook",
    href: "https://facebook.com/viensonsconnait",
    icon: Facebook,
  },
  {
    name: "Instagram", 
    href: "https://instagram.com/viensonsconnait",
    icon: Instagram,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@viensonsconnait",
    icon: TikTokIcon,
  },
];

const quickLinks = [
  { name: "Accueil", href: "/" },
  { name: "Nos Jeux", href: "/nos-jeux" },
  { name: "Notre Histoire", href: "/notre-histoire" },
  { name: "Le Concept", href: "/concept" },
];

const legalLinks = [
  { name: "CGV", href: "/cgv" },
  { name: "Mentions Légales", href: "/mentions-legales" },
  { name: "Confidentialité", href: "/politique-confidentialite" },
];

export default function MobileFooter() {
  return (
    <footer className="bg-footer text-white border-t border-theme">
      <div className="px-4 py-8">
        {/* Logo et description */}
        <div className="text-center mb-8">
          <Image
            src="/images/logos/logo-white.svg"
            alt="VIENS ON S'CONNAÎT"
            width={140}
            height={42}
            className="h-10 w-auto mx-auto mb-4"
          />
          <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed">
            Des jeux de cartes pour tisser des liens plus forts avec vos proches.
          </p>
        </div>

        {/* Réseaux sociaux */}
        <div className="mb-8">
          <h3 className="text-center text-white font-semibold mb-4 text-sm">
            Suivez-nous
          </h3>
          <div className="flex justify-center space-x-6">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  aria-label={social.name}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Contact info minimaliste */}
        <div className="mb-8 text-center">
          <h3 className="text-white font-semibold mb-4 text-sm">Contact</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <MapPin className="w-4 h-4 text-brand-pink" />
              <span>Dakar, Sénégal</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <Phone className="w-4 h-4 text-brand-pink" />
              <a href="tel:+221781362728" className="hover:text-white transition-colors">
                +221 78 136 27 28
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <Mail className="w-4 h-4 text-brand-pink" />
              <a href="mailto:bonjour@viensonsconnait.com" className="hover:text-white transition-colors">
                bonjour@viensonsconnait.com
              </a>
            </div>
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="mb-8">
          <h3 className="text-center text-white font-semibold mb-4 text-sm">
            Navigation
          </h3>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-center text-white/70 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/10 transition-all"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ✅ TEMPORAIREMENT COMMENTÉ : Sélecteur de thème
        <div className="mb-8">
          <h3 className="text-center text-white font-semibold mb-4 text-sm">
            Préférences
          </h3>
          <div className="max-w-xs mx-auto">
            <ThemeToggleWithLabel />
          </div>
        </div>
        */}

        {/* ✅ NOUVEAU : Section temporaire pour le changement de thème (solution de contournement) */}
        <div className="mb-8">
          <h3 className="text-center text-white font-semibold mb-4 text-sm">
            Préférences
          </h3>
          <div className="max-w-xs mx-auto">
            <button 
              onClick={() => {
                // Logique temporaire pour changer le thème
                const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                
                // Mettre à jour les classes
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(newTheme);
                
                // Sauvegarder dans localStorage
                try {
                  localStorage.setItem('vosc-theme', newTheme);
                } catch (error) {
                  console.warn('Cannot save theme to localStorage');
                }
                
                // Mettre à jour les variables CSS
                const root = document.documentElement;
                if (newTheme === 'light') {
                  root.style.setProperty('--bg-primary', '#ffffff');
                  root.style.setProperty('--bg-secondary', '#f8f9fa');
                  root.style.setProperty('--text-primary', '#1a1a1a');
                  root.style.setProperty('--text-secondary', '#6b7280');
                  root.style.setProperty('--header-bg', '#132D5D');
                  root.style.setProperty('--footer-bg', '#132D5D');
                  root.style.setProperty('--card-bg', '#ffffff');
                  root.style.setProperty('--border-color', '#e5e7eb');
                } else {
                  root.style.setProperty('--bg-primary', '#000000');
                  root.style.setProperty('--bg-secondary', '#1a1a1a');
                  root.style.setProperty('--text-primary', '#ffffff');
                  root.style.setProperty('--text-secondary', '#9ca3af');
                  root.style.setProperty('--header-bg', '#000000');
                  root.style.setProperty('--footer-bg', '#000000');
                  root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.1)');
                  root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
                }
              }}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 group w-full text-left"
            >
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <div className="text-white font-medium text-sm">
                  Changer le thème
                </div>
                <div className="text-white/70 text-xs">
                  Basculer entre clair et sombre
                </div>
              </div>

              <div className="flex-shrink-0 w-8 h-4 rounded-full border-2 border-white/40 bg-white/20 relative">
                <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform duration-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Liens légaux */}
        <div className="border-t border-white/10 pt-6 mb-6">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            {legalLinks.map((link, index) => (
              <span key={link.name} className="flex items-center">
                <Link
                  href={link.href}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
                {index < legalLinks.length - 1 && (
                  <span className="text-white/30 ml-4">•</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} VIENS ON S'CONNAÎT
          </p>
          <p className="text-white/40 text-xs mt-1">
            Tous droits réservés
          </p>
        </div>

        {/* Badge "Made in Senegal" */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <span className="text-lg">🇸🇳</span>
            <span className="text-white/70 text-xs font-medium">
              Made in Senegal
            </span>
          </div>
        </div>

        {/* Safe area pour les mobiles avec encoche */}
        <div className="h-safe-bottom" />
      </div>
    </footer>
  );
}