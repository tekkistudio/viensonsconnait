// src/lib/services/UpsellService.ts - Nouveau service pour gérer les upsells
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep } from '@/types/chat';

interface UpsellProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  images?: string[];
  upsell_priority?: number;
}

export class UpsellService {
  private static instance: UpsellService;

  private constructor() {}

  public static getInstance(): UpsellService {
    if (!this.instance) {
      this.instance = new UpsellService();
    }
    return this.instance;
  }

  // ✅ Récupérer les produits recommandés pour l'upsell
  async getUpsellProducts(currentProductId: string, limit: number = 3): Promise<UpsellProduct[]> {
    try {
      console.log('🎯 Fetching upsell products for:', currentProductId);

      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, images, metadata')
        .eq('status', 'active')
        .neq('id', currentProductId) // Exclure le produit déjà commandé
        .gt('stock_quantity', 0) // Seulement les produits en stock
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching upsell products:', error);
        return [];
      }

      if (!products || products.length === 0) {
        console.log('⚠️ No upsell products found');
        return [];
      }

      // Mapper vers le format UpsellProduct
      const upsellProducts: UpsellProduct[] = products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || 'Découvrez ce jeu pour renforcer vos relations',
        images: product.images || [],
        upsell_priority: product.metadata?.upsell_priority || 1
      }));

      // Trier par priorité upsell si disponible
      upsellProducts.sort((a, b) => (b.upsell_priority || 1) - (a.upsell_priority || 1));

      console.log('✅ Found upsell products:', upsellProducts.length);
      return upsellProducts;

    } catch (error) {
      console.error('❌ Error in getUpsellProducts:', error);
      return [];
    }
  }

  // ✅ Créer le message d'upsell après commande
  async createUpsellMessage(
    sessionId: string, 
    currentProductId: string, 
    currentProductName: string,
    customerName: string = 'cher client'
  ): Promise<ChatMessage> {
    try {
      const upsellProducts = await this.getUpsellProducts(currentProductId, 3);

      if (upsellProducts.length === 0) {
        return this.createNoUpsellMessage(customerName);
      }

      let content = `🎉 **Parfait ${customerName} !**

Votre commande pour **${currentProductName}** est confirmée ✅

💡 **Complétez votre collection :**
Nos clients qui ont acheté ce jeu ont aussi aimé :\n\n`;

      // Ajouter les produits recommandés
      upsellProducts.forEach((product, index) => {
        const shortDesc = product.description.length > 60 
          ? product.description.substring(0, 60) + '...' 
          : product.description;
        
        content += `**${index + 1}. ${product.name}**\n`;
        content += `💰 ${product.price.toLocaleString()} FCFA\n`;
        content += `📝 ${shortDesc}\n\n`;
      });

      content += `💝 **Offre spéciale :** Ajoutez un ou plusieurs jeux à votre commande existante et **économisez sur la livraison** !`;

      // Créer les choix pour les produits
      const choices = [
        ...upsellProducts.slice(0, 2).map(product => `➕ Ajouter ${product.name}`),
        '📦 Finaliser ma commande',
        '👀 Voir tous les jeux'
      ];

      return {
        type: 'assistant',
        content,
        choices,
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'upsell_selection' as ConversationStep,
          upsellProducts: upsellProducts,
          originalProductId: currentProductId,
          sessionId: sessionId,
          flags: { 
            isUpsell: true,
            canAddToExistingOrder: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error creating upsell message:', error);
      return this.createNoUpsellMessage(customerName);
    }
  }

  // ✅ Message si pas de produits pour upsell
  private createNoUpsellMessage(customerName: string): ChatMessage {
    return {
      type: 'assistant',
      content: `🎉 **Merci ${customerName} !**

Votre commande est confirmée ✅

Que souhaitez-vous faire maintenant ?`,
      choices: [
        '🔍 Suivre ma commande',
        '🛍️ Voir nos autres jeux',
        '💬 Nous contacter',
        '🏠 Retour à l\'accueil'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'post_purchase_options' as ConversationStep,
        flags: { orderCompleted: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ Gérer la sélection d'upsell
  async handleUpsellSelection(
    sessionId: string,
    choice: string,
    metadata: any
  ): Promise<ChatMessage> {
    try {
      console.log('🎯 Handling upsell selection:', choice);

      const upsellProducts = metadata?.upsellProducts || [];

      // Finaliser la commande sans ajout
      if (choice.includes('Finaliser ma commande') || choice.includes('📦')) {
        return {
          type: 'assistant',
          content: `✅ **Commande finalisée !**

Merci pour votre achat. Vous recevrez bientôt une confirmation par SMS/WhatsApp.

🎯 **Prochaines étapes :**
• Notre équipe vous contactera pour confirmer la livraison
• Vous pouvez suivre votre commande à tout moment
• Livraison sous 24-48h selon votre zone

Que souhaitez-vous faire maintenant ?`,
          choices: [
            '🔍 Suivre ma commande',
            '💬 Nous contacter',
            '📧 Recevoir par email',
            '🏠 Retour à l\'accueil'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'order_finalized' as ConversationStep,
            flags: { orderCompleted: true, orderFinalized: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Voir tous les jeux
      if (choice.includes('Voir tous les jeux') || choice.includes('👀')) {
        const allProducts = await this.getAllActiveProducts();
        
        let content = `🛍️ **Notre collection complète :**\n\n`;
        
        allProducts.slice(0, 4).forEach((product, index) => {
          content += `**${index + 1}. ${product.name}**\n`;
          content += `💰 ${product.price.toLocaleString()} FCFA\n`;
          const shortDesc = product.description.length > 50 
            ? product.description.substring(0, 50) + '...' 
            : product.description;
          content += `📝 ${shortDesc}\n\n`;
        });

        content += `💝 **Ajoutez-les à votre commande existante et économisez sur la livraison !**`;

        return {
          type: 'assistant',
          content,
          choices: [
            ...allProducts.slice(0, 3).map(p => `➕ Ajouter ${p.name}`),
            '📦 Finaliser ma commande'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'browse_all_products' as ConversationStep,
            allProducts: allProducts,
            flags: { browsingProducts: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Ajouter un produit spécifique
      if (choice.includes('Ajouter')) {
        const productName = choice.replace('➕ Ajouter ', '').trim();
        const selectedProduct = upsellProducts.find((p: UpsellProduct) => p.name === productName);

        if (!selectedProduct) {
          throw new Error('Product not found for upsell');
        }

        return await this.handleProductAddition(sessionId, selectedProduct, metadata);
      }

      // Par défaut
      throw new Error('Unhandled upsell choice');

    } catch (error) {
      console.error('❌ Error handling upsell selection:', error);
      return {
        type: 'assistant',
        content: `😔 **Erreur temporaire**

Une erreur est survenue lors du traitement de votre sélection.

Voulez-vous réessayer ?`,
        choices: ['🔄 Réessayer', '📦 Finaliser sans ajout', '📞 Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'upsell_error' as ConversationStep,
          flags: { hasError: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ Gérer l'ajout d'un produit à la commande existante
  private async handleProductAddition(
    sessionId: string,
    product: UpsellProduct,
    metadata: any
  ): Promise<ChatMessage> {
    try {
      console.log('➕ Adding product to existing order:', product.name);

      // Ici vous pourriez appeler votre service de commande pour ajouter le produit
      // await orderService.addProductToExistingOrder(sessionId, product.id, 1);

      return {
        type: 'assistant',
        content: `✅ **${product.name} ajouté à votre commande !**

📦 **Votre commande mise à jour :**
• Produit original
• **${product.name}** - ${product.price.toLocaleString()} FCFA

💝 **Économie sur la livraison :** Les deux produits seront livrés ensemble !

Souhaitez-vous ajouter autre chose ou finaliser ?`,
        choices: [
          '➕ Ajouter un autre jeu',
          '📦 Finaliser ma commande',
          '🔍 Voir le récapitulatif'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'product_added_to_order' as ConversationStep,
          addedProduct: product,
          flags: { 
            productAdded: true,
            canAddMore: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error adding product to order:', error);
      return {
        type: 'assistant',
        content: `😔 **Erreur lors de l'ajout**

Impossible d'ajouter ce produit pour le moment.

Voulez-vous essayer autre chose ?`,
        choices: ['🔄 Réessayer', '📦 Finaliser sans ajout', '📞 Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'add_product_error' as ConversationStep,
          flags: { hasError: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ Récupérer tous les produits actifs
  private async getAllActiveProducts(): Promise<UpsellProduct[]> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, images')
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('name', { ascending: true });

      if (error || !products) {
        return [];
      }

      return products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || 'Découvrez ce jeu pour renforcer vos relations',
        images: product.images || []
      }));

    } catch (error) {
      console.error('❌ Error fetching all products:', error);
      return [];
    }
  }

  // ✅ Calculer les économies de livraison
  calculateDeliverySavings(city: string): number {
    // Logique pour calculer les économies
    // Par exemple, si la livraison coûte 3000 FCFA, le client économise ce montant
    const deliveryCosts: Record<string, number> = {
      'dakar': 0,
      'thiès': 3000,
      'saint-louis': 3000,
      'kaolack': 3000,
      'abidjan': 2500
    };

    const normalizedCity = city.toLowerCase();
    return deliveryCosts[normalizedCity] || 2500;
  }
}

export default UpsellService;