// src/features/product/components/ProductPageContent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import { useLayoutContext } from '@/core/context/LayoutContext';
import { useChatStore } from '@/stores/chatStore';
import { ConversationalCartService } from '@/lib/services/ConversationalCartService';
import { testimonialsService } from '@/lib/services/testimonials.service';
import type { Product } from '@/types/product';
import dynamic from 'next/dynamic';
import ProductTestimonials from './ProductTestimonials';
import type { ChatOrderData, ConversationStep } from '@/types/chat';
import { toChatOrderData, ensureConversationStep } from '@/utils/typeConversions';

// Composant de fallback pour les images
const ProductPlaceholder = () => (
  <div className="aspect-square bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
    <div className="w-16 h-16 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  </div>
);

// Imports dynamiques avec fallbacks
const ProductImageGallery = dynamic(() => import('./ProductImageGallery'), {
  ssr: false,
  loading: () => <ProductPlaceholder />
});

const ChatContainer = dynamic(() => import('./ProductChat/ChatContainer'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse">
      <div className="h-16 bg-white border-b" />
    </div>
  ),
});

const MobileChatContainer = dynamic(() => import('./ProductChat/components/MobileChatContainer'), {
  ssr: false
});

const RelatedProducts = dynamic(() => import('./RelatedProducts'), {
  ssr: false
});

interface ProductPageContentProps {
  productId: string;
  product: Product;
}

const getDefaultProductImages = (productId: string): string[] => {
  return [
    `/images/products/${productId}-1.jpg`,
    `/images/products/${productId}-2.jpg`
  ];
};

// ID du store par défaut pour VOSC
const VOSC_STORE_ID = 'a9563f88-217c-4998-b080-ed39f637ea31';

