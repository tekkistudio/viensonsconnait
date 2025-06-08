// src/lib/services/OptimizedChatService.ts - AMÉLIORATION GESTION BOUTONS
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';
import { OrderService } from './OrderService';
import { AIResponseHandler } from './AIResponseHandler';
import { OrderTrackingService } from './OrderTrackingService'; // ✅ NOUVEAU
import type { 
  ChatMessage, 
  ConversationStep, 
  MessageType,
  ChatOrderData 
} from '@/types/chat';
import type { PaymentProvider } from '@/types/order';

// États simplifiés pour le nouveau flow
type PurchaseStep = 'quantity' | 'contact' | 'name' | 'address' | 'payment' | 'confirmation';

interface OrderState {
  step: PurchaseStep;
  mode: 'express' | 'conversational';
  data: {
    phone?: string;
    name?: string;
    address?: string;
    city?: string;
    paymentMethod?: PaymentProvider;
    quantity: number;
    productId?: string;
    storeId?: string;
  };
  flags: {
    customerExists: boolean;
    addressValidated: boolean;
    paymentInitiated: boolean;
    allowAddressChange?: boolean;
  };
  metadata?: {
    maxQuantity?: number;
    availableProducts?: any[];
  };
}

export class OptimizedChatService {
  private static instance: OptimizedChatService | null = null;
  private orderStates: Map<string, OrderState> = new Map();
  private phoneService = PhoneService.getInstance();
  private orderService = OrderService.getInstance();
  private aiResponseHandler = AIResponseHandler.getInstance();
  private orderTrackingService = OrderTrackingService.getInstance(); // ✅ NOUVEAU

  private constructor() {}

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ NOUVELLE MÉTHODE: Détecter les boutons qui ne doivent PAS passer par l'IA
  private isPredefinedSystemButton(message: string): boolean {
    const systemButtons = [
      // Boutons de paiement - gérés directement par le frontend
      'Payer avec Wave',
      'Payer par Carte bancaire', 
      'Payer à la livraison',
      'Wave',
      'Carte bancaire',
      
      // Boutons post-achat - gérés par le système
      'Suivre ma commande',
      'Nous contacter',
      'Voir ma commande',
      'Changer d\'adresse',
      
      // Actions express - gérées par le flow express
      'Commander rapidement',
      'Commander maintenant',
      '⚡',
      
      // Boutons express flow
      '1 exemplaire',
      '2 exemplaires', 
      '3 exemplaires',
      'Autre quantité',
      'Garder cette adresse',
      'Nouvelle adresse',
      'Valider la commande',
      'Modifier ma commande'
    ];

    return systemButtons.some(btn => 
      message.includes(btn) || 
      message.toLowerCase().includes(btn.toLowerCase())
    );
  }

  // ✅ MÉTHODE PRINCIPALE AMÉLIORÉE
  async processUserInput(
    sessionId: string,
    message: string,
    currentStep?: ConversationStep
  ): Promise<ChatMessage> {
    console.log('🤖 Processing user input with system/AI separation:', { 
      sessionId, 
      message: message.substring(0, 50), 
      currentStep,
      isPredefined: this.isPredefinedSystemButton(message)
    });

    try {
      // ✅ VALIDATION DE SESSION
      if (!sessionId || sessionId.length < 5) {
        console.error('❌ Invalid sessionId provided:', sessionId);
        return this.createErrorMessage('', 'Session invalide. Veuillez rafraîchir la page.');
      }

      // ✅ CORRECTION 1: Gérer les boutons prédéfinis AVANT l'IA
      if (this.isPredefinedSystemButton(message)) {
        console.log('🔧 Processing predefined system button:', message);
        return await this.handleSystemButton(sessionId, message, currentStep);
      }

      // ✅ CORRECTION 2: Gérer le flow express
      if (currentStep?.includes('express')) {
        console.log('⚡ Processing express flow step:', currentStep);
        return this.handleExpressStep(sessionId, message, currentStep);
      }

      // ✅ CORRECTION 3: Pour tout le reste, utiliser l'IA
      console.log('🧠 Delegating to AI for free text message');
      
      // Récupérer ou créer l'état de commande
      let orderState: OrderState | undefined = this.orderStates.get(sessionId);
      
      if (!orderState) {
        const recoveredState = await this.recoverSessionFromDatabase(sessionId);
        if (recoveredState) {
          orderState = recoveredState;
          this.orderStates.set(sessionId, orderState);
        }
      }

      // Extraire le productId
      let productId = orderState?.data.productId;
      if (!productId) {
        try {
          const sessionParts = sessionId.split('_');
          if (sessionParts.length >= 2 && sessionParts[0].length > 10) {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidPattern.test(sessionParts[0])) {
              productId = sessionParts[0];
            }
          }
        } catch (error) {
          console.error('❌ Error extracting productId:', error);
        }
      }

      if (!productId) {
        return this.createErrorMessage(sessionId, 'Session expirée. Veuillez rafraîchir la page.');
      }

      // Récupérer les infos produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, description')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ Product not found for AI context:', productError);
        return this.createErrorMessage(sessionId, `Produit non trouvé.`);
      }

      // Préparer le contexte pour l'IA
      const aiContext = {
        productId: product.id,
        productName: product.name,
        sessionId,
        isExpressMode: orderState?.mode === 'express' || false,
        currentStep,
        userMessage: message,
        conversationHistory: []
      };

      // Laisser l'IA traiter le message
      const aiResponse = await this.aiResponseHandler.handleFreeTextMessage(aiContext);
      
