// src/lib/services/ChatService.ts
import { supabase } from '@/lib/supabase';
import { AIManager } from '@/lib/services/AIManager';
import { ChatFlowManager } from '@/lib/services/ChatFlowManager';
import { generateUUID } from '@/utils/uuid';
import type { 
  MessageType,
  ChatMessage,
  ConversationStep,
  ChatAction,
  BaseMessageContent,
  SavedMessage,
  CustomerMessage,
  AIResponse,
  OrderData as ChatOrderData,
  PartialOrderUpdate,
  CreateResponseOptions,
  MessageMetadataHelper,
  MessageMetadata,
  ProductId,
  MessageFlags
} from '@/types/chat';

// Importations depuis types/order
import type {
  OrderData,
  OrderMetadata,
  OrderItem,
  PaymentProvider,
  AbandonedCart,
  AbandonedCartMetadata,
  ProductRecommendation,
  RecommendationContext
} from '@/types/order';

import { RealtimeChannel } from '@supabase/supabase-js';
import { OrderPaymentService } from '@/lib/services/OrderPaymentService';
import { OrderService } from '@/lib/services/OrderService';
import { QuantityService } from '@/lib/services/QuantityService';
import { PhoneService } from '@/lib/services/PhoneService';
import { RecommendationService } from '@/lib/services/recommendation.service';
import { PaymentFlowService } from '@/lib/services/PaymentFlowService';
import { getProductImages, generateImageProps } from '@/utils/image';
import { incrementMessageCount } from '@/utils/db-helpers';

type StepMessages = {
  'collect_name': string;
  'collect_city': string;
  'collect_address': string;
  'collect_phone': string;
  'collect_has_email': string;
  'collect_email': string;
  'collect_quantity': string;
  'order_summary': string;
  'initial': string;
  [key: string]: string;
};

type StepChoices = {
  'collect_has_email': string[];
  'order_summary': string[];
  'payment_method': string[];
  'initial': string[];
  [key: string]: string[];
};

interface TemplateVariables {
  product_name?: string;
  first_name?: string;
  city?: string;
  price?: string;
  quantity?: string;
  total?: string;
  delivery_cost?: string;
  [key: string]: string | undefined;
}

interface ExtendedOrderMetadata extends OrderMetadata {
  customerInfo?: {
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string;
  };
  shippingInfo?: {
    city?: string;
    address?: string;
    deliveryCost?: number;
  };
  orderInfo?: {
    quantity?: number;
    totalPrice?: number;
  };
  currentStep?: ConversationStep;
  nextStep?: ConversationStep;
}

interface ChatbotSettings {
  id: string;
  bot_name: string;
  bot_role: string;
  welcome_message: string;
  initial_message_template: string;
  avatar_url?: string;
  primary_color: string;
  is_active: boolean;
}

interface SafeMetadata {
  nextStep?: ConversationStep;
  flags: Record<string, any>;
  timestamp: string;
  orderData?: any;
  showQuantitySelector?: boolean;
  maxQuantity?: number;
  selectedProductId?: string;
  recommendations?: any[];
  assistant?: {
    name: string;
    title: string;
    avatar?: string;
  };
  choices?: string[];
  [key: string]: any; 
}



const DEFAULT_SETTINGS = {
  id: 'default',
  bot_name: 'Rose',
  bot_role: 'Assistante d\'achat',
  welcome_message: 'Bonjour ! Je suis Rose, votre Assistante d\'achat',
  initial_message_template: 'Bonjour ! Je suis {bot_name}, votre {bot_role}. Je vois que vous vous intéressez à {product_name}. Comment puis-je vous aider ?',
  primary_color: '#FF7E93',
  is_active: true
};

export class ChatService {
  private static instance: ChatService | null = null;
  private messageCache: Map<string, ChatMessage[]>;
  private orderDataCache: Map<string, OrderData>;
  private subscriptions: Map<string, RealtimeChannel>;
  private settings: ChatbotSettings;
  private predefinedMessages: Map<string, any[]>;
  private flowManager: ChatFlowManager;
  private aiManager: AIManager;
  private orderPaymentService: OrderPaymentService;
  private quantityService: QuantityService;
  private paymentFlowService: PaymentFlowService;
  private predefinedChoices: string[] = [
    'Je veux en savoir plus',
    'Je veux l\'acheter maintenant',
    'Comment y jouer ?',
    'Je veux voir les témoignages'
  ];
  
  // Déclarer explicitement la propriété avec son type et une valeur par défaut
  protected currentProductId: string | null = null;
  protected currentCategory: string | null = null;

  private constructor() {
    this.messageCache = new Map();
    this.orderDataCache = new Map();
    this.subscriptions = new Map();
    this.predefinedMessages = new Map();
    this.settings = DEFAULT_SETTINGS;
    this.currentProductId = null;
    this.currentCategory = null;
    this.aiManager = AIManager.getInstance();
    this.flowManager = ChatFlowManager.getInstance();
    this.orderPaymentService = OrderPaymentService.getInstance();
    this.quantityService = QuantityService.getInstance();
    this.paymentFlowService = PaymentFlowService.getInstance();
  }

  private ensureChatOrderData(data: Partial<OrderData> | undefined): Partial<ChatOrderData> {
    if (!data) return {};
    
    // Conversion explicite du formStep en ConversationStep si nécessaire
    const { formStep, ...rest } = data;
    return {
      ...rest,
      formStep: formStep as ConversationStep
    };
  }

  // Méthode utilitaire pour garantir des métadonnées valides
  private ensureValidMetadata(metadata: any = {}): OrderMetadata {
    const timestamp = new Date().toISOString();
    
    // S'assurer que la source est toujours une chaîne non-vide
    // C'est la principale erreur à corriger ici
    const source = metadata?.source || 'chatbot';
    
    return {
      source: source, // Obligatoire et non undefined
      storeId: metadata?.storeId || '',
      productId: metadata?.productId || this.getCurrentProductId() || '',
      conversationId: metadata?.conversationId || '',
      createdAt: metadata?.createdAt || timestamp,
      updatedAt: timestamp,
      conversationHistory: metadata?.conversationHistory || [],
      // Préserver les autres champs personnalisés en tout sécurité
      ...(metadata || {}),
      // Garantir que flags existe
      flags: {
        ...(metadata?.flags || {})
      }
    };
  }

  // Méthode auxiliaire pour créer une metadata valide
  private createMetadata(
    existingMetadata: any = {},
    additionalData: any = {}
  ): OrderMetadata {
    const timestamp = new Date().toISOString();
    
    return {
      source: existingMetadata?.source || 'chatbot', // Toujours définir source
      storeId: existingMetadata?.storeId || '',
      productId: existingMetadata?.productId || this.getCurrentProductId() || '',
      conversationId: existingMetadata?.conversationId || '',
      createdAt: existingMetadata?.createdAt || timestamp,
      updatedAt: timestamp,
      conversationHistory: existingMetadata?.conversationHistory || [],
      ...additionalData,
      flags: {
        ...(existingMetadata?.flags || {}),
        ...(additionalData?.flags || {})
      }
    };
  }

  protected getCurrentProductId(): string {
    try {
      // 1. Vérifier d'abord le currentProductId en mémoire
      if (this.currentProductId) {
        return this.currentProductId;
      }
  
      // 2. Vérifier dans le cache local
      const cachedId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentProductId') : null;
      if (cachedId) {
        this.currentProductId = cachedId;
        return cachedId;
      }
  
      // 3. Parcourir les conversations en cache
      if (this.messageCache.size > 0) {
        for (const [, messages] of Array.from(this.messageCache.entries())) {
          for (const message of messages) {
            if (message.metadata?.productContext) {
              try {
                const context = typeof message.metadata.productContext === 'string' 
                  ? JSON.parse(message.metadata.productContext)
                  : message.metadata.productContext;
                
                if (context.productId) {
                  this.currentProductId = context.productId;
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('currentProductId', context.productId);
                  }
                  return context.productId;
                }
              } catch (e) {
                console.warn('Error parsing product context:', e);
              }
            }
          }
        }
      }
  
      // 4. Parcourir les données de commande en cache
      if (this.orderDataCache.size > 0) {
        for (const orderData of Array.from(this.orderDataCache.values())) {
          if (orderData?.metadata?.productId) {
            this.currentProductId = orderData.metadata.productId;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('currentProductId', orderData.metadata.productId);
            }
            return orderData.metadata.productId;
          }
        }
      }
  
