// src/features/shop/hooks/useProductsLayout.ts
import { useState } from 'react';

export type ProductLayout = 'grid' | 'list';

export function useProductsLayout(defaultLayout: ProductLayout = 'grid') {
  const [layout, setLayout] = useState<ProductLayout>(defaultLayout);

  return { layout, setLayout };
}