// src/lib/services/recommendation.service.ts
import { CROSS_SELLING } from '@/config/crossSelling';
import { PRODUCTS_INFO } from '@/config/products';
import type { 
  ProductId, 
  RecommendationContext,
  ProductCategory
} from '@/types/chat';
import type { ProductRecommendation } from '@/types/order'
import { supabase } from '../supabase';
import { ProfileAnalyzer } from './ProfileAnalyzer';

interface PriceRange {
  min: number;
  max: number;
}

export class RecommendationService {
  private static readonly relationshipMapping: Record<ProductId, ProductId[]> = {
    couples: ['maries', 'stvalentin'],
    maries: ['couples', 'famille'],
    famille: ['amis', 'collegues'],
    amis: ['famille', 'collegues'],
    collegues: ['amis', 'famille'],
    stvalentin: ['couples', 'maries']
  };

  private static readonly contextKeywords: Record<ProductCategory, string[]> = {
    romance: ['amour', 'couple', 'relation', 'mariage', 'fiançailles'],
    family: ['famille', 'parent', 'enfant', 'génération'],
    friendship: ['ami', 'amitié', 'groupe', 'soirée'],
    professional: ['travail', 'collègue', 'bureau', 'équipe'],
    personal_growth: ['développement', 'connaissance', 'découverte']
  };

  private static readonly priceRanges: Record<string, PriceRange> = {
    economic: { min: 0, max: 15000 },
    standard: { min: 15000, max: 25000 },
    premium: { min: 25000, max: Infinity }
  };

  static async getRecommendations(context: RecommendationContext): Promise<ProductRecommendation[]> {
    try {
      // Analyser le profil
      const profileAnalyzer = new ProfileAnalyzer();
      const profileAnalysis = await profileAnalyzer.analyzeProfile(
        context.conversationContext?.mentionedTopics || []
      );

      // Obtenir les recommandations de base
      const baseRecommendations = this.getBaseRecommendations(context);

      // Enrichir avec l'analyse du profil
      const enhancedRecommendations = await this.enhanceRecommendations(
        baseRecommendations,
        context,
        profileAnalysis
      );

      // Classer les recommandations
      const rankedRecommendations = this.rankRecommendations(
        enhancedRecommendations,
        context,
        profileAnalysis
      );

      const limit = context.buyingIntent > 0.7 ? 2 : 3;
      return rankedRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error in getRecommendations:', error);
      return [];
    }
  }

  private static getBaseRecommendations(context: RecommendationContext): ProductRecommendation[] {
    const recommendations: ProductRecommendation[] = [];
    const baseProducts = this.relationshipMapping[context.currentProductId] || [];

    for (const productId of baseProducts) {
      const product = PRODUCTS_INFO[productId];
      if (product) {
        recommendations.push({
          productId,
          name: product.name,
          reason: this.getRecommendationReason(context.currentProductId, productId),
          priority: CROSS_SELLING[context.currentProductId]?.find(r => r.id === productId)?.priority || 0,
          recommendationType: 'product',
          category: 'product',
          relevanceScore: 0.5,
          imageUrl: `/products/${productId}/main.jpg`,
          productUrl: `/products/${productId}`
        });
      }
    }

    return recommendations;
  }

  private static async enhanceRecommendations(
    recommendations: ProductRecommendation[],
    context: RecommendationContext,
    profileAnalysis: any
  ): Promise<ProductRecommendation[]> {
    const { data: testimonials } = await supabase
      .from('product_testimonials')
      .select('product_id, content')
      .in('product_id', recommendations.map(r => r.productId))
      .contains('tags', profileAnalysis.relationshipStatus);

    return Promise.all(recommendations.map(async (rec) => {
      const product = PRODUCTS_INFO[rec.productId];
      const testimonial = testimonials?.find(t => t.product_id === rec.productId);

      let priceAdvantage;
      if (product.compareAtPrice) {
        const savings = product.compareAtPrice - product.price;
        priceAdvantage = `Économisez ${savings.toLocaleString()} FCFA`;
      }

      return {
        ...rec,
        testimonial: testimonial?.content,
        priceAdvantage,
        profileMatch: this.calculateProfileMatch(product, profileAnalysis),
        imageUrl: `/products/${rec.productId}/main.jpg`,
        productUrl: `/products/${rec.productId}`
      };
    }));
  }

