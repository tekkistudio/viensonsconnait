// src/app/(public)/products/[slug]/not-found.tsx
import React from 'react';

export default function ProductNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Produit non trouvé</h1>
        <p className="text-gray-600 mb-8">Désolé, nous n'avons pas trouvé le produit que vous cherchez.</p>
        <a 
          href="/products" 
          className="text-white bg-[#FF7E93] hover:bg-[#ff6b85] px-6 py-3 rounded-lg transition-colors"
        >
          Voir tous nos jeux
        </a>
      </div>
    </div>
  );
}