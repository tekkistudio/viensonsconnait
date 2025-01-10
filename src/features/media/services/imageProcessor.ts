// src/features/media/services/imageProcessor.ts
import { v2 as cloudinary } from 'cloudinary';

interface ImageDimensions {
  width: number;
  height: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const imageProcessor = {
  // Générer des URLs optimisées selon l'utilisation
  generateOptimizedUrl(publicId: string, usage: 'thumbnail' | 'blog' | 'banner', dimensions?: ImageDimensions) {
    const baseTransformation = {
      fetch_format: 'auto',
      quality: 'auto',
    };

    const usageConfigs = {
      thumbnail: {
        width: 300,
        height: 300,
        crop: 'fill',
        gravity: 'auto'
      },
      blog: {
        width: dimensions?.width || 800,
        crop: 'scale',
        quality: 90
      },
      banner: {
        width: 1920,
        height: 1080,
        crop: 'fill',
        gravity: 'auto'
      }
    };

    return cloudinary.url(publicId, {
      transformation: [
        { ...baseTransformation, ...usageConfigs[usage] }
      ]
    });
  },

  // Recadrer une image existante
  async cropImage(publicId: string, cropArea: CropArea): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(publicId, {
        transformation: [{
          crop: 'crop',
          x: cropArea.x,
          y: cropArea.y,
          width: cropArea.width,
          height: cropArea.height
        }],
        public_id: `${publicId}_cropped`
      });

      return result.secure_url;
    } catch (error) {
      console.error('Erreur lors du recadrage:', error);
      throw new Error('Échec du recadrage de l\'image');
    }
  },

  // Générer des versions responsives
  generateResponsiveUrls(publicId: string, maxWidth: number = 1920) {
    const breakpoints = [320, 640, 768, 1024, 1280, 1536, maxWidth];
    
    return breakpoints.map(width => ({
      width,
      url: cloudinary.url(publicId, {
        transformation: [
          {
            width,
            crop: 'scale',
            quality: 'auto',
            fetch_format: 'auto'
          }
        ]
      })
    }));
  },

  // Appliquer des transformations spécifiques au blog
  generateBlogImageSet(publicId: string) {
    return {
      full: this.generateOptimizedUrl(publicId, 'blog'),
      thumbnail: this.generateOptimizedUrl(publicId, 'thumbnail'),
      responsive: this.generateResponsiveUrls(publicId),
      blurDataUrl: cloudinary.url(publicId, {
        transformation: [
          {
            width: 10,
            blur: 1000
          }
        ]
      })
    };
  }
};