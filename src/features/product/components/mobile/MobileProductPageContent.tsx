// src/features/product/components/mobile/MobileProductPageContent.tsx 
// 🎯 VERSION FINALE OPTIMISÉE CONVERSION
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Star, 
  Eye, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Play,
  Users,
  Award,
  TrendingUp,
  Clock,
  ShoppingBag,
  Sparkles,
  Zap,
  CheckCircle,
  Download,
  Smartphone,
  Gift
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
import { useSafeTheme } from '@/core/context/ThemeContext';
import type { Product } from '@/types/product';
import dynamic from 'next/dynamic';
import { ensureProductData } from '@/lib/utils/productUtils';
import MobileRelatedProducts from './MobileRelatedProducts';
import StockIndicator from '@/components/ui/StockIndicator';
import { getStockInfo } from '@/utils/stock';

// Imports dynamiques
const MobileChatContainer = dynamic(() => import('../ProductChat/components/MobileChatContainer'), {
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
  const themeContext = useSafeTheme();
  const theme = themeContext?.theme || 'light';
  
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const { setHideDukkaBadge } = useLayoutContext();
  
  // Stats produit temps réel
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Images du produit
  const productImages = getProductImages(product);
  const formattedPrice = convertPrice(product.price)?.formatted;

  // Charger les vraies stats produit en temps réel
  useEffect(() => {
    const loadRealProductStats = async () => {
      try {
        const visitorId = localStorage.getItem('visitorId') || 
                         `visitor_${Date.now()}_${Math.random()}`;
        localStorage.setItem('visitorId', visitorId);

        await productStatsService.trackProductView(product.id, visitorId);

        const stats = await productStatsService.getProductStats(product.id);
        setRealProductStats({
          sold: stats.sold || product.stats?.sold || 0,
          currentViewers: stats.currentViewers || 1,
          loading: false
        });

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

  // Sticky scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation simple pour le carousel
  const handlePrevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  // Gestion du swipe
  const handleImageSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const swipeThreshold = 50;
    
    if (Math.abs(offset.x) > swipeThreshold) {
      if (offset.x > 0) {
        handlePrevImage();
      } else {
        handleNextImage();
      }
    }
  };

  // Gestion du clic sur le bouton d'intérêt
  const handleInterestClick = async () => {
    try {
      // Vérifier le stock avant d'ouvrir le chat
      const stockInfo = getStockInfo(product.stock_quantity);
      
      if (stockInfo.status === 'out_of_stock') {
        // Tu peux afficher un message ou rediriger vers une liste d'attente
        alert('Désolé, ce produit est actuellement en rupture de stock. Contactez-nous pour être notifié du réapprovisionnement.');
        return;
      }

      // Logique existante pour ouvrir le chat...
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

  // Gestion du clic app mobile
  const handleAppDownload = () => {
    // Redirection vers l'app store ou page dédiée
    window.open('https://apps.apple.com/app/viensonsconnait/id6464125284', '_blank');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light' ? 'bg-white' : 'bg-black'
    }`}>
      <div className={`${isChatFullscreen ? 'hidden' : 'block'}`}>
        
        {/* 🎯 SECTION 1: CAROUSEL D'IMAGES SIMPLIFIÉ */}
        <section className={`relative pt-16 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white' : 'bg-black'
        }`}>
          
          {/* Image principale - AUCUN BOUTON DE DISTRACTION */}
          <div className={`relative h-[50vh] min-h-[350px] transition-colors duration-300 ${
            theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
          }`}>
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full"
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
            </motion.div>
          </div>

          {/* Miniatures */}
          {productImages.length > 1 && (
            <div className={`px-4 py-3 border-b transition-colors duration-300 ${
              theme === 'light' 
                ? 'bg-white border-gray-100' 
                : 'bg-black border-gray-800'
            }`}>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-brand-pink shadow-md'
                        : theme === 'light' 
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Image
                      {...generateImageProps(image, `${product.name} ${index + 1}`)}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                    {index !== currentImageIndex && (
                      <div className={`absolute inset-0 ${
                        theme === 'light' ? 'bg-white/40' : 'bg-black/40'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 🎯 SECTION 2: INFORMATIONS PRODUIT AVEC THÈME */}
        <section className={`px-6 py-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white' : 'bg-black'
        }`}>
          
          {/* Titre et rating */}
          <div className="mb-4">
            <h1 className={`text-3xl font-bold mb-2 leading-tight transition-colors duration-300 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              {product.name}
            </h1>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(realTestimonialStats.average)
                        ? 'text-yellow-400 fill-current'
                        : theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {realTestimonialStats.count} avis
              </span>
              <span className={`text-sm transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-400' : 'text-gray-600'
              }`}>•</span>
              <div className={`flex items-center gap-1 text-sm transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {realProductStats.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${realProductStats.sold?.toLocaleString() || '0'} vendus`
                  )}
                </span>
              </div>
            </div>

            {/* Trust indicators avec stock dynamique */}
            <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>{realProductStats.currentViewers || 1} en ligne</span>
              </div>
              <span>•</span>
              <StockIndicator 
                stockQuantity={product.stock_quantity} 
                className="text-xs"
              />
            </div>
          </div>

          {/* 🎯 PRIX OPTIMISÉ - UNE SEULE LIGNE */}
          <div className="flex items-center gap-3 mb-6">
            {formattedPrice && (
              <span className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {formattedPrice}
              </span>
            )}
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className={`text-lg line-through transition-colors duration-300 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {convertPrice(product.compareAtPrice)?.formatted}
                </span>
                <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm font-medium">
                  -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                </span>
              </>
            )}
          </div>
        </section>

        {/* 🎯 SECTION 3: CTA CONVERSATIONNEL OPTIMISÉ */}
        <section className={`px-6 pb-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white' : 'bg-black'
        }`}>
          
          {/* CTA Principal optimisé */}
          <motion.button
            onClick={handleInterestClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-brand-pink to-red-500 text-white py-4 px-6 rounded-full flex items-center justify-center gap-3 shadow-lg font-bold text-lg relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
            
            <Sparkles className="w-6 h-6 relative z-10" />
            <span className="relative z-10">
              {(() => {
                const stockInfo = getStockInfo(product.stock_quantity);
                
                if (stockInfo.status === 'out_of_stock') {
                  return "Produit épuisé";
                }
                
                if (orderData?.items && orderData.items.length > 0) {
                  return "Ajouter à ma commande";
                }
                
                if (stockInfo.status === 'low') {
                  return `Plus que ${stockInfo.quantity} - Je le veux !`;
                }
                
                return "Ce jeu m'intéresse";
              })()}
            </span>
          </motion.button>

          {/* Message d'encouragement optimisé */}
          <div className="text-center mt-3">
            <p className={`text-sm transition-colors duration-300 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              Cliquez pour commander ou en savoir plus 
            </p>
          </div>
        </section>

        {/* 🎯 SECTION 4: STATS VISUELLES AVEC 150 CARTES */}
        <section className={`px-6 py-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
          <div className="grid grid-cols-3 gap-4">
            
            {/* 150 cartes au lieu de satisfaction */}
            <motion.div 
              className={`rounded-xl p-4 text-center border shadow-sm hover:shadow-md transition-all ${
                theme === 'light' 
                  ? 'bg-white border-gray-100' 
                  : 'bg-gray-800 border-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <Eye className="w-4 h-4" />
                <span className="font-bold text-lg">150</span>
              </div>
              <span className={`text-xs transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Cartes
              </span>
            </motion.div>
            
            <motion.div 
              className={`rounded-xl p-4 text-center border shadow-sm hover:shadow-md transition-all ${
                theme === 'light' 
                  ? 'bg-white border-gray-100' 
                  : 'bg-gray-800 border-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <Award className="w-4 h-4" />
                {realProductStats.loading ? (
                  <div className="w-12 h-4 bg-green-500/30 rounded animate-pulse" />
                ) : (
                  <span className="font-bold text-lg">{realProductStats.sold?.toLocaleString() || '0'}</span>
                )}
              </div>
              <span className={`text-xs transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Ventes
              </span>
            </motion.div>
            
            <motion.div 
              className={`rounded-xl p-4 text-center border shadow-sm hover:shadow-md transition-all ${
                theme === 'light' 
                  ? 'bg-white border-gray-100' 
                  : 'bg-gray-800 border-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-1 text-brand-pink mb-1">
                <Users className="w-4 h-4" />
                <span className="font-bold text-lg">{realTestimonialStats.count || 0}</span>
              </div>
              <span className={`text-xs transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Avis
              </span>
            </motion.div>
          </div>
        </section>

        {/* 🎯 SECTION 5: DESCRIPTION AVEC THÈME */}
        <section className={`px-6 py-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white' : 'bg-black'
        }`}>
          <div className="space-y-4">
            <h3 className={`text-xl font-bold transition-colors duration-300 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              À Propos de ce Jeu
            </h3>
            <p className={`leading-relaxed transition-colors duration-300 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {product.description 
                ? product.description.length > 300 
                  ? `${product.description.substring(0, 300).trim()}...`
                  : product.description
                : `Découvrez ${product.name}, un jeu conçu pour créer des moments authentiques et renforcer vos relations avec vos proches. Chaque carte a été soigneusement élaborée pour encourager des conversations profondes et significatives.`
              }
            </p>
          </div>
        </section>

        {/* 🎯 SECTION 6: TÉMOIGNAGES AVEC THÈME */}
        <section className={`px-6 py-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
          <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Ce que disent nos clients
          </h3>
          
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonialIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className={`rounded-xl p-6 border shadow-sm transition-colors duration-300 ${
                  theme === 'light' 
                    ? 'bg-white border-gray-100' 
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-brand-pink rounded-full w-12 h-12 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {testimonials[currentTestimonialIndex]?.author_name[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className={`font-semibold transition-colors duration-300 ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {testimonials[currentTestimonialIndex]?.author_name}
                    </h4>
                    <p className={`text-sm transition-colors duration-300 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {testimonials[currentTestimonialIndex]?.author_location}
                    </p>
                  </div>
                </div>
                
                <p className={`mb-4 italic leading-relaxed transition-colors duration-300 ${
                  theme === 'light' ? 'text-gray-800' : 'text-gray-200'
                }`}>
                  "{testimonials[currentTestimonialIndex]?.content}"
                </p>
                
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < (testimonials[currentTestimonialIndex]?.rating || 5)
                          ? 'text-yellow-400 fill-current'
                          : theme === 'light' ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonialIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTestimonialIndex 
                      ? 'bg-brand-pink w-6' 
                      : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 🎯 SECTION 7: CTA APP MOBILE NOUVEAU */}
        <section className={`px-6 py-8 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white' : 'bg-black'
        }`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`rounded-2xl p-6 border relative overflow-hidden transition-colors duration-300 ${
              theme === 'light' 
                ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100' 
                : 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800'
            }`}
          >
            {/* Icône décorative */}
            <div className="absolute top-4 right-4 opacity-20">
              <Smartphone className="w-16 h-16 text-brand-pink" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-brand-pink rounded-full p-2">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-lg font-bold transition-colors duration-300 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                  Téléchargez notre App Mobile (pour iPhone)
                </h3>
              </div>
              
              <p className={`text-sm mb-4 leading-relaxed transition-colors duration-300 ${
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Tous nos jeux dans votre poche ! Testez gratuitement 10 cartes de chaque jeu et jouez hors ligne.
              </p>
              
              <div className="flex items-center gap-2 mb-4">
                <Gift className={`w-4 h-4 ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'light' ? 'text-green-600' : 'text-green-400'
                }`}>
                  10 cartes gratuites par jeu
                </span>
              </div>
              
              <motion.button
                onClick={handleAppDownload}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg font-semibold"
              >
                <Smartphone className="w-5 h-5" />
                <span>Télécharger sur iPhone</span>
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* 🎯 SECTION 8: PRODUITS SIMILAIRES AVEC THÈME */}
        <section className={`py-8 transition-colors duration-300 ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
          <div className="px-6">
            <MobileRelatedProducts
              currentProductId={product.id}
              productCategory={product.category}
            />
          </div>
        </section>

        {/* 🎯 CTA STICKY EN BAS AVEC THÈME */}
        <motion.div
          ref={scrollRef}
          className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
            isSticky ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className={`border-t px-6 py-4 safe-area-bottom transition-colors duration-300 ${
            theme === 'light' 
              ? 'bg-white border-gray-200' 
              : 'bg-black border-gray-800'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className={`text-sm transition-colors duration-300 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {product.name}
                </div>
                <div className={`text-lg font-bold transition-colors duration-300 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                  {formattedPrice}
                </div>
              </div>
              <motion.button
                onClick={handleInterestClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-brand-pink text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Ce jeu m'intéresse</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chat Fullscreen */}
      {isChatFullscreen && (
        <div className="fixed inset-0 bg-white z-[100]">
          <MobileChatContainer
            product={ensureProductData(product)}
            storeId={VOSC_STORE_ID}
            onBackClick={() => setIsChatFullscreen(false)}
          />
        </div>
      )}
    </div>
  );
}