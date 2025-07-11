// src/features/product/components/ProductChat/components/ChatProductCards.tsx - VERSION CORRIGÉE

'use client';

import React from 'react';
import Image from 'next/image';
import { Star, Users, ArrowRight, ShoppingBag, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

// ✅ TYPE UNIFIÉ pour tous les produits dans le chat avec VRAIES DONNÉES
interface ChatProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  stats?: {
    sold?: number;
    satisfaction?: number;
    reviews?: number;
    sales_count?: number;   
    reviews_count?: number; 
    avg_rating?: number;    
  };
  // Spécifique aux recommandations
  reason?: string;
  urgency?: 'low' | 'medium' | 'high';
  discount?: number; // Pourcentage de réduction pour l'upsell
  
  // ✅ NOUVELLES PROPRIÉTÉS pour les vraies données DB
  rating?: number;
  sales_count?: number;
  reviews_count?: number;
  description?: string;
}

// ✅ COMPOSANT PRINCIPAL: Carte produit adaptative avec VRAIES DONNÉES
interface ChatProductCardProps {
  product: ChatProduct;
  variant?: 'recommendation' | 'upsell' | 'related';
  onAddToCart?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  onAccept?: () => void; // Pour l'upsell
  onDecline?: () => void; // Pour l'upsell
  className?: string;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({
  product,
  variant = 'recommendation',
  onAddToCart,
  onViewDetails,
  onAccept,
  onDecline,
  className = ''
}) => {
  // ✅ CORRECTION: Gestion de l'image avec fallback sécurisé
  const primaryImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : '/images/products/default-product.jpg';

  // ✅ CORRECTION: Extraction des vraies statistiques de la DB
  const getRealStats = () => {
    // Priorité aux données directes de la DB
    const salesCount = product.sales_count || product.stats?.sales_count || product.stats?.sold || 0;
    const reviewsCount = product.reviews_count || product.stats?.reviews_count || product.stats?.reviews || 0;
    const avgRating = product.rating || product.stats?.avg_rating || product.stats?.satisfaction || 5;

    return {
      salesCount: Math.max(0, salesCount),
      reviewsCount: Math.max(0, reviewsCount),
      avgRating: Math.min(5, Math.max(1, avgRating))
    };
  };

  const realStats = getRealStats();

  // ✅ RENDU SELON LE VARIANT
  if (variant === 'upsell') {
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
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover rounded-lg"
              sizes="80px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/products/default-product.jpg';
              }}
            />
            
            {/* Badge promo */}
            {product.discount && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                -{product.discount}%
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-1">
              {product.name.startsWith('le jeu') ? product.name : `le jeu ${product.name}`}
            </h4>
            
            {product.reason && (
              <div className="text-sm text-gray-600 mb-2">
                {product.reason}
              </div>
            )}

            {/* ✅ CORRECTION: Utiliser les vraies statistiques */}
            <div className="flex items-center gap-2 mb-3">
              {realStats.avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{realStats.avgRating.toFixed(1)}</span>
                </div>
              )}
              
