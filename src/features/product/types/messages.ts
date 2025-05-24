// src/features/product/types/messages.ts
import type { CloudinaryImage } from '@/types/product';

// Définition explicite de ProductId
export type ProductId = 'couples' | 'maries' | 'famille' | 'amis' | 'collegues' | 'stvalentin';

export interface PriceConverter {
  (price: number): { value: number; formatted: string; };
}

export interface ProductMessages {
  welcome: string;
  description: string;
  features: string;
  howToPlay: string;
  testimonials: string;
  sampleQuestions: string;
  pricing: (convertPrice: PriceConverter) => string;
}

// Changement de l'interface GenericMessages pour utiliser Record
export type GenericMessages = Record<ProductId, ProductMessages>;

export interface ExtendedProductMetadata {
  category: string;
  players: string;
  duration: string;
  language: string;
  min_age: number;
  stats?: {
    sold: number;
    satisfaction: number;
    reviews: number;
  };
  benefits: string[];
  topics: string[];
  images?: CloudinaryImage[];
  howToPlay?: string;
  testimonials?: string[];
}