// src/features/home/components/mobile/ProductMiniCarousel.tsx 
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

// ✅ Interface pour produit avec stats de ventes
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // ✅ MODIFICATION: Grid par défaut
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        const activeProducts = data
          .filter(p => p.status === 'active')
          .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        // ✅ Charger les stats de ventes pour chaque produit
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
  <div className={`bg-theme-primary border-t border-theme ${className}`}>
    <div className="bg-theme-card/50 backdrop-blur-sm border-b border-theme">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-theme-primary text-lg font-semibold">Nos Jeux</h2>
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-theme-secondary/20 rounded animate-pulse" />
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-theme-secondary/20 rounded animate-pulse" />
                <div className="w-8 h-8 bg-theme-secondary/20 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-theme-secondary/20 rounded-lg animate-pulse" />
                <div className="h-4 bg-theme-secondary/20 rounded animate-pulse" />
                <div className="h-3 bg-theme-secondary/20 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
  </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`bg-theme-primary border-t border-theme mt-1 ${className}`}>
      <div className="p-6">
        {/* ✅ Header avec contrôles de vue */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-theme-primary text-lg font-semibold">Nos Jeux</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/nos-jeux')}
              className="text-theme-secondary text-sm hover:text-brand-pink transition-colors"
            >
              Voir tout
            </button>
            
            {/* ✅ Boutons de changement de vue */}
            <div className="flex items-center gap-1 bg-theme-secondary/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-brand-pink text-white' 
                    : 'text-theme-secondary hover:text-white'
                }`}
                title="Vue grille"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-brand-pink text-white' 
                    : 'text-theme-secondary hover:text-white'
                }`}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
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
            {viewMode === 'grid' ? (
              // ✅ MODE GRILLE: Affichage en grille 2x3 (PAR DÉFAUT)
              <div className="grid grid-cols-2 gap-4">
                {products.slice(0, 6).map((product, index) => {
                  const images = getProductImages(product);
                  const formattedPrice = convertPrice(product.price)?.formatted;
                  
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="bg-theme-secondary/5 hover:bg-theme-secondary/10 rounded-xl overflow-hidden border border-theme transition-colors">
                        {/* Image */}
                        <div className="relative aspect-[3/4]">
                          <Image
                            {...generateImageProps(images[0], product.name)}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, 200px"
                          />
                          
                          {/* Badge si applicable */}
                          {product.badges && product.badges.length > 0 && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                                {product.badges[0].text}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Contenu */}
                        <div className="p-3">
                          <h3 className="text-theme-primary font-semibold text-sm mb-1 line-clamp-2 group-hover:text-brand-pink transition-colors">
                            {product.name}
                          </h3>
                          
                          {formattedPrice && (
                            <p className="text-brand-pink font-bold text-lg mb-2">
                              {formattedPrice}
                            </p>
                          )}
                          
                          {/* Stats des ventes */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-theme-secondary">
                              <ShoppingBag className="w-3 h-3" />
                              <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // ✅ MODE LISTE: Affichage vertical comme sur la page Nos Jeux
              <div className="space-y-3 max-h-120 overflow-y-auto scrollbar-hide">
                {products.slice(0, 8).map((product, index) => {
                  const images = getProductImages(product);
                  const formattedPrice = convertPrice(product.price)?.formatted;
                  
                  // Générer une description tronquée
                  const truncatedDescription = product.description 
                    ? product.description.length > 80 
                      ? `${product.description.substring(0, 80).trim()}...`
                      : product.description
                    : `Découvrez ${product.name}, un jeu conçu pour créer des moments authentiques...`;
                  
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 bg-theme-secondary/5 hover:bg-theme-secondary/10 rounded-xl p-3 cursor-pointer group border border-theme transition-colors"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Image miniature */}
                      <div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden">
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
                        
                        <p className="text-theme-secondary text-xs mb-2 line-clamp-2 leading-relaxed">
                          {truncatedDescription}
                        </p>
                        
                        {formattedPrice && (
                          <p className="text-brand-pink font-bold text-sm mb-2">
                            {formattedPrice}
                          </p>
                        )}
                        
                        {/* Stats en liste */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-theme-secondary">
                            <ShoppingBag className="w-3 h-3" />
                            <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Icône de navigation */}
                      <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-theme-secondary/40 group-hover:text-brand-pink transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
                
                {/* Bouton voir plus si mode liste */}
                {products.length > 8 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => router.push('/nos-jeux')}
                    className="w-full p-3 text-center text-theme-secondary hover:text-brand-pink border border-theme hover:border-brand-pink/30 rounded-lg transition-colors"
                  >
                    Voir tous les {products.length} jeux
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ✅ Indicateur de contenu (uniquement en mode grille si plus de 6 produits) */}
        {viewMode === 'grid' && products.length > 6 && (
          <div className="flex justify-center mt-4">
            <div className="flex gap-1">
              {[...Array(Math.min(3, Math.ceil(products.length / 6)))].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-theme-secondary/30 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}