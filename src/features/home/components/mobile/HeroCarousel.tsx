// src/features/home/components/mobile/HeroCarousel.tsx - VERSION AVEC DEBUG
"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Play, Info, ChevronDown, Eye } from 'lucide-react';
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

export default function HeroCarousel({ className = "" }: HeroCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showProductInfo, setShowProductInfo] = useState(false);
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
        // Trier par ordre d'affichage et prendre les 5 premiers
        const featuredProducts = data
          .filter(p => p.status === 'active')
          .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
          .slice(0, 5);
        
        console.log('🎮 Products loaded for hero:', featuredProducts.map(p => ({
          name: p.name,
          category: p.category,
          metadataCategory: p.metadata?.category
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

  const handleProductClick = (product: Product) => {
    router.push(`/products/${product.slug || product.id}`);
  };

  if (isLoading) {
    return (
      <div className={`relative h-[70vh] bg-gradient-to-b from-gray-900 to-black ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

  console.log('🖼️ Current hero image path:', heroImagePath);

  return (
    <div 
      className={`relative overflow-hidden transition-all duration-300 ${
        isAnnouncementVisible ? 'h-[100vh] pt-12' : 'h-[100vh]'
      } ${className}`}
    >
      {/* Background avec dégradé - COUVRE TOUT L'ÉCRAN */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black/80 to-black" />
      
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

          {/* Contenu avec padding-top conditionnel */}
          <div className={`relative z-10 h-full flex flex-col justify-end p-6 ${
            isAnnouncementVisible ? 'pb-20 pt-16' : 'pb-20'
          }`}>
            {/* Badge */}
            {currentProduct.badges && currentProduct.badges.length > 0 && (
              <div className="mb-4">
                <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                  {currentProduct.badges[0].text}
                </span>
              </div>
            )}

            {/* Titre */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {currentProduct.name}
            </h1>

            {/* Genres/Tags */}
            <div className="flex items-center gap-2 mb-4 text-white/80">
              <span className="text-sm">Conversations</span>
              <span className="w-1 h-1 bg-white/60 rounded-full" />
              <span className="text-sm">Relations</span>
              <span className="w-1 h-1 bg-white/60 rounded-full" />
              <span className="text-sm">Connexion</span>
            </div>

            {/* Description courte */}
            <p className="text-white/90 text-base mb-6 max-w-md line-clamp-2">
              {currentProduct.description 
                ? currentProduct.description.length > 80 
                  ? `${currentProduct.description.substring(0, 80).trim()}...`
                  : currentProduct.description
                : `Découvrez ${currentProduct.name}, un jeu conçu pour créer des moments authentiques.`
              }
            </p>

            {/* Prix */}
            {formattedPrice && (
              <div className="mb-6">
                <span className="text-2xl font-bold text-white">
                  {formattedPrice}
                </span>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <button
                onClick={() => handleProductClick(currentProduct)}
                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                <Eye className="w-5 h-5 fill-current" />
                <span>Découvrir</span>
              </button>
              
              <button
                onClick={() => setShowProductInfo(!showProductInfo)}
                className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                <Info className="w-5 h-5" />
                <span>Plus d'infos</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicateurs */}
      <div className="absolute bottom-6 left-6 flex gap-2 z-20">
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
                ? 'bg-white w-8' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-white/60"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </div>

      {/* Info Panel (optionnel) */}
      <AnimatePresence>
        {showProductInfo && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-xl p-6 z-30"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{currentProduct.name}</h3>
              <button
                onClick={() => setShowProductInfo(false)}
                className="text-white/60 hover:text-white"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
            <p className="text-white/80 mb-4">
              {currentProduct.description}
            </p>
            <button
              onClick={() => handleProductClick(currentProduct)}
              className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold hover:bg-brand-pink/90 transition-colors"
            >
              Voir ce jeu - {formattedPrice}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}