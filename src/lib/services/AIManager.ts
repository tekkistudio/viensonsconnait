// src/lib/services/AIManager.ts - VERSION INTELLIGENTE AVEC DÉTECTION D'INTENTION

import { ErrorManager } from './ErrorManager';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { PurchaseIntentDetector, type PurchaseIntent } from './PurchaseIntentDetector';
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import type { 
  CustomerMessage,
  ChatMessage,
  ConversationStep,
  AIResponse,
  OrderData,
  MessageType,
  ProductData
} from '@/types/chat';

const isServer = typeof window === 'undefined';
let openai: OpenAI | null = null;

// ✅ Initialiser OpenAI avec GPT-4o
function initializeOpenAI() {
  if (isServer && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ AIManager: OpenAI initialized with GPT-4o');
  }
}

export class AIManager {
  private static instance: AIManager | null = null;
  private readonly errorManager: ErrorManager;
  private readonly knowledgeBase: KnowledgeBaseService;
  private readonly intentDetector: PurchaseIntentDetector;
  private conversationHistory: Map<string, Array<{message: string, timestamp: string, type: 'user' | 'assistant'}>> = new Map();

  private constructor() {
    this.errorManager = ErrorManager.getInstance();
    this.knowledgeBase = KnowledgeBaseService.getInstance();
    this.intentDetector = PurchaseIntentDetector.getInstance();
    if (isServer) {
      initializeOpenAI();
    }
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  // ✅ MÉTHODE PRINCIPALE INTELLIGENTE AVEC DÉTECTION D'INTENTION
  async handleProductChatbot(
    message: CustomerMessage,
    productId: string,
    productName: string,
    currentStep: ConversationStep = 'initial',
    orderData: Partial<OrderData> = {},
    sessionId?: string
  ): Promise<AIResponse> {
    try {
      console.log('🤖 AIManager processing with INTENT DETECTION:', {
        message: message.content.substring(0, 50),
        productId,
        productName,
        currentStep,
        sessionId
      });

      // ✅ ÉTAPE 1: Ajouter à l'historique de conversation
      if (sessionId) {
        this.addToConversationHistory(sessionId, message.content, 'user');
      }

      // ✅ ÉTAPE 2: DÉTECTION D'INTENTION D'ACHAT
      const conversationHistory = sessionId ? this.getConversationHistory(sessionId) : [];
      const intentAnalysis = this.intentDetector.analyzePurchaseIntent(
        message.content,
        conversationHistory.map(h => h.message),
        {
          messageCount: conversationHistory.filter(h => h.type === 'user').length,
          timeSpent: this.calculateConversationDuration(conversationHistory),
          previousIntentScore: this.getPreviousIntentScore(sessionId)
        }
      );

      console.log('🎯 Intent Analysis Result:', {
        score: intentAnalysis.score,
        confidence: intentAnalysis.confidence,
        recommendation: intentAnalysis.recommendation,
        signals: intentAnalysis.signals
      });

      // ✅ ÉTAPE 3: DÉCISION AUTOMATIQUE BASÉE SUR L'INTENTION
      if (intentAnalysis.recommendation === 'trigger_purchase') {
        console.log('🛒 Auto-triggering purchase flow based on intent analysis');
        return this.createPurchaseFlowResponse(intentAnalysis, productName, message.content);
      }

      // ✅ ÉTAPE 4: Recherche dans la base de connaissances VIENS ON S'CONNAÎT
      const knowledgeResults = await this.knowledgeBase.searchKnowledge(
        message.content,
        productId
      );

      if (knowledgeResults.length > 0 && knowledgeResults[0].relevanceScore > 0.6) {
        const bestMatch = knowledgeResults[0];
        const formattedResponse = this.knowledgeBase.formatResponse(bestMatch, productName);
        
        // ✅ AMÉLIORATION: Adapter la réponse selon l'intention
        const adaptedResponse = this.adaptResponseToIntent(
          formattedResponse.content,
          formattedResponse.suggestions,
          intentAnalysis,
          productName
        );
        
        console.log('✅ Knowledge base match with intent adaptation:', {
          confidence: formattedResponse.confidence,
          intentScore: intentAnalysis.score,
          adapted: true
        });

        return {
          content: adaptedResponse.content,
          type: 'assistant',
          choices: adaptedResponse.choices,
          nextStep: this.determineNextStep(bestMatch.item.category, currentStep, intentAnalysis),
          metadata: {
            knowledgeBaseUsed: true,
            confidence: formattedResponse.confidence,
            matchedKeywords: bestMatch.matchedKeywords,
            purchaseIntent: intentAnalysis,
            flags: {
              aiUsed: true,
              intentAnalyzed: true,
              pushToSale: intentAnalysis.score > 45
            }
          }
        };
      }

      // ✅ ÉTAPE 5: Si pas de correspondance KB, utiliser GPT-4o avec contexte INTELLIGENT
      console.log('🧠 No KB match, using GPT-4o with INTELLIGENT context and intent');
      
      if (!isServer) {
        return this.handleClientSideChat(message, productId, productName, currentStep, orderData, intentAnalysis);
      }

      const aiResponse = await this.getContextualGPTResponseWithIntent(
        message.content,
        productId,
        productName,
        currentStep,
        orderData,
        intentAnalysis,
        conversationHistory
      );

      // ✅ Ajouter la réponse à l'historique
      if (sessionId) {
        this.addToConversationHistory(sessionId, aiResponse.content, 'assistant');
      }

      return aiResponse;

    } catch (error) {
      console.error('❌ AIManager error:', error);
      return this.createFallbackResponse(productName);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Réponse GPT-4o avec analyse d'intention
  private async getContextualGPTResponseWithIntent(
    messageContent: string,
    productId: string,
    productName: string,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>,
    intentAnalysis: PurchaseIntent,
    conversationHistory: Array<{message: string, timestamp: string, type: 'user' | 'assistant'}>
  ): Promise<AIResponse> {
    try {
      if (!openai) {
        initializeOpenAI();
        if (!openai) throw new Error('OpenAI not available');
      }

      // Récupérer les informations du produit et témoignages
      const [productInfo, testimonials] = await Promise.all([
        this.getProductInfo(productId),
        this.getProductTestimonials(productId)
      ]);
      
      // Construire le prompt système intelligent avec intention
      const systemPrompt = this.buildIntelligentSystemPrompt(
        productInfo, 
        productName, 
        intentAnalysis, 
        conversationHistory,
        testimonials
      );
      
      // Construire le contexte de conversation
      const conversationContext = this.buildConversationContext(conversationHistory, messageContent);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationContext }
        ],
        temperature: 0.7,
        max_tokens: 350,
        response_format: { type: "json_object" }
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) throw new Error('Empty GPT response');

      const parsed = JSON.parse(result);
      
      return {
        content: parsed.message || parsed.response || "Je suis là pour vous aider !",
        type: 'assistant',
        choices: parsed.choices || [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'Quels sont les bénéfices ?'
        ],
        nextStep: parsed.nextStep || currentStep,
        metadata: {
          aiUsed: true,
          gptModel: 'gpt-4o',
          confidence: 0.8,
          purchaseIntent: intentAnalysis,
          flags: {
            aiUsed: true,
            intentBased: true,
            pushToSale: intentAnalysis.score > 45,
            vouvoiement: true
          }
        }
      };

    } catch (error) {
      console.error('❌ GPT-4o with intent error:', error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Prompt système intelligent avec intention
  private buildIntelligentSystemPrompt(
    productInfo: any, 
    productName: string, 
    intentAnalysis: PurchaseIntent,
    conversationHistory: Array<{message: string, timestamp: string, type: 'user' | 'assistant'}>,
    testimonials: any[]
  ): string {
    const historyLength = conversationHistory.filter(h => h.type === 'user').length;
    const lastMessages = conversationHistory.slice(-6).map(h => `${h.type}: ${h.message}`).join('\n');
    
    return `Tu es Rose, l'assistante commerciale IA de VIENS ON S'CONNAÎT, spécialisée dans les jeux de cartes relationnels au Sénégal.

CONTEXTE MARQUE:
VIENS ON S'CONNAÎT (VOC) est une marque de jeux de cartes (physiques + numériques) qui facilitent des conversations authentiques pour renforcer les liens humains : couples, amis, familles, collègues.

PRODUIT ACTUEL:
- Nom: le jeu ${productName}
- Prix: ${productInfo.price || '14,000'} FCFA
- Description: ${productInfo.description || 'Jeu de 150 cartes pour renforcer les relations'}
- Cible: ${productInfo.target_audience || 'Adultes 18+'}
- Règles: ${productInfo.game_rules ? productInfo.game_rules.substring(0, 200) + '...' : 'Questions profondes pour conversations authentiques'}

TÉMOIGNAGES CLIENTS:
${testimonials.length > 0 
  ? testimonials.slice(0, 2).map(t => `"${t.content}" - ${t.customer_name} (${t.rating}/5⭐)`).join('\n')
  : 'Retours positifs sur la qualité des conversations créées'
}

ANALYSE D'INTENTION D'ACHAT:
- Score d'intention: ${intentAnalysis.score}/100
- Confiance: ${intentAnalysis.confidence}
- Recommandation: ${intentAnalysis.recommendation}
- Signaux détectés: ${intentAnalysis.signals.slice(0, 3).join(', ')}
- Messages échangés: ${historyLength}

CONTEXTE CONVERSATION RÉCENTE:
${lastMessages || 'Premier échange'}

DIRECTIVES CRITIQUES:
1. UTILISE EXCLUSIVEMENT LE VOUVOIEMENT (vous, votre, etc.)
2. ${intentAnalysis.score > 70 
    ? 'PRIORITÉ ABSOLUE: Orienter vers l\'ACHAT IMMÉDIAT - Le client est prêt !'
    : intentAnalysis.score > 45
      ? 'PRIORITÉ: Pousser doucement vers l\'achat - Le client est intéressé'
      : 'OBJECTIF: Éveiller l\'intérêt et lever les objections'
   }
3. QUESTIONS FINALES: Toujours terminer par une question qui pousse vers l'ACHAT ou clarifie les besoins
4. ÉVITER les questions qui distraient de l'achat (sauf si score < 30)
5. Utiliser les témoignages comme preuve sociale quand pertinent
6. MAXIMUM 4 phrases + question finale
7. Mentionner "le jeu" avant le nom du produit

${intentAnalysis.score > 70 
  ? 'ACTION REQUISE: Le client montre une forte intention d\'achat. Propose directement la commande.'
  : intentAnalysis.score > 45
    ? 'ACTION REQUISE: Le client est intéressé. Rassure et pousse vers la décision.'
    : 'ACTION REQUISE: Le client explore. Informe et éveille l\'intérêt d\'achat.'
}

Réponds en JSON avec: {
  "message": "ta réponse avec vouvoiement et orientation achat", 
  "choices": ["choix1 orienté achat", "choix2", "choix3"], 
  "nextStep": "étape_suivante"
}`;
  }

  // ✅ NOUVELLE MÉTHODE: Créer une réponse de flow d'achat automatique
  private createPurchaseFlowResponse(
    intentAnalysis: PurchaseIntent,
    productName: string,
    originalMessage: string
  ): AIResponse {
    return {
      content: `🎉 **Parfait ! Je vois que vous êtes convaincu(e).**

Procédons à votre commande du **jeu ${productName}** maintenant !

**Récapitulatif :**
✅ Le jeu ${productName} - 14,000 FCFA
✅ Livraison gratuite à Dakar
✅ Satisfait ou remboursé

Commençons par la quantité que vous souhaitez.`,
      type: 'assistant',
      choices: [],
      nextStep: 'express_quantity',
      metadata: {
        aiUsed: true,
        purchaseIntent: intentAnalysis,
        flags: {
          autoTriggeredPurchase: true,
          expressMode: true,
          intentBased: true,
          pushToSale: true
        },
        orderData: {
          productName: `le jeu ${productName}`,
          autoTriggered: true,
          intentScore: intentAnalysis.score
        }
      }
    };
  }

  // ✅ NOUVELLE MÉTHODE: Adapter une réponse selon l'intention
  private adaptResponseToIntent(
    originalContent: string,
    originalChoices: string[],
    intentAnalysis: PurchaseIntent,
    productName: string
  ): { content: string; choices: string[] } {
    
    let adaptedContent = originalContent;
    let adaptedChoices = [...originalChoices];

    // ✅ Ajouter une conclusion orientée achat selon l'intention
    if (intentAnalysis.score > 70) {
      adaptedContent += `\n\n**Vous semblez convaincu(e) ! Souhaitez-vous que nous procédions à votre commande maintenant ?**`;
      adaptedChoices = ['Je veux l\'acheter maintenant', 'J\'ai encore une petite question', 'Voir les options de livraison'];
    } else if (intentAnalysis.score > 45) {
      adaptedContent += `\n\n**Cela répond-il à vos attentes ? Êtes-vous prêt(e) à franchir le pas ?**`;
      adaptedChoices = ['Je veux l\'acheter maintenant', 'J\'ai d\'autres questions', ...adaptedChoices.slice(0, 2)];
    } else if (intentAnalysis.score > 25) {
      adaptedContent += `\n\n**Que pensez-vous de ce jeu maintenant ? Correspond-il à ce que vous cherchez ?**`;
      // Garder les choix originaux mais s'assurer que l'achat est présent
      if (!adaptedChoices.some(c => c.toLowerCase().includes('acheter'))) {
        adaptedChoices.unshift('Je veux l\'acheter maintenant');
      }
    }

    return {
      content: adaptedContent,
      choices: adaptedChoices.slice(0, 4) // Maximum 4 choix
    };
  }

  // ✅ NOUVELLE MÉTHODE: Construire le contexte de conversation
  private buildConversationContext(
    history: Array<{message: string, timestamp: string, type: 'user' | 'assistant'}>,
    currentMessage: string
  ): string {
    const recentHistory = history.slice(-4).map(h => 
      `${h.type === 'user' ? 'Client' : 'Rose'}: ${h.message}`
    ).join('\n');

    return `CONVERSATION RÉCENTE:
${recentHistory}

NOUVEAU MESSAGE DU CLIENT:
${currentMessage}

MISSION: Réponds de manière chaleureuse, professionnelle et orientée conversion en utilisant le VOUVOIEMENT exclusivement.`;
  }

  // ✅ MÉTHODES DE GESTION DE L'HISTORIQUE
  private addToConversationHistory(
    sessionId: string, 
    message: string, 
    type: 'user' | 'assistant'
  ): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId)!;
    history.push({
      message: message.substring(0, 500), // Limiter la taille
      timestamp: new Date().toISOString(),
      type
    });

    // Garder seulement les 20 derniers messages
    if (history.length > 20) {
      this.conversationHistory.set(sessionId, history.slice(-20));
    }
  }

  private getConversationHistory(sessionId: string): Array<{message: string, timestamp: string, type: 'user' | 'assistant'}> {
    return this.conversationHistory.get(sessionId) || [];
  }

  private calculateConversationDuration(history: Array<{timestamp: string}>): number {
    if (history.length < 2) return 0;
    const start = new Date(history[0].timestamp).getTime();
    const end = new Date(history[history.length - 1].timestamp).getTime();
    return Math.floor((end - start) / 1000); // en secondes
  }

  private getPreviousIntentScore(sessionId?: string): number {
    if (!sessionId) return 0;
    
    const history = this.getConversationHistory(sessionId);
    const userMessages = history.filter(h => h.type === 'user');
    
    if (userMessages.length < 2) return 0;
    
    const previousMessage = userMessages[userMessages.length - 2];
    const previousIntent = this.intentDetector.analyzePurchaseIntent(previousMessage.message);
    
    return previousIntent.score;
  }

  // ✅ GESTION CÔTÉ CLIENT AMÉLIORÉE
  private async handleClientSideChat(
    message: CustomerMessage,
    productId: string,
    productName: string,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>,
    intentAnalysis: PurchaseIntent
  ): Promise<AIResponse> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.content,
          productId,
          productName,
          currentStep,
          orderData,
          sessionId: orderData.session_id || Date.now().toString(),
          storeId: orderData.metadata?.storeId || 'vosc_default',
          intentAnalysis: intentAnalysis, // ✅ Passer l'analyse d'intention
          forceAI: true
        }),
      });

      if (!response.ok) throw new Error('Chat API failed');
      
      const result = await response.json();
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          purchaseIntent: intentAnalysis,
          flags: {
            ...result.metadata?.flags,
            intentAnalyzed: true,
            clientSide: true
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Client-side chat error:', error);
      return this.createFallbackResponse(productName);
    }
  }

  // ✅ RÉCUPÉRATION INFO PRODUIT ENRICHIE
  private async getProductInfo(productId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, description, price, target_audience, game_rules, benefits')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data || {};
      
    } catch (error) {
      console.error('❌ Product info error:', error);
      return {};
    }
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer les témoignages du produit
  private async getProductTestimonials(productId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('customer_name, content, rating, author_location')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('❌ Testimonials error:', error);
      return [];
    }
  }

  // ✅ DÉTERMINER L'ÉTAPE SUIVANTE avec intention
  private determineNextStep(
    category: string, 
    currentStep: ConversationStep, 
    intentAnalysis: PurchaseIntent
  ): ConversationStep {
    
    // ✅ Prioriser selon l'intention d'achat
    if (intentAnalysis.score > 70) {
      return 'express_quantity'; // Aller directement à la commande
    }
    
    if (intentAnalysis.score > 45) {
      const stepMap: Record<string, ConversationStep> = {
        'produit': 'product_info_persuasive',
        'prix': 'price_justification',
        'livraison': 'delivery_info_compelling',
        'paiement': 'payment_method',
        'jeu': 'game_rules_compelling',
        'benefices': 'benefits_social_proof',
        'app': 'app_promotion'
      };
      return stepMap[category] || 'conversion_focus';
    }
    
    // Étapes normales pour faible intention
    const stepMap: Record<string, ConversationStep> = {
      'produit': 'product_info_shown',
      'prix': 'price_explained',
      'livraison': 'delivery_info_shown',
      'paiement': 'payment_method',
      'jeu': 'game_rules_shown',
      'benefices': 'benefits_shown',
      'app': 'app_promotion'
    };
    
    return stepMap[category] || 'generic_response';
  }

  // ✅ RÉPONSE DE FALLBACK INTELLIGENTE
  private createFallbackResponse(productName: string): AIResponse {
    return {
      content: `Je comprends votre question sur **le jeu ${productName}**.

Ce jeu a déjà transformé les relations de nombreux couples et familles au Sénégal. Il permet de créer des conversations authentiques qui renforcent les liens.

**Souhaitez-vous en savoir plus ou êtes-vous prêt(e) à l'essayer ?**`,
      type: 'assistant',
      choices: [
        'Je veux l\'acheter maintenant',
        'Comment y jouer ?',
        'C\'est pour qui exactement ?',
        'Voir les témoignages'
      ],
      nextStep: 'question_redirect',
      metadata: {
        fallbackUsed: true,
        reason: 'AI_processing_failed',
        flags: {
          fallback: true,
          pushToSale: true
        }
      }
    };
  }

  // ✅ NOUVELLE MÉTHODE: Nettoyage de l'historique (pour éviter la surcharge mémoire)
  public cleanupConversationHistory(maxAge: number = 3600000): void { // 1 heure par défaut
    const now = Date.now();
    
    for (const [sessionId, history] of this.conversationHistory.entries()) {
      if (history.length > 0) {
        const lastMessageTime = new Date(history[history.length - 1].timestamp).getTime();
        if (now - lastMessageTime > maxAge) {
          this.conversationHistory.delete(sessionId);
          console.log(`🧹 Cleaned up conversation history for session: ${sessionId}`);
        }
      }
    }
  }

  // ✅ MÉTHODE PUBLIQUE: Analyser l'intention d'achat (pour d'autres services)
  public analyzePurchaseIntent(message: string, context?: any): PurchaseIntent {
    return this.intentDetector.analyzePurchaseIntent(message, [], context);
  }
}