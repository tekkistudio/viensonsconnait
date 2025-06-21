// src/lib/services/OptimizedChatService.ts - VERSION FINALE TOUS TYPES CORRIGÉS
import { supabase } from '@/lib/supabase';
import { PhoneService } from './PhoneService';
import { OrderService } from './OrderService';
import { AIResponseHandler } from './AIResponseHandler';
import { OrderTrackingService } from './OrderTrackingService';
import { createProductDataArray } from '@/lib/utils/productUtils';
import { 
  ChatMessage, 
  ConversationStep, 
  MessageType,
  ChatOrderData,
  PaymentProvider // ✅ CORRECTION: Import direct du bon type
} from '@/types/chat';

// ✅ FONCTION DE VALIDATION DES ÉTAPES
function validateConversationStep(step: any): ConversationStep {
  const validSteps: ConversationStep[] = [
    'initial', 'initial_engagement', 'mode_selection', 'generic_response',
    'error_recovery', 'fallback_response', 'whatsapp_redirect',
    'intelligent_fallback', 'basic_fallback', 'enhanced_fallback',
    'standard_engagement', 'critical_error', 'description', 'product_info',
    'express_quantity', 'express_phone', 'express_name', 'express_address',
    'express_payment', 'express_confirmation', 'express_completed',
    'express_summary', 'express_flow', 'express_contact', 'express_city',
    'express_custom_quantity', 'express_order', 'express_modify', 'express_error',
    'quantity_confirmed', 'quantity_selected', 'custom_quantity'
  ];

  if (typeof step === 'string' && validSteps.includes(step as ConversationStep)) {
    return step as ConversationStep;
  }
  
  return 'generic_response';
}

// ✅ TYPES POUR LE NOUVEL ORDRE STATE
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
    estimatedTotal?: number;
  };
}

// ✅ INTERFACE POUR LA RÉPONSE DU SERVICE DE COMMANDE
interface OrderCreationResult {
  success: boolean;
  order?: {
    id: string;
    [key: string]: any;
  };
  error?: string;
}

// ✅ INTERFACE POUR LA VALIDATION TÉLÉPHONE (pour éviter l'erreur validateAndFormat)
interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  international?: string;
  local?: string;
  country?: string;
  error?: string;
}

export class OptimizedChatService {
  private static instance: OptimizedChatService;
  private orderStates = new Map<string, OrderState>();

