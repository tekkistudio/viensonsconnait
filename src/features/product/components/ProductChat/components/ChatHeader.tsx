// src/features/product/components/ProductChat/components/ChatHeader.tsx - VERSION CORRIGÉE
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Star } from 'lucide-react';
import useCountryStore from '@/core/hooks/useCountryStore';
import { useChatStore } from '@/stores/chatStore';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { supabase } from '@/lib/supabase';
import type { RealTimeStats } from '@/types/product';

interface ChatHeaderProps {
  productId: string;
  title: string;
  rating: number;
  price: string;
  oldPrice?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  productId, 
  title, 
  rating: initialRating, 
  price, 
  oldPrice 
}) => {
  const { convertPrice } = useCountryStore();
  
  // ✅ CORRECTION MAJEURE: Surveillance complète du store
  const chatState = useChatStore();
  const { 
    orderData = {}, 
    messages = [], 
    currentStep,
    flags = {}
  } = chatState;
  
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(initialRating);
  const [productImage, setProductImage] = useState<string>('');

  // ✅ CORRECTION CRITIQUE: Fonction de détection du panier réécrite
  const getCartInfo = () => {
    console.log('🛒 [ChatHeader] NOUVELLE DÉTECTION PANIER:', { 
      orderData, 
      messagesLength: messages?.length,
      currentStep,
      flags
    });
    
    let cartData = {
      hasItems: false,
      itemsCount: 0,
      items: [] as any[],
      totalAmount: 0
    };

    // ✅ PRIORITÉ 1: orderData.items (source principale)
    if (orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
      const totalItems = orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const totalAmount = orderData.total_amount || orderData.totalAmount || 
                         orderData.items.reduce((sum, item) => sum + (item.totalPrice || item.price * item.quantity), 0);
      
      console.log('✅ [ChatHeader] Items trouvés dans orderData:', { totalItems, totalAmount });
      cartData = {
        hasItems: true,
        itemsCount: totalItems,
        items: orderData.items,
        totalAmount: totalAmount
      };
    }
    
    // ✅ PRIORITÉ 2: Chercher dans les métadonnées des 3 derniers messages
    else if (messages && messages.length > 0) {
      const recentMessages = messages.slice(-3); // 3 derniers messages
      
      for (const message of recentMessages.reverse()) {
        if (message.metadata?.orderData?.items && Array.isArray(message.metadata.orderData.items)) {
          const items = message.metadata.orderData.items;
          const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
          const totalAmount = message.metadata.orderData.total_amount || 
                             message.metadata.orderData.totalAmount ||
                             items.reduce((sum: number, item: any) => sum + (item.totalPrice || item.price * item.quantity), 0);
          
          console.log('✅ [ChatHeader] Items trouvés dans message metadata:', { totalItems, totalAmount });
          cartData = {
            hasItems: true,
            itemsCount: totalItems,
            items: items,
            totalAmount: totalAmount
          };
          break;
        }
      }
    }
    
    // ✅ PRIORITÉ 3: Détecter commande express selon l'étape et les flags
    if (!cartData.hasItems && (
      currentStep?.includes('express') || 
      (flags as any)?.expressMode ||
      (flags as any)?.quantitySelected ||
      (flags as any)?.showInCart
    )) {
      const amount = orderData?.total_amount || orderData?.totalAmount || 0;
      
      if (amount > 0) {
        console.log('✅ [ChatHeader] Commande express détectée:', { amount, currentStep, flags });
        cartData = {
          hasItems: true,
          itemsCount: orderData?.quantity || 1,
          items: [{ 
            name: 'Commande express en cours...', 
            quantity: orderData?.quantity || 1, 
            price: amount / (orderData?.quantity || 1),
            totalPrice: amount 
          }],
          totalAmount: amount
        };
      }
    }

    // ✅ PRIORITÉ 4: Analyser le contenu des messages pour indices de commande
    if (!cartData.hasItems && messages && messages.length > 0) {
      const hasCommanderMessages = messages.some(msg => 
        msg.content?.includes('C\'est noté ! Vous commandez') ||
        msg.content?.includes('exemplaire') ||
        msg.content?.includes('Prix total') ||
        (msg.metadata?.flags?.expressMode && msg.metadata?.flags?.quantitySelected)
      );

      if (hasCommanderMessages) {
        // Extraire quantité et prix du contenu des messages
        let quantity = 1;
        let unitPrice = 0;
        
        for (const msg of messages.reverse()) {
          if (msg.content?.includes('exemplaire')) {
            const qtyMatch = msg.content.match(/(\d+)\s*exemplaire/);
            if (qtyMatch) quantity = parseInt(qtyMatch[1]);
            
            const priceMatch = msg.content.match(/(\d+(?:[\s,]\d{3})*)\s*FCFA/);
            if (priceMatch) {
              const totalAmount = parseInt(priceMatch[1].replace(/[\s,]/g, ''));
              unitPrice = totalAmount / quantity;
              
              console.log('✅ [ChatHeader] Commande détectée via analyse message:', { quantity, totalAmount });
              cartData = {
                hasItems: true,
                itemsCount: quantity,
                items: [{ 
                  name: title, 
                  quantity: quantity, 
                  price: unitPrice,
                  totalPrice: totalAmount 
                }],
                totalAmount: totalAmount
              };
              break;
            }
          }
        }
      }
    }

    console.log('🛒 [ChatHeader] RÉSULTAT FINAL:', cartData);
    return cartData;
  };

  // ✅ HOOK DE SURVEILLANCE: Déclencher re-render à chaque changement
  const [cartInfo, setCartInfo] = useState(() => getCartInfo());
  
  useEffect(() => {
    const newCartInfo = getCartInfo();
    
    // Comparer pour éviter les re-renders inutiles
    if (JSON.stringify(newCartInfo) !== JSON.stringify(cartInfo)) {
      console.log('🔄 [ChatHeader] Mise à jour du panier détectée');
      setCartInfo(newCartInfo);
    }
  }, [orderData, messages, currentStep, flags, title]); // Dépendances complètes

  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      if (!productId) {
        console.error('ChatHeader: productId is missing');
        return;
      }

      try {
        console.log('ChatHeader: Fetching stats for productId:', productId);

        const [statsResult, reviewsCount, averageRating, productData] = await Promise.all([
          productStatsService.getProductStats(productId),
          testimonialsService.getTestimonialsCountByProduct(productId),
          testimonialsService.getAverageRating(productId),
          supabase
            .from('products')
            .select('images')
            .eq('id', productId)
            .single()
        ]);

        if (!isSubscribed) return;

        setStats({
          viewsCount: statsResult.totalViews || 0,
          salesCount: statsResult.sold || 0,
          reviewsCount: reviewsCount || 0
        });

        if (averageRating > 0) {
          setRating(averageRating);
        }

        if (productData.data?.images && productData.data.images.length > 0) {
          setProductImage(productData.data.images[0]);
        }
      } catch (error) {
        console.error('ChatHeader: Error loading stats:', error);
      }
    };

    initializeStats();

    if (productId) {
      productStatsService.incrementViewCount(productId);
    }

    return () => {
      isSubscribed = false;
    };
  }, [productId]);

  const formattedPrice = typeof price === 'string' 
    ? convertPrice(parseInt(price.replace(/[^0-9]/g, ''))).formatted
    : price;

  const formattedOldPrice = oldPrice
    ? convertPrice(parseInt(oldPrice.replace(/[^0-9]/g, ''))).formatted
    : undefined;

  return (
    <div className="bg-white border-b">
      {/* En-tête principal */}
      <div className="py-4 px-6">
        <div className="flex items-center gap-3 mb-2">
          {/* Image du produit */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
            {productImage ? (
              <Image
                src={productImage}
                alt={title}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {title.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Titre du produit */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#132D5D] truncate">{title}</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < rating 
                        ? 'text-[#FF7E93] fill-[#FF7E93]' 
                        : 'text-gray-300 fill-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                ({stats.reviewsCount} avis)
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#132D5D]">{formattedPrice}</span>
            {formattedOldPrice && (
              <span className="text-sm text-gray-500 line-through">
                {formattedOldPrice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ✅ BARRE DE COMMANDE RÉACTIVE */}
      {cartInfo.hasItems && cartInfo.itemsCount > 0 && cartInfo.totalAmount > 0 && (
        <div className="bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border-t border-[#FF7E93]/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 bg-[#FF7E93] rounded-full">
                <ShoppingBag className="w-4 h-4 text-white" />
                {/* Badge avec nombre d'articles */}
                {cartInfo.itemsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartInfo.itemsCount}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#132D5D]">
                  Ma commande ({cartInfo.itemsCount} article{cartInfo.itemsCount > 1 ? 's' : ''})
                </p>
                <p className="text-xs text-gray-600 truncate max-w-[200px]">
                  {cartInfo.items.length > 0 ? (
                    cartInfo.items.map((item: any) => 
                      `${item.name || 'Produit'} x${item.quantity || 1}`
                    ).join(', ')
                  ) : (
                    'Commande en cours...'
                  )}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-[#FF7E93]">
                {cartInfo.totalAmount.toLocaleString()} FCFA
              </p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;