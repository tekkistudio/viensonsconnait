// src/constants/images.ts

export const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dq6pustuw/image/upload';
export const FALLBACK_IMAGE = `${CLOUDINARY_BASE_URL}/v1/products/placeholder.jpg`;

// Constantes pour la configuration Cloudinary
export const CLOUDINARY_CONFIG = {
  cloudName: 'dq6pustuw',
  defaultQuality: 85,
  defaultFormat: 'auto',
  defaultFlags: 'f_auto,q_auto'
} as const;

// Fonction utilitaire pour construire les URLs Cloudinary
export const buildCloudinaryUrl = (publicId: string, version = 'v1') => {
  return `${CLOUDINARY_BASE_URL}/${version}/${publicId}`;
};