  private constructor() {
    console.log('🔧 OptimizedChatService initialized');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PUBLIQUE: Gérer le flow express
  public async handleExpressFlow(
    sessionId: string,
    message: string,
    currentStep: string
  ): Promise<ChatMessage> {
    try {
      console.log('⚡ Handling express flow:', { sessionId, message, currentStep });

      let chatResponse: ChatMessage;

      if (currentStep?.includes('express') || currentStep === 'express_start') {
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

  // ✅ MÉTHODE PUBLIQUE: Gérer les étapes express
  public async handleExpressStep(
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

  // ✅ DÉMARRER LE FLOW EXPRESS
  private async startExpressPurchase(sessionId: string, productId: string): Promise<ChatMessage> {
    console.log('🚀 Starting express purchase:', { sessionId, productId });

    try {
      // ✅ VALIDATION STRICTE du productId
      if (!productId || productId.length < 10) {
        console.error('❌ Invalid productId provided:', productId);
        throw new Error('Invalid productId provided');
      }

      // ✅ RÉCUPÉRATION SÉCURISÉE du produit
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, status')
        .eq('id', productId)
        .eq('status', 'active')
        .maybeSingle();

      if (productError) {
        console.error('❌ Database error:', productError);
        throw new Error(`Database error: ${productError.message}`);
      }

      if (!product) {
        console.error('❌ Product not found or inactive:', productId);
        throw new Error('Product not found or inactive');
      }

      // ✅ VÉRIFICATION DU STOCK
      if (product.stock_quantity <= 0) {
        console.log('📦 Product out of stock:', product.name);
        return this.createOutOfStockMessage(product);
      }

      // ✅ CRÉER L'ÉTAT DE COMMANDE avec validation
      const orderState: OrderState = {
        step: 'quantity' as const,
        mode: 'express' as const,
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
          maxQuantity: Math.min(product.stock_quantity, 10),
          estimatedTotal: product.price
        }
      };

      // ✅ SAUVEGARDER EN MÉMOIRE ET BASE
      this.orderStates.set(sessionId, orderState);
      
      try {
        await this.saveSessionToDatabase(sessionId, orderState, product.id, orderState.data.storeId!);
      } catch (dbError) {
        console.warn('⚠️ Could not save session to database:', dbError);
      }

      // ✅ CRÉER LE MESSAGE DE QUANTITÉ
      return {
        type: 'assistant',
        content: `🛒 **Parfait ! Commençons votre commande express pour ${product.name}**

**Prix unitaire :** ${product.price.toLocaleString()} FCFA

Combien d'exemplaires souhaitez-vous ?`,
        choices: [
          '1 exemplaire',
          '2 exemplaires', 
          '3 exemplaires',
          'Autre quantité'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_quantity' as ConversationStep,
          showQuantitySelector: true,
          maxQuantity: orderState.metadata?.maxQuantity,
          orderData: {
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: 1,
            totalAmount: product.price,
            session_id: sessionId
          },
          flags: { 
            expressMode: true,
            quantitySelection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error starting express purchase:', error);
      return this.createErrorMessage(sessionId, `Impossible de démarrer la commande: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // ✅ GÉRER LA SÉLECTION DE QUANTITÉ
  private async handleExpressQuantity(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('🔢 Processing express quantity selection:', { sessionId, input });

    try {
      let quantity = 1;

      // ✅ PARSER LA QUANTITÉ avec validation robuste
      if (input.includes('1 exemplaire')) {
        quantity = 1;
      } else if (input.includes('2 exemplaires')) {
        quantity = 2;
      } else if (input.includes('3 exemplaires')) {
        quantity = 3;
      } else if (input.includes('Autre quantité')) {
        return this.createCustomQuantityMessage(sessionId, orderState);
      } else {
        // Tentative de parsing numérique
        const numMatch = input.match(/(\d+)/);
        if (numMatch) {
          quantity = parseInt(numMatch[1]);
          if (quantity < 1 || quantity > (orderState.metadata?.maxQuantity || 10)) {
            return this.createInvalidQuantityMessage(sessionId, orderState);
          }
        } else {
          return this.createInvalidQuantityMessage(sessionId, orderState);
        }
      }

      // ✅ RÉCUPÉRER LES INFOS PRODUIT
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', orderState.data.productId)
        .single();

      if (!product) {
        throw new Error('Product not found');
      }

      // ✅ METTRE À JOUR L'ÉTAT
      orderState.data.quantity = quantity;
      orderState.step = 'contact';
      orderState.metadata!.estimatedTotal = product.price * quantity;
      this.orderStates.set(sessionId, orderState);

      // ✅ CRÉER LE MESSAGE DE CONTACT
      return {
        type: 'assistant',
        content: `✅ **${quantity} exemplaire${quantity > 1 ? 's' : ''} de ${product.name}**

**Montant total :** ${(product.price * quantity).toLocaleString()} FCFA

Pour finaliser votre commande, j'ai besoin de votre numéro de téléphone :`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_phone' as ConversationStep,
          orderData: {
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: quantity,
            totalAmount: product.price * quantity,
            session_id: sessionId
          },
          flags: { 
            expressMode: true,
            phoneCollection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling quantity:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la sélection de quantité');
    }
  }

  // ✅ TRAITER LES ÉTAPES AVEC L'ÉTAT
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

  // ✅ GÉRER LE CONTACT (TÉLÉPHONE) - MÉTHODE CORRIGÉE
  private async handleExpressContact(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('📞 Processing phone input:', { sessionId, input: input.substring(0, 10) });

    try {
      // ✅ CORRECTION: Utiliser une validation téléphone simplifiée (sans PhoneService.validateAndFormat)
      const validationResult = this.validatePhoneNumber(input);

      if (!validationResult.isValid) {
        return {
          type: 'assistant',
          content: `❌ **Numéro invalide**

${validationResult.error}

Veuillez saisir un numéro valide :`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_phone' as ConversationStep,
            flags: { phoneError: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ METTRE À JOUR L'ÉTAT
      orderState.data.phone = validationResult.formatted;
      orderState.step = 'name';
      this.orderStates.set(sessionId, orderState);

      // ✅ VÉRIFIER SI CLIENT EXISTANT
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('first_name, last_name, city, address')
        .eq('phone', validationResult.formatted)
        .maybeSingle();

      if (existingCustomer) {
        orderState.flags.customerExists = true;
        orderState.data.name = `${existingCustomer.first_name} ${existingCustomer.last_name}`;
        orderState.data.city = existingCustomer.city;
        orderState.data.address = existingCustomer.address;
        orderState.step = 'payment';
        this.orderStates.set(sessionId, orderState);

        return {
          type: 'assistant',
          content: `👋 **Ravi de vous revoir ${existingCustomer.first_name} !**

J'ai retrouvé vos informations :
📍 **Adresse :** ${existingCustomer.address}, ${existingCustomer.city}

Souhaitez-vous utiliser ces informations pour la livraison ?`,
          choices: [
            'Oui, même adresse',
            'Changer l\'adresse',
            'Nouvelle adresse'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            orderData: {
              phone: validationResult.formatted,
              first_name: existingCustomer.first_name,
              last_name: existingCustomer.last_name,
              city: existingCustomer.city,
              address: existingCustomer.address
            },
            flags: { 
              existingCustomer: true,
              addressConfirmation: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ NOUVEAU CLIENT
      return {
        type: 'assistant',
        content: `📱 **Parfait ! Numéro enregistré : ${validationResult.formatted}**

Maintenant, quel est votre nom complet ?

*Exemple : Amadou Diallo*`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          orderData: {
            phone: validationResult.formatted
          },
          flags: { 
            phoneCollected: true,
            nameCollection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling contact:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation du téléphone');
    }
  }

  // ✅ MÉTHODE SIMPLIFIÉE DE VALIDATION TÉLÉPHONE
  private validatePhoneNumber(phone: string): PhoneValidationResult {
    const cleaned = phone.replace(/\s+/g, '').replace(/[-().]/g, '');
    
    if (cleaned.length < 8) {
      return { isValid: false, error: 'Numéro trop court' };
    }
    
    if (cleaned.length > 15) {
      return { isValid: false, error: 'Numéro trop long' };
    }
    
    if (!/^\+?[\d]+$/.test(cleaned)) {
      return { isValid: false, error: 'Le numéro ne doit contenir que des chiffres' };
    }
    
    // Format basique
    let formatted = cleaned;
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('221')) {
        formatted = '+' + cleaned;
      } else if (cleaned.length === 9 && /^[7639]/.test(cleaned)) {
        formatted = '+221' + cleaned;
      } else {
        formatted = '+' + cleaned;
      }
    }
    
    return {
      isValid: true,
      formatted: formatted,
      international: formatted,
      local: cleaned
    };
  }

  // ✅ GÉRER LE NOM
  private async handleExpressName(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('👤 Processing name input:', { sessionId, input });

    try {
      const nameValidation = this.validateName(input);
      
      if (!nameValidation.isValid) {
        return {
          type: 'assistant',
          content: `❌ **${nameValidation.error}**

Veuillez saisir votre nom complet :

*Exemple : Fatou Seck*`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_name' as ConversationStep,
            flags: { nameError: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ METTRE À JOUR L'ÉTAT
      orderState.data.name = nameValidation.fullName;
      orderState.step = 'address';
      this.orderStates.set(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👤 **Merci ${nameValidation.firstName} !**

Maintenant, quelle est votre adresse de livraison ?

*Exemple : Cité Keur Gorgui, Villa 123*`,
        choices: [],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_address' as ConversationStep,
          orderData: {
            first_name: nameValidation.firstName,
            last_name: nameValidation.lastName,
            fullName: nameValidation.fullName
          },
          flags: { 
            nameCollected: true,
            addressCollection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling name:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation du nom');
    }
  }

  // ✅ GÉRER L'ADRESSE
  private async handleExpressAddress(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('📍 Processing address input:', { sessionId, input });

    try {
      // ✅ GESTION DES CHOIX POUR CLIENT EXISTANT
      if (input.includes('Oui, même adresse')) {
        orderState.step = 'payment';
        this.orderStates.set(sessionId, orderState);
        return this.createPaymentMethodMessage(sessionId, orderState);
      }

      if (input.includes('Changer l\'adresse') || input.includes('Nouvelle adresse')) {
        return {
          type: 'assistant',
          content: `📍 **Nouvelle adresse de livraison**

Veuillez saisir votre nouvelle adresse :

*Exemple : Parcelles Assainies, Unité 25, Villa 456*`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { 
              addressChange: true,
              addressCollection: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ VALIDATION DE L'ADRESSE
      const addressValidation = this.validateAddress(input);
      
      if (!addressValidation.isValid) {
        return {
          type: 'assistant',
          content: `❌ **${addressValidation.error}**

Veuillez préciser votre adresse :

*Exemple : Médina, Rue 15 x 20, Maison bleue*`,
          choices: [],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_address' as ConversationStep,
            flags: { addressError: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ METTRE À JOUR L'ÉTAT
      orderState.data.address = addressValidation.address;
      orderState.data.city = addressValidation.city;
      orderState.step = 'payment';
      this.orderStates.set(sessionId, orderState);

      return this.createPaymentMethodMessage(sessionId, orderState);

    } catch (error) {
      console.error('❌ Error handling address:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la validation de l\'adresse');
    }
  }

  // ✅ CRÉER MESSAGE MÉTHODE DE PAIEMENT
  private async createPaymentMethodMessage(
    sessionId: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('name, price')
        .eq('id', orderState.data.productId)
        .single();

      if (!product) {
        throw new Error('Product not found');
      }

      const totalAmount = product.price * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `💳 **Choisissez votre mode de paiement**

**Récapitulatif :**
🎮 ${product.name} x${orderState.data.quantity}
💰 **Total : ${totalAmount.toLocaleString()} FCFA**

Comment souhaitez-vous payer ?`,
        choices: [
          '📱 Wave (Mobile Money)',
          '🟠 Orange Money',
          '💳 Carte bancaire',
          '💵 Paiement à la livraison'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          orderData: {
            totalAmount: totalAmount,
            productName: product.name,
            quantity: orderState.data.quantity
          },
          flags: { 
            paymentSelection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error creating payment message:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors de la préparation du paiement');
    }
  }

  // ✅ GÉRER LE PAIEMENT - TYPES CORRIGÉS
  private async handleExpressPayment(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    console.log('💳 Processing payment selection:', { sessionId, input });

    try {
      let paymentMethod: PaymentProvider;

      // ✅ CORRECTION: Utiliser les bonnes valeurs PaymentProvider
      if (input.includes('Wave')) {
        paymentMethod = 'wave';
      } else if (input.includes('Orange Money')) {
        paymentMethod = 'orange_money';
      } else if (input.includes('Carte bancaire')) {
        paymentMethod = 'card';
      } else if (input.includes('Paiement à la livraison')) {
        paymentMethod = 'cash_on_delivery';
      } else {
        return {
          type: 'assistant',
          content: `❌ **Mode de paiement non reconnu**

Veuillez choisir parmi les options proposées :`,
          choices: [
            '📱 Wave (Mobile Money)',
            '🟠 Orange Money', 
            '💳 Carte bancaire',
            '💵 Paiement à la livraison'
          ],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'express_payment' as ConversationStep,
            flags: { paymentError: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ METTRE À JOUR L'ÉTAT
      orderState.data.paymentMethod = paymentMethod;
      orderState.step = 'confirmation';
      this.orderStates.set(sessionId, orderState);

      // ✅ CRÉER LA COMMANDE
      const orderResult = await this.createFinalOrder(sessionId, orderState);
      
      if (!orderResult.success) {
        return this.createErrorMessage(sessionId, orderResult.error || 'Erreur lors de la création de la commande');
      }

      return {
        type: 'assistant',
        content: `✅ **Commande confirmée !**

**Numéro de commande :** #${orderResult.orderId}

${this.getPaymentInstructions(paymentMethod)}

**Livraison :** 24-48h ouvrables

Voulez-vous recevoir les détails par SMS ?`,
        choices: [
          '📱 Recevoir SMS',
          '✉️ Recevoir par email',
          '✅ C\'est parfait'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'express_completed' as ConversationStep,
          orderData: {
            orderId: orderResult.orderId,
            paymentMethod: paymentMethod,
            status: 'confirmed'
          },
          flags: { 
            orderCompleted: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling payment:', error);
      return this.createErrorMessage(sessionId, 'Erreur lors du traitement du paiement');
    }
  }

  // ✅ CRÉER LA COMMANDE FINALE - TYPES CORRIGÉS
  private async createFinalOrder(
    sessionId: string,
    orderState: OrderState
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const orderService = OrderService.getInstance();
      
      // ✅ PRÉPARER LES DONNÉES DE COMMANDE
      const orderData = {
        session_id: sessionId,
        product_id: orderState.data.productId!,
        store_id: orderState.data.storeId!,
        quantity: orderState.data.quantity,
        phone: orderState.data.phone!,
        full_name: orderState.data.name!,
        city: orderState.data.city!,
        address: orderState.data.address!,
        payment_method: orderState.data.paymentMethod!,
        status: 'pending' as const
      };

      // ✅ CORRECTION: Appeler createOrder avec les bonnes données
      const result = await orderService.createOrder(orderData as any);
      
      // ✅ GESTION DU RÉSULTAT - Types corrigés
      if (result && typeof result === 'object' && 'success' in result) {
        const orderResult = result as OrderCreationResult;
        
        if (orderResult.success && orderResult.order) {
          return {
            success: true,
            orderId: orderResult.order.id
          };
        } else {
          return {
            success: false,
            error: orderResult.error || 'Erreur lors de la création de la commande'
          };
        }
      } else {
        // Si result est une string ou un autre format
        return {
          success: false,
          error: typeof result === 'string' ? result : 'Format de réponse inattendu'
        };
      }

    } catch (error) {
      console.error('❌ Error creating final order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ✅ UTILITAIRES DE VALIDATION
  private validateName(input: string): { isValid: boolean; firstName?: string; lastName?: string; fullName?: string; error?: string } {
    const cleaned = input.trim();
    
    if (cleaned.length < 2) {
      return { isValid: false, error: 'Le nom doit contenir au moins 2 caractères' };
    }

    if (cleaned.length > 50) {
      return { isValid: false, error: 'Le nom ne peut pas dépasser 50 caractères' };
    }

    const parts = cleaned.split(/\s+/);
    if (parts.length < 2) {
      return { isValid: false, error: 'Veuillez saisir votre prénom et nom' };
    }

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    return {
      isValid: true,
      firstName,
      lastName,
      fullName: cleaned
    };
  }

  private validateAddress(input: string): { isValid: boolean; address?: string; city?: string; error?: string } {
    const cleaned = input.trim();
    
    if (cleaned.length < 10) {
      return { isValid: false, error: 'L\'adresse doit être plus détaillée (minimum 10 caractères)' };
    }

    if (cleaned.length > 200) {
      return { isValid: false, error: 'L\'adresse est trop longue (maximum 200 caractères)' };
    }

    // ✅ EXTRACTION DE LA VILLE (simplifiée)
    const dakarAreas = ['dakar', 'médina', 'plateau', 'parcelles', 'pikine', 'guédiawaye', 'rufisque', 'keur massar'];
    let detectedCity = 'Dakar'; // Par défaut

    const lowerInput = cleaned.toLowerCase();
    for (const area of dakarAreas) {
      if (lowerInput.includes(area)) {
        detectedCity = area.charAt(0).toUpperCase() + area.slice(1);
        break;
      }
    }

    return {
      isValid: true,
      address: cleaned,
      city: detectedCity
    };
  }

  // ✅ UTILITAIRES
  private extractProductIdFromSession(sessionId: string): string | null {
    // Essayer d'extraire l'ID produit du sessionId si c'est formaté comme "product_sessionId"
    const parts = sessionId.split('_');
    return parts.length > 1 ? parts[0] : null;
  }

  private isQuantityModificationRequest(input: string): boolean {
    const modificationKeywords = ['changer quantité', 'modifier quantité', 'autre quantité', 'plus', 'moins'];
    return modificationKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private async handleQuantityModification(sessionId: string, input: string, orderState: OrderState): Promise<ChatMessage> {
    return this.createCustomQuantityMessage(sessionId, orderState);
  }

  private createCustomQuantityMessage(sessionId: string, orderState: OrderState): ChatMessage {
    return {
      type: 'assistant',
      content: `🔢 **Quantité personnalisée**

Combien d'exemplaires souhaitez-vous ?

*Saisissez un nombre entre 1 et ${orderState.metadata?.maxQuantity || 10}*`,
      choices: [],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_custom_quantity' as ConversationStep,
        flags: { customQuantity: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private createInvalidQuantityMessage(sessionId: string, orderState: OrderState): ChatMessage {
    return {
      type: 'assistant',
      content: `❌ **Quantité invalide**

Veuillez choisir entre 1 et ${orderState.metadata?.maxQuantity || 10} exemplaires :`,
      choices: [
        '1 exemplaire',
        '2 exemplaires',
        '3 exemplaires',
        'Autre quantité'
      ],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'express_quantity' as ConversationStep,
        flags: { quantityError: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  private createOutOfStockMessage(product: any): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **${product.name} temporairement épuisé**

Nous reconstituons notre stock.

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

  private createErrorMessage(sessionId: string, errorText: string): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **${errorText}**

Voulez-vous réessayer ou contacter notre support ?`,
      choices: ['🔄 Réessayer', '📞 Contacter le support'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        flags: { hasError: true }
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

  // ✅ INSTRUCTIONS DE PAIEMENT - TYPES CORRIGÉS
  private getPaymentInstructions(paymentMethod: PaymentProvider): string {
    switch (paymentMethod) {
      case 'wave':
        return '📱 **Paiement Wave :** Vous recevrez un lien de paiement par SMS';
      case 'orange_money':
        return '🟠 **Orange Money :** Vous recevrez les instructions par SMS';
      case 'card':
        return '💳 **Carte bancaire :** Lien de paiement sécurisé envoyé par SMS';
      case 'cash_on_delivery':
        return '💵 **Paiement à la livraison :** Préparez le montant exact';
      default:
        return '💳 **Paiement :** Instructions envoyées par SMS';
    }
  }

  // ✅ MÉTHODES DE RÉCUPÉRATION ET SAUVEGARDE
  private async recoverSessionFromDatabase(sessionId: string): Promise<OrderState | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error || !data) {
        console.log('❌ Could not recover session from database');
        return null;
      }

      // Reconstituer l'orderState depuis les données de conversation
      return {
        step: 'quantity',
        mode: 'express',
        data: {
          quantity: 1,
          productId: data.product_id,
          storeId: data.store_id
        },
        flags: {
          customerExists: false,
          addressValidated: false,
          paymentInitiated: false
        }
      };

    } catch (error) {
      console.error('❌ Error recovering session:', error);
      return null;
    }
  }

  private async saveSessionToDatabase(
    sessionId: string,
    orderState: OrderState,
    productId: string,
    storeId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          session_id: sessionId,
          product_id: productId,
          store_id: storeId,
          current_step: orderState.step,
          order_data: JSON.stringify(orderState),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving session to database:', error);
      }

    } catch (error) {
      console.error('❌ Error in saveSessionToDatabase:', error);
    }
  }

  // ✅ GESTION DE LA CONFIRMATION FINALE
  private async handleExpressConfirmation(
    sessionId: string,
    input: string,
    orderState: OrderState
  ): Promise<ChatMessage> {
    if (input.includes('Recevoir SMS')) {
      return {
        type: 'assistant',
        content: `📱 **SMS envoyé !**

Vous recevrez toutes les informations sur votre commande par SMS.

Merci pour votre confiance ! 🙏`,
        choices: [
          '🛍️ Commander un autre jeu',
          '📞 Contacter le support',
          '✅ Parfait, merci !'
        ],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'post_purchase' as ConversationStep,
          flags: { 
            orderCompleted: true,
            smsRequested: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'assistant',
      content: `✅ **Commande finalisée avec succès !**

Merci pour votre confiance. Votre commande sera traitée dans les plus brefs délais.

🎮 **Profitez bien de votre jeu !**`,
      choices: [
        '🛍️ Commander un autre jeu',
        '📞 Besoin d\'aide',
        '⭐ Laisser un avis'
      ],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'post_purchase' as ConversationStep,
        flags: { 
          orderCompleted: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default OptimizedChatService;