// src/lib/services/cloudinaryService.ts
'use client';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  thumbnail_url?: string;
  context?: {
    alt?: string;
  };
}

interface CloudinaryListResponse {
  resources: CloudinaryUploadResponse[];
  next_cursor: string | null;
  rate_limit_allowed: number;
  rate_limit_remaining: number;
  rate_limit_reset_at: string;
}

interface CloudinaryListParams {
  resource_type: 'image' | 'video';
  prefix: string;
  max_results: number;
  next_cursor?: string;
  type: string;
  context: boolean;
  metadata: boolean;
}

class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    this.cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!this.cloudName || !this.apiKey) {
      throw new Error('Missing Cloudinary configuration');
    }
  }

  async list(params: CloudinaryListParams): Promise<CloudinaryListResponse> {
    try {
      const searchParams = new URLSearchParams({
        resource_type: params.resource_type,
        prefix: params.prefix,
        max_results: params.max_results.toString(),
        type: params.type,
        context: params.context.toString(),
        metadata: params.metadata.toString(),
      });

      if (params.next_cursor) {
        searchParams.append('next_cursor', params.next_cursor);
      }

      const response = await fetch(
        `/api/cloudinary/list?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`List failed: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary list error:', error);
      throw error;
    }
  }

  async upload(file: File, preset: string, folder: string): Promise<CloudinaryUploadResponse> {
    try {
      console.log('Starting upload with:', {
        cloudName: this.cloudName,
        preset,
        folder,
        fileName: file.name
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);
      formData.append('folder', folder);
      formData.append('api_key', this.apiKey);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  async delete(publicId: string): Promise<any> {
    try {
      const response = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): string {
    const transformations = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);

    const transformationString = transformations.length > 0
      ? `/${transformations.join(',')}`
      : '';

    return `https://res.cloudinary.com/${this.cloudName}/image/upload${transformationString}/${publicId}`;
  }
}

export const cloudinaryService = new CloudinaryService();
export type { 
  CloudinaryUploadResponse, 
  CloudinaryListResponse, 
  CloudinaryListParams 
};