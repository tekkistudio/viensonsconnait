// src/lib/services/product.service.ts
import { supabase } from '@/lib/supabase';
import type { Product, ProductMedia, CloudinaryImage } from '@/types/product';

const FALLBACK_IMAGE = {
  url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642238/products/placeholder.jpg',
  publicId: 'products/placeholder'
};

interface DatabaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  status: string;
  metadata?: {
    category?: string;
    players?: string;
    duration?: string;
    language?: string;
    min_age?: number;
    stats?: {
      sold?: number;
      satisfaction?: number;
      reviews?: number;
    };
    benefits?: string[];
    topics?: string[];
    howToPlay?: string;
    testimonials?: string;
    images?: CloudinaryImage[];
  };
  created_at: string;
}

export class ProductService {
  private getProductImages(metadata?: DatabaseProduct['metadata']): {
    images: string[];
    media: ProductMedia[];
  } {
    const cloudinaryImages = metadata?.images || [];
    
    if (cloudinaryImages.length === 0) {
      return {
        images: [FALLBACK_IMAGE.url],
        media: [{
          url: FALLBACK_IMAGE.url,
          alt: 'Image par défaut'
        }]
      };
    }

    const images = cloudinaryImages.map(img => img.url);
    const media = cloudinaryImages.map((img, index) => ({
      url: img.url,
      alt: `Vue ${index + 1}`
    }));

    return { images, media };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/pour-les?-/i, '')
      .trim();
  }

  private mapDatabaseProductToProduct(dbProduct: DatabaseProduct): Product {
    const metadata = dbProduct.metadata || {};
    const { images, media } = this.getProductImages(metadata);

    return {
      id: dbProduct.id,
      slug: this.generateSlug(dbProduct.name),
      name: dbProduct.name,
      description: dbProduct.description,
      price: dbProduct.price,
      compareAtPrice: dbProduct.compare_at_price,
      images,
      media,
      category: metadata.category || '',
      metadata: {
        category: metadata.category || '',
        players: metadata.players || '2-8 joueurs',
        duration: metadata.duration || '30-60 minutes',
        language: metadata.language || 'Français',
        min_age: metadata.min_age || 18,
        stats: {
          sold: metadata.stats?.sold || 0,
          satisfaction: metadata.stats?.satisfaction || 98,
          reviews: metadata.stats?.reviews || 0
        },
        benefits: metadata.benefits || [],
        topics: metadata.topics || [],
        images: metadata.images
      },
      benefits: metadata.benefits || [],
      topics: metadata.topics || [],
      howToPlay: metadata.howToPlay,
      testimonials: metadata.testimonials,
      stats: {
        sold: metadata.stats?.sold || 0,
        satisfaction: metadata.stats?.satisfaction || 98,
        reviews: metadata.stats?.reviews || 0
      },
      badges: dbProduct.compare_at_price && dbProduct.compare_at_price > dbProduct.price ? [
        {
          type: 'promo',
          text: '-15%'
        }
      ] : [],
      createdAt: dbProduct.created_at
    };
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      
      const matchingProduct = products.find(product => 
        this.generateSlug(product.name) === slug
      );

      return matchingProduct ? this.mapDatabaseProductToProduct(matchingProduct as DatabaseProduct) : null;
    } catch (error) {
      console.error('Error in getProductBySlug:', error);
      return null;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      
      return (data || []).map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) return null;

      return this.mapDatabaseProductToProduct(data as DatabaseProduct);
    } catch (error) {
      console.error('Error in getProductById:', error);
      return null;
    }
  }

  async getRelatedProducts(currentId: string, category: string): Promise<Product[]> {
    if (!currentId || !category) {
      console.warn('getRelatedProducts: Missing required parameters');
      return [];
    }

    try {
      const { data: allProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('id', currentId);

      if (error) {
        console.error('Supabase error in getRelatedProducts:', error);
        return [];
      }

      if (!allProducts || !Array.isArray(allProducts)) {
        return [];
      }

      let relatedProducts = allProducts.filter(product => 
        product.metadata?.category === category
      );

      if (relatedProducts.length < 3) {
        const otherProducts = allProducts
          .filter(product => product.metadata?.category !== category)
          .sort(() => 0.5 - Math.random());

        relatedProducts = [
          ...relatedProducts,
          ...otherProducts.slice(0, 3 - relatedProducts.length)
        ];
      }

      return relatedProducts
        .slice(0, 3)
        .map(product => this.mapDatabaseProductToProduct(product as DatabaseProduct));

    } catch (error) {
      console.error('Unexpected error in getRelatedProducts:', error);
      return [];
    }
  }
}

export const productService = new ProductService();