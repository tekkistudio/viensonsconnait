// Alternative : Version sans useSearchParams (plus simple pour le build)
"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductCard from "../../home/components/sections/ProductCard";
import { useBreakpoint } from "../../../core/theme/hooks/useBreakpoint";
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';

const categories = [
  { id: "all", name: "Tous les jeux" },
  { id: "couples", name: "Pour les Couples" },
  { id: "famille", name: "Pour la Famille" },
  { id: "amis", name: "Pour les Amis" },
  { id: "collegues", name: "Pour les Collègues" }
];

const sortOptions = [
  { id: "featured", name: "En vedette" },
  { id: "price-asc", name: "Prix croissant" },
  { id: "price-desc", name: "Prix décroissant" }
];

export function ProductsCollection() {
  const { isMobile } = useBreakpoint();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (err) {
        setError('Erreur lors du chargement des produits');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
  };

  // Filtrer les produits
  const filteredProducts = loading ? [] : (
    selectedCategory === "all"
      ? products
      : products.filter(product => {
          if (selectedCategory === "couples") {
            return ["couples", "maries", "stvalentin"].includes(product.category);
          }
          return product.category === selectedCategory;
        })
  );

  // Trier les produits
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF7E93] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-brand-blue text-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-transparent" />
        <motion.div
          className="relative max-w-6xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Nos Jeux de Cartes
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Découvrez notre collection de jeux conçus pour créer des moments de connexion 
            authentiques et renforcer vos relations avec vos proches.
          </p>
        </motion.div>
      </section>

      {/* Section principale */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Barre de filtres */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? "bg-brand-blue text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 self-end md:self-auto">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] bg-gray-50">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Grille de produits */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col h-full"
              >
                <ProductCard
                  product={product}
                  priority={index < 6}
                  isMobile={isMobile}
                />
              </motion.div>
            ))}
          </div>

          {/* Message si aucun produit */}
          {sortedProducts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-xl shadow-sm"
            >
              <p className="text-gray-600">
                Aucun jeu ne correspond à vos critères de recherche.
              </p>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-16 pt-16 border-t border-gray-200"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-brand-blue mb-4">
              Vous ne savez pas quel jeu choisir ?
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Cliquez sur celui qui vous attire le plus et posez vos questions directement à Rose, votre Assistante d'achat. Elle vous aidera à choisir le meilleur jeu pour vous.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}