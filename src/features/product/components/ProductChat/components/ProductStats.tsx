// src/features/product/components/ProductChat/components/ProductStats.tsx
import React from 'react';
import { Eye, ShoppingBag } from 'lucide-react';

interface ProductStatsProps {
  stats: {
    sold?: number;
    currentViewers?: number;
  };
}

const ProductStats: React.FC<ProductStatsProps> = ({ stats }) => (
  <div className="flex items-center justify-between text-sm text-gray-700 px-4 py-3 bg-gray-50 border-t">
    <div className="flex items-center gap-2">
      <Eye className="w-4 h-4" />
      <span>{stats.currentViewers || 47} personnes consultent ce jeu</span>
    </div>
    <div className="flex items-center gap-2">
      <ShoppingBag className="w-4 h-4" />
      <span>{stats.sold ? stats.sold.toLocaleString() : '0'} ventes</span>
    </div>
  </div>
);

export default ProductStats;