// src/lib/services/ProfessionalSalesAI.ts - IA VENDEUSE PROFESSIONNELLE
import OpenAI from 'openai';
import { EnhancedSalesDataService } from './EnhancedSalesDataService';
import { ProfessionalSalesPromptService } from './ProfessionalSalesPromptService';
import type { ChatMessage, ConversationStep, AIResponse } from '@/types/chat';

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
  messageCount: number;
  sessionStartTime: string;
}

interface ProcessingResult {
  success: boolean;
  response?: ChatMessage;
  error?: string;
  fallbackUsed?: boolean;
}

export class ProfessionalSalesAI {
  private static instance: ProfessionalSalesAI;
  private salesDataService: EnhancedSalesDataService;
  private promptService: ProfessionalSalesPromptService;
  private openaiClient: OpenAI | null = null;
  private processingQueue: Map<string, boolean> = new Map();

  private constructor() {
    this.salesDataService = EnhancedSalesDataService.getInstance();
    this.promptService = ProfessionalSalesPromptService.getInstance();
    
    // Initialiser OpenAI si disponible
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✅ Professional Sales AI initialized with GPT-4o');
    } else {
      console.warn('⚠️ OpenAI API key not found - using fallback responses');
    }
  }

  public static getInstance(): ProfessionalSalesAI {
    if (!this.instance) {
      this.instance = new ProfessionalSalesAI();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE - TRAITEMENT IA PROFESSIONNELLE
  async processCustomerMessage(context: ConversationContext): Promise<ProcessingResult> {
    const { sessionId, userMessage } = context;
    
    try {
      // Éviter les traitements en double
      if (this.processingQueue.get(sessionId)) {
        console.log('⏳ Processing already in progress for session:', sessionId);
        return { success: false, error: 'Processing in progress' };
      }

      this.processingQueue.set(sessionId, true);
      console.log('🎯 Professional Sales AI processing message:', userMessage.substring(0, 50));

      // Analyser si le message nécessite l'IA professionnelle
      const requiresProfessionalAI = this.shouldUseProfessionalAI(userMessage, context);
      
      if (!requiresProfessionalAI) {
        console.log('📋 Standard response path chosen');
        return await this.generateStandardResponse(context);
      }

      // Traitement avec IA professionnelle
      return await this.processWithProfessionalAI(context);

    } catch (error) {
      console.error('❌ Error in Professional Sales AI:', error);
      return await this.generateFallbackResponse(context, error);
    } finally {
      this.processingQueue.delete(sessionId);
    }
  }

  // ✅ DÉTERMINER SI L'IA PROFESSIONNELLE EST NÉCESSAIRE
  private shouldUseProfessionalAI(message: string, context: ConversationContext): boolean {
    const professionalAITriggers = [
      // Questions complexes
      /pourquoi/i,
      /comment ça marche/i,
      /est-ce que ça fonctionne/i,
      /vraiment efficace/i,
      
      // Objections
      /trop cher/i,
      /pas sûr/i,
      /doute/i,
      /hésit/i,
      /budget/i,
      
      // Comparaisons
      /autres produits/i,
      /concurrence/i,
      /comparaison/i,
      /différence/i,
      
      // Questions spécifiques
      /témoignages/i,
      /avis/i,
      /livraison/i,
      /garantie/i,
      /retour/i,
      
      // Messages longs et complexes
      /^.{50,}/,
      
      // Questions multiples
      /\?.*\?/,
      
      // Expressions d'intérêt avec nuances
      /j'aimerais savoir/i,
      /pouvez-vous m'expliquer/i,
      /je me demande/i
    ];

    // Vérifier les patterns de complexité
    const isComplexMessage = professionalAITriggers.some(pattern => pattern.test(message));
    
    // Messages répétés ou conversation longue = besoin d'expertise
    const needsExpertise = context.messageCount > 5;
    
    // Toujours utiliser l'IA pour les questions ouvertes
    const isOpenQuestion = message.includes('?') && !this.isPredefinedChoice(message);

    return isComplexMessage || needsExpertise || isOpenQuestion;
  }

  // ✅ VÉRIFIER SI C'EST UN CHOIX PRÉDÉFINI
  private isPredefinedChoice(message: string): boolean {
    const predefinedChoices = [
      'Commander rapidement', '⚡ Commander maintenant', 'Poser une question',
      'Infos livraison', 'En savoir plus', 'Voir les témoignages',
      'Comment y jouer', 'C\'est pour qui', 'Quels bénéfices', 'Avis clients'
    ];
    
    return predefinedChoices.some(choice => message.includes(choice));
  }

  // ✅ TRAITEMENT AVEC IA PROFESSIONNELLE
  private async processWithProfessionalAI(context: ConversationContext): Promise<ProcessingResult> {
    try {
      if (!this.openaiClient) {
        console.log('⚠️ OpenAI not available, using enhanced fallback');
        return await this.generateEnhancedFallback(context);
      }

      // Préparer le contexte de conversation
      const chatContext = {
        userMessage: context.userMessage,
        conversationHistory: context.conversationHistory,
        userIntent: this.analyzeUserIntent(context.userMessage),
        messageCount: context.messageCount,
        mentionedConcerns: this.extractConcerns(context.userMessage),
        previousTopics: this.extractTopics(context.conversationHistory),
        sessionLength: Date.now() - new Date(context.sessionStartTime).getTime()
      };

      // Générer le prompt professionnel
      const systemPrompt = await this.promptService.generateProfessionalSalesPrompt(
        context.productId,
        chatContext
      );

      console.log('🤖 Sending to GPT-4o with professional sales prompt');

      // Appel à GPT-4o avec prompt optimisé
      const completion = await this.openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...context.conversationHistory.slice(-3).map(msg => ({
            role: msg.type === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: 'user', content: context.userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const rawResponse = completion.choices[0]?.message?.content;
      if (!rawResponse) {
        throw new Error('Empty response from GPT-4o');
      }

      console.log('✅ Professional AI response received');

      // Parser et valider la réponse
      const parsedResponse = this.parseAndValidateAIResponse(rawResponse);
      const professionalResponse = this.enhanceAIResponse(parsedResponse, context);

      return { success: true, response: professionalResponse };

    } catch (error) {
      console.error('❌ Error in professional AI processing:', error);
      return await this.generateEnhancedFallback(context);
    }
  }

  // ✅ PARSER ET VALIDER LA RÉPONSE AI
  private parseAndValidateAIResponse(rawResponse: string): any {
    try {
      const parsed = JSON.parse(rawResponse);
      
      // Validation des champs obligatoires
      if (!parsed.message || typeof parsed.message !== 'string') {
        throw new Error('Invalid message field');
      }
      
      if (!Array.isArray(parsed.choices) || parsed.choices.length === 0) {
        parsed.choices = ['⚡ Commander maintenant', '❓ Autre question', '📞 Contacter le support'];
      }
      
      // Validation du nextStep
      if (!parsed.nextStep || typeof parsed.nextStep !== 'string') {
        parsed.nextStep = 'generic_response';
      }
      
      // Validation du buyingIntent
      if (typeof parsed.buyingIntent !== 'number' || parsed.buyingIntent < 0 || parsed.buyingIntent > 1) {
        parsed.buyingIntent = 0.5;
      }

      return parsed;
    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  // ✅ AMÉLIORER LA RÉPONSE AI
  private enhanceAIResponse(parsedResponse: any, context: ConversationContext): ChatMessage {
    return {
      type: 'assistant',
      content: parsedResponse.message,
      choices: parsedResponse.choices,
      assistant: {
        name: 'Rose',
        title: 'Vendeuse Professionnelle'
      },
      metadata: {
        nextStep: parsedResponse.nextStep as ConversationStep,
        buyingIntent: parsedResponse.buyingIntent,
        salesTechnique: parsedResponse.salesTechnique,
        urgencyLevel: parsedResponse.urgencyLevel,
        flags: {
          professionalAIUsed: true,
          aiConfidence: 0.85
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ RÉPONSE STANDARD POUR BOUTONS PRÉDÉFINIS
  private async generateStandardResponse(context: ConversationContext): Promise<ProcessingResult> {
    try {
      const { userMessage, productId } = context;
      
      // Récupérer les données produit de base
      const salesContext = await this.salesDataService.getFullSalesContext(productId);
      const product = salesContext.currentProduct;

      let response: ChatMessage;

      if (userMessage.includes('En savoir plus') || userMessage.includes('💬')) {
        response = {
          type: 'assistant',
          content: `💬 **En savoir plus sur le jeu ${product.name}**

${product.description || 'Ce jeu a été conçu pour renforcer les relations et améliorer la communication.'}

🎯 **Caractéristiques :**
• Prix : **${product.price.toLocaleString()} FCFA**
• Stock : ${product.stock_quantity} disponibles
• Livraison incluse selon votre zone

Que souhaitez-vous savoir d'autre ?`,
          choices: [
            '⚡ Commander maintenant',
            '❓ Comment y jouer ?',
            '⭐ Voir les avis clients'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'product_info_detailed' as ConversationStep,
            flags: { standardResponse: true }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Réponse générique améliorée
        response = {
          type: 'assistant',
          content: `✨ **Merci pour votre intérêt !**

Je vois que vous vous intéressez au jeu **${product.name}**. Excellent choix !

Comment puis-je vous aider davantage ?`,
          choices: [
            '⚡ Commander maintenant',
            '❓ Comment ça marche ?',
            '📞 Poser une question libre'
          ],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
          metadata: {
            nextStep: 'standard_engagement' as ConversationStep,
            flags: { standardResponse: true }
          },
          timestamp: new Date().toISOString()
        };
      }

      return { success: true, response };

    } catch (error) {
      console.error('❌ Error generating standard response:', error);
      return await this.generateFallbackResponse(context, error);
    }
  }

  // ✅ FALLBACK AMÉLIORÉ AVEC DONNÉES RÉELLES
  private async generateEnhancedFallback(context: ConversationContext): Promise<ProcessingResult> {
    try {
      console.log('🔄 Generating enhanced fallback response');
      
      const salesContext = await this.salesDataService.getFullSalesContext(context.productId);
      const product = salesContext.currentProduct;
      const stats = salesContext.salesStats;

      const fallbackResponse: ChatMessage = {
        type: 'assistant',
        content: `💬 **Merci pour votre question !**

Je vois que vous vous intéressez au **${product.name}** - c'est fantastique !

🔥 **Pourquoi nos clients l'adorent :**
• **${stats.totalOrders} familles** l'ont déjà adopté
• **${product.price.toLocaleString()} FCFA** pour des années d'utilisation
• **Garantie 30 jours** satisfait ou remboursé

Que puis-je vous expliquer en détail ?`,
        choices: [
          '⚡ Commander maintenant',
          '❓ Comment ça fonctionne ?',
          '⭐ Témoignages clients',
          '📞 Parler à un conseiller'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'enhanced_fallback' as ConversationStep,
          flags: { fallbackUsed: true, dataEnhanced: true }
        },
        timestamp: new Date().toISOString()
      };

      return { success: true, response: fallbackResponse, fallbackUsed: true };

    } catch (error) {
      console.error('❌ Error in enhanced fallback:', error);
      return await this.generateFallbackResponse(context, error);
    }
  }

  // ✅ FALLBACK DE BASE
  private async generateFallbackResponse(context: ConversationContext, error: any): Promise<ProcessingResult> {
    console.log('🔄 Generating basic fallback response due to error:', error);

    const basicFallback: ChatMessage = {
      type: 'assistant',
      content: `😊 **Merci pour votre message !**

Je suis là pour vous aider avec votre achat. 

Comment puis-je vous assister ?`,
      choices: [
        '⚡ Commander rapidement',
        '❓ Poser une question',
        '📞 Parler à un humain'
      ],
      assistant: { name: 'Rose', title: 'Assistante d\'achat' },
      metadata: {
        nextStep: 'basic_fallback' as ConversationStep,
        flags: { basicFallback: true, error: true }
      },
      timestamp: new Date().toISOString()
    };

    return { success: true, response: basicFallback, fallbackUsed: true };
  }

  // ✅ MÉTHODES D'ANALYSE
  private analyzeUserIntent(message: string): 'browsing' | 'interested' | 'considering' | 'ready_to_buy' | 'objecting' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('acheter') || lowerMessage.includes('commander')) {
      return 'ready_to_buy';
    }
    if (lowerMessage.includes('cher') || lowerMessage.includes('doute')) {
      return 'objecting';
    }
    if (lowerMessage.includes('intéresse') || lowerMessage.includes('comment')) {
      return 'interested';
    }
    if (lowerMessage.includes('peut-être') || lowerMessage.includes('réfléchir')) {
      return 'considering';
    }
    
    return 'browsing';
  }

  private extractConcerns(message: string): string[] {
    const concerns = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('prix') || lowerMessage.includes('cher')) {
      concerns.push('price_concern');
    }
    if (lowerMessage.includes('livraison') || lowerMessage.includes('délai')) {
      concerns.push('delivery_concern');
    }
    if (lowerMessage.includes('qualité') || lowerMessage.includes('marche')) {
      concerns.push('quality_concern');
    }
    
    return concerns;
  }

  private extractTopics(history: Array<{type: string; content: string}>): string[] {
    const topics = new Set<string>();
    
    history.forEach(msg => {
      const content = msg.content.toLowerCase();
      if (content.includes('prix')) topics.add('pricing');
      if (content.includes('livraison')) topics.add('delivery');
      if (content.includes('témoignage')) topics.add('testimonials');
      if (content.includes('comment')) topics.add('usage');
    });
    
    return Array.from(topics);
  }

  // ✅ MÉTHODES UTILITAIRES
  public isHealthy(): boolean {
    return this.openaiClient !== null;
  }

  public getProcessingStats(): {
    activeProcessing: number;
    totalProcessed: number;
    aiAvailable: boolean;
  } {
    return {
      activeProcessing: this.processingQueue.size,
      totalProcessed: 0, // À implémenter si nécessaire
      aiAvailable: this.openaiClient !== null
    };
  }

  public clearProcessingQueue(): void {
    this.processingQueue.clear();
    console.log('🧹 Processing queue cleared');
  }

  // ✅ MÉTHODE POUR TESTER LA QUALITÉ DES RÉPONSES
  public async validateResponseQuality(response: ChatMessage): Promise<{
    isValid: boolean;
    score: number;
    issues: string[];
  }> {
    const issues = [];
    let score = 100;

    // Vérifier la longueur du contenu
    if (response.content.length < 50) {
      issues.push('Content too short');
      score -= 20;
    }
    if (response.content.length > 800) {
      issues.push('Content too long');
      score -= 10;
    }

    // Vérifier la présence de choix
    if (!response.choices || response.choices.length === 0) {
      issues.push('No choices provided');
      score -= 30;
    }

    // Vérifier la présence d'un appel à l'action
    const hasCallToAction = response.choices?.some(choice => 
      choice.includes('Commander') || choice.includes('⚡')
    );
    if (!hasCallToAction) {
      issues.push('No call to action');
      score -= 15;
    }

    // Vérifier la structure des métadonnées
    if (!response.metadata?.nextStep) {
      issues.push('Missing nextStep');
      score -= 10;
    }

    return {
      isValid: score >= 60,
      score: Math.max(0, score),
      issues
    };
  }
}