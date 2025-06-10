// src/lib/services/OptimizedChatService.ts 
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';
import { OrderService } from './OrderService';
import { AIResponseHandler } from './AIResponseHandler';
import { OrderTrackingService } from './OrderTrackingService';
import type { 
  ChatMessage, 
  ConversationStep, 
  MessageType,
  ChatOrderData 
} from '@/types/chat';
import type { PaymentProvider } from '@/types/order';

// ✅ CORRECTION 1: Fonction utilitaire pour valider ConversationStep
function validateConversationStep(step: any): ConversationStep {
  const validSteps: ConversationStep[] = [
    'initial', 'initial_engagement', 'mode_selection', 'generic_response',
    'error_recovery', 'fallback_response', 'whatsapp_redirect',
    'intelligent_fallback', 'basic_fallback', 'enhanced_fallback',
    'standard_engagement', 'critical_error', 'description', 'product_info',
    'product_info_detailed', 'product_info_persuasive', 'product_usage',
    'product_benefits', 'product_question', 'target_audience', 'game_rules',
    'game_rules_shown', 'usage_explained', 'benefits_presented',
    'question_mode', 'question_answered', 'information_gathering',
    'testimonials', 'testimonials_view', 'testimonials_shown',
    'testimonials_request', 'social_proof_shown', 'price_question',
    'price_explained', 'price_justification', 'objection',
    'objection_handling', 'objection_handled', 'objection_addressed',
    'objection_general', 'doubt_addressed', 'delivery_info',
    'delivery_info_shown', 'delivery_question', 'warm_welcome',
    'greeting', 'greeting_response', 'high_interest', 'conversion_focus',
    'persuasion_attempt', 'trust_building', 'purchase_intent',
    'express_contact', 'express_name', 'express_phone', 'express_city',
    'express_address', 'express_quantity', 'express_custom_quantity',
    'express_payment', 'express_order', 'express_summary', 'express_modify',
    'express_error', 'quantity_confirmed', 'quantity_selected',
    'collect_quantity', 'collect_name', 'collect_phone', 'collect_city',
    'collect_address', 'collect_email', 'collect_email_opt',
    'collect_has_email', 'process_email_response', 'collect_note_text',
    'check_existing', 'confirm_address', 'update_address',
    'confirm_existing_info', 'process_quantity', 'contact_info',
    'cart_management', 'empty_cart', 'empty_cart_options',
    'cart_summary_actions', 'product_navigation_choice',
    'recommend_products', 'select_product', 'select_additional_product',
    'additional_quantity', 'add_product_choice', 'add_other_products',
    'add_product', 'add_product_to_order', 'product_added',
    'product_selection', 'product_unavailable', 'choose_flow',
    'add_notes', 'save_note', 'order_summary', 'show_order_summary',
    'confirm_order_summary', 'modify_order', 'finalize_order',
    'finalize_current_order', 'fresh_start', 'payment_method',
    'payment_processing', 'payment_complete', 'payment_error',
    'wave_payment_process', 'order_complete', 'order_details_shown',
    'post_purchase', 'post_purchase_options', 'order_tracking',
    'customer_service', 'customer_support', 'general_support',
    'support_request', 'contact_options', 'address_change_request',
    'create_account', 'create_account_email', 'create_account_password',
    'out_of_stock', 'stock_unavailable', 'conversational_quantity',
    'conversational_questions', 'conversational_contact',
    'conversational_mode', 'conversational_flow', 'session_recovered',
    'browse_products', 'free_text_mode', 'generic'
  ];

  if (typeof step === 'string' && validSteps.includes(step as ConversationStep)) {
    return step as ConversationStep;
  }
  
  // Valeur par défaut sécurisée
  return 'generic_response';
}

