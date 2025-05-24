// src/features/product/components/ProductChat/components/ProductStats.tsx
import React, { useEffect, useState } from 'react';
import { Eye, ShoppingBag } from 'lucide-react';
import { productStatsService } from '@/lib/services/product-stats.service';

interface ProductStatsProps {
  productId: string;
  initialStats?: {
    sold?: number;
    currentViewers?: number;
  };
}

const ProductStats: React.FC<ProductStatsProps> = ({ productId, initialStats }) => {
  const [stats, setStats] = useState(initialStats || { sold: 0, currentViewers: 0 });
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    const visitorId = localStorage.getItem('visitorId') || 
                     `visitor_${Date.now()}_${Math.random()}`;
    localStorage.setItem('visitorId', visitorId);

    productStatsService.trackProductView(productId, visitorId);

    const updateStats = async () => {
      try {
        const newStats = await productStatsService.getProductStats(productId);
        setStats({
          sold: newStats.sold,
          currentViewers: newStats.currentViewers
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, [productId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-8 text-sm text-gray-700 py-3">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-8 text-sm text-gray-700 py-3">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-gray-600 flex-shrink-0" />
        <span className="truncate">
          {stats.currentViewers} {stats.currentViewers === 1 ? 'visiteur en ligne' : 'visiteurs en ligne'} 
        </span>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <ShoppingBag className="w-4 h-4 text-gray-600 flex-shrink-0" />
        <span>{stats.sold?.toLocaleString() || '0'} ventes</span>
      </div>
    </div>
  );
};

export default ProductStats;