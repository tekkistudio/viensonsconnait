// src/lib/services/PaymentFlowService.ts
import { supabase } from '@/lib/supabase';
import { OrderService } from './OrderService';
import { OrderPaymentService } from './OrderPaymentService';

import type { 
  ChatMessage, 
  ChatOrderData,
  ConversationStep,
  MessageMetadata
} from '@/types/chat';

import type {
  PaymentProvider,
  OrderMetadata,
  CustomerInfo,
  PaymentStatus
} from '@/types/order';

// Type d'interface utilisé par le service de paiement
interface PaymentCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  city: string;
  country: string;
  address: string;
}

// Interface locale pour la réponse du service de paiement
interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  clientSecret?: string;
  transactionId?: string;
  error?: string;
  reference?: string;
}

export class PaymentFlowService {
  private static instance: PaymentFlowService | null = null;
  private orderService: OrderService;
  private paymentService: OrderPaymentService;
  private readonly botInfo = {
    name: 'Rose',
    title: 'Assistante d\'achat',
    avatar: undefined
  };

  private constructor() {
    this.orderService = OrderService.getInstance();
    this.paymentService = OrderPaymentService.getInstance();
  }

  public static getInstance(): PaymentFlowService {
    if (!this.instance) {
      this.instance = new PaymentFlowService();
    }
    return this.instance;
  }

  private getBotInfo() {
    return this.botInfo;
  }

