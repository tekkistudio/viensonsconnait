// src/features/product/components/mobile/MobileProductPageContent.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Star, 
  Heart, 
  Share2, 
  Eye, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Play,
  Users,
  Award,
  TrendingUp,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLayoutContext } from '@/core/context/LayoutContext';
import { useChatStore } from '@/stores/chatStore';
import { ConversationalCartService } from '@/lib/services/ConversationalCartService';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { productStatsService } from '@/lib/services/product-stats.service';
import useCountryStore from '@/core/hooks/useCountryStore';
import { getProductImages, generateImageProps } from '@/utils/image';
import type { Product } from '@/types/product';
import dynamic from 'next/dynamic';
import MobileRelatedProducts from './MobileRelatedProducts';

// Imports dynamiques
const MobileChatContainer = dynamic(() => import('../ProductChat/components/MobileChatContainer'), {
  ssr: false
});

const ProductTestimonials = dynamic(() => import('../ProductTestimonials'), {
  ssr: false
});

const RelatedProducts = dynamic(() => import('../RelatedProducts'), {
  ssr: false
});

interface MobileProductPageContentProps {
  productId: string;
  product: Product;
}

// ID du store par défaut pour VOSC
const VOSC_STORE_ID = 'a9563f88-217c-4998-b080-ed39f637ea31';

// Données de témoignages de fallback
const fallbackTestimonials = [
  {
    id: '1',
    author_name: 'Aminata D.',
    author_location: 'Dakar, Sénégal',
    content: 'Ce jeu a transformé nos soirées en couple. Nous nous découvrons encore après 5 ans de mariage !',
    rating: 5
  },
  {
    id: '2',
    author_name: 'Ibrahim K.',
    author_location: 'Abidjan, Côte d\'Ivoire',
    content: 'Mes enfants adorent jouer avec nous. C\'est devenu notre tradition du dimanche soir.',
    rating: 5
  },
  {
    id: '3',
    author_name: 'Fatou M.',
    author_location: 'Casablanca, Maroc',
    content: 'Un cadeau parfait pour mes amies. Nous avons ri et pleuré en même temps !',
    rating: 5
  }
];

