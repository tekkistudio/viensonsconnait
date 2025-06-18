// src/lib/services/AIOrderManager.ts

import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ConversationStep,
  CustomerData,
  OrderData,
  OrderStatus,
  PaymentProvider,
  PaymentStatus
} from '@/types/chat';

interface OrderSession {
  sessionId: string;
  currentStep: ConversationStep;
  orderData: Partial<OrderData>;
  customerData: Partial<CustomerData>;
  metadata: Record<string, any>;
  startedAt: string;
  lastUpdated: string;
}

interface OrderValidation {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

export class AIOrderManager {
  private static instance: AIOrderManager;
  private orderSessions: Map<string, OrderSession> = new Map();

  private constructor() {}

  public static getInstance(): AIOrderManager {
    if (!this.instance) {
      this.instance = new AIOrderManager();
    }
    return this.instance;
  }

  /**
   * 🚀 MÉTHODE: Démarrer une nouvelle commande
   */
  async startOrder(
    sessionId: string,
    productId: string,
    flow: 'express' | 'guided' = 'guided'
  ): Promise<ChatMessage> {
    try {
      console.log('🛒 Démarrage commande:', { sessionId, productId, flow });

      // Récupérer les infos du produit
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (error || !product) {
        return this.createErrorResponse('Produit non trouvé ou indisponible');
      }

      // Créer la session de commande
      const orderSession: OrderSession = {
        sessionId,
        currentStep: flow === 'express' ? 'express_quantity' : 'collect_quantity',
        orderData: {
          product_id: productId,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
          status: 'pending' as OrderStatus
        },
        customerData: {},
        metadata: {
          flow,
          productInfo: product,
          startedAt: new Date().toISOString()
        },
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.orderSessions.set(sessionId, orderSession);

      // Retourner le premier message selon le flux
      if (flow === 'express') {
        return this.handleExpressQuantity(sessionId);
      } else {
        return this.handleGuidedQuantity(sessionId);
      }

    } catch (error) {
      console.error('❌ Erreur démarrage commande:', error);
      return this.createErrorResponse('Erreur lors du démarrage de la commande');
    }
  }

  /**
   * ⚡ MÉTHODE: Gérer la quantité en mode express
   */
  private async handleExpressQuantity(sessionId: string): Promise<ChatMessage> {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const product = session.metadata.productInfo;

    return {
      type: 'assistant',
      content: `⚡ **Commande Express - ${product.name}**

💰 **Prix unitaire:** ${product.price.toLocaleString()} FCFA

Combien de jeux souhaitez-vous commander ?

⭐ **Plus vous en prenez, plus vous économisez sur la livraison !**`,
      choices: ['1 jeu', '2 jeux', '3 jeux', 'Autre quantité'],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'express_quantity' as ConversationStep,
        sessionId,
        flow: 'express'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🧭 MÉTHODE: Gérer la quantité en mode guidé
   */
  private async handleGuidedQuantity(sessionId: string): Promise<ChatMessage> {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const product = session.metadata.productInfo;

    return {
      type: 'assistant',
      content: `🛒 **Préparation de votre commande**

**${product.name}**
${product.description || 'Un jeu pour renforcer vos relations'}

💰 **Prix:** ${product.price.toLocaleString()} FCFA

Combien d'exemplaires voulez-vous ?

💡 **Conseil:** Beaucoup de familles prennent 2 jeux pour en offrir un ou avoir des parties avec plus de personnes !`,
      choices: ['1 jeu', '2 jeux', '3 jeux', 'Je veux en savoir plus'],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'collect_quantity' as ConversationStep,
        sessionId,
        flow: 'guided'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📝 MÉTHODE: Traiter la réponse de quantité
   */
  async processQuantityResponse(
    sessionId: string,
    response: string
  ): Promise<ChatMessage> {
    try {
      const session = this.orderSessions.get(sessionId);
      if (!session) return this.createErrorResponse('Session non trouvée');

      let quantity = 1;
      
      // Parser la réponse
      if (response.includes('1')) quantity = 1;
      else if (response.includes('2')) quantity = 2;
      else if (response.includes('3')) quantity = 3;
      else if (response.toLowerCase().includes('autre')) {
        return this.askCustomQuantity(sessionId);
      }

      // Mettre à jour la session
      session.orderData.quantity = quantity;
      session.orderData.subtotal = (session.orderData.unit_price || 0) * quantity;
      session.lastUpdated = new Date().toISOString();

      // Passer à l'étape suivante selon le flux
      if (session.metadata.flow === 'express') {
        session.currentStep = 'express_contact';
        return this.handleExpressContact(sessionId);
      } else {
        session.currentStep = 'collect_name';
        return this.handleCollectName(sessionId);
      }

    } catch (error) {
      console.error('❌ Erreur traitement quantité:', error);
      return this.createErrorResponse('Erreur lors du traitement de la quantité');
    }
  }

  /**
   * 🔢 MÉTHODE: Demander une quantité personnalisée
   */
  private askCustomQuantity(sessionId: string): ChatMessage {
    return {
      type: 'assistant',
      content: `🔢 **Quantité personnalisée**

Parfait ! Combien de jeux souhaitez-vous exactement ?

Tapez simplement le nombre (exemple: 4, 5, 10...)`,
      choices: ['4 jeux', '5 jeux', '10 jeux', 'Plus de 10'],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'custom_quantity' as ConversationStep,
        sessionId,
        expectingNumber: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ⚡ MÉTHODE: Collecter les infos de contact en mode express
   */
  private async handleExpressContact(sessionId: string): Promise<ChatMessage> {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const { quantity, subtotal } = session.orderData;

    return {
      type: 'assistant',
      content: `📞 **Vos coordonnées - Étape 2/4**

**Récapitulatif:**
• ${quantity} x ${session.metadata.productInfo.name}
• Total: ${subtotal?.toLocaleString()} FCFA

Pour traiter votre commande rapidement, j'ai besoin de:

📱 **Votre numéro de téléphone**
(pour confirmer la commande et la livraison)

Tapez votre numéro complet:`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'express_contact' as ConversationStep,
        sessionId,
        expectingPhone: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 👤 MÉTHODE: Collecter le nom en mode guidé
   */
  private async handleCollectName(sessionId: string): Promise<ChatMessage> {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    return {
      type: 'assistant',
      content: `👤 **Vos informations personnelles**

Parfait ! ${session.orderData.quantity} jeu(x) sélectionné(s).

Pour commencer, quel est votre nom complet ?

💡 **Exemple:** Jean-Baptiste Diallo`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'collect_name' as ConversationStep,
        sessionId,
        expectingName: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📱 MÉTHODE: Traiter le numéro de téléphone
   */
  async processPhoneNumber(
    sessionId: string,
    phone: string
  ): Promise<ChatMessage> {
    try {
      const session = this.orderSessions.get(sessionId);
      if (!session) return this.createErrorResponse('Session non trouvée');

      // Validation du numéro
      const cleanPhone = this.cleanPhoneNumber(phone);
      if (!this.isValidPhone(cleanPhone)) {
        return {
          type: 'assistant',
          content: `❌ **Numéro invalide**

Le numéro "${phone}" ne semble pas valide.

📱 **Formats acceptés:**
• +221 77 123 45 67
• 77 123 45 67
• 221771234567

Veuillez retaper votre numéro:`,
          choices: [],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: session.currentStep,
            sessionId,
            expectingPhone: true,
            error: 'invalid_phone'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Vérifier si le client existe
      const existingCustomer = await this.findExistingCustomer(cleanPhone);
      
      session.customerData.phone = cleanPhone;
      session.lastUpdated = new Date().toISOString();

      if (existingCustomer) {
        // Client existant
        session.customerData = { ...session.customerData, ...existingCustomer };
        session.metadata.existingCustomer = true;

        return {
          type: 'assistant',
          content: `👋 **Bon retour ${existingCustomer.first_name} !**

Je vois que vous avez déjà commandé chez nous. 

📍 **Dernière adresse connue:**
${existingCustomer.address}, ${existingCustomer.city}

Souhaitez-vous livrer à la même adresse ?`,
          choices: [
            '✅ Oui, même adresse',
            '📍 Non, nouvelle adresse',
            '📋 Voir mes commandes précédentes'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'confirm_address' as ConversationStep,
            sessionId,
            existingCustomer: true
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Nouveau client
        session.metadata.newCustomer = true;

        if (session.metadata.flow === 'express') {
          return this.handleExpressNewCustomer(sessionId);
        } else {
          return this.handleNewCustomerName(sessionId);
        }
      }

    } catch (error) {
      console.error('❌ Erreur traitement téléphone:', error);
      return this.createErrorResponse('Erreur lors du traitement du numéro');
    }
  }

  /**
   * ⚡ MÉTHODE: Nouveau client en mode express
   */
  private handleExpressNewCustomer(sessionId: string): ChatMessage {
    return {
      type: 'assistant',
      content: `🆕 **Nouveau client - Bienvenue !**

Enchanté de vous rencontrer ! 

Pour finaliser rapidement votre commande:

👤 **Votre nom complet:**
(prénom et nom de famille)`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'express_name' as ConversationStep,
        sessionId,
        expectingName: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 👤 MÉTHODE: Nom pour nouveau client mode guidé
   */
  private handleNewCustomerName(sessionId: string): ChatMessage {
    return {
      type: 'assistant',
      content: `🆕 **Nouveau client - Bienvenue chez VIENS ON S'CONNAÎT !**

C'est formidable d'avoir un nouveau membre dans notre communauté ! 

👤 **Pour commencer, quel est votre nom complet ?**

💡 **Exemple:** Aminata Ba`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'collect_name' as ConversationStep,
        sessionId,
        expectingName: true,
        newCustomer: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 👤 MÉTHODE: Traiter le nom du client
   */
  async processCustomerName(
    sessionId: string,
    fullName: string
  ): Promise<ChatMessage> {
    try {
      const session = this.orderSessions.get(sessionId);
      if (!session) return this.createErrorResponse('Session non trouvée');

      // Parser le nom
      const { firstName, lastName } = this.parseFullName(fullName);
      
      if (!firstName) {
        return {
          type: 'assistant',
          content: `❌ **Nom incomplet**

Pourriez-vous me donner votre nom complet ?

👤 **Exemple:** Fatou Sall ou Jean-Pierre Diagne

Votre nom complet:`,
          choices: [],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: session.currentStep,
            sessionId,
            expectingName: true,
            error: 'incomplete_name'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Mettre à jour les données client
      session.customerData.first_name = firstName;
      session.customerData.last_name = lastName || '';
      session.lastUpdated = new Date().toISOString();

      // Passer à l'étape suivante selon le flux
      if (session.metadata.flow === 'express') {
        session.currentStep = 'express_address';
        return this.handleExpressAddress(sessionId);
      } else {
        session.currentStep = 'collect_phone';
        return this.handleCollectPhone(sessionId);
      }

    } catch (error) {
      console.error('❌ Erreur traitement nom:', error);
      return this.createErrorResponse('Erreur lors du traitement du nom');
    }
  }

  /**
   * 📱 MÉTHODE: Collecter le téléphone en mode guidé
   */
  private handleCollectPhone(sessionId: string): ChatMessage {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    return {
      type: 'assistant',
      content: `📱 **Votre numéro de téléphone**

Merci ${session.customerData.first_name} !

J'ai besoin de votre numéro de téléphone pour:
• 📞 Confirmer votre commande
• 🚚 Coordonner la livraison
• 📧 Vous envoyer le suivi

**Votre numéro:**`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'collect_phone' as ConversationStep,
        sessionId,
        expectingPhone: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ⚡ MÉTHODE: Adresse en mode express
   */
  private handleExpressAddress(sessionId: string): ChatMessage {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    return {
      type: 'assistant',
      content: `📍 **Adresse de livraison - Étape 3/4**

Parfait ${session.customerData.first_name} !

**Votre adresse complète de livraison:**

📝 **Format:** Rue/Quartier, Ville, Pays
💡 **Exemple:** Rond-point Fann, Dakar, Sénégal

Votre adresse:`,
      choices: [],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'express_address' as ConversationStep,
        sessionId,
        expectingAddress: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📍 MÉTHODE: Traiter l'adresse
   */
  async processAddress(
    sessionId: string,
    address: string
  ): Promise<ChatMessage> {
    try {
      const session = this.orderSessions.get(sessionId);
      if (!session) return this.createErrorResponse('Session non trouvée');

      // Parser l'adresse
      const { street, city, country } = this.parseAddress(address);
      
      if (!street || !city) {
        return {
          type: 'assistant',
          content: `❌ **Adresse incomplète**

L'adresse "${address}" semble incomplète.

📍 **J'ai besoin de:**
• Rue ou quartier
• Ville
• Pays (optionnel)

💡 **Exemple:** Plateau, Dakar, Sénégal

Votre adresse complète:`,
          choices: [],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: session.currentStep,
            sessionId,
            expectingAddress: true,
            error: 'incomplete_address'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Vérifier la zone de livraison
      const deliveryInfo = await this.checkDeliveryZone(city);
      
      if (!deliveryInfo.available) {
        return {
          type: 'assistant',
          content: `😔 **Livraison non disponible**

Désolée, nous ne livrons pas encore à ${city}.

🚚 **Zones disponibles:**
${deliveryInfo.availableZones.slice(0, 8).join(' • ')}

📞 **Solution:** Contactez-nous sur WhatsApp pour une livraison spéciale:
+221 78 136 27 28`,
          choices: [
            '📞 Contacter WhatsApp',
            '📍 Changer d\'adresse',
            '🏠 Retour accueil'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'delivery_unavailable' as ConversationStep,
            sessionId,
            whatsappUrl: 'https://wa.me/221781362728'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Mettre à jour les données
      session.customerData.address = street;
      session.customerData.city = city;
      session.customerData.country = country || 'Sénégal';
      session.orderData.delivery_city = city;
      session.orderData.delivery_address = address;
      session.orderData.delivery_fee = deliveryInfo.fee;
      session.orderData.total_amount = (session.orderData.subtotal || 0) + deliveryInfo.fee;
      session.lastUpdated = new Date().toISOString();

      // Passer à l'étape suivante
      if (session.metadata.flow === 'express') {
        session.currentStep = 'express_payment';
        return this.handleExpressPayment(sessionId);
      } else {
        session.currentStep = 'order_summary';
        return this.handleOrderSummary(sessionId);
      }

    } catch (error) {
      console.error('❌ Erreur traitement adresse:', error);
      return this.createErrorResponse('Erreur lors du traitement de l\'adresse');
    }
  }

  /**
   * ⚡ MÉTHODE: Paiement en mode express
   */
  private async handleExpressPayment(sessionId: string): Promise<ChatMessage> {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const { subtotal, delivery_fee, total_amount } = session.orderData;

    return {
      type: 'assistant',
      content: `💳 **Paiement - Dernière étape !**

**Récapitulatif final:**
• ${session.orderData.quantity}x ${session.metadata.productInfo.name}
• Sous-total: ${subtotal?.toLocaleString()} FCFA
• Livraison: ${delivery_fee === 0 ? 'GRATUITE ✨' : `${delivery_fee?.toLocaleString()} FCFA`}
• **Total: ${total_amount?.toLocaleString()} FCFA**

📍 **Livraison:** ${session.customerData.address}, ${session.customerData.city}

Choisissez votre mode de paiement:`,
      choices: [
        '📱 Wave (Recommandé)',
        '💳 Carte bancaire',
        '💰 Paiement à la livraison',
        '📞 Autre méthode'
      ],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        sessionId,
        orderSummary: session.orderData
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📋 MÉTHODE: Résumé de commande mode guidé
   */
  private handleOrderSummary(sessionId: string): ChatMessage {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const { quantity, unit_price, subtotal, delivery_fee, total_amount } = session.orderData;
    const { first_name, address, city } = session.customerData;

    return {
      type: 'assistant',
      content: `📋 **Récapitulatif de votre commande**

👤 **Client:** ${first_name}
📦 **Produit:** ${quantity}x ${session.metadata.productInfo.name}
💰 **Prix unitaire:** ${unit_price?.toLocaleString()} FCFA
📍 **Livraison:** ${address}, ${city}

**💸 Détail des coûts:**
• Sous-total: ${subtotal?.toLocaleString()} FCFA
• Livraison: ${delivery_fee === 0 ? 'GRATUITE ✨' : `${delivery_fee?.toLocaleString()} FCFA`}
• **Total final: ${total_amount?.toLocaleString()} FCFA**

Tout est correct ?`,
      choices: [
        '✅ Parfait, continuer',
        '✏️ Modifier quelque chose',
        '❓ J\'ai une question'
      ],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'order_summary' as ConversationStep,
        sessionId,
        orderData: session.orderData
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 💳 MÉTHODE: Traiter le choix de paiement
   */
  async processPaymentChoice(
    sessionId: string,
    paymentMethod: string
  ): Promise<ChatMessage> {
    try {
      const session = this.orderSessions.get(sessionId);
      if (!session) return this.createErrorResponse('Session non trouvée');

      // Déterminer le type de paiement
      let paymentType: PaymentProvider = 'other';
        if (paymentMethod.toLowerCase().includes('wave')) paymentType = 'wave';
        else if (paymentMethod.toLowerCase().includes('carte')) paymentType = 'card';
        else if (paymentMethod.toLowerCase().includes('livraison')) paymentType = 'cash_on_delivery';
        else if (paymentMethod.toLowerCase().includes('orange')) paymentType = 'orange_money';

      session.orderData.payment_method = paymentType as PaymentProvider;
      session.lastUpdated = new Date().toISOString();

      // Créer la commande en base
      const orderId = await this.createOrderInDatabase(session);
      
      if (!orderId) {
        return this.createErrorResponse('Erreur lors de la création de la commande');
      }

      session.orderData.id = orderId;
      session.currentStep = 'order_confirmed';

      // Générer le message de confirmation selon le type de paiement
      return this.generatePaymentInstructions(sessionId, paymentType, orderId);

    } catch (error) {
      console.error('❌ Erreur traitement paiement:', error);
      return this.createErrorResponse('Erreur lors du traitement du paiement');
    }
  }

  /**
   * 💳 MÉTHODE: Générer les instructions de paiement
   */
  private generatePaymentInstructions(
    sessionId: string,
    paymentType: string,
    orderId: string
  ): ChatMessage {
    const session = this.orderSessions.get(sessionId);
    if (!session) return this.createErrorResponse('Session non trouvée');

    const { total_amount } = session.orderData;

    switch (paymentType) {
      case 'wave':
        return {
          type: 'assistant',
          content: `📱 **Paiement Wave - Commande #${orderId.substring(0, 8)}**

✅ **Votre commande est enregistrée !**

💳 **Instructions Wave:**
1️⃣ Ouvrez votre app Wave
2️⃣ Envoyez ${total_amount?.toLocaleString()} FCFA au:
📞 **+221 78 136 27 28**
💬 **Référence:** ${orderId.substring(0, 8)}

⏰ **Important:** Nous recevons la confirmation instantanément

Une fois le paiement effectué, votre commande sera préparée !`,
          choices: [
            '✅ J\'ai payé',
            '❓ Problème de paiement',
            '📞 Contacter le support'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'payment_confirmation' as ConversationStep,
            sessionId,
            orderId,
            paymentMethod: 'wave'
          },
          timestamp: new Date().toISOString()
        };

      case 'card':
        return {
          type: 'assistant',
          content: `💳 **Paiement par carte - Commande #${orderId.substring(0, 8)}**

✅ **Votre commande est enregistrée !**

Vous allez être redirigé(e) vers notre page de paiement sécurisée.

💰 **Montant:** ${total_amount?.toLocaleString()} FCFA
🔒 **Sécurisé par Stripe**
💳 **Cartes acceptées:** Visa, MasterCard

Cliquez pour payer maintenant:`,
          choices: [
            '💳 Payer par carte',
            '📱 Changer pour Wave',
            '📞 Aide au paiement'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'card_payment' as ConversationStep,
            sessionId,
            orderId,
            paymentUrl: `/payment/${orderId}`,
            paymentMethod: 'card'
          },
          timestamp: new Date().toISOString()
        };

      case 'cash_on_delivery':
        return {
          type: 'assistant',
          content: `💰 **Paiement à la livraison - Commande #${orderId.substring(0, 8)}**

✅ **Votre commande est confirmée !**

📦 **Ce qui va se passer:**
1️⃣ Nous préparons votre commande (24-48h)
2️⃣ Notre livreur vous contacte
3️⃣ Vous payez ${total_amount?.toLocaleString()} FCFA à la réception

💡 **Préparez l'appoint si possible**

📱 **Suivi:** Vous recevrez des SMS avec le statut de livraison

Votre commande est maintenant en préparation !`,
          choices: [
            '📦 Suivre ma commande',
            '📱 SMS de confirmation',
            '📞 Nous contacter'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'order_confirmed' as ConversationStep,
            sessionId,
            orderId,
            paymentMethod: 'cash_on_delivery'
          },
          timestamp: new Date().toISOString()
        };

      default:
        return {
          type: 'assistant',
          content: `📞 **Paiement personnalisé - Commande #${orderId.substring(0, 8)}**

✅ **Votre commande est enregistrée !**

Notre équipe va vous contacter dans les 30 minutes pour finaliser le paiement.

📱 **Contact:** +221 78 136 27 28
💰 **Montant:** ${total_amount?.toLocaleString()} FCFA

En attendant, nous préparons déjà votre commande !`,
          choices: [
            '📞 Nous appeler maintenant',
            '📱 WhatsApp direct',
            '⏰ Attendre l\'appel'
          ],
          assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
          metadata: {
            nextStep: 'custom_payment' as ConversationStep,
            sessionId,
            orderId,
            whatsappUrl: `https://wa.me/221781362728?text=Commande%20${orderId.substring(0, 8)}`
          },
          timestamp: new Date().toISOString()
        };
    }
  }

  /**
   * 💾 MÉTHODE: Créer la commande en base de données
   */
  private async createOrderInDatabase(session: OrderSession): Promise<string | null> {
    try {
      // Préparer les données de la commande
      const orderData = {
        customer_phone: session.customerData.phone,
        customer_name: `${session.customerData.first_name} ${session.customerData.last_name}`.trim(),
        product_id: session.orderData.product_id,
        product_name: session.orderData.product_name,
        quantity: session.orderData.quantity,
        unit_price: session.orderData.unit_price,
        subtotal: session.orderData.subtotal,
        delivery_fee: session.orderData.delivery_fee,
        total_amount: session.orderData.total_amount,
        delivery_address: session.orderData.delivery_address,
        delivery_city: session.orderData.delivery_city,
        payment_method: session.orderData.payment_method,
        status: 'pending',
        payment_status: 'pending',
        metadata: {
          source: 'ai_chat',
          sessionId: session.sessionId,
          flow: session.metadata.flow,
          createdAt: new Date().toISOString()
        },
        order_details: JSON.stringify([{
          productId: session.orderData.product_id,
          name: session.orderData.product_name,
          quantity: session.orderData.quantity,
          price: session.orderData.unit_price,
          totalPrice: session.orderData.subtotal
        }])
      };

      // Insérer la commande
      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création commande:', error);
        return null;
      }

      // Sauvegarder ou mettre à jour le client
      await this.saveCustomerData(session.customerData);

      return order.id;

    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      return null;
    }
  }

  /**
   * 👤 MÉTHODE: Sauvegarder les données client
   */
  private async saveCustomerData(customerData: Partial<CustomerData>): Promise<void> {
    try {
      if (!customerData.phone) return;

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerData.phone)
        .single();

      if (existingCustomer) {
        // Mettre à jour client existant
        await supabase
          .from('customers')
          .update({
            first_name: customerData.first_name,
            last_name: customerData.last_name,
            address: customerData.address,
            city: customerData.city,
            country: customerData.country,
            updated_at: new Date().toISOString()
          })
          .eq('phone', customerData.phone);
      } else {
        // Créer nouveau client
        await supabase
          .from('customers')
          .insert({
            ...customerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde client:', error);
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private isValidPhone(phone: string): boolean {
    // Validation pour les numéros sénégalais et africains
    return /^(221)?\d{9}$/.test(phone) || /^\d{8,15}$/.test(phone);
  }

  private parseFullName(fullName: string): { firstName: string; lastName?: string } {
    const parts = fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || undefined
    };
  }

  private parseAddress(address: string): { street: string; city: string; country?: string } {
    const parts = address.split(',').map(part => part.trim());
    
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      country: parts[2] || undefined
    };
  }

  private async findExistingCustomer(phone: string): Promise<CustomerData | null> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      return error ? null : customer;
    } catch (error) {
      return null;
    }
  }

  private async checkDeliveryZone(city: string): Promise<{
    available: boolean;
    fee: number;
    availableZones: string[];
  }> {
    try {
      const { data: zones, error } = await supabase
        .from('delivery_zones')
        .select('*');

      if (error || !zones) {
        return { available: false, fee: 0, availableZones: [] };
      }

      const availableZones = zones.flatMap(zone => zone.cities || []);
      
      const matchingZone = zones.find(zone => 
        zone.cities?.some((zoneCity: string) => 
          city.toLowerCase().includes(zoneCity.toLowerCase()) ||
          zoneCity.toLowerCase().includes(city.toLowerCase())
        )
      );

      return {
        available: !!matchingZone,
        fee: matchingZone?.base_price || 0,
        availableZones
      };

    } catch (error) {
      console.error('❌ Erreur vérification zone:', error);
      return { available: false, fee: 0, availableZones: [] };
    }
  }

  private createErrorResponse(message: string): ChatMessage {
    return {
      type: 'assistant',
      content: `❌ **Erreur**

${message}

📞 **Besoin d'aide ?**
WhatsApp : +221 78 136 27 28`,
      choices: ['🔄 Réessayer', '📞 WhatsApp', '🏠 Retour accueil'],
      assistant: { name: 'Rose', title: 'Conseillère VIENS ON S\'CONNAÎT' },
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        error: 'true'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📊 MÉTHODE: Obtenir les statistiques des commandes
   */
  async getOrderStats(): Promise<{
    activeOrders: number;
    completedToday: number;
    averageOrderValue: number;
    conversionRate: number;
  }> {
    try {
      const activeSessions = this.orderSessions.size;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today.toISOString())
        .eq('status', 'confirmed');

      const { data: allOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'confirmed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const completedToday = todayOrders?.length || 0;
      const averageOrderValue = allOrders && allOrders.length > 0 ? 
        allOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / allOrders.length : 0;

      return {
        activeOrders: activeSessions,
        completedToday,
        averageOrderValue: Math.round(averageOrderValue),
        conversionRate: 15.5 // Exemple - à calculer selon vos métriques
      };

    } catch (error) {
      console.error('❌ Erreur statistiques commandes:', error);
      return {
        activeOrders: 0,
        completedToday: 0,
        averageOrderValue: 0,
        conversionRate: 0
      };
    }
  }

  /**
   * 🧹 MÉTHODE: Nettoyer les sessions expirées
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expirationTime = 2 * 60 * 60 * 1000; // 2 heures

    for (const [sessionId, session] of this.orderSessions.entries()) {
      const sessionAge = now.getTime() - new Date(session.startedAt).getTime();
      
      if (sessionAge > expirationTime) {
        this.orderSessions.delete(sessionId);
        console.log(`🧹 Session commande expirée nettoyée: ${sessionId}`);
      }
    }
  }
}