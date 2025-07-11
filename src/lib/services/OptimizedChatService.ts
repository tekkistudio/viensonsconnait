// src/lib/services/OptimizedChatService.ts - VERSION CORRIGÉE AVEC IA GPT-4o FONCTIONNELLE

import { supabase } from '@/lib/supabase';
import type { 
  ChatMessage, 
  ConversationStep, 
  ChatOrderData,
  PaymentProvider,
  ProductData
} from '@/types/chat';
import { WelcomeMessageService } from './WelcomeMessageService';
import { KnowledgeBaseService } from './KnowledgeBaseService';

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
    additionalProducts?: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    totalAmount?: number;
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
    console.log('🔧 OptimizedChatService v10.0 initialized - IA GPT-4o PRIORITAIRE');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE - PRIORITÉ ABSOLUE IA GPT-4o + UPSELL
public async processMessage(
  sessionId: string,
  message: string,
  currentStep: ConversationStep,
  productId: string,
  productName: string
): Promise<ChatMessage> {
  try {
    console.log('🔍 ProcessMessage called with ENHANCED PRIORITY SYSTEM:', {
      sessionId: sessionId?.substring(0, 20) + '...',
      message: message?.substring(0, 50) + '...',
      currentStep,
      productId,
      productName: `le jeu ${productName}`
    });

    // ✅ VÉRIFICATIONS DE SÉCURITÉ RENFORCÉES
    if (!sessionId || !productId || !productName) {
      throw new Error('Paramètres manquants pour le traitement du message');
    }

    // ✅ Toujours essayer de récupérer l'état depuis la base
    await this.loadOrderStateFromDatabase(sessionId);

    // ✅ PRIORITÉ 1: "Je veux l'acheter maintenant" - ACHAT EXPRESS
    if (this.isExpressPurchaseTrigger(message)) {
      console.log('🛒 Express purchase detected');
      return await this.startExpressPurchase(sessionId, productId, productName);
    }

    // ✅ PRIORITÉ 2: Gestion du bouton "Télécharger l'app mobile"
    if (this.isAppDownloadTrigger(message)) {
      console.log('📱 App download button detected');
      return await this.handleAppDownload();
    }

    // ✅ PRIORITÉ 3: Gestion du retour Wave et demande d'ID transaction
    if (message === 'WAVE_PAYMENT_INITIATED') {
      console.log('🌊 Wave payment return detected');
      return await this.handleWavePaymentReturn(sessionId);
    }

    // ✅ PRIORITÉ 4: Validation d'ID de transaction Wave
    if (this.isWaveTransactionId(message)) {
      console.log('🔑 Wave transaction ID detected');
      return await this.handleWaveTransactionVerification(sessionId, message);
    }

    // ✅ PRIORITÉ 5: Gérer le flow express (étapes scénarisées) 
    if (currentStep.startsWith('express_') || this.orderStates.has(sessionId)) {
      console.log('📦 Express flow step detected');
      return await this.handleExpressFlowInternal(sessionId, message, currentStep, productId, productName);
    }

    // ✅ PRIORITÉ 6: Gérer les boutons du message d'accueil
    if (this.isWelcomeButtonChoice(message)) {
      console.log('🌹 Welcome button choice detected');
      return await this.welcomeService.handleWelcomeButtonResponse(message, productId, productName);
    }

    // ✅ PRIORITÉ 7: Gestion spéciale "Commander un autre jeu" - UPSELL
    if (message.includes('Commander un autre jeu') || message.includes('commander un autre')) {
      console.log('🛍️ Upsell request detected');
      return await this.handleUpsellRequest(productId);
    }

    // ✅ NOUVELLE PRIORITÉ 8: Gestion de l'ajout de produits à la commande - CROSS-SELL
    if (message.includes('Je veux aussi commander') || 
        message.includes('Ajouter') && message.includes('commande') ||
        message.includes('ajouter') && message.includes('commande') ||
        message.includes('Je veux le jeu') ||
        message.includes('commander le jeu')) {
      console.log('➕ Add product to order detected');
      return await this.handleAddProductToOrder(sessionId, message, productId);
    }

    // ✅ PRIORITÉ 9: Gestion des actions post-commande
    if (message.includes('Finaliser la commande') || 
        message.includes('finaliser') ||
        message.includes('Oui, finaliser la commande')) {
      console.log('✅ Order finalization detected');
      return await this.handleOrderFinalization(sessionId);
    }

    // ✅ PRIORITÉ 10: Gestion des modifications de commande
    if (message.includes('Retirer un jeu') || 
        message.includes('retirer') ||
        message.includes('supprimer') ||
        message.includes('enlever')) {
      console.log('🗑️ Product removal detected');
      return await this.handleProductRemoval(sessionId, message);
    }

    // ✅ PRIORITÉ 11: Gestion des questions sur la livraison
    if (message.includes('livraison') || 
        message.includes('détail des livraisons') ||
        message.includes('Voir le détail des livraisons')) {
      console.log('🚚 Delivery inquiry detected');
      return await this.handleDeliveryInquiry(sessionId);
    }

    // ✅ PRIORITÉ 12: TOUS LES AUTRES MESSAGES → IA GPT-4o SYSTÉMATIQUEMENT
    console.log('🤖 FREE TEXT MESSAGE - USING IA GPT-4o SYSTEMATICALLY');
    return await this.handleFreeTextWithAI(message, productId, productName, sessionId);

  } catch (error) {
    console.error('❌ Error in processMessage:', error);
    return this.createErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
  }
}

// ✅ NOUVELLES MÉTHODES SUPPORT POUR LES PRIORITÉS AJOUTÉES

