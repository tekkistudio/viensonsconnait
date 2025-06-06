// src/lib/services/ConversationalCartService.ts - VERSION CORRIGÉE
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatOrderData, ConversationStep } from '@/types/chat';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  addedAt: string;
}

interface ConversationalCart {
  sessionId: string;
  items: CartItem[];
  currentProductId?: string; // Produit actuellement consulté
  totalAmount: number;
  deliveryCost: number;
  lastUpdated: string;
}

export class ConversationalCartService {
  private static instance: ConversationalCartService;
  private carts: Map<string, ConversationalCart> = new Map();

  private constructor() {}

  public static getInstance(): ConversationalCartService {
    if (!this.instance) {
      this.instance = new ConversationalCartService();
    }
    return this.instance;
  }

  // ✅ CORRECTION: INITIALISER OU RÉCUPÉRER UN PANIER
  async getOrCreateCart(sessionId: string, currentProductId?: string): Promise<ConversationalCart> {
    let cart: ConversationalCart | undefined = this.carts.get(sessionId);
    
    if (!cart) {
      // ✅ CORRECTION: Essayer de récupérer depuis la base de données
      const loadedCart = await this.loadCartFromDatabase(sessionId);
      
      if (loadedCart) {
        cart = loadedCart;
      } else {
        // Créer un nouveau panier
        cart = {
          sessionId,
          items: [],
          currentProductId,
          totalAmount: 0,
          deliveryCost: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
      this.carts.set(sessionId, cart);
    }

    // Mettre à jour le produit actuellement consulté
    if (currentProductId && cart.currentProductId !== currentProductId) {
      cart.currentProductId = currentProductId;
      cart.lastUpdated = new Date().toISOString();
      await this.saveCartToDatabase(cart);
    }

    return cart;
  }

  // ✅ AJOUTER UN PRODUIT AU PANIER CONVERSATIONNEL
  async addProductToCart(
    sessionId: string, 
    productId: string, 
    quantity: number = 1
  ): Promise<ChatMessage> {
    console.log('🛒 Adding product to conversational cart:', { sessionId, productId, quantity });

    try {
      // Récupérer le panier
      const cart = await this.getOrCreateCart(sessionId, productId);
      
      // Récupérer les infos du produit
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, status')
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (error || !product) {
        return this.createErrorMessage('Produit non trouvé ou indisponible');
      }

      // Vérifier si le produit existe déjà dans le panier
      const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
      
      if (existingItemIndex !== -1) {
        // Mettre à jour la quantité
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].quantity * product.price;
      } else {
        // Ajouter un nouveau produit
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          quantity,
          price: product.price,
          totalPrice: product.price * quantity,
          addedAt: new Date().toISOString()
        };
        cart.items.push(newItem);
      }

      // Recalculer le total
      cart.totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0) + cart.deliveryCost;
      cart.lastUpdated = new Date().toISOString();

      // Sauvegarder
      await this.saveCartToDatabase(cart);
      this.carts.set(sessionId, cart);

      return {
        type: 'assistant',
        content: `✅ **${product.name} ajouté à la commande !**

🛒 **Votre commande (${cart.items.length} article${cart.items.length > 1 ? 's' : ''}) :**
${cart.items.map(item => `• ${item.name} x${item.quantity} = ${item.totalPrice.toLocaleString()} FCFA`).join('\n')}

💰 **Total actuel :** ${cart.totalAmount.toLocaleString()} FCFA

Que souhaitez-vous faire maintenant ?`,
        choices: [
          '🛍️ Continuer mes achats',
          '📦 Finaliser ma commande',
          '🗑️ Modifier la commande',
          '👀 Voir d\'autres jeux'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'cart_management' as ConversationStep,
          orderData: this.convertCartToOrderData(cart),
          flags: {
            productAdded: true,
            hasMultipleProducts: cart.items.length > 1
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error adding product to cart:', error);
      return this.createErrorMessage('Erreur lors de l\'ajout à la commande');
    }
  }

  // ✅ GÉRER LA NAVIGATION ENTRE PRODUITS
  async handleProductNavigation(
    sessionId: string,
    newProductId: string,
    fromProductId?: string
  ): Promise<ChatMessage> {
    console.log('🔄 Handling product navigation:', { sessionId, newProductId, fromProductId });

    try {
      const cart = await this.getOrCreateCart(sessionId, newProductId);
      
      // Récupérer les infos du nouveau produit
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, description')
        .eq('id', newProductId)
        .single();

      if (error || !product) {
        return this.createErrorMessage('Produit non trouvé');
      }

      // Vérifier s'il y a déjà des articles dans le panier
      if (cart.items.length > 0) {
        const cartSummary = cart.items.map(item => `• ${item.name} x${item.quantity}`).join('\n');
        
        return {
          type: 'assistant',
          content: `👋 **Heureuse de vous revoir sur la page du jeu ${product.name} !**

🛒 **Votre commande actuel :**
${cartSummary}

💰 **Total : ${cart.totalAmount.toLocaleString()} FCFA**

Souhaitez-vous ajouter ce jeu à votre commande existante ou commencer une nouvelle commande ?`,
          choices: [
            `➕ Ajouter le jeu ${product.name} à la commande`,
            '📦 Finaliser ma commande actuelle',
            '🗑️ Vider la commande et recommencer',
            '💬 En savoir plus sur ce jeu'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'product_navigation_choice' as ConversationStep,
            productId: newProductId,
            orderData: this.convertCartToOrderData(cart),
            flags: {
              hasExistingCart: true,
              productNavigation: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Panier vide, message de bienvenue standard
        return {
          type: 'assistant',
          content: `👋 **Bonjour ! Je suis Rose.**

Je vais vous aider avec le jeu **${product.name}** !

Comment puis-je vous aider aujourd'hui ?`,
          choices: [
            '⚡ Commander rapidement',
            '❓ Poser une question',
            '📦 Infos livraison',
            '💬 En savoir plus'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'initial_engagement' as ConversationStep,
            productId: newProductId,
            flags: {
              isWelcome: true,
              emptyCart: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Error handling product navigation:', error);
      return this.createErrorMessage('Erreur lors de la navigation');
    }
  }

  // ✅ MODIFIER LA QUANTITÉ D'UN PRODUIT
  async updateProductQuantity(
    sessionId: string,
    productId: string,
    newQuantity: number
  ): Promise<ChatMessage> {
    console.log('🔢 Updating product quantity:', { sessionId, productId, newQuantity });

    try {
      const cart = await this.getOrCreateCart(sessionId);
      const itemIndex = cart.items.findIndex(item => item.productId === productId);

      if (itemIndex === -1) {
        return this.createErrorMessage('Produit non trouvé dans la commande');
      }

      if (newQuantity <= 0) {
        // Retirer le produit du panier
        const removedItem = cart.items.splice(itemIndex, 1)[0];
        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0) + cart.deliveryCost;
        
        await this.saveCartToDatabase(cart);
        
        return {
          type: 'assistant',
          content: `🗑️ **${removedItem.name} retiré de la commande**

${cart.items.length > 0 ? 
  `🛒 **Commande restante :**\n${cart.items.map(item => `• ${item.name} x${item.quantity}`).join('\n')}\n\n💰 **Nouveau total :** ${cart.totalAmount.toLocaleString()} FCFA` 
  : '🛒 **Votre commande est maintenant vide**'
}

Que souhaitez-vous faire ?`,
          choices: cart.items.length > 0 ? [
            '📦 Finaliser ma commande',
            '🛍️ Continuer mes achats',
            '🗑️ Modifier la commande'
          ] : [
            '🛍️ Reprendre mes achats',
            '👀 Voir nos jeux populaires',
            '📞 Contacter le support'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: cart.items.length > 0 ? 'cart_management' : 'empty_cart' as ConversationStep,
            orderData: this.convertCartToOrderData(cart)
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Mettre à jour la quantité
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * newQuantity;
        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0) + cart.deliveryCost;
        
        await this.saveCartToDatabase(cart);
        
        return {
          type: 'assistant',
          content: `✅ **Quantité mise à jour !**

🛒 **Votre commande :**
${cart.items.map(item => `• ${item.name} x${item.quantity} = ${item.totalPrice.toLocaleString()} FCFA`).join('\n')}

💰 **Total : ${cart.totalAmount.toLocaleString()} FCFA**

Que souhaitez-vous faire maintenant ?`,
          choices: [
            '📦 Finaliser ma commande',
            '🛍️ Continuer mes achats',
            '🗑️ Modifier la commande',
            '💬 Ajouter une note'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'cart_management' as ConversationStep,
            orderData: this.convertCartToOrderData(cart),
            flags: {
              quantityUpdated: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Error updating product quantity:', error);
      return this.createErrorMessage('Erreur lors de la mise à jour');
    }
  }

  // ✅ AFFICHER LE RÉSUMÉ DU PANIER
  async getCartSummary(sessionId: string): Promise<ChatMessage> {
    console.log('📋 Getting cart summary:', sessionId);

    try {
      const cart = await this.getOrCreateCart(sessionId);

      if (cart.items.length === 0) {
        return {
          type: 'assistant',
          content: `🛒 **Votre commande est vide**

Découvrez nos jeux de cartes pour transformer vos relations !

Que souhaitez-vous faire ?`,
          choices: [
            '🎯 Voir nos jeux populaires',
            '💕 Jeux pour couples',
            '👨‍👩‍👧‍👦 Jeux pour familles',
            '📞 Contacter le support'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: 'empty_cart_options' as ConversationStep
          },
          timestamp: new Date().toISOString()
        };
      }

      const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        type: 'assistant',
        content: `🛒 **Résumé de votre commande**

📦 **Articles (${cart.items.length}) :**
${cart.items.map(item => `• ${item.name} x${item.quantity} = ${item.totalPrice.toLocaleString()} FCFA`).join('\n')}

💰 **Détail :**
• Sous-total : ${subtotal.toLocaleString()} FCFA
• Livraison : ${cart.deliveryCost.toLocaleString()} FCFA
• **Total : ${cart.totalAmount.toLocaleString()} FCFA**

Que souhaitez-vous faire ?`,
        choices: [
          '📦 Finaliser ma commande',
          '🛍️ Continuer mes achats',
          '✏️ Modifier les quantités',
          '🗑️ Vider la commande'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'cart_summary_actions' as ConversationStep,
          orderData: this.convertCartToOrderData(cart),
          flags: {
            cartSummaryShown: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting cart summary:', error);
      return this.createErrorMessage('Erreur lors de l\'affichage de la commande');
    }
  }

  // ✅ VIDER LE PANIER
  async clearCart(sessionId: string): Promise<ChatMessage> {
    console.log('🗑️ Clearing cart:', sessionId);

    try {
      const cart: ConversationalCart = {
        sessionId,
        items: [],
        totalAmount: 0,
        deliveryCost: 0,
        lastUpdated: new Date().toISOString()
      };

      await this.saveCartToDatabase(cart);
      this.carts.set(sessionId, cart);

      return {
        type: 'assistant',
        content: `🗑️ **Commande vidée avec succès**

Vous pouvez recommencer vos achats quand vous le souhaitez !

Que souhaitez-vous faire maintenant ?`,
        choices: [
          '🛍️ Reprendre mes achats',
          '🎯 Voir les jeux populaires',
          '💬 Poser une question',
          '📞 Contacter le support'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'fresh_start' as ConversationStep,
          flags: {
            cartCleared: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      return this.createErrorMessage('Erreur lors de la suppression');
    }
  }

  // ✅ CONVERTIR LE PANIER EN DONNÉES DE COMMANDE
  private convertCartToOrderData(cart: ConversationalCart): Partial<ChatOrderData> {
    return {
      session_id: cart.sessionId,
      items: cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      subtotal: cart.items.reduce((sum, item) => sum + item.totalPrice, 0),
      delivery_cost: cart.deliveryCost,
      total_amount: cart.totalAmount
    };
  }

  // ✅ SAUVEGARDER LE PANIER EN BASE
  private async saveCartToDatabase(cart: ConversationalCart): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: cart.sessionId,
          session_data: {
            cart: cart,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('❌ Error saving cart:', error);
      }
    } catch (error) {
      console.error('❌ Error in saveCartToDatabase:', error);
    }
  }

  // ✅ CORRECTION: CHARGER LE PANIER DEPUIS LA BASE - Type corrigé
  private async loadCartFromDatabase(sessionId: string): Promise<ConversationalCart | undefined> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('session_data')
        .eq('id', sessionId)
        .single();

      if (error || !data?.session_data?.cart) {
        return undefined; // ✅ CORRECTION: Retourner undefined au lieu de null
      }

      return data.session_data.cart as ConversationalCart;
    } catch (error) {
      console.error('❌ Error loading cart from database:', error);
      return undefined; // ✅ CORRECTION: Retourner undefined au lieu de null
    }
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
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        flags: {
          hasError: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES UTILITAIRES
  async getCartItemsCount(sessionId: string): Promise<number> {
    const cart = await this.getOrCreateCart(sessionId);
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async getCartTotal(sessionId: string): Promise<number> {
    const cart = await this.getOrCreateCart(sessionId);
    return cart.totalAmount;
  }

  async hasProductInCart(sessionId: string, productId: string): Promise<boolean> {
    const cart = await this.getOrCreateCart(sessionId);
    return cart.items.some(item => item.productId === productId);
  }

  async getProductQuantityInCart(sessionId: string, productId: string): Promise<number> {
    const cart = await this.getOrCreateCart(sessionId);
    const item = cart.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }
}