  private static calculateProfileMatch(product: any, profileAnalysis: any): number {
    let match = 0;

    // Match basé sur le statut relationnel
    if (profileAnalysis.relationshipStatus.some((status: string) => 
      product.targetAudience?.includes(status))) {
      match += 0.4;
    }

    // Match basé sur les intérêts
    if (profileAnalysis.interests.some((interest: string) => 
      product.themes?.includes(interest))) {
      match += 0.3;
    }

    // Match basé sur le prix si disponible
    if (profileAnalysis.pricePreference) {
      const range = this.priceRanges[profileAnalysis.pricePreference];
      if (range && product.price >= range.min && product.price <= range.max) {
        match += 0.3;
      }
    }

    return Math.min(match, 1);
  }

  private static rankRecommendations(
    recommendations: ProductRecommendation[],
    context: RecommendationContext,
    profileAnalysis: any
  ): ProductRecommendation[] {
    return recommendations
      .map(rec => {
        let score = rec.relevanceScore || 0.5;
        const product = PRODUCTS_INFO[rec.productId];

        // Augmenter le score basé sur le match de profil
        if (rec.profileMatch) {
          score += rec.profileMatch;
        }

        // Augmenter le score pour les préférences de catégorie
        if (context.userPreferences?.categories?.some(cat => 
          this.contextKeywords[cat as ProductCategory]?.some(keyword =>
            product.description.toLowerCase().includes(keyword)
          )
        )) {
          score += 0.2;
        }

        // Augmenter le score pour la gamme de prix
        if (context.userPreferences?.priceRange) {
          const [min, max] = context.userPreferences.priceRange;
          if (product.price >= min && product.price <= max) {
            score += 0.15;
          }
        }

        // Bonus pour les avantages prix
        if (rec.priceAdvantage) {
          score += 0.1;
        }

        // Bonus pour les témoignages
        if (rec.testimonial) {
          score += 0.1;
        }

        // Pénalité pour les produits déjà achetés
        if (context.orderHistory?.productIds.includes(rec.productId)) {
          score -= 0.3;
        }

        return {
          ...rec,
          relevanceScore: Math.min(score, 1)
        };
      })
      .sort((a, b) => {
        // Trier d'abord par score de pertinence
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // En cas d'égalité, utiliser la priorité
        return b.priority - a.priority;
      });
  }

  private static getRecommendationReason(currentProductId: ProductId, recommendedId: ProductId): string {
    const reasonMap: Record<string, Record<string, string>> = {
      couples: {
        maries: "Parfait pour renforcer votre vie de couple",
        stvalentin: "Idéal pour une soirée romantique"
      },
      maries: {
        couples: "Pour maintenir la flamme dans votre couple",
        famille: "Pour créer des moments mémorables en famille"
      },
      famille: {
        amis: "Parfait pour vos soirées entre amis",
        collegues: "Idéal pour renforcer vos liens professionnels"
      },
      amis: {
        famille: "Pour des moments conviviaux en famille",
        collegues: "Excellent pour améliorer vos relations au travail"
      },
      collegues: {
        amis: "Pour des relations plus authentiques",
        famille: "Idéal pour renforcer vos liens personnels"
      },
      stvalentin: {
        couples: "Pour entretenir l'amour au quotidien",
        maries: "Parfait pour approfondir votre relation"
      }
    };

    return reasonMap[currentProductId]?.[recommendedId] || 
           "Une excellente façon d'approfondir vos relations";
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
  ): Promise<void> {
    try {
      await supabase
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
    } catch (error) {
      console.error('Error tracking recommendation:', error);
    }
  }

  static formatRecommendationMessage(recommendations: ProductRecommendation[]): string {
    if (recommendations.length === 0) return '';

    const messages = recommendations.map(rec => {
      const product = PRODUCTS_INFO[rec.productId];
      let message = `💝 Je vous recommande également ${product.name}\n${rec.reason}`;

      if (rec.priceAdvantage) {
        message += `\n💰 ${rec.priceAdvantage}`;
      }

      if (rec.testimonial) {
        message += `\n👥 ${rec.testimonial}`;
      }

      return message;
    });

    return messages.join('\n\n');
  }
}