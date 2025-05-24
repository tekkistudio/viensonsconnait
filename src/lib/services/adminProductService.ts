// src/lib/services/adminProductService.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { AdminProduct, AdminProductMetadata, CloudinaryImage } from '@/types/product';
import { PostgrestError } from '@supabase/supabase-js';
import { logSupabaseError } from '@/lib/supabase';

interface UpdatePayload {
  name?: string;
  description?: string;
  game_rules?: string; 
  price?: number;
  compare_at_price?: number | null;
  status?: AdminProduct['status'];
  stock_quantity?: number;
  metadata?: AdminProductMetadata;
  updated_at: string;
}

export class AdminProductService {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  private async getUser() {
    try {
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        logSupabaseError(sessionError, 'getUser - getSession');
        return null;
      }

      if (!sessionData.session) {
        console.log('No session found');
        return null;
      }

      // Vérifier si l'utilisateur est admin
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .single();

      if (userError) {
        logSupabaseError(userError, 'getUser - getRole');
        return null;
      }

      if (!userData || userData.role !== 'admin') {
        console.log('User is not admin:', userData?.role);
        return null;
      }

      return sessionData.session.user;
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  }

  private async verifyAdmin(requireAuth = true) {
    const user = await this.getUser();
    if (requireAuth && !user) {
      console.error('Admin verification failed: no valid admin user found');
      throw new Error('Unauthorized access');
    }
    return user;
  }

  async getAllProducts() {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getAllProducts');
        throw error;
      }

      return data ? data.map(item => this.mapToAdminProduct(item)) : [];
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch products');
    }
  }

  async getProductById(id: string) {
    if (!id) throw new Error('Product ID is required');

    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logSupabaseError(error, 'getProductById');
        throw error;
      }
      if (!data) throw new Error('Product not found');

      return this.mapToAdminProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: Partial<AdminProduct>) {
    if (!id) throw new Error('Product ID is required');

    try {
      await this.verifyAdmin(true);

      const currentProduct = await this.getProductById(id);
      if (!currentProduct) throw new Error('Product not found');

      const metadata: AdminProductMetadata = {
        category: productData.metadata?.category ?? currentProduct.metadata?.category ?? '',
        players: productData.metadata?.players ?? currentProduct.metadata?.players ?? '',
        duration: productData.metadata?.duration ?? currentProduct.metadata?.duration ?? '',
        language: productData.metadata?.language ?? currentProduct.metadata?.language ?? 'Français',
        min_age: productData.metadata?.min_age ?? currentProduct.metadata?.min_age ?? 12,
        benefits: currentProduct.metadata?.benefits || [],
        topics: currentProduct.metadata?.topics || [],
        stats: {
          sold: currentProduct.metadata?.stats?.sold ?? 0,
          satisfaction: currentProduct.metadata?.stats?.satisfaction ?? 98,
          reviews: currentProduct.metadata?.stats?.reviews ?? 0
        }
      };

      if (productData.media?.length) {
        metadata.images = productData.media.map(media => ({
          url: media.url,
          publicId: media.publicId
        }));
      } else if (currentProduct.metadata?.images) {
        metadata.images = currentProduct.metadata.images;
      }

      const updatePayload = {
        name: productData.name ?? currentProduct.name,
        description: productData.description ?? currentProduct.description,
        game_rules: productData.game_rules ?? currentProduct.game_rules,  
        price: productData.price ?? currentProduct.price,
        compare_at_price: productData.compareAtPrice ?? currentProduct.compareAtPrice ?? null,
        status: productData.status ?? currentProduct.status,
        stock_quantity: productData.stock_quantity ?? currentProduct.stock_quantity,
        metadata,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await this.supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        logSupabaseError(updateError, 'updateProduct');
        throw new Error(`Failed to update product: ${updateError.message}`);
      }

      const { data: updatedProduct, error: fetchError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        logSupabaseError(fetchError, 'updateProduct - fetch');
        throw new Error(`Failed to fetch updated product: ${fetchError.message}`);
      }

      if (!updatedProduct) {
        throw new Error('Failed to fetch product after update');
      }

      return this.mapToAdminProduct(updatedProduct);
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred while updating the product');
    }
  }

  async createProduct(productData: Partial<AdminProduct>) {
    try {
      await this.verifyAdmin(true);

      if (!productData.name) throw new Error('Product name is required');
      if (!productData.price) throw new Error('Product price is required');

      const metadata: AdminProductMetadata = {
        category: productData.metadata?.category || '',
        players: productData.metadata?.players || '',
        duration: productData.metadata?.duration || '',
        language: productData.metadata?.language || 'Français',
        min_age: productData.metadata?.min_age || 12,
        benefits: [],
        topics: [],
        stats: {
          sold: 0,
          satisfaction: 98,
          reviews: 0
        }
      };

      if (productData.media?.length) {
        metadata.images = productData.media.map(media => ({
          url: media.url,
          publicId: media.publicId
        }));
      }

      const createPayload = {
        name: productData.name.trim(),
        description: (productData.description || '').trim(),
        game_rules: (productData.game_rules || '').trim(),  
        price: Number(productData.price),
        compare_at_price: productData.compareAtPrice ? Number(productData.compareAtPrice) : null,
        status: productData.status || 'draft',
        stock_quantity: productData.stock_quantity || 0,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error: insertError } = await this.supabase
        .from('products')
        .insert([createPayload])
        .select()
        .single();

      if (insertError) {
        logSupabaseError(insertError, 'createProduct');
        throw new Error(`Failed to create product: ${insertError.message}`);
      }

      if (!data) {
        throw new Error('No data returned after creation');
      }

      return this.mapToAdminProduct(data);
    } catch (error) {
      console.error('Error in createProduct:', error);
      throw error instanceof Error ? error : new Error('An unexpected error occurred while creating the product');
    }
  }

  async updateProductStatus(id: string, status: AdminProduct['status']) {
    try {
      await this.verifyAdmin(true);
      
      if (!id) throw new Error('Product ID is required');

      const { error: updateError } = await this.supabase
        .from('products')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        logSupabaseError(updateError, 'updateProductStatus');
        throw new Error(`Failed to update product status: ${updateError.message}`);
      }

      const { data: updatedProduct, error: fetchError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        logSupabaseError(fetchError, 'updateProductStatus - fetch');
        throw new Error(`Failed to fetch updated product: ${fetchError.message}`);
      }

      if (!updatedProduct) throw new Error('Product not found after status update');

      return this.mapToAdminProduct(updatedProduct);
    } catch (error) {
      console.error('Error in updateProductStatus:', error);
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.verifyAdmin(true);
      
      if (!id) throw new Error('Product ID is required');

      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        logSupabaseError(error, 'deleteProduct');
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  }

  private mapToAdminProduct(data: any): AdminProduct {
    const metadata = data.metadata || {};
    const defaultStats = {
      sold: 0,
      satisfaction: 98,
      reviews: 0
    };
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      game_rules: data.game_rules, 
      price: data.price,
      compareAtPrice: data.compare_at_price,
      status: data.status as AdminProduct['status'],
      stock_quantity: data.stock_quantity,
      metadata: {
        category: metadata.category || '',
        players: metadata.players || '',
        duration: metadata.duration || '',
        language: metadata.language || 'Français',
        min_age: metadata.min_age || 12,
        benefits: metadata.benefits || [],
        topics: metadata.topics || [],
        stats: metadata.stats || defaultStats,
        images: metadata.images || []
      },
      media: metadata.images?.map((img: CloudinaryImage) => ({
        url: img.url,
        publicId: img.publicId,
        type: 'image' as const
      })) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const adminProductService = new AdminProductService();