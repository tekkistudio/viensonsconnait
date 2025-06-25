// src/app/api/recommendations/route.ts
// API pour récupérer les recommandations de produits

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { productId, context } = await request.json();

    console.log('🛍️ [RECOMMENDATIONS] Fetching for product:', productId);

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID requis' },
        { status: 400 }
      );
    }

    // ✅ RÉCUPÉRER le produit actuel pour la catégorie
    const { data: currentProduct } = await supabase
      .from('products')
      .select('category, price')
      .eq('id', productId)
      .single();

    // ✅ RÉCUPÉRER les produits similaires
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        images,
        stats,
        category
      `)
      .eq('status', 'active')
      .neq('id', productId)
      .limit(3);

    // Filtrer par catégorie si disponible
    if (currentProduct?.category) {
      query = query.eq('category', currentProduct.category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('❌ Products fetch error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: 500 }
      );
    }

    // ✅ TRANSFORMER en format de recommandation
    const recommendations = products?.map(product => ({
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || '/images/products/default-product.jpg',
      price: product.price,
      salesCount: product.stats?.sold || 0,
      reason: `Parfait pour compléter votre collection de jeux relationnels`,
      urgency: (product.stats?.sold || 0) > 50 ? 'high' as const : 
                (product.stats?.sold || 0) > 20 ? 'medium' as const : 'low' as const,
      rating: product.stats?.satisfaction || 4.8,
      reviewsCount: product.stats?.reviews || 0
    })) || [];

    console.log('✅ [RECOMMENDATIONS] Generated:', recommendations.length);

    return NextResponse.json({
      success: true,
      recommendations: recommendations,
      context: context
    });

  } catch (error) {
    console.error('❌ [RECOMMENDATIONS] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération des recommandations',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
