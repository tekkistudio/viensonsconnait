// src/lib/services/product.service.ts
import { supabase } from '@/lib/supabase';
import type { Product, ProductMedia, CloudinaryImage, DatabaseProduct } from '@/types/product';

const FALLBACK_IMAGE = {
  url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642238/products/placeholder.jpg',
  publicId: 'products/placeholder'
};

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
      stock_quantity: dbProduct.stock_quantity, 
      images,
      media,
      category: metadata.category || '',
      metadata: {
        category: metadata.category || '',
        players: metadata.players || '2-8 joueurs',
        duration: metadata.duration || '30-60 minutes',
        language: metadata.language || 'Français',
        min_age: metadata.min_age || 18,
        display_order: metadata.display_order || dbProduct.display_order,
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
      createdAt: dbProduct.created_at,
      status: dbProduct.status,
      display_order: dbProduct.display_order || metadata.display_order
    };
  }

  // ✅ CORRECTION : Méthode utilitaire pour trier les produits côté client
  private sortProductsByDisplayOrder(products: DatabaseProduct[]): DatabaseProduct[] {
    return products.sort((a, b) => {
      // Les produits avec display_order null vont à la fin
      const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Si même display_order, trier par date de création (plus récent en premier)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
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
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // ✅ CORRECTION : Tri côté client pour gérer les valeurs nulles
      const sortedProducts = this.sortProductsByDisplayOrder(data || []);
      
      return sortedProducts.map(product => 
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
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
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
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active')
        .neq('id', currentId);

      if (error) {
        console.error('Supabase error in getRelatedProducts:', error);
        return [];
      }

      if (!allProducts || !Array.isArray(allProducts)) {
        return [];
      }

      // ✅ CORRECTION : Tri côté client
      const sortedProducts = this.sortProductsByDisplayOrder(allProducts);

      let relatedProducts = sortedProducts.filter(product => 
        product.metadata?.category === category
      );

      if (relatedProducts.length < 3) {
        const otherProducts = sortedProducts
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

  // ✅ NOUVEAU : Méthode pour mettre à jour le stock d'un produit
  async updateProductStock(productId: string, newStockQuantity: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStockQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product stock:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProductStock:', error);
      return false;
    }
  }

  // ✅ NOUVEAU : Méthode pour décrémenter le stock lors d'une vente
  async decrementStock(productId: string, quantity: number = 1): Promise<boolean> {
    try {
      // D'abord, récupérer le stock actuel
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError || !product) {
        console.error('Error fetching product for stock decrement:', fetchError);
        return false;
      }

      const currentStock = product.stock_quantity || 0;
      
      // Vérifier si suffisant de stock
      if (currentStock < quantity) {
        console.warn(`Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`);
        return false;
      }

      // Décrémenter le stock
      const newStock = Math.max(0, currentStock - quantity);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Error decrementing stock:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in decrementStock:', error);
      return false;
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir les produits en rupture de stock
  async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active')
        .lte('stock_quantity', 0);
      
      if (error) throw error;
      
      const sortedProducts = this.sortProductsByDisplayOrder(data || []);
      
      return sortedProducts.map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error fetching out of stock products:', error);
      return [];
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir les produits avec stock faible
  async getLowStockProducts(threshold: number = 5): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .lte('stock_quantity', threshold);
      
      if (error) throw error;
      
      const sortedProducts = this.sortProductsByDisplayOrder(data || []);
      
      return sortedProducts.map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }

  // ✅ NOUVEAU : Méthode pour mettre à jour l'ordre d'affichage
  async updateProductDisplayOrder(productId: string, displayOrder: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ display_order: displayOrder })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product display order:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProductDisplayOrder:', error);
      return false;
    }
  }

  // ✅ NOUVEAU : Méthode pour mettre à jour un produit (pour l'admin)
  async updateProduct(productId: string, updates: Partial<DatabaseProduct>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProduct:', error);
      return false;
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir tous les produits (y compris inactifs) pour l'admin
  async getAllProductsForAdmin(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `);
      
      if (error) throw error;
      
      // ✅ CORRECTION : Tri côté client pour l'admin aussi
      const sortedProducts = this.sortProductsByDisplayOrder(data || []);
      
      return sortedProducts.map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error fetching all products for admin:', error);
      return [];
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir les produits par catégorie
  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const filteredProducts = (data || []).filter(product => 
        product.metadata?.category === category
      );
      
      const sortedProducts = this.sortProductsByDisplayOrder(filteredProducts);
      
      return sortedProducts.map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  }

  // ✅ NOUVEAU : Méthode pour rechercher des produits
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          stock_quantity,
          status,
          metadata,
          created_at,
          updated_at,
          display_order
        `)
        .eq('status', 'active')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      
      if (error) throw error;
      
      const sortedProducts = this.sortProductsByDisplayOrder(data || []);
      
      return sortedProducts.map(product => 
        this.mapDatabaseProductToProduct(product as DatabaseProduct)
      );
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir les statistiques des produits avec stock
  async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    averagePrice: number;
    totalStockValue: number;
  }> {
    try {
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('price, status, stock_quantity');

      if (allError) throw allError;

      const totalProducts = allProducts?.length || 0;
      const activeProducts = allProducts?.filter(p => p.status === 'active').length || 0;
      const inactiveProducts = totalProducts - activeProducts;
      
      const outOfStockProducts = allProducts?.filter(p => 
        p.status === 'active' && (p.stock_quantity || 0) <= 0
      ).length || 0;
      
      const lowStockProducts = allProducts?.filter(p => 
        p.status === 'active' && (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5
      ).length || 0;
      
      const averagePrice = totalProducts > 0 
        ? allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / totalProducts
        : 0;

      const totalStockValue = allProducts?.reduce((sum, p) => 
        sum + ((p.price || 0) * (p.stock_quantity || 0)), 0
      ) || 0;

      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
        outOfStockProducts,
        lowStockProducts,
        averagePrice: Math.round(averagePrice),
        totalStockValue: Math.round(totalStockValue)
      };
    } catch (error) {
      console.error('Error getting product stats:', error);
      return {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        outOfStockProducts: 0,
        lowStockProducts: 0,
        averagePrice: 0,
        totalStockValue: 0
      };
    }
  }
}

export const productService = new ProductService();