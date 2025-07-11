// src/features/product/components/ProductChat/components/PostOrderRecommendations.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingBag, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface PostOrderRecommendationsProps {
  currentProductId: string;
  onProductSelect: (productId: string, productName: string) => void;
  onContinueShopping: () => void;
}

export const PostOrderRecommendations: React.FC<PostOrderRecommendationsProps> = ({
  currentProductId,
  onProductSelect,
  onContinueShopping
}) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [currentProductId]);

  const loadRecommendations = async () => {
    try {
      // Charger les produits recommandés depuis la base
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, images, metadata')
        .neq('id', currentProductId)
        .eq('status', 'active')
        .order('display_order', { ascending: true })
        .limit(3);

      if (!error && data) {
        // Mapper les recommandations selon la logique métier
        const mappedRecommendations = data.map(product => ({
          ...product,
          reason: getRecommendationReason(currentProductId, product.id),
          discount: calculateDiscount(product)
        }));
        
        setRecommendations(mappedRecommendations);
      }
    } catch (error) {
      console.error('Erreur chargement recommandations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationReason = (currentId: string, recommendedId: string) => {
    // Logique de recommandation basée sur les catégories
    const reasons: Record<string, string> = {
      'couples-maries': 'Parfait pour renforcer votre complicité',
      'couples-amis': 'Idéal pour vos soirées entre amis',
      'maries-famille': 'Pour des moments inoubliables en famille',
      default: 'Découvrez une nouvelle façon de vous connecter'
    };
    
    const key = `${currentId}-${recommendedId}`;
    return reasons[key] || reasons.default;
  };

  const calculateDiscount = (product: any) => {
    if (product.metadata?.bundle_discount) {
      return product.metadata.bundle_discount;
    }
    return 10; // 10% de réduction par défaut sur le 2ème jeu
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-4"
    >
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="font-bold text-green-800">Commande confirmée ! 🎉</h3>
        <p className="text-sm text-green-700 mt-1">
          Profitez de -10% sur un 2ème jeu
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#FF7E93]" />
          Complétez votre collection
        </h4>

        {recommendations.map((product) => (
          <motion.button
            key={product.id}
            onClick={() => onProductSelect(product.id, product.name)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-white rounded-lg border border-gray-200 
              hover:border-[#FF7E93] hover:shadow-md transition-all duration-200
              flex items-center gap-3 text-left group"
          >
            {product.images?.[0] && (
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover rounded-md"
                />
                {product.discount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white 
                    text-xs font-bold rounded-full w-8 h-8 flex items-center 
                    justify-center">
                    -{product.discount}%
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-1">
              <h5 className="font-medium text-gray-800 group-hover:text-[#FF7E93] 
                transition-colors">
                {product.name}
              </h5>
              <p className="text-sm text-gray-600 line-clamp-1">
                {product.reason}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#FF7E93] font-bold">
                  {Math.round(product.price * (1 - product.discount / 100)).toLocaleString()} FCFA
                </span>
                {product.discount > 0 && (
                  <span className="text-xs text-gray-400 line-through">
                    {product.price.toLocaleString()} FCFA
                  </span>
                )}
              </div>
            </div>
            
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF7E93] 
              transition-colors" />
          </motion.button>
        ))}
      </div>

      <button
        onClick={onContinueShopping}
        className="w-full py-3 text-gray-600 hover:text-gray-800 
          transition-colors text-sm flex items-center justify-center gap-2"
      >
        <span>Continuer sans ajouter</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};