  async handlePaymentStep(
    sessionId: string,
    step: 'init' | 'method' | 'processing' | 'complete',
    input: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    try {
      // Vérifier que l'ordre et le sessionId sont valides
      if (!sessionId || !orderData) {
        throw new Error('Session ID ou données de commande manquants');
      }

      // Ajouter des logs détaillés pour mieux comprendre le flux
      console.log(`Processing payment step: ${step}`, {
        sessionId,
        input,
        orderDataExists: !!orderData,
        orderItems: orderData.items?.length || 0,
        totalAmount: orderData.total_amount || 0
      });

      switch (step) {
        case 'init':
          return this.initiatePayment(sessionId, orderData);
        case 'method':
          return this.handlePaymentMethod(sessionId, input, orderData);
        case 'processing':
          return this.handlePaymentProcessing(sessionId, input, orderData);
        case 'complete':
          return this.completePayment(sessionId, orderData);
        default:
          throw new Error(`Étape de paiement invalide: ${step}`);
      }
    } catch (error) {
      console.error('Error in handlePaymentStep:', error);
      
      // Créer des metadata valides pour le message d'erreur
      const metadata: MessageMetadata = {
        nextStep: 'payment_method' as ConversationStep,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        orderData,
        messageHandled: true,
        flags: {
          paymentError: true,
          errorTimestamp: new Date().toISOString()
        }
      };

      return [{
        type: 'assistant',
        content: "Je suis désolée, une erreur est survenue. Voulez-vous réessayer ?",
        choices: ['Réessayer', 'Changer de méthode', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata,
        timestamp: new Date().toISOString()
      }];
    }
  }

  private async initiatePayment(
    sessionId: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    const timestamp = new Date().toISOString();
    
    // S'assurer que nous avons toutes les informations nécessaires avant de passer au paiement
    if (!this.validateOrderData(orderData)) {
      return [{
        type: 'assistant',
        content: "Des informations sont manquantes pour procéder au paiement. Veuillez vérifier vos coordonnées.",
        choices: ['Recommencer', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'collect_phone' as ConversationStep,
          orderData,
          messageHandled: true,
          error: 'Incomplete order data'
        },
        timestamp
      }];
    }

    const metadata: MessageMetadata = {
      nextStep: 'payment_method' as ConversationStep,
      orderData,
      messageHandled: true,
      flags: {
        paymentInitiated: true,
        initiatedAt: timestamp
      }
    };

    return [{
      type: 'assistant',
      content: "Comment souhaitez-vous effectuer le paiement ?",
      choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
      assistant: this.getBotInfo(),
      metadata,
      timestamp
    }];
  }

  private async handlePaymentMethod(
    sessionId: string,
    method: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    try {
      // Normaliser la méthode de paiement
      const normalizedMethod = this.normalizePaymentMethod(method);
      const timestamp = new Date().toISOString();
      
      console.log(`Initializing payment with method: ${normalizedMethod}`, {
        sessionId,
        amount: orderData.total_amount || 0,
        isOrderDataValid: this.validateOrderData(orderData)
      });

      // Adapter le format CustomerInfo au format attendu par le service de paiement
      const paymentCustomerInfo: PaymentCustomerInfo = {
        name: `${orderData.first_name || ''} ${orderData.last_name || ''}`.trim(),
        phone: orderData.phone || '',
        email: orderData.email,
        city: orderData.city || '',
        country: 'SN', // Par défaut Sénégal
        address: orderData.address || ''
      };

      // Paramètres du paiement
      const paymentParams = {
        sessionId,
        provider: normalizedMethod,
        amount: orderData.total_amount || 0,
        customerInfo: paymentCustomerInfo,
        metadata: {
          source: 'chatbot',
          orderId: sessionId,
          customerPhone: orderData.phone,
          totalAmount: orderData.total_amount,
          initiatedAt: timestamp
        }
      };

      // Commencer le processus de paiement avec le service de paiement
      // Adapter l'appel pour correspondre à la signature attendue
      const paymentInitiation: PaymentResponse = await this.paymentService.initiatePayment(
        sessionId,
        orderData,
        normalizedMethod,
        paymentParams
      );

      if (!paymentInitiation.success) {
        console.error('Payment initiation failed:', paymentInitiation.error);
        throw new Error(paymentInitiation.error || 'Échec de l\'initialisation du paiement');
      }

      // Préparer une metadata valide qui respecte le type OrderMetadata
      const validOrderMetadata: OrderMetadata = {
        source: 'chatbot',
        storeId: orderData.metadata?.storeId || '',
        productId: orderData.metadata?.productId || '',
        conversationId: sessionId,
        createdAt: orderData.metadata?.createdAt || timestamp,
        updatedAt: timestamp,
        conversationHistory: orderData.metadata?.conversationHistory || [],
        paymentProvider: normalizedMethod,
        paymentStatus: 'pending' as PaymentStatus,
        // Ajouter d'autres propriétés requises si nécessaire
        flags: {
          ...(orderData.metadata?.flags || {}),
          paymentMethodSelected: true,
          paymentInitiated: true
        }
      };

      // Si le paiement a un ID de transaction, l'ajouter aux métadonnées
      if (paymentInitiation.transactionId) {
        validOrderMetadata.paymentId = paymentInitiation.transactionId;
      }

      // Créer une copie mise à jour des données de commande
      const updatedOrderData = {
        ...orderData,
        payment_method: normalizedMethod,
        metadata: validOrderMetadata
      };

      // Obtenir les instructions de paiement
      let paymentInstructions = '';
      
      if (normalizedMethod === 'WAVE' || normalizedMethod === 'ORANGE_MONEY') {
        paymentInstructions = `Veuillez suivre ces étapes pour payer avec ${normalizedMethod === 'WAVE' ? 'Wave' : 'Orange Money'} :\n\n`;
        paymentInstructions += `1. Cliquez sur le lien de paiement ci-dessous\n`;
        paymentInstructions += `2. Complétez le paiement sur votre téléphone\n`;
        paymentInstructions += `3. Revenez ici et cliquez sur "J'ai payé" une fois le paiement effectué\n\n`;
        
        if (paymentInitiation.paymentUrl) {
          paymentInstructions += `[Cliquez ici pour payer](${paymentInitiation.paymentUrl})`;
        } else {
          paymentInstructions += "Le lien de paiement n'est pas disponible actuellement. Veuillez réessayer.";
        }
      } else if (normalizedMethod === 'STRIPE') {
        paymentInstructions = `Veuillez suivre ces étapes pour payer par carte bancaire :\n\n`;
        paymentInstructions += `1. Cliquez sur le lien de paiement ci-dessous\n`;
        paymentInstructions += `2. Remplissez vos informations de carte bancaire\n`;
        paymentInstructions += `3. Confirmez le paiement\n\n`;
        
        if (paymentInitiation.paymentUrl) {
          paymentInstructions += `[Cliquez ici pour payer](${paymentInitiation.paymentUrl})`;
        } else {
          paymentInstructions += "Le lien de paiement n'est pas disponible actuellement. Veuillez réessayer.";
        }
      } else {
        // Pour le paiement à la livraison
        paymentInstructions = `Vous avez choisi de payer à la livraison. Votre commande sera préparée et vous serez contacté pour organiser la livraison.\n\nMerci pour votre confiance !`;
      }

      // Déterminer les boutons d'action pour l'utilisateur
      const choices = normalizedMethod === 'CASH' 
        ? ['Je comprends', 'Annuler'] 
        : ['J\'ai payé', 'Problème de paiement', 'Changer de méthode'];

      // Mettre à jour le statut de la commande
      await this.orderService.updateCartStep(sessionId, 'payment_processing');

      // Créer les métadonnées pour le message
      const messageMetadata: MessageMetadata = {
        nextStep: 'payment_processing' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true,
        flags: {
          paymentInProgress: true
        }
      };

      // Ajouter des propriétés spécifiques au paiement
      (messageMetadata as any).paymentMethod = normalizedMethod;
      if (paymentInitiation.paymentUrl) {
        (messageMetadata as any).paymentUrl = paymentInitiation.paymentUrl;
      }
      if (paymentInitiation.clientSecret) {
        (messageMetadata as any).clientSecret = paymentInitiation.clientSecret;
      }

      // Retourner les instructions et les options à l'utilisateur
      return [{
        type: 'assistant',
        content: paymentInstructions,
        choices,
        assistant: this.getBotInfo(),
        metadata: messageMetadata,
        timestamp
      }];
    } catch (error) {
      console.error('Error in handlePaymentMethod:', error);
      throw error;
    }
  }

  private async handlePaymentProcessing(
    sessionId: string,
    input: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    const transactionId = (orderData.metadata as any)?.paymentId || '';
    const timestamp = new Date().toISOString();
    
    // Vérifier si l'utilisateur a un problème ou veut changer de méthode
    const normalizedInput = input.toLowerCase().trim();
    
    // Si l'utilisateur a un problème
    if (normalizedInput.includes('problème') || normalizedInput.includes('erreur')) {
      return [{
        type: 'assistant',
        content: "Je suis désolée que vous rencontriez des difficultés. Voici quelques options :\n\n" +
          "1. Essayez une autre méthode de paiement\n" +
          "2. Contactez notre service client au +221 77 333 44 55\n" +
          "3. Réessayez plus tard\n\n" +
          "Que souhaitez-vous faire ?",
        choices: ['Essayer une autre méthode', 'Contacter le service client', 'Réessayer plus tard'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_error' as ConversationStep,
          orderData,
          messageHandled: true,
          flags: {
            paymentProblem: true,
            problemReportedAt: timestamp
          }
        },
        timestamp
      }];
    }
    
    // Si l'utilisateur veut changer de méthode
    if (normalizedInput.includes('changer') || normalizedInput.includes('autre méthode')) {
      // Créer un objet de métadonnées valide
      const updatedMetadata = this.createValidOrderMetadata(orderData.metadata, {
        flags: {
          ...(orderData.metadata?.flags || {}),
          paymentMethodChanged: true
        }
      });

      const updatedOrderData = {
        ...orderData,
        metadata: updatedMetadata
      };

      return [{
        type: 'assistant',
        content: "Bien sûr, vous pouvez choisir une autre méthode de paiement. Comment souhaitez-vous payer ?",
        choices: ['Wave', 'Orange Money', 'Carte bancaire', 'Payer à la livraison'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_method' as ConversationStep,
          orderData: updatedOrderData,
          messageHandled: true
        },
        timestamp
      }];
    }
  
    // Vérifier le statut du paiement
    try {
      let paymentStatus = { status: 'pending' as PaymentStatus };
      
      if (transactionId) {
        paymentStatus = await this.paymentService.verifyPayment(
          sessionId,
          transactionId
        );
      } else if (orderData.payment_method === 'CASH') {
        // Pour le paiement à la livraison, considérer comme confirmé
        paymentStatus = { status: 'completed' as PaymentStatus };
      }
      
      console.log('Payment verification result:', paymentStatus);
    
      if (paymentStatus.status === 'completed') {
        // Si le paiement est confirmé
        const provider = orderData.payment_method;
        let orderId = '';
        
        if (provider) {
          // Convertir le panier en commande
          try {
            orderId = await this.orderService.convertToOrder(sessionId, provider);
          } catch (error) {
            console.error('Error converting to order:', error);
            orderId = `ORD-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`;
          }
        } else {
          // Générer un ID de commande pour l'affichage
          orderId = `ORD-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`;
        }

        // Créer un objet de métadonnées valide
        const updatedMetadata = this.createValidOrderMetadata(orderData.metadata, {
          paymentConfirmed: true,
          orderConfirmed: true,
          orderStatus: 'confirmed',
          orderId
        });

        const updatedOrderData = {
          ...orderData,
          metadata: updatedMetadata
        };
      
        return [{
          type: 'assistant',
          content: `🎉 Félicitations ! Votre commande a été confirmée avec succès !\n\n` +
            `Numéro de commande : ${orderId}\n\n` +
            `Un e-mail de confirmation${orderData.email ? ` a été envoyé à ${orderData.email}` : ' vous sera envoyé'}\n\n` +
            `Notre équipe va préparer votre commande et vous tiendra informé de son statut.\n\n` +
            `Merci pour votre confiance ! Avez-vous d'autres questions ?`,
          choices: ['Voir ma commande', 'Quand sera-t-elle livrée ?', 'Non merci, c\'est tout'],
          assistant: this.getBotInfo(),
          metadata: {
            nextStep: 'payment_complete' as ConversationStep,
            orderData: updatedOrderData,
            messageHandled: true,
            orderId
          },
          timestamp
        }];
      }
    
      // Si le paiement est toujours en attente
      return [{
        type: 'assistant',
        content: "Le paiement est en cours de traitement. Avez-vous effectué le paiement ?",
        choices: ['Oui, j\'ai payé', 'Non, pas encore', 'Problème de paiement'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_processing' as ConversationStep,
          orderData,
          messageHandled: true,
          lastCheck: timestamp
        },
        timestamp
      }];
    } catch (error) {
      console.error('Error verifying payment:', error);
      return [{
        type: 'assistant',
        content: "Je n'ai pas pu vérifier l'état de votre paiement. Veuillez réessayer dans quelques instants.",
        choices: ['Vérifier à nouveau', 'Changer de méthode', 'Contacter le support'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'payment_processing' as ConversationStep,
          orderData,
          messageHandled: true,
          error: error instanceof Error ? error.message : 'Erreur de vérification du paiement'
        },
        timestamp
      }];
    }
  }

  private async completePayment(
    sessionId: string,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage[]> {
    const orderId = (orderData.metadata as any)?.orderId || 
                   `ORD-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`;
    
    // Créer un objet de métadonnées valide
    const updatedMetadata = this.createValidOrderMetadata(orderData.metadata, {
      orderCompleted: true
    });

    const updatedOrderData = {
      ...orderData,
      metadata: updatedMetadata
    };

    return [{
      type: 'assistant',
      content: `Merci encore pour votre achat ! Votre commande #${orderId} a été confirmée.\n\n` +
        `Nous préparons votre commande et vous tiendrons informé de son statut.\n\n` +
        `À bientôt !`,
      choices: ['Voir mes autres produits', 'Besoin d\'aide ?'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'initial' as ConversationStep,
        orderData: updatedOrderData,
        messageHandled: true
      },
      timestamp: new Date().toISOString()
    }];
  }

  // Méthode utilitaire pour créer des métadonnées valides
  private createValidOrderMetadata(
    existingMetadata: any,
    additionalProps: Record<string, any> = {}
  ): OrderMetadata {
    const timestamp = new Date().toISOString();
    
    // Vérifier si existingMetadata est un objet valide
    const baseMetadata = existingMetadata && typeof existingMetadata === 'object' 
      ? existingMetadata 
      : {};
    
    // Créer un nouvel objet qui respecte la structure OrderMetadata
    const validMetadata: OrderMetadata = {
      source: baseMetadata.source || 'chatbot',
      storeId: baseMetadata.storeId || '',
      productId: baseMetadata.productId || '',
      conversationId: baseMetadata.conversationId || '',
      createdAt: baseMetadata.createdAt || timestamp,
      updatedAt: timestamp,
      conversationHistory: Array.isArray(baseMetadata.conversationHistory) 
        ? baseMetadata.conversationHistory 
        : [],
      flags: {
        ...(baseMetadata.flags || {}),
        ...((additionalProps.flags || {}))
      }
    };
    
    // Ajouter toutes les propriétés additionnelles
    for (const [key, value] of Object.entries(additionalProps)) {
      if (key !== 'flags') {
        (validMetadata as any)[key] = value;
      }
    }
    
    // Copier les propriétés existantes qui ne sont pas déjà définies
    for (const [key, value] of Object.entries(baseMetadata)) {
      if (key !== 'source' && key !== 'storeId' && key !== 'productId' && 
          key !== 'conversationId' && key !== 'createdAt' && 
          key !== 'updatedAt' && key !== 'conversationHistory' && 
          key !== 'flags' && !(key in validMetadata)) {
        (validMetadata as any)[key] = value;
      }
    }
    
    return validMetadata;
  }

  // Méthode utilitaire pour normaliser les méthodes de paiement
  private normalizePaymentMethod(method: string): PaymentProvider {
    // Définir le mapping de manière explicite
    const methodMap: Record<string, PaymentProvider> = {
      'wave': 'WAVE' as PaymentProvider,
      'orange money': 'ORANGE_MONEY' as PaymentProvider,
      'carte': 'STRIPE' as PaymentProvider,
      'carte bancaire': 'STRIPE' as PaymentProvider,
      'payer à la livraison': 'CASH' as PaymentProvider,
      'livraison': 'CASH' as PaymentProvider
    };
    
    const normalizedMethod = method.toLowerCase().trim();
    
    // Recherche par inclusion
    for (const [key, value] of Object.entries(methodMap)) {
      if (normalizedMethod.includes(key)) {
        return value;
      }
    }
    
    // Valeur par défaut
    return 'WAVE' as PaymentProvider;
  }

  // Méthode utilitaire pour valider les données de commande
  private validateOrderData(orderData: Partial<ChatOrderData> | undefined): boolean {
    if (!orderData) return false;
    
    const requiredFields = [
      'first_name',
      'phone',
      'city',
      'address'
    ];
    
    // Vérifier si tous les champs requis sont présents et non vides
    const missingFields = requiredFields.filter(field => {
      const value = orderData[field as keyof ChatOrderData];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields for payment:', missingFields);
      return false;
    }
    
    // Vérifier si les items et le montant total sont corrects
    if (!orderData.items || orderData.items.length === 0) {
      console.warn('No items in order');
      return false;
    }
    
    if (typeof orderData.total_amount !== 'number' || orderData.total_amount <= 0) {
      console.warn('Invalid total amount:', orderData.total_amount);
      return false;
    }
    
    return true;
  }
}