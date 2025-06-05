// src/lib/services/QuantityService.ts - VERSION CORRIGÉE
import { ChatMessage, ChatOrderData } from "@/types/chat";
import { RecommendationService } from "./recommendation.service";
import { supabase } from '@/lib/supabase';

export class QuantityService {
  private static instance: QuantityService;

  private constructor() {}

  public static getInstance(): QuantityService {
    if (!this.instance) {
      this.instance = new QuantityService();
    }
    return this.instance;
  }

  private getBotInfo() {
    return {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };
  }

  // ✅ CORRECTION : Sauvegarder dans Supabase directement
  private async saveProgressToDatabase(
    sessionId: string, 
    step: string, 
    orderData: Partial<ChatOrderData>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: sessionId,
          session_data: {
            currentStep: step,
            orderData: orderData,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('❌ Error saving progress:', error);
      } else {
        console.log('✅ Progress saved:', { sessionId, step });
      }
    } catch (error) {
      console.error('❌ Error in saveProgressToDatabase:', error);
    }
  }
  
  async handleQuantityUpdate(
    sessionId: string,
    quantity: number,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    console.log('🔢 Handling quantity update:', { sessionId, quantity });

    try {
      // Mettre à jour les articles avec la nouvelle quantité
      const updatedItems = orderData.items?.map(item => ({
        ...item,
        quantity,
        totalPrice: item.price * quantity
      })) || [];

      const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const deliveryCost = orderData.delivery_cost || 0;

      const updatedOrderData: Partial<ChatOrderData> = {
        ...orderData,
        items: updatedItems,
        subtotal,
        total_amount: subtotal + deliveryCost
      };

      // Sauvegarder la progression
      await this.saveProgressToDatabase(sessionId, 'add_other_products', updatedOrderData);

      return {
        type: 'assistant',
        content: `✅ **Quantité mise à jour : ${quantity} exemplaire${quantity > 1 ? 's' : ''}**

💰 **Nouveau total :** ${(subtotal + deliveryCost).toLocaleString()} FCFA

Souhaitez-vous ajouter d'autres jeux à votre commande ?`,
        choices: ['🛍️ Oui, je veux bien', '📦 Non, juste celui-là'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'add_other_products',
          orderData: updatedOrderData,
          flags: {
            quantityUpdated: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleQuantityUpdate:', error);
      return this.createErrorMessage('Erreur lors de la mise à jour de la quantité');
    }
  }

  async handleAddOtherProducts(
    sessionId: string,
    wantsMore: boolean,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    console.log('🛍️ Handling add other products:', { sessionId, wantsMore });

    try {
      if (wantsMore) {
        // Obtenir les recommandations depuis la base de données
        const recommendations = await this.getProductRecommendations(
          orderData.items?.[0]?.productId || '',
          sessionId
        );

        if (recommendations.length === 0) {
          return {
            type: 'assistant',
            content: `🛍️ **Nos autres jeux populaires**

Découvrez toute notre gamme sur notre site ou contactez-nous pour des recommandations personnalisées.

Voulez-vous finaliser votre commande actuelle ?`,
            choices: [
              '📦 Finaliser ma commande',
              '📞 Recommandations personnalisées',
              '🔙 Retour'
            ],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'finalize_current_order',
              orderData
            },
            timestamp: new Date().toISOString()
          };
        }

        const content = `🎯 **Autres jeux qui pourraient vous intéresser :**

${recommendations.map((rec, i) => `**${i + 1}. ${rec.name}**\n💰 ${rec.price?.toLocaleString() || 'Prix sur demande'} FCFA\n${rec.reason}\n`).join('\n')}

Quel jeu souhaitez-vous ajouter ?`;

        const choices = [
          ...recommendations.slice(0, 3).map(rec => `➕ ${rec.name}`),
          '📦 Finaliser sans ajouter'
        ];

        return {
          type: 'assistant',
          content,
          choices,
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'select_additional_product',
            recommendations: recommendations,
            orderData,
            flags: {
              recommendationsShown: true
            }
          },
          timestamp: new Date().toISOString()
        };

      } else {
        // L'utilisateur ne veut pas d'autres produits
        await this.saveProgressToDatabase(sessionId, 'add_notes', orderData);
        
        return {
          type: 'assistant',
          content: `📝 **Parfait !**

Souhaitez-vous ajouter une note spéciale pour votre commande ? 

Par exemple :
• Instructions particulières pour la livraison
• Message cadeau si c'est un présent
• Préférences de contact

Ou passons directement au résumé de votre commande ?`,
          choices: [
            '📝 Ajouter une note',
            '📋 Voir le résumé',
            '🔙 Modifier ma commande'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'add_notes',
            orderData,
            flags: {
              readyForNotes: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Error in handleAddOtherProducts:', error);
      return this.createErrorMessage('Erreur lors de la gestion des produits supplémentaires');
    }
  }

  // ✅ NOUVELLE MÉTHODE : Récupérer des recommandations depuis la base
  private async getProductRecommendations(
    currentProductId: string,
    sessionId: string
  ): Promise<Array<{
    productId: string;
    name: string;
    reason: string;
    price?: number;
  }>> {
    try {
      // Récupérer d'autres produits actifs
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, category')
        .eq('status', 'active')
        .neq('id', currentProductId) // Exclure le produit déjà dans le panier
        .limit(4);

      if (error || !products || products.length === 0) {
        console.log('⚠️ No recommendations found from database');
        return [];
      }

      // Transformer en format de recommandations
      const recommendations = products.map(product => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        reason: this.generateRecommendationReason(product.category, product.name)
      }));

      console.log('✅ Generated recommendations:', recommendations.length);
      return recommendations;

    } catch (error) {
      console.error('❌ Error fetching product recommendations:', error);
      
      // Fallback avec le service de recommandations existant
      try {
        const fallbackRecommendations = await RecommendationService.getRecommendations({
          currentProductId,
          buyingIntent: 0.8,
          conversationContext: {
            mentionedTopics: [],
            concerns: [],
            interests: []
          }
        });

        return fallbackRecommendations.map(rec => ({
          productId: rec.productId || '',
          name: rec.name,
          reason: rec.reason,
          price: rec.price
        }));

      } catch (fallbackError) {
        console.error('❌ Fallback recommendations also failed:', fallbackError);
        return [];
      }
    }
  }

  // ✅ GÉNÉRER UNE RAISON DE RECOMMANDATION BASÉE SUR LA CATÉGORIE
  private generateRecommendationReason(category: string, productName: string): string {
    const reasons = {
      'couples': `💕 Parfait pour compléter vos soirées en couple`,
      'famille': `👨‍👩‍👧‍👦 Idéal pour des moments familiaux encore plus riches`,
      'amis': `👥 Excellent pour animer vos soirées entre amis`,
      'collegues': `💼 Parfait pour renforcer l'esprit d'équipe`,
      'default': `🎯 Un excellent complément à votre collection`
    };

    const categoryKey = category?.toLowerCase() || 'default';
    return reasons[categoryKey as keyof typeof reasons] || reasons.default;
  }

  // ✅ GESTION DU CHOIX DE PRODUIT SUPPLÉMENTAIRE
  async handleAdditionalProductSelection(
    sessionId: string,
    selectedProduct: string,
    orderData: Partial<ChatOrderData>,
    availableProducts: any[]
  ): Promise<ChatMessage> {
    console.log('➕ Handling additional product selection:', selectedProduct);

    try {
      if (selectedProduct.includes('Finaliser sans ajouter')) {
        // Passer directement aux notes
        return this.handleAddOtherProducts(sessionId, false, orderData);
      }

      // Trouver le produit sélectionné
      const productName = selectedProduct.replace('➕ ', '').trim();
      const selectedProductData = availableProducts.find(p => p.name === productName);

      if (!selectedProductData) {
        return this.createErrorMessage('Produit non trouvé. Veuillez réessayer.');
      }

      // Ajouter le produit au panier
      const newItem = {
        productId: selectedProductData.productId || selectedProductData.id,
        name: selectedProductData.name,
        quantity: 1,
        price: selectedProductData.price || 0,
        totalPrice: selectedProductData.price || 0
      };

      const updatedItems = [...(orderData.items || []), newItem];
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const newTotal = newSubtotal + (orderData.delivery_cost || 0);

      const updatedOrderData: Partial<ChatOrderData> = {
        ...orderData,
        items: updatedItems,
        subtotal: newSubtotal,
        total_amount: newTotal
      };

      await this.saveProgressToDatabase(sessionId, 'product_added', updatedOrderData);

      return {
        type: 'assistant',
        content: `✅ **${selectedProductData.name} ajouté !**

🛒 **Votre panier :**
${updatedItems.map(item => `• ${item.name} x${item.quantity} = ${item.totalPrice.toLocaleString()} FCFA`).join('\n')}

💰 **Nouveau total :** ${newTotal.toLocaleString()} FCFA

Voulez-vous ajouter encore un autre jeu ou finaliser ?`,
        choices: [
          '🛍️ Ajouter un autre jeu',
          '📦 Finaliser ma commande',
          '🗑️ Retirer un produit'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'cart_management',
          orderData: updatedOrderData,
          flags: {
            productAdded: true,
            multipleProducts: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleAdditionalProductSelection:', error);
      return this.createErrorMessage('Erreur lors de l\'ajout du produit');
    }
  }

  // ✅ GESTION DES NOTES DE COMMANDE
  async handleOrderNotes(
    sessionId: string,
    wantsToAddNote: boolean,
    orderData: Partial<ChatOrderData>,
    note?: string
  ): Promise<ChatMessage> {
    console.log('📝 Handling order notes:', { sessionId, wantsToAddNote, hasNote: !!note });

    try {
      if (!wantsToAddNote) {
        // Passer directement au résumé
        await this.saveProgressToDatabase(sessionId, 'order_summary', orderData);
        
        return this.generateOrderSummary(orderData);
      }

      if (note) {
        // Sauvegarder la note
        const updatedOrderData = {
          ...orderData,
          notes: note
        };

        await this.saveProgressToDatabase(sessionId, 'order_summary', updatedOrderData);
        
        return {
          type: 'assistant',
          content: `📝 **Note ajoutée avec succès !**

"${note}"

Parfait ! Voici maintenant le résumé de votre commande :`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'show_order_summary',
            orderData: updatedOrderData,
            flags: {
              noteAdded: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Demander la note
        return {
          type: 'assistant',
          content: `📝 **Ajoutez votre note**

Tapez votre message dans le champ ci-dessous :

**Exemples :**
• "Livrer après 18h SVP"
• "C'est un cadeau, merci de faire un bel emballage"
• "Appeler avant livraison"
• "Laisser chez le gardien si absent"

Que souhaitez-vous nous dire ?`,
          choices: [
            '📦 Finalement, pas de note',
            '🎁 C\'est un cadeau',
            '🏠 Instructions livraison',
            '📞 Préférences contact'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_note_text',
            orderData,
            flags: {
              collectingNote: true,
              freeTextEnabled: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Error in handleOrderNotes:', error);
      return this.createErrorMessage('Erreur lors de la gestion des notes');
    }
  }

  // ✅ GÉNÉRER LE RÉSUMÉ DE COMMANDE
  private generateOrderSummary(orderData: Partial<ChatOrderData>): ChatMessage {
    const items = orderData.items || [];
    const subtotal = orderData.subtotal || 0;
    const deliveryCost = orderData.delivery_cost || 0;
    const total = orderData.total_amount || 0;

    let content = `📋 **Résumé de votre commande**\n\n`;
    
    content += `🛒 **Articles :**\n`;
    items.forEach(item => {
      content += `• ${item.name} x${item.quantity} = ${item.totalPrice.toLocaleString()} FCFA\n`;
    });
    
    content += `\n💰 **Détail des coûts :**\n`;
    content += `• Sous-total : ${subtotal.toLocaleString()} FCFA\n`;
    content += `• Livraison : ${deliveryCost.toLocaleString()} FCFA\n`;
    content += `• **Total : ${total.toLocaleString()} FCFA**\n\n`;

    if (orderData.notes) {
      content += `📝 **Note :** ${orderData.notes}\n\n`;
    }

    content += `Tout est correct ?`;

    return {
      type: 'assistant',
      content,
      choices: [
        '✅ C\'est parfait, je valide',
        '✏️ Modifier ma commande',
        '🗑️ Retirer un article'
      ],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'confirm_order_summary',
        orderData,
        flags: {
          summaryShown: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MESSAGE D'ERREUR STANDARDISÉ
  private createErrorMessage(errorText: string): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **${errorText}**

Voulez-vous réessayer ?`,
      choices: [
        '🔄 Réessayer',
        '📞 Contacter le support',
        '🔙 Retour au menu'
      ],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'error_recovery',
        flags: {
          hasError: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES UTILITAIRES
  async getOrderSummary(orderData: Partial<ChatOrderData>): Promise<{
    items: any[];
    subtotal: number;
    deliveryCost: number;
    total: number;
    itemsCount: number;
  }> {
    const items = orderData.items || [];
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryCost = orderData.delivery_cost || 0;
    const total = subtotal + deliveryCost;
    
    return {
      items,
      subtotal,
      deliveryCost,
      total,
      itemsCount: items.length
    };
  }

  async validateOrderData(orderData: Partial<ChatOrderData>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Aucun article dans la commande');
    }
    
    if (!orderData.first_name || !orderData.last_name) {
      errors.push('Nom complet manquant');
    }
    
    if (!orderData.phone) {
      errors.push('Numéro de téléphone manquant');
    }
    
    if (!orderData.city || !orderData.address) {
      errors.push('Adresse de livraison incomplète');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}