export default function ProductPageContent({ productId, product }: ProductPageContentProps) {
  const { isMobile } = useBreakpoint();
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { setHideDukkaBadge } = useLayoutContext();
  
  // ✅ State pour les vraies stats des avis synchronisées
  const [realTestimonialStats, setRealTestimonialStats] = useState({
    count: 0,
    average: 0
  });
  
  // ✅ NOUVEAUX HOOKS POUR GESTION AVANCÉE
  const { 
    sessionId, 
    initializeSession, 
    addMessage,
    orderData,
    flags 
  } = useChatStore();
  
  const [cartService] = useState(() => ConversationalCartService.getInstance());

  // ✅ useEffect pour charger les vraies stats des témoignages
  useEffect(() => {
    const loadTestimonialStats = async () => {
      try {
        const [count, average] = await Promise.all([
          testimonialsService.getTestimonialsCountByProduct(product.id),
          testimonialsService.getAverageRating(product.id)
        ]);
        
        setRealTestimonialStats({
          count: count || 0,
          average: average || 5
        });
      } catch (error) {
        console.error('Error loading testimonial stats:', error);
        // Fallback vers les stats du produit
        setRealTestimonialStats({
          count: product.stats?.reviews || 0,
          average: product.stats?.satisfaction || 5
        });
      }
    };

    if (product.id) {
      loadTestimonialStats();
    }
  }, [product.id, product.stats]);

  // ✅ EFFET POUR GÉRER LA NAVIGATION MULTI-PRODUITS
  useEffect(() => {
    let isMounted = true;

    const initializeProductPage = async () => {
      if (!product?.id || !isMounted || isInitialized) return;

      try {
        console.log('💼 Initializing product page with multi-product support:', { 
          productId: product.id, 
          storeId: VOSC_STORE_ID,
          hasExistingCart: orderData?.items && orderData.items.length > 0
        });
        
        setIsInitialized(true);

        // ✅ 1. Vérifier s'il y a navigation de produit avec panier existant
        if (sessionId && orderData?.items && orderData.items.length > 0) {
          const currentProductInCart = orderData.items.find(item => item.productId === product.id);
          
          if (!currentProductInCart) {
            console.log('🔄 Product navigation with existing cart detected');
            
            // Gérer la navigation avec le service de panier
            const navigationMessage = await cartService.handleProductNavigation(
              sessionId, 
              product.id,
              orderData.items[0]?.productId
            );
            
            if (navigationMessage && navigationMessage.metadata?.flags?.hasExistingCart) {
              // Ajouter le message de navigation au chat
              addMessage(navigationMessage);
            }
          }
        }
        
        // ✅ 2. Initialiser la session normale (gère automatiquement la navigation)
        if (initializeSession) {
          initializeSession(product.id, VOSC_STORE_ID);
        }
        
        console.log('✅ Product page initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing product page:', error);
        setIsInitialized(true); // Éviter les boucles infinies
      }
    };

    initializeProductPage();
    
    return () => {
      isMounted = false;
    };
  }, [product.id, sessionId, orderData, isInitialized, cartService, initializeSession, addMessage]);

  // ✅ EFFET POUR GÉRER LA VISIBILITÉ DU BADGE
  useEffect(() => {
    setHideDukkaBadge(isChatFullscreen);
    return () => setHideDukkaBadge(false);
  }, [isChatFullscreen, setHideDukkaBadge]);

  // ✅ FONCTION POUR GÉRER LE CLIC SUR LE BOUTON D'INTÉRÊT
  const handleInterestClick = async () => {
    try {
      console.log('💝 Interest button clicked for product:', product.id);
      
      // Si il y a déjà des items dans le panier d'un autre produit
      if (orderData?.items && orderData.items.length > 0) {
        const hasCurrentProduct = orderData.items.some(item => item.productId === product.id);
        
        if (!hasCurrentProduct) {
          // Proposer d'ajouter au panier existant
          const addToCartMessage = await cartService.addProductToCart(sessionId, product.id, 1);
          addMessage(addToCartMessage);
          setIsChatFullscreen(true);
          return;
        }
      }
      
      // Comportement normal - ouvrir le chat
      setIsChatFullscreen(true);
      
    } catch (error) {
      console.error('❌ Error handling interest click:', error);
      setIsChatFullscreen(true); // Fallback
    }
  };

  // ✅ RENDU MOBILE AMÉLIORÉ
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] pt-4 pb-4">
        <div className={`${isChatFullscreen ? 'hidden' : 'block'}`}>
          <div className="pb-8">
            <div className="px-4">
              <ProductImageGallery
                images={product.images}
                name={product.name}
                stats={product.stats}
                productId={product.id}
              />

              {/* ✅ SECTION DESCRIPTION AVEC AVIS SYNCHRONISÉS */}
              <div className="mt-4 mb-6 p-4 bg-white rounded-xl shadow-sm">
                {/* Avis synchronisés avec les témoignages */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(realTestimonialStats.average)
                            ? 'fill-[#FF7E93] text-[#FF7E93]' 
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {realTestimonialStats.count} avis
                  </span>
                </div>
                
                {/* Description courte et bien formatée */}
                <div className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed tracking-wide">
                  {product.description 
                    ? product.description.length > 250 
                      ? `${product.description.substring(0, 250).trim()}...`
                      : product.description
                    : `Découvrez ${product.name}, un jeu conçu pour créer des moments authentiques et renforcer vos relations.`
                  }
                </div>
              </div>

              {/* ✅ BOUTON AVEC GESTION INTELLIGENTE DU PANIER */}
              <button
                onClick={handleInterestClick}
                className="w-full mx-auto bg-[#FF7E93] text-white py-4 px-8 rounded-full flex items-center justify-center gap-2 shadow-md hover:bg-[#FF6B9D] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">
                  {orderData?.items && orderData.items.length > 0 
                    ? "Ajouter à ma commande" 
                    : "Ce jeu m'intéresse"
                  }
                </span>
              </button>
            </div>

            {/* ✅ SECTION TÉMOIGNAGES REMONTÉE */}
            <div className="mt-8">
              <ProductTestimonials productId={product.id} />
            </div>
          </div>
        </div>

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

  // ✅ RENDU DESKTOP AMÉLIORÉ
  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-5/12">
            <ProductImageGallery
              images={product.images}
              name={product.name}
              stats={product.stats}
              productId={product.id}
            />
          </div>
          <div className="lg:w-7/12 h-full">
            <ChatContainer
              product={product}
              storeId={VOSC_STORE_ID}
              isMobile={false}
              isFullscreen={false}
            />
          </div>
        </div>

        {/* ✅ TÉMOIGNAGES DÉSACTIVÉS TEMPORAIREMENT */}
        {/*  <ProductTestimonials productId={product.id} /> */}

        <RelatedProducts
          currentProductId={product.id}
          productCategory={product.category}
        />
      </div>
    </main>
  );
}