// ✅ MÉTHODE CORRIGÉE : Finaliser avec les données existantes
private async handleOrderFinalization(sessionId: string): Promise<ChatMessage> {
  try {
    const orderState = this.orderStates.get(sessionId);
    if (!orderState) {
      return this.createErrorMessage('Votre session a expiré. Veuillez recommencer.');
    }

    // ✅ VÉRIFIER QUE LES INFOS CLIENT SONT DISPONIBLES
    if (!orderState.data.firstName || !orderState.data.phone || !orderState.data.address) {
      return this.createErrorMessage('Informations de livraison manquantes. Veuillez recommencer votre commande.');
    }

    // ✅ CALCULER LE NOUVEAU TOTAL avec tous les produits
    const mainProductTotal = orderState.data.unitPrice * orderState.data.quantity;
    const additionalProducts = orderState.data.additionalProducts || [];
    const additionalTotal = additionalProducts.reduce((sum, product) => 
      sum + (product.price * product.quantity), 0);
    const grandTotal = mainProductTotal + additionalTotal;

    // ✅ PASSER DIRECTEMENT AU PAIEMENT
    orderState.step = 'payment';
    orderState.data.totalAmount = grandTotal;
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    // ✅ CRÉER LE RÉCAPITULATIF COMPLET
    let orderSummary = `**📋 Récapitulatif de votre commande :**\n\n`;
    orderSummary += `1️⃣ **${orderState.data.productName}** x${orderState.data.quantity}\n`;
    orderSummary += `   └ ${mainProductTotal.toLocaleString()} FCFA\n\n`;

    additionalProducts.forEach((product, index) => {
      orderSummary += `${index + 2}️⃣ **Le jeu ${product.name}** x${product.quantity}\n`;
      orderSummary += `   └ ${(product.price * product.quantity).toLocaleString()} FCFA\n\n`;
    });

    orderSummary += `📍 **Livraison :** ${orderState.data.address}, ${orderState.data.city}\n`;
    orderSummary += `💰 **Total : ${grandTotal.toLocaleString()} FCFA**`;

    return {
      type: 'assistant',
      content: `✅ **Parfait ! Voici votre commande complète**

${orderSummary}

Comment souhaitez-vous payer ?`,
      choices: [
        'Wave (recommandé)',
        'Carte bancaire',
        'Paiement à la livraison'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        orderData: {
          ...orderState.data,
          totalAmount: grandTotal
        },
        paymentAmount: grandTotal,
        flags: {
          multipleProductsOrder: true,
          readyForPayment: true,
          customerInfoComplete: true
        }
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error finalizing order:', error);
    return this.createErrorMessage('Erreur lors de la finalisation de la commande.');
  }
}

// Méthode pour retirer un produit de la commande
private async handleProductRemoval(sessionId: string, message: string): Promise<ChatMessage> {
  try {
    const orderState = this.orderStates.get(sessionId);
    if (!orderState) {
      return this.createErrorMessage('Aucune commande en cours trouvée.');
    }

    // Pour l'instant, proposer de recommencer plutôt que de gérer la suppression complexe
    return {
      type: 'assistant',
      content: `Vous souhaitez modifier votre commande ? 🤔

Pour simplifier, je vous propose de recommencer votre commande avec seulement les jeux que vous souhaitez.

Que préférez-vous ?`,
      choices: [
        'Recommencer ma commande',
        'Finalement, je garde tout',
        'Parler à un humain'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'order_modification' as ConversationStep,
        flags: {
          orderModificationRequested: true
        }
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error handling product removal:', error);
    return this.createErrorMessage('Erreur lors de la modification de la commande.');
  }
}

// Méthode pour les questions sur la livraison
private async handleDeliveryInquiry(sessionId: string): Promise<ChatMessage> {
  try {
    return {
      type: 'assistant',
      content: `🚚 **Informations sur la livraison**

**📍 Zones de livraison :**
✅ **Dakar :** Livraison GRATUITE (24-48h)
✅ **Autres villes du Sénégal :** 2,500 FCFA (48-72h)

**📋 Nos transporteurs :**
- Nos livreurs (Dakar)
- Logidoo (National)
- Logidoo (Autres pays d'Afrique)

**💡 À savoir :**
- Suivi par SMS/WhatsApp
- Paiement à la livraison possible
- Emballage sécurisé gratuit

Avez-vous d'autres questions sur la livraison ?`,
      choices: [
        'Non, c\'est clair',
        'Je veux finaliser ma commande',
        'Changer d\'adresse de livraison'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'delivery_info_shown' as ConversationStep,
        flags: {
          deliveryInfoShown: true
        }
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error handling delivery inquiry:', error);
    return this.createErrorMessage('Erreur lors de la récupération des informations de livraison.');
  }
}

  // ✅ NOUVELLE MÉTHODE: IA GPT-4o avec délais réalistes pour l'animation typing
  private async handleFreeTextWithAI(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<ChatMessage> {
    try {
      console.log('🧠 Processing with IA GPT-4o with REALISTIC TYPING DELAYS:', message.substring(0, 50));

      // ✅ ÉTAPE 1: Calculer un délai réaliste basé sur la longueur du message
      const messageLength = message.length;
      const baseDelay = Math.min(Math.max(messageLength * 50, 1500), 4000); // Entre 1.5s et 4s
      const typingDelay = baseDelay + Math.random() * 1000; // Ajouter variabilité

      console.log(`⏱️ Calculated typing delay: ${typingDelay}ms for message length: ${messageLength}`);

      // ✅ ÉTAPE 2: Simuler le temps de "réflexion" de Rose
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // ✅ ÉTAPE 3: Appel à l'API avec forceAI activé
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          productId: productId,
          productName: productName,
          currentStep: 'ai_response',
          orderData: { session_id: sessionId },
          sessionId: sessionId,
          storeId: 'vosc_default',
          forceAI: true // ✅ FORCE l'utilisation de l'IA SYSTÉMATIQUEMENT
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ IA GPT-4o API response received:', data.success);
        
        if (data.success && data.message) {
          // ✅ ÉTAPE 4: Délai supplémentaire pour la "finalisation" de la réponse
          await new Promise(resolve => setTimeout(resolve, 800));

          return {
            type: 'assistant',
            content: data.message,
            choices: data.choices || [
              'Je veux l\'acheter maintenant',
              'J\'ai d\'autres questions',
              'Comment y jouer ?',
              'Voir les témoignages'
            ],
            assistant: { name: 'Rose', title: 'Assistante d\'achat' },
            metadata: {
              nextStep: 'ai_response' as ConversationStep,
              flags: { 
                aiResponseUsed: true,
                gptModel: 'gpt-4o',
                confidence: 0.9,
                realisticTiming: true,
                typingDelay: typingDelay
              }
            },
            timestamp: new Date().toISOString()
          };
        }
      } else {
        console.error('❌ IA GPT-4o API error:', response.status, response.statusText);
      }

      // ✅ ÉTAPE 5: Fallback vers la base de connaissances si l'IA échoue
      const knowledgeService = KnowledgeBaseService.getInstance();
      const searchResults = await knowledgeService.searchKnowledge(message, productId);
      
      if (searchResults.length > 0 && searchResults[0].relevanceScore > 0.6) {
        const bestMatch = searchResults[0];
        const formattedResponse = knowledgeService.formatResponse(bestMatch, `le jeu ${productName}`);
        
        console.log('✅ Using KB response as IA fallback:', formattedResponse.confidence);
        
        // ✅ Délai pour le fallback aussi
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return {
          type: 'assistant',
          content: formattedResponse.content,
          choices: formattedResponse.suggestions,
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: this.determineNextStepFromCategory(bestMatch.item.category),
            flags: { 
              knowledgeBaseUsed: true,
              confidence: formattedResponse.confidence,
              aiFallback: true,
              realisticTiming: true,
              typingDelay: typingDelay
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ ÉTAPE 6: Fallback intelligent contextuel final
      console.log('🤖 Using intelligent contextual fallback with timing');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return this.createIntelligentFallback(message, `le jeu ${productName}`);

    } catch (error) {
      console.error('❌ Error in IA priority processing:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.createIntelligentFallback(message, `le jeu ${productName}`);
    }
  }

  // ✅ VERSION FINALE CORRIGÉE - Sans erreurs TypeScript
  private async handleUpsellRequest(currentProductId: string): Promise<ChatMessage> {
    try {
      console.log('🛍️ Handling upsell request with REAL DATA for product:', currentProductId);

      // ✅ RÉCUPÉRER LES VRAIES DONNÉES DEPUIS LA BASE
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('id', currentProductId)
        .order('display_order', { ascending: true })
        .limit(3);

      if (error) {
        console.error('❌ Database error:', error);
        return this.createErrorMessage('Impossible de charger les recommandations.');
      }

      if (!products || products.length === 0) {
        // Message quand il n'y a pas de produits
        return {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ✅ FIX: Générer un ID unique
          type: 'assistant',
          content: `📱 **Découvrez tous nos jeux sur l'app mobile !**\n\nPlus de 1000 questions pour renforcer vos liens.`,
          choices: ['📱 Télécharger l\'app', '✅ Finaliser ma commande'],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ FORMATTER LES PRODUITS AVEC LA RÉDUCTION DE 500 FCFA
      const formattedProducts = products.map((product, index) => {
        // Parser les images
        let images = [];
        if (product.images) {
          if (Array.isArray(product.images)) {
            images = product.images;
          } else if (typeof product.images === 'string') {
            try {
              images = JSON.parse(product.images);
            } catch {
              images = [product.images];
            }
          }
        }
        
        if (images.length === 0) {
          images = [`/products/${product.id}/main.jpg`];
        }

        // ✅ RÉDUCTION FIXE DE 500 FCFA
        const DISCOUNT_AMOUNT = 500;
        const discountedPrice = product.price - DISCOUNT_AMOUNT;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          discountedPrice: discountedPrice, // ✅ Prix après réduction
          discountAmount: DISCOUNT_AMOUNT,  // ✅ Montant de la réduction
          images: images,
          description: product.description || '',
          
          // Stats réelles
          stats: {
            sold: product.sales_count || 50,
            satisfaction: product.rating || 4.5,
            reviews: product.reviews_count || 20
          },
          
          // Raison contextuelle
          reason: this.getProductReason(product, index),
          
          // Urgence basée sur le stock
          urgency: product.stock_quantity && product.stock_quantity < 10 ? 'high' as const : 
                  product.stock_quantity && product.stock_quantity < 50 ? 'medium' as const : 
                  'low' as const,
          
          // Pour compatibilité avec ChatProductCard
          discount: Math.round((DISCOUNT_AMOUNT / product.price) * 100),
          sales_count: product.sales_count,
          rating: product.rating,
          reviews_count: product.reviews_count,
          stock_quantity: product.stock_quantity,
          category: product.category,
          tags: product.tags
        };
      });

      // ✅ Calculer les économies totales possibles
      const totalPossibleSavings = formattedProducts.length * 500;

      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ✅ FIX: ID unique
        type: 'assistant',
        content: `🛍️ **Complétez votre collection avec ces jeux populaires !**

  💰 **Offre spéciale** : Économisez 500 FCFA sur chaque jeu supplémentaire !
  ${formattedProducts.length === 3 ? `(Jusqu'à ${totalPossibleSavings.toLocaleString()} FCFA d'économies si vous prenez les 3 !)` : ''}

  *Cliquez sur "Ajouter à la commande" pour bénéficier de la réduction* 🎉`,
        choices: [
          '📱 Voir plutôt l\'app mobile',
          '✅ Non merci, finaliser ma commande'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          recommendedProducts: formattedProducts,
          flags: { 
            showRecommendations: true,
            upsellMode: true,
            discountType: 'fixed',
            discountAmount: 500
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Upsell error:', error);
      return this.createErrorMessage('Une erreur est survenue.');
    }
  }

// ✅ HELPER AMÉLIORÉ: Générer une raison basée sur les vraies données
private getProductReason(product: any, index: number): string {
  // Utiliser les vraies données pour personnaliser
  if (product.tags?.includes('bestseller')) {
    return 'Best-seller de notre collection';
  }
  if (product.sales_count > 100) {
    return `Plus de ${product.sales_count} clients l'ont adoré`;
  }
  if (product.rating >= 4.8) {
    return `Note exceptionnelle de ${product.rating}/5`;
  }
  if (product.category === 'couples') {
    return 'Parfait pour renforcer votre complicité';
  }
  if (product.category === 'famille') {
    return 'Idéal pour des moments en famille';
  }
  if (product.stock_quantity && product.stock_quantity < 20) {
    return `Stock limité - Plus que ${product.stock_quantity} exemplaires`;
  }
  
  // Raisons par défaut basées sur la position
  const defaultReasons = [
    'Parfait complément à votre commande',
    'Très apprécié par nos clients',
    'Pour diversifier vos conversations'
  ];
  
  return defaultReasons[index] || 'Recommandé pour vous';
}

// ✅ NOUVELLE MÉTHODE CORRIGÉE : Ajouter un produit à la commande existante
private async handleAddProductToOrder(
  sessionId: string, 
  message: string, 
  currentProductId: string
): Promise<ChatMessage> {
  try {
    console.log('➕ Adding product to EXISTING order:', { message, currentProductId });
    
    // ✅ ÉTAPE 1: Récupérer la commande existante
    const orderState = this.orderStates.get(sessionId);
    if (!orderState) {
      return this.createErrorMessage('Votre session a expiré. Veuillez recommencer votre commande.');
    }

    // ✅ VÉRIFIER que le client a déjà fourni ses infos
    if (!orderState.data.phone || !orderState.data.firstName || !orderState.data.address) {
      return this.createErrorMessage('Veuillez d\'abord finaliser votre première commande avant d\'ajouter d\'autres produits.');
    }
    
    // ✅ ÉTAPE 2: Extraire le nom du produit du message
    const productNameMatch = message.match(/le jeu (.+?)(?:\s|$)/i);
    const productName = productNameMatch ? productNameMatch[1] : '';
    
    if (!productName) {
      return this.createErrorMessage('Impossible d\'identifier le jeu que vous souhaitez ajouter.');
    }
    
    // ✅ ÉTAPE 3: Rechercher le produit dans la base
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, price, images')
      .ilike('name', `%${productName}%`)
      .eq('status', 'active')
      .single();
    
    if (error || !product) {
      console.error('❌ Product not found:', { productName, error });
      return this.createErrorMessage(`Désolé, je n'ai pas trouvé le jeu "${productName}" dans notre catalogue.`);
    }
    
    // ✅ ÉTAPE 4: Calculer les totaux avec livraison
    const originalItemTotal = orderState.data.unitPrice * orderState.data.quantity;
    const newItemTotal = product.price;
    const subtotal = originalItemTotal + newItemTotal;
    
    // ✅ ÉTAPE 5: Calculer les frais de livraison (gratuit à Dakar, 2500 FCFA ailleurs)
    const isDakar = orderState.data.city?.toLowerCase().includes('dakar');
    const deliveryCost = isDakar ? 0 : 2500;
    const grandTotal = subtotal + deliveryCost;
    
    // ✅ ÉTAPE 6: Mettre à jour la commande avec le nouveau produit
    const updatedOrderState = {
      ...orderState,
      data: {
        ...orderState.data,
        additionalProducts: [
          ...(orderState.data.additionalProducts || []),
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
          }
        ],
        subtotal: subtotal,
        deliveryCost: deliveryCost,
        totalAmount: grandTotal
      },
      step: 'payment' as const, // ✅ Aller directement au paiement
      updatedAt: new Date().toISOString()
    };
    
    this.orderStates.set(sessionId, updatedOrderState);
    await this.saveOrderStateToDatabase(sessionId, updatedOrderState);
    
    console.log('💰 Updated order calculation:', {
      originalItem: `${orderState.data.productName} x${orderState.data.quantity} = ${originalItemTotal}`,
      newItem: `${product.name} x1 = ${product.price}`,
      subtotal,
      deliveryCost,
      grandTotal,
      deliveryAddress: `${orderState.data.address}, ${orderState.data.city}`
    });
    
    // ✅ ÉTAPE 7: Afficher le récapitulatif complet et proposer le paiement
    return {
      type: 'assistant',
      content: `✅ **Le jeu ${product.name} a été ajouté à votre commande !**

**📋 Récapitulatif complet :**

🎯 **Produits commandés :**
1️⃣ ${orderState.data.productName} ×${orderState.data.quantity}
   └ ${originalItemTotal.toLocaleString()} FCFA

2️⃣ Le jeu ${product.name} ×1
   └ ${product.price.toLocaleString()} FCFA

💰 **Sous-total :** ${subtotal.toLocaleString()} FCFA
🚚 **Livraison :** ${deliveryCost === 0 ? 'GRATUITE ✨' : deliveryCost.toLocaleString() + ' FCFA'}
💵 **Total à payer :** ${grandTotal.toLocaleString()} FCFA

📍 **Livraison à :** ${orderState.data.address}, ${orderState.data.city}
👤 **Client :** ${orderState.data.firstName} ${orderState.data.lastName}

Comment souhaitez-vous payer ?`,
      choices: [
        'Wave (recommandé)',
        'Carte bancaire',
        'Paiement à la livraison'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        orderData: updatedOrderState.data,
        paymentAmount: grandTotal,
        flags: {
          multipleProducts: true,
          readyToPayment: true,
          addressAlreadyProvided: true,
          productAdded: true
        }
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error adding product to order:', error);
    return this.createErrorMessage('Une erreur est survenue lors de l\'ajout du produit.');
  }
}

  // ✅ HELPER: Déterminer l'étape suivante depuis la catégorie
  private determineNextStepFromCategory(category: string): ConversationStep {
    const categoryMap: Record<string, ConversationStep> = {
      'produit': 'product_info_shown',
      'prix': 'price_explained', 
      'livraison': 'delivery_info_shown',
      'paiement': 'payment_method',
      'jeu': 'game_rules_shown',
      'regles': 'game_rules_shown',
      'benefices': 'benefits_shown',
      'app': 'app_promotion',
      'testimonials': 'testimonials_shown',
      'couple': 'target_audience_shown',
      'famille': 'target_audience_shown'
    };
    
    return categoryMap[category] || 'knowledge_response';
  }

  // ✅ Fallback intelligent simple
  private createIntelligentFallback(message: string, productName: string): ChatMessage {
    const messageLower = message.toLowerCase();

    // Analyse intelligente du type de question
    let content = '';
    
    if (messageLower.includes('prix') || messageLower.includes('coût') || messageLower.includes('cher')) {
      content = `Le jeu **${productName}** coûte 14,000 FCFA avec livraison gratuite à Dakar ! 💰

C'est un investissement dans la qualité de vos relations.`;
    }
    else if (messageLower.includes('livraison') || messageLower.includes('livrer')) {
      content = `Pour la livraison du jeu **${productName}**, nous livrons partout au Sénégal ! 🚚

✅ **Gratuit à Dakar** (24h)  
✅ **2 500 FCFA** dans les autres villes du Sénégal (48-72h)

Dans quelle ville souhaitez-vous qu'on vous livre ?`;
    }
    else if (messageLower.includes('couple') || messageLower.includes('marié') || messageLower.includes('fiancé')) {
      content = `Excellente question ! Le jeu **${productName}** est parfait pour les couples qui veulent renforcer leur complicité à travers des conversations authentiques. 💕

Depuis combien de temps êtes-vous ensemble ?`;
    }
    else if (messageLower.includes('famille') || messageLower.includes('enfant') || messageLower.includes('parent')) {
      content = `Le jeu **${productName}** est parfait pour renforcer les liens familiaux ! 👨‍👩‍👧‍👦

Il favorise le dialogue entre générations (Parents et Enfants) et crée des moments de complicité authentiques. Les questions sont adaptées pour les enfants de +12 ans.

Combien de personnes êtes-vous dans la famille ?`;
    }
    else if (messageLower.includes('règles') || messageLower.includes('jouer') || messageLower.includes('comment')) {
      content = `C'est très simple ! Le jeu **${productName}** contient 150 cartes de questions à se poser pour créer des conversations profondes et significatives.

Voulez-vous que je vous explique les règles détaillées ?`;
    }
    else {
      // Réponse générique intelligente
      content = `Excellente question sur le jeu **${productName}** ! 

Ce jeu a déjà aidé des milliers de personnes à créer des liens plus forts au Sénégal et en Afrique. Que voulez-vous savoir de plus précis ?`;
    }

    return {
      type: 'assistant',
      content: content,
      choices: [
        'Je veux l\'acheter maintenant',
        'Comment y jouer ?',
        'J\'ai d\'autres questions',
        'Voir les témoignages'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'intelligent_fallback' as ConversationStep,
        flags: { intelligentFallback: true }
      },
      timestamp: new Date().toISOString()
    };
  }
  
  private async loadOrderStateFromDatabase(sessionId: string): Promise<void> {
    try {
      if (this.orderStates.has(sessionId)) {
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
      '⚡ Commander rapidement'
    ];
    
    return triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  // ✅ DÉMARRER L'ACHAT EXPRESS (avec "le jeu")
  public async startExpressPurchase(
    sessionId: string,
    productId: string,
    productName?: string
  ): Promise<ChatMessage> {
    try {
      console.log('🚀 startExpressPurchase called');

      const { data: product, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new Error('Produit non trouvé');
      }

      if (this.orderStates.has(sessionId)) {
        this.orderStates.delete(sessionId);
      }

      const fullProductName = `${productName || product.name}`;

      const orderState: ExpressOrderState = {
        step: 'quantity',
        data: {
          productId,
          productName: fullProductName,
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

      return {
        type: 'assistant' as const,
        content: `🎉 Excellent ! Je vais prendre votre commande.

Combien d'exemplaires souhaitez-vous acheter ?`,
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
      return this.createErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  // ✅ Fonctions utilitaires identiques
  private isSpecialMessage(message: string): boolean {
    const specialTriggers = [
      'je veux l\'acheter',
      'acheter maintenant',
      'commander',
      'télécharger l\'app',
      'wave_payment_initiated',
      'comment y jouer',
      'c\'est pour qui',
      'quels sont les bénéfices',
      'parfait, merci',
      'retour accueil',
      'poser une question'
    ];
    
    return specialTriggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  private isWelcomeButtonChoice(message: string): boolean {
    const welcomeChoices = [
      'j\'ai des questions à poser',
      'je veux en savoir plus',
      'questions à poser',
      'en savoir plus'
    ];
    
    return welcomeChoices.some(choice => 
      message.toLowerCase().includes(choice.toLowerCase())
    );
  }

  private isPredefinedQuestion(message: string): boolean {
    const predefinedQuestions = [
      'comment y jouer',
      'c\'est pour qui',
      'quels sont les bénéfices'
    ];
    
    return predefinedQuestions.some(question => 
      message.toLowerCase().includes(question.toLowerCase())
    );
  }

  private isGenericButton(message: string): boolean {
    const genericButtons = [
      'parfait, merci',
      'retour à l\'accueil',
      'poser une question',
      'contacter le support',
      'réessayer'
    ];
    
    return genericButtons.some(button => 
      message.toLowerCase().includes(button.toLowerCase())
    );
  }

  private isAppDownloadTrigger(message: string): boolean {
    const triggers = [
      'télécharger l\'app mobile',
      'télécharger l\'application',
      'télécharger app',
      'app mobile',
      'application mobile',
      'download app',
      '📱 télécharger'
    ];
    
    return triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  private async handleAppDownload(): Promise<ChatMessage> {
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    const appStoreUrl = 'https://apps.apple.com/app/viensonsconnait/id6464125284';
    
    if (isMobile) {
      if (typeof window !== 'undefined') {
        window.location.href = appStoreUrl;
      }

      return {
        type: 'assistant',
        content: `📱 **Redirection vers l'App Store...**

Je vous redirige vers l'App Store pour télécharger l'application VIENS ON S'CONNAÎT pour iPhone !

**Avec l'app mobile :**
✨ Emportez tous nos jeux dans votre poche
✨ Jouez partout, même sans connexion Internet
✨ Ecoutez vos questions en français
✨ Notre IA vous explique les questions compliquées`,
        choices: [
          '🏠 Retour à l\'accueil',
          '🛍️ Commander un jeu physique'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'app_download_mobile' as ConversationStep,
          flags: { appDownloadTriggered: true }
        },
        timestamp: new Date().toISOString()
      };
    } else {
      if (typeof window !== 'undefined') {
        window.open(appStoreUrl, '_blank');
      }

      return {
        type: 'assistant',
        content: `📱 **App Store ouvert !**

Je viens d'ouvrir l'App Store dans un nouvel onglet ! 

Si vous ne parvenez pas à y accéder, vous pouvez le faire manuellement en cliquant sur le lien ci-dessous :

**Lien :** ${appStoreUrl}`,
        choices: [
          '🏠 Retour à l\'accueil',
          '🛍️ Commander un autre jeu'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'app_download_desktop' as ConversationStep,
          flags: { appDownloadTriggered: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ GESTION DU FLOW EXPRESS
  private async handleExpressFlowInternal(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    try {
      await this.loadOrderStateFromDatabase(sessionId);
      
      let orderState = this.orderStates.get(sessionId);
      
      if (!orderState && currentStep === 'express_quantity') {
        const product = await this.getProductData(productId);
        orderState = {
          step: 'quantity',
          data: {
            productId,
            productName: `le jeu ${productName}`,
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
        return this.createErrorMessage('Session expirée. Veuillez recommencer.');
      }

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
          return this.createErrorMessage('Étape inconnue');
      }

    } catch (error) {
      console.error('❌ Error in express flow:', error);
      return this.createErrorMessage('Erreur dans le processus de commande');
    }
  }

  // ✅ TOUTES LES AUTRES MÉTHODES EXPRESS (identiques)
  
  private async handleQuantityStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    let quantity = 1;

    if (message.includes('1 exemplaire')) quantity = 1;
    else if (message.includes('2 exemplaires')) quantity = 2;
    else if (message.includes('3 exemplaires')) quantity = 3;
    else {
      const numMatch = message.match(/(\d+)/);
      if (numMatch) {
        quantity = parseInt(numMatch[1]);
        if (quantity < 1 || quantity > 10) {
          return this.createErrorMessage('Choisissez une quantité entre 1 et 10 svp.');
        }
      }
    }

    orderState.data.quantity = quantity;
    orderState.step = 'phone';
    orderState.updatedAt = new Date().toISOString();
    
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    const totalAmount = orderState.data.unitPrice * quantity;

    return {
      type: 'assistant',
      content: `C'est noté 📝
      
      Cela fera **${totalAmount.toLocaleString()} FCFA**

Sur quel numéro doit-on vous joindre pour la livraison ?

Ex : *+221 77 123 45 67*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_phone' as ConversationStep,
        orderData: {
          quantity: quantity,
          totalAmount: totalAmount
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handlePhoneStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    const cleanPhone = message.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      return this.createErrorMessage('Ce numéro est trop court. Utilisez le format : +221 77 123 45 67');
    }

    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+221' + formattedPhone;
    }
    
    orderState.data.phone = formattedPhone;
    orderState.updatedAt = new Date().toISOString();

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('first_name, last_name, city, address')
      .eq('phone', formattedPhone)
      .maybeSingle();

    if (existingCustomer) {
      orderState.data.firstName = existingCustomer.first_name;
      orderState.data.lastName = existingCustomer.last_name;
      orderState.data.city = existingCustomer.city;
      orderState.data.address = existingCustomer.address;
      orderState.flags.isExistingCustomer = true;
      orderState.step = 'address';
      
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `👋 Heureuse de vous revoir, **${existingCustomer.first_name} !**

Doit-on vous livrer à la même adresse :** ${existingCustomer.address}, ${existingCustomer.city}**, ou souhaitez-vous changer d'adresse ?`,
        choices: [
          'Oui, même adresse',
          'Changer d\'adresse'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_address_confirmation' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    } else {
      orderState.step = 'name';
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `Je vois que c'est votre première fois ici ! Bienvenue 🎉 

Votre numéro de telephone **${formattedPhone}** a bien été enregistré ✅

Quel est votre nom complet ?

Ex : *Aminata Diallo*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_name' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handleNameStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    const name = message.trim();
    const parts = name.split(/\s+/);
    
    if (parts.length < 2) {
      return this.createErrorMessage('Ecrivez votre nom complet, SVP. Exemple : Aminata Diallo');
    }

    orderState.data.firstName = parts[0];
    orderState.data.lastName = parts.slice(1).join(' ');
    orderState.step = 'address';
    orderState.updatedAt = new Date().toISOString();
    
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    return {
      type: 'assistant',
      content: `Enchantée, **${orderState.data.firstName}** 😊

A quelle adresse doit-on vous livrer ?

Format : *Quartier/Rue, Ville*
Ex : *Mermoz, Dakar*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_address' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleAddressStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
  // Import du service de validation des zones
  const { DeliveryZoneService } = await import('./DeliveryZoneService');
  const deliveryService = DeliveryZoneService.getInstance();
  
  if (message.toLowerCase().includes('oui') && orderState.flags.isExistingCustomer) {
    // ✅ NOUVEAU: Valider la ville existante
    if (orderState.data.city) {
      const validation = await deliveryService.validateCity(
        orderState.data.city, 
        orderState.data.unitPrice * orderState.data.quantity
      );
      
      if (!validation.isDeliverable) {
        return {
          type: 'assistant',
          content: `${validation.message}

Mais j'ai une excellente alternative pour vous.

Vous pouvez télécharger notre app mobile 📱 VIENS ON S'CONNAÎT et accéder à tous nos jeux depuis votre smartphone, où que vous soyez !

**Avantages de l'app :**

✨ Tous nos jeux disponibles instantanément
✨ Aucune livraison nécessaire
✨ Fonctionne même hors connexion
✨ IA intégrée pour expliquer les questions compliquées

Que préférez-vous ?`,
          choices: [
            '📱 Télécharger l\'app mobile',
            '📍 Changer d\'adresse de livraison',
            '💬 Contacter le support'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'delivery_unavailable' as ConversationStep,
            flags: { 
              deliveryUnavailable: true, 
              suggestMobileApp: true 
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Ville validée, continuer avec les frais
      const deliveryCost = validation.deliveryCost;
      const totalAmount = (orderState.data.unitPrice * orderState.data.quantity) + deliveryCost;
      
      orderState.step = 'payment';
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `C'est noté ✅

Nous vous livrerons à :** ${orderState.data.address}, ${orderState.data.city}**

${validation.message}

**Voici le récapitulatif :**

- Commande : **${orderState.data.productName}** x${orderState.data.quantity}
- Sous-total : **${(orderState.data.unitPrice * orderState.data.quantity).toLocaleString()} FCFA**
${deliveryCost > 0 ? `• Coût de la livraison : **${deliveryCost.toLocaleString()} FCFA**` : '• Livraison : **GRATUITE** 🎉'}
- Total : **${totalAmount.toLocaleString()} FCFA**

Par quel moyen souhaitez-vous payer ?`,
        choices: [
          'Wave (recommandé)',
          'Carte bancaire', 
          'Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep,
          paymentAmount: totalAmount,
          orderData: {
            ...orderState.data,
            deliveryCost,
            totalAmount
          }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ Nouvelle adresse saisie
  if (message.trim().length > 5) {
    const addressParts = message.split(',').map(part => part.trim());
    
    if (addressParts.length >= 2) {
      orderState.data.address = addressParts[0];
      orderState.data.city = addressParts[1];
    } else {
      orderState.data.address = message.trim();
      orderState.data.city = 'Dakar'; // Défaut
    }

    // ✅ NOUVEAU: Valider la nouvelle ville
    const validation = await deliveryService.validateCity(
      orderState.data.city, 
      orderState.data.unitPrice * orderState.data.quantity
    );
    
    if (!validation.isDeliverable) {
      return {
        type: 'assistant',
        content: `😔 **${validation.message}**

Mais ne vous inquiétez pas ! J'ai la solution parfaite 🎉

📱 **Téléchargez notre app mobile VIENS ON S'CONNAÎT** pour accéder à tous nos jeux depuis votre smartphone !

**Pourquoi l'app mobile ?**
✨ Accès instantané à tous nos jeux
✨ Aucune contrainte de livraison
✨ Fonctionne partout, même hors connexion
✨ Prix plus avantageux

Ou essayez une autre adresse de livraison si vous préférez.`,
        choices: [
          '📱 Télécharger l\'app mobile',
          '📍 Essayer une autre adresse',
          '💬 Parler à un humain'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'delivery_unavailable' as ConversationStep,
          flags: { 
            deliveryUnavailable: true, 
            suggestMobileApp: true,
            cityNotCovered: orderState.data.city
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Ville validée, calculer les frais
    const deliveryCost = validation.deliveryCost;
    const totalAmount = (orderState.data.unitPrice * orderState.data.quantity) + deliveryCost;
    
    orderState.step = 'payment';
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    return {
      type: 'assistant',
      content: `Votre adresse a été enregistrée ✅

Nous vous livrerons à : **${orderState.data.address}, ${orderState.data.city}**

${validation.message}

**Voici le récapitulatif :**

- Commande : **${orderState.data.productName}** x${orderState.data.quantity} 
- Sous-total : **${(orderState.data.unitPrice * orderState.data.quantity).toLocaleString()} FCFA**
${deliveryCost > 0 ? `- Coût de la livraison : **${deliveryCost.toLocaleString()} FCFA**` : '- Livraison : **GRATUITE** 🎉'}
- Total : **${totalAmount.toLocaleString()} FCFA**

Par quel moyen souhaitez-vous payer ?`,
      choices: [
        'Wave (recommandé)',
        'Carte bancaire', 
        'Paiement à la livraison'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_payment' as ConversationStep,
        paymentAmount: totalAmount,
        orderData: {
          ...orderState.data,
          deliveryCost,
          totalAmount
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  return this.createErrorMessage('Format d\'adresse invalide. Utilisez : Quartier, Ville');
}

  private async handlePaymentStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    let paymentMethod: PaymentProvider;

    if (message.toLowerCase().includes('wave')) {
      paymentMethod = 'wave';
    } else if (message.toLowerCase().includes('carte')) {
      paymentMethod = 'card';
    } else if (message.toLowerCase().includes('livraison') || message.toLowerCase().includes('paiement à la livraison')) {
      paymentMethod = 'cash_on_delivery';
    } else {
      return this.createErrorMessage('Veuillez choisir un mode de paiement valide');
    }

    orderState.data.paymentMethod = paymentMethod;
    orderState.step = 'confirmation';
    orderState.updatedAt = new Date().toISOString();
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    const orderResult = await this.createOrder(sessionId, orderState);
    
    if (!orderResult.success) {
      return this.createErrorMessage(orderResult.error || 'Une erreur est survenue lors de la création de votre commande');
    }

    // ✅ CORRECTION : Gestion spécifique pour cash_on_delivery
    if (paymentMethod === 'cash_on_delivery') {
      return {
        type: 'assistant',
        content: `🎉 **Votre commande est confirmée !**

✅ **Numéro de commande :** #${orderResult.orderId}
📦 **Mode de paiement :** Paiement à la livraison
💰 **Montant à préparer :** ${(orderState.data.unitPrice * orderState.data.quantity).toLocaleString()} FCFA

**📍 Adresse de livraison :**
${orderState.data.address}, ${orderState.data.city}

**⏰ Délai de livraison :**
- Dakar : 24-48h
- Autres villes : 48-72h

**💡 Important :** Préparez le montant exact en espèces pour le livreur.

Nous vous contacterons bientôt pour confirmer votre commande.`,
        choices: [
          '⭐ Parfait, merci !',
          '🛍️ Commander un autre jeu',
          '📱 Télécharger l\'app mobile'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_completed' as ConversationStep,
          orderData: {
            orderId: orderResult.orderId,
            paymentMethod: paymentMethod,
            status: 'confirmed'
          },
          flags: { 
            orderCompleted: true,
            cashOnDelivery: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Pour Wave et Stripe, garder la logique existante
    let paymentInstructions = '';
    if (paymentMethod === 'wave') {
      paymentInstructions = `**Wave** : Cliquez sur le bouton Wave ci-dessous`;
    } else if (paymentMethod === 'card') {
      paymentInstructions = `**Carte bancaire** : Redirection vers paiement sécurisé`;
    }

    return {
      type: 'assistant',
      content: `✅ **Votre commande a été créée avec succès !**

📝 **Numéro de commande :** #${orderResult.orderId}
💰 **Montant :** ${(orderState.data.unitPrice * orderState.data.quantity).toLocaleString()} FCFA

${paymentInstructions}

Une fois le paiement effectué, revenez ici pour le confirmer.`,
      choices: paymentMethod === 'wave' ? ['Payer avec Wave'] : 
               paymentMethod === 'card' ? ['Payer par carte'] : 
               ['⭐ Parfait, merci !'],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_completed' as ConversationStep,
        orderData: {
          orderId: orderResult.orderId,
          paymentMethod: paymentMethod
        },
        paymentAmount: orderState.data.unitPrice * orderState.data.quantity,
        flags: { 
          orderCompleted: true,
          [paymentMethod === 'wave' ? 'wavePayment' : 
           paymentMethod === 'card' ? 'stripePayment' : 'cashPayment']: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleConfirmationStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    this.orderStates.delete(sessionId);
    
    if (message.includes('Commander un autre jeu')) {
      return await this.handleUpsellRequest(orderState.data.productId);
    }

    if (message.includes('Télécharger l\'app')) {
      return await this.handleAppDownload();
    }

    return {
      type: 'assistant',
      content: `✅ **Merci pour votre confiance !**

Votre commande du jeu **${orderState.data.productName}** sera livrée rapidement.

À très bientôt !`,
      choices: [
        '🛍️ Commander un autre jeu',
        '📱 Télécharger l\'app mobile',
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'post_purchase' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES UTILITAIRES
  
  private async createOrder(sessionId: string, orderState: ExpressOrderState): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const timestamp = Date.now();
      const numericOrderId = parseInt(`${timestamp}${Math.floor(Math.random() * 1000)}`);
      
      const orderData = {
        id: numericOrderId,
        session_id: sessionId,
        product_id: orderState.data.productId,
        first_name: orderState.data.firstName || 'Client',
        last_name: orderState.data.lastName || '',
        phone: orderState.data.phone || '',
        city: orderState.data.city || '',
        address: orderState.data.address || '',
        payment_method: orderState.data.paymentMethod || 'cash_on_delivery',
        status: 'pending',
        payment_status: 'pending',
        total_amount: Number(orderState.data.unitPrice * orderState.data.quantity),
        delivery_cost: 0,
        order_details: JSON.stringify([{
          product_id: orderState.data.productId,
          product_name: orderState.data.productName,
          quantity: Number(orderState.data.quantity),
          unit_price: Number(orderState.data.unitPrice),
          total_price: Number(orderState.data.unitPrice * orderState.data.quantity)
        }]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, orderId: numericOrderId.toString() };

    } catch (error) {
      console.error('❌ Error creating order:', error);
      return { success: false, error: 'Erreur création commande' };
    }
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
      return { price: 14000 };
    }
  }

  private isWaveTransactionId(message: string): boolean {
    const cleanMessage = message.trim().toUpperCase();
    const waveIdPattern = /^T[A-Z0-9]{8,20}$/;
    return waveIdPattern.test(cleanMessage);
  }

  private async handleWavePaymentReturn(sessionId: string): Promise<ChatMessage> {
    return {
      type: 'assistant',
      content: `Veuille confirmer votre paiement Wave pour finaliser votre commande.

Copiez et collez ici l'**ID de Transaction Wave** pour confirmer votre paiement.

💡 **Comment le trouver :**
1. Ouvrez votre application Wave
2. Cliquez sur la transaction effectuée 
3. Copiez l'ID de Transaction (commence par 'T')

*Exemple : TJJ4D7OR04EPQAR4FD*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'wave_transaction_verification' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleWaveTransactionVerification(sessionId: string, transactionId: string): Promise<ChatMessage> {
  const cleanTransactionId = transactionId.trim().toUpperCase();
  
  try {
    // Import du service de validation renforcé
    const { WaveValidationService } = await import('@/lib/services/WaveValidationService');
    const waveService = WaveValidationService.getInstance();
    
    // Obtenir les détails de la commande pour validation
    const orderState = this.orderStates.get(sessionId);
    const expectedAmount = orderState ? (orderState.data.unitPrice * orderState.data.quantity) : 14000;
    const customerPhone = orderState?.data.phone || '';
    const orderId = sessionId;
    
    // Validation renforcée
    const validation = await waveService.validateWaveTransaction(
      cleanTransactionId,
      expectedAmount,
      customerPhone,
      orderId
    );
    
    if (!validation.isValid) {
      return {
        type: 'assistant',
        content: `❌ Il semble y avoir un problème avec votre ID de transaction**

${validation.warnings.join('\n')}

**Que faire ?**
- Vérifiez l'ID dans votre app Wave
- Copiez-collez l'ID complet
- Ou contactez notre support

**Format attendu :** TJJ4D7OR04EPQAR4FD`,
        choices: [
          '🔄 Réessayer',
          '📞 Contacter le support',
          '💳 Payer par carte à la place'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'wave_transaction_verification' as ConversationStep,
          flags: { 
            waveValidationFailed: true,
            validationWarnings: validation.warnings.join('; ')
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Validation réussie mais avec différents niveaux de confiance
    let confirmationMessage = '';
    let nextActions: string[] = [];

    if (validation.confidence === 'high') {
      confirmationMessage = `🎉 **Votre Paiement Wave est confirmé** ✅

Votre ID de Transaction :** ${cleanTransactionId}** 

Votre commande est confirmée et sera traitée rapidement !`;
      nextActions = ['⭐ Parfait, merci !', '🛍️ Commander un autre jeu'];
      
    } else if (validation.confidence === 'medium') {
      confirmationMessage = `**Votre Paiement Wave est enregistré** ✅ 

🔍 Votre ID de Transaction :** ${cleanTransactionId}**
⚠️ Votre paiement est en cours de vérification par nos équipes.

Votre commande est prise en compte. Dès que votre paiement sera confirmé, nous procéderons à la livraison de votre commande.`;
      nextActions = ['⭐ Parfait, merci !', '🛍️ Commander un autre jeu'];
      
    } else {
      confirmationMessage = `⏳ **Transaction Wave reçue**

📝 ID Transaction :** ${cleanTransactionId}**
🔍 Nous allons procéder à la vérification de votre paiement.

Dès que le paiement sera confirmé, vous recevrez un SMS ou message WhatsApp, puis nous procéderons à la livraison de votre commande.`;
      nextActions = ['⭐ Parfait, merci !', '📞 Contacter le support'];
    }

    // Enregistrer dans la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: validation.confidence === 'high' ? 'completed' : 'pending_verification',
        status: validation.confidence === 'high' ? 'confirmed' : 'pending_verification',
        metadata: {
          waveTransactionId: cleanTransactionId,
          validationConfidence: validation.confidence,
          validationWarnings: validation.warnings,
          manualReviewRequired: validation.shouldManualReview
        },
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    return {
      type: 'assistant',
      content: confirmationMessage,
      choices: nextActions,
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_completed' as ConversationStep,
        flags: { 
          waveTransactionProcessed: true,
          validationConfidence: validation.confidence,
          manualReviewRequired: validation.shouldManualReview
        }
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Wave validation error:', error);
    return this.createErrorMessage('Erreur de validation du paiement Wave');
  }
}

  private createErrorMessage(errorText: string): ChatMessage {
    return {
      type: 'assistant',
      content: `😔 **${errorText}**

Voulez-vous réessayer ?`,
      choices: ['🔄 Réessayer', '📞 Support'],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'error_recovery' as ConversationStep,
        flags: { hasError: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ MÉTHODES PUBLIQUES pour compatibilité
  
  public async handleExpressFlow(sessionId: string, message: string, currentStep: ConversationStep | string): Promise<ChatMessage> {
    await this.loadOrderStateFromDatabase(sessionId);
    
    const orderState = this.orderStates.get(sessionId);
    
    if (!orderState) {
      return this.createErrorMessage('Session expirée. Veuillez recommencer svp.');
    }

    return await this.handleExpressFlowInternal(
      sessionId, 
      message, 
      currentStep as ConversationStep, 
      orderState.data.productId, 
      orderState.data.productName
    );
  }

  public async handleExpressStep(sessionId: string, input: string, currentStep: string): Promise<ChatMessage> {
    return this.handleExpressFlow(sessionId, input, currentStep);
  }
}