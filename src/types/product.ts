// src/types/product.ts - VERSION AVEC TAGS

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

export interface MediaUpload {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  thumbnail?: string;
}

export interface ProductMetadata {
  category: string;
  players: string;
  duration: string;
  language: string;
  min_age: number;
  // ✅ AJOUT : Champ pour gérer l'ordre d'affichage
  display_order?: number;
  stats?: {
    sold: number;
    satisfaction: number;
    reviews: number;
  };
  benefits: string[];
  topics: string[];
  images?: CloudinaryImage[];
}

export interface ProductMedia {
  url: string;
  alt: string;
}

export type BadgeType = 'promo' | 'outline' | 'default' | 'new' | 'app' | 'error' | 'success' | 'warning' | 'primary' | 'special';

export interface ProductBadge {
  type: BadgeType;
  text: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  media: ProductMedia[];
  category: string;
  metadata: ProductMetadata;
  benefits: string[];
  topics: string[];
  // ✅ NOUVEAU: Propriété tags ajoutée
  tags?: string[];
  howToPlay?: string;
  testimonials?: string;
  stats: {
    sold: number;
    satisfaction: number;
    reviews: number;
    currentViewers?: number;
    totalViews?: number;
    productId?: string;
  };
  badges?: ProductBadge[];
  createdAt: string;
  // ✅ AJOUT : Propriétés pour le tri et le statut
  status?: 'active' | 'draft' | 'archived';
  display_order?: number;
}

// Interface séparée pour la gestion des métadonnées dans l'admin
export interface AdminProductMetadata {
  category?: string;
  players?: string;
  duration?: string;
  language?: string;
  min_age?: number;
  // ✅ AJOUT : Ordre d'affichage pour l'admin
  display_order?: number;
  stats?: {
    sold?: number;
    satisfaction?: number;
    reviews?: number;
  };
  benefits?: string[];
  topics?: string[];
  images?: CloudinaryImage[];
}

// Interface pour le produit dans l'admin
export interface AdminProduct {
  id?: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  metadata: AdminProductMetadata;
  status: 'active' | 'draft' | 'archived';
  stock_quantity: number;
  media?: MediaUpload[];
  game_rules?: string; 
  // ✅ NOUVEAU: Tags pour l'admin
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  // ✅ AJOUT : Ordre d'affichage direct
  display_order?: number;
}

// ✅ NOUVEAU : Interface pour les données de base de données
export interface DatabaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  status: 'active' | 'draft' | 'archived';
  display_order?: number;
  // ✅ NOUVEAU: Tags dans la base de données
  tags?: string[];
  metadata?: {
    category?: string;
    players?: string;
    duration?: string;
    language?: string;
    min_age?: number;
    display_order?: number;
    stats?: {
      sold?: number;
      satisfaction?: number;
      reviews?: number;
    };
    benefits?: string[];
    topics?: string[];
    howToPlay?: string;
    testimonials?: string;
    images?: CloudinaryImage[];
  };
  created_at: string;
  updated_at?: string;
}

export interface ProductViewStats {
  currentViewers: number;
  totalViews: number;
  sold: number;
  lastUpdated: Date;
}

export interface RealTimeStats {
  viewsCount: number;
  salesCount: number;
  reviewsCount: number;
}

export interface ProductStats {
  totalViews: number;
  sold: number;
  reviewsCount: number;
}

export type ProductsMap = {
  [key: string]: Product;
};