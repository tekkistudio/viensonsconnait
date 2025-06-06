// src/lib/services/OptimizedChatService.ts - VERSION FINALE COMPLÈTE CORRIGÉE
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';
import { OrderService } from './OrderService';
import { AIResponseHandler } from './AIResponseHandler';
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

  private constructor() {}

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ==========================================
  // ✅ NOUVELLE SECTION: GESTION DES MESSAGES LIBRES IA
  // ==========================================

/**
 * ✅ MÉTHODE CORRIGÉE: Traiter les messages libres avec gestion TypeScript correcte
 */
async processUserInput(
  sessionId: string,
  message: string,
  currentStep?: ConversationStep
): Promise<ChatMessage> {
  console.log('🤖 Processing user input with improved session handling:', { sessionId, message, currentStep });

  try {
    // ✅ CORRECTION 1: Vérifier et initialiser la session si nécessaire
    if (!sessionId || sessionId.length < 5) {
      console.error('❌ Invalid sessionId provided:', sessionId);
      return this.createErrorMessage('', 'Session invalide. Veuillez rafraîchir la page.');
    }

    // ✅ CORRECTION 2: Récupérer ou créer l'état de commande avec type correct
    let orderState: OrderState | undefined = this.orderStates.get(sessionId);
    
    if (!orderState) {
      console.log('🔄 Order state not found, attempting to recover or create new one');
      
      // Essayer de récupérer depuis la base de données
      const recoveredState = await this.recoverSessionFromDatabase(sessionId);
      
      if (recoveredState) {
        orderState = recoveredState;
        this.orderStates.set(sessionId, orderState);
      } else {
        // Créer un nouvel état par défaut
        console.log('📝 Creating new order state for session:', sessionId);
        orderState = {
          step: 'quantity' as PurchaseStep,
          mode: 'conversational',
          data: {
            quantity: 1,
            storeId: 'a9563f88-217c-4998-b080-ed39f637ea31'
          },
          flags: {
            customerExists: false,
            addressValidated: false,
            paymentInitiated: false
          }
        };
        
        this.orderStates.set(sessionId, orderState);
      }
    }

    // ✅ CORRECTION 3: Vérifier si c'est un message pour le flow express
    if (currentStep?.includes('express')) {
      return this.handleExpressStep(sessionId, message, currentStep);
    }

    // ✅ CORRECTION 4: Vérifier si c'est un bouton d'action post-achat
    const postPurchaseActions = [
      'Suivre ma commande', 'Nous contacter', 'Autres produits',
      'WhatsApp', 'Contacter le support', 'Voir ma commande',
      'Changer d\'adresse', 'Autre question', '❓', '🔍'
    ];
    
    if (postPurchaseActions.some(action => message.includes(action))) {
      return this.handlePostPurchaseActions(sessionId, message);
    }

    // ✅ CORRECTION 5: Récupérer le productId depuis l'état ou deviner depuis le sessionId
    let productId = orderState.data.productId;
    
    if (!productId) {
      // Essayer d'extraire depuis le sessionId (format: productId_storeId_timestamp_random)
      const sessionParts = sessionId.split('_');
      if (sessionParts.length >= 2) {
        productId = sessionParts[0];
        orderState.data.productId = productId;
        this.orderStates.set(sessionId, orderState);
      }
    }

    if (!productId) {
      console.error('❌ No productId found for session:', sessionId);
      return this.createErrorMessage(sessionId, 'Produit non trouvé. Veuillez rafraîchir la page.');
    }

    // ✅ CORRECTION 6: Récupérer les infos produit depuis la base
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, description')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found for AI context:', productError);
      return this.createErrorMessage(sessionId, `Produit ${productId} non trouvé.`);
    }

    // ✅ CORRECTION 7: Préparer le contexte pour l'IA avec toutes les données nécessaires
    const aiContext = {
      productId: product.id,
      productName: product.name,
      sessionId,
      isExpressMode: orderState?.mode === 'express' || false,
      currentStep,
      userMessage: message,
      conversationHistory: []
    };

    // ✅ CORRECTION 8: Laisser l'IA traiter le message
    const aiResponse = await this.aiResponseHandler.handleFreeTextMessage(aiContext);
    
    console.log('✅ AI response generated successfully:', aiResponse);
    return aiResponse;

  } catch (error) {
    console.error('❌ Error processing user input:', error);
    return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre message. Veuillez réessayer.');
  }
}

  /**
   * ✅ NOUVELLE MÉTHODE: Gérer les actions post-achat avec suivi de commande
   */
  private async handlePostPurchaseActions(sessionId: string, message: string): Promise<ChatMessage> {
    console.log('📦 Handling post-purchase action:', message);

    try {
      // ✅ SUIVI DE COMMANDE - Nouveau système
      if (message.includes('Suivre ma commande') || message.includes('🔍')) {
        return this.handleOrderTracking(sessionId);
      }

      // ✅ AUTRES PRODUITS - Amélioration
      if (message.includes('Autres produits') || message.includes('🛍️')) {
        const orderState = this.orderStates.get(sessionId);
        if (orderState) {
          return this.handleAdditionalProducts(sessionId, orderState);
        }
      }

      // ✅ Déléguer aux autres actions à l'AIResponseHandler
      return this.aiResponseHandler.handlePostPurchaseAction(message);

    } catch (error) {
      console.error('❌ Error handling post-purchase action:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre demande');
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Système de suivi de commande
   */
  private async handleOrderTracking(sessionId: string): Promise<ChatMessage> {
    console.log('🔍 Tracking order for session:', sessionId);

    try {
      // Récupérer la commande la plus récente pour cette session
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !order) {
        return {
          type: 'assistant',
          content: `🔍 **Suivi de commande**

Aucune commande trouvée pour cette session.

📞 **Pour toute question :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

Comment puis-je vous aider autrement ?`,
          choices: [
            '📞 Contacter le support',
            '🛍️ Passer une nouvelle commande',
            '🏠 Page d\'accueil'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'customer_support' as ConversationStep,
            externalUrl: {
              type: 'whatsapp',
              url: 'https://wa.me/221781362728',
              description: 'Contacter le support'
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ Décoder les détails de la commande
      const orderItems = order.order_details ? 
        (typeof order.order_details === 'string' ? 
          JSON.parse(order.order_details) : 
          order.order_details) : [];

      // ✅ Définir les statuts et leurs descriptions
      const statusDescriptions = {
        'pending': {
          emoji: '⏳',
          title: 'En attente',
          description: 'Votre commande est en cours de traitement'
        },
        'confirmed': {
          emoji: '✅',
          title: 'Confirmée',
          description: 'Commande confirmée, préparation en cours'
        },
        'processing': {
          emoji: '📦',
          title: 'En préparation',
          description: 'Votre commande est en cours de préparation'
        },
        'shipped': {
          emoji: '🚚',
          title: 'Expédiée',
          description: 'Votre commande est en route vers vous'
        },
        'delivered': {
          emoji: '🎉',
          title: 'Livrée',
          description: 'Commande livrée avec succès'
        },
        'cancelled': {
          emoji: '❌',
          title: 'Annulée',
          description: 'Commande annulée'
        }
      };

      const currentStatus = statusDescriptions[order.status as keyof typeof statusDescriptions] || 
        statusDescriptions['pending'];

      const paymentStatusText = order.payment_status === 'completed' ? 
        '✅ Paiement confirmé' : 
        order.payment_status === 'pending' ? 
          '⏳ En attente de paiement' : 
          '❌ Problème de paiement';

      return {
        type: 'assistant',
        content: `🔍 **Suivi de votre commande #${order.id}**

${currentStatus.emoji} **Statut : ${currentStatus.title}**
${currentStatus.description}

📋 **Détails :**
• Passée le : ${new Date(order.created_at).toLocaleDateString('fr-FR')}
• Articles : ${orderItems.length > 0 ? orderItems.map((item: any) => `${item.name} x${item.quantity || 1}`).join(', ') : 'Information non disponible'}
• Total : ${order.total_amount?.toLocaleString() || 'N/A'} FCFA
• ${paymentStatusText}

📍 **Livraison :**
${order.address}, ${order.city}

📞 **Questions ? Contactez-nous :**
WhatsApp : +221 78 136 27 28`,
        choices: [
          '📞 WhatsApp (+221 78 136 27 28)',
          '🏠 Changer d\'adresse',
          '🛍️ Commander autre chose',
          '📧 Envoyer par email'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'order_details_shown' as ConversationStep,
          orderId: order.id,
          externalUrl: {
            type: 'whatsapp',
            url: 'https://wa.me/221781362728',
            description: 'Contacter pour suivi'
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error tracking order:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du suivi de commande');
    }
  }

  /**
   * ✅ MÉTHODE POUR GÉRER LES CHOIX PRÉDÉFINIS
   */
  async handlePredefinedChoice(
    sessionId: string,
    choice: string,
    productId: string
  ): Promise<ChatMessage> {
    console.log('🔘 Processing predefined choice:', { choice, productId });

    try {
      // ✅ Récupérer les infos produit
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Produit non trouvé');
      }

      // ✅ Router selon le choix
      if (choice.includes('Commander rapidement') || choice.includes('⚡')) {
        return this.startExpressPurchase(sessionId, productId);
      }

      // ✅ Autres choix traités par l'IA avec contexte
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

  // ==========================================
  // ✅ FLOW EXPRESS OPTIMISÉ AVEC QUANTITÉ
  // ==========================================

  /**
   * ✅ MÉTHODE CORRIGÉE: Démarrer le flow express avec sélection de quantité
   */
  async startExpressPurchase(sessionId: string, productId: string): Promise<ChatMessage> {
    console.log('🚀 Starting express purchase with quantity selection:', { sessionId, productId });

    try {
      // ✅ Validation du produit avec informations complètes
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

      // ✅ Vérifier le stock
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

      // ✅ NOUVELLE ÉTAPE: Sélection de quantité d'abord
      const orderState: OrderState = {
        step: 'quantity', // ✅ Commencer par la quantité
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

      // ✅ NOUVEAU: Message avec sélection de quantité
      return {
        type: 'assistant',
        content: `⚡ **Commande Express Activée** ⚡

🎯 **${product.name}**
💰 ${product.price.toLocaleString()} FCFA l'unité
📦 Livraison incluse selon votre zone

**Combien d'exemplaires souhaitez-vous commander ?**

💡 *Vous pouvez commander jusqu'à ${Math.min(product.stock_quantity, 10)} exemplaires*`,
        choices: [
          '1 exemplaire',
          '2 exemplaires', 
          '3 exemplaires',
          '🔢 Autre quantité'
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

      // ✅ Gestion spéciale pour la sélection de quantité
      if (currentStep === 'express_quantity' || currentStep === 'express_custom_quantity') {
        return this.handleExpressQuantity(sessionId, input, orderState);
      }

      return this.processStepWithState(sessionId, input, orderState);

    } catch (error) {
      console.error('❌ Error in handleExpressStep:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre demande');
    }
  }

  private async processStepWithState(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    switch (orderState.step) {
      case 'quantity': // ✅ NOUVEAU
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

  // ✅ NOUVELLE MÉTHODE: Gérer la sélection de quantité
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
      } else {
        // Essayer de parser un nombre depuis l'input
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

      // ✅ CORRECTION: Mettre à jour la quantité et recalculer tous les montants
      orderState.data.quantity = quantity;
      orderState.step = 'contact'; // Passer à l'étape contact
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      // ✅ CORRECTION: Récupérer toutes les infos produit nécessaires
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', orderState.data.productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Erreur lors de la récupération du produit');
      }

      // ✅ CORRECTION: Calculer tous les montants correctement
      const itemPrice = product.price;
      const subtotal = itemPrice * quantity;
      const deliveryCost = 0; // Sera calculé à l'étape suivante
      const totalAmount = subtotal + deliveryCost;

      return {
        type: 'assistant',
        content: `✅ **Quantité confirmée : ${quantity} exemplaire${quantity > 1 ? 's' : ''}**

🎯 **${product.name}**
💰 ${totalAmount.toLocaleString()} FCFA (${quantity} × ${itemPrice.toLocaleString()} FCFA)

Sur quel numéro devons-nous vous joindre pour la livraison ?

💡 *Formats acceptés : +221 77 123 45 67, 77 123 45 67*`,
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

  /**
   * ✅ MÉTHODE CORRIGÉE: Validation téléphone avec reconnaissance client
   */
  private async handleExpressContact(
    sessionId: string,
    phone: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('📱 Processing contact step with customer recognition:', { sessionId, phone });

    try {
      // ✅ Utiliser le PhoneService amélioré
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

      // ✅ Formater le numéro avec le service amélioré
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

      // ✅ CORRECTION : Vérifier client existant dans la table customers
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

      // ✅ Mettre à jour l'état
      orderState.data.phone = formattedPhone.international;
      
      if (existingCustomer && !customerError) {
        // ✅ CLIENT EXISTANT - Raccourci vers confirmation d'adresse
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
          content: `👋 **Ravi de vous revoir ${existingCustomer.first_name || 'cher client'} !**

${countryFlag} **Numéro confirmé :** ${formattedPhone.formatted}

📍 **Votre adresse enregistrée :**
${existingCustomer.address || 'Adresse non renseignée'}, ${existingCustomer.city || 'Ville non renseignée'}

Utiliser la même adresse ou en changer ?`,
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
        // ✅ NOUVEAU CLIENT - Demander le nom
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

  // ✅ Collecter le nom
  private async handleExpressName(
    sessionId: string,
    name: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('👤 Processing name step:', { sessionId, name });

    try {
      // Validation du nom
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

      // Mettre à jour l'état
      orderState.data.name = trimmedName;
      orderState.step = 'address';
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👋 Enchanté(e) **${nameParts[0]}** !

📍 A quelle adresse livrer votre commande ?
*Format : Adresse, Ville*

Exemple : "Rue 10 x Rue 15 Médina, Dakar"`,
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
          content: `📍 **Adresse confirmée** ✅
${orderState.data.address}, ${orderState.data.city}

🚚 Frais de livraison : ${deliveryCost.toLocaleString()} FCFA

💳 Comment payez-vous ?`,
          choices: ['Wave', '💳 Carte bancaire', '🛵 Payer à la livraison'],
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

Exemple : "Rue 10 x Rue 15 Médina, Dakar"`,
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

Exemple : "Rue 10 x Rue 15 Médina, Dakar"`,
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

Exemple : "Rue 10 x Rue 15 Médina, Dakar"`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { expressMode: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Mettre à jour l'état
      orderState.data.address = parts[0];
      orderState.data.city = parts[1];
      orderState.step = 'payment';
      orderState.flags.addressValidated = true;
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      // Calculer les frais de livraison
      const deliveryCost = await this.calculateDeliveryCost(parts[1]);

      return {
        type: 'assistant',
        content: `📍 **Adresse confirmée** ✅
${parts[0]}, ${parts[1]}

🚚 Frais de livraison : ${deliveryCost.toLocaleString()} FCFA

💳 Comment payez-vous ?`,
        choices: ['🐧 Wave', '💳 Carte bancaire', '🛵 Payer à la livraison'],
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

  /**
 * ✅ Retourne le nom d'affichage du mode de paiement
 */
private getPaymentDisplayName(provider: PaymentProvider): string {
  const names: Record<PaymentProvider, string> = {
    'WAVE': 'Wave',
    'STRIPE': 'Carte bancaire',
    'CASH': 'Paiement à la livraison',
    'ORANGE_MONEY': 'Orange Money' // Au cas où vous l'ajouteriez plus tard
  };
  
  return names[provider] || 'Paiement';
}

/**
 * ✅ BONUS: Méthode pour formater les boutons de paiement avec styles
 */
private formatPaymentButton(method: PaymentProvider): string {
  switch (method) {
    case 'WAVE':
      return `<div class="wave-payment-button" style="background-color: #4BD2FA; color: white; padding: 12px 24px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; justify-content: center;">
        <img src="/images/payments/wave_2.svg" alt="Wave" style="width: 20px; height: 20px; flex-shrink: 0;" />
        <span>Payer avec Wave</span>
      </div>`;
    case 'STRIPE':
      return '💳 Payer par Carte bancaire';
    case 'CASH':
      return '🛵 Payer à la livraison';
    default:
      return 'Payer';
  }
}

  private async handleExpressPayment(
    sessionId: string,
    paymentChoice: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('💳 Processing payment step:', { sessionId, paymentChoice });

    try {
      // Mapper le choix vers le provider
      const paymentMethod = this.mapPaymentChoice(paymentChoice);
      
      orderState.data.paymentMethod = paymentMethod;
      orderState.step = 'confirmation';
      orderState.flags.paymentInitiated = true;
      this.orderStates.set(sessionId, orderState);
      await this.updateSessionInDatabase(sessionId, orderState);

      // Créer la commande avec un ID numérique
      const orderId = await this.createExpressOrder(sessionId, orderState);
      
      if (paymentMethod === 'CASH') {
        // Paiement à la livraison - commande confirmée directement
        return {
          type: 'assistant',
          content: `🎉 **Commande confirmée !** 🎉

📋 **N° ${orderId}**
👤 **${orderState.data.name}**
📍 ${orderState.data.address}, ${orderState.data.city}
💰 Paiement à la livraison

✅ Notre équipe vous contactera dans les 2h pour confirmer la livraison.

🙏 Merci pour votre confiance !`,
          choices: ['🔍 Suivre ma commande', '📞 Nous contacter', '🛍️ Autres produits'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'order_complete' as ConversationStep,
            orderId,
            flags: { orderCompleted: true }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Paiement en ligne - générer l'URL
        const paymentUrl = await this.initializePayment(orderId, paymentMethod, orderState);
        
        return {
          type: 'assistant',
          content: `💳 **Finaliser le paiement**

📋 Commande : **${orderId}**
👤 **${orderState.data.name}**
💰 Mode : ${this.getPaymentDisplayName(paymentMethod)}

👆 Cliquez sur le bouton ci-dessous pour payer :`,
          choices: [`💳 Payer par ${this.getPaymentDisplayName(paymentMethod)}`],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            paymentUrl,
            orderId,
            paymentAmount: await this.calculateOrderTotal(orderState),
            paymentMethod: this.getPaymentDisplayName(paymentMethod),
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

  // ✅ NOUVEAU: Après confirmation de paiement, proposer d'autres produits
    private async handleExpressConfirmation(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('✅ Processing confirmation step:', { sessionId, input });

    try {
      if (input.includes('Suivre ma commande') || input.includes('🔍')) {
        return this.handleOrderTracking(sessionId);
      }

      // ✅ CORRECTION: Gestion intelligente "Autres produits" 
      if (input.includes('Autres produits') || input.includes('🛍️')) {
        return this.handleAdditionalProducts(sessionId, orderState);
      }

      // ✅ NOUVEAU: Gestion "Nous contacter"
      if (input.includes('Nous contacter') || input.includes('📞')) {
        return {
          type: 'assistant',
          content: `📞 **Contactez notre équipe !**

  🤝 **Notre support client est là pour vous :**

  📱 **WhatsApp :** +221 78 136 27 28
  📧 **Email :** contact@viensonseconnait.com
  🕒 **Horaires :** Lun-Ven 9h-18h, Sam 9h-14h

  💬 **Ou continuez ici :**
  Je peux répondre à toutes vos questions sur nos jeux, votre commande, ou nos services.

  Comment puis-je vous aider ?`,
          choices: [
            '📞 WhatsApp (+221 78 136 27 28)',
            '📧 Envoyer un email',
            '❓ Poser ma question ici',
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

      return {
        type: 'assistant',
        content: `✅ **Commande confirmée !** 🎉

  Merci pour votre achat ! Voulez-vous :

  🛍️ **Ajouter d'autres jeux** à votre commande
  📦 **Finaliser** et recevoir la confirmation

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

  // ✅ MÉTHODE AMÉLIORÉE: Gérer l'ajout de produits supplémentaires
  private async handleAdditionalProducts(
    sessionId: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    try {
      // ✅ Récupérer d'autres produits disponibles avec plus d'informations
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, description, images')
        .eq('status', 'active')
        .neq('id', orderState.data.productId) // Exclure le produit déjà commandé
        .limit(4); // Augmenter à 4 produits

      if (error || !products || products.length === 0) {
        return {
          type: 'assistant',
          content: `🛍️ **Nos autres produits**

Découvrez toute notre gamme sur notre site ou contactez-nous pour plus d'informations.

Voulez-vous finaliser votre commande actuelle ?`,
          choices: [
            '📦 Finaliser ma commande',
            '📞 Nous contacter',
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

      // ✅ Créer un affichage enrichi des produits
      const productDescriptions = products.map(p => {
        const shortDesc = p.description ? 
          (p.description.length > 80 ? `${p.description.substring(0, 80)}...` : p.description) : 
          'Découvrez ce jeu pour renforcer vos relations';
        
        return `🎯 **${p.name}**\n💰 ${p.price.toLocaleString()} FCFA\n📝 ${shortDesc}`;
      }).join('\n\n');

      return {
        type: 'assistant',
        content: `🛍️ **Ajoutez d'autres jeux à votre commande :**

${productDescriptions}

Quel jeu souhaitez-vous ajouter ?`,
        choices: [
          ...products.slice(0, 3).map(p => `➕ ${p.name}`), // Limiter à 3 boutons pour l'interface
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

  // ✅ NOUVEAU: Gestion des sélections de produits supplémentaires
    async handleAdditionalProductSelection(
      sessionId: string,
      selectedChoice: string,
      availableProducts: any[]
    ): Promise<ChatMessage> {
      console.log('➕ Handling additional product selection:', selectedChoice);

      try {
        // ✅ Cas: Voir tous nos jeux (redirection)
        if (selectedChoice.includes('Voir tous nos jeux') || selectedChoice.includes('🌐')) {
          return {
            type: 'assistant',
            content: `🌐 **Découvrez notre collection complète !**

    Vous allez être redirigé vers notre page qui présente tous nos jeux de cartes.

    🎯 **Sur cette page, vous pourrez :**
    • Voir tous nos jeux par catégorie
    • Lire les descriptions détaillées  
    • Découvrir les avis clients
    • Comparer les différents jeux

    👆 **Cliquez sur le bouton ci-dessous pour y accéder :**`,
            choices: [
              '🌐 Voir tous nos jeux',
              '📦 Finaliser ma commande actuelle',
              '🔙 Retour au chat'
            ],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'redirect_to_catalog' as ConversationStep,
              externalUrl: {
                type: 'other',
                url: '/nos-jeux',
                description: 'Découvrir tous nos jeux'
              },
              flags: { 
                catalogRedirect: true,
                showExternalLink: true 
              }
            },
            timestamp: new Date().toISOString()
          };
        }

        // ✅ Cas: Finaliser sans ajouter
        if (selectedChoice.includes('Finaliser ma commande') || selectedChoice.includes('📦')) {
          return {
            type: 'assistant',
            content: `📦 **Commande finalisée !**

    ✅ Votre commande a été confirmée avec succès.
    📧 Vous recevrez un email de confirmation dans les 5 minutes.
    📱 Notre équipe vous contactera pour organiser la livraison.

    🙏 **Merci pour votre confiance !**

    Besoin d'autre chose ?`,
            choices: [
              '🔍 Suivre ma commande',
              '📞 Nous contacter',
              '⭐ Donner un avis',
              '🏠 Retour à l\'accueil'
            ],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'order_finalized' as ConversationStep,
              flags: { 
                orderCompleted: true,
                orderFinalized: true 
              }
            },
            timestamp: new Date().toISOString()
          };
        }

        // ✅ Cas: Sélection d'un produit spécifique
        if (selectedChoice.includes('➕')) {
          const productName = selectedChoice.replace('➕ ', '').trim();
          const selectedProduct = availableProducts.find(p => p.name === productName);

          if (!selectedProduct) {
            return this.createErrorMessage(sessionId, 'Produit non trouvé. Veuillez réessayer.');
          }

          // Ajouter le produit au panier via ConversationalCartService
          // Cette intégration sera faite dans la prochaine étape
          return {
            type: 'assistant',
            content: `✅ **${selectedProduct.name} ajouté !**

    💰 **Prix :** ${selectedProduct.price.toLocaleString()} FCFA
    📝 **Description :** ${selectedProduct.description || 'Parfait pour créer des moments authentiques'}

    🛒 **Votre commande sera mise à jour avec ce nouveau produit.**

    Que souhaitez-vous faire maintenant ?`,
            choices: [
              '🛍️ Ajouter un autre jeu',
              '📦 Finaliser ma commande',
              '✏️ Modifier les quantités',
              '🗑️ Retirer ce produit'
            ],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'product_added_to_cart' as ConversationStep,
              productAdded: selectedProduct,
              flags: { 
                productAdded: true,
                multipleProducts: true 
              }
            },
            timestamp: new Date().toISOString()
          };
        }

        // Cas par défaut
        return this.createErrorMessage(sessionId, 'Choix non reconnu');

      } catch (error) {
        console.error('❌ Error in handleAdditionalProductSelection:', error);
        return this.createErrorMessage(sessionId, 'Erreur lors de la sélection du produit');
      }
    }

  // ==========================================
  // ✅ INTÉGRATION STRIPE DANS LE FLOW EXPRESS
  // ==========================================

  /**
   * ✅ MÉTHODE CORRIGÉE: Initialiser paiement avec redirections vers chat
   */
  private async initializePayment(
    orderId: string,
    paymentMethod: PaymentProvider,
    orderState: OrderState
  ): Promise<string> {
    console.log('💳 Initializing payment with method:', paymentMethod);
    
    try {
      const totalAmount = await this.calculateOrderTotal(orderState);
      
      if (paymentMethod === 'STRIPE') {
        // ✅ Créer une session Stripe avec redirection vers le chat
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalAmount * 100, // Convertir en centimes
            currency: 'eur',
            orderId,
            customerName: orderState.data.name,
            successUrl: `${window.location.origin}/chat/payment-success?order_id=${orderId}`, // ✅ Redirection vers chat
            cancelUrl: `${window.location.origin}/chat/payment-canceled?order_id=${orderId}` // ✅ Redirection vers chat
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création de la session Stripe');
        }

        const session = await response.json();
        console.log('✅ Stripe session created:', session.id);
        return session.url;
        
      } else if (paymentMethod === 'WAVE') {
        // ✅ URL Wave avec montant dynamique
        const waveUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${totalAmount}`;
        console.log('💰 Wave payment URL generated:', waveUrl);
        return waveUrl;
        
      } else {
        return '#';
      }
      
    } catch (error) {
      console.error('❌ Error initializing payment:', error);
      throw new Error(`Erreur lors de l'initialisation du paiement: ${error}`);
    }
  }

  // ==========================================
  // MÉTHODES DE GESTION DES DONNÉES
  // ==========================================

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
      return undefined; // ✅ CORRECTION: Retourner undefined au lieu de null
    }

    console.log('✅ Session recovered from database:', sessionId);
    return conversation.session_data as OrderState;
  } catch (error) {
    console.error('❌ Error in recoverSessionFromDatabase:', error);
    return undefined; // ✅ CORRECTION: Retourner undefined au lieu de null
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

      // Récupérer les infos produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ Product not found during order creation:', productError);
        throw new Error(`Product ${productId} not found`);
      }

      // Calculer les coûts
      const deliveryCost = await this.calculateDeliveryCost(orderState.data.city || '');
      const subtotal = product.price * orderState.data.quantity;
      const total = subtotal + deliveryCost;

      // Générer un ID numérique valide
      const numericOrderId = Math.floor(Date.now() / 1000);

      // ✅ EXTRACTION SÉCURISÉE DU NOM
      const firstName = this.extractFirstName(orderState.data.name);
      const lastName = this.extractLastName(orderState.data.name);

      // Préparer les données de commande
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

      // Insérer directement dans Supabase
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

      // ✅ NOUVEAU : Sauvegarder ou mettre à jour le client dans la table customers
      try {
        const customerData = {
          first_name: firstName,
          last_name: lastName,
          phone: orderState.data.phone,
          city: orderState.data.city,
          address: orderState.data.address,
          email: '', // Sera mis à jour plus tard si collecté
          updated_at: new Date().toISOString()
        };

        if (orderState.flags.customerExists) {
          // Mettre à jour client existant
          await supabase
            .from('customers')
            .update(customerData)
            .eq('phone', orderState.data.phone);
          console.log('✅ Customer updated in database');
        } else {
          // Créer nouveau client
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
        // Ne pas faire échouer la commande pour une erreur de sauvegarde client
      }

      // Décrémenter le stock
      await this.decrementProductStock(productId, orderState.data.quantity);

      return insertedOrder.id.toString();

    } catch (error) {
      console.error('❌ Error in createExpressOrder:', error);
      throw error;
    }
  }

  // ==========================================
  // ✅ CALCUL DES COÛTS DEPUIS delivery_zones
  // ==========================================

  private async calculateDeliveryCost(city: string): Promise<number> {
    try {
      console.log('🚚 Calculating delivery cost for city:', city);
      
      const normalizedCity = city.toLowerCase().trim();
      
      // Récupérer les zones de livraison depuis la base de données
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

      // Chercher la zone correspondante
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

      // Si aucune zone trouvée, utiliser le coût le plus élevé (sécurité)
      const maxCost = Math.max(...zones.map(z => z.cost));
      console.log(`⚠️ No matching zone found for ${city}, using max cost: ${maxCost} FCFA`);
      return maxCost;

    } catch (error) {
      console.error('❌ Error in calculateDeliveryCost:', error);
      return this.getFallbackDeliveryCost(city.toLowerCase());
    }
  }

  // ✅ Fallback pour les coûts de livraison
  private getFallbackDeliveryCost(normalizedCity: string): number {
    if (normalizedCity.includes('dakar')) return 0;
    if (normalizedCity.includes('abidjan')) return 2500;
    
    const senegalCities = ['thiès', 'saint-louis', 'kaolack', 'ziguinchor', 'touba', 'mbour', 'pikine', 'guédiawaye'];
    if (senegalCities.some(city => normalizedCity.includes(city))) {
      return 3000;
    }
    
    return 2500; // Coût par défaut
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

  // ✅ CORRECTION: Mapper le choix de paiement sans Orange Money
  private mapPaymentChoice(choice: string): PaymentProvider {
  const normalized = choice.toLowerCase();
  
  // ✅ Gestion du bouton Wave avec HTML/SVG
  if (normalized.includes('wave') || choice.includes('wave_2.svg') || choice.includes('#4BD2FA')) {
    return 'WAVE';
  }
  
  if (normalized.includes('carte') || normalized.includes('bancaire')) {
    return 'STRIPE';
  }
  
  if (normalized.includes('livraison') || normalized.includes('🛵')) {
    return 'CASH';
  }
  
  return 'WAVE'; // Par défaut
}

// ✅ AMÉLIORATION: Formatage des boutons de paiement avec styles
private formatPaymentChoices(orderState: OrderState): string[] {
  const choices = [];
  
  // ✅ Bouton Wave avec style personnalisé
  choices.push(`<button class="wave-payment-button" style="background-color: #4BD2FA; color: white; padding: 12px 24px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;">
    <img src="/images/payments/wave_2.svg" alt="Wave" style="width: 20px; height: 20px; flex-shrink: 0;" />
    <span>Payer avec Wave</span>
  </button>`);
  
  choices.push('💳 Carte bancaire');
  choices.push('🛵 Payer à la livraison');
  
  return choices;
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

  /**
   * ✅ MÉTHODE UTILITAIRE: Obtenir le drapeau du pays
   */
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

  // ==========================================
  // FLOW CONVERSATIONNEL (Garde l'existant)
  // ==========================================

  async handleConversationalFlow(
    sessionId: string,
    message: string,
    currentStep: ConversationStep
  ): Promise<ChatMessage> {
    // Déléguer au ChatService existant pour le mode conversationnel
    return {
      type: 'assistant',
      content: 'Mode conversationnel en cours de développement...',
      choices: [],
      assistant: this.getBotInfo(),
      metadata: { nextStep: currentStep },
      timestamp: new Date().toISOString()
    };
  }
}