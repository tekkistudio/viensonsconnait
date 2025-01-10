// src/features/home/components/HomePage.tsx
"use client"

import React from 'react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import { useProductsLayout } from '../../../features/shop/hooks/useProductsLayout';

import {
  HeroSection,
  CategoriesSection,
  ProductsGridSection,
  WhyUsSection,
  MobileAppSection,
  TestimonialsSection,
  NewsletterSection,
  FAQSection,
} from './sections';

const HERO_DATA = {
  title: "Tissez des liens plus forts, une carte à la fois",
  description: "Découvrez nos jeux de société conçus pour renforcer vos relations avec votre partenaire, votre famille, vos amis, vos collègues, etc.",
  videoUrl: "https://player.vimeo.com/video/1031269898",
  videoCoverImage: "/images/video-cover.png"
};

export default function HomePage() {
  const { isMobile } = useBreakpoint();
  const { layout, setLayout } = useProductsLayout('grid');

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <HeroSection {...HERO_DATA} />

      {/* Categories Section - avec les animations améliorées */}
      <CategoriesSection />
      
      {/* Products Grid Section */}
      <div className="w-full bg-brand-white py-16">
        <ProductsGridSection 
          className="py-12"
          layout={layout}
        />
      </div>

      {/* Why Us Section - maintenant avec des statistiques mises à jour */}
      <WhyUsSection />
      
      {/* Section Application Mobile - Nouvelle section */}
      <MobileAppSection />
      
      {/* Testimonials Section - maintenant avec un carrousel sur mobile */}
      <TestimonialsSection />
      
      {/* FAQ Section - avec animations améliorées */}
      <FAQSection />
      
      {/* Newsletter Section - avec validation améliorée */}
      <NewsletterSection />
    </main>
  );
}