      // Retourner un ID par défaut si rien d'autre n'est trouvé
      return 'default-product-id';
    } catch (error) {
      console.error('Error in getCurrentProductId:', error);
      return 'default-product-id';
    }
  }
  
  protected setCurrentProductId(productId: string | null): void {
    if (!productId) {
      console.warn('Attempting to set null productId');
      return;
    }
    this.currentProductId = productId;
  }

  async initializeConversation(
    productId: string,
    storeId: string
  ): Promise<{ 
    sessionId: string; 
    initialMessage: ChatMessage;
  }> {
    try {
      console.log('Initializing conversation:', { productId, storeId });

      if (!productId || !storeId) {
        throw new Error('Product ID and Store ID are required');
      }

      this.setCurrentProductId(productId);
      localStorage.setItem('currentProductId', productId);

      await this.loadChatbotConfig(storeId);
      await this.loadPredefinedMessages(storeId);

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, description, price, category, images, game_rules')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        throw new Error(`Error fetching product: ${productError.message}`);
      }

      if (!product) {
        console.error('Product not found:', productId);
        throw new Error('Product not found');
      }

      const sessionId = generateUUID();
      const timestamp = new Date().toISOString();

      // Créer l'objet orderData initial
      const initialOrderData: Partial<OrderData> = {
        session_id: sessionId,
        items: [{
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price,
          image: product.images?.[0] || null
        }],
        status: 'pending',
        paymentStatus: 'pending',
        total_amount: product.price,
        delivery_cost: 0,
        first_name: '',
        last_name: '',
        city: '',
        address: '',
        phone: '',
        metadata: this.ensureValidMetadata({
          source: 'chatbot',
          storeId,
          productId,
          conversationId: sessionId,
          createdAt: timestamp,
          updatedAt: timestamp,
          conversationHistory: [],
          buyingIntent: 0,
          orderInfo: {
            quantity: 1,
            totalPrice: product.price,
            subtotal: product.price
          }
        })
      };

      // Créer la metadata du panier
      const cartMetadata: AbandonedCartMetadata = {
        orderData: initialOrderData,
        source: 'chatbot',
        storeId,
        productId,
        conversationId: sessionId,
        createdAt: timestamp,
        updatedAt: timestamp,
        conversationHistory: [],
        lastUpdate: timestamp
      };

      // Créer le panier abandonné
      const abandonedCartData: Partial<AbandonedCart> = {
        id: sessionId,
        product_id: productId,
        first_name: '',
        last_name: '',
        email: undefined,
        phone: '',
        city: '',
        address: '',
        cart_stage: 'initial',
        last_active_at: timestamp,
        converted_to_order: false,
        metadata: cartMetadata
      };

      // Créer la conversation
      const conversationData = {
        id: sessionId,
        product_id: productId,
        store_id: storeId,
        status: 'active',
        metadata: {
          step: 'initial' as ConversationStep,
          messageCount: 0,
          createdAt: timestamp,
          productContext: {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category || null
          }
        }
      };

      // Effectuer les insertions en parallèle, uniquement pour abandoned_carts et conversations
      const [cartResult, convResult] = await Promise.all([
        supabase
          .from('abandoned_carts')
          .upsert([abandonedCartData], {
            onConflict: 'id',
            ignoreDuplicates: false
          }),
        supabase
          .from('conversations')
          .upsert([conversationData], {
            onConflict: 'id',
            ignoreDuplicates: false
          })
      ]);

      if (cartResult.error) {
        console.error('Error creating abandoned cart:', cartResult.error);
        throw new Error(`Failed to create abandoned cart: ${cartResult.error.message}`);
      }

      if (convResult.error) {
        console.error('Error creating conversation:', convResult.error);
        throw new Error(`Failed to create conversation: ${convResult.error.message}`);
      }

      // Créer le message initial
      const initialMessage: ChatMessage = {
        type: 'assistant',
        content: this.replaceVariables(this.settings.initial_message_template, {
          bot_name: this.settings.bot_name,
          bot_role: this.settings.bot_role,
          product_name: product.name
        }),
        choices: await this.getInitialChoices(storeId),
        assistant: {
          name: this.settings.bot_name,
          title: this.settings.bot_role,
          avatar: this.settings.avatar_url
        },
        metadata: {
          nextStep: 'initial' as ConversationStep,
          productContext: JSON.stringify({
            productId,
            productName: product.name,
            productCategory: product.category || null
          }),
          buyingIntent: 0,
          orderData: {
            ...initialOrderData,
            formStep: 'initial' as ConversationStep
          } as Partial<ChatOrderData>,
          messageHandled: true
        },
        timestamp: timestamp
      };

      return {
        sessionId,
        initialMessage
      };

    } catch (error) {
      console.error('Error in initializeConversation:', error);
      throw error;
    }
  }

  // Nouvelle méthode pour créer une conversation lors d'une question libre
  private async createConversation(
    sessionId: string,
    productId: string,
    storeId: string,
    userMessage: string
  ): Promise<string> {
    try {
      // Créer la conversation uniquement si c'est une question libre
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          id: sessionId.replace('temp_', ''), // Nouveau ID permanent
          product_id: productId,
          store_id: storeId,
          status: 'active',
          metadata: {
            step: 'initial',
            firstMessage: userMessage,
            messageCount: 1,
            createdAt: new Date().toISOString(),
            productContext: JSON.stringify({
              productId,
              conversationType: 'purchase'
            })
          }
        })
        .select()
        .single();
  
      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }
  
      // Initialiser le panier abandonné
      const orderService = OrderService.getInstance();
      await orderService.initializeCart(conversation.id, productId, storeId);
  
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  private async getConversation(sessionId: string) {
    try {
      // On vérifie d'abord si l'ID est temporaire
      const isTemp = sessionId.startsWith('xxxxxxxx');

      // Si c'est un ID temporaire, on retourne une structure minimale
      if (isTemp) {
        return {
          product_id: this.currentProductId,
          metadata: {
            step: 'initial',
            messageCount: 0
          }
        };
      }

      // Sinon, on cherche la conversation dans la base de données
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('product_id, metadata')
        .eq('id', sessionId)
        .maybeSingle();

      // Si pas de conversation trouvée mais qu'on a un currentProductId
      if (!conversation && this.currentProductId) {
        return {
          product_id: this.currentProductId,
          metadata: {
            step: 'initial',
            messageCount: 0
          }
        };
      }

      if (error) {
        console.error('Error fetching conversation:', error);
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      return conversation;
    } catch (error) {
      console.error('Error in getConversation:', error);
      // On retourne une structure minimale si on a au moins le productId
      if (this.currentProductId) {
        return {
          product_id: this.currentProductId,
          metadata: {
            step: 'initial',
            messageCount: 0
          }
        };
      }
      throw new Error('Conversation not found');
    }
  }

  private processMessage(message: ChatMessage, currentStep: ConversationStep): boolean {
    // Vérifier si le message a déjà été traité pour cette étape spécifique
    if (message.metadata?.flags?.[`${currentStep}_processed`]) {
      console.log(`Message already processed for step ${currentStep}, skipping duplicate processing`);
      return false;
    }

    // Ajouter des flags plus spécifiques
    if (message.metadata) {
      message.metadata.messageHandled = true;
      message.metadata.flags = {
        ...message.metadata.flags,
        [`${currentStep}_processed`]: true,
        lastProcessedStep: currentStep,
        handledAt: new Date().toISOString()
      };
    } else {
      message.metadata = { 
        messageHandled: true,
        flags: { 
          [`${currentStep}_processed`]: true,
          lastProcessedStep: currentStep,
          handledAt: new Date().toISOString()
        }
      };
    }

    return true;
  }

  private debugAIIntervention(message: string, context: any) {
    console.log(`[AI INTERVENTION DEBUG] ${message}`, {
      timestamp: new Date().toISOString(),
      ...context,
      stack: new Error().stack?.split('\n').slice(1, 5).join('\n')
    });
  }

  async handleUserMessage(
    sessionId: string,
    content: string,
    currentStep: ConversationStep,
    orderData: Partial<ChatOrderData> = {}
  ): Promise<ChatMessage[]> {
    try {
      // Ajouter des logs pour tracer le processus
      console.log(`[handleUserMessage] Processing message: "${content}" at step: ${currentStep}`);
      console.log(`[handleUserMessage] Order data flags:`, orderData.metadata?.flags);
  
      // Vérifier pour éviter les appels récursifs infinis
      if (orderData.metadata?.flags?.preventRecursion) {
        console.log('[handleUserMessage] Detected recursion prevention flag, processing directly');
        // Supprimer le flag pour les futures interactions
        if (orderData.metadata && orderData.metadata.flags) {
          delete orderData.metadata.flags.preventRecursion;
        }
        
        // Traiter le message de manière basique
        // Créer le message utilisateur une seule fois
        const userMessage: ChatMessage = {
          type: 'user',
          content,
          timestamp: new Date().toISOString(),
          metadata: {
            flags: {
              ...(orderData.metadata?.flags || {}),
              messageCreatedAt: new Date().toISOString()
            }
          }
        };
        
        // Sauvegarder le message utilisateur
        await this.saveMessage(sessionId, userMessage);
        
        // Retourner une réponse générique de secours
        const safeResponse: ChatMessage = {
          type: 'assistant',
          content: "Je vais continuer avec votre processus d'achat. Merci de suivre les instructions à l'écran.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: currentStep,
            orderData,
            messageHandled: true,
            flags: {
              preventAIIntervention: true,
              inPurchaseFlow: true
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await this.saveMessage(sessionId, safeResponse);
        return [safeResponse];
      }
  
      // Vérifier si nous sommes en mode express
      const isExpressMode = orderData.metadata?.flags?.expressMode === true ||
                           currentStep.startsWith('express_');
      
      if (isExpressMode) {
        console.log('[handleUserMessage] Detected express mode, redirecting to express handler');
        try {
          return await this.handleUserMessageExpress(sessionId, content, currentStep, orderData);
        } catch (expressError) {
          console.error('[handleUserMessage] Error in express flow, falling back to standard flow:', expressError);
          // Ne pas réessayer express si ça a échoué - continuer avec le flux standard
        }
      }
    
      // Récupérer d'abord la conversation
      const conversation = await this.getConversation(sessionId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
    
      // Créer le message utilisateur une seule fois
      const userMessage: ChatMessage = {
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            ...(orderData.metadata?.flags || {}),
            messageCreatedAt: new Date().toISOString()
          }
        }
      };
    
      // Vérification explicite des flags de flow d'achat
      const inPurchaseFlow = 
        orderData.metadata?.flags?.inPurchaseFlow === true || 
        orderData.metadata?.flags?.preventAIIntervention === true ||
        userMessage.metadata?.flags?.inPurchaseFlow === true ||
        userMessage.metadata?.flags?.preventAIIntervention === true;
    
      // Si nous sommes dans un flow d'achat, propager les flags avec priorité
      if (inPurchaseFlow) {
        console.log("[handleUserMessage] Purchase flow detected, ensuring flags are set");
        
        // S'assurer que le message utilisateur a les bons flags
        if (userMessage.metadata) {
          userMessage.metadata.flags = {
            ...(userMessage.metadata.flags || {}),
            inPurchaseFlow: true,
            preventAIIntervention: true
          };
        }
        
        // S'assurer que orderData a les bons flags
        if (orderData.metadata) {
          orderData.metadata.flags = {
            ...(orderData.metadata.flags || {}),
            inPurchaseFlow: true,
            preventAIIntervention: true
          };
        } else {
          orderData.metadata = this.ensureValidMetadata({
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          });
        }
      }
    
      // Mettre à jour le productId si nécessaire
      if (!this.currentProductId && conversation.product_id) {
        this.setCurrentProductId(conversation.product_id);
      } else if (!this.currentProductId && orderData.metadata?.productId) {
        this.setCurrentProductId(orderData.metadata.productId);
      }
    
      if (!this.getCurrentProductId()) {
        throw new Error('Product ID not initialized. Please reload the page.');
      }
    
      // Délai simulé pour éviter les réponses trop rapides
      await new Promise(resolve => setTimeout(resolve, 800));
    
      // Vérifier si le sessionId est temporaire
      if (sessionId.startsWith('temp_')) {
        const newSessionId = await this.createConversation(
          sessionId,
          this.getCurrentProductId(),
          orderData.metadata?.storeId || '',
          content
        );
        if (newSessionId !== sessionId) {
          await this.updateSessionId(sessionId, newSessionId);
          sessionId = newSessionId;
        }
      }
    
      // Vérifier si le message est déjà traité
      if (!this.processMessage(userMessage, currentStep)) {
        return [];
      }
    
      // Déplacer la sauvegarde du message utilisateur ici 
      await this.saveMessage(sessionId, userMessage);
    
      // Gérer les étapes spécifiques du nouveau flow d'achat
      // ====================================================
      
      // Étape de choix du flow (standard ou express)
      if (currentStep === 'choose_flow') {
        return await this.handleFlowChoice(sessionId, content, orderData);
      }
      
      // Gérer l'étape 'check_existing' pour les clients existants
      if (currentStep === 'check_existing') {
        const response = await this.handleDataCollection(
          sessionId,
          currentStep,
          content,
          this.getCurrentProductId()
        );
        
        if (response) {
          await this.saveMessage(sessionId, response);
          return [response];
        }
      }
    
      // Gérer l'étape 'collect_email_opt'
      if (currentStep === 'collect_email_opt') {
        const response = await this.handleDataCollection(
          sessionId,
          currentStep,
          content,
          this.getCurrentProductId()
        );
        
        if (response) {
          await this.saveMessage(sessionId, response);
          return [response];
        }
      }
    
      // Gérer l'étape 'recommend_products'
      if (currentStep === 'recommend_products') {
        const wantsRecommendations = content.toLowerCase().includes('oui');
        
        if (wantsRecommendations) {
          // Récupérer les recommandations
          const recommendations = await this.getAvailableProducts(this.getCurrentProductId());
          
          if (recommendations.length > 0) {
            // Limiter à 2 recommandations
            const limitedRecommendations = recommendations.slice(0, 2);
            
            // Mettre à jour l'étape
            await this.moveToStep(sessionId, 'select_product');
            
            // Créer un message avec les recommandations
            const contentText = limitedRecommendations.map((rec, i) => {
              const priceText = rec.price ? `${rec.price.toLocaleString()} FCFA` : '';
              return `${i + 1}. ${rec.name} - ${priceText}\n${rec.reason || 'Un excellent jeu pour renforcer vos relations!'}`;
            }).join('\n\n');
            
            const updatedOrderData = {
              ...orderData,
              metadata: this.ensureValidMetadata({
                ...orderData.metadata,
                flags: {
                  ...(orderData.metadata?.flags || {}),
                  recommendationsShown: true,
                  inPurchaseFlow: true,
                  preventAIIntervention: true
                }
              })
            };
            
            await this.saveProgress(sessionId, 'select_product', updatedOrderData);
            
            const response: ChatMessage = {
              type: 'assistant',
              content: `Voici d'autres jeux qui pourraient vous intéresser :\n\n${contentText}`,
              choices: limitedRecommendations.map(rec => rec.name),
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'select_product' as ConversationStep,
                recommendations: limitedRecommendations,
                orderData: updatedOrderData,
                messageHandled: true,
                flags: {
                  inPurchaseFlow: true,
                  preventAIIntervention: true
                }
              },
              timestamp: new Date().toISOString()
            };
            
            await this.saveMessage(sessionId, response);
            return [response];
          }
        }
        
        // Pas de recommandations ou non souhaité, aller au récapitulatif
        await this.moveToStep(sessionId, 'order_summary');
        
        const updatedOrderData = {
          ...orderData,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            flags: {
              ...(orderData.metadata?.flags || {}),
              recommendationsSkipped: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          })
        };
        
        await this.saveProgress(sessionId, 'order_summary', updatedOrderData);
        
        const response: ChatMessage = {
          type: 'assistant',
          content: await this.generateOrderSummary(sessionId),
          choices: ["C'est correct", "Je veux modifier"],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'order_summary' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await this.saveMessage(sessionId, response);
        return [response];
      }
    
      // Gérer les étapes de création de compte post-achat
      if (currentStep === 'create_account' || 
          currentStep === 'create_account_email' || 
          currentStep === 'create_account_password' || 
          currentStep === 'post_purchase') {
        
        const postPurchaseResponses = await this.handlePostPayment(sessionId, content, orderData);
        for (const msg of postPurchaseResponses) {
          await this.saveMessage(sessionId, msg);
        }
        return postPurchaseResponses;
      }
      
      // ====================================================
      // Fin des nouvelles étapes spécifiques
    
      // Détecter les demandes d'achat de produits
      const buyProductPattern = /je veux aussi acheter|ajouter à mon panier|ajouter au panier/i;
      if (buyProductPattern.test(content)) {
        // Extraire le nom du produit
        const productNameMatch = content.match(/acheter\s+(.+)$/) || 
                              content.match(/ajouter\s+(.+)(\s+à|\s+au)/);
        
        if (productNameMatch && productNameMatch[1]) {
          const productName = productNameMatch[1].trim();
          
          // Récupérer les recommandations du dernier message
          const messageMetadata = await this.getCurrentMessageMetadata(sessionId);
          const recommendations = messageMetadata?.recommendations as ProductRecommendation[];
          
          if (recommendations) {
            // Chercher le produit dans les recommandations
            const selectedProduct = recommendations.find(rec => 
              rec.name.toLowerCase() === productName.toLowerCase() ||
              productName.toLowerCase().includes(rec.name.toLowerCase())
            );
            
            if (selectedProduct) {
              // Créer un message utilisateur sans traitement IA
              await this.saveMessage(sessionId, {
                type: 'user',
                content,
                timestamp: new Date().toISOString(),
                metadata: {
                  flags: {
                    inPurchaseFlow: true,
                    preventAIIntervention: true
                  }
                }
              });
              
              // Créer directement une réponse pour la quantité
              const response: ChatMessage = {
                type: 'assistant',
                content: `Excellent choix ! Combien d'exemplaires de "${selectedProduct.name}" souhaitez-vous ajouter ?`,
                choices: [],
                assistant: this.getBotInfo(),
                metadata: {
                  nextStep: 'additional_quantity' as ConversationStep,
                  showQuantitySelector: true,
                  maxQuantity: 10,
                  selectedProductId: selectedProduct.productId,
                  orderData: orderData || undefined,
                  messageHandled: true,
                  flags: {
                    inPurchaseFlow: true,
                    preventAIIntervention: true
                  }
                },
                timestamp: new Date().toISOString()
              };
              
              await this.saveMessage(sessionId, response);
              return [response];
            }
          }
        }
      }
    
      // Si nous sommes dans une étape du flow d'achat ou c'est un choix de bouton pour les étapes spécifiques
      const shouldPreventAIIntervention = 
        inPurchaseFlow || 
        currentStep.startsWith('collect_') || 
        ['check_existing', 'add_other_products', 'select_product', 
         'additional_quantity', 'add_product_choice', 'add_notes', 
         'save_note', 'order_summary', 'payment_method', 'payment_processing'].includes(currentStep) ||
        this.predefinedChoices.includes(content) ||
        orderData.metadata?.flags?.preventAIIntervention === true ||
        userMessage.metadata?.flags?.preventAIIntervention === true;
  
      if (shouldPreventAIIntervention) {
        this.debugAIIntervention("Using structured flow handler", {
          currentStep,
          content,
          shouldPreventAIIntervention
        });
        
        // Gérer explicitement les choix de "Oui, je veux bien" et "Non, juste celui-là"
        if (['Oui, je veux bien', 'Non, juste celui-là'].includes(content) && 
            currentStep === 'add_other_products') {
          console.log('Handling product addition choice:', content);
          const productsResponse = await this.handleAdditionalProducts(
            sessionId,
            currentStep,
            content
          );
          
          if (productsResponse) {
            await this.saveMessage(sessionId, productsResponse);
            return [productsResponse];
          }
        }
    
        // Gérer explicitement les choix pour add_notes
        if (['Oui, je veux bien', 'Non, pas la peine'].includes(content) && 
            currentStep === 'add_notes') {
          console.log('Handling note addition choice:', content);
          const noteResponse = await this.handleNoteManagement(
            sessionId,
            content,
            currentStep,
            orderData
          );
          
          if (noteResponse) {
            await this.saveMessage(sessionId, noteResponse);
            return [noteResponse];
          }
        }
    
        // Gestion des étapes de paiement
        if (currentStep === 'payment_method') {
          const paymentResponse = await this.handlePaymentMethod(sessionId, content, orderData);
          for (const message of paymentResponse) {
            await this.saveMessage(sessionId, message);
          }
          return paymentResponse;
        }
        
        if (currentStep === 'payment_processing') {
          const confirmationResponse = await this.handlePaymentProcessing(sessionId, content, orderData);
          for (const message of confirmationResponse) {
            await this.saveMessage(sessionId, message);
          }
          return confirmationResponse;
        }
    
        if (currentStep === 'payment_complete') {
          // Gestion post-paiement
          const postPaymentResponse = await this.handlePostPayment(sessionId, content, orderData);
          for (const message of postPaymentResponse) {
            await this.saveMessage(sessionId, message);
          }
          return postPaymentResponse;
        }
    
        // Gérer la collecte du numéro de téléphone
        if (currentStep === 'collect_phone') {
          return await this.handlePhoneCollection(sessionId, content, orderData);
        }
    
        // Gérer la sélection d'un produit recommandé
        if (currentStep === 'select_product') {
          // Vérifier si le message est un nom de produit des recommandations
          const messageMetadata = await this.getCurrentMessageMetadata(sessionId);
          const recommendations = messageMetadata?.recommendations as ProductRecommendation[];
          
          if (recommendations && recommendations.some(rec => 
              rec.name.toLowerCase() === content.toLowerCase())) {
            const response = await this.handleAdditionalProducts(sessionId, currentStep, content);
            if (response) {
              await this.saveMessage(sessionId, response);
              return [response];
            }
          }
        }
    
        // Gérer la quantité pour un produit recommandé
        if (currentStep === 'additional_quantity') {
          const quantity = parseInt(content);
          if (!isNaN(quantity) && quantity > 0 && quantity <= 10) {
            const response = await this.handleAdditionalProducts(sessionId, currentStep, content);
            if (response) {
              await this.saveMessage(sessionId, response);
              return [response];
            }
          }
        }
    
        // Gérer le choix après ajout de produit
        if (currentStep === 'add_product_choice') {
          if (content === 'Valider la commande' || content === 'Ajouter un autre jeu') {
            const response = await this.handleAdditionalProducts(sessionId, currentStep, content);
            if (response) {
              await this.saveMessage(sessionId, response);
              return [response];
            }
          }
        }
    
        // Gérer les étapes add_notes et save_note
        if (currentStep === 'add_notes' || currentStep === 'save_note') {
          const noteResponse = await this.handleNoteManagement(
            sessionId,
            content,
            currentStep,
            orderData
          );
          if (noteResponse) {
            await this.saveMessage(sessionId, noteResponse);
            return [noteResponse];
          }
        }
    
        // Gérer les étapes de collecte de l'ancien et du nouveau flow
        if (currentStep.startsWith('collect_') || 
            ['confirm_address', 'update_address', 'check_existing', 'add_other_products', 'order_summary'].includes(currentStep)) {
          
          let response: ChatMessage[] = [];
    
          switch (currentStep) {
            case 'collect_quantity':
              const quantity = parseInt(content);
              if (!isNaN(quantity) && quantity > 0 && quantity <= 10) {
                const quantityResponse = await this.handleQuantityConfirmation(
                  sessionId,
                  quantity,
                  orderData
                );
                response = [quantityResponse];
              } else {
                const dataResponse = await this.handleDataCollection(
                  sessionId,
                  currentStep,
                  content,
                  this.getCurrentProductId()
                );
                if (dataResponse) {
                  response = [dataResponse];
                }
              }
              break;
    
            case 'collect_has_email':
              const emailResponse = await this.handleEmailResponse(
                sessionId,
                content,
                currentStep,
                orderData
              );
              if (emailResponse) {
                response = [emailResponse];
              }
              break;
    
            case 'add_other_products':
              if (['Oui, je veux bien', 'Non, juste celui-là'].includes(content)) {
                const productsResponse = await this.handleAdditionalProducts(
                  sessionId,
                  currentStep,
                  content
                );
                if (productsResponse) {
                  response = [productsResponse];
                }
              }
              break;
    
            case 'order_summary':
              const orderResponse = await this.handleDataCollection(
                sessionId,
                currentStep,
                content,
                this.getCurrentProductId()
              );
              if (orderResponse) {
                response = [orderResponse];
              }
              break;
    
            default:
              const dataResponse = await this.handleDataCollection(
                sessionId,
                currentStep,
                content,
                this.getCurrentProductId()
              );
              if (dataResponse) {
                response = [dataResponse];
              }
              break;
          }
    
          if (response.length > 0) {
            for (const message of response) {
              await this.saveMessage(sessionId, message);
            }
            return response;
          }
        }
    
        // Double vérification pour éviter l'IA si nous sommes toujours dans le flow d'achat
        if (shouldPreventAIIntervention) {
          this.debugAIIntervention("Still in purchase flow, returning to structured handler", {
            currentStep
          });
          
          // Utiliser un message générique si aucun handler spécifique n'a fonctionné
          const genericResponse: ChatMessage = {
            type: 'assistant',
            content: "Je vais continuer avec votre processus d'achat. Merci de suivre les instructions à l'écran.",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: currentStep,
              orderData,
              messageHandled: true,
              flags: {
                preventAIIntervention: true,
                inPurchaseFlow: true,
                aiOverridden: true
              }
            },
            timestamp: new Date().toISOString()
          };
          
          await this.saveMessage(sessionId, genericResponse);
          return [genericResponse];
        }
      }
    
      // Gérer les choix prédéfinis
      if (this.predefinedChoices.includes(content)) {
        const response = await this.handlePredefinedChoice(sessionId, content);
        await this.saveMessage(sessionId, response[0]);
        return response;
      }
    
      // Dernier check avant d'appeler l'IA
      if (orderData.metadata?.flags?.preventAIIntervention) {
        this.debugAIIntervention("Preventing AI intervention based on flags", {
          currentStep,
          flags: orderData.metadata?.flags
        });
        
        // Retourner une réponse générique et sûre
        const safeResponse: ChatMessage = {
          type: 'assistant',
          content: "Je vais continuer avec votre processus d'achat. Merci de suivre les instructions à l'écran.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: currentStep,
            orderData,
            messageHandled: true,
            flags: {
              preventAIIntervention: true,
              inPurchaseFlow: true,
              aiOverridden: true
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await this.saveMessage(sessionId, safeResponse);
        return [safeResponse];
      }
    
      // Gérer la réponse IA par défaut - atteint seulement si aucun flag preventAIIntervention n'est actif
      const aiResponse = await this.handleAIResponse(
        sessionId,
        content,
        currentStep,
        orderData
      );
    
      for (const message of aiResponse) {
        await this.saveMessage(sessionId, message);
      }
    
      return aiResponse;
    
    } catch (error) {
      console.error('Error in handleUserMessage:', error);
      const errorMessage = this.createErrorMessage();
      await this.saveMessage(sessionId, errorMessage);
      return [errorMessage];
    }
  }

  private async handleExistingCustomer(
    sessionId: string,
    existingCustomer: any,
    updatedOrderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    try {
      const timestamp = new Date().toISOString();
      
      // Créer une metadata valide
      const metadata = this.createMetadata(updatedOrderData.metadata, {
        customerInfo: {
          firstName: existingCustomer.first_name,
          lastName: existingCustomer.last_name,
          fullName: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
          phone: updatedOrderData.phone
        },
        flags: {
          existingCustomerFound: true,
          inPurchaseFlow: true,
          preventAIIntervention: true
        }
      });
      
      // Mettre à jour orderData avec la métadata valide
      const orderDataWithValidMetadata: Partial<ChatOrderData> = {
        ...updatedOrderData,
        metadata
      };
      
      await this.saveProgress(sessionId, 'check_existing', orderDataWithValidMetadata);
      
      return {
        type: 'assistant',
        content: `Ravi de vous revoir ${existingCustomer.first_name}! Nous livrerons à votre adresse habituelle à ${existingCustomer.city}? Ou souhaitez-vous modifier l'adresse?`,
        choices: ['Oui, même adresse', 'Non, nouvelle adresse'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'check_existing' as ConversationStep,
          orderData: orderDataWithValidMetadata,
          messageHandled: true
        },
        timestamp
      };
    } catch (error) {
      console.error('Error in handleExistingCustomer:', error);
      return this.createErrorMessage();
    }
  }
  
  private getCloudinaryUrl(product: any): string {
    try {
      // Cas 1: Si images est un tableau de strings
      if (Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0];
      }
      
      // Cas 2: Si images est une string JSON
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        } catch (e) {
          console.error('Error parsing images JSON:', e);
        }
      }
      
      // Cas 3: Générer une URL Cloudinary fiable
      const cloudName = 'viens-on-s-connait'; // Votre nom Cloudinary
      const productId = product.id || 'default';
      
      // Format standard de Cloudinary
      return `https://res.cloudinary.com/${cloudName}/image/upload/v1/products/${productId}/main`;
    } catch (error) {
      console.error('Error in getCloudinaryUrl:', error);
      return `/products/${product.id || 'default'}/main.jpg`;
    }
  }

  // Implémentation de la nouvelle méthode handlePostPayment
  private async handlePostPayment(
    sessionId: string,
    input: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    try {
      const timestamp = new Date().toISOString();
      // Récupérer l'orderId des métadonnées ou en générer un nouveau
      const orderId = (orderData.metadata as any)?.orderId || 
                     `ORD-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`;
      
      // Vérifier si c'est le premier message post-paiement
      const isFirstPostPaymentMessage = !orderData.metadata?.flags?.postPaymentShown;
      const isNewCustomer = orderData.metadata?.flags?.newCustomer === true;
      
      // Si c'est le premier message post-paiement et que c'est un nouveau client
      if (isFirstPostPaymentMessage && isNewCustomer) {
        // Mettre à jour les flags
        const updatedOrderData = {
          ...orderData,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            flags: {
              ...(orderData.metadata?.flags || {}),
              postPaymentShown: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          })
        };
        
        await this.moveToStep(sessionId, 'create_account');
        await this.saveProgress(sessionId, 'create_account', updatedOrderData);
        
        // Proposer la création de compte
        return [{
          type: 'assistant',
          content: "Pour faciliter vos prochains achats, souhaitez-vous créer un compte? Cela vous permettra de suivre vos commandes et d'accélérer vos futurs achats.",
          choices: ['Oui, créer un compte', 'Pas maintenant, merci'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'create_account' as ConversationStep,
            orderData: updatedOrderData,
            orderId: orderId,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp
        }];
      }
      
      // Gérer la réponse à la proposition de compte
      if (orderData.metadata?.nextStep === 'create_account') {
        if (input.toLowerCase().includes('oui')) {
          // L'utilisateur veut créer un compte
          // Vérifier si nous avons déjà un email
          if (orderData.email) {
            // Demander juste le mot de passe
            return [{
              type: 'assistant',
              content: "Votre email sera utilisé comme identifiant. Veuillez choisir un mot de passe sécurisé:",
              choices: [],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'create_account_password' as ConversationStep,
                orderData,
                orderId: orderId,
                messageHandled: true
              },
              timestamp
            }];
          } else {
            // Demander d'abord l'email
            return [{
              type: 'assistant',
              content: "Pour créer votre compte, j'ai besoin de votre adresse email:",
              choices: [],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'create_account_email' as ConversationStep,
                orderData,
                orderId: orderId,
                messageHandled: true
              },
              timestamp
            }];
          }
        } else {
          // L'utilisateur ne veut pas créer de compte maintenant
          await this.moveToStep(sessionId, 'post_purchase');
          
          // Passer à l'enquête de satisfaction
          const updatedOrderData = {
            ...orderData,
            metadata: this.ensureValidMetadata({
              ...orderData.metadata,
              flags: {
                ...(orderData.metadata?.flags || {}),
                accountCreationSkipped: true,
                inPurchaseFlow: true,
                preventAIIntervention: true
              }
            })
          };
          
          await this.saveProgress(sessionId, 'post_purchase', updatedOrderData);
          
          return [{
            type: 'assistant',
            content: "D'accord, pas de problème ! Comment avez-vous trouvé cette expérience d'achat ?",
            choices: ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'post_purchase' as ConversationStep,
              orderData: updatedOrderData,
              orderId: orderId,
              messageHandled: true,
              flags: {
                inPurchaseFlow: true,
                preventAIIntervention: true
              }
            },
            timestamp
          }];
        }
      }
      
      // Gestion du mot de passe
      if (orderData.metadata?.nextStep === 'create_account_password') {
        // Idéalement, hacher le mot de passe et sauvegarder l'utilisateur
        // Pour cet exemple, nous simulons juste le processus
        
        // Mettre à jour les flags
        const updatedOrderData = {
          ...orderData,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            flags: {
              ...(orderData.metadata?.flags || {}),
              accountCreated: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          })
        };
        
        await this.moveToStep(sessionId, 'post_purchase');
        await this.saveProgress(sessionId, 'post_purchase', updatedOrderData);
        
        // Message de confirmation et passage à l'enquête
        return [{
          type: 'assistant',
          content: "Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter avec votre email et votre mot de passe.\n\nComment avez-vous trouvé cette expérience d'achat ?",
          choices: ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'post_purchase' as ConversationStep,
            orderData: updatedOrderData,
            orderId: orderId,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp
        }];
      }
      
      // Gestion de l'enquête de satisfaction
      if (orderData.metadata?.nextStep === 'post_purchase') {
        // Traiter la notation
        if (input.includes('⭐')) {
          const starCount = (input.match(/⭐/g) || []).length;
          
          // Enregistrer la notation
          const updatedOrderData = {
            ...orderData,
            metadata: this.ensureValidMetadata({
              ...orderData.metadata,
              satisfaction: starCount,
              flags: {
                ...(orderData.metadata?.flags || {}),
                surveyCompleted: true,
                inPurchaseFlow: false,
                preventAIIntervention: false // Désactiver pour revenir au mode conversationnel normal
              }
            })
          };
          
          await this.saveProgress(sessionId, 'initial', updatedOrderData);
          
          // Message de remerciement final
          return [{
            type: 'assistant',
            content: `Merci beaucoup pour votre ${starCount >= 4 ? 'excellente ' : ''}notation ! Votre commande #${orderId} sera préparée rapidement et nous vous contacterons pour la livraison.\n\nC'était un plaisir de vous accompagner dans votre achat. À bientôt chez VIENS ON S'CONNAÎT !`,
            choices: ['Voir d\'autres produits', 'Fermer'],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'initial' as ConversationStep,
              orderData: updatedOrderData,
              messageHandled: true
            },
            timestamp
          }];
        }
      }
      
      // Questions sur la livraison et autres cas - garder le code existant
      if (input.toLowerCase().includes("livr")) {
        return [{
          type: 'assistant',
          content: "Votre commande sera préparée dans les 24 heures ouvrables et livrée dans un délai de 2 à 3 jours, selon votre localisation.\n\n" +
            "Pour les clients à Dakar, la livraison est généralement effectuée sous 48h. Pour les autres régions, comptez 3 à 5 jours.\n\n" +
            "Vous recevrez un SMS de confirmation dès que votre commande sera en route !",
          choices: ['Voir ma commande', 'Autres questions', 'Merci, au revoir'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_complete' as ConversationStep,
            orderData,
            messageHandled: true
          },
          timestamp
        }];
      }
      
      // Réponse par défaut
      return [{
        type: 'assistant',
        content: "Y a-t-il autre chose que je puisse faire pour vous concernant votre commande ?",
        choices: ['Voir ma commande', 'Quand sera-t-elle livrée ?', 'Non merci, c\'est tout'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_complete' as ConversationStep,
          orderData,
          messageHandled: true
        },
        timestamp
      }];
      
    } catch (error) {
      console.error('Error in handlePostPayment:', error);
      return [this.createErrorMessage()];
    }
  }

  private async handlePhoneCollection(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>,
    countryCode: string = 'SN'
  ): Promise<ChatMessage[]> {
    try {
      const phoneService = PhoneService.getInstance();
      const phoneValidation = phoneService.validatePhoneNumber(content, countryCode);
      const timestamp = new Date().toISOString();

      if (!phoneValidation.isValid) {
        return [{
          type: 'assistant',
          content: phoneValidation.error || "Le numéro de téléphone n'est pas valide. Veuillez réessayer.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_phone',
            orderData,
            messageHandled: true
          },
          timestamp
        }];
      }

      const formattedPhone = phoneService.formatPhoneWithCountry(content, countryCode);
      
      if (formattedPhone.isValid) {
        // Vérifier si c'est un client existant
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', formattedPhone.international)
          .single();

        if (existingCustomer) {
          // Créer une metadata valide pour un client existant
          const metadata = this.ensureValidMetadata({
            ...orderData.metadata,
            customerInfo: {
              firstName: existingCustomer.first_name,
              lastName: existingCustomer.last_name,
              fullName: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
              phone: formattedPhone.international
            },
            flags: {
              existingCustomerFound: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          });

          const updatedOrderData: Partial<ChatOrderData> = {
            ...orderData,
            phone: formattedPhone.international,
            first_name: existingCustomer.first_name,
            last_name: existingCustomer.last_name,
            email: existingCustomer.email,
            city: existingCustomer.city,
            address: existingCustomer.address,
            metadata
          };

          const existingCustomerResponse = await this.handleExistingCustomer(
            sessionId,
            existingCustomer,
            updatedOrderData
          );

          await this.saveProgress(sessionId, 'confirm_existing_info', updatedOrderData);

          return [existingCustomerResponse];
        }

        // Pour un nouveau client
        const metadata = this.ensureValidMetadata({
          ...orderData.metadata,
          customerInfo: {
            phone: formattedPhone.international
          },
          flags: {
            newCustomer: true,
            inPurchaseFlow: true,
            preventAIIntervention: true
          }
        });

        const updatedOrderData: Partial<ChatOrderData> = {
          ...orderData,
          phone: formattedPhone.international,
          metadata
        };

        await this.saveProgress(sessionId, 'collect_name', updatedOrderData);

        return [{
          type: 'assistant',
          content: "Super ! Quel est votre nom complet ?",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_name' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true
          },
          timestamp
        }];
      }

      return [{
        type: 'assistant',
        content: "Le format du numéro n'est pas valide. Veuillez réessayer.",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_phone',
          orderData,
          messageHandled: true
        },
        timestamp
      }];

    } catch (error) {
      console.error('Error in handlePhoneCollection:', error);
      return [this.createErrorMessage()];
    }
  }

  private async updateSessionId(oldId: string, newId: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // Récupérer d'abord les données actuelles du panier
      const { data: currentCart } = await supabase
        .from('abandoned_carts')
        .select('metadata')
        .eq('id', oldId)
        .single();

      if (!currentCart?.metadata) {
        throw new Error('Cart metadata not found');
      }

      // Mettre à jour l'ID du panier abandonné et son horodatage
      await supabase
        .from('abandoned_carts')
        .update({ 
          id: newId,
          updated_at: timestamp,
          last_active_at: timestamp
        })
        .eq('id', oldId);

      // Mettre à jour les références dans les messages
      await supabase
        .from('messages')
        .update({ 
          conversation_id: newId,
          metadata: {
            conversationId: newId,
            lastUpdate: timestamp
          }
        })
        .eq('conversation_id', oldId);

      // Mettre à jour la conversation elle-même
      await supabase
        .from('conversations')
        .update({ 
          id: newId,
          metadata: {
            lastUpdate: timestamp
          }
        })
        .eq('id', oldId);

      // Créer une metadata valide pour le panier
      const cartMetadata: AbandonedCartMetadata = {
        orderData: currentCart.metadata.orderData,
        source: currentCart.metadata.source || 'chatbot',
        storeId: currentCart.metadata.storeId || '',
        productId: currentCart.metadata.productId || '',
        conversationId: newId,
        createdAt: currentCart.metadata.createdAt || timestamp,
        updatedAt: timestamp,
        lastUpdate: timestamp,
        conversationHistory: currentCart.metadata.conversationHistory || []
      };

      // Mettre à jour l'OrderService
      const orderService = OrderService.getInstance();
      await orderService.updateCart(newId, {
        id: newId,
        last_active_at: timestamp,
        metadata: cartMetadata
      });

    } catch (error) {
      console.error('Error updating session ID:', error);
      throw error;
    }
  }

  private async handleExistingCustomerCheck(
    sessionId: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    try {
      const timestamp = new Date().toISOString();
      
      // Vérifier si le client existe déjà en base de données
      if (!orderData.phone) {
        throw new Error('Phone number required for customer check');
      }
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', orderData.phone)
        .single();
      
      if (existingCustomer) {
        // Client existant trouvé
        // Mettre à jour orderData avec les informations existantes
        const updatedOrderData: Partial<ChatOrderData> = {
          ...orderData,
          first_name: existingCustomer.first_name,
          last_name: existingCustomer.last_name,
          city: existingCustomer.city,
          address: existingCustomer.address,
          email: existingCustomer.email,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            customerInfo: {
              firstName: existingCustomer.first_name,
              lastName: existingCustomer.last_name,
              fullName: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
              phone: orderData.phone
            },
            flags: {
              existingCustomerFound: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          })
        };
        
        await this.saveProgress(sessionId, 'check_existing', updatedOrderData);
        
        // Retourner un message demandant si l'adresse est correcte
        return {
          type: 'assistant',
          content: `Ravi de vous revoir ${existingCustomer.first_name}! Nous livrerons à votre adresse habituelle à ${existingCustomer.city}? Ou souhaitez-vous modifier l'adresse?`,
          choices: ['Oui, même adresse', 'Non, nouvelle adresse'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'check_existing' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true
          },
          timestamp
        };
      } else {
        // Nouveau client, continuer avec la collecte de la ville
        await this.moveToStep(sessionId, 'collect_city');
        
        // Mettre à jour orderData avec le flag nouveauClient
        const updatedOrderData: Partial<ChatOrderData> = {
          ...orderData,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            flags: {
              newCustomer: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          })
        };
        
        await this.saveProgress(sessionId, 'collect_city', updatedOrderData);
        
        // Continuer avec la collecte de la ville
        return {
          type: 'assistant',
          content: "Dans quelle ville habitez-vous ?",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_city' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true
          },
          timestamp
        };
      }
    } catch (error) {
      console.error('Error in handleExistingCustomerCheck:', error);
      return this.createErrorMessage();
    }
  }

  public async handleEmailResponse(
    sessionId: string,
    content: string,
    currentStep: ConversationStep,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
    // Vérifier si nous sommes à la bonne étape
    if (currentStep !== 'collect_has_email') {
      return null;
    }
    
    // Vérifier si le message a déjà été traité
    if (orderData.metadata?.flags?.emailResponseHandled) {
      console.log('Email response already handled, skipping duplicate processing');
      return null;
    }
  
    const validResponses = ['Oui, j\'ai un e-mail', 'Non, je n\'en ai pas'];
    const normalizedResponse = content.toLowerCase().trim();
  
    // Vérifier si c'est une réponse valide
    if (!validResponses.map(r => r.toLowerCase()).includes(normalizedResponse) && 
        !normalizedResponse.includes('oui') && 
        !normalizedResponse.includes('non')) {
      return {
        type: 'assistant',
        content: "Je n'ai pas compris votre réponse. Veuillez choisir l'une des options proposées.",
        choices: validResponses,
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_has_email',
          orderData,
          messageHandled: false
        },
        timestamp: new Date().toISOString()
      };
    }
  
    const hasEmail = normalizedResponse.includes('oui') || normalizedResponse.includes('j\'ai');
    
    // Force explicitement le passage à l'étape suivante
    await this.moveToStep(sessionId, hasEmail ? 'collect_email' : 'collect_city');
    
    // Mise à jour de l'orderData avec flags spécifiques
    const updatedMetadata = this.ensureValidMetadata({
      ...orderData.metadata,
      emailConfirmed: hasEmail,
      updatedAt: new Date().toISOString(),
      messageHandled: true,
      flags: {
        ...(orderData.metadata?.flags || {}),
        emailResponseHandled: true,
        preventNextStepDuplicate: true,
        currentStep: hasEmail ? 'collect_email' : 'collect_city',
        cityPromptGenerated: hasEmail ? false : true,
        skipNextCityPrompt: hasEmail ? false : true
      }
    });
  
    const updatedOrderData: Partial<ChatOrderData> = {
      ...orderData,
      metadata: updatedMetadata
    };
  
    // Sauvegarder la progression explicitement avec les bons flags
    const nextStep = hasEmail ? 'collect_email' : 'collect_city';
    await this.saveProgress(sessionId, nextStep, updatedOrderData);
  
    return {
      type: 'assistant',
      content: hasEmail 
        ? "Super ! Quelle est votre adresse e-mail ?"
        : "D'accord, pas de souci. Dans quelle ville habitez-vous ?",
      choices: [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          emailResponseHandled: true,
          preventNextStepDuplicate: true,
          inPurchaseFlow: true,
          preventAIIntervention: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async getMessageTemplate(content: string): Promise<any> {
    const { data: template } = await supabase
      .from('chatbot_messages')
      .select('*')
      .eq('trigger', content)
      .eq('is_active', true)
      .single();
      
    return template;
  }

  private createResponseFromTemplate(
    template: any,
    data: Partial<OrderData>
  ): ChatMessage {
    const variables: TemplateVariables = {
      product_name: data.items?.[0]?.name || '',
      first_name: data.first_name || '',
      city: data.city || '',
      price: this.formatPrice(data.items?.[0]?.price || 0),
      quantity: data.items?.[0]?.quantity?.toString() || '1',
      total: this.formatPrice(data.total_amount || 0),
      delivery_cost: this.formatPrice(data.delivery_cost || 0)
    };
  
    // Convertir OrderData en ChatOrderData
    const chatOrderData: Partial<ChatOrderData> = {
      ...data,
      formStep: template.scenario as ConversationStep
    };
  
    return {
      type: 'assistant',
      content: this.replaceVariables(template.response_template, variables),
      choices: template.next_choices || [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: template.scenario as ConversationStep,
        showQuantitySelector: template.scenario === 'collect_quantity',
        maxQuantity: 10,
        orderData: chatOrderData,
        messageHandled: true
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handlePredefinedChoice(
    sessionId: string,
    content: string
  ): Promise<ChatMessage[]> {
    let response: ChatMessage;
  
    try {
      await this.saveMessage(sessionId, {
        type: 'user',
        content,
        timestamp: new Date().toISOString()
      });
  
      const orderData = await this.fetchOrderData(sessionId);
      
      console.log(`Handling predefined choice: "${content}"`);
      
      // Pour "Je veux l'acheter maintenant", forcer le démarrage du flow correctement
      if (content === 'Je veux l\'acheter maintenant') {
        console.log('Starting purchase flow');
        
        // Mettre à jour l'étape directement
        await this.moveToStep(sessionId, 'collect_phone');
        
        // Créer une réponse explicite pour demander le numéro de téléphone
        response = {
          type: 'assistant',
          content: "Excellent ! Pour enregistrer votre commande, j'aurais besoin de quelques informations. Commençons par la base. Quel est votre numéro de téléphone ?",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_phone' as ConversationStep,
            formStep: 'collect_phone',
            orderData: orderData ? {
              ...orderData,
              formStep: 'collect_phone' as ConversationStep
            } : undefined,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await this.saveMessage(sessionId, response);
        return [response];
      }
      
      // Pour les autres choix prédéfinis
      const template = await this.getMessageTemplate(content);
  
      if (template) {
        response = this.createResponseFromTemplate(template, orderData || {});
      } else {
        switch (content) {
          case 'Je veux en savoir plus':
            response = await this.handleProductDescription(this.getCurrentProductId(), sessionId);
            break;
          case 'Je veux voir les témoignages':
            response = await this.handleTestimonials(this.getCurrentProductId(), sessionId);
            break;
          case 'Comment y jouer ?':
            response = await this.handleGameRules(this.getCurrentProductId(), sessionId);
            break;
          default:
            throw new Error(`Choix non géré : ${content}`);
        }
      }
  
      await this.saveMessage(sessionId, response);
      return [response];
  
    } catch (error) {
      console.error('Error in handlePredefinedChoice:', error);
      const errorMessage = await this.createResponse(
        "Je suis désolée, une erreur est survenue. Puis-je vous aider autrement ?",
        ["Recommencer", "Contacter le support"],
        'initial'
      );
      await this.saveMessage(sessionId, errorMessage);
      return [errorMessage];
    }
  }
      
  private async handleAIResponse(
    sessionId: string,
    content: string,
    currentStep: ConversationStep,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    try {
      // Debug: vérifier pourquoi l'IA est appelée
      this.debugAIIntervention("AI response requested", {
        sessionId,
        content,
        currentStep,
        inPurchaseFlow: orderData.metadata?.flags?.inPurchaseFlow,
        preventAIIntervention: orderData.metadata?.flags?.preventAIIntervention,
        orderDataFlags: orderData.metadata?.flags
      });
  
      if (!this.aiManager) {
        throw new Error('AI Manager not initialized');
      }
      
      // Vérifier si nous sommes dans un flow d'achat et devrions éviter l'IA
      if (orderData.metadata?.flags?.preventAIIntervention) {
        this.debugAIIntervention("AI intervention prevented by flags", {
          currentStep,
          flags: orderData.metadata?.flags
        });
        
        // Retourner une réponse générique et sûre
        return [{
          type: 'assistant',
          content: "Je vais continuer avec votre processus d'achat. Merci de suivre les instructions à l'écran.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: currentStep,
            orderData,
            messageHandled: true,
            flags: {
              preventAIIntervention: true,
              inPurchaseFlow: true,
              aiOverridden: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
  
      // Utiliser l'IA pour générer une réponse
      let aiResponse = await this.aiManager.handleProductChatbot(
        { content, type: 'user' },
        this.getCurrentProductId(),
        currentStep,
        {
          ...orderData,
          formStep: currentStep
        }
      );
  
      // Si une personnalisation est requise, utiliser generatePersonalizedResponse
      if (aiResponse.shouldPersonalize || (aiResponse.buyingIntent && aiResponse.buyingIntent > 0.7)) {
        const personalizedResponse = await this.generatePersonalizedResponse(
          aiResponse.nextStep || currentStep,
          orderData,
          this.getCurrentProductId()
        );
        return [personalizedResponse];
      }
  
      // Enrichir la réponse avec des informations contextuelles
      aiResponse = this.enrichResponseWithContextualChoices(aiResponse, currentStep);
  
      // Ajouter des recommandations si forte intention d'achat
      if (aiResponse.buyingIntent && aiResponse.buyingIntent > 0.7) {
        const recommendations = await this.getAvailableProducts(this.getCurrentProductId());
        aiResponse.recommendations = recommendations.slice(0, 2);
      }
  
      // Créer le message de réponse final
      const message = await this.createResponse(
        aiResponse.content,
        aiResponse.choices || [],
        aiResponse.nextStep || currentStep,
        {
          buyingIntent: aiResponse.buyingIntent || 0,
          recommendations: aiResponse.recommendations || [],
          productContext: this.getCurrentProductId() ? JSON.stringify({
            productId: this.getCurrentProductId(),
            category: this.currentCategory
          }) : undefined,
          orderData
        }
      );
  
      return [message];
  
    } catch (error) {
      console.error('Error in handleAIResponse:', error);
      const errorMessage = await this.createResponse(
        "Je suis désolée, une erreur est survenue. Puis-je vous aider autrement ?",
        ["Recommencer", "Contacter le support"],
        currentStep
      );
      await this.saveMessage(sessionId, errorMessage);
      return [errorMessage];
    }
  }

  public async saveProgress(
    sessionId: string,
    step: ConversationStep,
    data: Partial<ChatOrderData>
  ): Promise<void> {
    try {
      // Vérifier si la progression a déjà été sauvegardée pour cette étape spécifique
      const stepAlreadySaved = data.metadata?.flags?.[`${step}_saved`] === true;
      
      if (stepAlreadySaved) {
        console.log(`Progress for step ${step} already saved, skipping duplicate save`);
        return;
      }
      
      // Timestamps pour le suivi
      const timestamp = new Date().toISOString();
      
      // Créer une metadata valide en utilisant la méthode améliorée
      const orderMetadata = this.ensureValidMetadata({
        ...data.metadata,
        flags: {
          ...(data.metadata?.flags || {}),
          [`${step}_saved`]: true,
          lastSavedStep: step,
          lastSavedAt: timestamp,
          inPurchaseFlow: true,
          preventAIIntervention: true
        }
      });
    
      // Vérifier si ce message a déjà été traité par un autre gestionnaire
      const processedByHandler = data.metadata?.processedByEmailHandler === true || 
                                data.metadata?.flags?.preventNextStepDuplicate === true;
      
      // S'assurer que les items existent et sont correctement formatés
      const items = Array.isArray(data.items) ? data.items : [];
      
      // S'assurer que d'autres champs obligatoires ont des valeurs par défaut
      const safeData = {
        ...data,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        city: data.city || '',
        address: data.address || '',
        items,
        metadata: orderMetadata,
        formStep: step
      };
      
      // Créer une metadata valide pour le panier
      const cartMetadata = {
        orderData: safeData,
        source: orderMetadata.source, // Utiliser la source validée
        storeId: orderMetadata.storeId || '',
        productId: orderMetadata.productId || this.getCurrentProductId() || '',
        conversationId: sessionId,
        createdAt: orderMetadata.createdAt,
        updatedAt: timestamp,
        lastUpdate: timestamp,
        conversationHistory: orderMetadata.conversationHistory || []
      };
      
      // Ajouter l'historique de progression
      const progressHistory = Array.isArray((data.metadata as any)?.progressHistory) 
        ? [...(data.metadata as any).progressHistory] 
        : [];
      
      progressHistory.push({
        step,
        timestamp,
        processedByHandler
      });
      
      (cartMetadata as any).progressHistory = progressHistory;
    
      // Préparer les données du panier avec la metadata mise à jour
      const cartData = {
        id: sessionId,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email,
        phone: data.phone || '',
        city: data.city || '',
        address: data.address || '',
        cart_stage: step,
        last_active_at: timestamp,
        metadata: cartMetadata
      };
      
      // Vérifier d'abord si le panier existe déjà
      const { data: existingCart } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq('id', sessionId)
        .single();
      
      let result;
      if (existingCart) {
        // Mettre à jour le panier existant
        result = await supabase
          .from('abandoned_carts')
          .update(cartData)
          .eq('id', sessionId);
      } else {
        // Insérer un nouveau panier
        result = await supabase
          .from('abandoned_carts')
          .insert([cartData]);
      }
      
      if (result.error) {
        console.error('Error saving progress:', result.error);
        // Si c'est une erreur de contrainte unique, tenter une mise à jour à la place
        if (result.error.code === '23505') {
          const updateResult = await supabase
            .from('abandoned_carts')
            .update(cartData)
            .eq('id', sessionId);
            
          if (updateResult.error) {
            console.error('Error updating abandoned cart:', updateResult.error);
          }
        } else {
          throw result.error;
        }
      }
      
      // Mettre à jour également la conversation si elle existe
      await supabase
        .from('conversations')
        .update({
          metadata: {
            step,
            lastUpdate: timestamp,
            processedByHandler,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          }
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) {
            console.warn('Could not update conversation step:', error);
          }
        });
      
      // Mettre à jour le cache local si nécessaire
      if (this.orderDataCache.has(sessionId)) {
        const cachedOrderData = this.orderDataCache.get(sessionId);
        if (cachedOrderData) {
          this.orderDataCache.set(sessionId, {
            ...cachedOrderData,
            metadata: orderMetadata,
            formStep: step
          });
        }
      }
    
    } catch (error) {
      console.error('Error in saveProgress:', error);
      // Ne pas propager l'erreur pour éviter de casser le flux d'utilisation
      // Mais enregistrer l'erreur pour le debugging
    }
  }
  
  private replaceVariables(
    template: string,
    variables: TemplateVariables
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match;
    });
  }
  
  private async getDefaultStepMessage(step: ConversationStep): Promise<string> {
    const messages: StepMessages = {
      'collect_name': "Excellent ! Pour enregistrer votre commande, j'aurais besoin de quelques informations. Commençons par la base. Quel est votre nom complet ?",
      'collect_city': "Dans quelle ville habitez-vous ?",
      'collect_address': "Quelle est votre adresse exacte ?",
      'collect_phone': "Quel est votre numéro de téléphone ?",
      'collect_has_email': "Avez-vous une adresse e-mail ?",
      'collect_email': "",
      'collect_quantity': "Parfait ! Combien d'exemplaires souhaitez-vous commander ?",
      'order_summary': "Voici le récapitulatif de votre commande :",
      'initial': "Comment puis-je vous aider ?"
    };
  
    return messages[step] || "Puis-je vous aider avec autre chose ?";
  }
  
  private async getDefaultStepChoices(step: ConversationStep): Promise<string[]> {
    const flowManager = ChatFlowManager.getInstance();
    return flowManager.getChoicesForStep(step);
  }

  private async handleAddProduct(
    sessionId: string, 
    productId: string, 
    quantity: number
  ): Promise<void> {
    try {
      console.log(`Adding product ${productId} with quantity ${quantity} to order ${sessionId}`);
      
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, images')
        .eq('id', productId)
        .single();
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      // Récupérer le panier actuel
      const { data: cart } = await supabase
        .from('abandoned_carts')
        .select('metadata')
        .eq('id', sessionId)
        .single();
      
      if (!cart?.metadata?.orderData) {
        throw new Error(`Cart not found for session: ${sessionId}`);
      }
      
      // Extraire les données de commande actuelles
      const orderData = cart.metadata.orderData as OrderData;
      
      // S'assurer que items est un tableau
      const items = Array.isArray(orderData.items) ? [...orderData.items] : [];
      
      // Vérifier si le produit existe déjà dans le panier
      const existingItemIndex = items.findIndex(item => item.productId === productId);
      
      // Image par défaut
      const imageUrl = Array.isArray(product.images) && product.images.length > 0 
        ? product.images[0] 
        : typeof product.images === 'string' 
          ? product.images 
          : null;
      
      // Calculer le prix total pour cet article
      const totalPrice = (product.price || 0) * quantity;
      
      if (existingItemIndex >= 0) {
        // Si le produit existe déjà, mettre à jour la quantité
        items[existingItemIndex].quantity += quantity;
        items[existingItemIndex].totalPrice = items[existingItemIndex].price * items[existingItemIndex].quantity;
      } else {
        // Ajouter un nouvel élément
        items.push({
          productId: product.id,
          name: product.name,
          quantity: quantity,
          price: product.price || 0,
          totalPrice: totalPrice,
          image: imageUrl
        });
      }
      
      // Calculer le sous-total et le montant total
      const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const deliveryCost = orderData.delivery_cost || 0;
      const totalAmount = subtotal + deliveryCost;
      
      // Mettre à jour les données de commande
      const updatedOrderData: OrderData = {
        ...orderData,
        items,
        subtotal,
        total_amount: totalAmount,
        metadata: {
          ...orderData.metadata,
          updatedAt: new Date().toISOString(),
          productAdded: true,
          orderInfo: {
            ...(orderData.metadata?.orderInfo || {}),
            subtotal,
            totalPrice: totalAmount
          }
        }
      };
      
      // Mettre à jour la metadata du panier abandonné
      const updatedCartMetadata = {
        ...cart.metadata,
        orderData: updatedOrderData,
        updatedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      
      // Sauvegarder les modifications dans la base de données
      await supabase
        .from('abandoned_carts')
        .update({ 
          metadata: updatedCartMetadata,
          last_active_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      console.log(`Product ${productId} added successfully to order ${sessionId}`);
      
      // Mettre à jour également orderDataCache
      this.orderDataCache.set(sessionId, updatedOrderData);
      
    } catch (error) {
      console.error('Error in handleAddProduct:', error);
      throw error;
    }
  }

  public async handleAddProductButtonClick(
    sessionId: string,
    productId: string,
    productName: string
  ): Promise<ChatMessage[]> {
    try {
      console.log(`Handling add product button click for ${productName} (${productId})`);
      
      // Créer un message utilisateur indiquant l'intention d'ajouter ce produit
      const userMessage: ChatMessage = {
        type: 'user',
        content: `Je veux aussi acheter ${productName}`,
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            isProductAddition: true
          }
        }
      };
      
      // Sauvegarder le message utilisateur
      await this.saveMessage(sessionId, userMessage);
      
      // Créer la réponse demandant la quantité
      const response: ChatMessage = {
        type: 'assistant',
        content: `Excellent choix ! Combien d'exemplaires de "${productName}" souhaitez-vous ajouter ?`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'additional_quantity' as ConversationStep,
          showQuantitySelector: true,
          maxQuantity: 10,
          selectedProductId: productId,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true
          }
        },
        timestamp: new Date().toISOString()
      };
      
      // Sauvegarder la réponse
      await this.saveMessage(sessionId, response);
      
      // Mettre à jour l'étape actuelle
      await this.moveToStep(sessionId, 'additional_quantity');
      
      return [userMessage, response];
    } catch (error) {
      console.error('Error in handleAddProductButtonClick:', error);
      return [this.createErrorMessage()];
    }
  }

  public async handleAdditionalProducts(
    sessionId: string,
    step: string,
    content: string
  ): Promise<ChatMessage | null> {
    try {
      console.log(`[handleAdditionalProducts] Processing step: ${step}, content: "${content}"`);
      const orderData = await this.fetchOrderData(sessionId);
      
      if (!orderData) {
        throw new Error('Order data not found');
      }
      
      // S'assurer que les flags sont correctement définis
      const baseFlags = {
        inPurchaseFlow: true,
        preventAIIntervention: true,
        processingProductChoice: true
      };
      
      // Convertir explicitement en Partial<ChatOrderData>
      const chatOrderData: Partial<ChatOrderData> = {
        ...orderData,
        formStep: orderData.formStep as ConversationStep,
        metadata: this.ensureValidMetadata({
          ...orderData.metadata,
          flags: {
            ...(orderData.metadata?.flags || {}),
            ...baseFlags
          }
        })
      };
      
      // Traiter spécifiquement le step add_other_products
      if (step === 'add_other_products') {
        console.log('[handleAdditionalProducts] Processing add_other_products step');
        
        // Normaliser la réponse pour détecter "Oui" ou "Non"
        const normalizedContent = content.toLowerCase().trim();
        const wantsMoreProducts = normalizedContent.includes('oui') || 
                               normalizedContent.includes('veux bien');
        
        console.log('[handleAdditionalProducts] User wants more products:', wantsMoreProducts);
        
        // Sauvegarder la progression AVANT de continuer pour éviter les pertes d'état
        await this.saveProgress(sessionId, wantsMoreProducts ? 'select_product' : 'add_notes', chatOrderData);
        
        if (wantsMoreProducts) {
          // Obtenir les recommandations avec gestion d'erreurs améliorée
          try {
            // Utiliser directement la fonction getAvailableProducts corrigée
            const recommendations = await this.getAvailableProducts(chatOrderData.metadata?.productId || '');
            
            if (!recommendations || recommendations.length === 0) {
              // Pas de recommandations disponibles, passer à l'étape des notes
              console.log('No recommendations available, moving to add_notes step');
              
              return {
                type: 'assistant',
                content: "Je n'ai pas d'autres jeux à vous proposer pour le moment. Souhaitez-vous ajouter une note à votre commande ?",
                choices: ['Oui, je veux bien', 'Non, pas la peine'],
                assistant: this.getBotInfo(),
                metadata: {
                  nextStep: 'add_notes' as ConversationStep,
                  orderData: chatOrderData,
                  messageHandled: true,
                  flags: baseFlags
                },
                timestamp: new Date().toISOString()
              };
            }
            
            // Formater le message avec les recommandations
            const contentText = recommendations.map((rec, i) => {
              const priceText = rec.price ? `${rec.price.toLocaleString()} FCFA` : '';
              return `${i + 1}. ${rec.name} - ${priceText}\n${rec.reason || 'Un excellent jeu pour renforcer vos relations!'}`;
            }).join('\n\n');
            
            console.log('Sending recommendations to user');
            
            return {
              type: 'assistant',
              content: `Voici d'autres jeux qui pourraient vous intéresser :\n\n${contentText}`,
              choices: recommendations.map(rec => rec.name),
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'select_product' as ConversationStep,
                recommendations: recommendations,
                orderData: chatOrderData,
                messageHandled: true,
                flags: baseFlags
              },
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error('Error getting recommendations:', error);
            // En cas d'erreur, passer aux notes
            return {
              type: 'assistant',
              content: "Je n'ai pas pu récupérer d'autres jeux en ce moment. Souhaitez-vous ajouter une note à votre commande ?",
              choices: ['Oui, je veux bien', 'Non, pas la peine'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'add_notes' as ConversationStep,
                orderData: chatOrderData,
                messageHandled: true,
                flags: baseFlags
              },
              timestamp: new Date().toISOString()
            };
          }
        } else {
          // L'utilisateur ne veut pas plus de produits, passer à l'étape des notes
          console.log('User does not want more products, moving to add_notes step');
          
          return {
            type: 'assistant',
            content: "Souhaitez-vous ajouter une note à votre commande ? (instructions particulières, etc.)",
            choices: ['Oui, je veux bien', 'Non, pas la peine'],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'add_notes' as ConversationStep,
              orderData: chatOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Étape: L'utilisateur a sélectionné un produit dans les recommandations
      else if (step === 'select_product') {
        console.log('User selected product:', content);
        
        // S'assurer que les metadatas et flags sont correctement définis
        await this.saveProgress(sessionId, 'additional_quantity', chatOrderData);
        
        // Vérifier si le contenu correspond à un produit recommandé
        const messageMetadata = await this.getCurrentMessageMetadata(sessionId);
        const recommendations = messageMetadata?.recommendations as ProductRecommendation[];
        
        const selectedRecommendation = recommendations?.find(rec => 
          rec.name.toLowerCase() === content.toLowerCase()
        );
        
        if (selectedRecommendation) {
          return {
            type: 'assistant',
            content: `Excellent choix ! Combien d'exemplaires de ${selectedRecommendation.name} souhaitez-vous ajouter ?`,
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'additional_quantity' as ConversationStep,
              showQuantitySelector: true,
              maxQuantity: 10,
              selectedProductId: selectedRecommendation.productId,
              orderData: chatOrderData,
              messageHandled: true,
              flags: {
                inPurchaseFlow: true,
                preventAIIntervention: true
              }
            },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Étape: L'utilisateur a spécifié la quantité pour un produit supplémentaire
      else if (step === 'additional_quantity') {
        console.log('Processing quantity for additional product:', content);
        const quantity = parseInt(content);
        const messageMetadata = await this.getCurrentMessageMetadata(sessionId);
        const selectedProductId = messageMetadata?.selectedProductId;
        
        // Logs améliorés pour le debug
        console.log('Additional product details:', { 
          quantity, 
          selectedProductId, 
          validQuantity: !isNaN(quantity) && quantity > 0 && quantity <= 10 
        });
        
        // Enregistrer explicitement l'état même avant la validation
        await this.saveProgress(sessionId, 'add_product_choice', chatOrderData);
        
        if (selectedProductId && !isNaN(quantity) && quantity > 0 && quantity <= 10) {
          console.log(`Adding product ${selectedProductId} with quantity ${quantity}`);
          
          try {
            // Ajouter le produit au panier
            await this.handleAddProduct(sessionId, selectedProductId, quantity);
            
            // Récupérer les données mises à jour
            const updatedOrderData = await this.fetchOrderData(sessionId);
            
            // S'assurer que updatedOrderData existe
            if (!updatedOrderData) {
              throw new Error('Failed to retrieve updated order data');
            }
            
            // Convertir en ChatOrderData
            const updatedChatOrderData: Partial<ChatOrderData> = {
              ...updatedOrderData,
              formStep: updatedOrderData.formStep as ConversationStep,
              metadata: updatedOrderData.metadata
            };
            
            // Mise à jour explicite de l'étape
            await this.saveProgress(sessionId, 'add_product_choice', updatedChatOrderData);
            
            // Demander à l'utilisateur s'il veut valider la commande ou ajouter d'autres produits
            return {
              type: 'assistant',
              content: `Parfait ! ${quantity} exemplaire${quantity > 1 ? 's' : ''} ajouté${quantity > 1 ? 's' : ''} à votre commande. Que souhaitez-vous faire maintenant ?`,
              choices: ['Valider la commande', 'Ajouter un autre jeu'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'add_product_choice' as ConversationStep,
                orderData: updatedChatOrderData,
                messageHandled: true,
                flags: {
                  inPurchaseFlow: true,
                  preventAIIntervention: true,
                  productAdded: true
                }
              },
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error('Error adding product to cart:', error);
            return {
              type: 'assistant',
              content: "Je suis désolée, je n'ai pas pu ajouter ce produit à votre commande. Souhaitez-vous réessayer ?",
              choices: ['Réessayer', 'Passer à la commande'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'add_product_choice' as ConversationStep,
                orderData: chatOrderData,
                messageHandled: true,
                flags: baseFlags
              },
              timestamp: new Date().toISOString()
            };
          }
        } else {
          // Quantité invalide
          return {
            type: 'assistant',
            content: "Veuillez choisir une quantité valide entre 1 et 10.",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'additional_quantity' as ConversationStep,
              showQuantitySelector: true,
              maxQuantity: 10,
              selectedProductId: selectedProductId,
              orderData: chatOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Étape: Décision après l'ajout d'un produit
      else if (step === 'add_product_choice') {
        console.log('Processing add_product_choice:', content);
        
        if (content === 'Valider la commande') {
          // L'utilisateur veut finaliser sa commande
          await this.saveProgress(sessionId, 'add_notes', chatOrderData);
          
          return {
            type: 'assistant',
            content: "Parfait ! Souhaitez-vous ajouter une note à votre commande ? (instructions particulières, etc.)",
            choices: ['Oui, je veux bien', 'Non, pas la peine'],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'add_notes' as ConversationStep,
              orderData: chatOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        } else if (content === 'Ajouter un autre jeu') {
          // L'utilisateur veut ajouter plus de produits
          await this.saveProgress(sessionId, 'select_product', chatOrderData);
          
          // Obtenir des recommandations
          const recommendations = await this.getAvailableProducts(chatOrderData.metadata?.productId || '');
          
          if (!recommendations || recommendations.length === 0) {
            return {
              type: 'assistant',
              content: "Je n'ai pas d'autres jeux à vous proposer pour le moment. Souhaitez-vous valider votre commande ?",
              choices: ['Valider la commande'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'add_notes' as ConversationStep,
                orderData: chatOrderData,
                messageHandled: true,
                flags: baseFlags
              },
              timestamp: new Date().toISOString()
            };
          }
          
          // Formater le message avec les recommandations
          const contentText = recommendations.map((rec, i) => {
            const priceText = rec.price ? `${rec.price.toLocaleString()} FCFA` : '';
            return `${i + 1}. ${rec.name} - ${priceText}\n${rec.reason || 'Un excellent jeu pour renforcer vos relations!'}`;
          }).join('\n\n');
          
          return {
            type: 'assistant',
            content: `Voici d'autres jeux qui pourraient vous intéresser :\n\n${contentText}`,
            choices: recommendations.map(rec => rec.name),
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'select_product' as ConversationStep,
              recommendations: recommendations,
              orderData: chatOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Retourner null si aucune des conditions n'est remplie
      return null;
    } catch (error) {
      console.error('Error in handleAdditionalProducts:', error);
      return {
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors du traitement de votre demande.",
        choices: ['Réessayer', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'initial' as ConversationStep,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  

  // Ajout d'une méthode pour gérer la note de commande
  public async handleNoteManagement(
    sessionId: string,
    content: string,
    currentStep: ConversationStep,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
    try {
      console.log(`[handleNoteManagement] Processing step: ${currentStep}, content: "${content}"`);
      
      // S'assurer que les flags sont correctement définis
      const baseFlags = {
        inPurchaseFlow: true,
        preventAIIntervention: true,
        processingNote: true
      };
      
      // Mettre à jour la metadata avec les flags
      const updatedOrderData = {
        ...orderData,
        metadata: this.ensureValidMetadata({
          ...orderData.metadata,
          flags: {
            ...(orderData.metadata?.flags || {}),
            ...baseFlags
          }
        })
      };
      
      // Étape: Demander à l'utilisateur s'il veut ajouter une note
      if (currentStep === 'add_notes') {
        // Normaliser la réponse pour détecter "Oui" ou "Non"
        const normalizedContent = content.toLowerCase().trim();
        const wantsToAddNote = normalizedContent.includes('oui') || 
                              normalizedContent.includes('veux bien');
        
        console.log('[handleNoteManagement] User wants to add note:', wantsToAddNote);
        
        // Mise à jour de l'étape
        const nextStep = wantsToAddNote ? 'save_note' : 'order_summary';
        await this.saveProgress(sessionId, nextStep, updatedOrderData);
        
        if (wantsToAddNote) {
          // L'utilisateur veut ajouter une note
          return {
            type: 'assistant',
            content: "Parfait ! Veuillez saisir votre note ou instructions particulières :",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'save_note' as ConversationStep,
              orderData: updatedOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        } else {
          // L'utilisateur ne veut pas ajouter de note, passer au récapitulatif
          return {
            type: 'assistant',
            content: await this.generateOrderSummary(sessionId),
            choices: ["C'est correct", "Je veux modifier"],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'order_summary' as ConversationStep,
              orderData: updatedOrderData,
              messageHandled: true,
              flags: baseFlags
            },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Étape: Sauvegarder la note
      else if (currentStep === 'save_note') {
        console.log('[handleNoteManagement] Saving note:', content);
        
        // Ajouter la note aux données de commande
        const note = content.trim();
        const updatedOrderDataWithNote = {
          ...updatedOrderData,
          order_details: note,
          metadata: this.ensureValidMetadata({
            ...updatedOrderData.metadata,
            note: note,
            flags: {
              ...(updatedOrderData.metadata?.flags || {}),
              noteAdded: true
            }
          })
        };
        
        // Sauvegarder la progression
        await this.saveProgress(sessionId, 'order_summary', updatedOrderDataWithNote);
        
        // Envoyer le récapitulatif de commande
        return {
          type: 'assistant',
          content: await this.generateOrderSummary(sessionId),
          choices: ["C'est correct", "Je veux modifier"],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'order_summary' as ConversationStep,
            orderData: updatedOrderDataWithNote,
            messageHandled: true,
            flags: {
              ...baseFlags,
              noteAdded: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }
      
      // Retourner null si aucune des conditions n'est remplie
      return null;
    } catch (error) {
      console.error('Error in handleNoteManagement:', error);
      return {
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors du traitement de votre note.",
        choices: ['Réessayer', 'Passer cette étape'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'add_notes' as ConversationStep,
          orderData,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Génération du récapitulatif de commande
  private async generateOrderSummary(sessionId: string): Promise<string> {
    try {
      const orderData = await this.fetchOrderData(sessionId);
      
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        return "Je n'ai pas pu récupérer les détails de votre commande. Veuillez réessayer.";
      }
      
      // Formatage des détails des produits
      const productDetails = orderData.items.map(item => {
        const totalPrice = item.price * item.quantity;
        return `• ${item.name} x ${item.quantity} = ${this.formatPrice(totalPrice)}`;
      }).join('\n');
      
      // Calculs des prix
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryCost = orderData.delivery_cost || 0;
      const totalAmount = subtotal + deliveryCost;
      
      // Construction du récapitulatif
      let summary = "📝 **Récapitulatif de votre commande :**\n\n";
      
      // Détails des produits
      summary += `**Produits :**\n${productDetails}\n\n`;
      
      // Informations client
      summary += "**Vos coordonnées :**\n";
      summary += `• Nom : ${orderData.first_name} ${orderData.last_name || ''}\n`;
      summary += `• Téléphone : ${orderData.phone || ''}\n`;
      summary += `• Adresse : ${orderData.address || ''}, ${orderData.city || ''}\n`;
      
      if (orderData.email) {
        summary += `• Email : ${orderData.email}\n`;
      }
      
      // Note
      if (orderData.order_details) {
        summary += `\n**Note :** ${orderData.order_details}\n`;
      }
      
      // Totaux
      summary += "\n**Détails du paiement :**\n";
      summary += `• Sous-total : ${this.formatPrice(subtotal)}\n`;
      summary += `• Frais de livraison : ${this.formatPrice(deliveryCost)}\n`;
      summary += `• **Total à payer : ${this.formatPrice(totalAmount)}**`;
      
      return summary;
    } catch (error) {
      console.error('Error generating order summary:', error);
      return "Désolé, je n'ai pas pu générer le récapitulatif de votre commande. Veuillez réessayer.";
    }
  }

  // Fonction pour formater les prix
  private formatPrice(price: number): string {
    return `${price.toLocaleString()} FCFA`;
  }

  // Méthode pour la gestion du choix de la méthode de paiement
  // Correction complète de la méthode handlePaymentMethod
    public async handlePaymentMethod(
      sessionId: string,
      content: string,
      orderData: Partial<ChatOrderData> = {}
    ): Promise<ChatMessage[]> {
    try {
    console.log(`[handlePaymentMethod] Processing content: "${content}"`);
    
    // Normaliser l'entrée pour détecter la méthode de paiement
    const normalizedContent = content.toLowerCase().trim();
    
    // Détecter la méthode de paiement choisie
    let paymentMethod: PaymentProvider | undefined;
    let paymentMethodName: string;
    
    if (normalizedContent.includes('wave')) {
      paymentMethod = 'WAVE' as PaymentProvider;
      paymentMethodName = 'Wave';
    } else if (normalizedContent.includes('orange')) {
      paymentMethod = 'ORANGE_MONEY' as PaymentProvider;
      paymentMethodName = 'Orange Money';
    } else if (normalizedContent.includes('carte')) {
      paymentMethod = 'CARD' as PaymentProvider;
      paymentMethodName = 'Carte bancaire';
    } else if (normalizedContent.includes('livraison')) {
      paymentMethod = 'CASH_ON_DELIVERY' as PaymentProvider;
      paymentMethodName = 'Paiement à la livraison';
    } else {
      // Méthode de paiement non reconnue
      return [{
        type: 'assistant',
        content: "Je n'ai pas reconnu la méthode de paiement. Veuillez choisir parmi les options proposées.",
        choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_method' as ConversationStep,
          orderData,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      }];
    }
    
    // Mettre à jour les données de commande avec la méthode de paiement choisie
    const updatedOrderData: Partial<ChatOrderData> = {
      ...orderData,
      payment_method: paymentMethod,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          paymentMethodSelected: true,
          selectedPaymentMethod: paymentMethod
        }
      })
    };
    
    // Sauvegarder la progression
    await this.saveProgress(sessionId, 'payment_processing', updatedOrderData);
    
    // Structure de réponse attendue de l'API de paiement
    interface PaymentResponse {
      success: boolean;
      paymentUrl?: string;
      clientSecret?: string;
      error?: string;
    }
    
    // Initialiser la demande de paiement
    const paymentResponse: PaymentResponse = await this.orderPaymentService.initiatePayment(
      sessionId,
      updatedOrderData,
      paymentMethod,
      {
        sessionId,
        provider: paymentMethod,
        amount: updatedOrderData.total_amount || 0,
        customerInfo: {
          name: `${updatedOrderData.first_name || ''} ${updatedOrderData.last_name || ''}`.trim(),
          phone: updatedOrderData.phone || '',
          city: updatedOrderData.city || ''
        },
        metadata: updatedOrderData.metadata
      }
    );
    
    // Traiter les différentes méthodes de paiement
    if (paymentMethod === 'CASH_ON_DELIVERY' as PaymentProvider) {
      // Pour le paiement à la livraison, créer directement la commande
      try {
        const orderService = OrderService.getInstance();
        
        // Assurez-vous que cette méthode existe et a la bonne signature
        const orderId = await orderService.createOrder(sessionId);
        
        // Ajouter l'ID de commande aux métadonnées
        const completedOrderData: Partial<ChatOrderData> = {
          ...updatedOrderData,
          status: 'confirmed' as const,
          paymentStatus: 'pending' as const,
          metadata: this.ensureValidMetadata({
            ...updatedOrderData.metadata,
            orderId,
            flags: {
              ...(updatedOrderData.metadata?.flags || {}),
              orderCreated: true,
              paymentCompleted: true
            }
          })
        };
        
        // Enregistrer la progression
        await this.saveProgress(sessionId, 'payment_complete', completedOrderData);
        
        // Message de confirmation
        return [{
          type: 'assistant',
          content: `🎉 Félicitations ! Votre commande #${orderId} a été confirmée avec succès !\n\nVous avez choisi le paiement à la livraison. Notre équipe vous contactera dans les 24 heures pour confirmer la livraison.\n\nMerci pour votre confiance !`,
          choices: ['Voir ma commande', 'Quand sera-t-elle livrée ?', 'Merci, au revoir'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_complete' as ConversationStep,
            orderData: completedOrderData,
            orderId,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              orderCreated: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      } catch (error) {
        console.error('Error creating order for cash on delivery:', error);
        return [{
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors de la création de votre commande. Veuillez réessayer ou choisir une autre méthode de paiement.",
          choices: ['Réessayer', 'Choisir une autre méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_error' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true
          },
          timestamp: new Date().toISOString()
        }];
      }
    } else {
      // Pour les méthodes de paiement en ligne
      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Mettre à jour l'état avec l'URL de paiement
        const paymentOrderData: Partial<ChatOrderData> = {
          ...updatedOrderData,
          metadata: this.ensureValidMetadata({
            ...updatedOrderData.metadata,
            paymentUrl: paymentResponse.paymentUrl,
            clientSecret: paymentResponse.clientSecret,
            flags: {
              ...(updatedOrderData.metadata?.flags || {}),
              paymentInitiated: true,
              selectedPaymentMethod: paymentMethod
            }
          })
        };
        
        // Sauvegarder la progression
        await this.saveProgress(sessionId, 'payment_processing', paymentOrderData);
        
        // Créer le QR code ou le lien selon la méthode
        let paymentInstructions = "";
        
        if (paymentMethod === 'WAVE' as PaymentProvider || paymentMethod === 'ORANGE_MONEY' as PaymentProvider) {
          paymentInstructions = `Veuillez suivre ces étapes pour payer avec ${paymentMethodName} :\n\n`;
          paymentInstructions += `1. Cliquez sur le lien de paiement ci-dessous\n`;
          paymentInstructions += `2. Complétez le paiement sur votre téléphone\n`;
          paymentInstructions += `3. Revenez ici et cliquez sur "J'ai payé" une fois le paiement effectué\n\n`;
          paymentInstructions += `[Cliquez ici pour payer](${paymentResponse.paymentUrl})`;
        } else {
          // Instructions pour carte bancaire
          paymentInstructions = `Veuillez suivre ces étapes pour payer par carte bancaire :\n\n`;
          paymentInstructions += `1. Cliquez sur le lien de paiement ci-dessous\n`;
          paymentInstructions += `2. Remplissez vos informations de carte bancaire\n`;
          paymentInstructions += `3. Confirmez le paiement\n\n`;
          paymentInstructions += `[Cliquez ici pour payer](${paymentResponse.paymentUrl})`;
        }
        
        return [{
          type: 'assistant',
          content: paymentInstructions,
          choices: ['J\'ai payé', 'Je rencontre un problème', 'Changer de méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            orderData: paymentOrderData,
            paymentUrl: paymentResponse.paymentUrl,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              paymentInitiated: true,
              selectedPaymentMethod: paymentMethod
            }
          },
          timestamp: new Date().toISOString()
        }];
      } else {
        // Erreur d'initialisation du paiement
        return [{
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors de l'initialisation du paiement. Veuillez réessayer ou choisir une autre méthode de paiement.",
          choices: ['Réessayer', 'Choisir une autre méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_error' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true,
            error: paymentResponse.error
          },
          timestamp: new Date().toISOString()
        }];
      }
    }
    } catch (error) {
      console.error('Error in handlePaymentMethod:', error);
      return [{
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors du traitement de votre méthode de paiement.",
        choices: ['Réessayer', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_error' as ConversationStep,
          orderData,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      }];
    }
  }

  // Méthode pour la gestion du traitement du paiement
  public async handlePaymentProcessing(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    try {
      console.log(`[handlePaymentProcessing] Processing content: "${content}"`);
      
      // Normaliser l'entrée pour détecter l'action
      const normalizedContent = content.toLowerCase().trim();
      
      // Cas 1: L'utilisateur indique qu'il a payé
      if (normalizedContent.includes('payé') || normalizedContent.includes('j\'ai payé')) {
        // Définir l'interface attendue pour la vérification de paiement
        interface PaymentVerificationResult {
          success: boolean;
          status: 'pending' | 'completed' | 'failed';
          message?: string;
          transactionId?: string;
        }
        
        // Vérifier le statut du paiement
        const paymentStatus: PaymentVerificationResult = await this.orderPaymentService.verifyPayment(
          sessionId,
          orderData.metadata?.clientSecret
        );
        
        if (paymentStatus.success) {
          // Paiement réussi, créer la commande
          try {
            const orderService = OrderService.getInstance();
            
            // Utiliser createOrder
            const orderId = await orderService.createOrder(sessionId);
            
            // Ajouter l'ID de commande aux métadonnées
            const completedOrderData = {
              ...orderData,
              status: 'confirmed' as const,
              paymentStatus: 'completed' as const,
              metadata: this.ensureValidMetadata({
                ...orderData.metadata,
                orderId,
                transactionId: paymentStatus.transactionId,
                flags: {
                  ...(orderData.metadata?.flags || {}),
                  orderCreated: true,
                  paymentCompleted: true
                }
              })
            };
            
            // Enregistrer la progression
            await this.saveProgress(sessionId, 'payment_complete', completedOrderData);
            
            // Message de confirmation
            return [{
              type: 'assistant',
              content: `🎉 Félicitations ! Votre paiement a été confirmé et votre commande #${orderId} a été créée avec succès !\n\nVous recevrez bientôt un SMS de confirmation avec les détails de votre livraison.\n\nMerci pour votre confiance et à bientôt !`,
              choices: ['Voir ma commande', 'Quand sera-t-elle livrée ?', 'Merci, au revoir'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'payment_complete' as ConversationStep,
                orderData: completedOrderData,
                orderId,
                messageHandled: true,
                flags: {
                  inPurchaseFlow: true,
                  preventAIIntervention: true,
                  orderCreated: true,
                  paymentCompleted: true
                }
              },
              timestamp: new Date().toISOString()
            }];
          } catch (error) {
            console.error('Error creating order after payment:', error);
            return [{
              type: 'assistant',
              content: "Votre paiement a été reçu, mais une erreur est survenue lors de la création de votre commande. Veuillez nous contacter avec votre référence de paiement pour que nous puissions résoudre ce problème.",
              choices: ['Contacter le support', 'Voir mes paiements'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'payment_error' as ConversationStep,
                orderData,
                messageHandled: true,
                transactionId: paymentStatus.transactionId
              },
              timestamp: new Date().toISOString()
            }];
          }
        } else {
          // Paiement non détecté
          return [{
            type: 'assistant',
            content: "Je n'ai pas encore détecté votre paiement. Si vous venez de payer, il peut y avoir un léger délai. Veuillez patienter quelques instants et cliquer à nouveau sur \"J'ai payé\".\n\nSi le problème persiste, vous pouvez essayer une autre méthode de paiement ou nous contacter.",
            choices: ['J\'ai payé', 'Vérifier à nouveau', 'Changer de méthode'],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'payment_processing' as ConversationStep,
              orderData,
              messageHandled: true,
              flags: {
                inPurchaseFlow: true,
                preventAIIntervention: true
              }
            },
            timestamp: new Date().toISOString()
          }];
        }
      }
      
      // Cas 2: L'utilisateur rencontre un problème
      else if (normalizedContent.includes('problème') || normalizedContent.includes('erreur')) {
        return [{
          type: 'assistant',
          content: "Je suis désolée que vous rencontriez des difficultés avec le paiement. Voici quelques solutions :\n\n" +
            "1. Vérifiez que vous avez suffisamment de fonds sur votre compte\n" +
            "2. Assurez-vous que votre numéro de téléphone est correct\n" +
            "3. Essayez une autre méthode de paiement\n\n" +
            "Que souhaitez-vous faire ?",
          choices: ['Réessayer', 'Changer de méthode', 'Contacter le support'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_error' as ConversationStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
      
      // Cas 3: L'utilisateur veut changer de méthode
      else if (normalizedContent.includes('changer') || normalizedContent.includes('autre méthode')) {
        // Mettre à jour pour revenir à la sélection de la méthode de paiement
        await this.saveProgress(sessionId, 'payment_method', orderData);
        
        return [{
          type: 'assistant',
          content: "Bien sûr, vous pouvez choisir une autre méthode de paiement. Quelle méthode préférez-vous utiliser ?",
          choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_method' as ConversationStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
      
      // Cas par défaut : réponse générique
      else {
        return [{
          type: 'assistant',
          content: "Je n'ai pas compris votre réponse. Veuillez choisir parmi les options proposées.",
          choices: ['J\'ai payé', 'Je rencontre un problème', 'Changer de méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
    } catch (error) {
      console.error('Error in handlePaymentProcessing:', error);
      return [{
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors du traitement de votre paiement.",
        choices: ['Réessayer', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_error' as ConversationStep,
          orderData,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      }];
    }
  }
  
  // Ajouter une méthode pour gérer le clic sur "Je veux l'acheter maintenant"
  public async handlePurchaseButton(sessionId: string): Promise<ChatMessage[]> {
    try {
      // Créer un message utilisateur pour cette action
      const userMessage: ChatMessage = {
        type: 'user',
        content: "Je veux l'acheter maintenant",
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            isPurchaseInitiation: true
          }
        }
      };
      
      // Sauvegarder le message utilisateur
      await this.saveMessage(sessionId, userMessage);
      
      // Initialiser le processus d'achat
      const response = await this.handlePurchaseInitiation(sessionId, 'collect_quantity');
      
      if (response) {
        // Sauvegarder la réponse du bot
        await this.saveMessage(sessionId, response);
        return [userMessage, response];
      }
      
      // Fallback si l'initialisation échoue
      const fallbackResponse: ChatMessage = {
        type: 'assistant',
        content: "Je vais démarrer le processus d'achat. Combien d'exemplaires souhaitez-vous commander ?",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_quantity' as ConversationStep,
          showQuantitySelector: true,
          maxQuantity: 10,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true
          }
        },
        timestamp: new Date().toISOString()
      };
      
      await this.saveMessage(sessionId, fallbackResponse);
      return [userMessage, fallbackResponse];
    } catch (error) {
      console.error('Error in handlePurchaseButton:', error);
      
      // Message d'erreur convivial
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors du démarrage du processus d'achat. Veuillez réessayer.",
        choices: ["Réessayer", "Contacter le support"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'initial' as ConversationStep,
          messageHandled: true,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        },
        timestamp: new Date().toISOString()
      };
      
      return [errorMessage];
    }
  }

  // Ajouter cette méthode pour gérer l'initialisation du flow Express
  public async handlePurchaseInitiation(
    sessionId: string,
    targetStep: ConversationStep = 'choose_flow'
  ): Promise<ChatMessage | null> {
  try {
    console.log(`[handlePurchaseInitiation] Starting purchase flow, target step: ${targetStep}`);
    
    // Vérifier si c'est un choix express ou standard
    if (targetStep === 'express_order') {
      return {
        type: 'assistant',
        content: "Parfait, allons-y rapidement. Quel est votre nom complet ?",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          flags: { 
            inPurchaseFlow: true, 
            expressMode: true,
            preventAIIntervention: true 
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Récupérer les données actuelles avec gestion d'erreur
    const orderData = await this.fetchOrderData(sessionId);
    
    if (!orderData) {
      // Créer un objet orderData minimal si aucun n'existe
      const defaultOrderData = {
        session_id: sessionId,
        items: [],
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        total_amount: 0,
        delivery_cost: 0,
        metadata: this.ensureValidMetadata({
          source: 'chatbot',
          storeId: '',
          productId: this.getCurrentProductId() || '',
          conversationId: sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          conversationHistory: [],
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            purchaseInitiated: true
          }
        })
      };
      
      // Initialiser le panier avec des données par défaut
      await this.saveProgress(sessionId, 'choose_flow', defaultOrderData);
      
      return {
        type: 'assistant',
        content: "Souhaitez-vous :",
        choices: ["✅ Commander rapidement (moins d'1 minute)", "🤖 Être guidé pas à pas avec mes conseils"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'choose_flow' as ConversationStep,
          orderData: defaultOrderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            flowChoicePending: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Mettre à jour avec les flags appropriés
    const updatedOrderData = {
      ...orderData,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          purchaseInitiated: true
        }
      })
    } as unknown as Partial<ChatOrderData>;
    
    // Sauvegarder la progression
    await this.saveProgress(sessionId, 'choose_flow', updatedOrderData);
    
    // Proposer le choix entre les deux parcours
    return {
      type: 'assistant',
      content: "Souhaitez-vous :",
      choices: ["✅ Commander rapidement (moins d'1 minute)", "🤖 Être guidé pas à pas avec mes conseils"],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'choose_flow' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          flowChoicePending: true
        }
      },
      timestamp: new Date().toISOString()
    };
    } catch (error) {
      console.error('Error in handlePurchaseInitiation:', error);
      return null;
    }
  }


  // Ajouter la gestion du choix du flow (express ou standard)
  public async handleFlowChoice(
    sessionId: string, 
    choice: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
  try {
    console.log(`[handleFlowChoice] Processing choice: "${choice}"`);
    
    const normalizedChoice = choice.toLowerCase();
    const isExpressMode = normalizedChoice.includes('rapidement') || normalizedChoice.includes('moins');
    
    // Mettre à jour les flags
    const updatedOrderData = {
      ...orderData,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: isExpressMode,
          standardMode: !isExpressMode,
          flowChosen: true
        }
      })
    };
    
    // Sauvegarder la progression
    if (isExpressMode) {
      await this.saveProgress(sessionId, 'express_name', updatedOrderData);
      
      return [{
        type: 'assistant',
        content: "Parfait, allons-y rapidement. Quel est votre nom complet ?",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          orderData: updatedOrderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      }];
    } else {
      // Mode standard/conversationnel
      await this.saveProgress(sessionId, 'collect_quantity', updatedOrderData);
      
      return [{
        type: 'assistant',
        content: "Parfait ! Combien d'exemplaires souhaitez-vous commander ?",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_quantity' as ConversationStep,
          showQuantitySelector: true,
          maxQuantity: 10,
          orderData: updatedOrderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            standardMode: true
          }
        },
        timestamp: new Date().toISOString()
      }];
    }
    } catch (error) {
      console.error('Error in handleFlowChoice:', error);
      return [{
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue. Veuillez réessayer.",
        choices: ["Réessayer", "Contacter le support"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'initial' as ConversationStep,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      }];
    }
  }

  // Méthode pour gérer la modification de la quantité
  public async handleQuantityConfirmation(
    sessionId: string,
    quantity: number,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    try {
      console.log(`[handleQuantityConfirmation] Processing quantity: ${quantity} for session ${sessionId}`);
      
      // Vérifications de base
      if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        return {
          type: 'assistant',
          content: "La quantité doit être comprise entre 1 et 10. Veuillez réessayer.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'collect_quantity' as ConversationStep,
            showQuantitySelector: true,
            maxQuantity: 10,
            orderData,
            messageHandled: true,
            flags: {
              quantitySelectorDisplayed: true,
              inPurchaseFlow: true,
              preventAIIntervention: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }
      
      // Récupérer les infos produit
      const productId = this.getCurrentProductId();
      if (!productId) {
        throw new Error('Product ID not found');
      }
      
      // Récupérer les données du produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, images')
        .eq('id', productId)
        .single();
      
      if (productError) {
        console.error('Error fetching product:', productError);
        throw new Error(`Failed to fetch product: ${productError.message}`);
      }
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      // Calculer le prix total
      const totalPrice = product.price * quantity;
      
      // Préparer les items
      const items = [{
        productId: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        totalPrice: totalPrice,
        image: Array.isArray(product.images) && product.images.length > 0 
          ? product.images[0] 
          : typeof product.images === 'string' 
            ? product.images 
            : null
      }];
      
      // Créer une metadata valide avec flags explicites
      const metadata = this.ensureValidMetadata({
        ...orderData.metadata,
        orderInfo: {
          ...(orderData.metadata?.orderInfo || {}),
          quantity,
          totalPrice,
          subtotal: totalPrice
        },
        flags: {
          ...(orderData.metadata?.flags || {}),
          quantityUpdated: true,
          inPurchaseFlow: true,
          preventAIIntervention: true,
          quantityConfirmed: true
        }
      });
      
      // Mettre à jour les données de commande
      const updatedOrderData: Partial<ChatOrderData> = {
        ...orderData,
        items,
        subtotal: totalPrice,
        total_amount: totalPrice + (orderData.delivery_cost || 0),
        metadata
      };
      
      // Sauvegarder la progression - capture des erreurs mais continue
      try {
        await this.saveProgress(sessionId, 'collect_name', updatedOrderData);
      } catch (saveError) {
        console.error('Error saving progress:', saveError);
        // Continuer malgré l'erreur
      }
      
      // Retourner le message de l'étape suivante
      return {
        type: 'assistant',
        content: `Parfait ! Pour préparer votre commande de ${quantity} exemplaire${quantity > 1 ? 's' : ''}, j'aurais besoin de quelques informations. Quel est votre nom complet ?`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_name' as ConversationStep,
          orderData: updatedOrderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            quantityHandled: true
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in handleQuantityConfirmation:', error);
      // Message d'erreur convivial
      return {
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue lors de la mise à jour de la quantité. Veuillez réessayer.",
        choices: ['Réessayer'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_quantity' as ConversationStep,
          showQuantitySelector: true,
          maxQuantity: 10,
          orderData,
          messageHandled: true,
          flags: {
            error: true,
            inPurchaseFlow: true,
            preventAIIntervention: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Gestionnaire du nom en mode express
  public async handleExpressName(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
  try {
    // Validation rapide du nom
    if (content.trim().length < 3) {
      return {
        type: 'assistant',
        content: "Veuillez entrer un nom valide (prénom et nom).",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Extraire prénom et nom
    const nameParts = content.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    // Mettre à jour orderData
    const updatedOrderData = {
      ...orderData,
      first_name: firstName,
      last_name: lastName,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        customerInfo: {
          ...(orderData.metadata?.customerInfo || {}),
          firstName,
          lastName,
          fullName: content.trim()
        },
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          nameCollected: true
        }
      })
    };
    
    // Passer à l'étape suivante
    await this.saveProgress(sessionId, 'express_phone', updatedOrderData);
    
    return {
      type: 'assistant',
      content: `Merci ${firstName}! Quel est votre numéro de téléphone ?`,
      choices: [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_phone' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
    } catch (error) {
      console.error('Error in handleExpressName:', error);
      return null;
    }
  }

  // Gestionnaire du téléphone en mode express
  public async handleExpressPhone(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
  try {
    const phoneService = PhoneService.getInstance();
    const phoneValidation = phoneService.validatePhoneNumber(content, 'SN');
    
    if (!phoneValidation.isValid) {
      return {
        type: 'assistant',
        content: phoneValidation.error || "Le numéro de téléphone n'est pas valide. Veuillez réessayer.",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_phone' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    const formattedPhone = phoneService.formatPhoneWithCountry(content, 'SN');
    
    if (!formattedPhone.isValid) {
      return {
        type: 'assistant',
        content: "Le format du numéro n'est pas valide. Veuillez réessayer.",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_phone' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Vérifier si c'est un client existant
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', formattedPhone.international)
      .single();
    
    // Créer la prochaine étape en fonction de l'existence du client
    let nextStep: ConversationStep = 'express_address';
    let responseContent = "Quelle est votre adresse exacte ?";
    
    // Mise à jour des données
    const updatedOrderData: Partial<ChatOrderData> = {
      ...orderData,
      phone: formattedPhone.international,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        customerInfo: {
          ...(orderData.metadata?.customerInfo || {}),
          phone: formattedPhone.international
        },
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          phoneCollected: true
        }
      })
    };
    
    // Utiliser les données existantes si disponibles
    if (existingCustomer) {
      updatedOrderData.first_name = existingCustomer.first_name || updatedOrderData.first_name;
      updatedOrderData.last_name = existingCustomer.last_name || updatedOrderData.last_name;
      updatedOrderData.city = existingCustomer.city;
      updatedOrderData.address = existingCustomer.address;
      updatedOrderData.email = existingCustomer.email;
      
      if (existingCustomer.address && existingCustomer.city) {
        nextStep = 'express_payment';
        responseContent = `Bonjour ${existingCustomer.first_name}, nous vous avons reconnu ! Nous utiliserons votre adresse habituelle: ${existingCustomer.address}, ${existingCustomer.city}.\n\nChoisissez votre mode de paiement:`;
        
        // Mettre à jour les flags
        if (updatedOrderData.metadata) {
          updatedOrderData.metadata.flags = {
            ...updatedOrderData.metadata.flags,
            existingCustomerFound: true,
            addressConfirmed: true,
            cityConfirmed: true
          };
        }
      }
    }
    
    // Sauvegarder la progression
    await this.saveProgress(sessionId, nextStep, updatedOrderData);
    
    return {
      type: 'assistant',
      content: responseContent,
      choices: nextStep === 'express_payment' ? ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'] : [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
    } catch (error) {
      console.error('Error in handleExpressPhone:', error);
      return null;
    }
  }


  // Gestionnaire de l'adresse en mode express
  public async handleExpressAddress(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
  try {
    if (content.trim().length < 5) {
      return {
        type: 'assistant',
        content: "Veuillez entrer une adresse valide (minimum 5 caractères).",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_address' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Mettre à jour orderData
    const updatedOrderData = {
      ...orderData,
      address: content.trim(),
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        shippingInfo: {
          ...(orderData.metadata?.shippingInfo || {}),
          address: content.trim()
        },
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          addressCollected: true
        }
      })
    };
    
    // Passer à l'étape suivante
    await this.saveProgress(sessionId, 'express_city', updatedOrderData);
    
    return {
      type: 'assistant',
      content: "Dans quelle ville habitez-vous ?",
      choices: [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_city' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
    } catch (error) {
      console.error('Error in handleExpressAddress:', error);
      return null;
    }
  }

  // Gestionnaire de la ville en mode express
  public async handleExpressCity(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage | null> {
  try {
    if (content.trim().length < 2) {
      return {
        type: 'assistant',
        content: "Veuillez entrer un nom de ville valide.",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_city' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Mettre à jour orderData
    const updatedOrderData = {
      ...orderData,
      city: content.trim(),
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        shippingInfo: {
          ...(orderData.metadata?.shippingInfo || {}),
          city: content.trim()
        },
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          cityCollected: true
        }
      })
    };
    
    // Passer à l'étape suivante
    await this.saveProgress(sessionId, 'express_payment', updatedOrderData);
    
    // Ajouter le calcul des frais de livraison ici
    let deliveryCost = 0;
    
    // Exemple de logique pour les frais de livraison (à adapter selon vos règles)
    if (content.trim().toLowerCase() === 'dakar') {
      deliveryCost = 1000; // 1000 FCFA pour Dakar
    } else {
      deliveryCost = 2500; // 2500 FCFA pour les autres villes
    }
    
    // Mettre à jour le total
    const subtotal = (updatedOrderData.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const totalAmount = subtotal + deliveryCost;
    
    const finalOrderData = {
      ...updatedOrderData,
      delivery_cost: deliveryCost,
      subtotal: subtotal,
      total_amount: totalAmount
    };
    
    await this.saveProgress(sessionId, 'express_payment', finalOrderData);
    
    return {
      type: 'assistant',
      content: "Choisissez votre mode de paiement :",
      choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        orderData: finalOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
    } catch (error) {
      console.error('Error in handleExpressCity:', error);
      return null;
    }
  }

  // Gestionnaire du paiement en mode express
  public async handleExpressPayment(
    sessionId: string,
    content: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
  try {
    // Normaliser l'entrée pour détecter la méthode de paiement
    const normalizedContent = content.toLowerCase().trim();
    
    // Détecter la méthode de paiement choisie
    let paymentMethod: PaymentProvider | undefined;
    let paymentMethodName: string;
    
    if (normalizedContent.includes('wave')) {
      paymentMethod = 'WAVE' as PaymentProvider;
      paymentMethodName = 'Wave';
    } else if (normalizedContent.includes('orange')) {
      paymentMethod = 'ORANGE_MONEY' as PaymentProvider;
      paymentMethodName = 'Orange Money';
    } else if (normalizedContent.includes('carte')) {
      paymentMethod = 'CARD' as PaymentProvider;
      paymentMethodName = 'Carte bancaire';
    } else if (normalizedContent.includes('livraison')) {
      paymentMethod = 'CASH_ON_DELIVERY' as PaymentProvider;
      paymentMethodName = 'Paiement à la livraison';
    } else {
      // Méthode de paiement non reconnue
      return [{
        type: 'assistant',
        content: "Je n'ai pas reconnu la méthode de paiement. Veuillez choisir parmi les options proposées.",
        choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      }];
    }
    
    // Créer un récapitulatif de commande rapide
    const productName = orderData.items?.[0]?.name || 'Produit';
    const quantity = orderData.items?.[0]?.quantity || 1;
    const city = orderData.city || '';
    const firstName = orderData.first_name || '';
    
    // Mettre à jour les données de commande avec la méthode de paiement choisie
    const updatedOrderData: Partial<ChatOrderData> = {
      ...orderData,
      payment_method: paymentMethod,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          paymentMethodSelected: true,
          selectedPaymentMethod: paymentMethod
        }
      })
    };
    
    // Générer le récapitulatif
    const summary = `📝 **Récapitulatif rapide**\n
    • Produit : ${productName}
    • Quantité : ${quantity}
    • Livraison à : ${city}
    • Paiement : ${paymentMethodName}\n
    Montant total : ${orderData.total_amount?.toLocaleString() || '0'} FCFA\n
    Tout est correct ?`;
    
    // Sauvegarder la progression
    await this.saveProgress(sessionId, 'express_summary', updatedOrderData);
    
    return [{
      type: 'assistant',
      content: summary,
      choices: ['Valider la commande', 'Modifier ma commande'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_summary' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    }];
      } catch (error) {
        console.error('Error in handleExpressPayment:', error);
        return [{
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors du traitement de votre méthode de paiement.",
          choices: ['Réessayer', 'Contacter le support'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_payment' as ConversationStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
    }


// Gestionnaire du récapitulatif express et confirmation - méthode complète
public async handleExpressSummary(
  sessionId: string,
  content: string,
  orderData: Partial<ChatOrderData>
): Promise<ChatMessage[]> {
  try {
    const normalizedContent = content.toLowerCase().trim();
    const isConfirmed = normalizedContent.includes('valider') || normalizedContent.includes('correct');
    
    if (!isConfirmed) {
      // L'utilisateur veut modifier sa commande
      return [{
        type: 'assistant',
        content: "Que souhaitez-vous modifier ?",
        choices: ['Quantité', 'Adresse', 'Mode de paiement'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_modify' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            expressMode: true
          }
        },
        timestamp: new Date().toISOString()
      }];
    }
    
    // L'utilisateur confirme la commande
    
    // Traiter le paiement selon la méthode choisie
    const paymentMethod = orderData.payment_method as PaymentProvider;
    
    if (paymentMethod === 'CASH') {
      // Pour le paiement à la livraison, créer directement la commande
      try {
        const orderService = OrderService.getInstance();
        
        // Créer la commande
        const orderId = await orderService.createOrder(sessionId);
        
        // Ajouter l'ID de commande aux métadonnées
        const completedOrderData: Partial<ChatOrderData> = {
          ...orderData,
          status: 'confirmed' as const,
          paymentStatus: 'pending' as const,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            orderId,
            flags: {
              ...(orderData.metadata?.flags || {}),
              orderCreated: true,
              paymentCompleted: true,
              expressMode: true
            }
          })
        };
        
        // Enregistrer la progression
        await this.saveProgress(sessionId, 'payment_complete', completedOrderData);
        
        // Message de confirmation
        return [{
          type: 'assistant',
          content: `🎉 Félicitations ! Votre commande #${orderId} a été confirmée avec succès !\n\nVous avez choisi le paiement à la livraison. Notre équipe vous contactera dans les 24 heures pour confirmer la livraison.\n\nMerci pour votre confiance !`,
          choices: ['Voir ma commande', 'Quand sera-t-elle livrée ?', 'Merci, au revoir'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_complete' as ConversationStep,
            orderData: completedOrderData,
            orderId,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              orderCreated: true,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      } catch (error) {
        console.error('Error creating order for cash on delivery:', error);
        return [{
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors de la création de votre commande. Veuillez réessayer ou contacter notre support.",
          choices: ['Réessayer', 'Contacter le support'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_error' as ConversationStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
    } else {
      // Pour les autres méthodes de paiement, rediriger vers le processus de paiement
      
      // Structure de réponse attendue de l'API de paiement
      interface PaymentResponse {
        success: boolean;
        paymentUrl?: string;
        clientSecret?: string;
        error?: string;
      }
      
      // Initialiser la demande de paiement
      const paymentResponse: PaymentResponse = await this.orderPaymentService.initiatePayment(
        sessionId,
        orderData,
        paymentMethod,
        {
          sessionId,
          provider: paymentMethod,
          amount: orderData.total_amount || 0,
          customerInfo: {
            name: `${orderData.first_name || ''} ${orderData.last_name || ''}`.trim(),
            phone: orderData.phone || '',
            city: orderData.city || ''
          },
          metadata: orderData.metadata
        }
      );
      
      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Mettre à jour l'état avec l'URL de paiement
        const paymentOrderData: Partial<ChatOrderData> = {
          ...orderData,
          metadata: this.ensureValidMetadata({
            ...orderData.metadata,
            paymentUrl: paymentResponse.paymentUrl,
            clientSecret: paymentResponse.clientSecret,
            flags: {
              ...(orderData.metadata?.flags || {}),
              paymentInitiated: true,
              selectedPaymentMethod: paymentMethod,
              expressMode: true
            }
          })
        };
        
        // Sauvegarder la progression
        await this.saveProgress(sessionId, 'payment_processing', paymentOrderData);
        
        // Créer le lien selon la méthode
        let paymentInstructions = `Veuillez suivre ces étapes pour finaliser votre paiement :\n\n`;
        paymentInstructions += `1. Cliquez sur le lien de paiement ci-dessous\n`;
        paymentInstructions += `2. Complétez le paiement\n`;
        paymentInstructions += `3. Revenez ici et cliquez sur "J'ai payé" une fois le paiement effectué\n\n`;
        paymentInstructions += `[Cliquez ici pour payer](${paymentResponse.paymentUrl})`;
        
        return [{
          type: 'assistant',
          content: paymentInstructions,
          choices: ['J\'ai payé', 'Je rencontre un problème', 'Changer de méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_processing' as ConversationStep,
            orderData: paymentOrderData,
            paymentUrl: paymentResponse.paymentUrl,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              paymentInitiated: true,
              selectedPaymentMethod: paymentMethod,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      } else {
        // Erreur d'initialisation du paiement
        return [{
          type: 'assistant',
          content: "Je suis désolée, une erreur est survenue lors de l'initialisation du paiement. Veuillez réessayer ou choisir une autre méthode de paiement.",
          choices: ['Réessayer', 'Choisir une autre méthode'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_error' as ConversationStep,
            orderData,
            messageHandled: true,
            error: paymentResponse.error,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        }];
      }
    }
  } catch (error) {
    console.error('Error in handleExpressSummary:', error);
    return [{
      type: 'assistant',
      content: "Je suis désolée, une erreur est survenue lors de la finalisation de votre commande. Veuillez réessayer ou contacter notre support.",
      choices: ['Réessayer', 'Contacter le support'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_error' as ConversationStep,
        orderData,
        messageHandled: true,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    }];
  }
}

// Gestionnaire des modifications express
public async handleExpressModify(
  sessionId: string,
  content: string,
  orderData: Partial<ChatOrderData>
): Promise<ChatMessage | null> {
  try {
    const normalizedContent = content.toLowerCase().trim();
    
    // Déterminer ce que l'utilisateur veut modifier
    let nextStep: ConversationStep;
    let responseContent: string;
    
    if (normalizedContent.includes('quantité')) {
      nextStep = 'collect_quantity';
      responseContent = "Combien d'exemplaires souhaitez-vous commander ?";
    } else if (normalizedContent.includes('adresse')) {
      nextStep = 'express_address';
      responseContent = "Quelle est votre adresse exacte ?";
    } else if (normalizedContent.includes('paiement')) {
      nextStep = 'express_payment';
      responseContent = "Choisissez votre mode de paiement :";
    } else {
      // Si la demande n'est pas claire, retourner au récapitulatif
      nextStep = 'express_summary';
      responseContent = "Je n'ai pas compris ce que vous souhaitez modifier. Veuillez choisir parmi les options proposées.";
    }
    
    // Mettre à jour les flags
    const updatedOrderData = {
      ...orderData,
      metadata: this.ensureValidMetadata({
        ...orderData.metadata,
        flags: {
          ...(orderData.metadata?.flags || {}),
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true,
          modificationRequested: true
        }
      })
    };
    
    // Sauvegarder la progression
    await this.saveProgress(sessionId, nextStep, updatedOrderData);
    
    // Générer les choices selon l'étape
    let choices: string[] = [];
    if (nextStep === 'express_payment') {
      choices = ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'];
    }
    
    return {
      type: 'assistant',
      content: responseContent,
      choices,
      assistant: this.getBotInfo(),
      metadata: {
        nextStep,
        orderData: updatedOrderData,
        messageHandled: true,
        showQuantitySelector: nextStep === 'collect_quantity',
        maxQuantity: nextStep === 'collect_quantity' ? 10 : undefined,
        flags: {
          inPurchaseFlow: true,
          preventAIIntervention: true,
          expressMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in handleExpressModify:', error);
    return null;
  }
}

// Méthode principale pour gérer les messages utilisateur en mode express
public async handleUserMessageExpress(
  sessionId: string,
  content: string,
  currentStep: ConversationStep,
  orderData: Partial<ChatOrderData> = {}
): Promise<ChatMessage[]> {
  try {
    console.log(`[handleUserMessageExpress] Processing message in express mode: "${content.substring(0, 30)}..."`);
    
    // Vérifier si nous sommes dans le flux express
    const isExpressMode = orderData.metadata?.flags?.expressMode === true ||
                          currentStep.startsWith('express_');
    
    if (!isExpressMode) {
      console.log('Not in express mode, using predefined choice handler instead');
      
      // Utiliser le handler de choix prédéfini plutôt que de revenir au handleUserMessage
      // pour éviter la récursion infinie
      const orderDataWithPreventRecursion = {
        ...orderData,
        metadata: this.ensureValidMetadata({
          ...orderData.metadata,
          flags: {
            ...(orderData.metadata?.flags || {}),
            preventRecursion: true
          }
        })
      };
      
      // Essayer d'abord le gestionnaire de choix prédéfinis
      if (this.predefinedChoices.includes(content)) {
        const response = await this.handlePredefinedChoice(sessionId, content);
        return response;
      }
      
      // Si ce n'est pas un choix prédéfini, créer une réponse générique
      const genericResponse: ChatMessage = {
        type: 'assistant',
        content: "Je vais continuer avec votre processus d'achat. Merci de suivre les instructions à l'écran.",
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: currentStep,
          orderData: orderDataWithPreventRecursion,
          messageHandled: true,
          flags: {
            preventAIIntervention: true,
            inPurchaseFlow: true,
            preventRecursion: true
          }
        },
        timestamp: new Date().toISOString()
      };
      
      await this.saveMessage(sessionId, genericResponse);
      return [genericResponse];
    }
    
    // Traiter les différentes étapes du flux express
    switch (currentStep) {
      case 'choose_flow':
        return await this.handleFlowChoice(sessionId, content, orderData);
      
      case 'express_name':
        const nameResponse = await this.handleExpressName(sessionId, content, orderData);
        return nameResponse ? [nameResponse] : [];
      
      case 'express_phone':
        const phoneResponse = await this.handleExpressPhone(sessionId, content, orderData);
        return phoneResponse ? [phoneResponse] : [];
      
      case 'express_address':
        const addressResponse = await this.handleExpressAddress(sessionId, content, orderData);
        return addressResponse ? [addressResponse] : [];
      
      case 'express_city':
        const cityResponse = await this.handleExpressCity(sessionId, content, orderData);
        return cityResponse ? [cityResponse] : [];
      
      case 'express_payment':
        return await this.handleExpressPayment(sessionId, content, orderData);
      
      case 'express_summary':
        return await this.handleExpressSummary(sessionId, content, orderData);
      
      case 'express_modify':
        const modifyResponse = await this.handleExpressModify(sessionId, content, orderData);
        return modifyResponse ? [modifyResponse] : [];
      
      default:
        // Pour les autres étapes, utiliser un handler générique pour le mode express
        console.log(`[handleUserMessageExpress] No specific handler for step ${currentStep}, using generic handler`);
        
        // Créer une réponse générique
        const fallbackResponse: ChatMessage = {
          type: 'assistant',
          content: "Je continue avec votre commande rapide. Veuillez suivre les instructions à l'écran.",
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: currentStep,
            orderData,
            messageHandled: true,
            flags: {
              inPurchaseFlow: true,
              preventAIIntervention: true,
              expressMode: true
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await this.saveMessage(sessionId, fallbackResponse);
        return [fallbackResponse];
    }
  } catch (error) {
    console.error('Error in handleUserMessageExpress:', error);
    return [{
      type: 'assistant',
      content: "Je suis désolée, une erreur est survenue. Veuillez réessayer ou contacter notre support.",
      choices: ['Réessayer', 'Contacter le support'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_error' as ConversationStep,
        messageHandled: true
      },
      timestamp: new Date().toISOString()
    }];
  }
}


  private async getCurrentMessageMetadata(sessionId: string): Promise<any> {
    try {
      // Récupérer le dernier message du bot dans la conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('metadata')
        .eq('conversation_id', sessionId)
        .eq('type', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (messages && messages.length > 0) {
        return messages[0].metadata;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current message metadata:', error);
      return null;
    }
  }

  // Méthode pour obtenir les produits disponibles pour recommendations
  public async getAvailableProducts(currentProductId: string): Promise<ProductRecommendation[]> {
    try {
      console.log(`[getAvailableProducts] Getting recommendations for product: ${currentProductId}`);
      
      // Utiliser le service de recommandation
      const recommendationService = RecommendationService;
      
      const recommendations = await recommendationService.getRecommendations({
        currentProductId: currentProductId as ProductId,
        buyingIntent: 0.8, // Valeur haute pour limiter à 2 recommandations
        userPreferences: {
          categories: ['romance', 'family'],
          priceRange: [0, 50000]
        },
        conversationContext: {
          mentionedTopics: ['relations', 'famille', 'communication'],
          // Ajouter les propriétés manquantes
          concerns: [],
          interests: []
        }
      });
      
      return recommendations;
    } catch (error) {
      console.error('Error getting available products:', error);
      // Retourner une liste vide en cas d'erreur
      return [];
    }
  }
  

  // Obtenir tous les messages d'une conversation
  public async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      // Vérifier d'abord dans le cache
      if (this.messageCache.has(sessionId)) {
        return this.messageCache.get(sessionId) || [];
      }
      
      // Sinon, récupérer à partir de la base de données
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .order('created_at');
      
      if (error) {
        throw error;
      }
      
      // Convertir les messages de la base de données au format ChatMessage
      const chatMessages: ChatMessage[] = messages?.map(msg => ({
        type: msg.type as MessageType,
        content: msg.content,
        assistant: msg.metadata?.assistant,
        choices: msg.metadata?.choices || [],
        metadata: msg.metadata,
        timestamp: msg.created_at
      })) || [];
      
      // Mettre à jour le cache
      this.messageCache.set(sessionId, chatMessages);
      
      return chatMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Sauvegarder un message dans la base de données
  public async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      // Vérifier les entrées
      if (!sessionId) {
        console.warn('Cannot save message: sessionId is empty');
        return;
      }
      
      if (!message) {
        console.warn('Cannot save message: message is undefined');
        return;
      }
  
      // Générer un ID unique pour le message s'il n'en a pas déjà un
      const messageId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      message.id = messageId;
  
      // Normaliser le contenu du message
      let content = '';
      if (typeof message.content === 'string') {
        content = message.content.substring(0, 4000);
      } else if (typeof message.content === 'object' && message.content !== null) {
        try {
          content = JSON.stringify(message.content).substring(0, 4000);
        } catch (e) {
          content = 'Complex content object';
        }
      }
  
      // Ajouter au cache d'abord pour une réponse rapide de l'UI
      if (this.messageCache.has(sessionId)) {
        const existingMessages = this.messageCache.get(sessionId) || [];
        // Vérifier si un message avec le même ID existe déjà dans le cache
        const existingIndex = existingMessages.findIndex(m => m.id === messageId);
        if (existingIndex >= 0) {
          // Remplacer le message existant plutôt que d'ajouter un doublon
          existingMessages[existingIndex] = message;
          this.messageCache.set(sessionId, existingMessages);
        } else {
          // Ajouter le nouveau message
          this.messageCache.set(sessionId, [...existingMessages, message]);
        }
      } else {
        this.messageCache.set(sessionId, [message]);
      }
  
      // Construire l'objet metadata avec inPurchaseFlow et preventAIIntervention
      const metadata = {
        ...(message.metadata || {}),
        assistant: message.assistant,
        choices: message.choices || [],
        flags: {
          ...(message.metadata?.flags || {}),
          messageId: messageId,
          inPurchaseFlow: message.metadata?.flags?.inPurchaseFlow === true,
          preventAIIntervention: message.metadata?.flags?.preventAIIntervention === true
        }
      };
  
      // Construire le payload complet - utilisé si vous avez une logique qui dépend de ce champ
      const payload = {
        content,
        metadata,
        type: message.type,
        timestamp: message.timestamp || new Date().toISOString(),
        choices: message.choices || []
      };
  
      // Préparer des données propres pour l'insertion, correspondant à la structure de votre table
      const sanitizedMessageData = {
        id: messageId,
        conversation_id: sessionId,
        content: content,
        type: message.type,
        sender: message.type === 'user' ? 'customer' : 'assistant',
        metadata: metadata,
        created_at: message.timestamp || new Date().toISOString()
      };
  
      // Utiliser une transaction pour plus de robustesse
      try {
        // Vérifier d'abord si le message existe déjà
        const { data: existing, error: checkError } = await supabase
          .from('messages')
          .select('id')
          .eq('id', messageId)
          .maybeSingle();
  
        if (checkError) {
          console.warn('Error checking for existing message:', checkError);
        }
  
        if (existing) {
          // Le message existe déjà, faire une mise à jour
          console.log(`Message ${messageId} already exists, updating instead of inserting`);
          
          const { error: updateError } = await supabase
            .from('messages')
            .update({
              content: content,
              metadata: metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', messageId);
          
          if (updateError) {
            console.error('Failed to update existing message:', updateError);
          }
        } else {
          // Nouvelle insertion avec gestion robuste des erreurs
          try {
            const { error } = await supabase
              .from('messages')
              .insert([sanitizedMessageData]);
  
            if (error) {
              console.error('Supabase insertion error details:', error);
              
              // Si erreur de contrainte unique ou autre, essayer une mise à jour
              if (error.code === '23505' || error.message?.includes('duplicate')) {
                console.log('Message ID conflict detected, trying to update instead');
                
                try {
                  const { error: updateError } = await supabase
                    .from('messages')
                    .update({
                      content: content,
                      metadata: metadata,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', messageId);
                  
                  if (updateError) {
                    console.error('Failed to update message during fallback:', updateError);
                  }
                } catch (fallbackError) {
                  console.error('Error during update fallback:', fallbackError);
                }
              }
            }
          } catch (insertError) {
            console.error('Error during message insertion:', insertError);
            
            // Dernière tentative avec upsert pour être sûr
            try {
              const { error: upsertError } = await supabase
                .from('messages')
                .upsert([sanitizedMessageData], {
                  onConflict: 'id',
                  ignoreDuplicates: false
                });
              
              if (upsertError) {
                console.error('Final upsert attempt failed:', upsertError);
              }
            } catch (upsertError) {
              console.error('Error during upsert fallback:', upsertError);
            }
          }
        }
      } catch (dbError) {
        console.error('Database operation error:', dbError);
      }
  
      // Mettre à jour le compteur de messages si nécessaire
      // Encapsulé dans un try/catch pour éviter de casser le flux même si échoue
      try {
        await incrementMessageCount(sessionId);
      } catch (error) {
        console.warn('Error incrementing message count:', error);
      }
      
    } catch (error) {
      console.error(`Error saving message:`, error);
      // Ne pas propager l'erreur pour éviter de casser le flux
    }
  }

// Fonction utilitaire pour vérifier si un message similaire existe déjà
private async checkForDuplicateMessage(
  sessionId: string,
  content: string,
  type: MessageType
): Promise<boolean> {
  try {
    // Vérifier d'abord dans le cache
    if (this.messageCache.has(sessionId)) {
      const cachedMessages = this.messageCache.get(sessionId) || [];
      
      // Chercher un message récent avec le même contenu
      const duplicateInCache = cachedMessages
        .slice(-5) // Vérifier uniquement les 5 derniers messages pour performance
        .some(msg => 
          msg.type === type && 
          typeof msg.content === 'string' && 
          msg.content === content
        );
      
      if (duplicateInCache) {
        console.log('Duplicate message found in cache, skipping save');
        return true;
      }
    }
    
    // Ensuite, vérifier dans la base de données
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, type')
      .eq('conversation_id', sessionId)
      .eq('content', content)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(2);
      
    if (recentMessages && recentMessages.length > 0) {
      console.log('Duplicate message found in database, skipping save');
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking for duplicate messages:', error);
    return false; // En cas d'erreur, continuer avec la sauvegarde
  }
}

  // Méthode pour déplacer la conversation à une étape spécifique
  public async moveToStep(sessionId: string, step: ConversationStep): Promise<void> {
    try {
      await this.flowManager.setCurrentStep(sessionId, step);
    } catch (error) {
      console.error('Error moving to step:', error);
      throw error;
    }
  }

  // Méthode pour récupérer les données de commande
  private async fetchOrderData(sessionId: string): Promise<OrderData | null> {
    try {
      // Vérifier d'abord dans le cache
      if (this.orderDataCache.has(sessionId)) {
        return this.orderDataCache.get(sessionId) || null;
      }
      
      // Sinon, récupérer à partir de la base de données
      const { data: cart, error } = await supabase
        .from('abandoned_carts')
        .select('metadata')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('Error fetching order data:', error);
        return null;
      }
      
      if (!cart?.metadata?.orderData) {
        console.warn('No order data found for session:', sessionId);
        return null;
      }
      
      // S'assurer que source est toujours définie dans les données de commande
      const orderData = cart.metadata.orderData as OrderData;
      if (!orderData.metadata) {
        orderData.metadata = {
          source: 'chatbot',
          storeId: '',
          productId: this.getCurrentProductId() || '',
          conversationId: sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          conversationHistory: []
        };
      } else if (!orderData.metadata.source) {
        orderData.metadata.source = 'chatbot';
      }
      
      // Mettre à jour le cache
      this.orderDataCache.set(sessionId, orderData);
      
      return orderData;
    } catch (error) {
      console.error('Error fetching order data:', error);
      return null;
    }
  }

  // Méthode pour créer une réponse standard
  private async createResponse(
    content: string,
    choices: string[] = [],
    nextStep: ConversationStep = 'initial',
    additionalData: any = {}
  ): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content,
      choices,
      assistant: this.getBotInfo(),
      metadata: {
        nextStep,
        ...additionalData,
        messageHandled: true
      },
      timestamp: new Date().toISOString()
    };
  }

  // Méthode pour enrichir une réponse avec des choix contextuels
  private enrichResponseWithContextualChoices(
    response: AIResponse,
    currentStep: ConversationStep
  ): AIResponse {
    // Si la réponse contient déjà des choix, ne pas les modifier
    if (response.choices && response.choices.length > 0) {
      return response;
    }
    
    // Ajouter des choix par défaut selon l'étape actuelle
    response.choices = this.flowManager.getChoicesForStep(currentStep);
    
    return response;
  }

  // Méthode pour générer une réponse personnalisée selon l'étape
  private async generatePersonalizedResponse(
    step: ConversationStep,
    orderData: Partial<ChatOrderData>,
    productId: string
  ): Promise<ChatMessage> {
    try {
      // Personnaliser la réponse selon l'étape
      switch (step) {
        case 'collect_quantity':
          return {
            type: 'assistant',
            content: "Parfait ! Combien d'exemplaires souhaitez-vous commander ?",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'collect_quantity',
              showQuantitySelector: true,
              maxQuantity: 10,
              orderData,
              messageHandled: true
            },
            timestamp: new Date().toISOString()
          };
          
        case 'collect_name':
          return {
            type: 'assistant',
            content: "Super ! Pour préparer votre commande, j'aurais besoin de quelques informations. Quel est votre nom complet ?",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'collect_name',
              orderData,
              messageHandled: true
            },
            timestamp: new Date().toISOString()
          };
          
        case 'collect_phone':
          return {
            type: 'assistant',
            content: "Excellent ! Pour enregistrer votre commande, j'aurais besoin de quelques informations. Commençons par la base. Quel est votre numéro de téléphone ?",
            choices: [],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'collect_phone',
              orderData,
              messageHandled: true
            },
            timestamp: new Date().toISOString()
          };
          
        case 'order_summary':
          return {
            type: 'assistant',
            content: await this.generateOrderSummary(orderData.session_id || ''),
            choices: ["C'est correct", "Je veux modifier"],
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: 'order_summary',
              orderData,
              messageHandled: true
            },
            timestamp: new Date().toISOString()
          };
          
        default:
          // Réponse par défaut
          return {
            type: 'assistant',
            content: "Comment puis-je vous aider avec votre commande ?",
            choices: this.flowManager.getChoicesForStep(step),
            assistant: this.getBotInfo(),
            metadata: {
              nextStep: step,
              orderData,
              messageHandled: true
            },
            timestamp: new Date().toISOString()
          };
      }
    } catch (error) {
      console.error('Error generating personalized response:', error);
      return this.createErrorMessage();
    }
  }

  // Méthodes pour les produits
  private async handleProductDescription(productId: string, sessionId: string): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('name, description')
        .eq('id', productId)
        .single();
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      return {
        type: 'assistant',
        content: `**${product.name}**\n\n${product.description}`,
        choices: ["Je veux l'acheter maintenant", "Je veux voir les témoignages", "Comment y jouer ?"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'description' as ConversationStep,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting product description:', error);
      return this.createErrorMessage();
    }
  }

  private async handleTestimonials(productId: string, sessionId: string): Promise<ChatMessage> {
    try {
      const { data: testimonials } = await supabase
        .from('product_testimonials')
        .select('content, customer_name')
        .eq('product_id', productId)
        .limit(3);
      
      let content = "Voici ce que nos clients disent de ce jeu :\n\n";
      
      if (!testimonials || testimonials.length === 0) {
        content = "Nous n'avons pas encore de témoignages pour ce jeu, mais nos clients adorent généralement nos jeux relationnels. Soyez parmi les premiers à partager votre expérience !";
      } else {
        testimonials.forEach((testimonial, index) => {
          content += `**${testimonial.customer_name || 'Client satisfait'}** :\n"${testimonial.content}"\n\n`;
        });
      }
      
      return {
        type: 'assistant',
        content,
        choices: ["Je veux l'acheter maintenant", "Je veux en savoir plus", "Comment y jouer ?"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'testimonials' as ConversationStep,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting testimonials:', error);
      return this.createErrorMessage();
    }
  }

  private async handleGameRules(productId: string, sessionId: string): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('name, game_rules')
        .eq('id', productId)
        .single();
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      const gameRules = product.game_rules || "Les règles détaillées sont incluses dans la boîte de jeu.";
      
      return {
        type: 'assistant',
        content: `**Comment jouer à ${product.name}**\n\n${gameRules}`,
        choices: ["Je veux l'acheter maintenant", "Je veux en savoir plus", "Je veux voir les témoignages"],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'game_rules' as ConversationStep,
          messageHandled: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting game rules:', error);
      return this.createErrorMessage();
    }
  }

  // Méthode pour créer un message d'erreur
  private createErrorMessage(): ChatMessage {
    return {
      type: 'assistant',
      content: "Je suis désolée, une erreur est survenue. Veuillez réessayer ou contacter notre support.",
      choices: ["Réessayer", "Contacter le support"],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'initial' as ConversationStep,
        error: "Une erreur est survenue", 
        messageHandled: true
      },
      timestamp: new Date().toISOString()
    };
  }

  // Méthode pour récupérer les informations du bot
  private getBotInfo() {
    return this.flowManager.getBotInfo();
  }

  public async handleDataCollection(
    sessionId: string,
    step: ConversationStep,
    input: string,
    productId: string
  ): Promise<ChatMessage | null> {
    try {
      console.log(`[handleDataCollection] Processing step: ${step}, input: "${input}"`);
      
      // Récupérer les données actuelles
      const orderData = await this.fetchOrderData(sessionId);
      
      if (!orderData) {
        throw new Error(`No order data found for session: ${sessionId}`);
      }
      
      // Convertir explicitement en Partial<ChatOrderData>
      const chatOrderData: Partial<ChatOrderData> = {
        ...orderData,
        formStep: orderData.formStep as ConversationStep
      };
      
      // Valider l'entrée de l'utilisateur
      const validation = await this.flowManager.validateStepData(step, input, chatOrderData);
      
      // Si la validation échoue, retourner le message d'erreur
      if (!validation.isValid) {
        return {
          type: 'assistant',
          content: validation.error || `L'information fournie n'est pas valide. Veuillez réessayer.`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: step,
            orderData: chatOrderData,
            messageHandled: true
          },
          timestamp: new Date().toISOString()
        };
      }
      
      // Déterminer la prochaine étape
      const nextStep = validation.nextStep || this.flowManager.getNextStep(step);
      
      // Mettre à jour les données de commande selon l'étape actuelle
      let updatedOrderData: Partial<ChatOrderData> = { ...chatOrderData };
      
      switch (step) {
        case 'collect_name':
          // Extraire prénom et nom
          const nameParts = input.trim().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          updatedOrderData = {
            ...chatOrderData,
            first_name: firstName,
            last_name: lastName,
            metadata: this.ensureValidMetadata({
              ...chatOrderData.metadata,
              customerInfo: {
                ...(chatOrderData.metadata?.customerInfo || {}),
                firstName,
                lastName,
                fullName: input.trim()
              },
              flags: {
                ...(chatOrderData.metadata?.flags || {}),
                nameCollected: true
              }
            })
          };
          break;
          
        case 'collect_city':
          updatedOrderData = {
            ...chatOrderData,
            city: input.trim(),
            metadata: this.ensureValidMetadata({
              ...chatOrderData.metadata,
              shippingInfo: {
                ...(chatOrderData.metadata?.shippingInfo || {}),
                city: input.trim()
              },
              flags: {
                ...(chatOrderData.metadata?.flags || {}),
                cityCollected: true
              }
            })
          };
          break;
          
        case 'collect_address':
          updatedOrderData = {
            ...chatOrderData,
            address: input.trim(),
            metadata: this.ensureValidMetadata({
              ...chatOrderData.metadata,
              shippingInfo: {
                ...(chatOrderData.metadata?.shippingInfo || {}),
                address: input.trim()
              },
              flags: {
                ...(chatOrderData.metadata?.flags || {}),
                addressCollected: true
              }
            })
          };
          break;
          
        case 'collect_email':
          updatedOrderData = {
            ...chatOrderData,
            email: input.trim(),
            metadata: this.ensureValidMetadata({
              ...chatOrderData.metadata,
              customerInfo: {
                ...(chatOrderData.metadata?.customerInfo || {}),
                email: input.trim()
              },
              flags: {
                ...(chatOrderData.metadata?.flags || {}),
                emailCollected: true
              }
            })
          };
          break;
          
        case 'check_existing':
          // Cas spécial: Gérer la réponse à "même adresse" ou "nouvelle adresse"
          if (input.toLowerCase().includes('même') || input.toLowerCase().includes('oui')) {
            // Utiliser l'adresse existante et passer à l'étape des recommandations
            updatedOrderData = {
              ...chatOrderData,
              metadata: this.ensureValidMetadata({
                ...chatOrderData.metadata,
                flags: {
                  ...(chatOrderData.metadata?.flags || {}),
                  useExistingAddress: true,
                  addressConfirmed: true
                }
              })
            };
            
            await this.saveProgress(sessionId, 'recommend_products', updatedOrderData);
            
            return {
              type: 'assistant',
              content: "Parfait ! Nous utiliserons votre adresse habituelle. Souhaitez-vous également voir d'autres jeux qui pourraient vous intéresser ?",
              choices: ['Oui, montrez-moi', 'Non, juste celui-ci'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'recommend_products' as ConversationStep,
                orderData: updatedOrderData,
                messageHandled: true
              },
              timestamp: new Date().toISOString()
            };
          } else {
            // Nouvelle adresse, demander la ville
            updatedOrderData = {
              ...chatOrderData,
              metadata: this.ensureValidMetadata({
                ...chatOrderData.metadata,
                flags: {
                  ...(chatOrderData.metadata?.flags || {}),
                  useExistingAddress: false
                }
              })
            };
            
            await this.saveProgress(sessionId, 'collect_city', updatedOrderData);
            
            return {
              type: 'assistant',
              content: "D'accord, nous allons utiliser une nouvelle adresse. Dans quelle ville habitez-vous ?",
              choices: [],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'collect_city' as ConversationStep,
                orderData: updatedOrderData,
                messageHandled: true
              },
              timestamp: new Date().toISOString()
            };
          }
          
        case 'order_summary':
          // Cas spécial: Gérer la réponse au récapitulatif
          if (input.toLowerCase().includes('correct') || input.toLowerCase().includes('confirmer')) {
            // Commande confirmée, passer au paiement
            updatedOrderData = {
              ...chatOrderData,
              metadata: this.ensureValidMetadata({
                ...chatOrderData.metadata,
                flags: {
                  ...(chatOrderData.metadata?.flags || {}),
                  orderConfirmed: true
                }
              })
            };
            
            await this.saveProgress(sessionId, 'payment_method', updatedOrderData);
            
            return {
              type: 'assistant',
              content: "Parfait ! Comment souhaitez-vous régler votre commande ?",
              choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'payment_method' as ConversationStep,
                orderData: updatedOrderData,
                messageHandled: true
              },
              timestamp: new Date().toISOString()
            };
          } else {
            // Modification demandée, demander ce qui doit être modifié
            updatedOrderData = {
              ...chatOrderData,
              metadata: this.ensureValidMetadata({
                ...chatOrderData.metadata,
                flags: {
                  ...(chatOrderData.metadata?.flags || {}),
                  orderModificationRequested: true
                }
              })
            };
            
            await this.saveProgress(sessionId, 'modify_order', updatedOrderData);
            
            return {
              type: 'assistant',
              content: "Que souhaitez-vous modifier dans votre commande ?",
              choices: ['Modifier la quantité', 'Modifier l\'adresse', 'Modifier mes informations'],
              assistant: this.getBotInfo(),
              metadata: {
                nextStep: 'modify_order' as ConversationStep,
                orderData: updatedOrderData,
                messageHandled: true
              },
              timestamp: new Date().toISOString()
            };
          }
          
        default:
          // Pour les autres étapes, intégrer les métadonnées de validation
          if (validation.metadata) {
            updatedOrderData = {
              ...chatOrderData,
              ...(validation.metadata as any), // Cast sécurisé car validé par flowManager
              metadata: this.ensureValidMetadata({
                ...chatOrderData.metadata,
                ...validation.metadata,
                flags: {
                  ...(chatOrderData.metadata?.flags || {}),
                  ...(validation.metadata.flags || {}),
                  [`${step}_completed`]: true
                }
              })
            };
          }
          break;
      }
      
      // Sauvegarder la progression
      await this.saveProgress(sessionId, nextStep, updatedOrderData);
      
      // Générer la réponse en fonction de la prochaine étape
      const defaultMessage = await this.getDefaultStepMessage(nextStep);
      const defaultChoices = await this.getDefaultStepChoices(nextStep);
      
      let responseContent = defaultMessage;
      
      // Personnaliser le message selon l'étape
      if (nextStep === 'collect_city') {
        responseContent = "Dans quelle ville habitez-vous ?";
      } else if (nextStep === 'collect_address') {
        responseContent = `Quelle est votre adresse exacte à ${updatedOrderData.city} ?`;
      } else if (nextStep === 'collect_email_opt') {
        responseContent = "Souhaitez-vous recevoir votre confirmation de commande par email ? (facultatif)";
      } else if (nextStep === 'recommend_products') {
        responseContent = "Souhaitez-vous découvrir d'autres jeux de notre collection qui pourraient vous intéresser ?";
      } else if (nextStep === 'order_summary') {
        responseContent = await this.generateOrderSummary(sessionId);
      }
      
      // Construire et retourner la réponse
      return {
        type: 'assistant',
        content: responseContent,
        choices: defaultChoices,
        assistant: this.getBotInfo(),
        metadata: {
          nextStep,
          orderData: updatedOrderData,
          messageHandled: true,
          showQuantitySelector: nextStep === 'collect_quantity',
          maxQuantity: 10,
          flags: {
            ...updatedOrderData.metadata?.flags,
            currentStep: nextStep
          }
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in handleDataCollection:', error);
      return this.createErrorMessage();
    }
  }

  // Méthode de nettoyage pour libérer les ressources
  public cleanup(sessionId: string): void {
    this.messageCache.delete(sessionId);
    this.orderDataCache.delete(sessionId);
    
    if (this.subscriptions.has(sessionId)) {
      this.subscriptions.get(sessionId)?.unsubscribe();
      this.subscriptions.delete(sessionId);
    }
  }

  // Singleton pattern
  public static create(): ChatService {
    if (!this.instance) {
      this.instance = new ChatService();
    }
    return this.instance;
  }

  public static getInstance(): ChatService {
    return this.create();
  }

  private async loadChatbotConfig(storeId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('store_id', storeId)
        .single();
      
      if (error) {
        console.warn('Error loading chatbot config:', error);
        return;
      }
      
      if (data) {
        this.settings = data;
      }
    } catch (error) {
      console.error('Error in loadChatbotConfig:', error);
    }
  }

  private async loadPredefinedMessages(storeId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (error) {
        console.warn('Error loading predefined messages:', error);
        return;
      }
      
      if (data) {
        this.predefinedMessages.set(storeId, data);
      }
    } catch (error) {
      console.error('Error in loadPredefinedMessages:', error);
    }
  }

  public async getInitialChoices(storeId: string): Promise<string[]> {
    try {
      return this.predefinedChoices;
    } catch (error) {
      console.error('Error in getInitialChoices:', error);
      return [];
    }
  }
}