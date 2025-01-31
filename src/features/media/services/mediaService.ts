// src/features/media/services/mediaService.ts
import { v2 as cloudinaryClient } from 'cloudinary';

interface MediaFile {
  url: string;
  path: string;
  name: string;
  size?: number;
  created_at?: string;
}

interface CloudinaryResource {
  secure_url: string;
  public_id: string;
  bytes: number;
  created_at: string;
}

// Configuration de Cloudinary selon l'environnement
const cloudinary = (() => {
  if (typeof window === 'undefined') {
    // Configuration côté serveur
    const cloudinaryServer = require('cloudinary').v2;
    cloudinaryServer.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    return cloudinaryServer;
  } else {
    // Version stub pour le client
    return {
      api: {
        resources: async () => {
          throw new Error('Cette opération n\'est disponible que côté serveur');
        }
      },
      uploader: {
        upload: async () => {
          throw new Error('Cette opération n\'est disponible que côté serveur');
        },
        destroy: async () => {
          throw new Error('Cette opération n\'est disponible que côté serveur');
        }
      }
    };
  }
})();

// Fonction helper pour convertir File en base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const mediaService = {
  async getImages(): Promise<MediaFile[]> {
    try {
      const { resources } = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'blog',
        max_results: 100
      }) as { resources: CloudinaryResource[] };

      return resources.map(resource => ({
        url: resource.secure_url,
        path: resource.public_id,
        name: resource.public_id.split('/').pop() || '',
        size: resource.bytes,
        created_at: resource.created_at
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des images:', error);
      throw new Error('Échec du chargement des images');
    }
  },

  async uploadImage(file: File): Promise<MediaFile> {
    try {
      // Convertir le fichier en base64
      const base64Data = await fileToBase64(file);

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'blog',
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      }) as CloudinaryResource;

      return {
        url: result.secure_url,
        path: result.public_id,
        name: file.name,
        size: file.size,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      throw new Error('Échec de l\'upload de l\'image');
    }
  },

  async deleteImage(path: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(path);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw new Error('Échec de la suppression de l\'image');
    }
  }
};