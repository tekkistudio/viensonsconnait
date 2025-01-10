// src/components/layouts/Footer.tsx
"use client";

import { Facebook, Instagram, Mail, MapPin, Phone, Smartphone } from "lucide-react";
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
    icon: Smartphone,
  },
];

const quickLinks = [
  { name: "Accueil", href: "/" },
  { name: "Notre Histoire", href: "/notre-histoire" },
  { name: "Nos Jeux", href: "/nos-jeux" },
  { name: "Blog", href: "/blog" },
];

const products = [
  { name: "Pour les Couples", href: "/products/couples" },
  { name: "Pour les Mariés", href: "/products/maries" },
  { name: "Pour la Famille", href: "/products/famille" },
  { name: "Pour les Amis", href: "/products/amis" },
];

const contactInfo = [
  {
    icon: MapPin,
    text: "Dakar, Sénégal",
  },
  {
    icon: Phone,
    text: "+221 78 136 27 28",
  },
  {
    icon: Phone,
    text: "+221 33 830 54 22",
  },
  {
    icon: Mail,
    text: "bonjour@viensonsconnait.com",
  },
];

export default function Footer() {
  return (
    <div className="bg-brand-blue text-white">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <Image
              src="/images/logos/logo-white.svg"
              alt="VIENS ON S'CONNAÎT"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
            <p className="text-base text-white/80">
              Des jeux de cartes uniques pour tisser des liens plus forts avec
              vos proches, une carte à la fois.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-pink transition-colors"
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/80 hover:text-brand-pink transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-bold mb-4">Nos Jeux</h3>
            <ul className="space-y-2">
              {products.map((product) => (
                <li key={product.name}>
                  <Link
                    href={product.href}
                    className="text-white/80 hover:text-brand-pink transition-colors"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-4">
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <li key={index} className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-brand-pink shrink-0" />
                    <span className="text-sm text-white/80">{info.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:pr-32 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/80 text-center md:text-left">
              © {new Date().getFullYear()} VIENS ON S'CONNAÎT. Tous droits
              réservés.
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-white/80">
              <Link
                href="/mentions-legales"
                className="hover:text-brand-pink transition-colors"
              >
                Mentions Légales
              </Link>
              <Link
                href="/politique-confidentialite"
                className="hover:text-brand-pink transition-colors"
              >
                Politique de Confidentialité
              </Link>
              <Link
                href="/cgv"
                className="hover:text-brand-pink transition-colors"
              >
                CGV
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}