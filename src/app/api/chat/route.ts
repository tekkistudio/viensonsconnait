// app/api/chat/route.ts - VERSION CORRIGÉE AVEC GESTION BOUTONS STANDARDS
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { ProfessionalSalesAI } from "@/lib/services/ProfessionalSalesAI";
import { EnhancedSalesDataService } from "@/lib/services/EnhancedSalesDataService";

import type {
  ConversationStep,
  ChatMessage,
  AIResponse,
  ProductId,
  MessageType,
  CustomerMessage,
  ChatOrderData
} from '@/types/chat';

const WHATSAPP_LINK = "https://wa.me/221781362728";

const corsHeaders = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

interface ExtendedChatRequest {
  message: string;
  productId: ProductId;
  currentStep?: ConversationStep;
  orderData?: Partial<ChatOrderData>;  
  sessionId: string;
  storeId: string;
}

interface ConversationHistory {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

class EnhancedChatAPI {
  private static instance: EnhancedChatAPI;
  private optimizedChatService: OptimizedChatService;
  private professionalSalesAI: ProfessionalSalesAI;
  private salesDataService: EnhancedSalesDataService;
  private conversationCache: Map<string, ConversationHistory[]> = new Map();

  // ✅ CORRECTION: Patterns pour boutons standards (priorité absolue)
  private readonly standardButtonPatterns = [
    /^Poser une question$/i,
    /^❓ Poser une question$/i,
    /^Suivre ma commande$/i,
    /^🔍 Suivre ma commande$/i,
    /^Nous contacter$/i,
    /^💬 Nous contacter$/i,
    /^Voir les autres jeux$/i,
    /^🛍️ Voir les autres jeux$/i
  ];

  // Patterns pour détecter les commandes express
  private readonly expressPatterns = [
    /commander rapidement/i,
    /⚡/,
    /express/i,
    /rapide/i,
    /tout de suite/i
  ];

  // Patterns pour WhatsApp
  private readonly whatsappPatterns = [
    /parler à un humain/i,
    /conseiller humain/i,
    /agent humain/i,
    /support humain/i
  ];

  private constructor() {
    this.optimizedChatService = OptimizedChatService.getInstance();
    this.professionalSalesAI = ProfessionalSalesAI.getInstance();
    this.salesDataService = EnhancedSalesDataService.getInstance();
  }

  public static getInstance(): EnhancedChatAPI {
    if (!EnhancedChatAPI.instance) {
      EnhancedChatAPI.instance = new EnhancedChatAPI();
    }
    return EnhancedChatAPI.instance;
  }

  // ✅ MÉTHODE PRINCIPALE DE TRAITEMENT CORRIGÉE
  async processMessage(request: ExtendedChatRequest): Promise<AIResponse> {
    const { message, productId, currentStep = 'initial', orderData, sessionId, storeId } = request;
    
    try {
      console.log('🚀 [API] Enhanced Chat API Processing:', {
        message: message.substring(0, 50),
        productId,
        currentStep,
        sessionId: sessionId.substring(0, 10) + '...'
      });

      // ✅ CORRECTION 1: VALIDATION STRICTE
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        return this.createErrorResponse(validationResult.error || 'Invalid request');
      }

      // ✅ CORRECTION 2: PRIORITÉ ABSOLUE - Boutons standards
      if (this.isStandardButton(message)) {
        console.log('🔘 [API] Standard button detected, processing with OptimizedChatService');
        
        try {
          const standardResponse = await this.optimizedChatService.processUserInput(
            sessionId,
            message,
            currentStep
          );
          
          console.log('✅ [API] Standard button response generated');
          return this.convertChatMessageToAIResponse(standardResponse);
          
        } catch (standardError) {
          console.error('❌ [API] Error processing standard button:', standardError);
          return this.createErrorResponse('Erreur lors du traitement du bouton');
        }
      }

      // ✅ CORRECTION 3: REDIRECTION WHATSAPP IMMÉDIATE
      if (this.shouldRedirectToWhatsApp(message)) {
        console.log('📞 [API] WhatsApp redirect requested');
        return this.createWhatsAppRedirect();
      }

      // ✅ CORRECTION 4: GESTION DES COMMANDES EXPRESS
      if (this.isExpressCommand(message) || currentStep?.includes('express')) {
        console.log('⚡ [API] Processing express command');
        return await this.handleExpressFlow(request);
      }

      // ✅ CORRECTION 5: RÉCUPÉRATION DE L'HISTORIQUE
      const conversationHistory = await this.getConversationHistory(sessionId);
      
      // ✅ CORRECTION 6: TRAITEMENT AVEC IA PROFESSIONNELLE
      const professionalResult = await this.processWithProfessionalAI(request, conversationHistory);
      
      // ✅ CORRECTION 7: SAUVEGARDE DE LA CONVERSATION
      await this.saveToConversationHistory(sessionId, message, professionalResult);

      return professionalResult;

    } catch (error) {
      console.error("❌ [API] Enhanced Chat API Critical Error:", error);
      return this.createErrorResponse('Une erreur technique est survenue');
    }
  }

