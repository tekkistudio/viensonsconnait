// src/components/chat/ChatProductCards.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Star, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salesCount: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  rating?: number;
  reviewsCount?: number;
}

interface ChatProductCardsProps {
  recommendations: ProductRecommendation[];
  onProductSelect: (productId: string, productName: string) => void;
  onAddToCart: (productId: string) => void;
  className?: string;
}

export const ChatProductCards: React.FC<ChatProductCardsProps> = ({
  recommendations,
  onProductSelect,
  onAddToCart,
  className = ''
}) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getUrgencyText = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high': return '🔥 Très demandé';
      case 'medium': return '⭐ Populaire';
      default: return '💡 Recommandé';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm text-gray-600 font-medium mb-3">
        💡 Vous pourriez aussi aimer :
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {recommendations.map((product, index) => (
          <motion.div
            key={product.productId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onProductSelect(product.productId, product.name)}
          >
            <div className="flex gap-3">
              {/* Image du produit */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover rounded-lg"
                  sizes="64px"
                />
                
                {/* Badge d'urgence */}
                <div className={`absolute -top-1 -right-1 px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(product.urgency)}`}>
                  {product.urgency === 'high' ? '🔥' : product.urgency === 'medium' ? '⭐' : '💡'}
                </div>
              </div>

              {/* Informations du produit */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate pr-2">
                    {product.name}
                  </h4>
                  <div className="text-[#FF7E93] font-bold text-sm whitespace-nowrap">
                    {product.price.toLocaleString()} FCFA
                  </div>
                </div>

                {/* Raison de la recommandation */}
                <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {product.reason}
                </div>

                {/* Métadonnées */}
                <div className="flex items-center gap-3 mb-3">
                  {/* Rating si disponible */}
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600">
                        {product.rating}
                      </span>
                      {product.reviewsCount && (
                        <span className="text-xs text-gray-400">
                          ({product.reviewsCount})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Nombre de ventes */}
                  {product.salesCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {product.salesCount} vendus
                      </span>
                    </div>
                  )}

                  {/* Badge d'urgence textuel */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(product.urgency)}`}>
                    {getUrgencyText(product.urgency)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product.productId);
                    }}
                    className="flex-1 bg-[#FF7E93] text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-[#132D5D] transition-colors duration-200"
                  >
                    Ajouter au panier
                  </button>
                  
                  <button
                    onClick={() => onProductSelect(product.productId, product.name)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    title="Voir les détails"
                  >
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Composant pour une recommendation unique (upsell)
interface ChatUpsellCardProps {
  product: ProductRecommendation;
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
}

export const ChatUpsellCard: React.FC<ChatUpsellCardProps> = ({
  product,
  onAccept,
  onDecline,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-r from-[#FF7E93]/10 to-[#132D5D]/10 border-2 border-[#FF7E93]/20 rounded-xl p-4 ${className}`}
    >
      <div className="text-center mb-4">
        <div className="text-lg font-bold text-[#132D5D] mb-1">
          🎉 Offre spéciale !
        </div>
        <div className="text-sm text-gray-600">
          Nos clients qui achètent ce jeu prennent aussi :
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {/* Image du produit */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover rounded-lg"
            sizes="80px"
          />
          
          {/* Badge promo */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -10%
          </div>
        </div>

        {/* Informations */}
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 mb-1">
            {product.name}
          </h4>
          
          <div className="text-sm text-gray-600 mb-2">
            {product.reason}
          </div>

          <div className="flex items-center gap-2 mb-3">
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{product.rating}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{product.salesCount} vendus</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#FF7E93]">
              {Math.round(product.price * 0.9).toLocaleString()} FCFA
            </span>
            <span className="text-sm text-gray-500 line-through">
              {product.price.toLocaleString()} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 bg-[#FF7E93] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#132D5D] transition-colors duration-200"
        >
          ✨ Oui, je l'ajoute !
        </button>
        
        <button
          onClick={onDecline}
          className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
        >
          Non merci
        </button>
      </div>
      
      <div className="text-xs text-center text-gray-500 mt-2">
        ⏰ Offre limitée - Économisez {Math.round(product.price * 0.1).toLocaleString()} FCFA
      </div>
    </motion.div>
  );
};

// Hook pour gérer les recommandations produits
export const useProductRecommendations = () => {
  const [recommendations, setRecommendations] = React.useState<ProductRecommendation[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchRecommendations = React.useCallback(async (
    currentProductId: string,
    userContext?: {
      interests?: string[];
      buyingIntent?: 'low' | 'medium' | 'high';
      messageCount?: number;
    }
  ) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: currentProductId,
          context: userContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recommendations,
    isLoading,
    fetchRecommendations,
    clearRecommendations: () => setRecommendations([])
  };
};

// Composant pour la barre de panier dans le chat
interface ChatOrderSummaryProps {
  orderItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  totalAmount: number;
  onQuantityChange: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  className?: string;
}

export const ChatOrderSummary: React.FC<ChatOrderSummaryProps> = ({
  orderItems,
  totalAmount,
  onQuantityChange,
  onRemoveItem,
  onProceedToCheckout,
  className = ''
}) => {
  if (orderItems.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          🛒 Ma commande
          <span className="bg-[#FF7E93] text-white text-xs font-bold px-2 py-1 rounded-full">
            {orderItems.length}
          </span>
        </h3>
        
        <div className="text-lg font-bold text-[#FF7E93]">
          {totalAmount.toLocaleString()} FCFA
        </div>
      </div>

      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
        {orderItems.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            {item.image && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover rounded-md"
                  sizes="48px"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {item.name}
              </div>
              <div className="text-xs text-gray-600">
                {item.price.toLocaleString()} FCFA × {item.quantity}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(item.productId, Math.max(1, item.quantity - 1))}
                className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors text-sm font-bold"
              >
                -
              </button>
              
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              
              <button
                onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
                className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors text-sm font-bold"
              >
                +
              </button>
              
              <button
                onClick={() => onRemoveItem(item.productId)}
                className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-sm font-bold ml-1"
                title="Supprimer"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onProceedToCheckout}
        className="w-full bg-[#FF7E93] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#132D5D] transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <span>Finaliser ma commande</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
};