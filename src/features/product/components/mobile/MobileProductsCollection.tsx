// src/features/product/components/mobile/MobileProductsCollection.tsx
"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Grid, List, Star, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { productService } from '@/lib/services/product.service';
import { productStatsService } from '@/lib/services/product-stats.service';
import useCountryStore from '@/core/hooks/useCountryStore';
import { getProductImages, generateImageProps } from '@/utils/image';
import { useTheme } from '@/core/context/ThemeContext';
import type { Product } from '@/types/product';

const categories = [
  { id: "all", name: "Tous", emoji: "🎮" },
  { id: "couples", name: "Couples", emoji: "💕" },
  { id: "famille", name: "Famille", emoji: "👨‍👩‍👧‍👦" },
  { id: "amis", name: "Amis", emoji: "👫" },
  { id: "collegues", name: "Collègues", emoji: "💼" }
];

const sortOptions = [
  { id: "featured", name: "En vedette", icon: "⭐" },
  { id: "price-asc", name: "Prix ↗", icon: "💰" },
  { id: "price-desc", name: "Prix ↘", icon: "💎" },
  { id: "popular", name: "Populaire", icon: "🔥" }
];

interface ProductWithSales extends Product {
  salesCount?: number;
  averageRating?: number;
}

export default function MobileProductsCollection() {
  const router = useRouter();
  const { convertPrice } = useCountryStore();
  const { theme } = useTheme();
  
  const [products, setProducts] = useState<ProductWithSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        const activeProducts = data.filter(p => p.status === 'active');
        
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
      } catch (err) {
        setError('Erreur lors du chargement des produits');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredAndSortedProducts = products
    .filter(product => {
      if (selectedCategory !== "all") {
        if (selectedCategory === "couples") {
          return ["couples", "maries", "stvalentin"].includes(product.category);
        }
        return product.category === selectedCategory;
      }
      return true;
    })
    .filter(product => {
      if (searchQuery.trim()) {
        return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "popular":
          return (b.salesCount || 0) - (a.salesCount || 0);
        default:
          return (a.display_order || 999) - (b.display_order || 999);
      }
    });

  const handleProductClick = (product: Product) => {
    router.push(`/products/${product.slug || product.id}`);
  };

  const handleCategoryScroll = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 120;
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="relative h-64 hero-products-collection">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-theme-primary text-xl font-bold mb-2">Oups !</h2>
          <p className="text-theme-secondary mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Hero Section avec dégradé corrigé */}
      <section className="relative h-64 hero-products-collection overflow-hidden pt-16">
        <div className="absolute inset-0 bg-theme-primary/20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-full flex flex-col justify-center px-6 text-center"
        >
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'light' 
              ? 'text-black drop-shadow-lg' 
              : 'text-black drop-shadow-lg'
          }`}>
            Nos Jeux de Cartes
          </h1>
          <p className={`text-lg ${
            theme === 'light' 
              ? 'text-black/90 drop-shadow' 
              : 'text-black/80 drop-shadow'
          }`}>
            {products.length} jeux pour améliorer et renforcer vos relations avec vos proches
          </p>
        </motion.div>
      </section>

      {/* Search & Filters Bar */}
      <div className="sticky top-0 z-20 bg-theme-primary/95 backdrop-blur-sm border-b border-theme">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un jeu..."
              className="w-full pl-10 pr-4 py-3 bg-theme-card text-theme-primary placeholder-theme-secondary rounded-xl border border-theme focus:border-brand-pink focus:outline-none transition-colors"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  showFilters 
                    ? 'bg-brand-pink text-white' 
                    : 'bg-theme-card text-theme-secondary'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filtres</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-brand-pink text-white' 
                    : 'bg-theme-card text-theme-secondary'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-brand-pink text-white' 
                    : 'bg-theme-card text-theme-secondary'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-theme overflow-hidden"
            >
              {/* Categories */}
              <div className="p-4">
                <h3 className="text-theme-primary font-semibold mb-3">Catégories</h3>
                <div 
                  ref={categoriesRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
                >
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        selectedCategory === category.id
                          ? "bg-brand-pink text-white"
                          : "bg-theme-card text-theme-secondary"
                      }`}
                    >
                      <span>{category.emoji}</span>
                      <span className="text-sm">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className="p-4 border-t border-theme">
                <h3 className="text-theme-primary font-semibold mb-3">Trier par</h3>
                <div className="grid grid-cols-2 gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        sortBy === option.id
                          ? "bg-brand-pink text-white"
                          : "bg-theme-card text-theme-secondary"
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Products Grid/List */}
      <div className="p-4">
        {filteredAndSortedProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-theme-primary text-xl font-bold mb-2">
              Aucun résultat
            </h3>
            <p className="text-theme-secondary mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSortBy("featured");
              }}
              className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold"
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={
              viewMode === 'grid' 
                ? "grid grid-cols-2 gap-4" 
                : "space-y-4"
            }
          >
            {filteredAndSortedProducts.map((product, index) => {
              const images = getProductImages(product);
              const formattedPrice = convertPrice(product.price)?.formatted;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleProductClick(product)}
                  className={`group cursor-pointer ${
                    viewMode === 'list' ? 'flex gap-4' : ''
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <div className="bg-theme-card rounded-xl overflow-hidden border border-theme transition-colors hover:shadow-lg">
                      <div className="relative aspect-[3/4]">
                        <Image
                          {...generateImageProps(images[0], product.name)}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 200px"
                        />
                        
                        {product.badges && product.badges.length > 0 && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-md">
                              {product.badges[0].text}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h3 className="text-theme-primary font-semibold text-sm mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        
                        {formattedPrice && (
                          <p className="text-brand-pink font-bold text-lg">
                            {formattedPrice}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-theme-secondary text-xs">
                            <ShoppingBag className="w-3 h-3" />
                            <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 bg-theme-card rounded-xl p-4 border border-theme transition-colors hover:shadow-lg">
                      <div className="relative w-20 h-24 flex-shrink-0">
                        <Image
                          {...generateImageProps(images[0], product.name)}
                          fill
                          className="object-cover rounded-lg"
                          sizes="80px"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-theme-primary font-semibold mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        
                        <p className="text-theme-secondary text-sm mb-2 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          {formattedPrice && (
                            <span className="text-brand-pink font-bold">
                              {formattedPrice}
                            </span>
                          )}
                          
                          <div className="flex items-center gap-3 text-theme-secondary text-xs">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />
                              <span>{product.salesCount?.toLocaleString() || '0'} vendus</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 mt-8 text-center"
      >
        <div className="bg-gradient-to-r from-brand-pink/10 to-brand-blue/10 backdrop-blur-sm rounded-2xl p-6 border border-theme">
          <h3 className="text-theme-primary text-xl font-bold mb-2">
            Vous ne savez pas quel jeu choisir ?
          </h3>
          <p className="text-theme-secondary mb-4">
            Cliquez sur un jeu et faites-vous conseiller par Rose, notre assistante d'achat.
          </p>
          <div className="flex items-center justify-center gap-2 text-brand-pink">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm font-medium">Plus de 7000 jeux vendus</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}