// src/features/product/components/ProductPage.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useBreakpoint } from '../../../core/theme/hooks/useBreakpoint';
import { ChatProvider } from '../context/ChatContext';
import { products } from '../../../lib/products';
import type { Product } from '../../../types/product';
import { useLayoutContext } from '../../../core/context/LayoutContext';

// Chargement dynamique des composants
const ProductPageContent = dynamic(() => import('./ProductPageContent'), { 
  ssr: false 
});

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialisation du produit
  useEffect(() => {
    setIsClient(true);
    if (productId && typeof productId === 'string') {
      const foundProduct = products[productId];
      if (foundProduct) {
        setProduct(foundProduct);
      }
    }
  }, [productId]);

  if (!isClient || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93]" />
      </div>
    );
  }

  return (
    <ChatProvider product={product}>
      <ProductPageContent product={product} />
    </ChatProvider>
  );
}