// src/lib/services/ConversationManager.ts
import { supabase } from "@/lib/supabase";
import { 
  ConversationStep,
  ProductId,
  ChatMessage,
  OrderData,
  MessageType
} from '@/features/product/types/chat';

interface BuyingIntentTrigger {
  score: number;
  triggers: string[];
}

interface ConversationContext {
  currentStep: ConversationStep;
  productId: ProductId;
  buyingIntent: number;
  lastMessages: ChatMessage[];
  orderData?: Partial<OrderData>;
  userPreferences?: {
    language?: string;
    priceContext?: string;
    concerns?: string[];
  };
  sessionData: {
    startTime: string;
    messageCount: number;
    lastInteraction: string;
    source?: string;
  };
}

interface ConversationAnalysis {
  buyingIntent: number;
  mainConcerns: string[];
  topQuestions: string[];
  readyToBuy: boolean;
  needsMoreInfo: boolean;
  suggestedNextStep: ConversationStep;
}

export class ConversationManager {
  private static instance: ConversationManager;
  private activeConversations: Map<string, ConversationContext>;

  private readonly buyingIntentKeywords = {
    high: {
      score: 0.3,
      triggers: [
        "acheter", "commander", "payer", "prix",
        "je prends", "je veux", "livraison"
      ]
    },
    medium: {
      score: 0.2,
      triggers: [
        "intéressé", "possible", "peut-être",
        "réfléchir", "comparer", "différence"
      ]
    },
    low: {
      score: 0.1,
      triggers: [
        "information", "question", "comprendre",
        "comment", "expliquer", "exemple"
      ]
    }
  };

  private readonly commonConcerns = {
    price: ["cher", "prix", "coût", "budget", "promotion"],
    quality: ["qualité", "durable", "solide", "matériau"],
    delivery: ["livraison", "délai", "expédition", "quand"],
    trust: ["garantie", "retour", "confiance", "sécurité"]
  };

  private constructor() {
    this.activeConversations = new Map();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  async createOrUpdateContext(
    sessionId: string,
    productId: ProductId,
    message: ChatMessage
  ): Promise<ConversationContext> {
    // Récupérer ou initialiser le contexte
    let context = this.activeConversations.get(sessionId);
  
    // Si le contexte n'existe pas, créer un nouveau
    if (!context) {
      context = {
        currentStep: 'initial',
        productId,
        buyingIntent: 0,
        lastMessages: [],
        sessionData: {
          startTime: new Date().toISOString(),
          messageCount: 0,
          lastInteraction: new Date().toISOString()
        }
      };
      this.activeConversations.set(sessionId, context);
    }
  
    // Mettre à jour les messages et les données de session
    const updatedMessages = [...context.lastMessages];
    updatedMessages.push(message);
    context.lastMessages = updatedMessages.slice(-5); // Garder les 5 derniers messages
  
    // Mettre à jour les statistiques de session
    context.sessionData = {
      ...context.sessionData,
      messageCount: context.sessionData.messageCount + 1,
      lastInteraction: new Date().toISOString()
    };
  
    // Analyser le message et mettre à jour le contexte
    const messageContent = typeof message.content === 'string' 
      ? message.content 
      : String(message.content);
      
    const analysis = this.analyzeMessage(messageContent, context);
    
    // Mettre à jour l'intention d'achat et l'étape actuelle
    context.buyingIntent = Math.max(context.buyingIntent, analysis.buyingIntent);
    context.currentStep = analysis.suggestedNextStep;
  
    // Persister le contexte mis à jour
    try {
      await this.persistContext(sessionId, context);
    } catch (error) {
      console.error('Error persisting context:', error);
    }
  
    return context;
  }

  private analyzeMessage(message: string, context: ConversationContext): ConversationAnalysis {
    const lowerMessage = message.toLowerCase();
    let buyingIntent = 0;
    const concerns: string[] = [];

    // Analyser l'intention d'achat
    const words = lowerMessage.split(' ');
    for (const word of words) {
      if (this.buyingIntentKeywords.high.triggers.includes(word)) {
        buyingIntent += this.buyingIntentKeywords.high.score;
      }
      if (this.buyingIntentKeywords.medium.triggers.includes(word)) {
        buyingIntent += this.buyingIntentKeywords.medium.score;
      }
      if (this.buyingIntentKeywords.low.triggers.includes(word)) {
        buyingIntent += this.buyingIntentKeywords.low.score;
      }
    }

    // Identifier les préoccupations
    for (const [category, keywords] of Object.entries(this.commonConcerns)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        concerns.push(category);
      }
    }

    const readyToBuy = buyingIntent > 0.7;
    const needsMoreInfo = concerns.length > 0;
    
    return {
      buyingIntent: Math.min(buyingIntent, 1),
      mainConcerns: concerns,
      topQuestions: this.extractQuestions(lowerMessage),
      readyToBuy,
      needsMoreInfo,
      suggestedNextStep: this.determineNextStep(context.currentStep, {
        buyingIntent,
        concerns,
        readyToBuy,
        needsMoreInfo
      })
    };
  }

  private extractQuestions(message: string): string[] {
    return message
      .split(/[.!?]/)
      .filter(sentence => 
        sentence.trim().toLowerCase().startsWith('comment') ||
        sentence.trim().toLowerCase().startsWith('pourquoi') ||
        sentence.trim().toLowerCase().startsWith('quand') ||
        sentence.trim().toLowerCase().startsWith('où') ||
        sentence.trim().toLowerCase().startsWith('combien')
      );
  }

  private determineNextStep(
    currentStep: ConversationStep,
    analysis: {
      buyingIntent: number;
      concerns: string[];
      readyToBuy: boolean;
      needsMoreInfo: boolean;
    }
  ): ConversationStep {
    if (analysis.readyToBuy && currentStep === 'initial') {
      return 'contact-info';
    }

    if (analysis.needsMoreInfo && currentStep === 'initial') {
      return 'description';
    }

    return currentStep;
  }

  private async persistContext(
    sessionId: string,
    context: ConversationContext
  ): Promise<void> {
    try {
      await supabase
        .from('conversation_contexts')
        .upsert({
          session_id: sessionId,
          context: context,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to persist conversation context:', error);
    }
  }

  async getContext(sessionId: string): Promise<ConversationContext | null> {
    return this.activeConversations.get(sessionId) || null;
  }

  async endConversation(sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (context) {
      await this.persistContext(sessionId, {
        ...context,
        sessionData: {
          ...context.sessionData,
          lastInteraction: new Date().toISOString()
        }
      });
      this.activeConversations.delete(sessionId);
    }
  }
}