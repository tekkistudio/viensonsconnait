// src/features/product/components/mobile/MobileRelatedProducts.tsx
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Star, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productService } from '@/lib/services/product.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { getProductImages, generateImageProps } from '@/utils/image';

interface MobileRelatedProductsProps {
  currentProductId: string;
  productCategory: string;
}

interface ProductWithReviews extends Product {
  reviewsCount?: number;
  averageRating?: number;
}

export default function MobileRelatedProducts({
  currentProductId,
  productCategory
}: MobileRelatedProductsProps) {
  const { convertPrice } = useCountryStore();
  const [relatedProducts, setRelatedProducts] = useState<ProductWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadRelatedProducts() {
      setLoading(true);
      try {
        // Charger les produits liés
        const products = await productService.getRelatedProducts(
          currentProductId, 
          productCategory
        );

        // Charger les témoignages pour chaque produit
        const productsWithReviews = await Promise.all(
          products.map(async (product) => {
            try {
              const [reviewsCount, averageRating] = await Promise.all([
                testimonialsService.getTestimonialsCountByProduct(product.id),
                testimonialsService.getAverageRating(product.id)
              ]);

              return {
                ...product,
                reviewsCount: reviewsCount || 0,
                averageRating: averageRating || 5
              };
            } catch (error) {
              console.error(`Error loading reviews for product ${product.id}:`, error);
              return {
                ...product,
                reviewsCount: product.stats?.reviews || 0,
                averageRating: product.stats?.satisfaction || 5
              };
            }
          })
        );

        setRelatedProducts(productsWithReviews);
      } catch (error) {
        console.error('Failed to load related products:', error);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    }

    if (currentProductId && productCategory) {
      loadRelatedProducts();
    }
  }, [currentProductId, productCategory]);

  const handleProductClick = (product: Product) => {
    router.push(`/products/${product.slug || product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAll = () => {
    router.push('/nos-jeux');
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Nos Autres Jeux</h3>
          <button className="text-white/60 text-sm">Voir tout</button>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex-shrink-0 w-40">
              <div className="aspect-[3/4] bg-white/10 rounded-xl animate-pulse mb-3" />
              <div className="h-4 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg">Nos Autres Jeux</h3>
        <button 
          onClick={handleViewAll}
          className="flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors"
        >
          <span>Voir tout</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {relatedProducts.map((product, index) => {
          const images = getProductImages(product);
          const formattedPrice = convertPrice(product.price)?.formatted;
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-40 cursor-pointer group"
              style={{ scrollSnapAlign: 'start' }}
              onClick={() => handleProductClick(product)}
            >
              {/* Image */}
              <div className="relative aspect-[3/4] mb-3 rounded-xl overflow-hidden bg-white/10">
                <Image
                  {...generateImageProps(images[0], product.name)}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="160px"
                />
                
                {/* Overlay au hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badge si applicable */}
                {product.badges && product.badges.length > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                      {product.badges[0].text}
                    </span>
                  </div>
                )}

                {/* Prix overlay */}
                {formattedPrice && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-sm font-bold">
                      {formattedPrice}
                    </div>
                  </div>
                )}
              </div>

              {/* Nom du produit */}
              <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-brand-pink transition-colors">
                {product.name}
              </h4>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.round(product.averageRating || 5)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white/60 text-xs">
                  ({product.reviewsCount || 0})
                </span>
              </div>

              {/* Stats complémentaires */}
              <div className="text-white/50 text-xs">
                {product.stats?.sold ? `${product.stats.sold}+ vendus` : 'Populaire'}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scroll hint */}
      <div className="flex justify-center mt-4">
        <div className="flex gap-1">
          {[...Array(Math.min(5, Math.ceil(relatedProducts.length / 3)))].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-white/30 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}