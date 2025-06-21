// src/app/api/chat/route.ts - VERSION CORRIGÉE AVEC BONNE MÉTHODE
import { NextRequest, NextResponse } from "next/server";
import { RoseAIEngine } from "@/lib/services/RoseAIEngine";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import type { ConversationStep, ChatMessage } from '@/types/chat';

// 🔧 CONFIGURATION CORS
const corsHeaders = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// 📝 INTERFACES DE REQUEST/RESPONSE
interface ChatRequest {
  message: string;
  productId: string;
  currentStep?: ConversationStep;
  orderData?: any;
  sessionId: string;
  storeId: string;
  visitSource?: 'meta_ads' | 'organic' | 'direct' | 'social';
  timeOnPage?: number;
}

interface ChatResponse {
  success: boolean;
  message: string;
  choices: string[];
  nextStep: ConversationStep;
  type: 'assistant';
  intent?: string;
  confidence?: number;
  productRecommendations?: any[];
  upsellSuggestion?: any;
  actions?: {
    showCart?: boolean;
    showProduct?: boolean;
    triggerUpsell?: boolean;
    showTestimonials?: boolean;
    redirectWhatsApp?: boolean;
  };
  orderData?: any;
  error?: string;
}

// 🚀 CLASSE PRINCIPALE DU CHAT API
class OptimizedChatAPI {
  private static instance: OptimizedChatAPI;
  private roseAI: RoseAIEngine;
  private chatService: OptimizedChatService;

  private constructor() {
    this.roseAI = RoseAIEngine.getInstance();
    this.chatService = OptimizedChatService.getInstance();
  }

  public static getInstance(): OptimizedChatAPI {
    if (!this.instance) {
      this.instance = new OptimizedChatAPI();
    }
    return this.instance;
  }

