import { supabase } from "../supabase";

// src/lib/utils/product.ts
export function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9]+/g, '-')     // Remplacer les caractères spéciaux par des tirets
      .replace(/^-+|-+$/g, '')         // Enlever les tirets au début et à la fin
      .replace(/pour-les?-/i, '')      // Enlever "pour-les-" ou "pour-la-"
      .trim();
  }
  
  export async function getProductBySlug(slug: string) {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active');
  
      if (error) throw error;
  
      for (const product of products) {
        if (generateSlug(product.name) === slug) {
          return product;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting product by slug:', error);
      return null;
    }
  }
  
  export async function getProductById(id: string) {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
  
      if (error) throw error;
      return product;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  }
  
  export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }