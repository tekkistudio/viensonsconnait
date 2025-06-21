// src/lib/services/RoseDataService.ts
import { supabase } from '@/lib/supabase';
import type { ProductData, Testimonial } from '@/types/chat';

interface RoseKnowledgeBase {
  id: string;
  category: 'faq' | 'product_info' | 'sales_script' | 'objection_handling';
  question_patterns: string[];
  response_template: string;
  context_data: Record<string, any>;
  confidence_threshold: number;
  is_active: boolean;
}

interface ConversationLog {
  session_id: string;
  product_id: string;
  user_message: string;
  rose_response: string;
  intent_detected: string;
  confidence_score: number;
  response_time_ms?: number;
}

interface ProductStats {
  views_count: number;
  sales_count: number;
  real_sales_count: number;
  avg_rating: number;
  testimonials_count: number;
  featured_testimonials: string[];
}

export class RoseDataService {
  private static instance: RoseDataService;
  private knowledgeCache: Map<string, RoseKnowledgeBase[]> = new Map();
  private productCache: Map<string, ProductData & ProductStats> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeCache();
  }

  public static getInstance(): RoseDataService {
    if (!this.instance) {
      this.instance = new RoseDataService();
    }
    return this.instance;
  }

  // 📊 RÉCUPÉRATION DES DONNÉES PRODUIT COMPLÈTES
  async getProductData(productId: string): Promise<(ProductData & ProductStats) | null> {
    try {
      // Vérifier le cache
      if (this.productCache.has(productId)) {
        console.log('📋 Product data from cache:', productId);
        return this.productCache.get(productId)!;
      }

      // Récupérer depuis la base de données
      const { data, error } = await supabase
        .rpc('get_product_for_rose', { product_uuid: productId });

      if (error) {
        console.error('❌ Error fetching product data:', error);
        return null;
      }

      if (data) {
        // Mettre en cache
        this.productCache.set(productId, data);
        
        // Expirer le cache après un délai
        setTimeout(() => {
          this.productCache.delete(productId);
        }, this.cacheExpiry);

        console.log('📋 Product data fetched:', data.name);
        return data;
      }

      return null;
    } catch (error) {
      console.error('❌ Product data service error:', error);
      return null;
    }
  }

  // 🧠 RECHERCHE DANS LA BASE DE CONNAISSANCES
  async findKnowledgeMatch(
    userMessage: string, 
    category?: RoseKnowledgeBase['category']
  ): Promise<RoseKnowledgeBase | null> {
    try {
      const cacheKey = category || 'all';
      let knowledgeItems = this.knowledgeCache.get(cacheKey);

      // Charger depuis la base si pas en cache
      if (!knowledgeItems) {
        const query = supabase
          .from('rose_knowledge_base')
          .select('*')
          .eq('is_active', true);

        if (category) {
          query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Error fetching knowledge base:', error);
          return null;
        }

        knowledgeItems = data || [];
        this.knowledgeCache.set(cacheKey, knowledgeItems);

        // Expirer le cache
        setTimeout(() => {
          this.knowledgeCache.delete(cacheKey);
        }, this.cacheExpiry);
      }

      // Rechercher le meilleur match
      const lowerMessage = userMessage.toLowerCase();
      let bestMatch: RoseKnowledgeBase | null = null;
      let highestScore = 0;

      for (const item of knowledgeItems) {
        const matchScore = this.calculateMatchScore(lowerMessage, item.question_patterns);
        
        if (matchScore >= item.confidence_threshold && matchScore > highestScore) {
          highestScore = matchScore;
          bestMatch = item;
        }
      }

      if (bestMatch) {
        console.log('🧠 Knowledge match found:', bestMatch.category, 'Score:', highestScore);
      }

      return bestMatch;
    } catch (error) {
      console.error('❌ Knowledge search error:', error);
      return null;
    }
  }

  // 📝 LOGGER UNE CONVERSATION
  async logConversation(logData: ConversationLog): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('log_conversation', {
          p_session_id: logData.session_id,
          p_product_id: logData.product_id,
          p_user_message: logData.user_message,
          p_rose_response: logData.rose_response,
          p_intent_detected: logData.intent_detected,
          p_confidence_score: logData.confidence_score,
          p_response_time_ms: logData.response_time_ms
        });

      if (error) {
        console.error('❌ Error logging conversation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Conversation logging error:', error);
      return null;
    }
  }

  // 💬 RÉCUPÉRER LES TÉMOIGNAGES
  async getProductTestimonials(productId: string, featured: boolean = true): Promise<Testimonial[]> {
    try {
      const query = supabase
        .from('product_testimonials')
        .select('*')
        .eq('product_id', productId)
        .eq('is_verified', true);

      if (featured) {
        query.eq('is_featured', true);
      }

      query.order('created_at', { ascending: false })
        .limit(featured ? 3 : 10);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching testimonials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Testimonials service error:', error);
      return [];
    }
  }

  // 📊 METTRE À JOUR LES STATISTIQUES
  async updateProductViews(productId: string): Promise<void> {
    try {
      await supabase
        .from('product_stats')
        .upsert(
          { 
            product_id: productId, 
            views_count: 1 
          },
          { 
            onConflict: 'product_id',
            ignoreDuplicates: false 
          }
        );

      // Invalider le cache
      this.productCache.delete(productId);
    } catch (error) {
      console.error('❌ Error updating product views:', error);
    }
  }

  // 🎯 FORMATER UNE RÉPONSE AVEC LES DONNÉES PRODUIT
  formatResponse(
    template: string, 
    productData: ProductData & ProductStats,
    additionalContext: Record<string, any> = {}
  ): string {
    const context = {
      product_name: productData.name,
      product_price: productData.price.toLocaleString(),
      sales_count: productData.sales_count,
      rating: productData.avg_rating?.toFixed(1) || '4.8',
      featured_testimonial: productData.featured_testimonials?.[0] || 'Ce jeu a transformé nos relations !',
      ...additionalContext
    };

    let formattedResponse = template;

    // Remplacer les placeholders
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      formattedResponse = formattedResponse.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        String(value)
      );
    });

    return formattedResponse;
  }

  // 🔍 RECHERCHER DES PRODUITS SIMILAIRES
  async getSimilarProducts(
    currentProductId: string, 
    limit: number = 3
  ): Promise<ProductData[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .neq('id', currentProductId)
        .eq('is_active', true)
        .order('sales_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching similar products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Similar products service error:', error);
      return [];
    }
  }

  // 📈 RÉCUPÉRER LES ANALYTICS DE CONVERSION
  async getConversionAnalytics(productId: string, days: number = 7): Promise<{
    total_conversations: number;
    converted_conversations: number;
    conversion_rate: number;
    avg_response_time: number;
    most_common_intents: Array<{ intent: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('conversation_analytics')
        .select('*')
        .eq('product_id', productId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('❌ Error fetching analytics:', error);
        return {
          total_conversations: 0,
          converted_conversations: 0,
          conversion_rate: 0,
          avg_response_time: 0,
          most_common_intents: []
        };
      }

      const conversations = data || [];
      const converted = conversations.filter(c => c.converted_to_order);
      const responseTimes = conversations
        .filter(c => c.response_time_ms)
        .map(c => c.response_time_ms);

      // Compter les intentions
      const intentCounts: Record<string, number> = {};
      conversations.forEach(c => {
        if (c.intent_detected) {
          intentCounts[c.intent_detected] = (intentCounts[c.intent_detected] || 0) + 1;
        }
      });

      const most_common_intents = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_conversations: conversations.length,
        converted_conversations: converted.length,
        conversion_rate: conversations.length > 0 ? (converted.length / conversations.length) * 100 : 0,
        avg_response_time: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        most_common_intents
      };
    } catch (error) {
      console.error('❌ Analytics service error:', error);
      return {
        total_conversations: 0,
        converted_conversations: 0,
        conversion_rate: 0,
        avg_response_time: 0,
        most_common_intents: []
      };
    }
  }

  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  private calculateMatchScore(message: string, patterns: string[]): number {
    let score = 0;
    const words = message.split(/\s+/);
    const totalWords = words.length;

    for (const pattern of patterns) {
      const patternWords = pattern.toLowerCase().split(/\s+/);
      
      for (const patternWord of patternWords) {
        for (const messageWord of words) {
          if (messageWord.includes(patternWord) || patternWord.includes(messageWord)) {
            score += 1 / totalWords;
          }
        }
      }
    }

    return Math.min(score, 1); // Cap à 1.0
  }

  private async initializeCache(): Promise<void> {
    // Pré-charger la base de connaissances au démarrage
    try {
      const { data } = await supabase
        .from('rose_knowledge_base')
        .select('*')
        .eq('is_active', true);

      if (data) {
        // Grouper par catégorie
        const byCategory: Record<string, RoseKnowledgeBase[]> = {};
        
        data.forEach(item => {
          if (!byCategory[item.category]) {
            byCategory[item.category] = [];
          }
          byCategory[item.category].push(item);
        });

        // Mettre en cache
        Object.entries(byCategory).forEach(([category, items]) => {
          this.knowledgeCache.set(category, items);
        });

        // Cache global
        this.knowledgeCache.set('all', data);

        console.log('🧠 Knowledge base cached:', data.length, 'items');
      }
    } catch (error) {
      console.error('❌ Cache initialization error:', error);
    }
  }

  // 🧹 NETTOYAGE DU CACHE
  clearCache(): void {
    this.knowledgeCache.clear();
    this.productCache.clear();
    console.log('🧹 Cache cleared');
  }

  // 📊 STATISTIQUES DU CACHE
  getCacheStats(): {
    knowledge_items: number;
    product_items: number;
    cache_size_kb: number;
  } {
    const knowledgeSize = Array.from(this.knowledgeCache.values())
      .reduce((total, items) => total + items.length, 0);
    
    const productSize = this.productCache.size;
    
    // Estimation approximative de la taille
    const estimatedSize = (knowledgeSize * 500 + productSize * 1000) / 1024;

    return {
      knowledge_items: knowledgeSize,
      product_items: productSize,
      cache_size_kb: Math.round(estimatedSize)
    };
  }
}