// ✅ CORRECTION 2: Fonction pour créer un contexte IA sécurisé
function createSafeAIContext(
  productId: string,
  productName: string,
  sessionId: string,
  isExpressMode: boolean,
  currentStep?: string,
  userMessage?: string
) {
  return {
    productId,
    productName,
    sessionId,
    isExpressMode,
    currentStep: validateConversationStep(currentStep), // ✅ Validation ici
    userMessage: userMessage || '',
    conversationHistory: []
  };
}

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
  private orderTrackingService = OrderTrackingService.getInstance();

  private constructor() {}

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ==========================================
  // ✅ SECTION: GESTION DES BOUTONS STANDARDS
  // ==========================================

  /**
   * ✅ NOUVELLE MÉTHODE: Détecter si c'est un bouton standard qui ne doit PAS aller à l'IA
   */
  private isStandardButton(message: string): boolean {
    const standardButtons = [
      'Poser une question',
      '❓ Poser une question',
      'Suivre ma commande',
      '🔍 Suivre ma commande',
      'Nous contacter',
      '💬 Nous contacter',
      'Voir les autres jeux',
      '🛍️ Voir les autres jeux',
      'Commander rapidement',
      '⚡ Commander rapidement'
    ];
    
    return standardButtons.some(btn => 
      message.includes(btn) || message === btn
    );
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Traiter les boutons standards avec réponses prédéfinies
   */
  private async handleStandardButton(
    sessionId: string,
    message: string
  ): Promise<ChatMessage> {
    console.log('🔘 Processing standard button:', message);

    // ✅ CORRECTION PROBLÈME 2: Poser une question
    if (message.includes('Poser une question') || message.includes('❓')) {
      return {
        type: 'assistant',
        content: `✨ **C'est compris !**

Écrivez votre question dans le champ ci-dessous afin que je puisse y répondre.

💬 Vous pouvez me demander :
- Comment fonctionne le jeu
- Pour qui c'est recommandé  
- Les bénéfices pour vous
- Nos conditions de livraison
- Tout autre question !

Je suis là pour vous aider ! 😊`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'free_text_mode' as ConversationStep,
          flags: { 
            freeTextEnabled: true,
            questionMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION PROBLÈME 3: Suivre ma commande  
    if (message.includes('Suivre ma commande') || message.includes('🔍')) {
      console.log('🔍 Processing order tracking request for session:', sessionId);
      return await this.orderTrackingService.createTrackingMessage(sessionId);
    }

    // ✅ Commander rapidement
    if (message.includes('Commander rapidement') || message.includes('⚡')) {
      const orderState = this.orderStates.get(sessionId);
      const productId = orderState?.data.productId || this.extractProductIdFromSession(sessionId);
      
      if (!productId) {
        return this.createErrorMessage(sessionId, 'Session expirée. Veuillez rafraîchir la page.');
      }
      
      return this.startExpressPurchase(sessionId, productId);
    }

    // ✅ Nous contacter
    if (message.includes('Nous contacter') || message.includes('💬')) {
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
          '📞 WhatsApp (+221 78 136 27 28)',
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

    // ✅ Voir autres jeux
    if (message.includes('Voir les autres jeux') || message.includes('🛍️')) {
      return {
        type: 'assistant',
        content: `🛍️ **Découvrez notre collection complète !**

Nous avons d'autres jeux passionnants pour renforcer vos relations :

🔗 **Visitez notre boutique complète :**
👉 [Voir tous nos jeux](/nos-jeux)

📱 **Ou contactez-nous pour des recommandations personnalisées :**
WhatsApp : +221 78 136 27 28

Voulez-vous que je vous aide avec autre chose ?`,
        choices: [
          '🌐 Voir tous nos jeux',
          '📞 Recommandations personnalisées',
          '🔙 Continuer ici'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'browse_products' as ConversationStep,
          externalUrl: {
            type: 'other',
            url: '/nos-jeux',
            description: 'Voir tous nos jeux'
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Fallback si aucun bouton standard reconnu
    return this.createErrorMessage(sessionId, 'Bouton non reconnu');
  }

  // ==========================================
  // ✅ SECTION: GESTION DES MESSAGES LIBRES IA
  // ==========================================

  /**
   * ✅ MÉTHODE CORRIGÉE: Traiter les messages avec priorisation des boutons standards
   */
  async processUserInput(
    sessionId: string,
    message: string,
    currentStep?: ConversationStep
  ): Promise<ChatMessage> {
    console.log('🤖 Processing user input with button detection:', { sessionId, message, currentStep });

    try {
      // ✅ VALIDATION STRICTE
      if (!sessionId || sessionId.length < 5) {
        console.error('❌ Invalid sessionId provided:', sessionId);
        return this.createErrorMessage('', 'Session invalide. Veuillez rafraîchir la page.');
      }

      // ✅ PRIORITÉ 1: Vérifier si c'est un bouton standard
      if (this.isStandardButton(message)) {
        console.log('🔘 Standard button detected, handling directly');
        return await this.handleStandardButton(sessionId, message);
      }

      // ✅ PRIORITÉ 2: Gestion des commandes express
      if (this.isExpressCommand(message) || currentStep?.includes('express')) {
        console.log('⚡ Processing express command');
        return await this.handleExpressFlow(sessionId, message, currentStep);
      }

      // ✅ PRIORITÉ 3: Récupérer ou créer l'état de commande avec type correct
      let orderState: OrderState | undefined = this.orderStates.get(sessionId);
      
      if (!orderState) {
        console.log('🔄 Order state not found, attempting to recover or create new one');
        
        const recoveredState = await this.recoverSessionFromDatabase(sessionId);
        
        if (recoveredState) {
          orderState = recoveredState;
          this.orderStates.set(sessionId, orderState);
        } else {
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

      // ✅ PRIORITÉ 4: Récupérer le productId
      let productId = orderState.data.productId;

      if (!productId) {
        productId = this.extractProductIdFromSession(sessionId);
        if (productId) {
          orderState.data.productId = productId;
          this.orderStates.set(sessionId, orderState);
        }
      }

      if (!productId) {
        try {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('product_id')
            .eq('id', sessionId)
            .single();
            
          if (conversation?.product_id) {
            productId = conversation.product_id;
            orderState.data.productId = productId;
            this.orderStates.set(sessionId, orderState);
          }
        } catch (dbError) {
          console.error('❌ Error recovering productId from database:', dbError);
        }
      }

      if (!productId) {
        console.error('❌ No productId found for session:', sessionId);
        return this.createErrorMessage(sessionId, 'Session expirée. Veuillez rafraîchir la page et recommencer.');
      }

      // ✅ PRIORITÉ 5: Récupérer les infos produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, description')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ Product not found for AI context:', productError);
        return this.createErrorMessage(sessionId, `Produit ${productId} non trouvé.`);
      }

      // ✅ PRIORITÉ 6: Préparer le contexte pour l'IA
      const aiContext = {
        productId: product.id,
        productName: product.name,
        sessionId,
        isExpressMode: orderState?.mode === 'express' || false,
        currentStep,
        userMessage: message,
        conversationHistory: []
      };

      // ✅ PRIORITÉ 7: Laisser l'IA traiter le message
      const aiResponse = await this.aiResponseHandler.handleFreeTextMessage(aiContext);
      
      console.log('✅ AI response generated successfully');
      return aiResponse;

    } catch (error) {
      console.error('❌ Error processing user input:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement de votre message. Veuillez réessayer.');
    }
  }

  // ✅ NOUVELLE MÉTHODE: Détecter les commandes express
  private isExpressCommand(message: string): boolean {
    const expressPatterns = [
      /commander rapidement/i,
      /⚡/,
      /express/i,
      /rapide/i,
      /tout de suite/i
    ];
    
    return expressPatterns.some(pattern => pattern.test(message));
  }

  // ✅ NOUVELLE MÉTHODE: Extraire productId depuis sessionId
  private extractProductIdFromSession(sessionId: string): string | undefined {
    try {
      const sessionParts = sessionId.split('_');
      if (sessionParts.length >= 2 && sessionParts[0].length > 10) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(sessionParts[0])) {
          return sessionParts[0];
        }
      }
    } catch (error) {
      console.error('❌ Error extracting productId from sessionId:', error);
    }
    return undefined;
  }

  // ✅ NOUVELLE MÉTHODE: Gérer le flow express
  private async handleExpressFlow(
    sessionId: string,
    message: string,
    currentStep?: string
  ): Promise<ChatMessage> {
    try {
      let chatResponse: ChatMessage;

      if (currentStep?.includes('express')) {
        chatResponse = await this.handleExpressStep(sessionId, message, currentStep);
      } else {
        const orderState = this.orderStates.get(sessionId);
        const productId = orderState?.data.productId || this.extractProductIdFromSession(sessionId);
        
        if (!productId) {
          return this.createErrorMessage(sessionId, 'Session expirée pour la commande express');
        }
        
        chatResponse = await this.startExpressPurchase(sessionId, productId);
      }

      return chatResponse;

    } catch (error) {
      console.error('❌ Error in express flow:', error);
      return this.createErrorMessage(sessionId, 'Erreur dans le processus express');
    }
  }

  // ==========================================
  // ✅ FLOW EXPRESS OPTIMISÉ AVEC QUANTITÉ  
  // ==========================================

  /**
   * ✅ MÉTHODE CORRIGÉE: Démarrer le flow express avec correction des métadonnées
   */
  async startExpressPurchase(sessionId: string, productId: string): Promise<ChatMessage> {
    console.log('🚀 Starting express purchase with enhanced metadata:', { sessionId, productId });

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, status')
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (productError || !product) {
        console.error('❌ Product not found or inactive:', productError);
        return this.createErrorMessage(sessionId, 'Ce produit n\'est pas disponible actuellement.');
      }

      if (product.stock_quantity <= 0) {
        return this.createOutOfStockMessage(product);
      }

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
          // ✅ CORRECTION CRITIQUE: Ajouter les données de commande pour le paiement
          orderData: {
            session_id: sessionId,
            product_id: product.id,
            quantity: 1,
            subtotal: product.price,
            total_amount: product.price, // Sera recalculé avec livraison
            items: [{
              productId: product.id,
              name: product.name,
              quantity: 1,
              price: product.price,
              totalPrice: product.price
            }]
          },
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

      if (currentStep === 'express_quantity' || currentStep === 'express_custom_quantity') {
        return this.handleExpressQuantity(sessionId, input, orderState);
      }

      if (this.isQuantityModificationRequest(input)) {
        return this.handleQuantityModification(sessionId, input, orderState);
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

  // ✅ CORRECTION: Gérer la sélection de quantité avec métadonnées enrichies
  private async handleExpressQuantity(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('🔢 Processing express quantity selection:', { sessionId, input });

    try {
      let quantity = 1;

      if (input.includes('1 exemplaire')) {
        quantity = 1;
      } else if (input.includes('2 exemplaires')) {
        quantity = 2;
      } else if (input.includes('3 exemplaires')) {
        quantity = 3;
      } else if (input.includes('Autre quantité')) {
        return this.createCustomQuantityPrompt(orderState);
      } else if (input.includes('Continuer la commande')) {
        orderState.step = 'contact';
        this.orderStates.set(sessionId, orderState);
        await this.updateSessionInDatabase(sessionId, orderState);
        return this.proceedToContactStep(sessionId, orderState);
      } else {
        const numberMatch = input.match(/(\d+)/);
        if (numberMatch) {
          quantity = parseInt(numberMatch[1]);
        }
      }

      if (quantity < 1 || quantity > (orderState.metadata?.maxQuantity || 10)) {
        return this.createInvalidQuantityMessage(orderState);
      }

      // ✅ CORRECTION: Mettre à jour avec calculs complets
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
      const deliveryCost = 0; // Sera calculé à l'étape suivante
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
          // ✅ CORRECTION CRITIQUE: Métadonnées complètes pour le paiement
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
          // ✅ AJOUT: Données de paiement directement accessibles
          paymentAmount: totalAmount,
          orderId: sessionId, // Temporaire, sera remplacé par le vrai ID
          customerName: orderState.data.name || 'Client',
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

  // =======================================
  // ✅ MÉTHODES AUXILIAIRES POUR L'EXPRESS
  // =======================================

  private createCustomQuantityPrompt(orderState: OrderState): ChatMessage {
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
  }

  private createInvalidQuantityMessage(orderState: OrderState): ChatMessage {
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

  private async proceedToContactStep(sessionId: string, orderState: OrderState): Promise<ChatMessage> {
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
Prix total : **${totalAmount.toLocaleString()} FCFA**

Sur quel numéro vous joindre pour la livraison ?`,
      choices: [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_contact' as ConversationStep,
        orderData: { 
          session_id: sessionId,
          product_id: product.id,
          quantity: orderState.data.quantity,
          total_amount: totalAmount
        },
        flags: { expressMode: true, quantitySelected: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private createOutOfStockMessage(product: any): ChatMessage {
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
        productId: product.id,
        flags: { outOfStock: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // =======================================
  // ✅ MÉTHODES MANQUANTES À IMPLÉMENTER
  // =======================================

  private isQuantityModificationRequest(input: string): boolean {
    const modificationKeywords = [
      'modifier', 'changer', 'finalement', 'plutôt', 'en fait',
      'exemplaire', 'quantité', 'nombre'
    ];
    return modificationKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    ) && /\d+/.test(input);
  }

  private async handleQuantityModification(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    // Implementation simplifiée - appeler handleExpressQuantity
    return this.handleExpressQuantity(sessionId, input, orderState);
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
            this.createWaveButton(),
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
        content: `📍 **Adresse enregistrée** ✅
${parts[0]}, ${parts[1]}

🛵 Frais de livraison : ${deliveryCost.toLocaleString()} FCFA

💳 Comment souhaitez-vous payer ?`,
        choices: [
          this.createWaveButton(),
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

  // ✅ NOUVELLE MÉTHODE: Créer le bouton Wave avec logo et couleur
  private createWaveButton(): string {
    return 'Payer avec Wave';
  }

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
      const orderTotal = await this.calculateOrderTotal(orderState);
      
      // ✅ CORRECTION CRITIQUE: Retourner les métadonnées complètes pour le paiement
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
        const waveUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${orderTotal}`;
        
        return {
          type: 'assistant',
          content: `💰 **Paiement par Wave**

📋 Commande : **${orderId}**
👤 Client : **${orderState.data.name}**
💰 Montant : **${orderTotal.toLocaleString()} FCFA**

🔗 **Étapes :**
1. Cliquez sur le bouton Wave ci-dessous
2. Effectuez le paiement
3. Votre commande sera automatiquement confirmée

👇🏽 Cliquez pour payer avec Wave :`,
          choices: [
            `🌊 Payer ${orderTotal.toLocaleString()} FCFA avec Wave`
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'wave_payment_process' as ConversationStep,
            paymentUrl: waveUrl,
            orderId,
            // ✅ CORRECTION CRITIQUE: Toutes les données nécessaires pour le paiement
            paymentAmount: orderTotal,
            paymentMethod: 'Wave',
            orderData: {
              id: orderId,
              order_id: orderId,
              session_id: sessionId,
              total_amount: orderTotal,
              totalAmount: orderTotal,
              first_name: this.extractFirstName(orderState.data.name),
              last_name: this.extractLastName(orderState.data.name),
              name: orderState.data.name
            },
            customerName: orderState.data.name,
            flags: { 
              expressMode: true, 
              paymentInitiated: true,
              wavePayment: true
            }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Stripe payment
        const paymentUrl = await this.initializePayment(orderId, paymentMethod, orderState);
        
        return {
          type: 'assistant',
          content: `💳 **Finaliser le paiement**

📋 Commande : **${orderId}**
👤 Client : **${orderState.data.name}**
💰 Montant : **${orderTotal.toLocaleString()} FCFA**

👇🏽 Cliquez sur le bouton ci-dessous pour payer :`,
          choices: [`💳 Payer par ${this.getPaymentDisplayName(paymentMethod)}`],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            paymentUrl,
            orderId,
            // ✅ CORRECTION CRITIQUE: Métadonnées complètes
            paymentAmount: orderTotal,
            paymentMethod: this.getPaymentDisplayName(paymentMethod),
            orderData: {
              id: orderId,
              order_id: orderId,
              session_id: sessionId,
              total_amount: orderTotal,
              totalAmount: orderTotal,
              first_name: this.extractFirstName(orderState.data.name),
              last_name: this.extractLastName(orderState.data.name),
              name: orderState.data.name
            },
            customerName: orderState.data.name,
            flags: { expressMode: true, paymentInitiated: true }
          },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('❌ Express payment error:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement du paiement');
    }
  }

  private async handleExpressConfirmation(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    if (input.includes('Suivre ma commande') || input.includes('🔍')) {
      return this.orderTrackingService.createTrackingMessage(sessionId);
    }

    return {
      type: 'assistant',
      content: `✅ **Votre commande est confirmée !** 🎉

Merci pour votre achat ! Que souhaitez-vous faire maintenant ?`,
      choices: [
        '🔍 Suivre ma commande',
        '🛍️ Commander autre chose',
        '📞 Nous contacter'
      ],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'post_purchase_options' as ConversationStep,
        flags: { orderCompleted: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================
  // ✅ MÉTHODES UTILITAIRES
  // ==========================================

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
    
    return 'WAVE'; // Par défaut
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

  private async initializePayment(
    orderId: string,
    paymentMethod: PaymentProvider,
    orderState: OrderState
  ): Promise<string> {
    console.log('💳 Initializing payment with method:', paymentMethod);
    
    try {
      const totalAmountFCFA = await this.calculateOrderTotal(orderState);
      
      if (paymentMethod === 'STRIPE') {
        // ✅ CORRECTION: Conversion FCFA vers EUR pour Stripe
        const FCFA_TO_EUR_RATE = 0.00153; // 1 FCFA = 0.00153 EUR (taux approximatif)
        const totalAmountEUR = Math.round(totalAmountFCFA * FCFA_TO_EUR_RATE * 100); // En centimes d'EUR
        
        console.log(`💰 Converting ${totalAmountFCFA} FCFA to ${totalAmountEUR/100} EUR for Stripe`);
        
        // Créer une session Stripe avec redirection vers le chat
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalAmountEUR, // ✅ CORRECTION: Montant en centimes d'EUR
            currency: 'eur',
            orderId,
            customerName: orderState.data.name,
            successUrl: `${window.location.origin}/chat/payment-success?order_id=${orderId}`,
            cancelUrl: `${window.location.origin}/chat/payment-canceled?order_id=${orderId}`
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création de la session Stripe');
        }

        const session = await response.json();
        console.log('✅ Stripe session created:', session.id);
        return session.url;
        
      } else if (paymentMethod === 'WAVE') {
        // URL Wave avec montant en FCFA
        const waveUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${totalAmountFCFA}`;
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

  // ==========================================
  // ✅ GESTION DES DONNÉES ET SESSIONS
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
        return undefined;
      }

      console.log('✅ Session recovered from database:', sessionId);
      return conversation.session_data as OrderState;
    } catch (error) {
      console.error('❌ Error in recoverSessionFromDatabase:', error);
      return undefined;
    }
  }

  private getBotInfo() {
    return {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };
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

  // ==========================================
  // ✅ MÉTHODES PUBLIQUES EXISTANTES
  // ==========================================

  /**
   * ✅ MÉTHODE POUR GÉRER LES CHOIX PRÉDÉFINIS
   */
  async handlePredefinedChoice(
    sessionId: string,
    choice: string,
    productId: string
  ): Promise<ChatMessage> {
    console.log('🔘 Processing predefined choice:', { choice, productId });

    // ✅ PRIORITÉ 1: Vérifier si c'est un bouton standard
    if (this.isStandardButton(choice)) {
      return await this.handleStandardButton(sessionId, choice);
    }

    try {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Produit non trouvé');
      }

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

  /**
   * ✅ MÉTHODE: Vider la commande
   */
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
          flags: { cartCleared: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la suppression de la commande');
    }
  }

  // ==========================================
  // ✅ MÉTHODES CONVERSATIONNELLES STANDARD
  // ==========================================

  /**
   * ✅ MÉTHODE: Démarrer le flow conversationnel standard
   */
  async startConversationalFlow(sessionId: string, productId: string): Promise<ChatMessage> {
    console.log('💬 Starting conversational flow:', { sessionId, productId });

    try {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!product) {
        return this.createErrorMessage(sessionId, 'Produit non trouvé');
      }

      const orderState: OrderState = {
        step: 'quantity',
        mode: 'conversational',
        data: {
          quantity: 1,
          productId: product.id,
          storeId: 'a9563f88-217c-4998-b080-ed39f637ea31'
        },
        flags: {
          customerExists: false,
          addressValidated: false,
          paymentInitiated: false
        }
      };

      this.orderStates.set(sessionId, orderState);
      await this.saveSessionToDatabase(sessionId, orderState, product.id, orderState.data.storeId!);

      return {
        type: 'assistant',
        content: `💬 **Mode conversation activé**

Parfait ! Je vais vous accompagner étape par étape pour votre commande du jeu **${product.name}**.

💰 **Prix :** ${product.price.toLocaleString()} FCFA
📦 **En stock :** ${product.stock_quantity} exemplaires

🤔 **Prenons le temps de bien faire les choses...**

Combien d'exemplaires souhaitez-vous commander ?`,
        choices: [
          '1 exemplaire',
          '2 exemplaires',
          '3 exemplaires',
          'Autre quantité',
          '❓ J\'ai des questions d\'abord'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'conversational_quantity' as ConversationStep,
          productId: product.id,
          flags: { 
            conversationalMode: true,
            questionMode: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error starting conversational flow:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du démarrage du mode conversation');
    }
  }

  /**
   * ✅ MÉTHODE: Gérer les étapes conversationnelles
   */
  async handleConversationalStep(
    sessionId: string,
    input: string,
    currentStep: string
  ): Promise<ChatMessage> {
    console.log('💬 Processing conversational step:', { sessionId, input, currentStep });

    try {
      const orderState = this.orderStates.get(sessionId);
      if (!orderState) {
        return this.createErrorMessage(sessionId, 'Session expirée');
      }

      // Traitement selon l'étape conversationnelle
      switch (currentStep) {
        case 'conversational_quantity':
          return await this.handleConversationalQuantity(sessionId, input, orderState);
        
        case 'conversational_questions':
          return await this.handleConversationalQuestions(sessionId, input, orderState);
        
        case 'conversational_contact':
          return await this.handleConversationalContact(sessionId, input, orderState);
        
        default:
          // Utiliser l'IA pour les étapes non définies
          return await this.aiResponseHandler.handleFreeTextMessage(
        createSafeAIContext(
            orderState.data.productId!,
            await this.getProductName(orderState.data.productId),
            sessionId,
            false,
            'conversational_questions',
            input
        )
        );
      }

    } catch (error) {
      console.error('❌ Error in conversational step:', error);
      return this.createErrorMessage(sessionId, 'Erreur dans le mode conversation');
    }
  }

  private async handleConversationalQuantity(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    if (input.includes('questions d\'abord')) {
      return {
        type: 'assistant',
        content: `❓ **Parfait ! Posez-moi toutes vos questions**

Je suis là pour vous expliquer tout ce que vous voulez savoir sur le jeu **${await this.getProductName(orderState.data.productId)}**.

Quelle est votre question ?`,
        choices: [
          '❓ Comment y jouer ?',
          '👥 C\'est pour qui ?',
          '💝 Quels bénéfices ?',
          '📦 Livraison et prix',
          '✍️ Question libre'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'conversational_questions' as ConversationStep,
          flags: { conversationalMode: true, questionMode: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Traiter la sélection de quantité (similaire à l'express mais plus détendu)
    return this.handleExpressQuantity(sessionId, input, orderState);
  }

  private async handleConversationalQuestions(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    // Déléguer à l'IA pour répondre aux questions
    return await this.aiResponseHandler.handleFreeTextMessage({
      productId: orderState.data.productId!,
      productName: await this.getProductName(orderState.data.productId),
      sessionId,
      isExpressMode: false,
      currentStep: 'conversational_questions',
      userMessage: input,
      conversationHistory: []
    });
  }

  private async handleConversationalContact(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    // Utiliser la méthode express mais avec un ton plus détendu
    return this.handleExpressContact(sessionId, input, orderState);
  }

  private async getProductName(productId?: string): Promise<string> {
    if (!productId) return 'le jeu';
    
    try {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      
      return product?.name || 'le jeu';
    } catch {
      return 'le jeu';
    }
  }

  // ==========================================
  // ✅ GESTION DES ACTIONS POST-ACHAT
  // ==========================================

  /**
   * ✅ NOUVELLE MÉTHODE: Gérer les actions post-achat avec suivi de commande
   */
  async handlePostPurchaseActions(sessionId: string, message: string): Promise<ChatMessage> {
    console.log('📦 Handling post-purchase action:', message);

    try {
      // ✅ SUIVI DE COMMANDE - Nouveau système
      if (message.includes('Suivre ma commande') || message.includes('🔍')) {
        return this.orderTrackingService.createTrackingMessage(sessionId);
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

      // ✅ Créer un affichage enrichi des produits
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

  // ==========================================
  // ✅ MÉTHODES DE GESTION DES CLIENTS
  // ==========================================

  /**
   * ✅ MÉTHODE: Rechercher un client existant
   */
  async findExistingCustomer(phone: string): Promise<any | null> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error || !customer) {
        return null;
      }

      return customer;
    } catch (error) {
      console.error('❌ Error finding existing customer:', error);
      return null;
    }
  }

  /**
   * ✅ MÉTHODE: Sauvegarder un nouveau client
   */
  async saveNewCustomer(customerData: {
    first_name: string;
    last_name: string;
    phone: string;
    city: string;
    address: string;
    email?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving new customer:', error);
        return false;
      }

      console.log('✅ New customer saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in saveNewCustomer:', error);
      return false;
    }
  }

  // ==========================================
  // ✅ MÉTHODES DE RECOMMANDATIONS
  // ==========================================

  /**
   * ✅ MÉTHODE: Obtenir des recommandations de produits
   */
  async getProductRecommendations(
    currentProductId: string,
    customerProfile?: any
  ): Promise<any[]> {
    try {
      // Récupérer des produits similaires ou complémentaires
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('id', currentProductId)
        .limit(3);

      if (error || !products) {
        return [];
      }

      // Ajouter un score de recommandation basique
      return products.map(product => ({
        ...product,
        recommendationScore: Math.random() * 0.5 + 0.5, // Score entre 0.5 et 1.0
        reason: 'Complémentaire à votre choix'
      }));

    } catch (error) {
      console.error('❌ Error getting product recommendations:', error);
      return [];
    }
  }

  // ==========================================
  // ✅ MÉTHODES DE STATISTIQUES ET MONITORING
  // ==========================================

  /**
   * ✅ MÉTHODE: Obtenir les statistiques de session
   */
  getSessionStats(): {
    activeSessions: number;
    totalOrders: number;
    averageConversionTime: number;
  } {
    return {
      activeSessions: this.orderStates.size,
      totalOrders: Array.from(this.orderStates.values()).filter(state => 
        state.flags.paymentInitiated
      ).length,
      averageConversionTime: 0 // À implémenter avec de vraies données
    };
  }

  /**
   * ✅ MÉTHODE: Nettoyer les sessions expirées
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    let cleaned = 0;
    for (const [sessionId, orderState] of this.orderStates.entries()) {
      // Vérifier si la session est trop ancienne (logique simplifiée)
      if (sessionId.includes('_')) {
        const timestamp = parseInt(sessionId.split('_')[2] || '0');
        if (now - timestamp > maxAge) {
          this.orderStates.delete(sessionId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
  }

  // ==========================================
  // ✅ MÉTHODES DE RÉCUPÉRATION D'ERREURS
  // ==========================================

  /**
   * ✅ MÉTHODE: Récupérer une session après erreur
   */
  async recoverFromError(sessionId: string, errorContext: string): Promise<ChatMessage> {
    console.log('🔧 Attempting error recovery for session:', sessionId, errorContext);

    try {
      // Essayer de récupérer l'état depuis la base
      const recoveredState = await this.recoverSessionFromDatabase(sessionId);
      
      if (recoveredState) {
        this.orderStates.set(sessionId, recoveredState);
        
        return {
          type: 'assistant',
          content: `🔧 **Session récupérée !**

J'ai retrouvé votre session précédente. Nous pouvons continuer là où nous nous sommes arrêtés.

Que souhaitez-vous faire ?`,
          choices: [
            '▶️ Continuer ma commande',
            '🔄 Recommencer',
            '❓ Poser une question',
            '📞 Contacter le support'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'session_recovered' as ConversationStep,
            flags: { sessionRecovered: true }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        return this.createErrorMessage(sessionId, 'Impossible de récupérer votre session. Veuillez recommencer.');
      }

    } catch (error) {
      console.error('❌ Error in recovery attempt:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la récupération de session');
    }
  }

  // ==========================================
  // ✅ POINT D'ENTRÉE PRINCIPAL (MÉTHODE FACTORY)
  // ==========================================

  /**
   * ✅ MÉTHODE FACTORY: Point d'entrée principal pour tous les messages
   */
  async processMessage(
    sessionId: string,
    message: string,
    context: {
      productId?: string;
      currentStep?: ConversationStep;
      isChoice?: boolean;
      orderData?: any;
    } = {}
  ): Promise<ChatMessage> {
    console.log('🎯 Processing message via main entry point:', { 
      sessionId: sessionId.substring(0, 10) + '...', 
      message: message.substring(0, 50),
      context 
    });

    try {
      // Nettoyer les sessions expirées périodiquement
      if (Math.random() < 0.1) { // 10% de chance
        this.cleanupExpiredSessions();
      }

      const { productId, currentStep, isChoice = false } = context;

      // Router selon le type de message
      if (isChoice && productId) {
        return await this.handlePredefinedChoice(sessionId, message, productId);
      } else if (currentStep?.includes('express')) {
        return await this.handleExpressStep(sessionId, message, currentStep);
      } else if (currentStep?.includes('conversational')) {
        return await this.handleConversationalStep(sessionId, message, currentStep);
      } else {
        return await this.processUserInput(sessionId, message, currentStep);
      }

    } catch (error) {
      console.error('❌ Critical error in main message processing:', error);
      return await this.recoverFromError(sessionId, 'main_processing_error');
    }
  }
}