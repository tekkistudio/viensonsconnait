// src/features/home/components/mobile/HeroCarousel.tsx - VERSION FADE AVEC BACKGROUNDS CORRIGÉS
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

// Animation variants pour transition en fondu
const fadeVariants = {
  enter: {
    opacity: 0,
    scale: 1.05
  },
  center: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
};

// Ken Burns effect pour les images
const kenBurnsVariants = {
  enter: {
    scale: 1.1
  },
  center: {
    scale: 1,
    transition: {
      duration: 10,
      ease: "easeOut"
    }
  }
};

// Animation pour le contenu
const contentVariants = {
  enter: {
    y: 30,
    opacity: 0
  },
  center: {
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.3,
      duration: 0.6,
      ease: "easeOut"
    }
  },
  exit: {
    y: -30,
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
};

export default function HeroCarousel({ className = "" }: HeroCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<ProductWithTags[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
        
        setProducts(featuredProducts);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Navigation avec fondu
  const navigate = useCallback((newDirection: number) => {
    if (isTransitioning) return; // Empêcher les transitions rapides
    
    setIsTransitioning(true);
    setDirection(newDirection);
    
    setTimeout(() => {
      setCurrentIndex(prevIndex => {
        if (newDirection > 0) {
          return (prevIndex + 1) % products.length;
        } else {
          return (prevIndex - 1 + products.length) % products.length;
        }
      });
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }, 100);
  }, [products.length, isTransitioning]);

  // Auto-play
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      navigate(1);
    }, AUTO_PLAY_INTERVAL);
  }, [navigate]);

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

  // Gestion du swipe
  const handleSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const swipeThreshold = SWIPE_THRESHOLD;
    
    if (Math.abs(offset.x) > swipeThreshold && !isTransitioning) {
      stopAutoPlay();
      if (offset.x > 0) {
        navigate(-1);
      } else {
        navigate(1);
      }
      setTimeout(startAutoPlay, 3000);
    }
  };

  const handleDiscoverProduct = (product: Product) => {
    router.push(`/products/${product.slug || product.id}`);
  };

  const handleViewAllGames = () => {
    router.push('/nos-jeux');
  };

  // Navigation manuelle
  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    
    const newDirection = index > currentIndex ? 1 : -1;
    setDirection(newDirection);
    setCurrentIndex(index);
    stopAutoPlay();
    setTimeout(startAutoPlay, 3000);
  };

  if (isLoading) {
    return (
      <div className={`relative bg-theme-primary ${
        isAnnouncementVisible ? 'h-[70vh] min-h-[400px]' : 'h-[70vh] min-h-[400px]'
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

  return (
    <div className={`relative overflow-hidden transition-all duration-300 bg-theme-primary ${
      isAnnouncementVisible ? 'h-[70vh] min-h-[400px]' : 'h-[70vh] min-h-[400px]'
    } ${className}`}>
      
      {/* Container pour les slides - FOND FIXE SANS CLASSE CAROUSEL-NO-FLASH */}
      <div className="relative w-full h-full bg-theme-primary">
        {/* Images en arrière-plan avec transition fade */}
        <div className="absolute inset-0">
          {products.map((product, index) => {
            const isActive = index === currentIndex;
            const imagePath = getHeroImage(product);
            
            return (
              <motion.div
                key={`bg-${product.id}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 1.05
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeInOut"
                }}
                style={{ zIndex: isActive ? 1 : 0 }}
              >
                <Image
                  {...generateImageProps(imagePath, product.name, true)}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={index === 0}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Overlay dégradé */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

        {/* Contenu avec animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`relative z-20 h-full flex flex-col justify-end p-4 ${
              isAnnouncementVisible ? 'pb-6' : 'pb-6'
            }`}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleSwipe}
            onTouchStart={stopAutoPlay}
            onTouchEnd={startAutoPlay}
          >
            {/* Titre */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
              {currentProduct.name}
            </h1>

            {/* Tags - AVEC BACKGROUND PRESERVÉ */}
            <div className="flex items-center gap-2 mb-3 text-white/80 flex-wrap">
              {productTags.slice(0, 3).map((tag: string, index: number) => (
                <React.Fragment key={tag}>
                  <span 
                    className="text-xs backdrop-blur-sm px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    {tag}
                  </span>
                  {index < Math.min(productTags.length - 1, 2) && (
                    <span className="w-1 h-1 bg-white/60 rounded-full" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Prix */}
            {formattedPrice && (
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xl md:text-2xl font-bold text-white">
                  {formattedPrice}
                </span>
                {discountPercentage && discountPercentage > 0 && (
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    -{discountPercentage}%
                  </span>
                )}
              </div>
            )}

            {/* Boutons - AVEC BACKGROUNDS PRESERVÉS */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <motion.button
                onClick={() => handleDiscoverProduct(currentProduct)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-lg text-sm"
                style={{ 
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <Eye className="w-4 h-4" />
                <span>Découvrir ce jeu</span>
              </motion.button>
              
              <motion.button
                onClick={handleViewAllGames}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors backdrop-blur-sm border text-sm"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Voir tous les jeux</span>
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicateurs avec animation */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-30">
        {products.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === currentIndex 
                ? 'bg-white w-8' 
                : 'bg-white/40 hover:bg-white/60 w-2'
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            disabled={isTransitioning}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30">
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