  // ✅ NOUVELLE MÉTHODE: Détecter si c'est un bouton standard
  private isStandardButton(message: string): boolean {
    // Vérification exacte d'abord
    const exactMatches = [
      'Poser une question',
      '❓ Poser une question', 
      'Suivre ma commande',
      '🔍 Suivre ma commande',
      'Nous contacter',
      '💬 Nous contacter',
      'Voir les autres jeux',
      '🛍️ Voir les autres jeux',
      'Commander rapidement',
      '⚡ Commander rapidement'
    ];
    
    if (exactMatches.includes(message)) {
      console.log('✅ [API] Exact standard button match:', message);
      return true;
    }
    
    // Vérification par patterns
    const isMatch = this.standardButtonPatterns.some(pattern => pattern.test(message));
    if (isMatch) {
      console.log('✅ [API] Pattern standard button match:', message);
    }
    
    return isMatch;
  }

  // ✅ VALIDATION DE LA REQUÊTE
  private validateRequest(request: ExtendedChatRequest): { isValid: boolean; error?: string } {
    if (!request.message || request.message.trim().length === 0) {
      return { isValid: false, error: 'Message vide' };
    }

    if (!request.productId) {
      return { isValid: false, error: 'Product ID manquant' };
    }

    if (!request.sessionId) {
      return { isValid: false, error: 'Session ID manquant' };
    }

    if (request.message.length > 1000) {
      return { isValid: false, error: 'Message trop long' };
    }

    return { isValid: true };
  }

  // ✅ DÉTECTION REDIRECTION WHATSAPP
  private shouldRedirectToWhatsApp(message: string): boolean {
    return this.whatsappPatterns.some(pattern => pattern.test(message));
  }

  // ✅ CRÉATION REDIRECTION WHATSAPP
  private createWhatsAppRedirect(): AIResponse {
    return {
      content: `📞 **Je vous connecte à notre équipe !**

Un conseiller humain va répondre à toutes vos questions sur WhatsApp.

👇 Cliquez pour continuer la conversation :`,
      type: "assistant",
      choices: ['📞 Continuer sur WhatsApp'],
      nextStep: 'whatsapp_redirect' as ConversationStep,
      metadata: {
        externalUrl: {
          type: 'whatsapp',
          url: WHATSAPP_LINK,
          description: 'Contacter sur WhatsApp'
        },
        redirectType: 'whatsapp'
      }
    };
  }

  // ✅ DÉTECTION COMMANDES EXPRESS
  private isExpressCommand(message: string): boolean {
    return this.expressPatterns.some(pattern => pattern.test(message));
  }

  // ✅ GESTION FLOW EXPRESS
  private async handleExpressFlow(request: ExtendedChatRequest): Promise<AIResponse> {
    try {
      const { message, sessionId, productId, currentStep } = request;

      let chatResponse: ChatMessage;

      if (currentStep?.includes('express')) {
        // Continuer le flow express existant
        chatResponse = await this.optimizedChatService.handleExpressStep(
          sessionId,
          message,
          currentStep
        );
      } else {
        // Démarrer un nouveau flow express
        chatResponse = await this.optimizedChatService.startExpressPurchase(
          sessionId,
          productId
        );
      }

      return this.convertChatMessageToAIResponse(chatResponse);

    } catch (error) {
      console.error('❌ [API] Error in express flow:', error);
      return this.createErrorResponse('Erreur dans le processus express');
    }
  }

