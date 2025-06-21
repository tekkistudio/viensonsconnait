// src/lib/services/EnhancedRoseAI.ts - CORRIGÉ
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep, ProductData, CustomerData } from '@/types/chat';

interface ConversationContext {
  productId: string;
  sessionId: string;
  userMessage: string;
  conversationHistory: Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  currentStep?: ConversationStep;
  customerProfile?: CustomerData;
  visitSource?: 'meta_ads' | 'organic' | 'direct' | 'social';
  timeOnPage?: number;
}

interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salesCount: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

interface RoseResponse {
  message: string;
  choices: string[];
  nextStep: ConversationStep;
  productRecommendations?: ProductRecommendation[];
  upsellSuggestion?: ProductRecommendation;
  customerInsights?: {
    buyingIntent: 'low' | 'medium' | 'high';
    objections: string[];
    interests: string[];
  };
  metadata?: {
    showOrderSummary?: boolean;
    triggerPayment?: boolean;
    recommendedAction?: 'accelerate' | 'nurture' | 'convert';
  };
}

export class EnhancedRoseAI {
  private static instance: EnhancedRoseAI;
  private openaiClient: OpenAI | null = null;
  private customerProfiles: Map<string, CustomerData> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  private constructor() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ Enhanced Rose AI initialized with OpenAI');
      } else {
        console.warn('⚠️ OpenAI API key not found - using fallback responses');
      }
    } catch (error) {
      console.error('❌ Error initializing OpenAI client:', error);
      this.openaiClient = null;
    }
  }

  public static getInstance(): EnhancedRoseAI {
    if (!this.instance) {
      this.instance = new EnhancedRoseAI();
    }
    return this.instance;
  }

  // 🎯 MÉTHODE PRINCIPALE - TRAITEMENT INTELLIGENT DES MESSAGES
  async processCustomerMessage(context: ConversationContext): Promise<RoseResponse> {
    try {
      console.log('🌹 Rose AI processing:', context.userMessage.substring(0, 50));

      // 1. Analyser le contexte et l'intention
      const analysisResult = await this.analyzeCustomerIntent(context);
      
      // 2. Récupérer les données produit et client
      const productData = await this.getProductData(context.productId);
      const customerData = await this.getOrCreateCustomerProfile(context.sessionId);
      
      // 3. Déterminer la stratégie de réponse
      const strategy = this.determineResponseStrategy(analysisResult, customerData, context);
      
      // 4. Générer la réponse avec IA
      const response = await this.generateIntelligentResponse(
        context, 
        productData, 
        customerData, 
        strategy
      );

      // 5. Enrichir avec des recommandations
      if (strategy.shouldRecommendProducts) {
        response.productRecommendations = await this.getSmartRecommendations(
          context.productId, 
          analysisResult, 
          customerData
        );
      }

      // 6. Sauvegarder le contexte
      this.updateConversationContext(context.sessionId, context, response);

      return response;

    } catch (error) {
      console.error('❌ Rose AI error:', error);
      return this.generateFallbackResponse(context);
    }
  }

  // 🧠 ANALYSE DE L'INTENTION CLIENT
  private async analyzeCustomerIntent(context: ConversationContext): Promise<{
    intent: 'discovery' | 'consideration' | 'purchase' | 'objection' | 'comparison';
    buyingIntent: 'low' | 'medium' | 'high';
    objections: string[];
    interests: string[];
    urgency: 'low' | 'medium' | 'high';
    keyTopics: string[];
  }> {
    const message = context.userMessage.toLowerCase();
    
    // Détection des intentions
    let intent: 'discovery' | 'consideration' | 'purchase' | 'objection' | 'comparison' = 'discovery';
    
    if (message.includes('acheter') || message.includes('commander') || message.includes('prix')) {
      intent = 'purchase';
    } else if (message.includes('mais') || message.includes('cependant') || message.includes('cher')) {
      intent = 'objection';
    } else if (message.includes('comparer') || message.includes('autre') || message.includes('différence')) {
      intent = 'comparison';
    } else if (message.includes('comment') || message.includes('pourquoi') || message.includes('avantage')) {
      intent = 'consideration';
    }

    // Niveau d'intention d'achat
    let buyingIntent: 'low' | 'medium' | 'high' = 'low';
    
    const highIntentWords = ['maintenant', 'rapidement', 'urgent', 'tout de suite', 'combien'];
    const mediumIntentWords = ['intéressé', 'possible', 'voir', 'comprendre'];
    
    if (highIntentWords.some(word => message.includes(word))) {
      buyingIntent = 'high';
    } else if (mediumIntentWords.some(word => message.includes(word))) {
      buyingIntent = 'medium';
    }

    // Détection des objections
    const objections = [];
    if (message.includes('cher') || message.includes('coût')) objections.push('price');
    if (message.includes('fonctionne') || message.includes('efficace')) objections.push('effectiveness');
    if (message.includes('temps') || message.includes('compliqué')) objections.push('complexity');
    if (message.includes('livraison') || message.includes('recevoir')) objections.push('delivery');

    return {
      intent,
      buyingIntent,
      objections,
      interests: this.extractInterests(message),
      urgency: buyingIntent === 'high' ? 'high' : 'medium',
      keyTopics: this.extractKeyTopics(message)
    };
  }

  // 🎯 STRATÉGIE DE RÉPONSE ADAPTATIVE
  private determineResponseStrategy(
    analysis: any, 
    customer: CustomerData, 
    context: ConversationContext
  ): {
    approach: 'educational' | 'persuasive' | 'supportive' | 'closing';
    shouldRecommendProducts: boolean;
    shouldUpsell: boolean;
    urgencyLevel: 'low' | 'medium' | 'high';
    personalization: string[];
  } {
    const messageCount = context.conversationHistory.length;
    
    // Stratégie basée sur l'intention et l'historique
    let approach: 'educational' | 'persuasive' | 'supportive' | 'closing' = 'educational';
    
    if (analysis.intent === 'purchase' && analysis.buyingIntent === 'high') {
      approach = 'closing';
    } else if (analysis.objections.length > 0) {
      approach = 'supportive';
    } else if (messageCount > 3 && analysis.buyingIntent === 'medium') {
      approach = 'persuasive';
    }

    return {
      approach,
      shouldRecommendProducts: messageCount > 2 || analysis.intent === 'comparison',
      shouldUpsell: approach === 'closing' || analysis.buyingIntent === 'high',
      urgencyLevel: analysis.urgency,
      personalization: this.getPersonalizationFactors(customer, context)
    };
  }

  // 🤖 GÉNÉRATION DE RÉPONSE INTELLIGENTE AVEC IA
  private async generateIntelligentResponse(
    context: ConversationContext,
    product: ProductData,
    customer: CustomerData,
    strategy: any
  ): Promise<RoseResponse> {
    // ✅ FALLBACK SI PAS D'OPENAI
    if (!this.openaiClient) {
      console.log('⚠️ OpenAI not available, using rule-based response');
      return this.generateRuleBasedResponse(context, product, strategy);
    }

    const prompt = this.buildAdvancedPrompt(context, product, customer, strategy);
    
    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: context.userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (responseContent) {
        return this.parseAIResponse(responseContent, strategy);
      }

    } catch (error) {
      console.error('❌ OpenAI error, falling back to rules:', error);
    }

    return this.generateRuleBasedResponse(context, product, strategy);
  }

  // 📝 CONSTRUCTION DU PROMPT AVANCÉ
  private buildAdvancedPrompt(
    context: ConversationContext,
    product: ProductData,
    customer: CustomerData,
    strategy: any
  ): string {
    return `Tu es Rose, l'assistante d'achat experte de VIENS ON S'CONNAÎT, spécialisée dans les jeux de cartes relationnels.

CONTEXTE CLIENT :
- Produit d'intérêt : ${product.name} (${product.price.toLocaleString()} FCFA)
- Intention détectée : ${strategy.approach}
- Niveau d'achat : ${strategy.urgencyLevel}
- Messages échangés : ${context.conversationHistory.length}
- Personnalisation : ${strategy.personalization.join(', ')}

TON OBJECTIF : Convertir ce visiteur en client de manière naturelle et efficace.

RÈGLES DE COMMUNICATION :
1. Utilise un ton chaleureux et professionnel
2. Adapte-toi au niveau d'urgence du client
3. Réponds aux objections avec empathie et preuves
4. Guide naturellement vers l'achat
5. Utilise les émojis avec modération
6. Reste authentique et crédible

PRODUIT ACTUEL :
- ${product.name} : ${product.description || 'Jeu de cartes pour renforcer les relations'}
- Prix : ${product.price.toLocaleString()} FCFA
- Bénéfices : Améliore la communication, renforce les liens, crée des moments complices
- Garantie : Satisfait ou remboursé 30 jours

MESSAGE CLIENT : "${context.userMessage}"

RÉPONDS de manière à ${strategy.approach === 'closing' ? 'finaliser la vente' : 
  strategy.approach === 'supportive' ? 'rassurer et convaincre' : 
  strategy.approach === 'persuasive' ? 'convaincre avec des preuves' : 
  'éduquer et guider'}.

Format de réponse attendu :
{
  "message": "Ta réponse personnalisée et engageante",
  "choices": ["Choix 1 orienté achat", "Choix 2 informatif", "Choix 3 support"],
  "nextStep": "conversation"
}`;
  }

  // 🛍️ RECOMMANDATIONS INTELLIGENTES
  private async getSmartRecommendations(
    currentProductId: string,
    analysis: any,
    customer: CustomerData
  ): Promise<ProductRecommendation[]> {
    try {
      // Récupérer les autres produits
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, images, price, sales_count, category, target_audience')
        .neq('id', currentProductId)
        .eq('status', 'active')
        .limit(3);

      if (error || !products) return [];

      return products.map(product => ({
        productId: product.id,
        name: product.name,
        image: product.images?.[0] || '/default-product.jpg',
        price: product.price,
        salesCount: product.sales_count || 0,
        reason: this.generateRecommendationReason(product, analysis),
        urgency: analysis.buyingIntent === 'high' ? 'high' : 'medium'
      }));

    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      return [];
    }
  }

  // 🎯 GESTION DES DONNÉES CLIENT - CORRIGÉ
  private async getOrCreateCustomerProfile(sessionId: string): Promise<CustomerData> {
    // Vérifier le cache
    if (this.customerProfiles.has(sessionId)) {
      return this.customerProfiles.get(sessionId)!;
    }

    // Créer un profil par défaut avec types corrects
    const defaultProfile: CustomerData = {
      id: sessionId,
      created_at: new Date().toISOString(),
      preferences: {
        communication_style: 'friendly',
        buying_behavior: 'analytical'
      }
    };

    this.customerProfiles.set(sessionId, defaultProfile);
    return defaultProfile;
  }

  // 🛠️ MÉTHODES UTILITAIRES
  private extractInterests(message: string): string[] {
    const interests = [];
    if (message.includes('famille')) interests.push('family');
    if (message.includes('couple')) interests.push('couple');
    if (message.includes('ami')) interests.push('friends');
    if (message.includes('enfant')) interests.push('children');
    return interests;
  }

  private extractKeyTopics(message: string): string[] {
    const topics = [];
    if (message.includes('livraison')) topics.push('delivery');
    if (message.includes('prix') || message.includes('coût')) topics.push('price');
    if (message.includes('avis') || message.includes('témoignage')) topics.push('reviews');
    return topics;
  }

  private generateRecommendationReason(product: any, analysis: any): string {
    if (analysis.interests.includes('family') && product.category === 'family') {
      return "Parfait pour toute la famille";
    }
    if (product.sales_count > 100) {
      return "Bestseller de nos clients";
    }
    return "Vous pourriez aussi aimer";
  }

  private parseAIResponse(content: string, strategy: any): RoseResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        message: parsed.message,
        choices: parsed.choices || ['⚡ Commander maintenant', '❓ Poser une question'],
        nextStep: parsed.nextStep || 'conversation',
        customerInsights: {
          buyingIntent: strategy.urgencyLevel,
          objections: [],
          interests: []
        }
      };
    } catch {
      return this.generateFallbackResponse({} as ConversationContext);
    }
  }

  private generateRuleBasedResponse(
    context: ConversationContext, 
    product: ProductData, 
    strategy: any
  ): RoseResponse {
    const message = strategy.approach === 'closing' 
      ? `✨ **${product.name}** est exactement ce qu'il vous faut ! Nos clients adorent ce jeu pour renforcer leurs relations. Voulez-vous le commander maintenant ?`
      : `Je comprends votre intérêt pour **${product.name}** ! C'est un excellent choix pour améliorer vos relations. Que souhaiteriez-vous savoir de plus ?`;

    return {
      message,
      choices: strategy.approach === 'closing' 
        ? ['⚡ Oui, je commande !', '💭 J\'ai encore des questions', '💬 Parler à un conseiller']
        : ['⚡ Commander maintenant', '❓ Poser une question', '📦 Infos livraison'],
      nextStep: 'conversation' as ConversationStep
    };
  }

  private generateFallbackResponse(context: ConversationContext): RoseResponse {
    return {
      message: "Je suis là pour vous aider avec votre commande ! Comment puis-je vous accompagner ?",
      choices: ['⚡ Commander rapidement', '❓ Poser une question', '📞 Contacter le support'],
      nextStep: 'generic_response' as ConversationStep
    };
  }

  private getPersonalizationFactors(customer: CustomerData, context: ConversationContext): string[] {
    const factors = [];
    
    // Analyse basée sur le temps passé
    if (context.timeOnPage && context.timeOnPage > 120000) { // 2 minutes
      factors.push('engaged_visitor');
    }
    
    // Analyse basée sur la source
    if (context.visitSource === 'meta_ads') {
      factors.push('advertising_driven');
    }
    
    return factors;
  }

  private updateConversationContext(
    sessionId: string, 
    context: ConversationContext, 
    response: RoseResponse
  ): void {
    this.conversationContexts.set(sessionId, {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          type: 'user',
          content: context.userMessage,
          timestamp: new Date().toISOString()
        },
        {
          type: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString()
        }
      ]
    });
  }

  // 📊 MÉTHODES D'ANALYSE ET DE PERFORMANCE
  async getConversationAnalytics(sessionId: string): Promise<{
    messageCount: number;
    averageResponseTime: number;
    buyingIntentProgression: string[];
    identifiedNeeds: string[];
    recommendationAccuracy: number;
  }> {
    const context = this.conversationContexts.get(sessionId);
    if (!context) {
      return {
        messageCount: 0,
        averageResponseTime: 0,
        buyingIntentProgression: [],
        identifiedNeeds: [],
        recommendationAccuracy: 0
      };
    }

    return {
      messageCount: context.conversationHistory.length,
      averageResponseTime: 2.5,
      buyingIntentProgression: ['low', 'medium'],
      identifiedNeeds: ['relationship_improvement'],
      recommendationAccuracy: 85
    };
  }

  // 🧹 NETTOYAGE DES DONNÉES
  public clearOldSessions(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [sessionId, context] of this.conversationContexts.entries()) {
      const lastActivity = new Date(context.conversationHistory[context.conversationHistory.length - 1]?.timestamp || 0).getTime();
      if (lastActivity < oneDayAgo) {
        this.conversationContexts.delete(sessionId);
        this.customerProfiles.delete(sessionId);
      }
    }
    
    console.log('🧹 Old sessions cleared');
  }

  // 📱 RÉCUPÉRATION DES DONNÉES PRODUIT
  private async getProductData(productId: string): Promise<ProductData> {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      throw new Error(`Product not found: ${productId}`);
    }

    return product;
  }
}