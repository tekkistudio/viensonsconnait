// src/features/product/components/ProductChat/components/ChatHeader.tsx - BORDURES ET DESIGN CORRIGÉS
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
  
  // ✅ Surveillance complète du store
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

  // ✅ Fonction de détection du panier
  const getCartInfo = () => {
    console.log('🛒 [ChatHeader] Détection panier:', { 
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
        orderData.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
      
      console.log('✅ [ChatHeader] Panier trouvé dans orderData.items:', { totalItems, totalAmount });
      cartData = {
        hasItems: true,
        itemsCount: totalItems,
        items: orderData.items,
        totalAmount: totalAmount
      };
    }
    // ✅ PRIORITÉ 2: orderData direct
    else if (orderData?.quantity && orderData?.quantity > 0) {
      const quantity = orderData.quantity;
      const unitPrice = orderData.unit_price || orderData.price || 0;
      const totalAmount = orderData.total_amount || orderData.totalAmount || (quantity * unitPrice);
      
      console.log('✅ [ChatHeader] Commande trouvée dans orderData direct:', { quantity, totalAmount });
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
    }
    // ✅ PRIORITÉ 3: Analyse des messages pour extraire les commandes
    else if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.type === 'assistant' && typeof message.content === 'string') {
          // Chercher des patterns comme "2 exemplaires" et "14000 FCFA"
          const quantityMatch = message.content.match(/(\d+)\s*exemplaires?/);
          if (quantityMatch) {
            const quantity = parseInt(quantityMatch[1]);
            let unitPrice = 0;
            
            // Chercher le montant total dans le même message
            const priceMatch = message.content.match(/(\d+(?:[\s,]\d{3})*)\s*FCFA/);
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

    console.log('🛒 [ChatHeader] Résultat final:', cartData);
    return cartData;
  };

  // ✅ Hook de surveillance: Déclencher re-render à chaque changement
  const [cartInfo, setCartInfo] = useState(() => getCartInfo());
  
  useEffect(() => {
    const newCartInfo = getCartInfo();
    
    // Comparer pour éviter les re-renders inutiles
    if (JSON.stringify(newCartInfo) !== JSON.stringify(cartInfo)) {
      console.log('🔄 [ChatHeader] Mise à jour du panier détectée');
      setCartInfo(newCartInfo);
    }
  }, [orderData, messages, currentStep, flags, title]);

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
    : null;

  return (
    <div className="bg-white border-b-2 border-gray-100 shadow-sm">
      <div className="p-4">
        {/* ✅ Header principal avec bordures visibles */}
        <div className="flex items-center gap-3 mb-3">
          {/* Image du produit */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {productImage ? (
              <Image
                src={productImage}
                alt={title}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FF7E93] to-[#132D5D] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Informations produit */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{title}</h3>
            
            {/* Note et avis */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round(rating)
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {stats.reviewsCount} avis
              </span>
            </div>
          </div>

          {/* Prix */}
          <div className="text-right">
            <div className="font-bold text-lg text-gray-900">{formattedPrice}</div>
            {formattedOldPrice && (
              <div className="text-sm text-gray-500 line-through">{formattedOldPrice}</div>
            )}
          </div>
        </div>

        {/* ✅ Statistiques avec bordures */}
        <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center border-r border-gray-300 pr-4 flex-1">
            <div className="font-semibold text-sm text-gray-900">{stats.viewsCount}</div>
            <div className="text-xs text-gray-600">vues</div>
          </div>
          <div className="text-center border-r border-gray-300 pr-4 pl-4 flex-1">
            <div className="font-semibold text-sm text-gray-900">{stats.salesCount}</div>
            <div className="text-xs text-gray-600">vendus</div>
          </div>
          <div className="text-center pl-4 flex-1">
            <div className="font-semibold text-sm text-gray-900">{rating.toFixed(1)}</div>
            <div className="text-xs text-gray-600">note</div>
          </div>
        </div>

        {/* ✅ Panier avec bordures améliorées */}
        {cartInfo.hasItems && (
          <div className="mt-3 p-3 bg-[#FF7E93]/10 border-2 border-[#FF7E93]/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#FF7E93]" />
                <span className="text-sm font-medium text-gray-900">
                  {cartInfo.itemsCount} article{cartInfo.itemsCount > 1 ? 's' : ''} dans votre panier
                </span>
              </div>
              <div className="font-bold text-[#FF7E93]">
                {cartInfo.totalAmount.toLocaleString()} FCFA
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;