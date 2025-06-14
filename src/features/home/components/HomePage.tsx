// src/features/home/components/HomePage.tsx - NOUVELLE VERSION MOBILE-FIRST
"use client"

import React from 'react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import { useProductsLayout } from '../../../features/shop/hooks/useProductsLayout';

// Composants existants (desktop)
import { HeroSection } from './sections/HeroSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { ProductsGridSection } from './sections/ProductsGridSection';
import { WhyUsSection } from './sections/WhyUsSection';
import { MobileAppSection } from './sections/MobileAppSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { NewsletterSection } from './sections/NewsletterSection';
import { FAQSection } from './sections/FAQSection';

// Nouveaux composants mobiles
import NetflixHeroCarousel from './mobile/HeroCarousel';
import ProductMiniCarousel from './mobile/ProductMiniCarousel';
import MobileWhyUsSection from './mobile/MobileWhyUsSection';
import MobileUniquenessSection from './mobile/MobileUniquenessSection';
import MobileTestimonialsSection from './mobile/MobileTestimonialsSection';
import MobileAppDownloadSection from './mobile/MobileAppDownloadSection';
import MobileWhatsAppSection from './mobile/MobileWhatsAppSection';

const HERO_DATA = {
  title: "Tissez des liens plus forts, une carte à la fois",
  description: "Découvrez nos jeux de cartes conçus pour renforcer vos relations avec votre partenaire, votre famille, vos amis, vos collègues, etc.",
  videoUrl: "https://player.vimeo.com/video/1031269898",
  videoCoverImage: "/images/video-cover.png"
};

export default function HomePage() {
  const { isMobile } = useBreakpoint();
  const { layout } = useProductsLayout('grid');

  // Version mobile Netflix-style
  if (isMobile) {
    return (
      <main className="flex-1 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
        {/* Hero Carousel Netflix-style */}
        <NetflixHeroCarousel className="relative z-10" />
        
        {/* Carrousel de miniatures */}
        <ProductMiniCarousel className="relative z-20 -mt-20" />
        
        {/* Sections mobile optimisées */}
        <div className="relative z-10 space-y-0">
          {/* Section: Pourquoi jouer à nos jeux */}
          <MobileWhyUsSection />
          
          {/* Section: En quoi sommes-nous uniques */}
          <MobileUniquenessSection />
          
          {/* Section: Application mobile */}
          <MobileAppDownloadSection />
          
          {/* Section: Témoignages clients */}
          <MobileTestimonialsSection />
          
          {/* Section: Communauté WhatsApp */}
          <MobileWhatsAppSection />
        </div>
      </main>
    )
  }

  // Version desktop (existante)
  return (
    <main className="flex-1">
      <HeroSection {...HERO_DATA} />
      <CategoriesSection />
      <div className="w-full bg-brand-white py-16">
        <ProductsGridSection 
          className="py-12"
          initialLayout={layout}
        />
      </div>
      <WhyUsSection />
      <MobileAppSection />
      <TestimonialsSection />
      <FAQSection />
      <NewsletterSection />
    </main>
  );
  }