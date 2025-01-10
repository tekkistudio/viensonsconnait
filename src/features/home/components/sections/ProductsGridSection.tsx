// src/features/home/components/sections/ProductsGridSection.tsx
"use client";

import React, { useState } from "react";
import { Grid, List } from "lucide-react";
import ProductCard from "./ProductCard";
import { useBreakpoint } from "../../../../core/theme/hooks/useBreakpoint";
import { products } from "../../../../lib/products";

interface ProductsGridSectionProps {
  className?: string;
  initialLayout?: "grid" | "list"; 
}

// Liste des produits
const productsList = Object.values(products);

export function ProductsGridSection({
  className = "",
  initialLayout = "grid",
}: ProductsGridSectionProps) {
  const { isMobile } = useBreakpoint(); 
  const [layout, setLayout] = useState<"grid" | "list">(initialLayout); 

  // Fonction pour basculer entre `grid` et `list`
  const toggleLayout = () => {
    setLayout(layout === "grid" ? "list" : "grid");
  };

  return (
    <section className={`w-full ${className} pt-2 md:pt-1`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de la section */}
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

        {/* Grille ou liste des produits */}
        <div
          className={`grid gap-4 md:gap-6 ${
            layout === "grid"
              ? isMobile
                ? "grid-cols-2"
                : "grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {productsList.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 6} 
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductsGridSection;