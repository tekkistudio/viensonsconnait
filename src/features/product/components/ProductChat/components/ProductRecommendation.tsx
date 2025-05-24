// src/features/product/components/ProductChat/components/ProductRecommendation.tsx
import React from 'react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface ProductRecommendationProps {
  product: Product;
  reason: string;
  onSelect: (product: Product) => void;
}

export default function ProductRecommendation({ 
  product,
  reason,
  onSelect
}: ProductRecommendationProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-16 h-16">
        <Image 
          src={product.imageUrl} 
          alt={product.name}
          fill
          className="object-cover rounded-lg"
        />
      </div>
      
      <div className="flex-1">
        <h4 className="font-medium text-[#132D5D]">{product.name}</h4>
        <p className="text-sm text-gray-600 mt-1">{reason}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[#FF7E93] font-medium">
            {product.price.toLocaleString()} FCFA
          </span>
          <button
            onClick={() => onSelect(product)}
            className="px-3 py-1 text-sm text-[#FF7E93] border border-[#FF7E93] rounded-full
              hover:bg-[#FF7E93] hover:text-white transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}