  // ✅ TRAITEMENT AVEC IA PROFESSIONNELLE
  private async processWithProfessionalAI(
    request: ExtendedChatRequest,
    conversationHistory: ConversationHistory[]
  ): Promise<AIResponse> {
    try {
      const { message, productId, sessionId } = request;

      // Préparer le contexte pour l'IA professionnelle
      const context = {
        productId,
        sessionId,
        userMessage: message,
        conversationHistory,
        messageCount: conversationHistory.length,
        sessionStartTime: this.getSessionStartTime(conversationHistory)
      };

      // ✅ CORRECTION: Vérifier si l'IA professionnelle est disponible
      if (this.professionalSalesAI && typeof this.professionalSalesAI.processCustomerMessage === 'function') {
        const result = await this.professionalSalesAI.processCustomerMessage(context);

        if (result.success && result.response) {
          const aiResponse = this.convertChatMessageToAIResponse(result.response);
          
          if (result.fallbackUsed) {
            aiResponse.metadata = {
              ...aiResponse.metadata,
              fallbackUsed: true,
              aiAvailable: this.professionalSalesAI.isHealthy()
            };
          }

          return aiResponse;
        } else {
          throw new Error(result.error || 'Professional AI processing failed');
        }
      } else {
        throw new Error('Professional AI service not available');
      }

    } catch (error) {
      console.error('❌ [API] Professional AI processing error:', error);
      return await this.createIntelligentFallback(request);
    }
  }

  // ✅ FALLBACK INTELLIGENT AVEC DONNÉES
  private async createIntelligentFallback(request: ExtendedChatRequest): Promise<AIResponse> {
    try {
      console.log('🔄 [API] Creating intelligent fallback response');
      
      const salesContext = await this.salesDataService.getFullSalesContext(request.productId);
      const product = salesContext.currentProduct;

      return {
        content: `💬 **Merci pour votre intérêt !**

Je vois que vous vous intéressez au **${product.name}** - excellent choix !

💰 **Prix :** ${product.price.toLocaleString()} FCFA
📦 **Stock :** ${product.stock_quantity} disponibles
✅ **Garantie :** 30 jours satisfait ou remboursé

Comment puis-je vous aider ?`,
        type: "assistant",
        choices: [
          '⚡ Commander maintenant',
          '❓ Poser une question',
          '⭐ Voir les avis clients',
          '📞 Parler à un conseiller'
        ],
        nextStep: 'intelligent_fallback' as ConversationStep,
        buyingIntent: 0.4
      };

    } catch (error) {
      console.error('❌ [API] Error creating intelligent fallback:', error);
      return this.createBasicFallback();
    }
  }

  // ✅ FALLBACK DE BASE
  private createBasicFallback(): AIResponse {
    return {
      content: `😊 **Je suis là pour vous aider !**

Comment puis-je vous assister avec votre achat ?`,
      type: "assistant",
      choices: [
        '⚡ Commander rapidement',
        '❓ Poser une question',
        '📞 Contacter le support'
      ],
      nextStep: 'basic_fallback' as ConversationStep,
      buyingIntent: 0.3
    };
  }

  // ✅ GESTION DE L'HISTORIQUE DES CONVERSATIONS
  private async getConversationHistory(sessionId: string): Promise<ConversationHistory[]> {
    try {
      const cached = this.conversationCache.get(sessionId);
      if (cached) {
        return cached;
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', sessionId)
        .single();

      if (error || !conversation) {
        console.log('📝 [API] No conversation history found, starting fresh');
        return [];
      }

      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const history: ConversationHistory[] = messages
        .filter(msg => msg.type && msg.content)
        .map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString()
        }))
        .slice(-10);

