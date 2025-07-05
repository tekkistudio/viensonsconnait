// src/lib/services/OptimizedChatService.ts - VERSION ENTIÈREMENT CORRIGÉE POUR L'IA

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
    console.log('🔧 OptimizedChatService v9.0 initialized - FULLY CORRECTED WITH PRIORITY AI');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE - PRIORITÉ IA GPT-4o
  public async processMessage(
    sessionId: string,
    message: string,
    currentStep: ConversationStep,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    try {
      console.log('🔍 ProcessMessage called with AI PRIORITY:', {
        sessionId: sessionId?.substring(0, 20) + '...',
        message: message?.substring(0, 50) + '...',
        currentStep,
        productId,
        productName: `le jeu ${productName}`
      });

      // Vérifications de sécurité
      if (!sessionId || !productId || !productName) {
        throw new Error('Paramètres manquants');
      }

      // ✅ Toujours essayer de récupérer l'état depuis la base
      await this.loadOrderStateFromDatabase(sessionId);

      // ✅ PRIORITÉ 1: "Je veux l'acheter maintenant"
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

      // ✅ PRIORITÉ 7: Gestion spéciale "Commander un autre jeu"
      if (message.includes('Commander un autre jeu') || message.includes('commander un autre')) {
        console.log('🛍️ Upsell request detected');
        return await this.handleUpsellRequest(productId);
      }

      // ✅ NOUVELLE PRIORITÉ 8: MESSAGES LIBRES → IA GPT-4o EN PRIORITÉ
      if (!this.isSpecialMessage(message)) {
        console.log('🤖 FREE TEXT MESSAGE - USING AI PRIORITY');
        return await this.handleFreeTextWithAIPriority(message, productId, productName, sessionId);
      }

      // ✅ PRIORITÉ 9: Gérer les questions prédéfinies
      if (this.isPredefinedQuestion(message)) {
        console.log('📋 Predefined question detected');
        return await this.handlePredefinedQuestion(message, productId, productName);
      }

      // ✅ PRIORITÉ 10: Gestion des boutons "génériques"
      if (this.isGenericButton(message)) {
        console.log('🔘 Generic button detected');
        return await this.handleGenericButton(message, productId, productName);
      }

      // ✅ FALLBACK: Messages libres → IA
      console.log('🤖 Fallback: Processing with AI');
      return await this.handleFreeTextWithAIPriority(message, productId, productName, sessionId);

    } catch (error) {
      console.error('❌ Error in processMessage:', error);
      return this.createErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE PRIORITÉ IA - GPT-4o EN PREMIER
  private async handleFreeTextWithAIPriority(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<ChatMessage> {
    try {
      console.log('🧠 Processing with AI PRIORITY:', message.substring(0, 50));

      // ✅ ÉTAPE 1: Essayer d'abord l'IA GPT-4o
      try {
        const aiResponse = await this.getGPT4oResponse(message, productId, productName, sessionId);
        
        if (aiResponse && aiResponse.trim()) {
          console.log('✅ GPT-4o response successful');
          
          return {
            type: 'assistant',
            content: aiResponse,
            choices: [
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
                confidence: 0.9
              }
            },
            timestamp: new Date().toISOString()
          };
        }
      } catch (aiError) {
        console.warn('⚠️ GPT-4o failed, trying knowledge base:', aiError);
      }

      // ✅ ÉTAPE 2: Fallback vers la base de connaissances (seuil abaissé)
      const knowledgeService = KnowledgeBaseService.getInstance();
      const searchResults = await knowledgeService.searchKnowledge(message, productId);
      
      if (searchResults.length > 0 && searchResults[0].relevanceScore > 0.6) {
        const bestMatch = searchResults[0];
        const formattedResponse = knowledgeService.formatResponse(bestMatch, `le jeu ${productName}`);
        
        console.log('✅ Using KB response as fallback:', formattedResponse.confidence);
        
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
              aiFallback: true
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ ÉTAPE 3: Fallback intelligent contextuel
      console.log('🤖 Using intelligent contextual fallback');
      return this.createIntelligentFallback(message, `le jeu ${productName}`);

    } catch (error) {
      console.error('❌ Error in AI priority processing:', error);
      return this.createIntelligentFallback(message, `le jeu ${productName}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Réponse GPT-4o directe et optimisée
  private async getGPT4oResponse(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<string> {
    try {
      console.log('🚀 Calling GPT-4o via API route with forceAI');

      // ✅ Appel API avec forceAI activé
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
          forceAI: true // ✅ FORCE l'utilisation de l'IA
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ GPT-4o API response received:', data.success);
        
        if (data.success && data.message) {
          return data.message;
        }
      } else {
        console.error('❌ GPT-4o API error:', response.status, response.statusText);
      }

      // Si l'API échoue, utiliser le fallback intelligent
      throw new Error('API call failed');

    } catch (error) {
      console.error('❌ GPT-4o API call error:', error);
      throw error;
    }
  }

  // ✅ AMÉLIORATION: Upsell avec vraies données Supabase
  private async handleUpsellRequest(currentProductId: string): Promise<ChatMessage> {
    try {
      console.log('🛍️ Handling upsell request with REAL DATA for product:', currentProductId);

      // ✅ RÉCUPÉRER LES VRAIES DONNÉES depuis Supabase
      const { data: relatedProducts, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          images, 
          description,
          stats,
          rating
        `)
        .eq('status', 'active')
        .neq('id', currentProductId)
        .limit(3);

      if (error || !relatedProducts || relatedProducts.length === 0) {
        return {
          type: 'assistant',
          content: `🛍️ **Nos autres jeux seront bientôt disponibles !**

En attendant, téléchargez notre app mobile pour découvrir tous nos jeux :`,
          choices: [
            '📱 Télécharger l\'app mobile',
            '✅ Merci, c\'est tout'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'app_recommendation' as ConversationStep
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ RÉCUPÉRER LES VRAIES STATISTIQUES pour chaque produit
      const formattedProducts = await Promise.all(
        relatedProducts.map(async (product) => {
          // Récupérer le nombre réel d'avis/témoignages
          const { data: testimonials } = await supabase
            .from('testimonials')
            .select('rating')
            .eq('product_id', product.id);

          const reviewsCount = testimonials?.length || 0;
          const averageRating = testimonials && testimonials.length > 0 
            ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
            : (product.rating || 5);

          // Récupérer les vraies ventes
          const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .eq('product_id', product.id)
            .eq('status', 'confirmed');

          const salesCount = orders?.length || 0;

          return {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images || [],
            reason: `Complément parfait au jeu ${currentProductId}`,
            urgency: 'medium' as const,
            stats: {
              sold: salesCount,
              satisfaction: Math.round(averageRating * 10) / 10,
              reviews: reviewsCount
            }
          };
        })
      );

      return {
        type: 'assistant',
        content: `🛍️ **Nos autres jeux populaires :**

Nos clients qui achètent ce jeu prennent souvent aussi :`,
        choices: [], // Pas de choices car on utilise les cartes produits
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'upsell_display' as ConversationStep,
          recommendedProducts: formattedProducts,
          flags: { 
            showRecommendations: true,
            upsellMode: true,
            realDataUsed: true
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling upsell request:', error);
      return this.createErrorMessage('Impossible de charger les autres jeux.');
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
✅ **2,500 FCFA** dans les autres villes (48-72h)

Dans quelle ville souhaitez-vous qu'on vous livre ?`;
    }
    else if (messageLower.includes('couple') || messageLower.includes('marié') || messageLower.includes('fiancé')) {
      content = `Excellente question ! Le jeu **${productName}** est parfait pour les couples qui veulent renforcer leur complicité à travers des conversations authentiques. 💕

Depuis combien de temps êtes-vous ensemble ?`;
    }
    else if (messageLower.includes('famille') || messageLower.includes('enfant') || messageLower.includes('parent')) {
      content = `Le jeu **${productName}** est parfait pour renforcer les liens familiaux ! 👨‍👩‍👧‍👦

Il favorise le dialogue entre générations et crée des moments de complicité authentiques. Les questions sont adaptées pour les enfants de +12 ans.

Combien de personnes êtes-vous dans la famille ?`;
    }
    else if (messageLower.includes('règles') || messageLower.includes('jouer') || messageLower.includes('comment')) {
      content = `C'est très simple ! Le jeu **${productName}** contient 150 cartes de questions à se poser pour créer des conversations profondes et amusantes. 🎮

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

  // ✅ TOUTES LES AUTRES MÉTHODES (restent identiques mais avec "le jeu" ajouté)
  
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

      const fullProductName = `le jeu ${productName || product.name}`;

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
        content: `🎉 Super choix ! Je vais prendre votre commande pour le jeu ${fullProductName} 

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
      'parfait merci',
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

Vous êtes redirigé vers l'App Store pour télécharger VIENS ON S'CONNAÎT !

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

✨ **Avec l'app mobile :**
🎮 Tous nos jeux dans votre poche
💕 Couple, famille, amis, collègues
📱 Disponible partout

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

  // ✅ GESTION DU FLOW EXPRESS avec "le jeu"
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

  // ✅ TOUTES LES AUTRES MÉTHODES EXPRESS (identiques mais avec "le jeu")
  
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
          return this.createErrorMessage('Quantité entre 1 et 10 seulement.');
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
      content: `✅ C'est noté ! Vous commandez **${quantity} exemplaire${quantity > 1 ? 's' : ''}**
      
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
      return this.createErrorMessage('Numéro trop court. Format : +221 77 123 45 67');
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
        content: `📱 **${formattedPhone} enregistré**

Ah! C'est votre première fois ici ! Bienvenue 🎉 

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
      return this.createErrorMessage('Nom complet SVP. Exemple : Aminata Diallo');
    }

    orderState.data.firstName = parts[0];
    orderState.data.lastName = parts.slice(1).join(' ');
    orderState.step = 'address';
    orderState.updatedAt = new Date().toISOString();
    
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    return {
      type: 'assistant',
      content: `Enchantée, **${orderState.data.firstName} !**

A quelle adresse doit-on vous livrer ?

*Format : Quartier/Rue, Ville*
*Ex : Mermoz, Dakar*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_address' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleAddressStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    if (message.toLowerCase().includes('oui') && orderState.flags.isExistingCustomer) {
      orderState.step = 'payment';
      orderState.updatedAt = new Date().toISOString();
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant',
        content: `✅ C'est parfait !

Nous vous livrerons à **${orderState.data.address}, ${orderState.data.city}**

Dernière étape : comment souhaitez-vous payer ?`,
        choices: [
          '📱 Wave (recommandé)',
          '💳 Carte bancaire', 
          '💵 Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    if (message.trim().length > 5) {
      const addressParts = message.split(',').map(part => part.trim());
      
      if (addressParts.length >= 2) {
        orderState.data.address = addressParts[0];
        orderState.data.city = addressParts[1];
      } else {
        orderState.data.address = message.trim();
        orderState.data.city = 'Dakar';
      }

      orderState.step = 'payment';
      orderState.updatedAt = new Date().toISOString();
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ C'est parfait !

Nous vous livrerons à **${orderState.data.address}, ${orderState.data.city}**

Dernière étape : comment souhaitez-vous payer ?`,
        choices: [
          '📱 Wave (recommandé)',
          '💳 Carte bancaire', 
          '💵 Paiement à la livraison'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_payment' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    return this.createErrorMessage('Adresse trop courte. Format : Quartier, Ville');
  }

  private async handlePaymentStep(sessionId: string, message: string, orderState: ExpressOrderState): Promise<ChatMessage> {
    let paymentMethod: PaymentProvider;

    if (message.toLowerCase().includes('wave')) {
      paymentMethod = 'wave';
    } else if (message.toLowerCase().includes('carte')) {
      paymentMethod = 'card';
    } else if (message.toLowerCase().includes('livraison')) {
      paymentMethod = 'cash_on_delivery';
    } else {
      return this.createErrorMessage('Choisissez un mode de paiement valide');
    }

    orderState.data.paymentMethod = paymentMethod;
    orderState.step = 'confirmation';
    orderState.updatedAt = new Date().toISOString();
    this.orderStates.set(sessionId, orderState);
    await this.saveOrderStateToDatabase(sessionId, orderState);

    const orderResult = await this.createOrder(sessionId, orderState);
    
    if (!orderResult.success) {
      return this.createErrorMessage(orderResult.error || 'Erreur création commande');
    }

    let paymentInstructions = '';
    if (paymentMethod === 'wave') {
      paymentInstructions = `📱 **Wave** : Cliquez sur le bouton Wave ci-dessous`;
    } else if (paymentMethod === 'card') {
      paymentInstructions = `💳 **Carte bancaire** : Redirection vers paiement sécurisé`;
    } else {
      paymentInstructions = `💵 **À la livraison** : Préparez le montant exact`;
    }

    return {
      type: 'assistant',
      content: `🎉 **Votre commande est confirmée !**

**N° :** #${orderResult.orderId}

${paymentInstructions}

**Livraison :**
📍 ${orderState.data.address}, ${orderState.data.city}
⏰ 24-48h ouvrables

Merci pour votre confiance ! ✨`,
      choices: paymentMethod === 'wave' ? ['🌊 Payer avec Wave'] : 
               paymentMethod === 'card' ? ['💳 Payer par carte'] : 
               ['⭐ Parfait, merci !', '🛍️ Commander un autre jeu'],
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

Votre **${orderState.data.productName}** sera livré rapidement.

À très bientôt ! 💕`,
      choices: [
        '🛍️ Commander un autre jeu',
        '📱 Télécharger l\'app mobile',
        '⭐ Merci Rose !'
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
      content: `✅ **Retour du paiement Wave**

Donnez-moi votre **ID de Transaction Wave** pour confirmer le paiement.

💡 **Comment le trouver :**
1. Ouvrez Wave
2. Historique des transactions  
3. Copiez l'ID (commence par 'T')

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
    
    if (!this.isWaveTransactionId(cleanTransactionId)) {
      return this.createErrorMessage('ID Wave invalide. Format : TJJ4D7OR04EPQAR4FD');
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) {
        return this.createErrorMessage('Erreur de mise à jour');
      }

      return {
        type: 'assistant',
        content: `🎉 **Votre paiement Wave est confirmé !**

✅ **Transaction :** ${cleanTransactionId}
✅ **Commande confirmée**

**Nous vous livrerons sous 24-48h**
Merci pour votre confiance ! 🙏`,
        choices: [
          '⭐ Parfait, merci !',
          '🛍️ Commander un autre jeu',
          '📱 Télécharger l\'app mobile'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_completed' as ConversationStep,
          flags: { orderCompleted: true, waveVerified: true }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return this.createErrorMessage('Erreur de vérification Wave');
    }
  }

  private async handlePredefinedQuestion(message: string, productId: string, productName: string): Promise<ChatMessage> {
    if (message.includes('comment y jouer')) {
      return {
        type: 'assistant',
        content: `🎮 **Comment jouer au jeu ${productName} :**

**C'est très simple :**
1️⃣ Mélangez les 150 cartes
2️⃣ Tirez une carte chacun à votre tour
3️⃣ Lisez la question à voix haute
4️⃣ Répondez sincèrement et écoutez la réponse de l'autre
5️⃣ Échangez sur vos réponses

🎯 **Objectif :** Créer des conversations authentiques !`,
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

    return {
      type: 'assistant',
      content: `Je suis là pour vous aider avec le jeu ${productName} !

Que souhaitez-vous savoir ?`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui ?',
        'Quels sont les bénéfices ?'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'question_mode' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleGenericButton(message: string, productId: string, productName: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('parfait') || lowerMessage.includes('merci')) {
      return {
        type: 'assistant',
        content: `😊 **Avec grand plaisir !**

C'était un plaisir de vous accompagner. J'espère que vous allez adorer le jeu **${productName}** ! 💕

Y a-t-il autre chose que je puisse faire pour vous ?`,
        choices: [
          '🛍️ Commander un autre jeu',
          '📱 Télécharger l\'app mobile',
          '🏠 Retour à l\'accueil'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'satisfaction_confirmed' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'assistant',
      content: `😊 **Je suis là pour vous aider !**

Comment puis-je vous accompagner avec le jeu **${productName}** ?`,
      choices: [
        'Je veux l\'acheter maintenant',
        'J\'ai des questions',
        'Je veux en savoir plus'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'generic_help' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
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
      return this.createErrorMessage('Session expirée. Recommencez svp.');
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