      console.log('✅ AI response generated successfully:', aiResponse);
      return aiResponse;

    } catch (error) {
      console.error('❌ Error processing user input:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre message. Veuillez réessayer.');
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gérer les boutons système prédéfinis
  private async handleSystemButton(
    sessionId: string,
    message: string,
    currentStep?: ConversationStep
  ): Promise<ChatMessage> {
    console.log('🔧 Handling system button:', message);

    try {
      // ✅ SUIVI DE COMMANDE
      if (message.includes('Suivre ma commande') || message.includes('🔍')) {
        return await this.orderTrackingService.createTrackingMessage(sessionId);
      }

      // ✅ CONTACTER LE SUPPORT
      if (message.includes('Nous contacter') || message.includes('📞')) {
        return {
          type: 'assistant',
          content: `💬 **Contactez notre équipe !**

🤝 **Notre support client est là pour vous :**

📱 **WhatsApp :** +221 78 136 27 28
📧 **Email :** contact@viensonseconnait.com
🕒 **Horaires :** Lun-Ven 9h-18h, Sam 9h-14h

💬 **Ou continuez ici :**
Je peux répondre à toutes vos questions sur nos jeux, votre commande, et autres.

Comment puis-je vous aider ?`,
          choices: [
            '💬 Parler à quelqu\'un',
            '❓ Poser une question',
            '🔙 Retour au menu'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'customer_service' as ConversationStep,
            externalUrl: {
              type: 'whatsapp',
              url: 'https://wa.me/221781362728',
              description: 'Contacter sur WhatsApp'
            },
            flags: { 
              contactMode: true,
              freeTextEnabled: true 
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ AUTRES PRODUITS
      if (message.includes('Autres produits') || message.includes('🛍️')) {
        const orderState = this.orderStates.get(sessionId);
        if (orderState) {
          return this.handleAdditionalProducts(sessionId, orderState);
        }
      }

      // ✅ COMMANDE EXPRESS
      if (message.includes('Commander rapidement') || message.includes('⚡')) {
        // Extraire le productId
        let productId = '';
        try {
          const sessionParts = sessionId.split('_');
          if (sessionParts.length >= 2 && sessionParts[0].length > 10) {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidPattern.test(sessionParts[0])) {
              productId = sessionParts[0];
            }
          }
        } catch (error) {
          console.error('❌ Error extracting productId:', error);
        }

        if (productId) {
          return this.startExpressPurchase(sessionId, productId);
        }
      }

      // ✅ Si aucune correspondance, déléguer à l'IA
      console.log('⚠️ System button not recognized, delegating to AI:', message);
      return await this.processUserInput(sessionId, message, currentStep);

    } catch (error) {
      console.error('❌ Error handling system button:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre demande');
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Gérer l'ajout de produits supplémentaires
  private async handleAdditionalProducts(
    sessionId: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    try {
      // Récupérer d'autres produits disponibles
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, images')
        .eq('status', 'active')
        .neq('id', orderState.data.productId)
        .limit(4);

      if (error || !products || products.length === 0) {
        return {
          type: 'assistant',
          content: `🛍️ **Nos autres produits**

Découvrez toute notre gamme sur notre site.

Voulez-vous finaliser votre commande actuelle ?`,
          choices: [
            '📦 Finaliser ma commande',
            '💬 Nous contacter',
            '🌐 Voir tous nos jeux'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'finalize_order' as ConversationStep,
            externalUrl: {
              type: 'other',
              url: '/nos-jeux',
              description: 'Voir tous nos jeux'
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      const productDescriptions = products.map(p => {
        const shortDesc = p.description ? 
          (p.description.length > 80 ? `${p.description.substring(0, 80)}...` : p.description) : 
          'Découvrez ce jeu pour renforcer vos relations';
        
        return `📦 **${p.name}**\n💰 ${p.price.toLocaleString()} FCFA\n📝 ${shortDesc}`;
      }).join('\n\n');

      return {
        type: 'assistant',
        content: `🛍️ **Ajoutez d'autres jeux à votre commande :**

${productDescriptions}

Quel jeu souhaitez-vous ajouter ?`,
        choices: [
          ...products.slice(0, 3).map(p => `➕ ${p.name}`),
          '📦 Finaliser sans ajouter'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'add_product_to_order' as ConversationStep,
          availableProducts: products,
          flags: { addingProducts: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleAdditionalProducts:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la récupération des produits');
    }
  }

  // ==========================================
  // ✅ FLOW EXPRESS OPTIMISÉ AVEC QUANTITÉ
  // ==========================================

  async startExpressPurchase(sessionId: string, productId: string): Promise<ChatMessage> {
    console.log('🚀 Starting express purchase with quantity selection:', { sessionId, productId });

    try {
      // Validation du produit avec informations complètes
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, status')
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (productError || !product) {
        console.error('❌ Product not found or inactive:', productError);
        return {
          type: 'assistant',
          content: `😔 **Désolée !** 
          
Ce produit n'est pas disponible actuellement.

Voulez-vous voir nos autres jeux disponibles ?`,
          choices: ['🛍️ Voir autres produits', '📞 Contacter le support'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'product_unavailable' as ConversationStep,
            flags: { productUnavailable: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Vérifier le stock
      if (product.stock_quantity <= 0) {
        return {
          type: 'assistant',
          content: `😔 **${product.name} temporairement en rupture** 
          
Ce jeu rencontre un grand succès ! Nous reconstituons notre stock.

📧 **Voulez-vous être notifié(e) dès qu'il sera disponible ?**`,
          choices: [
            '📧 Me notifier quand disponible', 
            '🛍️ Voir autres jeux', 
            '📞 Contacter le support'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'out_of_stock' as ConversationStep,
            productId,
            flags: { outOfStock: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Créer l'état de commande express
      const orderState: OrderState = {
        step: 'quantity',
        mode: 'express',
        data: { 
          quantity: 1,
          productId: product.id,
          storeId: 'a9563f88-217c-4998-b080-ed39f637ea31'
        },
        flags: {
          customerExists: false,
          addressValidated: false,
          paymentInitiated: false,
          allowAddressChange: false
        },
        metadata: {
          maxQuantity: Math.min(product.stock_quantity, 10)
        }
      };

      this.orderStates.set(sessionId, orderState);
      await this.saveSessionToDatabase(sessionId, orderState, product.id, orderState.data.storeId!);

      return {
        type: 'assistant',
        content: `⚡ **Commande Express Activée** ⚡

Jeu : **${product.name}**
Prix : **${product.price.toLocaleString()} FCFA** l'unité
Livraison : **incluse selon votre adresse**

**Combien d'exemplaires souhaitez-vous commander ?**`,
        choices: [
          '1 exemplaire',
          '2 exemplaires', 
          '3 exemplaires',
          'Autre quantité'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_quantity' as ConversationStep,
          productId: product.id,
          maxQuantity: Math.min(product.stock_quantity, 10),
          flags: { 
            expressMode: true,
            quantitySelection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in startExpressPurchase:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du démarrage de la commande express');
    }
  }

  async handleExpressStep(
    sessionId: string,
    input: string,
    currentStep: string
  ): Promise<ChatMessage> {
    console.log('🔄 Processing express step:', { sessionId, input, currentStep });

    try {
      const orderState = this.orderStates.get(sessionId);
      if (!orderState) {
        const recoveredState = await this.recoverSessionFromDatabase(sessionId);
        if (!recoveredState) {
          throw new Error('Session state not found and could not be recovered');
        }
        this.orderStates.set(sessionId, recoveredState);
        return this.processStepWithState(sessionId, input, recoveredState);
      }

      // Gestion spéciale pour la sélection de quantité
      if (currentStep === 'express_quantity' || currentStep === 'express_custom_quantity') {
        return this.handleExpressQuantity(sessionId, input, orderState);
      }

      // Gestion des modifications de quantité
      if (this.isQuantityModificationRequest(input)) {
        return this.handleQuantityModification(sessionId, input, orderState);
      }

      return this.processStepWithState(sessionId, input, orderState);

    } catch (error) {
      console.error('❌ Error in handleExpressStep:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre demande');
    }
  }

  private isQuantityModificationRequest(input: string): boolean {
    const modificationKeywords = [
      'modifier', 'changer', 'finalement', 'plutôt', 'en fait',
      'exemplaire', 'quantité', 'nombre'
    ];

    const hasModificationKeyword = modificationKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );

    const hasQuantityNumber = /\d+/.test(input);

    return hasModificationKeyword && hasQuantityNumber;
  }

  private async handleQuantityModification(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('🔢 Handling quantity modification:', { sessionId, input });

    try {
      const numberMatch = input.match(/(\d+)/);
      if (!numberMatch) {
        return {
          type: 'assistant',
          content: `❓ **Je n'ai pas bien compris la quantité souhaitée.**

Pouvez-vous préciser combien d'exemplaires vous voulez ?

Exemple : "Je veux 2 exemplaires" ou "Finalement 3"`,
          choices: [
            '1 exemplaire',
            '2 exemplaires',
            '3 exemplaires',
            'Autre quantité'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_quantity' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      const newQuantity = parseInt(numberMatch[1]);
      const maxQuantity = orderState.metadata?.maxQuantity || 10;

      if (newQuantity < 1 || newQuantity > maxQuantity) {
        return {
          type: 'assistant',
          content: `❌ **Quantité invalide**

Veuillez choisir entre 1 et ${maxQuantity} exemplaires.`,
          choices: [
            '1 exemplaire',
            '2 exemplaires',
            '3 exemplaires',
            'Autre quantité'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_quantity' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      const oldQuantity = orderState.data.quantity;
      orderState.data.quantity = newQuantity;
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', orderState.data.productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Erreur lors de la récupération du produit');
      }

      const newTotal = product.price * newQuantity;

      return {
        type: 'assistant',
        content: `✅ **Quantité modifiée avec succès !**

🔄 **Changement :**
• Avant : ${oldQuantity} exemplaire${oldQuantity > 1 ? 's' : ''}
• Maintenant : ${newQuantity} exemplaire${newQuantity > 1 ? 's' : ''}

💰 **Nouveau total :** ${newTotal.toLocaleString()} FCFA

Voulez-vous continuer avec cette quantité ?`,
        choices: [
          '✅ Continuer la commande',
          '🔢 Modifier encore',
          '❌ Annuler'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'quantity_confirmed' as ConversationStep,
          orderData: {
            quantity: newQuantity,
            totalAmount: newTotal
          },
          flags: { 
            expressMode: true,
            quantityModified: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleQuantityModification:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la modification de quantité');
    }
  }

  private async processStepWithState(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    switch (orderState.step) {
      case 'quantity':
        return await this.handleExpressQuantity(sessionId, input, orderState);
        
      case 'contact':
        return await this.handleExpressContact(sessionId, input, orderState);
      
      case 'name':
        return await this.handleExpressName(sessionId, input, orderState);
      
      case 'address':
        return await this.handleExpressAddress(sessionId, input, orderState);
      
      case 'payment':
        return await this.handleExpressPayment(sessionId, input, orderState);
      
      case 'confirmation':
        return await this.handleExpressConfirmation(sessionId, input, orderState);
      
      default:
        console.error(`❌ Invalid express step: ${orderState.step}`);
        return this.createErrorMessage(sessionId, `Étape invalide: ${orderState.step}`);
    }
  }

  // ✅ GESTION DE LA QUANTITÉ
  private async handleExpressQuantity(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('🔢 Processing express quantity selection:', { sessionId, input });

    try {
      let quantity = 1;

      // Parser la quantité depuis l'input
      if (input.includes('1 exemplaire')) {
        quantity = 1;
      } else if (input.includes('2 exemplaires')) {
        quantity = 2;
      } else if (input.includes('3 exemplaires')) {
        quantity = 3;
      } else if (input.includes('Autre quantité')) {
        return {
          type: 'assistant',
          content: `🔢 **Quelle quantité souhaitez-vous ?**

Veuillez indiquer le nombre d'exemplaires (entre 1 et ${orderState.metadata?.maxQuantity || 10}) :

Exemple : "5" ou "5 exemplaires"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_custom_quantity' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      } else if (input.includes('Continuer la commande')) {
        orderState.step = 'contact';
        this.orderStates.set(sessionId, orderState);
        await this.updateSessionInDatabase(sessionId, orderState);

        const { data: product } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('id', orderState.data.productId)
          .single();

        if (!product) {
          return this.createErrorMessage(sessionId, 'Erreur lors de la récupération du produit');
        }

        const totalAmount = product.price * orderState.data.quantity;

        return {
          type: 'assistant',
          content: `✅ C'est noté ! Vous commandez **${orderState.data.quantity} exemplaire${orderState.data.quantity > 1 ? 's' : ''}**

Jeu : **${product.name}**
Prix total : **${totalAmount.toLocaleString()} FCFA** (${orderState.data.quantity} × ${product.price.toLocaleString()} FCFA)

Sur quel numéro vous joindre pour la livraison ?`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_contact' as ConversationStep,
            orderData: { 
              session_id: sessionId,
              product_id: product.id,
              quantity: orderState.data.quantity,
              subtotal: product.price * orderState.data.quantity,
              total_amount: totalAmount,
              items: [{
                productId: product.id,
                name: product.name,
                quantity: orderState.data.quantity,
                price: product.price,
                totalPrice: product.price * orderState.data.quantity
              }]
            },
            flags: { 
              expressMode: true,
              quantitySelected: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        const numberMatch = input.match(/(\d+)/);
        if (numberMatch) {
          quantity = parseInt(numberMatch[1]);
        }
      }

      // Validation de la quantité
      if (quantity < 1 || quantity > (orderState.metadata?.maxQuantity || 10)) {
        return {
          type: 'assistant',
          content: `❌ **Quantité invalide**

Veuillez choisir entre 1 et ${orderState.metadata?.maxQuantity || 10} exemplaires :`,
          choices: [
            '1 exemplaire',
            '2 exemplaires', 
            '3 exemplaires',
            '🔢 Autre quantité'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_quantity' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Mettre à jour la quantité et passer à l'étape contact
      orderState.data.quantity = quantity;
      orderState.step = 'contact';
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', orderState.data.productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Erreur lors de la récupération du produit');
      }

      const itemPrice = product.price;
      const subtotal = itemPrice * quantity;
      const deliveryCost = 0;
      const totalAmount = subtotal + deliveryCost;

      return {
        type: 'assistant',
        content: `✅ C'est noté ! Vous commandez **${quantity} exemplaire${quantity > 1 ? 's' : ''}**

Jeu : **${product.name}**
Prix total : **${totalAmount.toLocaleString()} FCFA** (${quantity} × ${itemPrice.toLocaleString()} FCFA)

Sur quel numéro vous joindre pour la livraison ?`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_contact' as ConversationStep,
          orderData: { 
            session_id: sessionId,
            product_id: product.id,
            quantity: quantity,
            subtotal: subtotal,
            total_amount: totalAmount,
            items: [{
              productId: product.id,
              name: product.name,
              quantity: quantity,
              price: itemPrice,
              totalPrice: subtotal
            }]
          },
          flags: { 
            expressMode: true,
            quantitySelected: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleExpressQuantity:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la sélection de quantité');
    }
  }

  // ✅ GESTION DU CONTACT (validation téléphone)
  private async handleExpressContact(
    sessionId: string,
    phone: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('📱 Processing contact step with customer recognition:', { sessionId, phone });

    try {
      const validation = this.phoneService.validatePhoneNumber(phone);
      
      if (!validation.isValid) {
        return {
          type: 'assistant',
          content: `❌ **Numéro invalide**

${validation.error}

💡 **Exemples de formats acceptés :**
• Sénégal : 77 123 45 67 ou +221 77 123 45 67
• Côte d'Ivoire : +225 07 12 34 56
• France : +33 6 12 34 56 78
• International : +XXX XXXXXXXXX

Veuillez réessayer :`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: { 
            nextStep: 'express_contact' as ConversationStep,
            flags: { 
              expressMode: true,
              phoneValidationError: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      const formattedPhone = this.phoneService.formatPhoneWithCountry(phone);
      
      if (!formattedPhone.isValid) {
        return {
          type: 'assistant',
          content: `⚠️ **Numéro non reconnu**

Le format de votre numéro n'a pas été reconnu automatiquement.

Pouvez-vous le saisir au format international ?
Exemple : +221 77 123 45 67`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: { 
            nextStep: 'express_contact' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Vérifier client existant
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formattedPhone.international)
        .single();

      console.log('🔍 Customer lookup result:', { 
        found: !!existingCustomer, 
        error: customerError,
        phone: formattedPhone.international 
      });

      orderState.data.phone = formattedPhone.international;
      
      if (existingCustomer && !customerError) {
        // Client existant
        const fullName = `${existingCustomer.first_name || ''} ${existingCustomer.last_name || ''}`.trim();
        
        orderState.data.name = fullName || 'Client';
        orderState.data.address = existingCustomer.address || '';
        orderState.data.city = existingCustomer.city || '';
        orderState.flags.customerExists = true;
        orderState.flags.allowAddressChange = true;
        orderState.step = 'address';

        this.orderStates.set(sessionId, orderState);
        await this.updateSessionInDatabase(sessionId, orderState);

        const countryFlag = formattedPhone.country ? this.getCountryFlag(formattedPhone.country) : '📱';

        return {
          type: 'assistant',
          content: `👋 Heureuse de vous revoir, **${existingCustomer.first_name || 'cher client'} !**

${countryFlag} Numéro confirmé : **${formattedPhone.formatted}**

📍 Votre adresse enregistrée :
**${existingCustomer.address || 'Adresse non renseignée'}, ${existingCustomer.city || 'Ville non renseignée'}**

Voulez-vous utiliser la même adresse ou la changer ?`,
          choices: [
            '✅ Garder cette adresse', 
            '📍 Changer d\'adresse'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { 
              expressMode: true, 
              customerExists: true,
              phoneValidated: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Nouveau client
        orderState.step = 'name';
        orderState.flags.customerExists = false;
        this.orderStates.set(sessionId, orderState);
        await this.updateSessionInDatabase(sessionId, orderState);

        const countryFlag = formattedPhone.country ? this.getCountryFlag(formattedPhone.country) : '📱';

        return {
          type: 'assistant',
          content: `${countryFlag} **Numéro confirmé :** ${formattedPhone.formatted}

👤 **Comment vous appelez-vous ?**
*Prénom et nom*

Exemple : "Aminata Diop", "Benoit Nguessan", "Marie Dupont"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_name' as ConversationStep,
            flags: { 
              expressMode: true,
              phoneValidated: true,
              newCustomer: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Error in handleExpressContact:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation du numéro');
    }
  }

  // ✅ GESTION DU NOM
  private async handleExpressName(
    sessionId: string,
    name: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('👤 Processing name step:', { sessionId, name });

    try {
      const trimmedName = name.trim();
      const nameParts = trimmedName.split(' ');
      
      if (trimmedName.length < 3) {
        return {
          type: 'assistant',
          content: `❌ Nom trop court. Donnez-moi votre nom complet :

Exemple : "Aminata Diop"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_name' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }
      
      if (nameParts.length < 2) {
        return {
          type: 'assistant',
          content: `❌ J'ai besoin de votre prénom ET nom :

Exemple : "Aminata Diop"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_name' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      orderState.data.name = trimmedName;
      orderState.step = 'address';
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👋 Enchantée, **${nameParts[0]}** !

📍 A quelle adresse livrer votre commande ?
*Format : Adresse, Ville*

Exemple : "Ouest-Foire - Tally Wally, Dakar"`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_address' as ConversationStep,
          flags: { expressMode: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleExpressName:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation du nom');
    }
  }

  // ✅ GESTION DE L'ADRESSE
  private async handleExpressAddress(
    sessionId: string,
    addressOrChoice: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('📍 Processing address step:', { sessionId, addressOrChoice });

    try {
      // Gérer les choix pour clients existants
      if (addressOrChoice.includes('Garder cette adresse')) {
        orderState.step = 'payment';
        orderState.flags.addressValidated = true;
        this.orderStates.set(sessionId, orderState);
        await this.updateSessionInDatabase(sessionId, orderState);

        const deliveryCost = await this.calculateDeliveryCost(orderState.data.city || '');

        return {
          type: 'assistant',
          content: `📍 Adresse enregistrée ✅
Nous vous livrerons à **${orderState.data.address}, ${orderState.data.city}**

🛵 Frais de livraison : **${deliveryCost.toLocaleString()} FCFA**

💳 Comment souhaitez-vous payer ?`,
          choices: [
            'Payer avec Wave',
            '💳 Payer par Carte bancaire', 
            '🛵 Payer à la livraison'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_payment' as ConversationStep,
            orderData: { delivery_cost: deliveryCost },
            flags: { expressMode: true, addressValidated: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      if (addressOrChoice.includes('Changer d\'adresse')) {
        return {
          type: 'assistant',
          content: `📍 **Nouvelle adresse de livraison**
*Format : Adresse, Ville*

Exemple : "Ouest-Foire - Tally Wally, Dakar"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Traitement d'une nouvelle adresse
      const address = addressOrChoice;

      if (address.length < 10) {
        return {
          type: 'assistant',
          content: `❌ Adresse trop courte. Soyez plus précis :

Exemple : "Ouest-Foire - Tally Wally, Dakar"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Parser l'adresse (format : "adresse, ville")
      const parts = address.split(',').map(part => part.trim());
      if (parts.length < 2) {
        return {
          type: 'assistant',
          content: `❌ Format incorrect. Utilisez : **Adresse, Ville**

Exemple : "Ouest-Foire - Tally Wally, Dakar"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      orderState.data.address = parts[0];
      orderState.data.city = parts[1];
      orderState.step = 'payment';
      orderState.flags.addressValidated = true;
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      const deliveryCost = await this.calculateDeliveryCost(parts[1]);

      return {
        type: 'assistant',
        content: `📍 **Adresse enregistrée** ✅
${parts[0]}, ${parts[1]}

🛵 Frais de livraison : ${deliveryCost.toLocaleString()} FCFA

💳 Comment souhaitez-vous payer ?`,
        choices: [
          'Payer avec Wave',
          '💳 Payer par Carte bancaire', 
          '🛵 Payer à la livraison'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          orderData: { delivery_cost: deliveryCost },
          flags: { expressMode: true, addressValidated: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleExpressAddress:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation de l\'adresse');
    }
  }

  // ✅ GESTION DU PAIEMENT
  private async handleExpressPayment(
    sessionId: string,
    paymentChoice: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('💳 Processing payment step:', { sessionId, paymentChoice });

    try {
      const paymentMethod = this.mapPaymentChoice(paymentChoice);
      
      orderState.data.paymentMethod = paymentMethod;
      orderState.step = 'confirmation';
      orderState.flags.paymentInitiated = true;
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      const orderId = await this.createExpressOrder(sessionId, orderState);
      
      if (paymentMethod === 'CASH') {
        return {
          type: 'assistant',
          content: `🎉 **Votre commande est confirmée !** 🎉

📋 **Commande N° : ${orderId}**
👤 **Client : ${orderState.data.name}**
📍 Adresse de livraison : ${orderState.data.address}, ${orderState.data.city}
💰 Mode de paiement : à la livraison

✅ Notre équipe vous contactera sous peu pour confirmer la livraison.

🙏 Merci pour votre confiance !`,
          choices: ['🔍 Suivre ma commande', '💬 Nous contacter', '🛍️ Voir les autres jeux'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'order_complete' as ConversationStep,
            orderId,
            flags: { orderCompleted: true }
          },
          timestamp: new Date().toISOString()
        };
      } else if (paymentMethod === 'WAVE') {
        const orderTotal = await this.calculateOrderTotal(orderState);
        
        return {
          type: 'assistant',
          content: `💰 **Paiement par Wave**

📋 Commande : **${orderId}**
👤 Client : **${orderState.data.name}**
💰 Montant : **${orderTotal.toLocaleString()} FCFA**

🔗 **Étapes :**
1. Cliquez sur le bouton Wave ci-dessous
2. Effectuez le paiement
3. Copiez l'ID de transaction
4. Revenez ici pour confirmer votre paiement

👇🏽 Cliquez pour payer avec Wave :`,
          choices: [
            `Payer ${orderTotal.toLocaleString()} FCFA avec Wave`
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'wave_payment_process' as ConversationStep,
            paymentUrl: `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${orderTotal}`,
            orderId,
            paymentAmount: orderTotal,
            paymentMethod: 'Wave',
            flags: { 
              expressMode: true, 
              paymentInitiated: true,
              wavePayment: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        const orderTotalFCFA = await this.calculateOrderTotal(orderState);
        
        return {
          type: 'assistant',
          content: `💳 **Finaliser le paiement**

📋 Commande : **${orderId}**
👤 Client : **${orderState.data.name}**
💰 Montant : **${orderTotalFCFA.toLocaleString()} FCFA**

👇🏽 Le paiement va s'ouvrir dans une nouvelle fenêtre :`,
          choices: [`💳 Payer par ${this.getPaymentDisplayName(paymentMethod)}`],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            orderId,
            paymentAmount: orderTotalFCFA,
            paymentMethod: this.getPaymentDisplayName(paymentMethod),
            customerName: orderState.data.name,
            flags: { expressMode: true, paymentInitiated: true }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Express order creation error:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la création de votre commande');
    }
  }

  // ✅ GESTION DE LA CONFIRMATION
  private async handleExpressConfirmation(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('✅ Processing confirmation step:', { sessionId, input });

    try {
      if (input.includes('Suivre ma commande') || input.includes('🔍')) {
        return await this.orderTrackingService.createTrackingMessage(sessionId);
      }

      if (input.includes('Autres produits') || input.includes('🛍️')) {
        return this.handleAdditionalProducts(sessionId, orderState);
      }

      if (input.includes('Nous contacter') || input.includes('📞')) {
        return {
          type: 'assistant',
          content: `💬 **Contactez notre équipe !**

🤝 **Notre support client est là pour vous :**

📱 **WhatsApp :** +221 78 136 27 28
📧 **Email :** contact@viensonseconnait.com
🕒 **Horaires :** Lun-Ven 9h-18h, Sam 9h-14h

💬 **Ou continuez ici :**
Je peux répondre à toutes vos questions sur nos jeux, votre commande, et autres.

Comment puis-je vous aider ?`,
          choices: [
            '💬 Parler à quelqu\'un',
            '❓ Poser une question',
            '🔙 Retour au menu'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'customer_service' as ConversationStep,
            externalUrl: {
              type: 'whatsapp',
              url: 'https://wa.me/221781362728',
              description: 'Contacter sur WhatsApp'
            },
            flags: { 
              contactMode: true,
              freeTextEnabled: true 
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Gestion Wave Transaction ID
      if (this.isWaveTransactionId(input)) {
        return this.handleWavePaymentValidation(sessionId, input, orderState);
      }

      return {
        type: 'assistant',
        content: `✅ **Votre commande est confirmée !** 🎉

Merci pour votre achat ! Voulez-vous :

🛍️ **Ajouter d'autres jeux** à votre commande ?
📦 **Finaliser** et recevoir la confirmation ?

Que préférez-vous ?`,
        choices: [
          '🛍️ Ajouter d\'autres jeux',
          '📦 Finaliser ma commande',
          '📞 Nous contacter'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'post_purchase_options' as ConversationStep,
          flags: { orderCompleted: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleExpressConfirmation:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la confirmation');
    }
  }

  // ==========================================
  // ✅ MÉTHODES UTILITAIRES
  // ==========================================

  private isWaveTransactionId(input: string): boolean {
    const waveIdPattern = /^T[A-Z0-9]{12,16}$/i;
    return waveIdPattern.test(input.trim().toUpperCase());
  }

  private async handleWavePaymentValidation(
    sessionId: string,
    transactionId: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('🌊 Processing Wave payment validation:', { sessionId, transactionId });

    try {
      const cleanTransactionId = transactionId.trim().toUpperCase();
      
      try {
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'completed',
            transaction_id: cleanTransactionId,
            metadata: {
              ...orderState.data,
              waveTransactionId: cleanTransactionId,
              paymentValidatedAt: new Date().toISOString()
            }
          })
          .eq('session_id', sessionId);

        if (error) {
          console.error('❌ Error updating order with transaction ID:', error);
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }

      return {
        type: 'assistant',
        content: `🎉 **Paiement confirmé !** 🎉

📋 **Commande finalisée**
🆔 **Transaction :** ${cleanTransactionId}
👤 **Client :** ${orderState.data.name}
📍 **Livraison :** ${orderState.data.address}, ${orderState.data.city}

✅ **Votre commande est confirmée !**
📞 Notre équipe vous contactera pour confirmer la livraison.

🙏 **Merci pour votre confiance !**`,
        choices: [
          '🔍 Suivre ma commande',
          '💬 Nous contacter',
          '🛍️ Commander d\'autres jeux'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'order_complete' as ConversationStep,
          orderId: orderState.data.productId,
          transactionId: cleanTransactionId,
          flags: { 
            orderCompleted: true,
            paymentValidated: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleWavePaymentValidation:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation du paiement');
    }
  }

  private async createExpressOrder(
    sessionId: string,
    orderState: OrderState
  ): Promise<string> {
    console.log('🛒 Creating express order:', { sessionId, orderState });

    try {
      const productId = orderState.data.productId;
      if (!productId) {
        throw new Error('Product ID not found in order state');
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ Product not found during order creation:', productError);
        throw new Error(`Product ${productId} not found`);
      }

      const deliveryCost = await this.calculateDeliveryCost(orderState.data.city || '');
      const subtotal = product.price * orderState.data.quantity;
      const total = subtotal + deliveryCost;

      const numericOrderId = Math.floor(Date.now() / 1000);

      const firstName = this.extractFirstName(orderState.data.name);
      const lastName = this.extractLastName(orderState.data.name);

      const orderData = {
        id: numericOrderId,
        session_id: sessionId,
        product_id: productId,
        first_name: firstName,
        last_name: lastName,
        phone: orderState.data.phone,
        city: orderState.data.city,
        address: orderState.data.address,
        payment_method: orderState.data.paymentMethod,
        total_amount: total,
        delivery_cost: deliveryCost,
        status: orderState.data.paymentMethod === 'CASH' ? 'confirmed' : 'pending',
        payment_status: 'pending',
        order_details: JSON.stringify([{
          productId: product.id,
          name: product.name,
          quantity: orderState.data.quantity,
          price: product.price,
          totalPrice: subtotal
        }]),
        metadata: {
          source: 'chatbot',
          mode: 'express',
          storeId: orderState.data.storeId,
          createdAt: new Date().toISOString()
        }
      };

      console.log('📋 Order data prepared:', orderData);

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting order:', insertError);
        throw new Error(`Failed to create order: ${insertError.message}`);
      }

      console.log('✅ Order created successfully:', insertedOrder.id);

      // Sauvegarder le client
      try {
        const customerData = {
          first_name: firstName,
          last_name: lastName,
          phone: orderState.data.phone,
          city: orderState.data.city,
          address: orderState.data.address,
          email: '',
          updated_at: new Date().toISOString()
        };

        if (orderState.flags.customerExists) {
          await supabase
            .from('customers')
            .update(customerData)
            .eq('phone', orderState.data.phone);
          console.log('✅ Customer updated in database');
        } else {
          await supabase
            .from('customers')
            .insert({
              ...customerData,
              created_at: new Date().toISOString()
            });
          console.log('✅ New customer saved to database');
        }
      } catch (customerError) {
        console.error('⚠️ Error saving customer (non-blocking):', customerError);
      }

      await this.decrementProductStock(productId, orderState.data.quantity);

      return insertedOrder.id.toString();

    } catch (error) {
      console.error('❌ Error in createExpressOrder:', error);
      throw error;
    }
  }

  // ✅ MÉTHODES DE CALCUL ET UTILITAIRES
  private async calculateDeliveryCost(city: string): Promise<number> {
    try {
      console.log('🚚 Calculating delivery cost for city:', city);
      
      const normalizedCity = city.toLowerCase().trim();
      
      const { data: zones, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('cost', { ascending: true });

      if (error) {
        console.error('❌ Error fetching delivery zones:', error);
        return this.getFallbackDeliveryCost(normalizedCity);
      }

      if (!zones || zones.length === 0) {
        console.log('⚠️ No delivery zones found, using fallback');
        return this.getFallbackDeliveryCost(normalizedCity);
      }

      for (const zone of zones) {
        if (zone.cities && Array.isArray(zone.cities)) {
          const cityMatch = zone.cities.some((zoneCity: string) => 
            normalizedCity.includes(zoneCity.toLowerCase()) ||
            zoneCity.toLowerCase().includes(normalizedCity)
          );
          
          if (cityMatch) {
            console.log(`✅ Found matching zone: ${zone.name} - Cost: ${zone.cost} FCFA`);
            return zone.cost;
          }
        }
      }

      const maxCost = Math.max(...zones.map(z => z.cost));
      console.log(`⚠️ No matching zone found for ${city}, using max cost: ${maxCost} FCFA`);
      return maxCost;

    } catch (error) {
      console.error('❌ Error in calculateDeliveryCost:', error);
      return this.getFallbackDeliveryCost(city.toLowerCase());
    }
  }

  private getFallbackDeliveryCost(normalizedCity: string): number {
    if (normalizedCity.includes('dakar')) return 0;
    if (normalizedCity.includes('abidjan')) return 2500;
    
    const senegalCities = ['thiès', 'saint-louis', 'kaolack', 'ziguinchor', 'touba', 'mbour', 'pikine', 'guédiawaye'];
    if (senegalCities.some(city => normalizedCity.includes(city))) {
      return 3000;
    }
    
    return 2500;
  }

  private async calculateOrderTotal(orderState: OrderState): Promise<number> {
    try {
      const productId = orderState.data.productId;
      if (!productId) return 0;

      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (!product) return 0;

      const subtotal = product.price * orderState.data.quantity;
      const deliveryCost = await this.calculateDeliveryCost(orderState.data.city || '');
      
      return subtotal + deliveryCost;
    } catch (error) {
      console.error('❌ Error calculating order total:', error);
      return 0;
    }
  }

  private mapPaymentChoice(choice: string): PaymentProvider {
    const normalized = choice.toLowerCase();
    
    if (normalized.includes('wave') || normalized.includes('🌊')) {
      return 'WAVE';
    }
    
    if (normalized.includes('carte') || normalized.includes('bancaire')) {
      return 'STRIPE';
    }
    
    if (normalized.includes('livraison') || normalized.includes('🛵')) {
      return 'CASH';
    }
    
    return 'WAVE';
  }

  private getPaymentDisplayName(provider: PaymentProvider): string {
    const names: Record<PaymentProvider, string> = {
      'WAVE': 'Wave',
      'STRIPE': 'Carte bancaire',
      'CASH': 'Paiement à la livraison',
      'ORANGE_MONEY': 'Orange Money' 
    };
    
    return names[provider] || 'Paiement';
  }

  private async decrementProductStock(productId: string, quantity: number): Promise<void> {
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching product stock:', fetchError);
        return;
      }

      const newStock = Math.max(0, (product.stock_quantity || 0) - quantity);

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        console.error('❌ Error updating product stock:', updateError);
      } else {
        console.log(`✅ Stock updated for product ${productId}: ${product.stock_quantity} -> ${newStock}`);
      }
    } catch (error) {
      console.error('❌ Error in decrementProductStock:', error);
    }
  }

  private extractFirstName(fullName?: string): string {
    if (!fullName) return 'Client';
    const parts = fullName.trim().split(' ');
    return parts[0] || 'Client';
  }

  private extractLastName(fullName?: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts.slice(1).join(' ') || '';
  }

  private getCountryFlag(countryCode: string): string {
    const flags: Record<string, string> = {
      'SN': '🇸🇳',
      'CI': '🇨🇮', 
      'BJ': '🇧🇯',
      'BF': '🇧🇫',
      'ML': '🇲🇱',
      'NE': '🇳🇪',
      'TG': '🇹🇬',
      'CM': '🇨🇲',
      'GA': '🇬🇦',
      'FR': '🇫🇷',
      'MA': '🇲🇦',
      'DZ': '🇩🇿',
      'TN': '🇹🇳'
    };
    
    return flags[countryCode] || '📱';
  }

  private createErrorMessage(sessionId: string, errorMessage: string): ChatMessage {
    return {
      type: 'assistant',
      content: `❌ **Erreur temporaire**

${errorMessage}

🔄 Voulez-vous réessayer ?`,
      choices: ['🔄 Réessayer', '📞 Contacter le support'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_error' as ConversationStep,
        flags: { expressMode: true, hasError: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private getBotInfo() {
    return {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };
  }

  // ✅ MÉTHODES DE GESTION DES DONNÉES
  private async saveSessionToDatabase(
    sessionId: string, 
    orderState: OrderState, 
    productId: string, 
    storeId: string
  ): Promise<void> {
    try {
      const sessionData = {
        id: sessionId,
        product_id: productId,
        store_id: storeId,
        session_data: orderState,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };

      const { error } = await supabase
        .from('conversations')
        .upsert(sessionData, { onConflict: 'id' });

      if (error) {
        console.error('❌ Error saving session to database:', error);
      } else {
        console.log('✅ Session saved to database:', sessionId);
      }
    } catch (error) {
      console.error('❌ Error in saveSessionToDatabase:', error);
    }
  }

  private async updateSessionInDatabase(sessionId: string, orderState: OrderState): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          session_data: orderState,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error updating session in database:', error);
      }
    } catch (error) {
      console.error('❌ Error in updateSessionInDatabase:', error);
    }
  }

  private async recoverSessionFromDatabase(sessionId: string): Promise<OrderState | undefined> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !conversation) {
        console.error('❌ Could not recover session from database:', error);
        return undefined;
      }

      console.log('✅ Session recovered from database:', sessionId);
      return conversation.session_data as OrderState;
    } catch (error) {
      console.error('❌ Error in recoverSessionFromDatabase:', error);
      return undefined;
    }
  }

  // ✅ MÉTHODE POUR VIDER LA COMMANDE
  async clearCart(sessionId: string): Promise<ChatMessage> {
    console.log('🗑️ Clearing cart for session:', sessionId);

    try {
      this.orderStates.delete(sessionId);

      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'cleared',
          session_data: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error clearing cart in database:', error);
      }

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
        assistant: this.getBotInfo(),
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
      return this.createErrorMessage(sessionId, 'Erreur lors de la suppression de la commande');
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gérer les boutons qui ne doivent PAS passer par l'IA
  async handlePredefinedChoice(
    sessionId: string,
    choice: string,
    productId: string
  ): Promise<ChatMessage> {
    console.log('🔘 Processing predefined choice:', { choice, productId });

    try {
      // Récupérer les infos produit
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Produit non trouvé');
      }

      // Router selon le choix
      if (choice.includes('Commander rapidement') || choice.includes('⚡')) {
        return this.startExpressPurchase(sessionId, productId);
      }

      // Autres choix traités par l'IA avec contexte
      const aiContext = {
        productId: product.id,
        productName: product.name,
        sessionId,
        isExpressMode: false,
        userMessage: choice,
        conversationHistory: []
      };

      return this.aiResponseHandler.handleFreeTextMessage(aiContext);

    } catch (error) {
      console.error('❌ Error handling predefined choice:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement du choix');
    }
  }
}