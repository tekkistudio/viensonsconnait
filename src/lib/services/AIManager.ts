// src/lib/services/AIManager.ts - VERSION COMPLÈTE CORRIGÉE
import { ErrorManager } from './ErrorManager';
import { PromptManager } from './PromptManager';
import { supabase } from "@/lib/supabase";
import { config } from '@/lib/config';
import OpenAI from "openai";
import type { 
  CustomerMessage,
  ChatMessage,
  ConversationStep,
  AIResponse,
  OrderData,
  MessageType
} from '@/types/chat';
import type { PageContext } from '@/types/assistant';
import { ErrorTypes } from '@/constants/errors';

const isServer = typeof window === 'undefined';
let openai: OpenAI | null = null;

// ✅ CORRECTION: Initialiser OpenAI avec GPT-4o
function initializeOpenAI() {
  if (isServer && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ AIManager: OpenAI initialized with GPT-4o');
  }
}

interface MessageHistory {
  content: string;
  type: MessageType;
  timestamp: Date;
}

export class AIManager {
  private static instance: AIManager | null = null;
  private readonly errorManager: ErrorManager;
  private readonly promptManager: PromptManager;
  private messageHistory: Map<string, MessageHistory[]>;

  private constructor() {
    this.errorManager = ErrorManager.getInstance();
    this.promptManager = PromptManager.getInstance();
    this.messageHistory = new Map();
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

  private async ensureOpenAI(): Promise<OpenAI> {
    if (!openai) {
      if (!isServer) {
        console.error('❌ OpenAI is only available on the server');
        throw new Error('OpenAI is only available on the server');
      }
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OpenAI API key is not configured');
        throw new Error('OpenAI API key is not configured');
      }
      initializeOpenAI();
      if (!openai) {
        throw new Error('Failed to initialize OpenAI');
      }
    }
    return openai;
  }

