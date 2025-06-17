// src/features/home/components/mobile/HeroCarousel.tsx - VERSION SLIDE + KEN BURNS
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

// Animation variants pour les transitions modernes
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

// Ken Burns effect pour les images
const kenBurnsVariants = {
  enter: {
    scale: 1.2,
    x: 0,
    y: 0
  },
  center: {
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 8,
      ease: "easeOut"
    }
  },
  exit: {
    scale: 1.1,
    transition: {
      duration: 0.6
    }
  }
};

// Animation pour le contenu qui slide
const contentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.8,
      ease: "easeOut"
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: {
      duration: 0.4
    }
  })
};

export default function HeroCarousel({ className = "" }: HeroCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<ProductWithTags[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [direction, setDirection] = useState(0);
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

  // Navigation avec direction
  const navigate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex(prevIndex => {
      if (newDirection > 0) {
        return (prevIndex + 1) % products.length;
      } else {
        return (prevIndex - 1 + products.length) % products.length;
      }
    });
  }, [products.length]);

  // Auto-play avec direction
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      navigate(1); // Toujours vers la droite en auto
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

  // Gestion du swipe avec direction
  const handleSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const swipeThreshold = SWIPE_THRESHOLD;
    
    if (Math.abs(offset.x) > swipeThreshold) {
      stopAutoPlay();
      if (offset.x > 0) {
        navigate(-1); // Swipe vers la droite = image précédente
      } else {
        navigate(1);  // Swipe vers la gauche = image suivante
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

  // Navigation manuelle avec direction
  const goToSlide = (index: number) => {
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

  console.log('🖼️ Current hero image path:', heroImagePath);

  return (
    <div className={`relative overflow-hidden transition-all duration-300 bg-theme-primary ${
      isAnnouncementVisible ? 'h-[70vh] min-h-[400px]' : 'h-[70vh] min-h-[400px]'
    } ${className}`}>
      {/* Background avec dégradé adaptatif au thème */}
      <div className="absolute inset-0 bg-theme-primary" />
      
      {/* Container pour les slides */}
      <div className="relative w-full h-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.6 }
            }}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleSwipe}
            onTouchStart={stopAutoPlay}
            onTouchEnd={startAutoPlay}
          >
            {/* Image avec Ken Burns effect */}
            <motion.div 
              className="absolute inset-0 w-full h-full"
              variants={kenBurnsVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
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
            </motion.div>

            {/* Overlay dégradé */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Contenu avec animation indépendante */}
            <motion.div
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className={`relative z-10 h-full flex flex-col justify-end p-4 ${
                isAnnouncementVisible ? 'pb-6' : 'pb-6'
              }`}
            >
              {/* Titre */}
              <motion.h1 
                className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {currentProduct.name}
              </motion.h1>

              {/* Tags */}
              <motion.div 
                className="flex items-center gap-2 mb-3 text-white/80 flex-wrap"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
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
              </motion.div>

              {/* Prix */}
              {formattedPrice && (
                <motion.div 
                  className="flex items-center gap-3 mb-4 flex-wrap"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <span className="text-xl md:text-2xl font-bold text-white">
                    {formattedPrice}
                  </span>
                  {discountPercentage && discountPercentage > 0 && (
                    <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                      -{discountPercentage}%
                    </span>
                  )}
                </motion.div>
              )}

              {/* Boutons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-3 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
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
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicateurs avec animation */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
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
          />
        ))}
      </div>

      {/* Scroll indicator avec animation */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-white/60"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Navigation arrows (optionnel, masqué par défaut sur mobile) */}
      <div className="hidden md:block">
        {currentIndex > 0 && (
          <motion.button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-3 z-20 hover:bg-black/70 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown className="w-6 h-6 text-white rotate-90" />
          </motion.button>
        )}
        
        {currentIndex < products.length - 1 && (
          <motion.button
            onClick={() => navigate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-3 z-20 hover:bg-black/70 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown className="w-6 h-6 text-white -rotate-90" />
          </motion.button>
        )}
      </div>
    </div>
  );
}