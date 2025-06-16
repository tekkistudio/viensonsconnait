// src/features/home/components/mobile/HeroCarousel.tsx 
"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Play, ChevronDown, Eye, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';
import { generateImageProps, getHeroImage } from '@/utils/image';

const SWIPE_THRESHOLD = 50;
const AUTO_PLAY_INTERVAL = 5000;

interface HeroCarouselProps {
  className?: string;
}

interface ProductWithTags extends Product {
  tags?: string[];
}

export default function HeroCarousel({ className = "" }: HeroCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<ProductWithTags[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier la visibilité de la barre d'annonce
  useEffect(() => {
    const checkAnnouncementVisibility = () => {
      const wasClosed = sessionStorage.getItem('mobile-announcement-bar-closed');
      setIsAnnouncementVisible(wasClosed !== 'true');
    };

    checkAnnouncementVisibility();

    const handleAnnouncementClose = () => {
      setIsAnnouncementVisible(false);
    };

    window.addEventListener('announcementBarClosed', handleAnnouncementClose);
    
    return () => {
      window.removeEventListener('announcementBarClosed', handleAnnouncementClose);
    };
  }, []);

  // Charger les produits
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        const featuredProducts = data
          .filter(p => p.status === 'active')
          .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
          .slice(0, 5);
        
        console.log('🎮 Products loaded for hero:', featuredProducts.map(p => ({
          name: p.name,
          category: p.category,
          tags: (p as any).tags
        })));
        
        setProducts(featuredProducts);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Auto-play
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, AUTO_PLAY_INTERVAL);
  }, [products.length]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (products.length > 1) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [products.length, startAutoPlay, stopAutoPlay]);

  // Navigation
  const handleSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const swipeThreshold = SWIPE_THRESHOLD;
    
    if (Math.abs(offset.x) > swipeThreshold) {
      if (offset.x > 0) {
        setCurrentIndex(prev => (prev - 1 + products.length) % products.length);
      } else {
        setCurrentIndex(prev => (prev + 1) % products.length);
      }
      stopAutoPlay();
      setTimeout(startAutoPlay, 3000);
    }
  };

  const handleDiscoverProduct = (product: Product) => {
    router.push(`/products/${product.slug || product.id}`);
  };

  const handleViewAllGames = () => {
    router.push('/nos-jeux');
  };

  if (isLoading) {
    return (
      <div className={`relative bg-theme-primary ${
        isAnnouncementVisible ? 'h-[75vh] pt-12' : 'h-[75vh]'
      } ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const currentProduct = products[currentIndex];
  const heroImagePath = getHeroImage(currentProduct);
  const formattedPrice = convertPrice(currentProduct.price)?.formatted;
  
  // Calcul de la réduction
  const calculateDiscountPercentage = (originalPrice: number, currentPrice: number): number | null => {
    if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
      return null;
    }
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
    return Math.round(discount);
  };

  const discountPercentage = currentProduct.compareAtPrice 
    ? calculateDiscountPercentage(currentProduct.compareAtPrice, currentProduct.price)
    : null;

  const productTags = (currentProduct as any).tags && Array.isArray((currentProduct as any).tags) && (currentProduct as any).tags.length > 0 
    ? (currentProduct as any).tags 
    : ['Conversations', 'Relations', 'Connexion'];

  console.log('🖼️ Current hero image path:', heroImagePath);

  return (
  <div className={`relative overflow-hidden transition-all duration-300 bg-theme-primary ${
    isAnnouncementVisible ? 'h-[70vh] pt-12 min-h-[400px]' : 'h-[70vh] min-h-[400px]'
  } ${className}`}>
    {/* Background avec dégradé adaptatif au thème */}
    <div className="absolute inset-0 bg-theme-primary" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleSwipe}
          onTouchStart={stopAutoPlay}
          onTouchEnd={startAutoPlay}
        >
          {/* Image de fond */}
          <div className="absolute inset-0">
            <Image
              {...generateImageProps(heroImagePath, currentProduct.name, true)}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              onError={(e) => {
                console.error('❌ Image failed to load:', heroImagePath);
                const img = e.currentTarget;
                img.src = 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/placeholder.jpg';
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', heroImagePath);
              }}
            />
            {/* Overlay dégradé */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          {/* ✅ CONTENU OPTIMISÉ : Espacement réduit et hiérarchie adaptée */}
          <div className={`relative z-10 h-full flex flex-col justify-end p-4 ${
            isAnnouncementVisible ? 'pb-6 pt-16' : 'pb-6 pt-12'
          }`}>

            {/* Titre - Taille réduite */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
              {currentProduct.name}
            </h1>

            {/* Tags - Espacement réduit */}
            <div className="flex items-center gap-2 mb-3 text-white/80 flex-wrap">
              {productTags.slice(0, 3).map((tag: string, index: number) => (
                <React.Fragment key={tag}>
                  <span className="text-xs bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    {tag}
                  </span>
                  {index < Math.min(productTags.length - 1, 2) && (
                    <span className="w-1 h-1 bg-white/60 rounded-full" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Prix - Taille adaptée */}
            {formattedPrice && (
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xl md:text-2xl font-bold text-white">
                  {formattedPrice}
                </span>
                {discountPercentage && discountPercentage > 0 && (
                  <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    -{discountPercentage}%
                  </span>
                )}
              </div>
            )}

            {/* Boutons - Espacement optimisé */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <motion.button
                onClick={() => handleDiscoverProduct(currentProduct)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg text-sm"
              >
                <Eye className="w-4 h-4" />
                <span>Découvrir ce jeu</span>
              </motion.button>
              
              <motion.button
                onClick={handleViewAllGames}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/30 text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Voir tous les jeux</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicateurs - Position optimisée */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              stopAutoPlay();
              setTimeout(startAutoPlay, 3000);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white w-6' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Scroll indicator - Position adaptée */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-white/60"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
    </div>
  );
}