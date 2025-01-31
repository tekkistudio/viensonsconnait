// src/config/crossSelling.ts
import type { ProductId } from '../features/product/utils/chatMessages';

interface ProductRelation {
  id: ProductId;
  priority: number;
}

export const CROSS_SELLING: Record<ProductId, ProductRelation[]> = {
  'couples': [
    { id: 'stvalentin', priority: 1 },
    { id: 'maries', priority: 2 }
  ],
  'maries': [
    { id: 'stvalentin', priority: 1 },
    { id: 'couples', priority: 2 }
  ],
  'famille': [
    { id: 'amis', priority: 1 },
    { id: 'collegues', priority: 2 }
  ],
  'amis': [
    { id: 'famille', priority: 1 },
    { id: 'collegues', priority: 2 }
  ],
  'collegues': [
    { id: 'amis', priority: 1 },
    { id: 'famille', priority: 2 }
  ],
  'stvalentin': [
    { id: 'couples', priority: 1 },
    { id: 'maries', priority: 2 }
  ]
};