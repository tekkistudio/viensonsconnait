// src/lib/services/OptimizedChatService.ts 

import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ConversationStep, 
  ChatOrderData,
  PaymentProvider,
  ProductData
} from '@/types/chat';
import { WelcomeMessageService } from './WelcomeMessageService';
import { OrderService } from './OrderService';
import { PhoneService } from './PhoneService';

// Types pour le flow express
interface ExpressOrderState {
  step: 'quantity' | 'phone' | 'name' | 'address' | 'payment' | 'confirmation';
  data: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    address?: string;
    paymentMethod?: PaymentProvider;
  };
  flags: {
    isExistingCustomer: boolean;
    needsNameCollection: boolean;
    needsAddressCollection: boolean;
  };
}

export class OptimizedChatService {
  private static instance: OptimizedChatService;
  private orderStates = new Map<string, ExpressOrderState>();
  private welcomeService = WelcomeMessageService.getInstance();
  private orderService = OrderService.getInstance();
  private phoneService = PhoneService.getInstance();

  private constructor() {
    console.log('🔧 OptimizedChatService v2.0 initialized');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE : Traiter les messages
  public async processMessage(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    try {
      console.log('📝 Processing message:', { sessionId, message, currentStep, productId });

      // 1. Gérer les boutons du message d'accueil
      if (this.isWelcomeButtonChoice(message)) {
        return this.welcomeService.handleWelcomeButtonResponse(message, productId, productName);
      }

      // 2. Gérer le flow express (étapes scénarisées)
      if (currentStep.startsWith('express_') || this.orderStates.has(sessionId)) {
        return await this.handleExpressFlowInternal(sessionId, message, currentStep, productId, productName);
      }

      // 3. Gérer les questions prédéfinies
      if (this.isPredefinedQuestion(message)) {
        return await this.handlePredefinedQuestion(message, productId, productName);
      }

      // 4. Questions libres → Router vers l'API IA
      return await this.handleFreeTextQuestion(message, productId, productName, sessionId);

    } catch (error) {
      console.error('❌ Error processing message:', error);
      return this.createErrorMessage('Une erreur est survenue. Voulez-vous réessayer ?');
    }
  }

  // ✅ GESTION DU FLOW EXPRESS INTERNE (nom changé pour éviter le doublon)
  private async handleExpressFlowInternal(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    
    let orderState = this.orderStates.get(sessionId);
    
    // Initialiser l'état si première fois
    if (!orderState && currentStep === 'express_quantity') {
      const product = await this.getProductData(productId);
      orderState = {
        step: 'quantity',
        data: {
          productId,
          productName,
          unitPrice: product.price,
          quantity: 1
        },
        flags: {
          isExistingCustomer: false,
          needsNameCollection: true,
          needsAddressCollection: true
        }
      };
      this.orderStates.set(sessionId, orderState);
    }

    if (!orderState) {
      return this.createErrorMessage('Session expirée. Veuillez recommencer votre commande.');
    }

    // Router selon l'étape
    switch (orderState.step) {
      case 'quantity':
        return await this.handleQuantityStep(sessionId, message, orderState);
      case 'phone':
        return await this.handlePhoneStep(sessionId, message, orderState);
      case 'name':
        return await this.handleNameStep(sessionId, message, orderState);
      case 'address':
        return await this.handleAddressStep(sessionId, message, orderState);
      case 'payment':
        return await this.handlePaymentStep(sessionId, message, orderState);
      case 'confirmation':
        return await this.handleConfirmationStep(sessionId, message, orderState);
      default:
        return this.createErrorMessage('Étape inconnue dans la commande express.');
    }
  }

  // ✅ ÉTAPE 1 : Quantité
  private async handleQuantityStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    let quantity = 1;

    // Parser la quantité
    if (message.includes('1 exemplaire')) quantity = 1;
    else if (message.includes('2 exemplaires')) quantity = 2;
    else if (message.includes('3 exemplaires')) quantity = 3;
    else if (message.includes('Autre quantité')) {
      return {
        type: 'assistant',
        content: `🔢 **Quantité personnalisée**

Combien d'exemplaires de **${orderState.data.productName}** souhaitez-vous ?

*Saisissez un nombre entre 1 et 10*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_custom_quantity' as ConversationStep,
          flags: { awaitingNumericInput: true }
        },
        timestamp: new Date().toISOString()
      };
    } else {
      // Essayer de parser un nombre
      const numMatch = message.match(/(\d+)/);
      if (numMatch) {
        quantity = parseInt(numMatch[1]);
        if (quantity < 1 || quantity > 10) {
          return this.createErrorMessage('Veuillez choisir une quantité entre 1 et 10.');
        }
      } else {
        return this.createErrorMessage('Veuillez sélectionner une quantité valide.');
      }
    }

    // Mettre à jour l'état
    orderState.data.quantity = quantity;
    orderState.step = 'phone';
    this.orderStates.set(sessionId, orderState);

    const totalAmount = orderState.data.unitPrice * quantity;

    return {
      type: 'assistant',
      content: `✅ **${quantity} exemplaire${quantity > 1 ? 's' : ''} de ${orderState.data.productName}**

**Montant total :** ${totalAmount.toLocaleString()} FCFA

Pour finaliser votre commande, j'ai besoin de votre numéro de téléphone :

*Exemple : +221 77 123 45 67*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_phone' as ConversationStep,
        orderData: {
          productId: orderState.data.productId,
          productName: orderState.data.productName,
          quantity: quantity,
          unitPrice: orderState.data.unitPrice,
          totalAmount: totalAmount,
          session_id: sessionId
        },
        flags: { awaitingPhoneInput: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ ÉTAPE 2 : Téléphone
  private async handlePhoneStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // Valider le téléphone
    const phoneValidation = this.phoneService.validatePhoneNumber(message, 'SN');
    
    if (!phoneValidation.isValid) {
      return {
        type: 'assistant',
        content: `❌ **Numéro invalide**

${phoneValidation.error}

Veuillez saisir un numéro valide :

*Exemple : +221 77 123 45 67*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_phone' as ConversationStep,
          flags: { phoneError: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Formater le téléphone
    const { international } = this.phoneService.formatPhoneWithCountry(message, 'SN');
    orderState.data.phone = international;

    // Vérifier si client existant
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('first_name, last_name, city, address')
      .eq('phone', international)
      .maybeSingle();

    if (existingCustomer) {
      // Client existant
      orderState.data.firstName = existingCustomer.first_name;
      orderState.data.lastName = existingCustomer.last_name;
      orderState.data.city = existingCustomer.city;
      orderState.data.address = existingCustomer.address;
      orderState.flags.isExistingCustomer = true;
      orderState.flags.needsNameCollection = false;
      orderState.flags.needsAddressCollection = false;
      orderState.step = 'payment';
      this.orderStates.set(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👋 **Ravi de vous revoir ${existingCustomer.first_name} !**

J'ai retrouvé vos informations :
📍 **Adresse :** ${existingCustomer.address}, ${existingCustomer.city}

Souhaitez-vous utiliser la même adresse pour cette livraison ?`,
        choices: [
          'Oui, même adresse',
          'Changer d\'adresse'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_address_confirmation' as ConversationStep,
          flags: { existingCustomer: true }
        },
        timestamp: new Date().toISOString()
      };
    } else {
      // Nouveau client
      orderState.step = 'name';
      this.orderStates.set(sessionId, orderState);

      return {
        type: 'assistant',
        content: `📱 **Parfait ! Numéro enregistré : ${international}**

Maintenant, quel est votre nom complet ?

*Exemple : Amadou Diallo*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          flags: { awaitingNameInput: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ ÉTAPE 3 : Nom (nouveaux clients uniquement)
  private async handleNameStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    const name = message.trim();
    
    if (name.length < 2) {
      return this.createErrorMessage('Le nom doit contenir au moins 2 caractères.');
    }

    const parts = name.split(/\s+/);
    if (parts.length < 2) {
      return this.createErrorMessage('Veuillez saisir votre prénom et nom.');
    }

    orderState.data.firstName = parts[0];
    orderState.data.lastName = parts.slice(1).join(' ');
    orderState.step = 'address';
    this.orderStates.set(sessionId, orderState);

    return {
      type: 'assistant',
      content: `👤 **Merci ${orderState.data.firstName} !**

Maintenant, quelle est votre adresse de livraison ?

*Exemple : Cité Keur Gorgui, Villa 123, Dakar*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_address' as ConversationStep,
        flags: { awaitingAddressInput: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ ÉTAPE 4 : Adresse
  private async handleAddressStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // ✅ CORRECTION 1: Reconnaître toutes les variantes de "Oui, même adresse"
    const confirmationMessages = [
      'oui, même adresse',
      'oui même adresse', 
      'même adresse',
      'oui',
      'confirmer',
      'garder la même',
      'conserver l\'adresse'
    ];
    
    const isAddressConfirmation = confirmationMessages.some(phrase => 
      message.toLowerCase().includes(phrase.toLowerCase())
    );

    if (isAddressConfirmation) {
      // ✅ L'utilisateur confirme l'adresse existante
      console.log('✅ User confirmed existing address');
      
      // Passer à l'étape paiement
      orderState.step = 'payment';
      this.orderStates.set(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ **Parfait ! Adresse confirmée**

📍 **Livraison à :** ${orderState.data.address}, ${orderState.data.city}

💰 **Récapitulatif :**
• ${orderState.data.quantity}x ${orderState.data.productName}
• **Total : ${totalAmount.toLocaleString()} FCFA**

🎯 **Dernière étape : Choisissez votre mode de paiement**`,
        choices: [
          '📱 Wave (recommandé)',
          '💳 Carte bancaire', 
          '💵 Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          orderData: orderState.data,
          flags: { addressConfirmed: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION 2: Reconnaître "Changer d'adresse"
    const changeAddressMessages = [
      'changer d\'adresse',
      'changer adresse',
      'nouvelle adresse',
      'autre adresse',
      'modifier',
      'différente'
    ];
    
    const isAddressChange = changeAddressMessages.some(phrase => 
      message.toLowerCase().includes(phrase.toLowerCase())
    );

    if (isAddressChange) {
      return {
        type: 'assistant',
        content: `📍 **Nouvelle adresse de livraison**

Veuillez indiquer votre nouvelle adresse complète :

**Format :** Quartier/Rue, Ville
**Exemple :** Mermoz, Dakar`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_address' as ConversationStep,
          flags: { 
            collectingNewAddress: true,
            addressChangeRequested: true 
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CORRECTION 3: Traiter une nouvelle adresse saisie
    if (message.trim().length > 5) {
      const addressParts = message.split(',').map(part => part.trim());
      
      if (addressParts.length >= 2) {
        // Format: "Rue/Quartier, Ville"
        orderState.data.address = addressParts[0];
        orderState.data.city = addressParts[1];
      } else {
        // Une seule partie - considérer comme adresse, garder la ville existante
        orderState.data.address = message.trim();
        if (!orderState.data.city) {
          orderState.data.city = 'Dakar'; // Valeur par défaut
        }
      }

      // Passer à l'étape paiement
      orderState.step = 'payment';
      this.orderStates.set(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ **Nouvelle adresse enregistrée !**

📍 **Livraison à :** ${orderState.data.address}, ${orderState.data.city}

💰 **Récapitulatif :**
• ${orderState.data.quantity}x ${orderState.data.productName}
• **Total : ${totalAmount.toLocaleString()} FCFA**

🎯 **Choisissez votre mode de paiement**`,
        choices: [
          '📱 Wave (recommandé)',
          '💳 Carte bancaire', 
          '💵 Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          orderData: orderState.data,
          flags: { 
            addressUpdated: true,
            newAddressSet: true 
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Message d'erreur si le format n'est pas reconnu
    return {
      type: 'assistant',
      content: `😅 **Je n'ai pas bien compris votre choix**

Voulez-vous :
• **Garder l'adresse actuelle** : ${orderState.data.address || 'Non définie'}, ${orderState.data.city || 'Non définie'}
• **Ou saisir une nouvelle adresse** ?

Vous pouvez aussi taper directement votre nouvelle adresse (format: Quartier, Ville)`,
      choices: [
        'Oui, même adresse',
        'Changer d\'adresse'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_address' as ConversationStep,
        flags: { 
          addressConfirmationPending: true,
          retryAddressStep: true 
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODE AUXILIAIRE: Détecter si l'utilisateur confirme l'adresse
  private detectAddressConfirmation(message: string): boolean {
    const confirmations = [
      'oui',
      'oui, même adresse',
      'même adresse',
      'garder',
      'conserver',
      'confirmer',
      'ok',
      'd\'accord',
      'parfait'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return confirmations.some(conf => lowerMessage.includes(conf));
  }

  // ✅ MÉTHODE AUXILIAIRE: Détecter si l'utilisateur veut changer l'adresse
  private detectAddressChange(message: string): boolean {
    const changes = [
      'changer',
      'modifier',
      'nouvelle',
      'autre',
      'différente',
      'non'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return changes.some(change => lowerMessage.includes(change));
  }

  // ✅ CRÉER MESSAGE DE PAIEMENT avec intégration Wave/Stripe
  private async createPaymentMessage(orderState: ExpressOrderState): Promise<ChatMessage> {
    const totalAmount = orderState.data.unitPrice * orderState.data.quantity;
    const isDakar = orderState.data.city?.toLowerCase().includes('dakar');

    // Déterminer les options de paiement selon la zone
    const paymentChoices = isDakar 
      ? [
          `🌊 Payer ${totalAmount.toLocaleString()} FCFA avec Wave`,
          `💳 Payer ${totalAmount.toLocaleString()} FCFA par Carte`,
          `🛵 Payer ${totalAmount.toLocaleString()} FCFA à la livraison`
        ]
      : [
          `🌊 Payer ${totalAmount.toLocaleString()} FCFA avec Wave`,
          `💳 Payer ${totalAmount.toLocaleString()} FCFA par Carte`
        ];

    return {
      type: 'assistant',
      content: `💳 **Choisissez votre mode de paiement**

**Récapitulatif :**
🎮 ${orderState.data.productName} x${orderState.data.quantity}
📍 ${orderState.data.city}
💰 **Total : ${totalAmount.toLocaleString()} FCFA**

Comment souhaitez-vous payer ?`,
      choices: paymentChoices,
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        paymentAmount: totalAmount, // ✅ NOUVEAU: Montant pour paiement direct
        orderData: {
          totalAmount: totalAmount,
          city: orderState.data.city,
          productId: orderState.data.productId,
          productName: orderState.data.productName,
          quantity: orderState.data.quantity,
          first_name: orderState.data.firstName,
          last_name: orderState.data.lastName,
          phone: orderState.data.phone,
          address: orderState.data.address
        },
        flags: { paymentSelection: true, enableDirectPayment: true } // ✅ Flag pour paiement direct
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ ÉTAPE 5 : Paiement (Traité maintenant par ChatMessage directement)
  private async handlePaymentStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // ✅ Si le paiement a été traité directement dans ChatMessage, on confirme
    if (message.includes('Paiement') && message.includes('confirmé')) {
      return await this.handlePaymentConfirmation(sessionId, orderState, message);
    }

    // ✅ Fallback pour paiements non directs  
    let paymentMethod: PaymentProvider;

    if (message.toLowerCase().includes('wave')) {
      paymentMethod = 'wave';
    } else if (message.toLowerCase().includes('carte')) {
      paymentMethod = 'card';
    } else if (message.toLowerCase().includes('livraison')) {
      paymentMethod = 'CASH'; // ✅ Maintenant compatible avec le type
    } else {
      return this.createErrorMessage('Veuillez choisir un mode de paiement valide.');
    }


    orderState.data.paymentMethod = paymentMethod;
    orderState.step = 'confirmation';
    this.orderStates.set(sessionId, orderState);

    // Créer la commande
    const orderResult = await this.createOrder(sessionId, orderState);
    
    if (!orderResult.success) {
      return this.createErrorMessage(orderResult.error || 'Erreur lors de la création de la commande');
    }

    return {
      type: 'assistant',
      content: `✅ **Commande confirmée !**

**Numéro de commande :** #${orderResult.orderId}

${this.getPaymentInstructions(paymentMethod)}

**Livraison :** 24-48h ouvrables à ${orderState.data.city}

Voulez-vous recevoir la confirmation par SMS ?`,
      choices: [
        '📱 Recevoir SMS',
        '✅ C\'est parfait',
        '🛍️ Ajouter un autre jeu'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_completed' as ConversationStep,
        orderData: {
          orderId: orderResult.orderId,
          paymentMethod: paymentMethod,
          status: 'confirmed'
        },
        flags: { orderCompleted: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ NOUVEAU: Gérer la confirmation de paiement après traitement direct
  private async handlePaymentConfirmation(
    sessionId: string,
    orderState: ExpressOrderState,
    message: string
  ): Promise<ChatMessage> {
    
    // Extraire le type de paiement du message
    let paymentMethod: PaymentProvider = 'wave';
    if (message.includes('Carte')) paymentMethod = 'card';
    if (message.includes('livraison')) paymentMethod = 'CASH';

    orderState.data.paymentMethod = paymentMethod;
    orderState.step = 'confirmation';
    this.orderStates.set(sessionId, orderState);

    // Créer la commande
    const orderResult = await this.createOrder(sessionId, orderState);
    
    if (!orderResult.success) {
      return this.createErrorMessage(orderResult.error || 'Erreur lors de la création de la commande');
    }

    return {
      type: 'assistant',
      content: `🎉 **Paiement confirmé !**

**Numéro de commande :** #${orderResult.orderId}
**Statut :** Commande validée ✅

Votre commande sera traitée dans les plus brefs délais.

Que souhaitez-vous faire maintenant ?`,
      choices: [
        '📦 Suivre ma commande',
        '🛍️ Commander un autre jeu',
        '📱 Télécharger l\'app mobile',
        '✅ Parfait, merci !'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'post_purchase' as ConversationStep,
        orderData: {
          orderId: orderResult.orderId,
          paymentMethod: paymentMethod,
          status: 'confirmed'
        },
        flags: { orderCompleted: true, paymentConfirmed: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ ÉTAPE 6 : Confirmation finale
  private async handleConfirmationStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // Nettoyer l'état de commande
    this.orderStates.delete(sessionId);

    if (message.includes('Recevoir SMS')) {
      return {
        type: 'assistant',
        content: `📱 **SMS envoyé !**

Vous recevrez toutes les informations sur votre commande par SMS.

Merci pour votre confiance ! 🙏`,
        choices: [
          '🛍️ Voir d\'autres jeux',
          '📱 Télécharger l\'app mobile',
          '✅ Parfait, merci !'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'post_purchase' as ConversationStep,
          flags: { orderCompleted: true, smsRequested: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    if (message.includes('Ajouter un autre jeu')) {
      return await this.createUpsellMessage(orderState.data.productId);
    }

    return {
      type: 'assistant',
      content: `✅ **Merci pour votre commande !**

Votre jeu **${orderState.data.productName}** sera livré dans les plus brefs délais.

🎮 **Profitez bien de votre expérience VIENS ON S'CONNAÎT !**`,
      choices: [
        '🛍️ Commander un autre jeu',
        '📱 Télécharger l\'app mobile',
        '⭐ Laisser un avis'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'post_purchase' as ConversationStep,
        flags: { orderCompleted: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ GESTION DES QUESTIONS PRÉDÉFINIES
  private async handlePredefinedQuestion(
    message: string,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    
    if (message.includes('comment y jouer') || message.includes('Comment y jouer')) {
      return {
        type: 'assistant',
        content: `🎮 **Comment jouer à ${productName} :**

**C'est très simple :**
1️⃣ **Mélangez** les 150 cartes
2️⃣ **Chacun votre tour**, tirez une carte
3️⃣ **Lisez la question** à voix haute
4️⃣ **Répondez sincèrement** et écoutez la réponse de l'autre
5️⃣ **Échangez** sur vos réponses respectives

🎯 **L'objectif :** Créer des conversations profondes et authentiques pour mieux vous comprendre !

💡 **Astuce :** Prenez votre temps, il n'y a pas de bonnes ou mauvaises réponses.`,
        choices: [
          'Je veux l\'acheter maintenant',
          'C\'est pour qui ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'game_rules_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };
    }

    if (message.includes('c\'est pour qui') || message.includes('C\'est pour qui')) {
      return {
        type: 'assistant',
        content: `👥 **${productName} est parfait pour :**

❤️ **Les couples** qui veulent renforcer leur complicité
👨‍👩‍👧‍👦 **Les familles** qui souhaitent créer des liens plus forts  
👫 **Les amis** qui veulent approfondir leur amitié
💼 **Les collègues** pour améliorer la cohésion d'équipe
🔄 **Toute relation** qui mérite d'être enrichie

✨ **Peu importe votre âge ou votre situation**, nos jeux s'adaptent à tous !

🎯 **L'important :** Avoir envie de créer des moments authentiques ensemble.`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'target_audience_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };
    }

    if (message.includes('bénéfices') || message.includes('Quels sont les bénéfices')) {
      return {
        type: 'assistant',
        content: `✨ **Les bénéfices de ${productName} :**

🎯 **Communication améliorée**
• Conversations plus profondes et authentiques
• Meilleure écoute mutuelle

❤️ **Relation renforcée**  
• Complicité accrue
• Confiance mutuelle développée

🔍 **Découverte mutuelle**
• Apprendre des choses nouvelles sur l'autre
• Comprendre ses valeurs et ses rêves

😌 **Bien-être relationnel**
• Moins de malentendus
• Plus de moments complices

🎁 **Bonus :** Des souvenirs inoubliables à chaque partie !`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'benefits_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };
    }

    // Question générale par défaut
    return {
      type: 'assistant',
      content: `🤔 **Bonne question !** 

Je suis là pour vous aider avec toutes vos interrogations sur **${productName}**.

Que souhaitez-vous savoir exactement ?`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui ?',
        'Quels sont les bénéfices ?'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'question_mode' as ConversationStep,
        productId: productId
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ GESTION DES QUESTIONS LIBRES avec IA
  private async handleFreeTextQuestion(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<ChatMessage> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          productId: productId,
          currentStep: 'question_mode',
          orderData: {},
          sessionId: sessionId,
          storeId: 'a9563f88-217c-4998-b080-ed39f637ea31'
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const aiResponse = await response.json();

      return {
        type: 'assistant',
        content: aiResponse.message || "Je suis là pour vous aider !",
        choices: aiResponse.choices || [
          'Je veux l\'acheter maintenant',
          'Autre question',
          'Parler à un conseiller'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'ai_response' as ConversationStep,
          productId: productId,
          flags: { aiGenerated: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error calling AI API:', error);
      
      return {
        type: 'assistant',
        content: `Je comprends votre question sur **${productName}**.

Malheureusement, je rencontre un problème technique pour vous répondre en détail.

📞 **Contactez-nous directement :**
WhatsApp : +221 78 136 27 28

Ou choisissez une option ci-dessous :`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'fallback_response' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ MÉTHODES DE RÉCUPÉRATION DE DONNÉES PRODUIT
  private async getGameRules(productId: string, productName: string): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('game_rules')
        .eq('id', productId)
        .single();

      const gameRules = product?.game_rules || 
        `🎮 **Comment jouer au jeu ${productName} :**

📋 **Règles simples :**
• Mélangez les cartes
• Chaque joueur tire une carte à tour de rôle
• Lisez la question/défi à voix haute
• Répondez de manière authentique
• Écoutez et échangez avec bienveillance

⏰ **Durée :** 30-60 minutes
👥 **Participants :** 2 personnes minimum
✨ **Objectif :** Créer des conversations mémorables`;

      return {
        type: 'assistant',
        content: gameRules,
        choices: [
          'Je veux l\'acheter maintenant',
          'C\'est pour qui ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'post_rules_engagement' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching game rules:', error);
      return this.createErrorMessage('Impossible de récupérer les règles du jeu.');
    }
  }

  private async getTargetAudience(productId: string, productName: string): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('target_audience')
        .eq('id', productId)
        .single();

      const targetAudience = product?.target_audience || 
        `👥 **Le jeu ${productName} est parfait pour :**

💑 **Les couples** qui veulent renforcer leur complicité
👨‍👩‍👧‍👦 **Les familles** qui cherchent à mieux se connaître
👫 **Les amis** qui veulent approfondir leur amitié
👔 **Les collègues** pour améliorer la cohésion d'équipe

✨ **Âge recommandé :** À partir de 16 ans
🎯 **Idéal pour :** Tous ceux qui veulent des relations plus authentiques`;

      return {
        type: 'assistant',
        content: targetAudience,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'target_audience_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching target audience:', error);
      return this.createErrorMessage('Impossible de récupérer les informations sur le public cible.');
    }
  }

  private async getBenefits(productId: string, productName: string): Promise<ChatMessage> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('benefits')
        .eq('id', productId)
        .single();

      const benefits = product?.benefits || 
        `💝 **Les bénéfices du jeu ${productName} :**

🔥 **Renforce la complicité** entre vous et vos proches
💬 **Facilite la communication** sur des sujets importants
✨ **Crée des souvenirs mémorables** et des moments d'intimité
🌟 **Développe l'empathie** et la compréhension mutuelle
❤️ **Approfondit les relations** de manière naturelle et amusante

🎯 **Résultat :** Des liens plus forts et une meilleure connaissance de l'autre`;

      return {
        type: 'assistant',
        content: benefits,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'benefits_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching benefits:', error);
      return this.createErrorMessage('Impossible de récupérer les bénéfices du jeu.');
    }
  }

  private async getTestimonials(productId: string, productName: string): Promise<ChatMessage> {
    try {
      const { data: testimonials } = await supabase
        .from('testimonials')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(3);

      let content = '';

      if (!testimonials || testimonials.length === 0) {
        content = `⭐ **Ce que disent nos clients sur ${productName} :**

Nous collectons actuellement les premiers témoignages de nos clients.

🔄 **En attendant, découvrez pourquoi nos jeux fonctionnent :**
• Méthode testée et approuvée
• Conception basée sur la psychologie des relations
• Déjà des centaines de couples/familles transformés

💬 **Prêt(e) à vivre cette expérience ?**`;
      } else {
        const testimonialTexts = testimonials.map(t => {
          const stars = '⭐'.repeat(t.rating);
          return `${stars} **${t.author_name || 'Client'}** ${t.author_location ? `(${t.author_location})` : ''}\n"${t.content}"`;
        }).join('\n\n');
        
        content = `⭐ **Ce que disent nos clients sur ${productName} :**

${testimonialTexts}

💬 **Et vous, prêt(e) à vivre cette expérience ?**`;
      }

      return {
        type: 'assistant',
        content: content,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'testimonials_shown' as ConversationStep,
          productId: productId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return this.createErrorMessage('Impossible de récupérer les témoignages.');
    }
  }

  // ✅ CRÉER UNE COMMANDE - CORRIGÉ AVEC BONS TYPES
  private async createOrder(
  sessionId: string,
  orderState: ExpressOrderState
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // ✅ CORRECTION: Préparer les données selon le format attendu par OrderService
    const orderData = {
      session_id: sessionId,
      product_id: orderState.data.productId,
      store_id: 'a9563f88-217c-4998-b080-ed39f637ea31',
      quantity: orderState.data.quantity,
      phone: orderState.data.phone!,
      first_name: orderState.data.firstName!,
      last_name: orderState.data.lastName!,
      city: orderState.data.city!,
      address: orderState.data.address!,
      payment_method: orderState.data.paymentMethod!,
      total_amount: orderState.data.unitPrice * orderState.data.quantity,
      status: 'pending' as const
    };

    console.log('📦 Creating order with data:', orderData);

    // ✅ OPTION A: Si OrderService.createOrder attend un string (JSON)
    let result;
    try {
      result = await this.orderService.createOrder(JSON.stringify(orderData));
    } catch (jsonError) {
      // ✅ OPTION B: Si OrderService.createOrder attend l'objet directement
      console.log('📦 Trying with object format...');
      result = await this.orderService.createOrder(orderData as any);
    }
    
    console.log('📦 Order service result:', result);

    // ✅ CORRECTION: Gestion flexible du résultat
    if (result && typeof result === 'object') {
      // Si le résultat a une propriété success
      if ('success' in result) {
        const orderResult = result as { success: boolean; order?: { id: string }; error?: string };
        
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
      }
      // Si le résultat est directement l'ordre créé
      else if ('id' in result) {
        return {
          success: true,
          orderId: (result as any).id
        };
      }
    }
    
    // Si result est une string (message d'erreur)
    if (typeof result === 'string') {
      return {
        success: false,
        error: result
      };
    }

    // Fallback
    return {
      success: false,
      error: 'Format de réponse inattendu du service de commande'
    };

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

  // ✅ CRÉER MESSAGE D'UPSELL avec cartes produits
  private async createUpsellMessage(currentProductId: string): Promise<ChatMessage> {
    try {
      // Récupérer d'autres jeux pour l'upsell
      const { data: relatedProducts } = await supabase
        .from('products')
        .select('id, name, price, images, stats')
        .eq('status', 'active')
        .neq('id', currentProductId)
        .limit(3);

      if (!relatedProducts || relatedProducts.length === 0) {
        return {
          type: 'assistant',
          content: `🛍️ **Nos autres jeux seront bientôt disponibles !**

En attendant, téléchargez notre app mobile pour découvrir tous nos jeux :`,
          choices: [
            '📱 Télécharger l\'app',
            '✅ Merci, c\'est tout'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'app_recommendation' as ConversationStep
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ NOUVEAU: Ajouter les données produits pour affichage en cartes
      const productCards = relatedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images || [],
        stats: p.stats,
        reason: `Parfait pour compléter votre collection`,
        urgency: 'medium' as const,
        discount: 10 // 10% de réduction pour l'upsell
      }));

      return {
        type: 'assistant',
        content: `🛍️ **Nos autres jeux populaires :**

Profitez de 10% de réduction sur votre prochain achat !`,
        choices: [
          ...relatedProducts.map(p => `Ajouter ${p.name}`),
          'Non merci, ça suffit'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'upsell_selection' as ConversationStep,
          recommendedProducts: productCards, // ✅ Pour affichage en cartes
          relatedProducts: relatedProducts
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating upsell message:', error);
      return this.createErrorMessage('Impossible de charger les autres jeux.');
    }
  }

  // ✅ MÉTHODES UTILITAIRES
  private isWelcomeButtonChoice(message: string): boolean {
    const welcomeChoices = [
      'je veux l\'acheter maintenant',
      'j\'ai des questions à poser',
      'je veux en savoir plus'
    ];
    
    return welcomeChoices.some(choice => 
      message.toLowerCase().includes(choice.toLowerCase())
    );
  }


  private isPredefinedQuestion(message: string): boolean {
    const predefinedQuestions = [
      'comment y jouer',
      'c\'est pour qui',
      'quels sont les bénéfices',
      'télécharger l\'application',
      'livraison'
    ];
    
    return predefinedQuestions.some(question => 
      message.toLowerCase().includes(question.toLowerCase())
    );
  }

  private async getProductData(productId: string): Promise<{ price: number }> {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      return { price: product?.price || 14000 };
    } catch (error) {
      console.error('Error fetching product data:', error);
      return { price: 14000 }; // Prix par défaut
    }
  }

  private getPaymentInstructions(paymentMethod: PaymentProvider): string {
    switch (paymentMethod) {
      case 'wave':
        return '📱 **Paiement Wave :** Lien de paiement traité automatiquement';
      case 'card':
        return '💳 **Carte bancaire :** Paiement sécurisé traité automatiquement';
      case 'CASH':
        return '💵 **Paiement à la livraison :** Préparez le montant exact';
      default:
        return '💳 **Paiement :** Instructions envoyées par SMS';
    }
  }

  private createErrorMessage(errorText: string): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **${errorText}**

Voulez-vous réessayer ou contacter notre support ?`,
      choices: ['🔄 Réessayer', '📞 Contacter le support'],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        flags: { hasError: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES PUBLIQUES pour compatibilité avec l'existant (CORRIGÉES)
  public async handleExpressFlow(
    sessionId: string,
    message: string,
    currentStep: string
  ): Promise<ChatMessage> {
    // ✅ CORRECTION: Rediriger vers processMessage avec paramètres complets
    const orderState = this.orderStates.get(sessionId);
    const productId = orderState?.data.productId || '';
    const productName = orderState?.data.productName || '';
    
    return this.processMessage(
      sessionId, 
      message, 
      currentStep as ConversationStep, 
      productId, 
      productName
    );
  }

  public async handleExpressStep(
    sessionId: string,
    input: string,
    currentStep: string
  ): Promise<ChatMessage> {
    // ✅ CORRECTION: Rediriger vers processMessage avec paramètres complets
    const orderState = this.orderStates.get(sessionId);
    const productId = orderState?.data.productId || '';
    const productName = orderState?.data.productName || '';
    
    return this.processMessage(
      sessionId, 
      input, 
      currentStep as ConversationStep, 
      productId, 
      productName
    );
  }
}