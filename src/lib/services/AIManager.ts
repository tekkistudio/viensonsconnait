// src/lib/services/AIManager.ts
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { 
  CustomerMessage,
  ChatMessage,
  ConversationStep,
  AIResponse,
  OrderData,
  MessageType
} from '@/features/product/types/chat';
import { PageContext } from '@/types/assistant';
import { PRODUCTS_INFO } from "@/config/products";
import { ErrorManager } from './ErrorManager';
import { ErrorTypes } from '@/constants/errors';
import type { ErrorCategory } from '@/constants/errors';
import { PromptManager } from './PromptManager';
import { supabase } from "@/lib/supabase";

interface MessageHistory {
  content: string;
  type: MessageType;
  timestamp: Date;
}

export class AIManager {
  private static openai: OpenAI;
  private static instance: AIManager;
  private readonly errorManager: ErrorManager;
  private readonly promptManager: PromptManager;
  private messageHistory: Map<string, MessageHistory[]>;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    AIManager.openai = new OpenAI({ apiKey });
    this.errorManager = ErrorManager.getInstance();
    this.promptManager = PromptManager.getInstance();
    this.messageHistory = new Map();
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  async handleProductChatbot(
    message: CustomerMessage,
    productId: string,
    currentStep: ConversationStep = 'initial',
    orderData: Partial<OrderData> = {}
  ): Promise<AIResponse> {
    try {
      const sessionId = this.getSessionId(productId, orderData);
      const history = this.getMessageHistory(sessionId);
      
      this.addToHistory(sessionId, {
        content: message.content,
        type: 'user',
        timestamp: new Date()
      });

      const productInfo = PRODUCTS_INFO[productId];
      const formattedHistory = history.map(msg => ({
        message: msg.content,
        response: msg.type === 'assistant' ? msg.content : ''
      }));

      const systemPrompt = this.promptManager.generateProductPrompt(
        productId,
        this.calculateBuyingIntent(history),
        currentStep,
        formattedHistory
      );
      
      const completion = await AIManager.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.type === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: message.content }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = this.parseAIResponse(completion);
      const enhancedResponse = this.validateAndEnhanceResponse(response, currentStep);

      this.addToHistory(sessionId, {
        content: enhancedResponse.content,
        type: 'assistant',
        timestamp: new Date()
      });

      await this.persistConversation(sessionId, history);

      return enhancedResponse;

    } catch (error) {
      const errorResponse = await this.errorManager.handleError(
        error as Error,
        ErrorTypes.AI_ERROR,
        {
          timestamp: new Date().toISOString(),
          path: 'handleProductChatbot',
          input: { message, productId, currentStep },
          additionalData: { orderData }
        }
      );

      return {
        content: errorResponse.userMessage,
        type: 'assistant',
        choices: errorResponse.choices || ["Réessayer", "Parler à un humain"],
        error: ErrorTypes.AI_ERROR
      };
    }
  }

  async handleDashboardAssistant(
    message: string,
    context: PageContext
  ): Promise<AIResponse> {
    try {
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
      
      const completion = await AIManager.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({
            role: msg.type === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          { role: "user", content: message }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = this.parseAIResponse(completion);
      const enhancedResponse = this.validateAndEnhanceDashboardResponse(response, context);

      this.addToHistory(sessionId, {
        content: enhancedResponse.content,
        type: 'assistant',
        timestamp: new Date()
      });

      await this.persistConversation(sessionId, history);

      return enhancedResponse;

    } catch (error) {
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
        actions: [],
        suggestions: errorResponse.choices || []
      };
    }
  }

  private parseAIResponse(completion: any): any {
    try {
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }
      
      const parsedResponse = JSON.parse(responseText);
      if (!parsedResponse.message) {
        throw new Error('Invalid response structure');
      }

      return parsedResponse;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private validateAndEnhanceResponse(response: any, currentStep: ConversationStep): AIResponse {
    if (!response.message || typeof response.message !== 'string') {
      throw new Error('Invalid message in AI response');
    }

    const choices = Array.isArray(response.choices) 
      ? response.choices.filter((choice: unknown): choice is string => typeof choice === 'string')
      : [];

    return {
      content: response.message,
      type: 'assistant',
      choices: choices,
      nextStep: response.nextStep || currentStep,
      recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
      buyingIntent: typeof response.buyingIntent === 'number' ? response.buyingIntent : 0,
      error: response.error
    };
  }

  private validateAndEnhanceDashboardResponse(response: any, context: PageContext): AIResponse {
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
  }

  private getSessionId(productId: string, orderData: Partial<OrderData>): string {
    return `${productId}_${orderData.phone || Date.now()}`;
  }

  private getMessageHistory(sessionId: string): MessageHistory[] {
    return this.messageHistory.get(sessionId) || [];
  }

  private addToHistory(sessionId: string, message: MessageHistory): void {
    const history = this.getMessageHistory(sessionId);
    history.push(message);
    this.messageHistory.set(sessionId, history.slice(-10));
  }

  private calculateBuyingIntent(history: MessageHistory[]): number {
    const buyingIntentKeywords = [
      "acheter", "commander", "prix", "payer",
      "livraison", "intéressé", "prendre"
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
      console.error('Failed to persist conversation:', error);
    }
  }
}