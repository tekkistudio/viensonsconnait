// src/features/product/components/AdaptiveProductsCollection.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import { ProductsCollection } from './ProductsCollection';
import MobileProductsCollection from './mobile/MobileProductsCollection';

export function AdaptiveProductsCollection() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileProductsCollection />;
  }

  return <ProductsCollection />;
}