// src/lib/utils/productUtils.ts - HELPER DE COMPATIBILITÉ
import type { ProductData, Product } from '@/types/chat';

/**
 * Convertit un objet Product vers ProductData pour assurer la compatibilité
 */
export function convertProductToProductData(product: Product | any): ProductData {
  return {
    id: product.id || '',
    name: product.name || '',
    description: product.description || '',
    price: product.price || 0,
    images: product.images || (product.imageUrl ? [product.imageUrl] : []),
    category: product.category || '',
    target_audience: product.target_audience || [],
    game_rules: product.game_rules || '',
    benefits: product.benefits || [],
    rating: product.rating || 4.0,
    reviews_count: product.reviews_count || 0,
    sales_count: product.sales_count || 0,
    status: product.status || 'active', // ✅ CORRECTION : toujours string
    chatbot_variables: product.chatbot_variables || {},
    metadata: product.metadata || {},
    stock_quantity: product.stock_quantity || 100,
    compare_at_price: product.compare_at_price
  };
}

/**
 * Assure qu'un produit a toutes les propriétés requises pour ProductData
 */
export function ensureProductData(product: any): ProductData {
  const converted = convertProductToProductData(product);
  
  // S'assurer que les propriétés obligatoires sont présentes
  if (!converted.id) {
    throw new Error('Product ID is required');
  }
  
  if (!converted.name) {
    throw new Error('Product name is required');
  }
  
  if (typeof converted.price !== 'number' || converted.price < 0) {
    throw new Error('Product price must be a valid number');
  }
  
  // S'assurer que status est toujours une string
  if (!converted.status) {
    converted.status = 'active';
  }
  
  return converted;
}

/**
 * Vérifie si un objet a la structure ProductData
 */
export function isProductData(obj: any): obj is ProductData {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.status === 'string'
  );
}

// ✅ AJOUT : Fonction pour créer un ProductData array avec status requis
export function createProductDataArray(products: any[]): ProductData[] {
  return products.map(product => ensureProductData(product));
}

/**
 * Parse de manière sécurisée les bénéfices (peut être string ou array)
 */
export function parseBenefits(benefits: string | string[] | any): string[] {
  if (Array.isArray(benefits)) {
    return benefits.filter(b => typeof b === 'string');
  }
  
  if (typeof benefits === 'string') {
    try {
      const parsed = JSON.parse(benefits);
      if (Array.isArray(parsed)) {
        return parsed.filter(b => typeof b === 'string');
      }
      return [benefits];
    } catch {
      return [benefits];
    }
  }
  
  return [];
}

/**
 * Parse de manière sécurisée l'audience cible (peut être string ou array)
 */
export function parseTargetAudience(audience: string | string[] | any): string[] {
  if (Array.isArray(audience)) {
    return audience.filter(a => typeof a === 'string');
  }
  
  if (typeof audience === 'string') {
    try {
      const parsed = JSON.parse(audience);
      if (Array.isArray(parsed)) {
        return parsed.filter(a => typeof a === 'string');
      }
      return [audience];
    } catch {
      return [audience];
    }
  }
  
  return [];
}