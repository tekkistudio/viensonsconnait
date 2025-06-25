// src/features/product/components/ProductChat/components/ChatHeader.tsx - VERSION CORRIGÉE COMPLÈTE
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Star, ArrowLeft, X } from 'lucide-react';
import useCountryStore from '@/core/hooks/useCountryStore';
import { useChatStore } from '@/stores/chatStore';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { supabase } from '@/lib/supabase';
import type { RealTimeStats } from '@/types/product';
import type { ProductData } from '@/types/chat';

// ✅ INTERFACE MISE À JOUR pour supporter les deux formats
interface ChatHeaderProps {
  // ✅ NOUVEAU FORMAT (priorité)
  product?: ProductData;
  onClose?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  isDesktop?: boolean;
  cartItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  showCart?: boolean;
  onQuantityChange?: (productId: string, newQuantity: number) => void;
  onRemoveFromCart?: (productId: string) => void;
  onProceedToCheckout?: () => void;

  // ✅ ANCIEN FORMAT (compatibilité)
  productId?: string;
  title?: string;
  rating?: number;
  price?: string;
  oldPrice?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  // Nouveau format
  product,
  onClose,
  onBack,
  showBackButton = false,
  isDesktop = false,
  cartItems = [],
  showCart = false,
  onQuantityChange,
  onRemoveFromCart,
  onProceedToCheckout,

