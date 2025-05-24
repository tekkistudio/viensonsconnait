// src/features/home/components/HomePage.tsx
"use client"

import React from 'react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import { useProductsLayout } from '../../../features/shop/hooks/useProductsLayout';

import { HeroSection } from './sections/HeroSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { ProductsGridSection } from './sections/ProductsGridSection';
import { WhyUsSection } from './sections/WhyUsSection';
import { MobileAppSection } from './sections/MobileAppSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { NewsletterSection } from './sections/NewsletterSection';
import { FAQSection } from './sections/FAQSection';

const HERO_DATA = {
  title: "Tissez des liens plus forts, une carte à la fois",
  description: "Découvrez nos jeux de société conçus pour renforcer vos relations avec votre partenaire, votre famille, vos amis, vos collègues, etc.",
  videoUrl: "https://player.vimeo.com/video/1031269898",
  videoCoverImage: "/images/video-cover.png"
};

export default function HomePage() {
  const { isMobile } = useBreakpoint();
  const { layout } = useProductsLayout('grid');

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