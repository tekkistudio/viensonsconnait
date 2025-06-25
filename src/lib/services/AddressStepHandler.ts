// src/lib/services/AddressStepHandler.ts - VERSION FINALE CORRIGÉE
import type { ChatMessage, ConversationStep, PaymentProvider, OrderData } from '@/types/chat';

// ✅ INTERFACE MessageActions (définition locale pour éviter les conflits)
interface MessageActions {
  showCart?: boolean;
  showProduct?: boolean;
  triggerUpsell?: boolean;
  showTestimonials?: boolean;
  redirectWhatsApp?: boolean;
  showPayment?: boolean; // ✅ CORRECTION: Propriété nécessaire
  showQuantitySelector?: boolean;
  showDeliveryOptions?: boolean;
  showSummary?: boolean;
}

// ✅ INTERFACE ExpressOrderState corrigée
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
    paymentMethod?: PaymentProvider; // ✅ PaymentProvider harmonisé
  };
  flags: {
    isExistingCustomer: boolean;
    needsNameCollection: boolean;
    needsAddressCollection: boolean;
  };
}

export class AddressStepHandler {
  
  /**
   * ✅ GESTION DE L'ÉTAPE ADRESSE avec MessageActions correct
   */
  static async handleAddressStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState,
    updateOrderState: (sessionId: string, state: ExpressOrderState) => void
  ): Promise<ChatMessage> {
    
    console.log('📍 Handling address step:', { message, currentAddress: orderState.data.address });

    // ✅ Liste exhaustive des confirmations d'adresse
    const addressConfirmations = [
      'oui, même adresse',
      'oui même adresse',
      'même adresse',
      'garder la même',
      'conserver l\'adresse',
      'conserver l adresse',
      'garder cette adresse',
      'oui',
      'ok',
      'd\'accord',
      'parfait',
      'confirmer',
      'valider',
      'c\'est bon',
      'ça va',
      'correct'
    ];
    
    const messageNormalized = message.toLowerCase().trim();
    const isAddressConfirmation = addressConfirmations.some(phrase => 
      messageNormalized.includes(phrase.toLowerCase())
    );

    // ✅ Gestion des changements d'adresse
    const addressChanges = [
      'changer d\'adresse',
      'changer adresse',
      'nouvelle adresse',
      'autre adresse',
      'modifier l\'adresse',
      'modifier adresse',
      'différente adresse',
      'changer',
      'modifier',
      'nouvelle',
      'autre',
      'différente',
      'non'
    ];
    
    const isAddressChange = addressChanges.some(phrase => 
      messageNormalized.includes(phrase.toLowerCase())
    );

    // ✅ CAS 1: Confirmation de l'adresse existante
    if (isAddressConfirmation && !isAddressChange) {
      console.log('✅ User confirmed existing address');
      
      // Passer à l'étape paiement
      orderState.step = 'payment';
      updateOrderState(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      // ✅ CORRECTION TYPESCRIPT: Créer orderData compatible avec OrderData
      const orderDataForMetadata: Partial<OrderData> = {
        productId: orderState.data.productId,
        product_id: orderState.data.productId,
        quantity: orderState.data.quantity,
        phone: orderState.data.phone,
        first_name: orderState.data.firstName,
        last_name: orderState.data.lastName,
        city: orderState.data.city,
        address: orderState.data.address,
        total_amount: totalAmount,
        totalAmount: totalAmount,
        paymentMethod: orderState.data.paymentMethod, // ✅ PaymentProvider harmonisé
        payment_method: orderState.data.paymentMethod // ✅ PaymentProvider harmonisé
      };

      // ✅ CORRECTION: MessageActions correctement typé et défini séparément
      const messageActions: MessageActions = {
        showPayment: true
      };

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
          orderData: orderDataForMetadata, // ✅ Type compatible
          actions: messageActions, // ✅ CORRECTION: MessageActions au lieu d'objet inline
          flags: { 
            addressConfirmed: true,
            proceedToPayment: true 
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CAS 2: Demande de changement d'adresse
    if (isAddressChange && !isAddressConfirmation) {
      return {
        type: 'assistant',
        content: `📍 **Nouvelle adresse de livraison**

Veuillez indiquer votre nouvelle adresse complète :

**Format attendu :** Quartier/Rue, Ville
**Exemple :** Mermoz, Dakar

Tapez votre nouvelle adresse ci-dessous :`,
        choices: [], // Pas de choix, on attend la saisie libre
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_address' as ConversationStep,
          flags: { 
            collectingNewAddress: true,
            addressChangeRequested: true,
            waitingForAddressInput: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CAS 3: Nouvelle adresse saisie (format libre)
    if (message.trim().length > 5 && !isAddressConfirmation && !isAddressChange) {
      return this.processNewAddress(sessionId, message, orderState, updateOrderState);
    }

    // ✅ CAS 4: Message ambigu ou non reconnu
    return this.handleAmbiguousAddressResponse(orderState);
  }

  /**
   * ✅ MÉTHODE: Traiter une nouvelle adresse saisie
   */
  private static processNewAddress(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState,
    updateOrderState: (sessionId: string, state: ExpressOrderState) => void
  ): ChatMessage {
    
    const addressText = message.trim();
    const addressParts = addressText.split(',').map(part => part.trim());
    
    if (addressParts.length >= 2) {
      // Format: "Rue/Quartier, Ville"
      orderState.data.address = addressParts[0];
      orderState.data.city = addressParts[1];
    } else if (addressParts.length === 1) {
      // Une seule partie - considérer comme adresse, garder la ville existante ou défaut
      orderState.data.address = addressParts[0];
      if (!orderState.data.city) {
        orderState.data.city = 'Dakar'; // Valeur par défaut
      }
    }

    // Passer à l'étape paiement
    orderState.step = 'payment';
    updateOrderState(sessionId, orderState);

    const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

    // ✅ CORRECTION TYPESCRIPT: Créer orderData compatible
    const orderDataForMetadata: Partial<OrderData> = {
      productId: orderState.data.productId,
      product_id: orderState.data.productId,
      quantity: orderState.data.quantity,
      phone: orderState.data.phone,
      first_name: orderState.data.firstName,
      last_name: orderState.data.lastName,
      city: orderState.data.city,
      address: orderState.data.address,
      total_amount: totalAmount,
      totalAmount: totalAmount,
      paymentMethod: orderState.data.paymentMethod, // ✅ PaymentProvider harmonisé
      payment_method: orderState.data.paymentMethod // ✅ PaymentProvider harmonisé
    };

    // ✅ CORRECTION: MessageActions correctement typé
    const messageActions: MessageActions = {
      showPayment: true
    };

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
        orderData: orderDataForMetadata, // ✅ Type compatible
        actions: messageActions, // ✅ CORRECTION: MessageActions au lieu d'objet inline
        flags: { 
          addressUpdated: true,
          newAddressSet: true,
          proceedToPayment: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ✅ MÉTHODE: Gérer les réponses ambiguës
   */
  private static handleAmbiguousAddressResponse(orderState: ExpressOrderState): ChatMessage {
    return {
      type: 'assistant',
      content: `😅 **Je n'ai pas bien compris votre choix**

**Adresse actuelle :** ${orderState.data.address || 'Non définie'}, ${orderState.data.city || 'Non définie'}

Voulez-vous :
• **Garder cette adresse** pour la livraison
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

  /**
   * ✅ MÉTHODE UTILITAIRE: Détecter le type de réponse d'adresse
   */
  static detectAddressResponseType(message: string): 'confirm' | 'change' | 'new_address' | 'ambiguous' {
    const messageNormalized = message.toLowerCase().trim();
    
    // Confirmations
    const confirmations = ['oui', 'même adresse', 'garder', 'conserver', 'ok', 'parfait'];
    if (confirmations.some(c => messageNormalized.includes(c))) {
      return 'confirm';
    }
    
    // Changements
    const changes = ['changer', 'modifier', 'nouvelle', 'autre', 'non'];
    if (changes.some(c => messageNormalized.includes(c))) {
      return 'change';
    }
    
    // Nouvelle adresse (contient virgule ou est assez long)
    if (message.includes(',') || message.trim().length > 10) {
      return 'new_address';
    }
    
    return 'ambiguous';
  }

  /**
   * ✅ MÉTHODE: Validation d'adresse
   */
  static validateAddress(address: string, city: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!address || address.trim().length < 3) {
      errors.push('L\'adresse doit contenir au moins 3 caractères');
    }
    
    if (!city || city.trim().length < 2) {
      errors.push('La ville doit contenir au moins 2 caractères');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}