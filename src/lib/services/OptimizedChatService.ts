// src/lib/services/OptimizedChatService.ts - VERSION CORRIGÉE AVEC PAIEMENT FONCTIONNEL

import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ConversationStep, 
  ChatOrderData,
  PaymentProvider,
  ProductData
} from '@/types/chat';
import { WelcomeMessageService } from './WelcomeMessageService';

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
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export class OptimizedChatService {
  private static instance: OptimizedChatService;
  private orderStates = new Map<string, ExpressOrderState>();
  private welcomeService = WelcomeMessageService.getInstance();

  private constructor() {
    console.log('🔧 OptimizedChatService v5.1 initialized (Wave Payment Fixed)');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE COMPATIBLE AVEC L'API
  public async processMessage(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    try {
      console.log('🔍 ProcessMessage called with:', {
        sessionId: sessionId?.substring(0, 20) + '...',
        message: message?.substring(0, 50) + '...',
        currentStep,
        productId,
        productName
      });

      // Vérifications de sécurité
      if (!sessionId || !productId || !productName) {
        throw new Error('Paramètres manquants');
      }

      // ✅ Toujours essayer de récupérer l'état depuis la base
      await this.loadOrderStateFromDatabase(sessionId);

      // ✅ GESTION PRIORITAIRE: "Je veux l'acheter maintenant"
      if (this.isExpressPurchaseTrigger(message)) {
        console.log('🛒 Express purchase detected');
        return await this.startExpressPurchase(sessionId, productId, productName);
      }

      // ✅ Gérer le flow express (étapes scénarisées) 
      if (currentStep.startsWith('express_') || this.orderStates.has(sessionId)) {
        console.log('📦 Express flow step detected');
        return await this.handleExpressFlowInternal(sessionId, message, currentStep, productId, productName);
      }

      // ✅ Gérer les autres boutons du message d'accueil
      if (this.isWelcomeButtonChoice(message)) {
        console.log('🌹 Welcome button choice detected');
        return await this.welcomeService.handleWelcomeButtonResponse(message, productId, productName);
      }

      // ✅ Gérer les questions prédéfinies
      if (this.isPredefinedQuestion(message)) {
        console.log('📋 Predefined question detected');
        return await this.handlePredefinedQuestion(message, productId, productName);
      }

      // ✅ Questions libres → Réponse simple
      console.log('🤖 Free text question detected');
      return await this.handleFreeTextQuestion(message, productId, productName, sessionId);

    } catch (error) {
      console.error('❌ Error in processMessage:', error);
      return this.createErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  // ✅ CORRECTION: Charger l'état depuis la base de données
  private async loadOrderStateFromDatabase(sessionId: string): Promise<void> {
    try {
      if (this.orderStates.has(sessionId)) {
        console.log('📋 Order state already in memory');
        return;
      }

      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading session:', error);
        return;
      }

      if (session && session.order_state) {
        const orderState = session.order_state as ExpressOrderState;
        this.orderStates.set(sessionId, orderState);
        console.log('✅ Order state loaded from database:', orderState.step);
      }
    } catch (error) {
      console.error('❌ Error in loadOrderStateFromDatabase:', error);
    }
  }

  // ✅ CORRECTION: Sauvegarder l'état en base de données
  private async saveOrderStateToDatabase(sessionId: string, orderState: ExpressOrderState): Promise<void> {
    try {
      const sessionData = {
        session_id: sessionId,
        product_id: orderState.data.productId,
        order_state: orderState,
        current_step: orderState.step,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chat_sessions')
        .upsert(sessionData, { onConflict: 'session_id' });

      if (error) {
        console.error('❌ Error saving session:', error);
      } else {
        console.log('✅ Session saved to database');
      }
    } catch (error) {
      console.error('❌ Error in saveOrderStateToDatabase:', error);
    }
  }

  // ✅ DÉTECTER LES TRIGGERS D'ACHAT EXPRESS
  private isExpressPurchaseTrigger(message: string): boolean {
    const triggers = [
      'Je veux l\'acheter maintenant',
      'acheter maintenant',
      'commander maintenant',
      'Je veux l\'acheter',
      '⚡ Commander rapidement',
      'Commander rapidement'
    ];
    
    return triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  // ✅ DÉMARRER L'ACHAT EXPRESS AVEC PLUS DE FLUIDITÉ
  public async startExpressPurchase(
    sessionId: string,
    productId: string,
    productName?: string
  ): Promise<ChatMessage> {
    try {
      console.log('🚀 startExpressPurchase called');

      // Récupérer les informations du produit
      const { data: product, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new Error('Produit non trouvé en base');
      }

      // ✅ Nettoyer l'ancienne session si elle existe
      if (this.orderStates.has(sessionId)) {
        this.orderStates.delete(sessionId);
      }

      // Initialiser l'état de commande express
      const orderState: ExpressOrderState = {
        step: 'quantity',
        data: {
          productId,
          productName: productName || product.name,
          unitPrice: product.price,
          quantity: 1
        },
        flags: {
          isExistingCustomer: false,
          needsNameCollection: true,
          needsAddressCollection: true
        },
        sessionId: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // ✅ Sauvegarder en mémoire ET en base
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      console.log('✅ Order state created and saved');

      return {
        type: 'assistant' as const,
        content: `🛒 **Parfait ! Je vais vous aider à commander votre ${productName || product.name}**

C'est un excellent choix ! 🎉

Pour commencer, combien d'exemplaires souhaitez-vous ?`,
        choices: [
          '1 exemplaire',
          '2 exemplaires',
          '3 exemplaires', 
          'Autre quantité'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'express_quantity' as ConversationStep,
          productId: productId,
          flags: { 
            expressMode: true,
            quantitySelection: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in startExpressPurchase:', error);
      return this.createErrorMessage(`Erreur achat express: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  // ✅ GESTION INTERNE DU FLOW EXPRESS AVEC PLUS DE FLUIDITÉ
  private async handleExpressFlowInternal(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    try {
      // ✅ Toujours charger depuis la base si pas en mémoire
      await this.loadOrderStateFromDatabase(sessionId);
      
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
          },
          sessionId: sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.orderStates.set(sessionId, orderState);
        await this.saveOrderStateToDatabase(sessionId, orderState);
      }

      if (!orderState) {
        return this.createErrorMessage('Session expirée. Veuillez recommencer votre commande.');
      }

      // Router selon l'étape
      switch (orderState.step) {
        case 'quantity':
          return await this.handleQuantityStepFluid(sessionId, message, orderState);
        case 'phone':
          return await this.handlePhoneStepFluid(sessionId, message, orderState);
        case 'name':
          return await this.handleNameStepFluid(sessionId, message, orderState);
        case 'address':
          return await this.handleAddressStepFluid(sessionId, message, orderState);
        case 'payment':
          return await this.handlePaymentStepFluid(sessionId, message, orderState);
        case 'confirmation':
          return await this.handleConfirmationStep(sessionId, message, orderState);
        default:
          return this.createErrorMessage('Étape inconnue dans la commande express.');
      }

    } catch (error) {
      console.error('❌ Error in express flow:', error);
      return this.createErrorMessage('Erreur dans le processus de commande');
    }
  }

  // ✅ ÉTAPE 1 : Quantité PLUS FLUIDE
  private async handleQuantityStepFluid(
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

*Tapez simplement le nombre (entre 1 et 10)*`,
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

    // ✅ Mettre à jour l'état et sauvegarder
    orderState.data.quantity = quantity;
    orderState.step = 'phone';
    orderState.updatedAt = new Date().toISOString();
    
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    const totalAmount = orderState.data.unitPrice * quantity;

    return {
      type: 'assistant',
      content: `✅ **C'est noté ! Vous commandez ${quantity} exemplaire${quantity > 1 ? 's' : ''} du jeu ${orderState.data.productName}**

**Prix total :** ${totalAmount.toLocaleString()} FCFA

Parfait ! Maintenant, j'ai besoin de votre numéro de téléphone pour organiser la livraison 📱

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

  // ✅ ÉTAPE 2 : Téléphone PLUS FLUIDE
  private async handlePhoneStepFluid(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // Validation simple du téléphone
    const cleanPhone = message.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      return {
        type: 'assistant',
        content: `😅 **Ce numéro me semble un peu court**

Pouvez-vous me donner votre numéro complet s'il vous plaît ?

*Format : +221 77 123 45 67*`,
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
    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+221' + formattedPhone;
    }
    
    // ✅ Mettre à jour et sauvegarder
    orderState.data.phone = formattedPhone;
    orderState.updatedAt = new Date().toISOString();

    // Vérifier si client existant
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('first_name, last_name, city, address')
      .eq('phone', formattedPhone)
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
      orderState.step = 'address'; // Pour confirmation d'adresse
      
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👋 **Oh ! Ravi de vous revoir ${existingCustomer.first_name} !**

J'ai retrouvé vos informations dans notre système 😊

📍 **Votre adresse habituelle :** ${existingCustomer.address}, ${existingCustomer.city}

Souhaitez-vous qu'on vous livre à cette même adresse ?`,
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
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `📱 **Parfait ! ${formattedPhone} enregistré**

Je vois que c'est votre première commande chez nous. Bienvenue ! 🎉

Pour finaliser, quel est votre nom complet ?

*Exemple : Amadou Diallo*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          flags: { awaitingNameInput: true, newCustomer: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ ÉTAPE 3 : Nom PLUS FLUIDE
  private async handleNameStepFluid(
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
      return {
        type: 'assistant',
        content: `😅 **J'ai besoin de votre nom complet**

Pouvez-vous me donner votre prénom ET votre nom s'il vous plaît ?

*Exemple : Amadou Diallo*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_name' as ConversationStep,
          flags: { nameError: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Mettre à jour et sauvegarder
    orderState.data.firstName = parts[0];
    orderState.data.lastName = parts.slice(1).join(' ');
    orderState.step = 'address';
    orderState.updatedAt = new Date().toISOString();
    
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    return {
      type: 'assistant',
      content: `👤 **Enchanté de vous connaître ${orderState.data.firstName} !**

Il ne me reste plus qu'à connaître votre adresse de livraison pour qu'on puisse vous apporter votre jeu 🚚

*Format recommandé : Quartier/Rue, Ville*
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

  // ✅ ÉTAPE 4 : Adresse PLUS FLUIDE
  private async handleAddressStepFluid(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    console.log('🏠 Processing address step:', message);
    
    // ✅ Reconnaître toutes les variantes de confirmation
    const confirmationMessages = [
      'oui, même adresse',
      'oui même adresse', 
      'même adresse',
      'oui',
      'confirmer',
      'garder la même',
      'conserver l\'adresse',
      'garder cette adresse',
      'utiliser la même'
    ];
    
    const isAddressConfirmation = confirmationMessages.some(phrase => 
      message.toLowerCase().includes(phrase.toLowerCase())
    );

    // ✅ Vérifier si c'est une confirmation ET client existant
    if (isAddressConfirmation && orderState.flags.isExistingCustomer) {
      console.log('✅ Address confirmed for existing customer');
      
      // ✅ Mettre à jour et sauvegarder
      orderState.step = 'payment';
      orderState.updatedAt = new Date().toISOString();
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ **Parfait ! Livraison confirmée à votre adresse habituelle**

📍 **Adresse :** ${orderState.data.address}, ${orderState.data.city}

💰 **Récapitulatif de votre commande :**
• ${orderState.data.quantity}x ${orderState.data.productName}
• **Total : ${totalAmount.toLocaleString()} FCFA**

🎯 **Dernière étape : Comment souhaitez-vous payer ?**`,
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

    // Reconnaître "Changer d'adresse"
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
        content: `📍 **Pas de problème ! Donnez-moi votre nouvelle adresse**

Où souhaitez-vous qu'on vous livre votre jeu ?

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

    // Traiter une nouvelle adresse saisie
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

      // ✅ Mettre à jour et sauvegarder
      orderState.step = 'payment';
      orderState.updatedAt = new Date().toISOString();
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ **Adresse enregistrée avec succès !**

📍 **Livraison confirmée à :** ${orderState.data.address}, ${orderState.data.city}

💰 **Récapitulatif de votre commande :**
• ${orderState.data.quantity}x ${orderState.data.productName}
• **Total : ${totalAmount.toLocaleString()} FCFA**

🎯 **Plus qu'un clic ! Comment souhaitez-vous régler ?**`,
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

    // Message d'erreur si le format n'est pas reconnu
    return {
      type: 'assistant',
      content: `😅 **Je n'ai pas bien saisi votre choix**

Pouvez-vous m'aider ? Voulez-vous :

• **Garder votre adresse actuelle** : ${orderState.data.address || 'Non définie'}, ${orderState.data.city || 'Non définie'}
• **Ou bien saisir une nouvelle adresse** ?

Vous pouvez aussi taper directement votre adresse complète (Quartier, Ville)`,
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

  // ✅ ÉTAPE 5 : Paiement CORRIGÉ AVEC VÉRIFICATION WAVE MANUELLE
  private async handlePaymentStepFluid(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // ✅ NOUVEAU: Vérifier si c'est un ID de transaction Wave
    if (this.isWaveTransactionId(message)) {
      return await this.handleWaveTransactionVerification(sessionId, message, orderState);
    }
    
    let paymentMethod: PaymentProvider;

    if (message.toLowerCase().includes('wave')) {
      paymentMethod = 'wave';
    } else if (message.toLowerCase().includes('carte')) {
      paymentMethod = 'card';
    } else if (message.toLowerCase().includes('livraison')) {
      paymentMethod = 'cash_on_delivery';
    } else if (message === 'WAVE_PAYMENT_INITIATED') {
      // ✅ NOUVEAU: Gestion du retour Wave
      return await this.handleWavePaymentReturn(sessionId, orderState);
    } else {
      return {
        type: 'assistant',
        content: `😅 **Je n'ai pas bien compris votre choix de paiement**

Pouvez-vous choisir parmi ces options ?`,
        choices: [
          '📱 Wave (recommandé)',
          '💳 Carte bancaire', 
          '💵 Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          flags: { paymentError: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Mettre à jour et sauvegarder
    orderState.data.paymentMethod = paymentMethod;
    orderState.updatedAt = new Date().toISOString();
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    if (paymentMethod === 'wave') {
      // ✅ WAVE: Créer la commande mais en statut pending
      const orderResult = await this.createOrderCorrected(sessionId, orderState, 'pending');
      
      if (!orderResult.success) {
        return this.createErrorMessage(orderResult.error || 'Erreur lors de la création de la commande');
      }

      // ✅ NOUVEAU: Message pour Wave avec instructions spéciales
      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;
      
      return {
        type: 'assistant',
        content: `🌊 **Paiement Wave sélectionné**

**Commande :** #${orderResult.orderId}
**Montant :** ${totalAmount.toLocaleString()} FCFA

🔗 **Cliquez sur le bouton Wave ci-dessous pour payer**

Après votre paiement, revenez ici et donnez-moi votre **ID de Transaction** Wave pour confirmer votre commande.

💡 **L'ID de Transaction se trouve dans votre historique Wave et commence par 'T'**`,
        choices: [
          '🌊 Payer avec Wave'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'wave_payment_pending' as ConversationStep,
          orderData: {
            orderId: orderResult.orderId,
            paymentMethod: paymentMethod,
            totalAmount: totalAmount,
            status: 'pending'
          },
          paymentAmount: totalAmount,
          flags: { 
            wavePaymentMode: true,
            awaitingPayment: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Pour carte et livraison : flux normal
    orderState.step = 'confirmation';
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    const orderResult = await this.createOrderCorrected(sessionId, orderState);
    
    if (!orderResult.success) {
      return this.createErrorMessage(orderResult.error || 'Erreur lors de la création de la commande');
    }

    // Personnaliser le message selon le mode de paiement
    let paymentInstructions = '';
    if (paymentMethod === 'card') {
      paymentInstructions = `💳 **Carte bancaire** : Vous allez être redirigé vers une page de paiement sécurisée.`;
    } else {
      paymentInstructions = `💵 **Paiement à la livraison** : Préparez le montant exact pour le livreur.`;
    }

    return {
      type: 'assistant',
      content: `🎉 **Félicitations ! Votre commande est confirmée !**

**Numéro de commande :** #${orderResult.orderId}

${paymentInstructions}

**Détails de livraison :**
📍 ${orderState.data.address}, ${orderState.data.city}
⏰ Livraison sous 24-48h ouvrables
📞 Nous vous tiendrons informé(e) par SMS

Merci pour votre confiance ! 🙏`,
      choices: [
        '📱 Recevoir confirmations par SMS',
        '✅ Parfait, merci !',
        '🛍️ Commander un autre jeu'
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

  // ✅ NOUVEAU: Vérifier si c'est un ID de transaction Wave
  private isWaveTransactionId(message: string): boolean {
    const cleanMessage = message.trim().toUpperCase();
    // Les IDs Wave commencent par 'T' et font 10-16 caractères alphanumériques
    const waveIdPattern = /^T[A-Z0-9]{10,15}$/;
    return waveIdPattern.test(cleanMessage);
  }

  // ✅ NOUVEAU: Gérer le retour du paiement Wave
  private async handleWavePaymentReturn(
    sessionId: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    const totalAmount = orderState.data.unitPrice * orderState.data.quantity;
    
    return {
      type: 'assistant',
      content: `✅ **Retour du paiement Wave**

J'espère que votre paiement s'est bien passé ! 

Pour confirmer votre commande, donnez-moi votre **ID de Transaction Wave**.

💡 **Comment le trouver :**
1. Ouvrez votre app Wave
2. Allez dans l'historique des transactions
3. Trouvez le paiement de ${totalAmount.toLocaleString()} FCFA
4. Copiez l'ID de Transaction (commence par 'T')

*Exemple : TJJDJORO4EPQAR4FD*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'wave_transaction_verification' as ConversationStep,
        flags: { 
          awaitingWaveTransactionId: true,
          wavePaymentMode: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ NOUVEAU: Vérifier l'ID de transaction Wave
  private async handleWaveTransactionVerification(
    sessionId: string,
    transactionId: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    const cleanTransactionId = transactionId.trim().toUpperCase();
    
    if (!this.isWaveTransactionId(cleanTransactionId)) {
      return {
        type: 'assistant',
        content: `❌ **ID de Transaction invalide**

L'ID de Transaction Wave doit :
• Commencer par la lettre 'T'
• Contenir entre 10 et 15 caractères
• Exemple : TJJDJORO4EPQAR4FD

Veuillez vérifier et réessayer.`,
        choices: [
          '🔄 Réessayer',
          '📞 Contacter le support'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'wave_transaction_verification' as ConversationStep,
          flags: { 
            transactionIdError: true,
            awaitingWaveTransactionId: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Mettre à jour la commande avec l'ID de transaction
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
          metadata: JSON.stringify({
            source: 'chatbot_express',
            wave_transaction_id: cleanTransactionId,
            payment_verified_at: new Date().toISOString()
          }),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error updating order with Wave transaction:', error);
        return this.createErrorMessage('Erreur lors de la mise à jour de la commande');
      }

      // ✅ Nettoyer l'état
      orderState.step = 'confirmation';
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `🎉 **Paiement Wave confirmé !**

✅ **Transaction vérifiée :** ${cleanTransactionId}
✅ **Votre commande est maintenant confirmée**

**Détails de livraison :**
📍 ${orderState.data.address}, ${orderState.data.city}
⏰ Livraison sous 24-48h ouvrables
📞 Nous vous tiendrons informé(e) par SMS

🙏 **Merci pour votre confiance en VIENS ON S'CONNAÎT !**`,
        choices: [
          '📱 Recevoir confirmations par SMS',
          '⭐ Laisser un avis',
          '🛍️ Commander un autre jeu'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_completed' as ConversationStep,
          orderData: {
            paymentMethod: 'wave',
            transactionId: cleanTransactionId,
            status: 'confirmed'
          },
          flags: { 
            orderCompleted: true,
            paymentConfirmed: true,
            waveVerified: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in Wave transaction verification:', error);
      return this.createErrorMessage('Erreur lors de la vérification du paiement Wave');
    }
  }

  // ✅ CORRECTION MAJEURE : Créer une commande avec le BON SCHÉMA et gestion statut
  private async createOrderCorrected(
    sessionId: string,
    orderState: ExpressOrderState,
    orderStatus: string = 'pending'
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      console.log('📦 Creating order with CORRECTED schema and status:', orderStatus);

      // ✅ CORRECTION CRITIQUE: Générer un ID court uniquement numérique pour éviter bigint error
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const orderId = `${timestamp}${random}`; // ID purement numérique comme string
      
      // ✅ SCHÉMA CORRIGÉ : Utiliser les bons noms de colonnes et types
      const orderData = {
        id: orderId, // String numérique pour compatibilité
        session_id: sessionId,
        product_id: orderState.data.productId,
        customer_name: `${orderState.data.firstName || 'Client'} ${orderState.data.lastName || ''}`.trim(),
        first_name: orderState.data.firstName || 'Client',
        last_name: orderState.data.lastName || '',
        phone: orderState.data.phone || '',
        city: orderState.data.city || '',
        address: orderState.data.address || '',
        payment_method: orderState.data.paymentMethod || 'cash_on_delivery',
        
        // ✅ CORRECTION CRITIQUE : Utiliser 'status' au lieu de 'order_status'
        status: orderStatus, // 'pending', 'confirmed', etc.
        payment_status: orderStatus === 'pending' ? 'pending' : 'completed',
        
        // ✅ CORRECTION: S'assurer que les montants sont des nombres
        total_amount: Number(orderState.data.unitPrice * orderState.data.quantity),
        delivery_cost: 0,
        
        // ✅ Stocker les détails dans order_details comme JSON string
        order_details: JSON.stringify([{
          product_id: orderState.data.productId,
          product_name: orderState.data.productName,
          quantity: Number(orderState.data.quantity),
          unit_price: Number(orderState.data.unitPrice),
          total_price: Number(orderState.data.unitPrice * orderState.data.quantity)
        }]),
        
        metadata: JSON.stringify({
          source: 'chatbot_express',
          flow: 'express',
          session_id: sessionId,
          created_via: 'chat_conversation',
          payment_method: orderState.data.paymentMethod,
          order_status: orderStatus
        }),
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📋 Order data prepared with corrected schema:', {
        id: orderData.id,
        status: orderData.status,
        payment_status: orderData.payment_status,
        total_amount: orderData.total_amount,
        id_type: typeof orderData.id
      });

      // ✅ Insérer dans la base de données
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error CORRECTED:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return {
          success: false,
          error: `Erreur base de données: ${error.message}`
        };
      }

      console.log('✅ Order created successfully with corrected schema:', data.id);
      
      return {
        success: true,
        orderId: data.id
      };

    } catch (error) {
      console.error('❌ Error creating order with corrected schema:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ✅ GESTION DES AUTRES MÉTHODES (inchangées)
  public async handleExpressFlow(
    sessionId: string,
    message: string,
    currentStep: ConversationStep | string
  ): Promise<ChatMessage> {
    await this.loadOrderStateFromDatabase(sessionId);
    
    const orderState = this.orderStates.get(sessionId);
    
    if (!orderState) {
      console.log('❌ No order state found after loading from DB');
      return this.createErrorMessage('Session de commande expirée. Cliquez sur "Je veux l\'acheter maintenant" pour recommencer.');
    }

    return await this.handleExpressFlowInternal(
      sessionId, 
      message, 
      currentStep as ConversationStep, 
      orderState.data.productId, 
      orderState.data.productName
    );
  }

  public async handleExpressStep(
    sessionId: string,
    input: string,
    currentStep: string
  ): Promise<ChatMessage> {
    await this.loadOrderStateFromDatabase(sessionId);
    
    const orderState = this.orderStates.get(sessionId);
    
    if (!orderState) {
      return this.createErrorMessage('Session de commande expirée. Veuillez recommencer.');
    }
    
    return this.handleExpressFlowInternal(
      sessionId, 
      input, 
      currentStep as ConversationStep, 
      orderState.data.productId, 
      orderState.data.productName
    );
  }

  // ✅ ÉTAPE 6 : Confirmation finale
  private async handleConfirmationStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    // Nettoyer l'état de commande
    this.orderStates.delete(sessionId);
    
    // Supprimer de la base aussi
    try {
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('❌ Error cleaning session:', error);
    }

    if (message.includes('Recevoir confirmations')) {
      return {
        type: 'assistant',
        content: `📱 **SMS de confirmation envoyé !**

Vous recevrez toutes les mises à jour de votre commande par SMS.

C'était un plaisir de vous aider ! À bientôt chez VIENS ON S'CONNAÎT 🎉`,
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

    if (message.includes('Commander un autre jeu')) {
      return await this.createUpsellMessage(orderState.data.productId);
    }

    return {
      type: 'assistant',
      content: `✅ **Merci infiniment pour votre confiance !**

Votre jeu **${orderState.data.productName}** sera livré dans les plus brefs délais.

🎮 **Profitez bien de cette expérience unique de VIENS ON S'CONNAÎT !**

À très bientôt ! 💕`,
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
        content: `🎮 **Comment jouer au jeu ${productName} :**

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

Je suis là pour vous aider avec toutes vos interrogations sur le jeu **${productName}**.

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

  // ✅ GESTION DES QUESTIONS LIBRES - VERSION SIMPLIFIÉE
  private async handleFreeTextQuestion(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<ChatMessage> {
    
    // Réponse simplifiée sans appel API
    return {
      type: 'assistant',
      content: `Je comprends votre question sur **${productName}**.

Laissez-moi vous orienter vers les informations les plus utiles :`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui ?',
        'Quels sont les bénéfices ?',
        'Je veux l\'acheter maintenant'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'question_redirect' as ConversationStep,
        productId: productId,
        flags: { simplified: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ CRÉER MESSAGE D'UPSELL
  private async createUpsellMessage(currentProductId: string): Promise<ChatMessage> {
    try {
      // Récupérer d'autres jeux pour l'upsell
      const { data: relatedProducts } = await supabase
        .from('products')
        .select('id, name, price')
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
          relatedProducts: relatedProducts
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error creating upsell message:', error);
      return this.createErrorMessage('Impossible de charger les autres jeux.');
    }
  }

  // ✅ MÉTHODES UTILITAIRES
  private isWelcomeButtonChoice(message: string): boolean {
    const welcomeChoices = [
      'j\'ai des questions à poser',
      'je veux en savoir plus',
      'questions à poser',
      'en savoir plus',
      'poser une question'
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
      console.error('❌ Error fetching product data:', error);
      return { price: 14000 }; // Prix par défaut
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
}