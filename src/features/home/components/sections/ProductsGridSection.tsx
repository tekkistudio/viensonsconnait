// src/features/home/components/sections/ProductsGridSection.tsx
"use client";

import { useState, useEffect } from "react";
import { Grid, List, Loader2 } from "lucide-react";
import ProductCard from "./ProductCard";
import { useBreakpoint } from "@/core/theme/hooks/useBreakpoint";
import { productService } from '@/lib/services/product.service';
import type { Product } from '@/types/product';

interface ProductsGridSectionProps {
  className?: string;
  initialLayout?: "grid" | "list";
  category?: string;
}

export function ProductsGridSection({
  className = "",
  initialLayout = "grid",
  category,
}: ProductsGridSectionProps) {
  const { isMobile } = useBreakpoint();
  const [layout, setLayout] = useState<"grid" | "list">(initialLayout);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getAllProducts();
        
        if (category) {
          setProducts(data.filter((p: Product) => p.metadata?.category === category));
        } else {
          setProducts(data);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Erreur lors du chargement des produits');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [category]);

  const toggleLayout = () => setLayout(layout === "grid" ? "list" : "grid");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <section className={`w-full ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-brand-blue">Nos Jeux</h2>
          {isMobile && (
            <button
              onClick={toggleLayout}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label={`Afficher en ${layout === "grid" ? "liste" : "grille"}`}
            >
              {layout === "grid" ? (
                <List className="w-5 h-5 text-gray-600" />
              ) : (
                <Grid className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {products.length > 0 ? (
          <div
            className={`grid gap-4 md:gap-6 ${
              layout === "grid"
                ? isMobile
                  ? "grid-cols-2"
                  : "grid-cols-3"
                : "grid-cols-1"
            }`}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={true}
                isMobile={isMobile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Aucun jeu disponible
          </div>
        )}
      </div>
    </section>
  );
}