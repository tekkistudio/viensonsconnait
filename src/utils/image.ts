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

// ✅ CORRECTION : Support des images locales ET Cloudinary
export function getImageUrl(url: string | undefined): string {
  if (!url) return FALLBACK_IMAGE;
  
  // Si c'est une URL complète (HTTP/HTTPS) ou une image locale (/images/), la retourner telle quelle
  if (url.startsWith('http') || url.startsWith('/images/')) {
    return url;
  }
  
  // Sinon, utiliser l'image de fallback
  return FALLBACK_IMAGE;
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

// ✅ FONCTION HERO IMAGES AVEC DEBUG
export function getHeroImage(product: Product): string {
  const category = product.category || product.metadata?.category;
  
  // Mapping des catégories vers les images hero
  const heroImages = {
    couples: '/images/hero/maries-hero.webp',
    maries: '/images/hero/couples-hero.webp', 
    famille: '/images/hero/familles-hero.webp',
    amis: '/images/hero/amis-hero.jpg',
    collegues: '/images/hero/collegues-hero.jpg',
    stvalentin: '/images/hero/stval-hero.jpg'
  };
  
  console.log('🎯 getHeroImage - Product:', product.name, 'Category:', category);
  
  if (category && heroImages[category as keyof typeof heroImages]) {
    const heroImagePath = heroImages[category as keyof typeof heroImages];
    console.log('✅ Hero image found:', heroImagePath);
    return heroImagePath;
  }
  
  // Fallback vers la première image du produit
  const fallbackImage = getProductImages(product)[0];
  console.log('⚠️ No hero image, using fallback:', fallbackImage);
  return fallbackImage;
}

// NOUVELLES FONCTIONS AJOUTÉES POUR COMPATIBILITÉ
export function optimizeCloudinaryUrl(
  url: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string {
  // Si ce n'est pas une URL Cloudinary, retourner telle quelle
  if (!url.includes('cloudinary.com') && !url.includes('res.cloudinary.com')) {
    return url;
  }

  try {
    // Pour votre configuration Cloudinary existante
    if (options.width || options.height || options.quality) {
      const transformations = [];
      
      if (options.width) transformations.push(`w_${options.width}`);
      if (options.height) transformations.push(`h_${options.height}`);
      if (options.quality) transformations.push(`q_${options.quality}`);
      if (options.format) transformations.push(`f_${options.format}`);
      
      // Insérer les transformations dans l'URL
      const uploadIndex = url.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const beforeUpload = url.substring(0, uploadIndex + 8);
        const afterUpload = url.substring(uploadIndex + 8);
        return `${beforeUpload}${transformations.join(',')}/${afterUpload}`;
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error optimizing Cloudinary URL:', error);
    return url;
  }
}

export function generateThumbnail(url: string, size: number = 150): string {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    quality: 80,
    format: 'webp'
  });
}

export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Vérifier les extensions d'image communes
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  
  // Vérifier si c'est une URL Cloudinary
  const isCloudinary = url.includes('cloudinary.com');
  
  // Vérifier si c'est une URL locale valide
  const isLocal = url.startsWith('/images/');
  
  return imageExtensions.test(url) || isCloudinary || isLocal;
}