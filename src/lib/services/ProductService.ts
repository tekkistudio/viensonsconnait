// src/lib/services/ProductService.ts
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';
import type { 
  ProductId,
  ProductMessages,
  ExtendedProductMetadata,
  PriceConverter
} from '@/features/product/types/messages';

export class ProductService {
  private static instance: ProductService;
  private productCache: Map<string, Product> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_at_price,
          status,
          stock_quantity,
          metadata,
          created_at,
          updated_at
        `);

      if (error) throw error;

      products.forEach(product => {
        this.productCache.set(product.id, this.mapDatabaseProductToModel(product));
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ProductService:', error);
      throw error;
    }
  }

  public async getProduct(productId: string): Promise<Product> {
    await this.ensureInitialized();
    
    const cachedProduct = this.productCache.get(productId);
    if (cachedProduct) return cachedProduct;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        compare_at_price,
        status,
        stock_quantity,
        metadata,
        created_at,
        updated_at
      `)
      .eq('id', productId)
      .single();

    if (error || !product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const mappedProduct = this.mapDatabaseProductToModel(product);
    this.productCache.set(productId, mappedProduct);
    return mappedProduct;
  }

  public async getProductMessages(productId: ProductId): Promise<ProductMessages> {
    const product = await this.getProduct(productId);
    const metadata = product.metadata as ExtendedProductMetadata;
    
    return {
      welcome: `Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu "${product.name}". Comment puis-je vous aider ?`,
      description: product.description || '',
      features: metadata.benefits?.join('\n') || '',
      howToPlay: metadata.howToPlay || '',
      testimonials: Array.isArray(metadata.testimonials) ? metadata.testimonials.join('\n') : '',
      sampleQuestions: metadata.topics?.join('\n') || '',
      pricing: (convertPrice: PriceConverter) => {
        const soloPrice = convertPrice(14000);
        const duoPrice = convertPrice(25200);
        const trioPrice = convertPrice(35700);
        const deliveryCost = convertPrice(3000);
        
        return `Nos offres :
🎁 Pack Solo : ${soloPrice.formatted}
🎁 Pack Duo (-10%) : ${duoPrice.formatted}
🎁 Pack Trio (-15%) : ${trioPrice.formatted}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost.formatted}.`;
      }
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private mapDatabaseProductToModel(dbProduct: any): Product {
    const metadata = dbProduct.metadata as ExtendedProductMetadata;
    
    return {
      id: dbProduct.id,
      slug: dbProduct.id, // Utilisé comme fallback si pas de slug spécifique
      name: dbProduct.name,
      description: dbProduct.description,
      price: dbProduct.price,
      compareAtPrice: dbProduct.compare_at_price,
      images: metadata?.images?.map(img => img.url) || [],
      media: metadata?.images?.map(img => ({
        url: img.url,
        alt: dbProduct.name
      })) || [],
      category: metadata?.category || '',
      metadata: {
        ...metadata,
        stats: {
          sold: metadata?.stats?.sold || 0,
          satisfaction: metadata?.stats?.satisfaction || 5,
          reviews: metadata?.stats?.reviews || 0
        }
      },
      benefits: metadata?.benefits || [],
      topics: metadata?.topics || [],
      howToPlay: metadata?.howToPlay || '',
      testimonials: Array.isArray(metadata?.testimonials) ? metadata.testimonials.join('\n') : '',
      stats: {
        sold: metadata?.stats?.sold || 0,
        satisfaction: metadata?.stats?.satisfaction || 5,
        reviews: metadata?.stats?.reviews || 0
      },
      createdAt: dbProduct.created_at
    };
  }
}

export const productService = ProductService.getInstance();