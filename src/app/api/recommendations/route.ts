// app/api/recommendations/route.ts - VERSION CORRIGÉE
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RecommendationRequest {
  productId: string;
  context?: {
    interests?: string[];
    buyingIntent?: 'low' | 'medium' | 'high';
    messageCount?: number;
    userPreferences?: string[];
  };
}

interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salesCount: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  rating?: number;
  reviewsCount?: number;
  discountPercentage?: number;
}

class SmartRecommendationEngine {
  private static instance: SmartRecommendationEngine;

  public static getInstance(): SmartRecommendationEngine {
    if (!this.instance) {
      this.instance = new SmartRecommendationEngine();
    }
    return this.instance;
  }

  async generateRecommendations(
    currentProductId: string,
    context: RecommendationRequest['context'] = {}
  ): Promise<ProductRecommendation[]> {
    try {
      console.log('🎯 Generating smart recommendations for:', currentProductId);

      // 1. Récupérer le produit actuel
      const currentProduct = await this.getCurrentProduct(currentProductId);
      if (!currentProduct) {
        console.error('❌ Current product not found');
        return [];
      }

      // 2. Récupérer tous les autres produits actifs
      const { data: allProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          images,
          price,
          compare_at_price,
          category,
          target_audience,
          benefits,
          sales_count,
          rating,
          reviews_count,
          status,
          metadata
        `)
        .neq('id', currentProductId)
        .eq('status', 'active')
        .order('sales_count', { ascending: false });

      if (error || !allProducts) {
        console.error('❌ Error fetching products:', error);
        return [];
      }

      // 3. Analyser et scorer les produits
      const scoredProducts = allProducts.map(product => ({
        ...product,
        score: this.calculateRecommendationScore(product, currentProduct, context)
      }));

      // 4. Trier par score et prendre les 3 meilleurs
      const topProducts = scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // 5. Convertir en format de recommandation
      return topProducts.map(product => this.formatProductRecommendation(product, context));

    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return [];
    }
  }

  private async getCurrentProduct(productId: string) {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    return error ? null : product;
  }

  private calculateRecommendationScore(
    product: any,
    currentProduct: any,
    context: RecommendationRequest['context'] = {}
  ): number {
    let score = 0;

    // Score de base (popularité)
    score += (product.sales_count || 0) * 0.1;

    // Bonus pour les ratings élevés
    if (product.rating >= 4) {
      score += product.rating * 10;
    }

    // Bonus pour la même catégorie
    if (product.category === currentProduct.category) {
      score += 15;
    }

    // Bonus pour audience similaire
    const currentAudience = this.parseJSON(currentProduct.target_audience) || [];
    const productAudience = this.parseJSON(product.target_audience) || [];
    
    const audienceOverlap = currentAudience.filter(audience => 
      productAudience.includes(audience)
    ).length;
    
    score += audienceOverlap * 10;

    // Bonus basé sur l'intention d'achat
    if (context.buyingIntent === 'high') {
      // Privilégier les bestsellers
      score += (product.sales_count || 0) * 0.2;
    } else if (context.buyingIntent === 'low') {
      // Privilégier les produits moins chers ou en promo
      if (product.compare_at_price && product.price < product.compare_at_price) {
        score += 20;
      }
    }

    // Bonus pour les intérêts utilisateur
    if (context.interests && context.interests.length > 0) {
      const productBenefits = this.parseJSON(product.benefits) || [];
      
      context.interests.forEach(interest => {
        if (productBenefits.some((benefit: string) => 
          benefit.toLowerCase().includes(interest.toLowerCase())
        )) {
          score += 15;
        }
      });
    }

    // Pénalité pour les produits très chers comparé au produit actuel
    const priceRatio = product.price / currentProduct.price;
    if (priceRatio > 1.5) {
      score -= 10;
    }

    // Bonus pour les produits complémentaires
    if (this.areComplementaryProducts(product, currentProduct)) {
      score += 25;
    }

    return Math.max(0, score);
  }

  private areComplementaryProducts(product1: any, product2: any): boolean {
    // Logique pour déterminer si les produits sont complémentaires
    const complementaryPairs = [
      ['family', 'couples'],
      ['couples', 'friends'],
      ['family', 'children'],
      ['professional', 'team-building']
    ];

    const cat1 = product1.category?.toLowerCase();
    const cat2 = product2.category?.toLowerCase();

    return complementaryPairs.some(pair => 
      (pair.includes(cat1) && pair.includes(cat2)) && cat1 !== cat2
    );
  }

  private formatProductRecommendation(
    product: any,
    context: RecommendationRequest['context'] = {}
  ): ProductRecommendation {
    const reason = this.generateRecommendationReason(product, context);
    const urgency = this.determineUrgency(product, context);
    
    return {
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || '/images/products/default.jpg',
      price: product.price,
      salesCount: product.sales_count || 0,
      reason,
      urgency,
      rating: product.rating,
      reviewsCount: product.reviews_count,
      discountPercentage: product.compare_at_price ? 
        Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 
        undefined
    };
  }

  private generateRecommendationReason(
    product: any,
    context: RecommendationRequest['context'] = {}
  ): string {
    const reasons = [];

    // Raisons basées sur la popularité
    if (product.sales_count > 100) {
      reasons.push("Bestseller de nos clients");
    } else if (product.sales_count > 50) {
      reasons.push("Très populaire");
    }

    // Raisons basées sur les ratings
    if (product.rating >= 4.5) {
      reasons.push("Excellentes notes clients");
    } else if (product.rating >= 4) {
      reasons.push("Très bien noté");
    }

    // Raisons basées sur les promotions
    if (product.compare_at_price && product.price < product.compare_at_price) {
      const discount = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
      reasons.push(`En promo (-${discount}%)`);
    }

    // Raisons basées sur le contexte utilisateur
    if (context.buyingIntent === 'high') {
      reasons.push("Commande express recommandée");
    }

    // Raisons basées sur la catégorie - CORRIGÉ
    const categoryReasons: Record<string, string> = {
      'family': "Parfait pour toute la famille",
      'couples': "Idéal pour les couples",
      'friends': "Génial entre amis",
      'children': "Adapté aux enfants",
      'professional': "Pour le monde professionnel"
    };

    if (product.category && categoryReasons[product.category]) {
      reasons.push(categoryReasons[product.category]);
    }

    // Raisons par défaut
    if (reasons.length === 0) {
      reasons.push("Vous pourriez aussi aimer");
    }

    return reasons[0]; // Retourner la raison la plus pertinente
  }

  private determineUrgency(
    product: any,
    context: RecommendationRequest['context'] = {}
  ): 'low' | 'medium' | 'high' {
    let urgencyScore = 0;

    // Stock faible = urgence élevée
    if (product.stock_quantity && product.stock_quantity < 5) {
      urgencyScore += 3;
    }

    // Promotion = urgence moyenne à élevée
    if (product.compare_at_price && product.price < product.compare_at_price) {
      urgencyScore += 2;
    }

    // Bestseller = urgence moyenne
    if (product.sales_count > 100) {
      urgencyScore += 1;
    }

    // Intention d'achat élevée = augmenter l'urgence
    if (context.buyingIntent === 'high') {
      urgencyScore += 2;
    }

    if (urgencyScore >= 4) return 'high';
    if (urgencyScore >= 2) return 'medium';
    return 'low';
  }

  private parseJSON(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  }

  // 🎯 MÉTHODE POUR RECOMMANDATIONS UPSELL SPÉCIFIQUES
  async generateUpsellRecommendation(
    currentProductId: string,
    orderValue: number,
    context: RecommendationRequest['context'] = {}
  ): Promise<ProductRecommendation | null> {
    try {
      const recommendations = await this.generateRecommendations(currentProductId, {
        ...context,
        buyingIntent: 'high' // L'utilisateur est déjà en train d'acheter
      });

      if (recommendations.length === 0) return null;

      // Sélectionner le meilleur produit pour l'upsell
      const upsellProduct = recommendations[0];
      
      // Adapter la raison pour l'upsell
      upsellProduct.reason = this.generateUpsellReason(upsellProduct, orderValue);
      upsellProduct.urgency = 'high'; // Toujours haute urgence pour l'upsell
      
      return upsellProduct;

    } catch (error) {
      console.error('❌ Error generating upsell recommendation:', error);
      return null;
    }
  }

  private generateUpsellReason(product: ProductRecommendation, orderValue: number): string {
    const upsellReasons = [
      "Nos clients qui achètent ce jeu prennent aussi",
      "Complète parfaitement votre commande",
      "Pack recommandé par nos experts",
      "Économisez sur la livraison",
      "Offre limitée pour les commandes du jour"
    ];

    // Choisir une raison basée sur la valeur de la commande
    if (orderValue > 50000) { // Plus de 50k FCFA
      return upsellReasons[2]; // Pack expert
    } else if (orderValue > 30000) {
      return upsellReasons[1]; // Complément
    } else {
      return upsellReasons[0]; // Comportement client
    }
  }

  // 🔄 RECOMMANDATIONS CROSS-SELL PENDANT LA CONVERSATION
  async generateCrossSellRecommendations(
    currentProductId: string,
    userInterests: string[],
    conversationContext: {
      mentionedCategories?: string[];
      expressedNeeds?: string[];
      priceRange?: { min: number; max: number };
    }
  ): Promise<ProductRecommendation[]> {
    try {
      const baseContext = {
        interests: userInterests,
        buyingIntent: 'medium' as const,
        userPreferences: conversationContext.expressedNeeds || []
      };

      let recommendations = await this.generateRecommendations(currentProductId, baseContext);

      // Filtrer par gamme de prix si spécifiée
      if (conversationContext.priceRange) {
        recommendations = recommendations.filter(rec => 
          rec.price >= conversationContext.priceRange!.min && 
          rec.price <= conversationContext.priceRange!.max
        );
      }

      // Adapter les raisons pour le cross-sell
      recommendations.forEach(rec => {
        rec.reason = this.generateCrossSellReason(rec, conversationContext);
      });

      return recommendations.slice(0, 2); // Maximum 2 pour ne pas surcharger

    } catch (error) {
      console.error('❌ Error generating cross-sell recommendations:', error);
      return [];
    }
  }

  private generateCrossSellReason(
    product: ProductRecommendation,
    context: any
  ): string {
    if (context.mentionedCategories?.includes('family') && product.name.includes('Famille')) {
      return "Puisque vous cherchez quelque chose pour la famille";
    }
    
    if (context.expressedNeeds?.includes('communication')) {
      return "Également excellent pour améliorer la communication";
    }

    return "Basé sur vos préférences";
  }
}

// 🚀 ROUTE HANDLER PRINCIPAL
export async function POST(request: Request) {
  try {
    const body: RecommendationRequest = await request.json();
    const { productId, context } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const engine = SmartRecommendationEngine.getInstance();
    const recommendations = await engine.generateRecommendations(productId, context);

    console.log(`✅ Generated ${recommendations.length} recommendations for product ${productId}`);

    return NextResponse.json({
      success: true,
      recommendations,
      context: {
        productId,
        generatedAt: new Date().toISOString(),
        algorithmVersion: '2.0'
      }
    });

  } catch (error) {
    console.error('❌ Recommendations API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate recommendations',
        recommendations: []
      },
      { status: 500 }
    );
  }
}

// 🎯 ROUTE POUR UPSELL SPÉCIFIQUE
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, orderValue, context } = body;

    const engine = SmartRecommendationEngine.getInstance();
    const upsellRecommendation = await engine.generateUpsellRecommendation(
      productId,
      orderValue || 0,
      context
    );

    return NextResponse.json({
      success: true,
      upsellRecommendation,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Upsell API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate upsell recommendation',
        upsellRecommendation: null
      },
      { status: 500 }
    );
  }
}

// 🔄 ROUTE POUR CROSS-SELL PENDANT LA CONVERSATION
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { productId, userInterests, conversationContext } = body;

    const engine = SmartRecommendationEngine.getInstance();
    const crossSellRecommendations = await engine.generateCrossSellRecommendations(
      productId,
      userInterests || [],
      conversationContext || {}
    );

    return NextResponse.json({
      success: true,
      crossSellRecommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cross-sell API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate cross-sell recommendations',
        crossSellRecommendations: []
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}