  // ✅ MÉTHODE PRINCIPALE POUR LE CHATBOT PRODUIT
  async handleProductChatbot(
    message: CustomerMessage,
    productId: string,
    currentStep: ConversationStep = 'initial',
    orderData: Partial<OrderData> = {}
  ): Promise<AIResponse> {
    try {
      console.log('🤖 AIManager processing:', {
        message: message.content.substring(0, 50),
        productId,
        currentStep
      });

      // Liste des choix prédéfinis qui ne nécessitent pas l'IA
      const predefinedChoices = [
        'Je veux l\'acheter maintenant',
        'Je veux voir les témoignages',
        'Comment y jouer ?',
        'Je veux en savoir plus',
        'Voir la description du jeu',
        'Voir les témoignages',
        'Parler à un humain',
        'Commander rapidement',
        '⚡'
      ];
  
      // Si c'est un choix prédéfini, on retourne directement sans utiliser l'IA
      if (predefinedChoices.some(choice => message.content.includes(choice))) {
        console.log('📋 Predefined choice detected, skipping AI');
        return {
          content: '', // Sera géré par OptimizedChatService
          type: 'assistant',
          choices: [],
          nextStep: currentStep
        };
      }
  
      // Si nous sommes côté client, utiliser l'API route
      if (!isServer) {
        return this.handleClientSideChat(message, productId, currentStep, orderData);
      }
  
      // Ne pas utiliser l'IA pour les réponses prédéfinies
      if (currentStep === 'description' || 
          currentStep === 'testimonials' || 
          currentStep === 'game_rules' ||
          currentStep === 'initial') {
        console.log('📄 Standard step, skipping AI');
        return {
          content: '', // Sera géré par ChatService
          type: 'assistant',
          choices: [],
          nextStep: currentStep
        };
      }
  
      // À partir d'ici, on sait qu'on a besoin de l'IA
      console.log('🚀 Starting AI processing with GPT-4o:', { message: message.content, currentStep });
  
      const sessionId = this.getSessionId(productId, orderData);
      const history = this.getMessageHistory(sessionId);
      
      this.addToHistory(sessionId, {
        content: message.content,
        type: 'user',
        timestamp: new Date()
      });
  
      const systemPrompt = await this.promptManager.generateProductPrompt(
        productId,
        this.calculateBuyingIntent(history),
        currentStep,
        history.map(msg => ({
          message: msg.content,
          response: msg.type === 'assistant' ? msg.content : ''
        }))
      );
  
      console.log('🤖 System prompt generated, sending to GPT-4o');
  
      const ai = await this.ensureOpenAI();
      const completion = await ai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.type === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: 'user', content: message.content }
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });
  
      console.log('✅ GPT-4o response received:', completion.choices[0]?.message);
  
      if (!completion.choices[0]?.message?.content) {
        throw new Error('Empty response from GPT-4o');
      }
  
      const parsedResponse = this.parseAIResponse(completion.choices[0].message);
      const enhancedResponse = this.validateAndEnhanceResponse(parsedResponse, currentStep);
      
      // Ajouter la réponse à l'historique
      this.addToHistory(sessionId, {
        content: enhancedResponse.content,
        type: 'assistant',
        timestamp: new Date()
      });

      return enhancedResponse;
  
    } catch (error) {
      console.error('❌ AIManager chatbot error:', error);
      return {
        content: "Je suis désolée, j'ai du mal à comprendre. Puis-je vous rediriger vers un conseiller ?",
        type: 'assistant',
        choices: ["🔄 Réessayer", "📞 Parler à un conseiller", "⚡ Commander quand même"],
        nextStep: currentStep,
        error: ErrorTypes.AI_ERROR
      };
    }
  }

  // ✅ GESTION CÔTÉ CLIENT
  private async handleClientSideChat(
    message: CustomerMessage,
    productId: string,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>
  ): Promise<AIResponse> {
    try {
      console.log('📡 Sending chat request to API:', {
        message: message.content,
        productId,
        currentStep
      });
  
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.content,
          productId,
          currentStep,
          orderData,
          sessionId: orderData.session_id || Date.now().toString(),
          storeId: orderData.metadata?.storeId || ''
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Chat API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error('Chat API request failed');
      }
  
      const data = await response.json();
      console.log('✅ Chat API response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in handleClientSideChat:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE POUR LE DASHBOARD
  async handleDashboardAssistant(
    message: string,
    context: PageContext
  ): Promise<AIResponse> {
    try {
      // Si nous sommes côté client, utiliser l'API route
      if (!isServer) {
        const response = await fetch('/api/dashboard/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            context
          }),
        });

        if (!response.ok) {
          throw new Error('Dashboard assistant API request failed');
        }

        return response.json();
      }

      const ai = await this.ensureOpenAI();
      const sessionId = `dashboard_${context.page}_${Date.now()}`;
      const history = this.getMessageHistory(sessionId);

      const systemPrompt = this.promptManager.generateDashboardPrompt(
        context,
        history
          .filter(msg => msg.type === 'assistant' || msg.type === 'user')
          .map(msg => ({
            content: msg.content,
            type: msg.type as 'assistant' | 'user' 
          }))
      );

      console.log('🤖 System prompt generated for dashboard');

      const completion = await ai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.type === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('Empty response from GPT-4o');
      }

      const parsedResponse = this.parseAIResponse(completion.choices[0].message);
      const enhancedResponse = this.validateAndEnhanceDashboardResponse(parsedResponse, context);

      this.addToHistory(sessionId, {
        content: enhancedResponse.content,
        type: 'assistant',
        timestamp: new Date()
      });

      await this.persistConversation(sessionId, history);

      return enhancedResponse;

    } catch (error) {
      console.error('❌ Dashboard assistant error:', error);
      const errorResponse = await this.errorManager.handleError(
        error as Error,
        ErrorTypes.AI_ERROR,
        {
          timestamp: new Date().toISOString(),
          path: 'handleDashboardAssistant',
          input: { message, context }
        }
      );

      return {
        content: errorResponse.userMessage,
        type: 'assistant',
        insights: [],
        actions: {
          showCart: false,
          showProduct: false,
          triggerUpsell: false,
          showTestimonials: false,
          redirectWhatsApp: false
        },
        suggestions: errorResponse.choices || []
      };
    }
  }

  // ✅ MÉTHODES UTILITAIRES
  private parseAIResponse(completion: any): any {
    try {
      if (!completion.content) {
        throw new Error('Empty response from AI');
      }
      
      console.log('📝 Parsing AI response:', completion.content);
      
      const parsedResponse = JSON.parse(completion.content);
      if (!parsedResponse.message) {
        throw new Error('Invalid response structure');
      }

      return parsedResponse;
    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private validateAndEnhanceResponse(response: any, currentStep: ConversationStep): AIResponse {
    try {
      console.log('✅ Validating and enhancing response:', response);

      if (!response.message || typeof response.message !== 'string') {
        throw new Error('Invalid message in AI response');
      }

      const choices = Array.isArray(response.choices) 
        ? response.choices.filter((choice: unknown): choice is string => typeof choice === 'string')
        : [];

      return {
        content: response.message,
        type: 'assistant',
        choices: choices.length > 0 ? choices : ["⚡ Commander maintenant", "❓ En savoir plus", "📞 Parler à un conseiller"],
        nextStep: response.nextStep || currentStep,
        recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
        buyingIntent: typeof response.buyingIntent === 'number' ? response.buyingIntent : 0,
        error: response.error
      };
    } catch (error) {
      console.error('❌ Error in validateAndEnhanceResponse:', error);
      throw error;
    }
  }

  private validateAndEnhanceDashboardResponse(response: any, context: PageContext): AIResponse {
    try {
      console.log('✅ Validating dashboard response:', response);

      if (!response.message || typeof response.message !== 'string') {
        throw new Error('Invalid message in AI response');
      }

      const insights = Array.isArray(response.insights) 
        ? response.insights.filter((insight: unknown): insight is string => typeof insight === 'string')
        : [];
      
      const actions = Array.isArray(response.actions)
        ? response.actions.filter((action: unknown): action is string => typeof action === 'string')
        : [];

      const suggestions = Array.isArray(response.suggestions)
        ? response.suggestions.filter((suggestion: unknown): suggestion is string => typeof suggestion === 'string')
        : [];

      return {
        content: response.message,
        type: 'assistant',
        insights: insights,
        actions: actions,
        suggestions: suggestions
      };
    } catch (error) {
      console.error('❌ Error in validateAndEnhanceDashboardResponse:', error);
      throw error;
    }
  }

  private getSessionId(productId: string, orderData: Partial<OrderData>): string {
    return `${productId}_${orderData.phone || Date.now()}`;
  }

  private getMessageHistory(sessionId: string): MessageHistory[] {
    return this.messageHistory.get(sessionId) || [];
  }

  private addToHistory(sessionId: string, message: MessageHistory): void {
    try {
      const history = this.getMessageHistory(sessionId);
      const updatedHistory = [...history, message].slice(-5); 
      this.messageHistory.set(sessionId, updatedHistory);
    } catch (error) {
      console.error('❌ Error adding to history:', error);
      this.messageHistory.set(sessionId, [message]);
    }
  }

  private calculateBuyingIntent(history: MessageHistory[]): number {
    const buyingIntentKeywords = [
      "acheter", "commander", "prix", "payer",
      "livraison", "intéressé", "prendre", "cadeau"
    ];

    return Math.min(1, history
      .filter(msg => msg.type === 'user')
      .reduce((intent, msg) => {
        const matches = buyingIntentKeywords.filter(keyword => 
          msg.content.toLowerCase().includes(keyword)
        ).length;
        return intent + (matches * 0.2);
      }, 0));
  }

  private async persistConversation(sessionId: string, history: MessageHistory[]): Promise<void> {
    try {
      await supabase.from('conversations').upsert({
        session_id: sessionId,
        messages: history,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to persist conversation:', error);
    }
  }
}