  // 🎯 MÉTHODE PRINCIPALE - TRAITEMENT DES MESSAGES
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, productId, currentStep = 'initial', sessionId, storeId } = request;
    
    try {
      console.log('💬 Processing chat message:', {
        message: message.substring(0, 50),
        productId,
        step: currentStep,
        sessionId: sessionId.substring(0, 8) + '...'
      });

      // 🚀 PRIORITÉ 1: Gestion des boutons de commande express
      if (this.isExpressOrderTrigger(message)) {
        console.log('⚡ Express order triggered');
        return await this.handleExpressOrder(request);
      }

      // 🚀 PRIORITÉ 2: Gestion du flow d'achat existant
      if (this.isOrderFlowStep(currentStep)) {
        console.log('🛒 Continuing order flow');
        return await this.continueOrderFlow(request);
      }

      // 🚀 PRIORITÉ 3: Redirection WhatsApp pour support complexe
      if (this.shouldRedirectToWhatsApp(message)) {
        console.log('📞 Redirecting to WhatsApp');
        return this.createWhatsAppRedirection();
      }

      // 🚀 PRIORITÉ 4: Traitement avec Rose AI
      console.log('🌹 Processing with Rose AI');
      return await this.processWithRoseAI(request);

    } catch (error) {
      console.error('❌ Chat API Error:', error);
      return this.createErrorResponse(error);
    }
  }

  // ⚡ GESTION DE LA COMMANDE EXPRESS
  private async handleExpressOrder(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('⚡ Processing express order request');

      // ✅ UTILISER LA MÉTHODE PUBLIQUE handleExpressFlow
      const response = await this.chatService.handleExpressFlow(
        request.sessionId,
        request.message,
        'express_start' // Signal pour démarrer le flow express
      );

      // ✅ TRAITEMENT SÉCURISÉ DU CONTENU
      const content = typeof response.content === 'string' 
        ? response.content 
        : String(response.content);

      return {
        success: true,
        message: content,
        choices: response.choices || [],
        nextStep: response.metadata?.nextStep || 'express_quantity',
        type: 'assistant',
        orderData: response.metadata?.orderData,
        actions: {
          showCart: true
        }
      };

    } catch (error) {
      console.error('❌ Express order error:', error);
      return this.createErrorResponse(error);
    }
  }

  // 🛒 CONTINUER LE FLOW D'ACHAT
  private async continueOrderFlow(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('🛒 Continuing order flow');

      // ✅ UTILISER LA MÉTHODE PUBLIQUE handleExpressStep
      const response = await this.chatService.handleExpressStep(
        request.sessionId,
        request.message,
        request.currentStep!
      );

      // ✅ TRAITEMENT SÉCURISÉ DU CONTENU
      const content = typeof response.content === 'string' 
        ? response.content 
        : String(response.content);

      return {
        success: true,
        message: content,
        choices: response.choices || [],
        nextStep: response.metadata?.nextStep || request.currentStep!,
        type: 'assistant',
        orderData: response.metadata?.orderData,
        actions: {
          showCart: this.shouldShowCart(response.metadata?.nextStep || request.currentStep!)
        }
      };

    } catch (error) {
      console.error('❌ Order flow error:', error);
      return this.createErrorResponse(error);
    }
  }

  // 🌹 TRAITEMENT AVEC ROSE AI - CORRIGÉ AVEC BONNE MÉTHODE
  private async processWithRoseAI(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('🌹 Processing with Rose AI');

      // ✅ UTILISER LA BONNE MÉTHODE: processCustomerMessage
      const aiResponse = await this.roseAI.processCustomerMessage({
        productId: request.productId,
        sessionId: request.sessionId,
        userMessage: request.message,
        conversationHistory: [],
        currentStep: request.currentStep || 'initial',
        visitSource: request.visitSource,
        timeOnPage: request.timeOnPage
      });

      return {
        success: true,
        message: aiResponse.message,
        choices: aiResponse.choices || [],
        nextStep: aiResponse.nextStep || 'generic_response',
        type: 'assistant',
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        orderData: aiResponse.metadata?.orderData,
        actions: aiResponse.actions
      };

    } catch (error) {
      console.error('❌ Rose AI error:', error);
      return this.createFallbackResponse(request);
    }
  }

  // 🔍 DÉTECTION DES TRIGGERS DE COMMANDE EXPRESS
  private isExpressOrderTrigger(message: string): boolean {
    const expressTriggers = [
      'je veux l\'acheter maintenant',
      'je veux l\'acheter',
      'acheter maintenant',
      'commander maintenant',
      'je le veux',
      'je commande',
      'acheter rapidement',
      'commander rapidement',
      'achat express',
      'commande express'
    ];

    const normalizedMessage = message.toLowerCase().trim();
    return expressTriggers.some(trigger => normalizedMessage.includes(trigger));
  }

  // 🔍 VÉRIFICATION DES ÉTAPES D'ACHAT
  private isOrderFlowStep(step: string): boolean {
    const orderSteps = [
      'express_quantity',
      'express_phone', 
      'express_name',
      'express_address',
      'express_payment',
      'express_confirmation',
      'express_custom_quantity',
      'quantity_confirmed',
      'quantity_selected'
    ];

    return orderSteps.includes(step);
  }

  // 📞 DÉTECTION POUR REDIRECTION WHATSAPP
  private shouldRedirectToWhatsApp(message: string): boolean {
    const whatsappTriggers = [
      'parler à un humain',
      'contacter le support',
      'problème complexe',
      'réclamation',
      'retour produit',
      'remboursement'
    ];

    const normalizedMessage = message.toLowerCase().trim();
    return whatsappTriggers.some(trigger => normalizedMessage.includes(trigger));
  }

  // 🛒 DÉTERMINER SI AFFICHER LE PANIER
  private shouldShowCart(step: string): boolean {
    const cartSteps = [
      'express_quantity',
      'express_phone',
      'express_name', 
      'express_address',
      'express_payment',
      'express_confirmation'
    ];

    return cartSteps.includes(step);
  }

  // 📞 CRÉER REDIRECTION WHATSAPP
  private createWhatsAppRedirection(): ChatResponse {
    return {
      success: true,
      message: `🔄 **Je vous redirige vers notre équipe support**

Pour une assistance personnalisée, notre équipe WhatsApp va vous aider directement.

📱 **Cliquez sur le bouton ci-dessous :**`,
      choices: [
        '📱 Contacter sur WhatsApp',
        '🔙 Retour au chat',
        '💬 Continuer ici'
      ],
      nextStep: 'whatsapp_redirect',
      type: 'assistant',
      actions: {
        redirectWhatsApp: true
      }
    };
  }

  // 📋 CRÉER RÉPONSE DE FALLBACK
  private createFallbackResponse(request: ChatRequest): ChatResponse {
    return {
      success: true,
      message: `🤔 **Je n'ai pas bien compris votre demande**

Pouvez-vous me dire ce que vous souhaitez faire ?

💡 **Je peux vous aider à :**
- Commander rapidement le jeu
- Répondre à vos questions
- Vous expliquer le jeu`,
      choices: [
        'Je veux l\'acheter maintenant',
        'J\'ai des questions',
        'Expliquer le jeu'
      ],
      nextStep: 'fallback_response',
      type: 'assistant'
    };
  }

  // ❌ CRÉER RÉPONSE D'ERREUR
  private createErrorResponse(error: any): ChatResponse {
    console.error('Creating error response:', error);
    
    return {
      success: false,
      message: `😔 **Une erreur est survenue**

${error?.message || 'Erreur inconnue'}

Voulez-vous réessayer ?`,
      choices: [
        '🔄 Réessayer',
        '📞 Contacter le support',
        '🔙 Recommencer'
      ],
      nextStep: 'error_recovery',
      type: 'assistant',
      error: error?.message || 'Unknown error'
    };
  }
}

// 🎯 ENDPOINTS PRINCIPAUX

// ✅ HANDLER OPTIONS POUR CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}

// ✅ HANDLER POST PRINCIPAL
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Chat API POST request received');

    // ✅ PARSING DU BODY
    const body = await request.json();
    const chatRequest: ChatRequest = {
      message: body.message || '',
      productId: body.productId || '',
      currentStep: body.currentStep || 'initial',
      orderData: body.orderData || {},
      sessionId: body.sessionId || `session_${Date.now()}`,
      storeId: body.storeId || 'default',
      visitSource: body.visitSource,
      timeOnPage: body.timeOnPage
    };

    // ✅ VALIDATION
    if (!chatRequest.message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message vide'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!chatRequest.productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID manquant'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // ✅ TRAITEMENT
    console.log('🚀 Processing chat request:', {
      message: chatRequest.message.substring(0, 50),
      productId: chatRequest.productId,
      step: chatRequest.currentStep
    });

    const chatAPI = OptimizedChatAPI.getInstance();
    const response = await chatAPI.processMessage(chatRequest);

    console.log('✅ Chat response generated:', {
      success: response.success,
      nextStep: response.nextStep,
      hasChoices: response.choices?.length > 0
    });

    return NextResponse.json(response, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Une erreur interne est survenue',
      choices: ['🔄 Réessayer', '📞 Support'],
      nextStep: 'critical_error',
      type: 'assistant',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ✅ FALLBACK POUR AUTRES MÉTHODES
export async function GET() {
  return NextResponse.json({
    message: 'Chat API is running',
    endpoints: {
      POST: '/api/chat - Send chat message',
      OPTIONS: '/api/chat - CORS preflight'
    }
  }, {
    headers: corsHeaders
  });
}