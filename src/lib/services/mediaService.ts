// src/lib/services/mediaService.ts
import { cloudinaryService } from './cloudinaryService';
import { supabase } from '@/lib/supabase';

export interface MediaAsset {
  id: string;
  publicId: string;
  url: string;
  format: string;
  resourceType: 'image' | 'video';
  createdAt: string;
  width: number;
  height: number;
  title: string;
  fileSize: number;
  altText?: string;
  references?: {
    count: number;
    type: string;
  }[];
}

export interface MediaSearchParams {
  resourceType?: 'image' | 'video';
  folder?: string;
  maxResults?: number;
  nextCursor?: string;
}

class MediaService {
  async listAssets(params: MediaSearchParams = {}) {
    try {
      const result = await cloudinaryService.list({
        resource_type: params.resourceType || 'image',
        prefix: params.folder || 'products',
        max_results: params.maxResults || 50,
        next_cursor: params.nextCursor,
        type: 'upload',
        context: true,
        metadata: true
      });

      // Récupérer les références pour chaque asset depuis Supabase
      const assets = await Promise.all(
        result.resources.map(async (resource) => {
          const { data: references } = await supabase
            .from('media_references')
            .select('type, count')
            .eq('media_id', resource.public_id);

          return this.mapResourceToAsset({
            ...resource,
            references: references || []
          });
        })
      );

      return {
        assets,
        hasMore: result.next_cursor !== null,
        nextCursor: result.next_cursor
      };
    } catch (error) {
      console.error('Error listing media assets:', error);
      throw new Error('Failed to list media assets');
    }
  }

  async deleteAsset(publicId: string) {
    try {
      // Supprimer les références dans Supabase
      await supabase
        .from('media_references')
        .delete()
        .eq('media_id', publicId);

      // Supprimer l'asset dans Cloudinary
      await cloudinaryService.delete(publicId);
      return true;
    } catch (error) {
      console.error('Error deleting media asset:', error);
      throw new Error('Failed to delete media asset');
    }
  }

  async uploadAsset(file: File, altText?: string) {
    try {
      const result = await cloudinaryService.upload(file, 'products_upload', 'products');
      
      // Créer une référence vide dans Supabase
      await supabase
        .from('media_references')
        .insert({
          media_id: result.public_id,
          type: 'upload',
          count: 0
        });

      return this.mapResourceToAsset({
        ...result,
        context: { alt: altText }
      });
    } catch (error) {
      console.error('Error uploading media asset:', error);
      throw new Error('Failed to upload media asset');
    }
  }

  private mapResourceToAsset(resource: any): MediaAsset {
    return {
      id: resource.asset_id,
      publicId: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      resourceType: resource.resource_type,
      createdAt: resource.created_at,
      width: resource.width,
      height: resource.height,
      title: resource.public_id.split('/').pop(),
      fileSize: resource.bytes,
      altText: resource.context?.alt || '',
      references: resource.references || []
    };
  }
}

export const mediaService = new MediaService();