              {realStats.salesCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{realStats.salesCount} vendus</span>
                </div>
              )}

              {realStats.reviewsCount > 0 && (
                <div className="text-xs text-gray-500">
                  ({realStats.reviewsCount} avis)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {product.discount ? (
                <>
                  <span className="text-lg font-bold text-[#FF7E93]">
                    {Math.round(product.price * (1 - product.discount / 100)).toLocaleString()} FCFA
                  </span>
                  <span className="text-sm text-gray-500 line-through">
                    {product.price.toLocaleString()} FCFA
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-[#FF7E93]">
                  {product.price.toLocaleString()} FCFA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions pour upsell */}
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
        
        {product.discount && (
          <div className="text-xs text-center text-gray-500 mt-2">
            ⏰ Offre limitée - Économisez {Math.round(product.price * product.discount / 100).toLocaleString()} FCFA
          </div>
        )}
      </motion.div>
    );
  }

  // ✅ RENDU STANDARD (recommendation/related) avec VRAIES DONNÉES
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
      onClick={() => onViewDetails?.(product.id)}
    >
      <div className="flex gap-3">
        {/* Image du produit */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover rounded-lg"
            sizes="64px"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/products/default-product.jpg';
            }}
          />
          
          {/* Badge d'urgence */}
          {product.urgency && (
            <div className={`absolute -top-1 -right-1 px-2 py-1 rounded-full text-xs font-medium ${
              product.urgency === 'high' ? 'text-red-600 bg-red-50' :
              product.urgency === 'medium' ? 'text-orange-600 bg-orange-50' :
              'text-blue-600 bg-blue-50'
            }`}>
              {product.urgency === 'high' ? '🔥' : product.urgency === 'medium' ? '⭐' : '💡'}
            </div>
          )}
        </div>

        {/* Informations du produit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate pr-2">
              {product.name.startsWith('le jeu') ? product.name : `le jeu ${product.name}`}
            </h4>
            <div className="text-[#FF7E93] font-bold text-sm whitespace-nowrap">
              {product.price.toLocaleString()} FCFA
            </div>
          </div>

          {/* Raison de la recommandation */}
          {product.reason && (
            <div className="text-xs text-gray-600 mb-2 line-clamp-2">
              {product.reason}
            </div>
          )}

          {/* ✅ CORRECTION MAJEURE: Métadonnées avec VRAIES DONNÉES */}
          <div className="flex items-center gap-3 mb-3">
            {/* Rating si disponible */}
            {realStats.avgRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-600">
                  {realStats.avgRating.toFixed(1)}
                </span>
                {realStats.reviewsCount > 0 && (
                  <span className="text-xs text-gray-400">
                    ({realStats.reviewsCount})
                  </span>
                )}
              </div>
            )}

            {/* Nombre de ventes RÉELLES */}
            {realStats.salesCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {realStats.salesCount} vendus
                </span>
              </div>
            )}

            {/* Badge d'urgence textuel */}
            {product.urgency && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                product.urgency === 'high' ? 'text-red-600 bg-red-50' :
                product.urgency === 'medium' ? 'text-orange-600 bg-orange-50' :
                'text-blue-600 bg-blue-50'
              }`}>
                {product.urgency === 'high' ? '🔥 Très demandé' :
                 product.urgency === 'medium' ? '⭐ Populaire' :
                 '💡 Recommandé'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.(product.id);
              }}
              className="flex-1 bg-[#FF7E93] text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-[#132D5D] transition-colors duration-200"
            >
              Ajouter à la commande
            </button>
            
            <button
              onClick={() => onViewDetails?.(product.id)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              title="Voir les détails"
            >
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ✅ COMPOSANT LISTE: Grille de recommandations avec VRAIES DONNÉES
interface ChatProductListProps {
  products: ChatProduct[];
  title?: string;
  variant?: 'recommendation' | 'related';
  onAddToCart?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  className?: string;
}

export const ChatProductList: React.FC<ChatProductListProps> = ({
  products,
  title = "Nos autres jeux populaires",
  variant = 'recommendation',
  onAddToCart,
  onViewDetails,
  className = ''
}) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-gray-500 mb-3">
          🎯 Aucune recommandation disponible pour le moment
        </div>
        <div className="text-sm text-gray-400">
          Nos algorithmes travaillent à vous proposer les meilleurs jeux !
        </div>
      </div>
    );
  }

  // ✅ CORRECTION: Trier les produits par vraies statistiques
  const sortedProducts = [...products].sort((a, b) => {
    const aStats = {
      salesCount: a.sales_count || a.stats?.sales_count || a.stats?.sold || 0,
      avgRating: a.rating || a.stats?.avg_rating || a.stats?.satisfaction || 0
    };
    const bStats = {
      salesCount: b.sales_count || b.stats?.sales_count || b.stats?.sold || 0,
      avgRating: b.rating || b.stats?.avg_rating || b.stats?.satisfaction || 0
    };
    
    // Trier par ventes d'abord, puis par note
    if (aStats.salesCount !== bStats.salesCount) {
      return bStats.salesCount - aStats.salesCount;
    }
    return bStats.avgRating - aStats.avgRating;
  });

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm text-gray-600 font-medium mb-3">
        💡 {title}
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ChatProductCard
              product={product}
              variant={variant}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          </motion.div>
        ))}
      </div>
      
      {/* ✅ AJOUT: Statistiques récapitulatives */}
      {sortedProducts.length > 1 && (
        <div className="text-xs text-gray-500 text-center mt-3 p-2 bg-gray-50 rounded-lg">
          {sortedProducts.length} jeux disponibles • 
          {" "}
          {sortedProducts.reduce((sum, p) => sum + (p.sales_count || p.stats?.sales_count || 0), 0)} ventes au total •
          {" "}
          Note moyenne: {(sortedProducts.reduce((sum, p) => sum + (p.rating || p.stats?.avg_rating || 5), 0) / sortedProducts.length).toFixed(1)}/5
        </div>
      )}
    </div>
  );
};

// ✅ COMPOSANT PANIER: Résumé de commande dans le chat avec VRAIES DONNÉES
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
      className={`bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border border-[#FF7E93]/20 rounded-xl p-4 ${className}`}
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
          <div key={item.productId} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            {item.image && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover rounded-md"
                  sizes="48px"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/products/default-product.jpg';
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {item.name.startsWith('le jeu') ? item.name : `le jeu ${item.name}`}
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
      
      {/* ✅ AJOUT: Informations de livraison */}
      <div className="text-xs text-gray-500 text-center mt-2">
        📦 Livraison gratuite à Dakar • 2,500 FCFA ailleurs au Sénégal
      </div>
    </motion.div>
  );
};