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
}

class CloudinaryService {
  private readonly cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  async upload(file: File, preset: string, folder: string) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data: CloudinaryUploadResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  async delete(publicId: string) {
    try {
      const response = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
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
  } = {}) {
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