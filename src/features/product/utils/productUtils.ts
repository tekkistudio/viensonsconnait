// src/features/product/utils/productUtils.ts
import { Product } from '@/types/product';

export const ensureCompleteProduct = (partialProduct: Partial<Product>): Product => {
  const defaultProduct: Product = {
    id: partialProduct.id || '',
    slug: partialProduct.id || '',
    name: partialProduct.name || '',
    description: partialProduct.description || '',
    price: partialProduct.price || 0,
    images: partialProduct.images || [],
    media: partialProduct.media || [],
    category: partialProduct.category || '',
    metadata: {
      category: partialProduct.category || '',
      players: '2-8 joueurs',
      duration: '30-60 minutes',
      language: 'Français',
      min_age: 18,
      stats: {
        sold: 0,
        satisfaction: 98,
        reviews: 0
      },
      benefits: partialProduct.benefits || [],
      topics: partialProduct.topics || []
    },
    benefits: partialProduct.benefits || [],
    topics: partialProduct.topics || [],
    createdAt: partialProduct.createdAt || new Date().toISOString(),
    stats: {
      sold: 0,
      satisfaction: 0,
      reviews: 0,
      currentViewers: undefined,
      totalViews: undefined,
      productId: undefined
    }
  };

  return defaultProduct;
};