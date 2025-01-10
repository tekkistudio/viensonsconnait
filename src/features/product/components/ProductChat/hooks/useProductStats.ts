// src/features/product/hooks/useProductStats.ts
import { useState, useEffect } from 'react';
import type { ProductStats } from '../../../../../types/stats';
import { products } from '../../../../../lib/products';

export function useProductStats(productId: string) {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cette fonction sera utilisée plus tard pour récupérer les vraies statistiques
    const fetchStats = async () => {
      try {
        // TODO: Remplacer par un vrai appel API
        const response = await fetch(`/api/products/${productId}/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    // Pour l'instant, on utilise des stats mockées
    const currentProduct = products[productId];
    setStats({
      currentViewers: 47,
      totalSales: currentProduct?.stats?.sold || 0,
      reviews: currentProduct?.stats?.reviews || 0,
      satisfaction: currentProduct?.stats?.satisfaction || 5
    });
    setLoading(false);
  }, [productId]);

  return { stats, loading };
}