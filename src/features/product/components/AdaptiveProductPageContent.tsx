// src/features/product/components/AdaptiveProductPageContent.tsx
'use client';

import React from 'react';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import ProductPageContent from './ProductPageContent';
import MobileProductPageContent from './mobile/MobileProductPageContent';
import type { Product } from '@/types/product';

interface AdaptiveProductPageContentProps {
  productId: string;
  product: Product;
}

export default function AdaptiveProductPageContent({ 
  productId, 
  product 
}: AdaptiveProductPageContentProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <MobileProductPageContent
        productId={productId}
        product={product}
      />
    );
  }

  return (
    <ProductPageContent
      productId={productId}
      product={product}
    />
  );
}