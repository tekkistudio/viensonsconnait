// src/lib/services/recommendation.service.ts
import { CROSS_SELLING } from '@/config/crossSelling';
import { PRODUCTS_INFO } from '@/config/products';
import type { ProductId } from '@/features/product/types/chat';
import { supabase } from '../supabase';

interface RecommendationContext {
  currentProductId: ProductId;
  buyingIntent: number;
  userPreferences?: {
    categories?: string[];
    priceRange?: [number, number];
  };
  orderHistory?: {
    productIds: ProductId[];
    totalSpent: number;
  };
}

export class RecommendationService {
    static getRecommendations(context: RecommendationContext): Array<{
      name: string; // Changé de 'any' à 'string'
      productId: ProductId;
      reason: string;
      priority: number;
    }> {
      const { currentProductId, buyingIntent } = context;
      const recommendations = [];
  
      // Obtenir les recommandations de base du cross-selling
      const baseRecommendations = CROSS_SELLING[currentProductId] || [];
      
      for (const rec of baseRecommendations) {
        const product = PRODUCTS_INFO[rec.id];
        recommendations.push({
          productId: rec.id,
          name: product.name, // Ajout du nom du produit
          reason: this.getRecommendationReason(currentProductId, rec.id),
          priority: rec.priority
        });
      }
  
      // Ajuster les recommandations en fonction de l'intention d'achat
      if (buyingIntent > 0.7) {
        recommendations.sort((a, b) => a.priority - b.priority);
        return recommendations.slice(0, 2);
      }
  
      return recommendations;
    }
  
    private static getRecommendationReason(currentProductId: ProductId, recommendedId: ProductId): string {
      const reasonMap: Record<string, Record<string, string>> = {
        couples: {
          maries: "Parfait pour préparer votre vie à deux",
        },
        famille: {
          amis: "Idéal pour vos soirées entre amis",
        }
      };
  
      return reasonMap[currentProductId]?.[recommendedId] || "";
    }

  static async trackRecommendation(
    recommendationId: string,
    context: {
      userId?: string;
      sessionId: string;
      productId: ProductId;
      recommendedProductId: ProductId;
      clicked: boolean;
    }
  ) {
    try {
      // Sauvegarder dans Supabase pour analyse ultérieure
      const { error } = await supabase
        .from('recommendation_tracking')
        .insert([{
          recommendation_id: recommendationId,
          user_id: context.userId,
          session_id: context.sessionId,
          product_id: context.productId,
          recommended_product_id: context.recommendedProductId,
          clicked: context.clicked,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking recommendation:', error);
    }
  }

  static formatRecommendationMessage(recommendations: Array<{
    productId: ProductId;
    reason: string;
  }>): string {
    if (!recommendations.length) return '';

    const messages = recommendations.map(rec => {
      const product = PRODUCTS_INFO[rec.productId];
      return `${product.name} - ${rec.reason}\n💝 ${product.description.split('.')[0]}.`;
    });

    return `\n\n🎁 Vous pourriez aussi aimer :\n\n${messages.join('\n\n')}`;
  }
}