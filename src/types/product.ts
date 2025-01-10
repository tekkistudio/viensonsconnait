// src/types/product.ts
export interface Product {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    badges?: ProductBadge[];
    stats?: {
      sold: number;
      satisfaction: number;
      reviews: number;
    };
  }
  
  export interface ProductBadge {
    type: 'promo' | 'new' | 'app';
    text: string;
  }
  
  export interface Message {
    type: 'assistant' | 'user' | 'user-choices' | 'wave-button' | 'om-button';
    content: string;
    choices?: string[];
  }