export default function MobileProductPageContent({ productId, product }: MobileProductPageContentProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const { setHideDukkaBadge } = useLayoutContext();
  
  // ✅ NOUVEAU: Stats produit temps réel
  const [realProductStats, setRealProductStats] = useState({
    sold: product.stats?.sold || 0,
    currentViewers: 1,
    loading: true
  });
  
  // Stats des témoignages synchronisées
  const [realTestimonialStats, setRealTestimonialStats] = useState({
    count: 0,
    average: 0
  });
  
  // Témoignages
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  
  // Chat store
  const { 
    sessionId, 
    initializeSession, 
    addMessage,
    orderData,
    flags 
  } = useChatStore();
  
  const [cartService] = useState(() => ConversationalCartService.getInstance());
  const galleryRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  // Images du produit
  const productImages = getProductImages(product);
  const formattedPrice = convertPrice(product.price)?.formatted;

  // ✅ NOUVEAU: Charger les vraies stats produit en temps réel
  useEffect(() => {
    const loadRealProductStats = async () => {
      try {
        // Tracker la vue de produit avec visitor ID
        const visitorId = localStorage.getItem('visitorId') || 
                         `visitor_${Date.now()}_${Math.random()}`;
        localStorage.setItem('visitorId', visitorId);

        await productStatsService.trackProductView(product.id, visitorId);

        // Charger les stats initiales
        const stats = await productStatsService.getProductStats(product.id);
        setRealProductStats({
          sold: stats.sold || product.stats?.sold || 0,
          currentViewers: stats.currentViewers || 1,
          loading: false
        });

        // Mettre à jour toutes les 30 secondes
        const interval = setInterval(async () => {
          try {
            const updatedStats = await productStatsService.getProductStats(product.id);
            setRealProductStats(prev => ({
              ...prev,
              sold: updatedStats.sold || prev.sold,
              currentViewers: updatedStats.currentViewers || prev.currentViewers
            }));
          } catch (error) {
            console.error('Error updating stats:', error);
          }
        }, 30000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error loading product stats:', error);
        setRealProductStats({
          sold: product.stats?.sold || 0,
          currentViewers: 1,
          loading: false
        });
      }
    };

    if (product.id) {
      loadRealProductStats();
    }
  }, [product.id, product.stats]);

  // Charger les stats des témoignages
  useEffect(() => {
    const loadTestimonialStats = async () => {
      try {
        const [count, average, productTestimonials] = await Promise.all([
          testimonialsService.getTestimonialsCountByProduct(product.id),
          testimonialsService.getAverageRating(product.id),
          testimonialsService.getProductTestimonials(product.id)
        ]);
        
        setRealTestimonialStats({
          count: count || 0,
          average: average || 5
        });

        if (productTestimonials && productTestimonials.length > 0) {
          setTestimonials(productTestimonials);
        }
      } catch (error) {
        console.error('Error loading testimonial stats:', error);
        setRealTestimonialStats({
          count: product.stats?.reviews || 15,
          average: product.stats?.satisfaction || 4.9
        });
      }
    };

    if (product.id) {
      loadTestimonialStats();
    }
  }, [product.id, product.stats]);

  // Initialisation de la session
  useEffect(() => {
    let isMounted = true;

    const initializeProductPage = async () => {
      if (!product?.id || !isMounted || isInitialized) return;

      try {
        setIsInitialized(true);

        if (sessionId && orderData?.items && orderData.items.length > 0) {
          const currentProductInCart = orderData.items.find(item => item.productId === product.id);
          
          if (!currentProductInCart) {
            const navigationMessage = await cartService.handleProductNavigation(
              sessionId, 
              product.id,
              orderData.items[0]?.productId
            );
            
            if (navigationMessage && navigationMessage.metadata?.flags?.hasExistingCart) {
              addMessage(navigationMessage);
            }
          }
        }
        
        if (initializeSession) {
          initializeSession(product.id, VOSC_STORE_ID);
        }
        
      } catch (error) {
        console.error('❌ Error initializing product page:', error);
        setIsInitialized(true);
      }
    };

    initializeProductPage();
    
    return () => {
      isMounted = false;
    };
  }, [product.id, sessionId, orderData, isInitialized, cartService, initializeSession, addMessage]);

  // Gestion de la visibilité du badge
  useEffect(() => {
    setHideDukkaBadge(isChatFullscreen);
    return () => setHideDukkaBadge(false);
  }, [isChatFullscreen, setHideDukkaBadge]);

  // Auto-rotation des témoignages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonialIndex(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Gestion du swipe pour la galerie
  const handleImageSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const swipeThreshold = 50;
    
    if (Math.abs(offset.x) > swipeThreshold) {
      if (offset.x > 0 && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      } else if (offset.x < 0 && currentImageIndex < productImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
    }
  };

  // Gestion du clic sur le bouton d'intérêt
  const handleInterestClick = async () => {
    try {
      if (orderData?.items && orderData.items.length > 0) {
        const hasCurrentProduct = orderData.items.some(item => item.productId === product.id);
        
        if (!hasCurrentProduct) {
          const addToCartMessage = await cartService.addProductToCart(sessionId, product.id, 1);
          addMessage(addToCartMessage);
          setIsChatFullscreen(true);
          return;
        }
      }
      
      setIsChatFullscreen(true);
      
    } catch (error) {
      console.error('❌ Error handling interest click:', error);
      setIsChatFullscreen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className={`${isChatFullscreen ? 'hidden' : 'block'}`}>
        
        {/* Hero Image Gallery */}
        <section className="relative h-[70vh] overflow-hidden pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleImageSwipe}
            >
              <Image
                {...generateImageProps(productImages[currentImageIndex], product.name, true)}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Product Info Overlay - VERSION SIMPLIFIÉE AVEC STATS RÉELLES */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Titre */}
              <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
                {product.name}
              </h1>

              {/* Rating et avis */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(realTestimonialStats.average)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-theme-secondary text-sm">
                  {realTestimonialStats.count} avis
                </span>
                <div className="flex items-center gap-1 text-white/60 text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {realProductStats.loading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${realProductStats.sold?.toLocaleString() || '0'} ventes`
                    )}
                  </span>
                </div>
              </div>

              {/* Prix avec badge de réduction */}
              <div className="flex items-center gap-3 mb-4">
                {formattedPrice && (
                  <span className="text-3xl font-bold text-white">
                    {formattedPrice}
                  </span>
                )}
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                    -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                  </span>
                )}
              </div>
            </motion.div>
          </div>

          {/* Image Navigation */}
          {productImages.length > 1 && (
            <>
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                {productImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentImageIndex 
                        ? 'bg-white w-8' 
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
              
              {currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(prev => prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-2 z-20"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}
              
              {currentImageIndex < productImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(prev => prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-2 z-20"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </>
          )}
        </section>

        {/* Quick Stats avec données réelles temps réel */}
        <section className="py-6 -mt-8 relative z-10">
          <div className="px-6">
            <div className="grid grid-cols-3 gap-4">
              <motion.div 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold">{Math.round((realTestimonialStats.average || 4.9) * 10) / 10}/5</span>
                </div>
                <span className="text-white/60 text-xs">Satisfaction</span>
              </motion.div>
              
              <motion.div 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                  <Award className="w-4 h-4" />
                  {realProductStats.loading ? (
                    <div className="w-12 h-4 bg-blue-400/30 rounded animate-pulse" />
                  ) : (
                    <span className="font-bold">{realProductStats.sold?.toLocaleString() || '0'}</span>
                  )}
                </div>
                <span className="text-white/60 text-xs">Ventes</span>
              </motion.div>
              
              <motion.div 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-1 text-brand-pink mb-1">
                  <Users className="w-4 h-4" />
                  <span className="font-bold">{realTestimonialStats.count || 0}</span>
                </div>
                <span className="text-white/60 text-xs">Avis</span>
              </motion.div>
            </div>
            
            {/* Indicateur de confiance avec stats temps réel */}
            <div className="flex items-center justify-center gap-2 mt-4 text-white/50 text-xs">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              <span>
                {realProductStats.loading ? (
                  "Chargement des stats..."
                ) : (
                  `${realProductStats.currentViewers || 1} ${realProductStats.currentViewers === 1 ? 'personne est en ligne' : 'personnes sont en ligne'} • Produit vérifié`
                )}
              </span>
            </div>
          </div>
        </section>

        {/* CTA Button amélioré avec feedback visuel */}
        <section className="py-6">
          <div className="px-6">
            <motion.button
              onClick={handleInterestClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-brand-pink to-red-500 text-white py-4 px-8 rounded-full flex items-center justify-center gap-3 shadow-lg font-bold text-lg relative overflow-hidden"
            >
              {/* Effet de brillance au survol */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              
              <MessageCircle className="w-6 h-6 relative z-10" />
              <span className="relative z-10">
                {orderData?.items && orderData.items.length > 0 
                  ? "Ajouter à ma commande" 
                  : "Ce jeu m'intéresse"
                }
              </span>
            </motion.button>
            
            <div className="text-center mt-3">
              <p className="text-white/40 text-xs mt-1">
                Cliquez pour commander ce jeu ou en savoir plus
              </p>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="py-6">
          <div className="px-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-bold text-lg mb-3">A Propos de ce Jeu</h3>
              <p className="text-white/90 leading-relaxed">
                {product.description 
                  ? product.description.length > 300 
                    ? `${product.description.substring(0, 300).trim()}...`
                    : product.description
                  : `Découvrez ${product.name}, un jeu conçu pour créer des moments authentiques et renforcer vos relations avec vos proches. Chaque carte a été soigneusement élaborée pour encourager des conversations profondes et significatives.`
                }
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Carousel */}
        <section className="py-6">
          <div className="px-6">
            <h3 className="text-white font-bold text-lg mb-4">Ce que disent nos clients</h3>
            
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonialIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-brand-pink rounded-full w-10 h-10 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {testimonials[currentTestimonialIndex]?.author_name[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">
                        {testimonials[currentTestimonialIndex]?.author_name}
                      </h4>
                      <p className="text-white/60 text-sm">
                        {testimonials[currentTestimonialIndex]?.author_location}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-white/90 mb-4 italic">
                    "{testimonials[currentTestimonialIndex]?.content}"
                  </p>
                  
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (testimonials[currentTestimonialIndex]?.rating || 5)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex justify-center gap-1 mt-4">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonialIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentTestimonialIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Related Products Mobile */}
        <section className="py-8">
          <div className="px-6">
            <MobileRelatedProducts
              currentProductId={product.id}
              productCategory={product.category}
            />
          </div>
        </section>
      </div>

      {/* Chat Fullscreen */}
      {isChatFullscreen && (
        <div className="fixed inset-0 bg-white z-[100]">
          <MobileChatContainer
            product={product}
            storeId={VOSC_STORE_ID}
            onBackClick={() => setIsChatFullscreen(false)}
          />
        </div>
      )}
    </div>
  );
}