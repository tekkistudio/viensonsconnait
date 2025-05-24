// src/lib/services/product-stats.service.ts
import { supabase } from '@/lib/supabase';
import type { ProductViewStats, RealTimeStats } from '@/types/product';

export class ProductStatsService {
  private static instance: ProductStatsService;
  private viewerCache: Map<string, Set<string>> = new Map();
  private statsCache: Map<string, ProductViewStats> = new Map();
  private subscriptions: Map<string, () => void> = new Map();

  private constructor() {
    setInterval(() => this.cleanupViewerCache(), 5 * 60 * 1000);
  }

  public static getInstance(): ProductStatsService {
    if (!ProductStatsService.instance) {
      ProductStatsService.instance = new ProductStatsService();
    }
    return ProductStatsService.instance;
  }

  async getProductStats(productId: string): Promise<ProductViewStats> {
    try {
      if (this.statsCache.has(productId)) {
        const cachedStats = this.statsCache.get(productId)!;
        if (new Date().getTime() - cachedStats.lastUpdated.getTime() < 60000) {
          return cachedStats;
        }
      }

      const [{ data: productStats }, { data: orderStats }] = await Promise.all([
        supabase
          .from('product_stats')
          .select('views_count, real_sales_count')
          .eq('product_id', productId)
          .single(),
        supabase
          .from('orders')
          .select('id')
          .eq('product_id', productId)
          .eq('status', 'completed')
      ]);

      const currentViewers = this.getActiveViewers(productId);
      const stats: ProductViewStats = {
        currentViewers,
        totalViews: productStats?.views_count || 0,
        sold: productStats?.real_sales_count || 0,
        lastUpdated: new Date()
      };

      this.statsCache.set(productId, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching product stats:', error);
      return {
        currentViewers: this.getActiveViewers(productId),
        totalViews: 0,
        sold: 0,
        lastUpdated: new Date()
      };
    }
  }

  async incrementViewCount(productId: string): Promise<void> {
    try {
      await supabase.rpc('increment_product_views', { 
        input_product_id: productId 
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  async trackProductView(productId: string, visitorId: string): Promise<void> {
    try {
      if (!this.viewerCache.has(productId)) {
        this.viewerCache.set(productId, new Set());
      }
      this.viewerCache.get(productId)!.add(visitorId);

      await this.incrementViewCount(productId);
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  subscribeToStats(
    productId: string, 
    callback: (stats: RealTimeStats) => void
  ): () => void {
    const channel = supabase
      .channel(`product_stats:${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_stats',
          filter: `product_id=eq.${productId}`
        },
        async (payload) => {
          const stats = await this.getProductStats(productId);
          callback({
            viewsCount: stats.totalViews,
            salesCount: stats.sold,
            reviewsCount: 0 // À implémenter avec une vraie logique de comptage des avis
          });
        }
      )
      .subscribe();

    const unsubscribe = () => {
      channel.unsubscribe();
      this.subscriptions.delete(productId);
    };

    this.subscriptions.set(productId, unsubscribe);
    return unsubscribe;
  }

  private getActiveViewers(productId: string): number {
    const viewers = this.viewerCache.get(productId);
    return viewers ? viewers.size : 0;
  }

  private cleanupViewerCache(): void {
    const TIMEOUT = 30 * 60 * 1000;
    const now = new Date().getTime();

    this.viewerCache.forEach((viewers, productId) => {
      if (now - this.statsCache.get(productId)?.lastUpdated.getTime()! > TIMEOUT) {
        this.viewerCache.delete(productId);
      }
    });
  }
}

export const productStatsService = ProductStatsService.getInstance();