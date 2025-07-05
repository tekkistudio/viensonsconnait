// src/lib/services/PerformanceOptimizer.ts - OPTIMISATION DES PERFORMANCES

import { supabase } from '@/lib/supabase';
import type { ProductData, ChatMessage } from '@/types/chat';

// ✅ INTERFACES POUR L'OPTIMISATION
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  hitCount: number;
  lastAccess: number;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
}

interface DatabaseQuery {
  id: string;
  query: string;
  params: any;
  timestamp: number;
  duration?: number;
  fromCache: boolean;
}

interface OptimizationConfig {
  maxCacheSize: number;
  defaultCacheTTL: number;
  maxConcurrentRequests: number;
  queryTimeout: number;
  enableQueryBatching: boolean;
  enablePreloading: boolean;
  enableCompression: boolean;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  // ✅ CACHE MULTI-NIVEAUX
  private cache = new Map<string, CacheEntry<any>>();
  private queryCache = new Map<string, CacheEntry<any>>();
  private productCache = new Map<string, CacheEntry<ProductData>>();
  private messageCache = new Map<string, CacheEntry<ChatMessage>>();
  
  // ✅ GESTION DES REQUÊTES
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private queryMetrics: DatabaseQuery[] = [];
  
  // ✅ CONFIGURATION
  private config: OptimizationConfig = {
    maxCacheSize: 1000,
    defaultCacheTTL: 5 * 60 * 1000, // 5 minutes
    maxConcurrentRequests: 10,
    queryTimeout: 30000, // 30 secondes
    enableQueryBatching: true,
    enablePreloading: true,
    enableCompression: true
  };

