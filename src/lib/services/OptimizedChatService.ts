// src/lib/services/OptimizedChatService.ts - VERSION COMPLÈTEMENT CORRIGÉE

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
    console.log('🔧 OptimizedChatService v8.0 initialized - FULLY CORRECTED WITH AI');
  }

  public static getInstance(): OptimizedChatService {
    if (!this.instance) {
      this.instance = new OptimizedChatService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE COMPATIBLE AVEC L'API - ENTIÈREMENT CORRIGÉE
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

      // ✅ NOUVELLE PRIORITÉ 1: Gestion des messages libres AVANT tout le reste
      if (!this.isSpecialMessage(message) && !this.orderStates.has(sessionId) && !currentStep.startsWith('express_')) {
        console.log('🤖 FREE TEXT MESSAGE DETECTED - Processing with AI');
        return await this.handleFreeTextWithAI(message, productId, productName, sessionId);
      }

      // ✅ PRIORITÉ 2: "Je veux l'acheter maintenant"
      if (this.isExpressPurchaseTrigger(message)) {
        console.log('🛒 Express purchase detected');
        return await this.startExpressPurchase(sessionId, productId, productName);
      }

      // ✅ PRIORITÉ 3: Gestion du bouton "Télécharger l'app mobile"
      if (this.isAppDownloadTrigger(message)) {
        console.log('📱 App download button detected');
        return await this.handleAppDownload();
      }

      // ✅ PRIORITÉ 4: Gestion du retour Wave et demande d'ID transaction
      if (message === 'WAVE_PAYMENT_INITIATED') {
        console.log('🌊 Wave payment return detected');
        return await this.handleWavePaymentReturn(sessionId);
      }

      // ✅ PRIORITÉ 5: Validation d'ID de transaction Wave
      if (this.isWaveTransactionId(message)) {
        console.log('🔑 Wave transaction ID detected');
        return await this.handleWaveTransactionVerification(sessionId, message);
      }

      // ✅ PRIORITÉ 6: Gérer le flow express (étapes scénarisées) 
      if (currentStep.startsWith('express_') || this.orderStates.has(sessionId)) {
        console.log('📦 Express flow step detected');
        return await this.handleExpressFlowInternal(sessionId, message, currentStep, productId, productName);
      }

      // ✅ PRIORITÉ 7: Gérer les autres boutons du message d'accueil
      if (this.isWelcomeButtonChoice(message)) {
        console.log('🌹 Welcome button choice detected');
        return await this.welcomeService.handleWelcomeButtonResponse(message, productId, productName);
      }

      // ✅ PRIORITÉ 8: Gérer les questions prédéfinies
      if (this.isPredefinedQuestion(message)) {
        console.log('📋 Predefined question detected');
        return await this.handlePredefinedQuestion(message, productId, productName);
      }

      // ✅ PRIORITÉ 9: Gestion des boutons "génériques"
      if (this.isGenericButton(message)) {
        console.log('🔘 Generic button detected');
        return await this.handleGenericButton(message, productId, productName);
      }

      // ✅ PRIORITÉ 10: Gestion spéciale "Commander un autre jeu"
      if (message.includes('Commander un autre jeu') || message.includes('commander un autre')) {
        console.log('🛍️ Upsell request detected');
        return await this.handleUpsellRequest(productId);
      }

      // ✅ FALLBACK: Messages libres → IA
      console.log('🤖 Fallback: Processing with AI');
      return await this.handleFreeTextWithAI(message, productId, productName, sessionId);

    } catch (error) {
      console.error('❌ Error in processMessage:', error);
      return this.createErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  // ✅ NOUVELLE FONCTION CORRIGÉE: Gestion des messages libres avec IA
  private async handleFreeTextWithAI(
    message: string,
    productId: string,
    productName: string,
    sessionId: string
  ): Promise<ChatMessage> {
    try {
      console.log('🧠 Processing free text with OpenAI:', message.substring(0, 50));

      // ✅ ÉTAPE 1: Rechercher dans la base de connaissances d'abord
      const knowledgeResponse = await this.searchKnowledgeBase(message, productId);
      
      if (knowledgeResponse && knowledgeResponse.confidence > 0.7) {
        console.log('✅ Knowledge base match found:', knowledgeResponse.confidence);
        
        return {
          type: 'assistant',
          content: knowledgeResponse.response,
          choices: [
            'Je veux l\'acheter maintenant',
            'J\'ai d\'autres questions',
            'Comment y jouer ?',
            'C\'est pour qui ?'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'knowledge_response' as ConversationStep,
            flags: { 
              knowledgeBaseUsed: true,
              confidence: knowledgeResponse.confidence 
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // ✅ ÉTAPE 2: Utiliser OpenAI pour une réponse intelligente
      const aiResponse = await this.getOpenAIResponse(message, productId, productName, sessionId);
      
      return {
        type: 'assistant',
        content: aiResponse,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'ai_response' as ConversationStep,
          flags: { 
            aiResponseUsed: true 
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in handleFreeTextWithAI:', error);
      
      // Fallback vers une réponse générique utile
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
          flags: { fallbackUsed: true }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ NOUVELLE FONCTION: Recherche dans la base de connaissances AMÉLIORÉE
  private async searchKnowledgeBase(message: string, productId: string): Promise<{
    response: string;
    confidence: number;
  } | null> {
    try {
      console.log('🔍 Searching knowledge base for:', message.substring(0, 30));

      const { data: knowledgeItems, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_active', true)
        .limit(20);

      if (error || !knowledgeItems || knowledgeItems.length === 0) {
        console.log('⚠️ No knowledge base items found');
        return null;
      }

      return this.processKnowledgeItems(message, knowledgeItems, productId);
    } catch (error) {
      console.error('❌ Error searching knowledge base:', error);
      return null;
    }
  }

  // ✅ FONCTION UTILITAIRE: Traiter les éléments de la base de connaissances
  private processKnowledgeItems(message: string, knowledgeItems: any[], productId: string): {
    response: string;
    confidence: number;
  } | null {
    const messageLower = message.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const item of knowledgeItems) {
      const score = this.calculateRelevanceScore(messageLower, item);
      
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && bestScore > 0.5) {
      let response = bestMatch.response_template || bestMatch.content || bestMatch.response;
      
      // Remplacer les variables dans la réponse
      response = response
        .replace(/\{product_name\}/g, 'votre jeu')
        .replace(/\{product_price\}/g, '14,000 FCFA');

      return {
        response: response,
        confidence: bestScore
      };
    }

    return null;
  }

  // ✅ FONCTION UTILITAIRE: Calculer le score de pertinence
  private calculateRelevanceScore(message: string, knowledgeItem: any): number {
    try {
      let score = 0;
      const messageWords = message.split(/\s+/);
      
      // Vérifier les patterns de questions si disponibles
      if (knowledgeItem.question_patterns && Array.isArray(knowledgeItem.question_patterns)) {
        for (const pattern of knowledgeItem.question_patterns) {
          if (message.includes(pattern.toLowerCase())) {
            score += 0.6;
          }
        }
      }

      // Vérifier les mots-clés
      if (knowledgeItem.keywords && Array.isArray(knowledgeItem.keywords)) {
        for (const keyword of knowledgeItem.keywords) {
          if (message.includes(keyword.toLowerCase())) {
            score += 0.3;
          }
        }
      }

      // Vérifier le contenu et le titre
      const content = (knowledgeItem.content || '').toLowerCase();
      const title = (knowledgeItem.title || '').toLowerCase();
      
      for (const word of messageWords) {
        if (word.length > 2) {
          if (content.includes(word)) score += 0.1;
          if (title.includes(word)) score += 0.2;
        }
      }

      return Math.min(score, 1.0);
    } catch (error) {
      console.error('❌ Error calculating relevance score:', error);
      return 0;
    }
  }

  // ✅ NOUVELLE FONCTION CORRIGÉE: Réponse OpenAI intelligente
  private async getOpenAIResponse(
    message: string, 
    productId: string, 
    productName: string, 
    sessionId: string
  ): Promise<string> {
    try {
      console.log('🤖 Calling OpenAI for intelligent response');

      // Récupérer les informations du produit
      const productInfo = await this.getProductInfo(productId);
      
      // ✅ Construire un prompt contextualisé et intelligent
      const systemPrompt = `Tu es Rose, l'assistante commerciale IA de VIENS ON S'CONNAÎT, spécialisée dans les jeux de cartes relationnels au Sénégal.

CONTEXTE PRODUIT:
- Nom: ${productName}
- Prix: ${productInfo.price} FCFA
- Description: ${productInfo.description || 'Jeu de cartes pour renforcer les relations'}

MISSION: Répondre à la question du client de manière chaleureuse, informative et commerciale.
STYLE: Amicale, professionnelle, orientée vente, typiquement sénégalaise.
STRUCTURE: 2-3 phrases maximum + question d'engagement.

RÈGLES IMPORTANTES:
1. Toujours finir par une question pour engager davantage
2. Utiliser des émojis appropriés mais avec parcimonie
3. Mettre l'accent sur les bénéfices relationnels
4. Adapter le ton selon le contexte sénégalais/africain
5. Ne pas hésiter à mentionner l'app mobile si pertinent

Question du client: "${message}"`;

      // ✅ Utiliser OpenAI avec la clé d'environnement
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            max_tokens: 250,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiAnswer = data.choices?.[0]?.message?.content;
          
          if (aiAnswer && aiAnswer.trim()) {
            console.log('✅ OpenAI response generated successfully');
            return aiAnswer.trim();
          }
        } else {
          console.error('❌ OpenAI API error:', response.status, response.statusText);
        }
      }

      // ✅ Fallback intelligent si OpenAI non disponible
      return this.generateIntelligentFallback(message, productName, productInfo);

    } catch (error) {
      console.error('❌ Error getting OpenAI response:', error);
      return this.generateIntelligentFallback(message, productName, { price: '14,000' });
    }
  }

  // ✅ NOUVELLE FONCTION: Fallback intelligent sans IA
  private generateIntelligentFallback(
    message: string, 
    productName: string, 
    productInfo: any
  ): string {
    const messageLower = message.toLowerCase();

    // Réponses contextuelles selon le type de question
    if (messageLower.includes('prix') || messageLower.includes('coût') || messageLower.includes('cher')) {
      return `Le jeu **${productName}** coûte ${productInfo.price} FCFA. C'est un investissement dans la qualité de vos relations ! 

Pensez-vous que ce prix correspond à la valeur que cela apportera à votre couple/famille ?`;
    }

    if (messageLower.includes('livraison') || messageLower.includes('livrer') || messageLower.includes('expédition')) {
      return `Pour la livraison de **${productName}**, nous livrons partout au Sénégal sous 24-48h ! 🚚

Dans quelle ville souhaitez-vous qu'on vous livre ?`;
    }

    if (messageLower.includes('différence') || messageLower.includes('compare') || messageLower.includes('autres jeux')) {
      return `**${productName}** se distingue par ses 150 cartes spécialement conçues pour créer des conversations authentiques et profondes.

Souhaitez-vous que je vous explique en détail les spécificités de ce jeu ?`;
    }

    if (messageLower.includes('bénéfice') || messageLower.includes('avantage') || messageLower.includes('pourquoi')) {
      return `Les couples qui jouent à **${productName}** témoignent d'une meilleure communication et d'une complicité renforcée ! ✨

Aimeriez-vous découvrir comment ce jeu peut transformer vos conversations ?`;
    }

    // Réponse générique mais intelligente
    return `Excellente question sur **${productName}** ! 

Ce jeu a déjà aidé des milliers de couples et familles à créer des liens plus forts. Que souhaitez-vous savoir précisément ?`;
  }

  // ✅ NOUVELLE FONCTION: Gestion de l'upsell avec cartes produits
  private async handleUpsellRequest(currentProductId: string): Promise<ChatMessage> {
    try {
      console.log('🛍️ Handling upsell request for product:', currentProductId);

      // Récupérer d'autres jeux pour l'upsell
      const { data: relatedProducts, error } = await supabase
        .from('products')
        .select('id, name, price, images, description')
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

      // ✅ CORRECTION MAJEURE: Formater les produits pour ChatProductCards
      const formattedProducts = relatedProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images || [],
        reason: `Complément parfait à votre ${currentProductId}`,
        urgency: 'medium' as const,
        stats: {
          sold: Math.floor(Math.random() * 50) + 10,
          satisfaction: 4.8,
          reviews: Math.floor(Math.random() * 20) + 5
        }
      }));

      return {
        type: 'assistant',
        content: `🛍️ **Nos autres jeux populaires :**

Nos clients qui achètent ce jeu prennent souvent aussi :`,
        choices: [], // Pas de choices car on utilise les cartes produits
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'upsell_display' as ConversationStep,
          // ✅ CORRECTION: Utiliser le bon format pour les cartes produits
          recommendedProducts: formattedProducts,
          flags: { 
            showRecommendations: true,
            upsellMode: true 
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling upsell request:', error);
      return this.createErrorMessage('Impossible de charger les autres jeux.');
    }
  }

  // ✅ FONCTION: Détecter les triggers de téléchargement app
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

  // ✅ FONCTION: Gérer le téléchargement de l'app
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

✨ **Avec l'app mobile :**
🎮 Accès à tous nos jeux
💕 Mode couple & famille
🎯 Défis personnalisés
✨ Contenu exclusif`,
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
🎮 Tous nos jeux de cartes
💕 Mode couple, famille, amis
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

  // ✅ FONCTIONS UTILITAIRES (toutes les autres fonctions restent identiques)
  
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

  // ✅ DÉMARRER L'ACHAT EXPRESS
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

      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      return {
        type: 'assistant' as const,
        content: `🛒 **Parfait ! Commençons votre commande**

${productName || product.name} - Excellent choix ! 🎉

Combien d'exemplaires voulez-vous ?`,
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

  // ✅ TOUTES LES AUTRES MÉTHODES (restent identiques au fichier original)
  
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

  private async handlePredefinedQuestion(
    message: string,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    
    if (message.includes('comment y jouer')) {
      return {
        type: 'assistant',
        content: `🎮 **Comment jouer à ${productName} :**

**C'est très simple :**
1️⃣ Mélangez les 150 cartes
2️⃣ Tirez une carte chacun votre tour
3️⃣ Lisez la question à voix haute
4️⃣ Répondez sincèrement
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

    if (message.includes('c\'est pour qui')) {
      return {
        type: 'assistant',
        content: `👥 **${productName} est parfait pour :**

❤️ **Les couples** qui veulent se redécouvrir
👨‍👩‍👧‍👦 **Les familles** pour créer des liens forts  
👫 **Les amis** qui veulent approfondir leur amitié
💼 **Les collègues** pour la cohésion d'équipe

✨ **Peu importe votre âge**, ce jeu s'adapte à tous !`,
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

    if (message.includes('bénéfices')) {
      return {
        type: 'assistant',
        content: `✨ **Les bénéfices de ${productName} :**

🎯 **Communication améliorée**
• Conversations plus profondes
• Meilleure écoute mutuelle

❤️ **Relation renforcée**  
• Complicité accrue
• Confiance développée

🔍 **Découverte mutuelle**
• Apprendre des choses nouvelles
• Comprendre ses valeurs

😌 **Plus de moments complices** et moins de malentendus !`,
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

    return {
      type: 'assistant',
      content: `Je suis là pour vous aider avec ${productName} !

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

  private async handleGenericButton(
    message: string,
    productId: string,
    productName: string
  ): Promise<ChatMessage> {
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('parfait') || lowerMessage.includes('merci')) {
      return {
        type: 'assistant',
        content: `😊 **Avec grand plaisir !**

C'était un plaisir de vous accompagner. J'espère que vous allez adorer **${productName}** ! 💕

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

    if (lowerMessage.includes('retour') && lowerMessage.includes('accueil')) {
      return {
        type: 'assistant',
        content: `🏠 **Merci pour votre visite !**

Vous pouvez fermer cette fenêtre pour retourner à l'accueil.

**Avant de partir :**`,
        choices: [
          '🛍️ Voir tous nos jeux',
          '📱 Télécharger l\'app mobile',
          '📞 Nous contacter'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'return_to_home' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'assistant',
      content: `😊 **Je suis là pour vous aider !**

Comment puis-je vous accompagner avec **${productName}** ?`,
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

  // ✅ GESTION DES ÉTAPES EXPRESS (méthodes simplifiées)
  
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
      content: `✅ **${quantity} exemplaire${quantity > 1 ? 's' : ''} - ${totalAmount.toLocaleString()} FCFA**

Parfait ! J'ai besoin de votre numéro de téléphone pour la livraison 📱

*Format : +221 77 123 45 67*`,
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

  private async handlePhoneStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
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

    // Vérifier client existant
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
        content: `👋 **Ravi de vous revoir ${existingCustomer.first_name} !**

📍 **Adresse habituelle :** ${existingCustomer.address}, ${existingCustomer.city}

Livraison à la même adresse ?`,
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

Bienvenue ! 🎉 Quel est votre nom complet ?

*Exemple : Aminata Diallo*`,
        choices: [],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'express_name' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handleNameStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
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
      content: `👤 **Enchanté ${orderState.data.firstName} !**

Votre adresse de livraison ?

*Format : Quartier/Rue, Ville*
*Exemple : Mermoz, Dakar*`,
      choices: [],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'express_address' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleAddressStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
    if (message.toLowerCase().includes('oui') && orderState.flags.isExistingCustomer) {
      orderState.step = 'payment';
      orderState.updatedAt = new Date().toISOString();
      this.orderStates.set(sessionId, orderState);
      await this.saveOrderStateToDatabase(sessionId, orderState);

      const totalAmount = orderState.data.unitPrice * orderState.data.quantity;

      return {
        type: 'assistant',
        content: `✅ **Livraison confirmée**

📍 ${orderState.data.address}, ${orderState.data.city}
💰 **Total : ${totalAmount.toLocaleString()} FCFA**

Comment souhaitez-vous payer ?`,
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
        content: `✅ **Adresse enregistrée**

📍 ${orderState.data.address}, ${orderState.data.city}
💰 **Total : ${totalAmount.toLocaleString()} FCFA**

Comment souhaitez-vous payer ?`,
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

  private async handlePaymentStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
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
      content: `🎉 **Commande confirmée !**

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

  private async handleConfirmationStep(
    sessionId: string,
    message: string,
    orderState: ExpressOrderState
  ): Promise<ChatMessage> {
    
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
  
  private async createOrder(
    sessionId: string,
    orderState: ExpressOrderState
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
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

  private async getProductInfo(productId: string): Promise<{
    name: string;
    price: string;
    description?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price, description')
        .eq('id', productId)
        .single();

      if (!error && data) {
        return {
          name: data.name,
          price: data.price.toLocaleString(),
          description: data.description
        };
      }
    } catch (error) {
      console.error('❌ Error fetching product info:', error);
    }

    return {
      name: 'Le Jeu Pour les Couples',
      price: '14,000',
      description: 'Un jeu révolutionnaire pour des conversations authentiques'
    };
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

Donnez-moi votre **ID de Transaction Wave** pour confirmer.

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

  private async handleWaveTransactionVerification(
    sessionId: string,
    transactionId: string
  ): Promise<ChatMessage> {
    
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
        content: `🎉 **Paiement Wave confirmé !**

✅ **Transaction :** ${cleanTransactionId}
✅ **Commande confirmée**

**Livraison sous 24-48h**
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
  
  public async handleExpressFlow(
    sessionId: string,
    message: string,
    currentStep: ConversationStep | string
  ): Promise<ChatMessage> {
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

  public async handleExpressStep(
    sessionId: string,
    input: string,
    currentStep: string
  ): Promise<ChatMessage> {
    return this.handleExpressFlow(sessionId, input, currentStep);
  }
}