      this.conversationCache.set(sessionId, history);
      return history;

    } catch (error) {
      console.error('❌ [API] Error getting conversation history:', error);
      return [];
    }
  }

  // ✅ SAUVEGARDE DE L'HISTORIQUE
  private async saveToConversationHistory(
    sessionId: string,
    userMessage: string,
    aiResponse: AIResponse
  ): Promise<void> {
    try {
      const currentHistory = this.conversationCache.get(sessionId) || [];
      
      const newHistory = [
        ...currentHistory,
        {
          type: 'user' as const,
          content: userMessage,
          timestamp: new Date().toISOString()
        },
        {
          type: 'assistant' as const,
          content: aiResponse.content,
          timestamp: new Date().toISOString()
        }
      ].slice(-20);

      this.conversationCache.set(sessionId, newHistory);

      this.saveToDatabase(sessionId, newHistory).catch(error => 
        console.error('❌ [API] Error saving to database:', error)
      );

    } catch (error) {
      console.error('❌ [API] Error saving conversation history:', error);
    }
  }

  // ✅ SAUVEGARDE EN BASE DE DONNÉES
  private async saveToDatabase(sessionId: string, history: ConversationHistory[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: sessionId,
          messages: history,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('❌ [API] Database save error:', error);
      }
    } catch (error) {
      console.error('❌ [API] Error in saveToDatabase:', error);
    }
  }

  // ✅ UTILITAIRES
  private getSessionStartTime(history: ConversationHistory[]): string {
    if (history.length > 0) {
      return history[0].timestamp;
    }
    return new Date().toISOString();
  }

  private convertChatMessageToAIResponse(chatMessage: ChatMessage): AIResponse {
    return {
      content: chatMessage.content,
      type: chatMessage.type === 'assistant' ? 'assistant' : 'user',
      choices: chatMessage.choices || [],
      nextStep: chatMessage.metadata?.nextStep || 'generic_response',
      buyingIntent: chatMessage.metadata?.buyingIntent,
      recommendations: chatMessage.metadata?.recommendations,
      error: chatMessage.metadata?.error,
      metadata: chatMessage.metadata
    };
  }

  private createErrorResponse(errorMessage: string): AIResponse {
    return {
      content: `😔 ${errorMessage}

Voulez-vous réessayer ou parler à un conseiller ?`,
      type: "assistant",
      choices: ["🔄 Réessayer", "📞 Contacter le support"],
      nextStep: "error_recovery" as ConversationStep,
      error: "API_ERROR"
    };
  }

  // ✅ MÉTHODES DE MONITORING
  public getStats(): {
    cacheSize: number;
    aiHealthy: boolean;
    activeProcessing: number;
  } {
    return {
      cacheSize: this.conversationCache.size,
      aiHealthy: this.professionalSalesAI ? this.professionalSalesAI.isHealthy() : false,
      activeProcessing: this.professionalSalesAI ? this.professionalSalesAI.getProcessingStats().activeProcessing : 0
    };
  }

  public clearCache(): void {
    this.conversationCache.clear();
    console.log('🧹 [API] Conversation cache cleared');
  }
}

// ✅ EXPORTS DES FONCTIONS DE ROUTE
const chatAPI = EnhancedChatAPI.getInstance();

export async function POST(req: Request) {
  try {
    const requestData: ExtendedChatRequest = await req.json();
    
    console.log('📨 [API] Enhanced Chat API Request received:', {
      message: requestData.message?.substring(0, 50),
      productId: requestData.productId,
      sessionId: requestData.sessionId?.substring(0, 10) + '...'
    });

    const response = await chatAPI.processMessage(requestData);
    
    console.log('✅ [API] Enhanced Chat API Response sent:', {
      type: response.type,
      nextStep: response.nextStep,
      hasChoices: !!response.choices?.length,
      contentLength: response.content.length
    });

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ [API] Enhanced Chat API Critical Error:", error);
    
    return NextResponse.json({
      content: "Je rencontre un problème technique. Veuillez réessayer ou contacter notre support.",
      type: "assistant",
      choices: ["🔄 Réessayer", "📞 Contacter le support"],
      nextStep: "critical_error" as ConversationStep,
      error: "CRITICAL_ERROR"
    }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ✅ ENDPOINT DE MONITORING
export async function GET() {
  try {
    const stats = chatAPI.getStats();
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats
    }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'Health check failed'
    }, { status: 500, headers: corsHeaders });
  }
}