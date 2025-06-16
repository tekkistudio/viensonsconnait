// src/features/home/components/mobile/ProductMiniCarousel.tsx - VERSION AVEC GRID/LISTE
"use client"

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Grid, List, Star, ShoppingBag, ChevronRight } from 'lucide-react';
import useCountryStore from '@/core/hooks/useCountryStore';
import { productService } from '@/lib/services/product.service';
import { productStatsService } from '@/lib/services/product-stats.service';
import type { Product } from '@/types/product';
import { getProductImages, generateImageProps } from '@/utils/image';

interface ProductMiniCarouselProps {
  className?: string;
  onProductSelect?: (productId: string) => void;
}

// ✅ NOUVEAU: Interface pour produit avec stats de ventes
interface ProductWithSales extends Product {
  salesCount?: number;
  averageRating?: number;
}

export default function ProductMiniCarousel({ 
  className = "",
  onProductSelect 
}: ProductMiniCarouselProps) {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const [products, setProducts] = useState<ProductWithSales[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // ✅ MODIFICATION: Liste par défaut
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        const activeProducts = data
          .filter(p => p.status === 'active')
          .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        // ✅ NOUVEAU: Charger les stats de ventes pour chaque produit
        const productsWithSales = await Promise.all(
          activeProducts.map(async (product) => {
            try {
              const stats = await productStatsService.getProductStats(product.id);
              return {
                ...product,
                salesCount: stats.sold || product.stats?.sold || 0,
                averageRating: product.stats?.satisfaction || 5
              };
            } catch (error) {
              console.error(`Error loading sales for product ${product.id}:`, error);
              return {
                ...product,
                salesCount: product.stats?.sold || 0,
                averageRating: product.stats?.satisfaction || 5
              };
            }
          })
        );
        
        setProducts(productsWithSales);
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-semibold">Nos Jeux</h2>
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
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
        {/* ✅ NOUVEAU: Header avec contrôles de vue */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">Nos Jeux</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/nos-jeux')}
              className="text-white/60 text-sm hover:text-white transition-colors"
            >
              Voir tout
            </button>
            
            {/* ✅ MODIFICATION: Boutons de changement de vue - Liste par défaut */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-brand-pink text-white' 
                    : 'text-white/50 hover:text-white'
                }`}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-brand-pink text-white' 
                    : 'text-white/50 hover:text-white'
                }`}
                title="Vue grille"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* ✅ NOUVEAU: Contenu adaptatif selon le mode de vue */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === 'list' ? (
              // ✅ MODE LISTE: Affichage vertical (PAR DÉFAUT)
              <div className="space-y-3 max-h-66 overflow-y-auto scrollbar-hide">
                {products.slice(0, 6).map((product, index) => {
                  const images = getProductImages(product);
                  const formattedPrice = convertPrice(product.price)?.formatted;
                  
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-3 bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer group transition-colors"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Image miniature */}
                      <div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
                        <Image
                          {...generateImageProps(images[0], product.name)}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="64px"
                        />
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm mb-1 line-clamp-1 group-hover:text-brand-pink transition-colors">
                          {product.name}
                        </h4>
                        
                        {formattedPrice && (
                          <p className="text-brand-pink font-bold text-sm mb-2">
                            {formattedPrice}
                          </p>
                        )}
                        
                        {/* Stats en liste */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-white/60">
                            <ShoppingBag className="w-3 h-3" />
                            <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Icône de navigation */}
                      <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
                
                {/* Bouton voir plus si mode liste */}
                {products.length > 6 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => router.push('/nos-jeux')}
                    className="w-full p-3 text-center text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-colors"
                  >
                    Voir tous les {products.length} jeux
                  </motion.button>
                )}
              </div>
            ) : (
              // ✅ MODE GRILLE: Scroll horizontal (OPTIONNEL)
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
                      </div>

                      {/* Nom du produit */}
                      <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-brand-pink transition-colors">
                        {product.name}
                      </h4>

                      {/* Prix */}
                      {formattedPrice && (
                        <p className="text-brand-pink font-bold text-sm mb-2">
                          {formattedPrice}
                        </p>
                      )}

                      {/* Stats des vente */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-white/60">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ✅ INDICATEUR DE SCROLL (uniquement en mode grille) */}
        {viewMode === 'grid' && (
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
        )}
      </div>
    </div>
  );
}