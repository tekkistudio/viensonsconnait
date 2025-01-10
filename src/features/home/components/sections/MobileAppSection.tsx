// src/features/home/components/sections/MobileAppSection.tsx
"use client"

import { motion } from 'framer-motion';
import { Smartphone, Check } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    title: "Accès à tous vos jeux",
    description: "Jouez à tous les jeux VIENS ON S’CONNAÎT, à tout moment, directement depuis votre Smartphone."
  },
  {
    title: "Mode hors connexion",
    description: "Pas de connexion ? Pas de problème. Continuez à jouer même sans Internet."
  },
  {
    title: "Lecture Vocale des Questions",
    description: "Entendez vos questions préférées lues en Français, Anglais, Wolof, et plus encore."
  },
  {
    title: "Explication des Questions par l'IA",
    description: "Une question vous intrigue ? Notre IA est là pour vous aider à mieux la comprendre et enrichir vos discussions."
  }
];

export function MobileAppSection() {
  return (
    <section className="relative bg-brand-blue text-white overflow-hidden py-16 md:py-24">
      {/* Fond décoratif */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-transparent" />
        <svg
          className="absolute right-0 h-full w-1/2 transform translate-x-1/4 opacity-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 0C25 0 75 100 100 100V0H0Z"
            fill="currentColor"
            className="text-brand-pink"
          />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Contenu */}
          <motion.div 
            className="w-full md:w-1/2 space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 text-brand-pink">
              <Smartphone className="w-6 h-6" />
              <span className="text-lg font-medium">Application Mobile</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Vos jeux préférés,<br />
              dans votre poche
            </h2>

            <p className="text-lg text-white/90">
              Téléchargez l'application VIENS ON S'CONNAÎT et emportez vos jeux partout avec vous.
              Jouez partout avec vos proches grâce à des fonctionnalités innovantes et une expérience mobile unique.
            </p>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="bg-brand-pink rounded-full p-1 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/75">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="https://apps.apple.com/app/viensonsconnait/id6464125284"
                className="flex-shrink-0 transition-transform hover:-translate-y-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/badges/app-store-badge.svg"
                  alt="Télécharger sur l'App Store"
                  width={167}
                  height={50}
                  className="h-[50px] w-auto"
                />
              </a>
              <a
                href="#"
                className="flex-shrink-0 transition-transform hover:-translate-y-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/badges/play-store-badge.png"
                  alt="Télécharger sur Google Play"
                  width={167}
                  height={50}
                  className="h-[50px] w-auto"
                />
              </a>
            </div>
          </motion.div>

          {/* Image du mobile */}
          <motion.div 
            className="w-full md:w-1/2 flex justify-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-[280px] md:w-[320px] aspect-[9/16]">
              <Image
                src="/images/app/app-preview.png"
                alt="Application VIENS ON S'CONNAÎT"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default MobileAppSection;