// src/utils/image.ts

import type { Product } from '@/types/product';

export const FALLBACK_IMAGE = 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/placeholder.jpg';

export function getProductImages(product: Product): string[] {
  // Essayer d'obtenir les images depuis les métadonnées
  const cloudinaryImages = product.metadata?.images || [];
  if (cloudinaryImages.length > 0) {
    return cloudinaryImages.map(img => img.url);
  }

  // Utiliser les images du produit si disponibles
  if (product.images && product.images.length > 0) {
    return product.images;
  }

  // Retourner l'image par défaut
  return [FALLBACK_IMAGE];
}

export function getImageUrl(url: string | undefined): string {
  if (!url) return FALLBACK_IMAGE;
  return url.startsWith('http') ? url : FALLBACK_IMAGE;
}

export function generateImageProps(url: string, alt: string, priority = false) {
  return {
    src: getImageUrl(url),
    alt,
    priority,
    quality: 85,
    onError: (e: any) => {
      const img = e.currentTarget;
      if (img.src !== FALLBACK_IMAGE) {
        img.src = FALLBACK_IMAGE;
      }
    }
  };
}