  // Ancien format (fallback)
  productId: legacyProductId,
  title: legacyTitle,
  rating: legacyRating = 5,
  price: legacyPrice,
  oldPrice: legacyOldPrice
}) => {
  const { convertPrice } = useCountryStore();
  
  // ✅ DÉRIVATION DES PROPS: Nouveau format prioritaire
  const finalProductId = product?.id || legacyProductId || '';
  const finalTitle = product?.name || legacyTitle || 'Le Jeu Pour les Couples';
  const finalPrice = product?.price || (legacyPrice ? parseInt(legacyPrice.replace(/[^0-9]/g, '')) : 14000);
  const finalOldPrice = product?.originalPrice || (legacyOldPrice ? parseInt(legacyOldPrice.replace(/[^0-9]/g, '')) : undefined);
  const finalRating = product?.rating || legacyRating || 5;

  // ✅ SURVEILLANCE COMPLÈTE DU STORE
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
  const [rating, setRating] = useState(finalRating);
  const [productImage, setProductImage] = useState<string>('');

  // ✅ FONCTION DE DÉTECTION DU PANIER CORRIGÉE (fix TypeScript)
  const getCartInfo = () => {
    console.log('🛒 [ChatHeader] DÉTECTION PANIER:', { 
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

    // PRIORITÉ 1: cartItems prop (nouveau système)
    if (cartItems && cartItems.length > 0) {
      const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      
      return {
        hasItems: true,
        itemsCount: totalItems,
        items: cartItems,
        totalAmount: totalAmount
      };
    }

    // PRIORITÉ 2: orderData.items (source principale)
    if (orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
      const totalItems = orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const totalAmount = orderData.total_amount || orderData.totalAmount || 
                         orderData.items.reduce((sum, item) => sum + (item.totalPrice || item.price * item.quantity), 0);
      
      cartData = {
        hasItems: true,
        itemsCount: totalItems,
        items: orderData.items,
        totalAmount: totalAmount
      };
    }
    
    // PRIORITÉ 3: Chercher dans les métadonnées des 3 derniers messages
    else if (messages && messages.length > 0) {
      const recentMessages = messages.slice(-3);
      
      for (const message of recentMessages.reverse()) {
        if (message.metadata?.orderData?.items && Array.isArray(message.metadata.orderData.items)) {
          const items = message.metadata.orderData.items;
          const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
          const totalAmount = message.metadata.orderData.total_amount || 
                             message.metadata.orderData.totalAmount ||
                             items.reduce((sum: number, item: any) => sum + (item.totalPrice || item.price * item.quantity), 0);
          
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
    
    // PRIORITÉ 4: Détecter commande express selon l'étape et les flags
    if (!cartData.hasItems && (
      currentStep?.includes('express') || 
      (flags as any)?.expressMode ||
      (flags as any)?.quantitySelected ||
      (flags as any)?.showInCart
    )) {
      const amount = orderData?.total_amount || orderData?.totalAmount || 0;
      
      if (amount > 0) {
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

    // PRIORITÉ 5: Analyser le contenu des messages pour indices de commande (FIX TYPESCRIPT)
    if (!cartData.hasItems && messages && messages.length > 0) {
      const hasCommanderMessages = messages.some(msg => {
        // ✅ FIX: Vérifier que content est une string avant d'utiliser includes
        const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
        
        return content.includes('C\'est noté ! Vous commandez') ||
               content.includes('exemplaire') ||
               content.includes('Prix total') ||
               (msg.metadata?.flags?.expressMode && msg.metadata?.flags?.quantitySelected);
      });

      if (hasCommanderMessages) {
        let quantity = 1;
        let unitPrice = 0;
        
        for (const msg of [...messages].reverse()) {
          // ✅ FIX: Conversion sécurisée en string
          const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
          
          if (content.includes('exemplaire')) {
            const qtyMatch = content.match(/(\d+)\s*exemplaire/);
            if (qtyMatch) quantity = parseInt(qtyMatch[1]);
            
            const priceMatch = content.match(/(\d+(?:[\s,]\d{3})*)\s*FCFA/);
            if (priceMatch) {
              const totalAmount = parseInt(priceMatch[1].replace(/[\s,]/g, ''));
              unitPrice = totalAmount / quantity;
              
              cartData = {
                hasItems: true,
                itemsCount: quantity,
                items: [{ 
                  name: finalTitle, 
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

    return cartData;
  };

  const [cartInfo, setCartInfo] = useState(() => getCartInfo());
  
  useEffect(() => {
    const newCartInfo = getCartInfo();
    
    if (JSON.stringify(newCartInfo) !== JSON.stringify(cartInfo)) {
      setCartInfo(newCartInfo);
    }
  }, [orderData, messages, currentStep, flags, finalTitle, cartItems]);

  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      if (!finalProductId) return;

      try {
        const [statsResult, reviewsCount, averageRating, productData] = await Promise.all([
          productStatsService.getProductStats(finalProductId),
          testimonialsService.getTestimonialsCountByProduct(finalProductId),
          testimonialsService.getAverageRating(finalProductId),
          supabase
            .from('products')
            .select('images')
            .eq('id', finalProductId)
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

        // ✅ Utiliser l'image du product si disponible, sinon depuis la DB
        if (product?.images && product.images.length > 0) {
          setProductImage(product.images[0]);
        } else if (productData.data?.images && productData.data.images.length > 0) {
          setProductImage(productData.data.images[0]);
        }
      } catch (error) {
        console.error('ChatHeader: Error loading stats:', error);
      }
    };

    initializeStats();

    if (finalProductId) {
      productStatsService.incrementViewCount(finalProductId);
    }

    return () => {
      isSubscribed = false;
    };
  }, [finalProductId, product?.images]);

  const formattedPrice = convertPrice(finalPrice).formatted;
  const formattedOldPrice = finalOldPrice ? convertPrice(finalOldPrice).formatted : undefined;

  // ✅ VERSION DESKTOP (SELON VOS SPÉCIFICATIONS IMAGE 3)
  if (isDesktop) {
    return (
      <div className="bg-white border-b border-gray-200 rounded-t-lg">
        {/* Header principal avec infos produit */}
        <div className="flex items-center justify-between p-4">
          {/* Section gauche : Logo + Nom Produit */}
          <div className="flex items-center space-x-3">
            {/* Logo produit */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
              {productImage ? (
                <Image
                  src={productImage}
                  alt={finalTitle}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {finalTitle?.charAt(0) || 'L'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Infos produit */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {finalTitle}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {/* Étoiles + nombre d'avis */}
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < rating 
                          ? 'fill-pink-400 text-pink-400' 
                          : 'fill-gray-300 text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({stats.reviewsCount} avis)
                </span>
              </div>
            </div>
          </div>

          {/* Section droite : Prix + Bouton fermer */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#1a365d]">
                {formattedPrice}
              </div>
              {formattedOldPrice && (
                <div className="text-sm text-gray-500 line-through">
                  {formattedOldPrice}
                </div>
              )}
            </div>

            {/* Bouton fermer */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fermer le chat"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Section Rose (comme dans l'image 3) */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {/* Avatar Rose */}
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">R</span>
            </div>
            
            {/* Infos Rose */}
            <div>
              <h3 className="font-semibold text-gray-900">Rose</h3>
              <p className="text-sm text-gray-600">Assistante d'achat</p>
            </div>
          </div>
        </div>

        {/* Barre de commande desktop (si items dans le panier) */}
        {(showCart || cartInfo.hasItems) && cartInfo.itemsCount > 0 && cartInfo.totalAmount > 0 && (
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 border-t border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 bg-pink-500 rounded-full">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartInfo.itemsCount}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Ma commande ({cartInfo.itemsCount} article{cartInfo.itemsCount > 1 ? 's' : ''})
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-pink-600">
                  {cartInfo.totalAmount.toLocaleString()} FCFA
                </p>
              </div>
            </div>

            {/* Liste détaillée des articles (optionnel pour desktop) */}
            {cartItems && cartItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {cartItems.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{item.productName}</span>
                      <span className="text-xs text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {onQuantityChange && (
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() => onQuantityChange(item.productId, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-gray-100 text-sm"
                          >
                            −
                          </button>
                          <span className="px-2 text-sm">{item.quantity}</span>
                          <button
                            onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 text-sm"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <span className="text-sm font-semibold">{item.totalPrice.toLocaleString()} FCFA</span>
                      {onRemoveFromCart && (
                        <button
                          onClick={() => onRemoveFromCart(item.productId)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {onProceedToCheckout && (
                  <button
                    onClick={onProceedToCheckout}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded font-medium transition-colors mt-2"
                  >
                    Finaliser la commande
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ✅ VERSION MOBILE (VOTRE VERSION EXISTANTE CORRIGÉE)
  return (
    <div className="bg-white border-b">
      {/* En-tête principal mobile */}
      <div className="py-4 px-6">
        <div className="flex items-center gap-3 mb-2">
          {/* Bouton retour si nécessaire */}
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-2"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Image du produit */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
            {productImage ? (
              <Image
                src={productImage}
                alt={finalTitle}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {finalTitle.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Titre du produit */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#132D5D] truncate">{finalTitle}</h1>
          </div>

          {/* Bouton fermer mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer le chat"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
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

      {/* Barre de commande mobile */}
      {(showCart || cartInfo.hasItems) && cartInfo.itemsCount > 0 && cartInfo.totalAmount > 0 && (
        <div className="bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border-t border-[#FF7E93]/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 bg-[#FF7E93] rounded-full">
                <ShoppingBag className="w-4 h-4 text-white" />
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