  // ✅ MÉTRIQUES DE PERFORMANCE
  private performanceMetrics: PerformanceMetrics = {
    cacheHitRate: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    activeConnections: 0,
    queueSize: 0
  };

  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeOptimizer();
    console.log('⚡ PerformanceOptimizer initialized');
  }

  public static getInstance(): PerformanceOptimizer {
    if (!this.instance) {
      this.instance = new PerformanceOptimizer();
    }
    return this.instance;
  }

  // ✅ INITIALISATION DU SYSTÈME D'OPTIMISATION

  private initializeOptimizer(): void {
    // Nettoyage automatique du cache toutes les minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60000);

    // Mise à jour des métriques toutes les 30 secondes
    this.metricsInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000);

    // Préchargement des données critiques
    if (this.config.enablePreloading) {
      this.preloadCriticalData();
    }

    // Listener pour optimiser automatiquement selon l'usage
    this.setupAutoOptimization();
  }

  // ✅ GESTION DU CACHE INTELLIGENT

  public async getCached<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.config.defaultCacheTTL,
    forceRefresh: boolean = false
  ): Promise<T> {
    const cacheKey = this.normalizeCacheKey(key);
    
    // Vérifier le cache si pas de refresh forcé
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        cached.hitCount++;
        cached.lastAccess = Date.now();
        console.log('🎯 Cache hit:', cacheKey);
        return cached.data;
      }
    }

    // Récupérer les données fraîches
    console.log('📦 Cache miss, fetching:', cacheKey);
    const startTime = performance.now();
    
    try {
      const data = await this.executeWithTimeout(fetchFunction(), this.config.queryTimeout);
      const duration = performance.now() - startTime;
      
      // Mettre en cache
      this.setCache(cacheKey, data, ttl);
      
      // Enregistrer la métrique
      this.recordQueryMetric({
        id: this.generateQueryId(),
        query: key,
        params: {},
        timestamp: Date.now(),
        duration,
        fromCache: false
      });
      
      return data;
    } catch (error) {
      console.error('❌ Cache fetch error:', error);
      
      // Retourner une version expirée du cache si disponible
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('🔄 Returning stale cache data');
        return staleCache.data;
      }
      
      throw error;
    }
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    const cacheKey = this.normalizeCacheKey(key);
    
    // Vérifier la limite de taille du cache
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastUsed();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      hitCount: 0,
      lastAccess: Date.now()
    };
    
    this.cache.set(cacheKey, entry);
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedScore = Infinity;
    
    this.cache.forEach((entry, key) => {
      // Score basé sur la fréquence d'utilisation et la récence
      const score = entry.hitCount / ((Date.now() - entry.lastAccess) / 1000);
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    });
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log('🗑️ Evicted cache entry:', leastUsedKey);
    }
  }

  // ✅ OPTIMISATION DES REQUÊTES BASE DE DONNÉES

  public async optimizedQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    options: {
      cacheTTL?: number;
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      cacheTTL = this.config.defaultCacheTTL,
      priority = 'medium',
      timeout = this.config.queryTimeout,
      retries = 3
    } = options;

    const cacheKey = `query:${queryName}`;
    
    // Vérifier le cache d'abord
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      cached.hitCount++;
      cached.lastAccess = Date.now();
      console.log('🎯 Query cache hit:', queryName);
      return cached.data;
    }

    // Gérer la concurrence
    if (this.activeRequests >= this.config.maxConcurrentRequests && priority !== 'high') {
      return this.queueRequest(() => this.optimizedQuery(queryName, queryFunction, options));
    }

    this.activeRequests++;
    const startTime = performance.now();
    
    try {
      const result = await this.executeWithRetries(
        () => this.executeWithTimeout(queryFunction(), timeout),
        retries
      );
      
      const duration = performance.now() - startTime;
      
      // Mettre en cache
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        expiry: Date.now() + cacheTTL,
        hitCount: 0,
        lastAccess: Date.now()
      });
      
      // Enregistrer la métrique
      this.recordQueryMetric({
        id: this.generateQueryId(),
        query: queryName,
        params: options,
        timestamp: Date.now(),
        duration,
        fromCache: false
      });
      
      console.log(`✅ Query executed: ${queryName} (${duration.toFixed(2)}ms)`);
      return result;
      
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  // ✅ OPTIMISATIONS SPÉCIFIQUES POUR LES PRODUITS

  public async getOptimizedProduct(productId: string): Promise<ProductData | null> {
    return this.getCached(
      `product:${productId}`,
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, description, price, status, images, category,
            game_rules, target_audience, benefits, rating,
            stock_quantity, compare_at_price, created_at
          `)
          .eq('id', productId)
          .single();

        if (error) throw error;
        return data as ProductData;
      },
      10 * 60 * 1000 // 10 minutes pour les produits
    );
  }

  public async getBatchProducts(productIds: string[]): Promise<ProductData[]> {
    // Vérifier le cache pour chaque produit
    const cached: ProductData[] = [];
    const missingIds: string[] = [];
    
    productIds.forEach(id => {
      const cacheKey = `product:${id}`;
      const cachedProduct = this.cache.get(cacheKey);
      if (cachedProduct && cachedProduct.expiry > Date.now()) {
        cached.push(cachedProduct.data);
        cachedProduct.hitCount++;
        cachedProduct.lastAccess = Date.now();
      } else {
        missingIds.push(id);
      }
    });

    // Récupérer les produits manquants en lot
    if (missingIds.length > 0) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, status, images, category,
          game_rules, target_audience, benefits, rating,
          stock_quantity, compare_at_price, created_at
        `)
        .in('id', missingIds);

      if (!error && data) {
        data.forEach(product => {
          const cacheKey = `product:${product.id}`;
          this.setCache(cacheKey, product as ProductData, 10 * 60 * 1000);
          cached.push(product as ProductData);
        });
      }
    }

    return cached;
  }

  // ✅ OPTIMISATION DES TÉMOIGNAGES

  public async getOptimizedTestimonials(productId: string): Promise<any[]> {
    return this.getCached(
      `testimonials:${productId}`,
      async () => {
        const { data, error } = await supabase
          .from('testimonials')
          .select('customer_name, content, rating, author_location, created_at')
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        return data || [];
      },
      15 * 60 * 1000 // 15 minutes pour les témoignages
    );
  }

  // ✅ PRÉCHARGEMENT DES DONNÉES CRITIQUES

  private async preloadCriticalData(): Promise<void> {
    try {
      console.log('🚀 Preloading critical data...');
      
      // Précharger les produits actifs
      const { data: activeProducts } = await supabase
        .from('products')
        .select('id')
        .eq('status', 'active')
        .limit(10);

      if (activeProducts) {
        const preloadPromises = activeProducts.map(product => 
          this.getOptimizedProduct(product.id).catch(err => 
            console.warn('❌ Preload failed for product:', product.id, err)
          )
        );
        
        await Promise.allSettled(preloadPromises);
      }

      // Précharger les données de la base de connaissances
      this.getCached(
        'knowledge_base:all',
        async () => {
          const { data, error } = await supabase
            .from('knowledge_base')
            .select('*')
            .order('priority', { ascending: false });
          
          if (error) throw error;
          return data || [];
        },
        30 * 60 * 1000 // 30 minutes
      ).catch(err => console.warn('❌ Knowledge base preload failed:', err));

      console.log('✅ Critical data preloaded');
    } catch (error) {
      console.error('❌ Preload error:', error);
    }
  }

  // ✅ GESTION DE LA QUEUE DES REQUÊTES

  private async queueRequest<T>(requestFunction: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFunction();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  // ✅ UTILITAIRES D'EXÉCUTION

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async executeWithRetries<T>(
    operation: () => Promise<T>, 
    retries: number,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  // ✅ MÉTRIQUES ET MONITORING

  private updatePerformanceMetrics(): void {
    const totalCacheEntries = this.cache.size + this.queryCache.size;
    const cacheHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalQueries = this.queryMetrics.length;
    
    this.performanceMetrics = {
      cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      averageResponseTime: this.calculateAverageResponseTime(),
      memoryUsage: this.estimateMemoryUsage(),
      activeConnections: this.activeRequests,
      queueSize: this.requestQueue.length
    };

    // Nettoyer les anciennes métriques de requête
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.queryMetrics = this.queryMetrics.filter(metric => metric.timestamp > oneHourAgo);
  }

  private calculateAverageResponseTime(): number {
    if (this.queryMetrics.length === 0) return 0;
    
    const totalTime = this.queryMetrics
      .filter(metric => metric.duration !== undefined)
      .reduce((sum, metric) => sum + (metric.duration || 0), 0);
    
    const count = this.queryMetrics.filter(metric => metric.duration !== undefined).length;
    return count > 0 ? totalTime / count : 0;
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    [this.cache, this.queryCache, this.productCache, this.messageCache].forEach(cache => {
      cache.forEach(entry => {
        totalSize += JSON.stringify(entry.data).length;
      });
    });
    
    return totalSize;
  }

  private recordQueryMetric(metric: DatabaseQuery): void {
    this.queryMetrics.push(metric);
    
    // Garder seulement les 1000 dernières métriques
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  // ✅ AUTO-OPTIMISATION

  private setupAutoOptimization(): void {
    setInterval(() => {
      const metrics = this.performanceMetrics;
      
      // Ajuster la taille du cache selon l'utilisation
      if (metrics.cacheHitRate < 50 && this.config.maxCacheSize < 2000) {
        this.config.maxCacheSize += 100;
        console.log('📈 Increased cache size to:', this.config.maxCacheSize);
      } else if (metrics.cacheHitRate > 90 && this.config.maxCacheSize > 500) {
        this.config.maxCacheSize -= 50;
        console.log('📉 Decreased cache size to:', this.config.maxCacheSize);
      }
      
      // Ajuster le TTL selon le taux de hit
      if (metrics.cacheHitRate > 80) {
        this.config.defaultCacheTTL = Math.min(this.config.defaultCacheTTL * 1.1, 15 * 60 * 1000);
      } else if (metrics.cacheHitRate < 40) {
        this.config.defaultCacheTTL = Math.max(this.config.defaultCacheTTL * 0.9, 2 * 60 * 1000);
      }
      
      // Ajuster la concurrence selon la queue
      if (metrics.queueSize > 5 && this.config.maxConcurrentRequests < 20) {
        this.config.maxConcurrentRequests += 2;
        console.log('⚡ Increased concurrent requests to:', this.config.maxConcurrentRequests);
      } else if (metrics.queueSize === 0 && this.config.maxConcurrentRequests > 5) {
        this.config.maxConcurrentRequests = Math.max(this.config.maxConcurrentRequests - 1, 5);
      }
      
    }, 2 * 60 * 1000); // Toutes les 2 minutes
  }

  // ✅ NETTOYAGE ET MAINTENANCE

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Nettoyer tous les caches
    [this.cache, this.queryCache, this.productCache, this.messageCache].forEach(cache => {
      cache.forEach((entry, key) => {
        if (entry.expiry < now) {
          cache.delete(key);
          cleanedCount++;
        }
      });
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  // ✅ MÉTHODES PUBLIQUES D'INFORMATION

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public getCacheStats(): {
    totalEntries: number;
    cacheHitRate: number;
    memoryUsage: string;
    oldestEntry: Date | null;
  } {
    const totalEntries = this.cache.size + this.queryCache.size + this.productCache.size + this.messageCache.size;
    let oldestTimestamp = Date.now();
    
    [this.cache, this.queryCache, this.productCache, this.messageCache].forEach(cache => {
      cache.forEach(entry => {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
      });
    });
    
    return {
      totalEntries,
      cacheHitRate: this.performanceMetrics.cacheHitRate,
      memoryUsage: `${(this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      oldestEntry: totalEntries > 0 ? new Date(oldestTimestamp) : null
    };
  }

  public async flushCache(pattern?: string): Promise<void> {
    if (pattern) {
      // Supprimer les entrées correspondant au pattern
      [this.cache, this.queryCache, this.productCache, this.messageCache].forEach(cache => {
        cache.forEach((_, key) => {
          if (key.includes(pattern)) {
            cache.delete(key);
          }
        });
      });
    } else {
      // Vider tous les caches
      this.cache.clear();
      this.queryCache.clear();
      this.productCache.clear();
      this.messageCache.clear();
    }
    
    console.log('🧹 Cache flushed:', pattern || 'all');
  }

  // ✅ UTILITAIRES PRIVÉES

  private normalizeCacheKey(key: string): string {
    return key.toLowerCase().trim();
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ✅ NETTOYAGE FINAL

  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.flushCache();
    console.log('🧹 PerformanceOptimizer cleaned up');
  }
}