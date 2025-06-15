// src/features/home/components/mobile/ProductMiniCarousel.tsx
"use client"

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';
import { getProductImages, generateImageProps } from '@/utils/image';

interface ProductMiniCarouselProps {
  className?: string;
  onProductSelect?: (productId: string) => void;
}

export default function ProductMiniCarousel({ 
  className = "",
  onProductSelect 
}: ProductMiniCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        const activeProducts = data
          .filter(p => p.status === 'active')
          .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        setProducts(activeProducts);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleProductClick = (product: Product) => {
    if (onProductSelect) {
      onProductSelect(product.id);
    } else {
      router.push(`/products/${product.slug || product.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-black/90 backdrop-blur-sm ${className}`}>
        <div className="p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Nos Jeux</h2>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <div className="aspect-[3/4] bg-gray-700 rounded-lg animate-pulse mb-2" />
                <div className="h-4 bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`bg-black/90 backdrop-blur-sm ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">Nos Jeux</h2>
          <button 
            onClick={() => router.push('/nos-jeux')}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Voir tout
          </button>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {products.map((product, index) => {
            const images = getProductImages(product);
            const formattedPrice = convertPrice(product.price)?.formatted;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 w-28 cursor-pointer group"
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => handleProductClick(product)}
              >
                {/* Image */}
                <div className="relative aspect-[3/4] mb-2 rounded-lg overflow-hidden bg-gray-800">
                  <Image
                    {...generateImageProps(images[0], product.name)}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="112px"
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
                </div>

                {/* Nom du produit */}
                <h3 className="text-white text-sm font-medium mb-1 line-clamp-2 group-hover:text-brand-pink transition-colors">
                  {product.name}
                </h3>

                {/* Prix */}
                {formattedPrice && (
                  <p className="text-white/70 text-xs font-medium">
                    {formattedPrice}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center mt-4">
          <div className="flex gap-1">
            {[...Array(Math.min(5, Math.ceil(products.length / 3)))].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-white/30 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}