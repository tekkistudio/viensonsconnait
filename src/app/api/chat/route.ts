// src/app/api/chat/route.ts - VERSION ENTIÈREMENT CORRIGÉE
import { NextRequest, NextResponse } from "next/server";
import { OptimizedRoseAIEngine } from "@/lib/services/OptimizedRoseAIEngine";
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

// 🚀 CLASSE PRINCIPALE DU CHAT API - VERSION CORRIGÉE
class CorrectedChatAPI {
  private static instance: CorrectedChatAPI;
  private roseAI: OptimizedRoseAIEngine;
  private chatService: OptimizedChatService;

  private constructor() {
    this.roseAI = OptimizedRoseAIEngine.getInstance();
    this.chatService = OptimizedChatService.getInstance();
  }

  public static getInstance(): CorrectedChatAPI {
    if (!this.instance) {
      this.instance = new CorrectedChatAPI();
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

      // 🚀 PRIORITÉ 4: Traitement avec Rose AI CORRIGÉ
      console.log('🌹 Processing with Fixed Rose AI');
      return await this.processWithFixedRoseAI(request);

    } catch (error) {
      console.error('❌ Chat API Error:', error);
      return this.createErrorResponse(error);
    }
  }

  // ⚡ GESTION DE LA COMMANDE EXPRESS - CORRIGÉE
  private async handleExpressOrder(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('⚡ Processing express order request');

      // ✅ UTILISER LA MÉTHODE PUBLIQUE handleExpressFlow AVEC GESTION D'ERREUR
      try {
        const response = await this.chatService.handleExpressFlow(
          request.sessionId,
          request.message,
          'express_start'
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
      } catch (serviceError) {
        console.error('❌ ChatService error:', serviceError);
        // Fallback vers Rose AI si le service express échoue
        return await this.processWithFixedRoseAI(request);
      }

    } catch (error) {
      console.error('❌ Express order error:', error);
      return this.createErrorResponse(error);
    }
  }

  // 🛒 CONTINUER LE FLOW D'ACHAT - CORRIGÉ
  private async continueOrderFlow(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('🛒 Continuing order flow');

      // ✅ UTILISER LA MÉTHODE PUBLIQUE handleExpressStep AVEC GESTION D'ERREUR
      try {
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
      } catch (serviceError) {
        console.error('❌ Order flow service error:', serviceError);
        // Fallback vers Rose AI si le service d'achat échoue
        return await this.processWithFixedRoseAI(request);
      }

    } catch (error) {
      console.error('❌ Order flow error:', error);
      return this.createErrorResponse(error);
    }
  }

  // 🌹 TRAITEMENT AVEC ROSE AI CORRIGÉ - NOUVELLE MÉTHODE
  private async processWithFixedRoseAI(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('🌹 Processing with Fixed Rose AI');

      // ✅ UTILISER LE MOTEUR AI CORRIGÉ
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
      console.error('❌ Fixed Rose AI error:', error);
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

Voulez-vous réessayer ou continuer avec moi ?`,
      choices: [
        '🔄 Réessayer',
        '💬 Continuer le chat',
        '📞 Contacter le support'
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

// ✅ HANDLER POST PRINCIPAL - VERSION SÉCURISÉE
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Chat API POST request received');

    // ✅ PARSING DU BODY AVEC GESTION D'ERREUR
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Format de requête invalide',
        choices: ['🔄 Réessayer'],
        nextStep: 'error',
        type: 'assistant',
        error: 'Invalid JSON format'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

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

    // ✅ VALIDATION AMÉLIORÉE
    if (!chatRequest.message.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Message vide. Que souhaitez-vous me dire ?',
        choices: [
          'Je veux acheter un jeu',
          'J\'ai des questions',
          'Découvrir vos jeux'
        ],
        nextStep: 'empty_message',
        type: 'assistant',
        error: 'Empty message'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!chatRequest.productId) {
      return NextResponse.json({
        success: false,
        message: 'Identifiant produit manquant. Veuillez rafraîchir la page.',
        choices: [
          '🔄 Rafraîchir la page',
          '🏠 Retour à l\'accueil'
        ],
        nextStep: 'missing_product',
        type: 'assistant',
        error: 'Missing product ID'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // ✅ TRAITEMENT AVEC GESTION D'ERREUR COMPLÈTE
    console.log('🚀 Processing chat request:', {
      message: chatRequest.message.substring(0, 50),
      productId: chatRequest.productId,
      step: chatRequest.currentStep
    });

    const chatAPI = CorrectedChatAPI.getInstance();
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
    console.error('❌ Critical Chat API Error:', error);
    
    return NextResponse.json({
      success: false,
      message: '😔 **Oups ! Quelque chose ne va pas**\n\nNe vous inquiétez pas, nous pouvons continuer autrement.',
      choices: [
        '🔄 Réessayer',
        '📱 WhatsApp Support',
        '🔙 Recommencer'
      ],
      nextStep: 'critical_error',
      type: 'assistant',
      error: error instanceof Error ? error.message : 'Critical system error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ✅ FALLBACK POUR AUTRES MÉTHODES
export async function GET() {
  return NextResponse.json({
    message: 'VIENS ON S\'CONNAÎT Chat API is running! 🌹',
    version: '2.0.0',
    status: 'healthy',
    endpoints: {
      POST: '/api/chat - Send chat message',
      OPTIONS: '/api/chat - CORS preflight'
    },
    features: [
      'Express order flow',
      'Intelligent responses',
      'WhatsApp fallback',
      'Error recovery'
    ]
  }, {
    headers: corsHeaders
  });
}