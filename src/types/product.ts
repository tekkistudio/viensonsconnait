// src/types/product.ts

// Interface pour les médias des produits
export interface ProductMedia {
  url: string;
  alt: string;
}

// Interface pour les badges des produits
export interface ProductBadge {
  type: 'promo' | 'new' | 'app' | 'special'; 
  text: string;
}

// Interface pour les statistiques des produits
export interface ProductStats {
  sold: number;
  satisfaction: number;
  reviews: number;
}

// Interface principale pour les produits
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  media: ProductMedia[]; 
  badges?: ProductBadge[];
  stats?: ProductStats;
}

// Types de messages dans le chat
export interface Message {
  type: 'assistant' | 'user' | 'user-choices' | 'wave-button' | 'om-button' | 'cod-button' | 'payment-request' | 'payment-status' | 'payment-action' | 'redirect' | 'order-summary';
  content: string;
  choices?: string[];
  assistant?: {
    name: string;
    title: string;
    avatar?: string;
  };
  metadata?: {
    intent?: number;
    recommendations?: string[];
    error?: string;
    productContext?: string;
    paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    transactionId?: string;
  };
  paymentUrl?: string;
}

// Type pour la map des produits
export type ProductsMap = {
  [key: string]: Product;
};