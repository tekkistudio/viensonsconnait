// app/api/chat/route.ts - VERSION CORRIGÉE TYPESCRIPT
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

// ✅ CORRECTION TYPESCRIPT : Fonction pour créer des réponses valides
function createValidJSONResponse(
  content: string, 
  choices: string[] = [], 
  nextStep: ConversationStep = 'generic_response'
): AIResponse {
  return {
    content: content || "Je suis là pour vous aider !",
    type: "assistant",
    choices: choices.length > 0 ? choices : ["⚡ Commander maintenant", "❓ Poser une question", "📞 Contacter le support"],
    nextStep
    // ✅ SUPPRESSION : timestamp n'existe pas dans AIResponse
  };
}

class EnhancedChatAPI {
  private static instance: EnhancedChatAPI;
  private optimizedChatService: OptimizedChatService;
  private professionalSalesAI: ProfessionalSalesAI;
  private salesDataService: EnhancedSalesDataService;

  // ✅ CORRECTION : Patterns pour tous les boutons standards
  private readonly allStandardButtons = [
    'Poser une question',
    '❓ Poser une question',
    'Suivre ma commande',
    '🔍 Suivre ma commande',
    'Nous contacter',
    '💬 Nous contacter',
    'Voir les autres jeux',
    '🛍️ Voir les autres jeux',
    'Commander rapidement',
    '⚡ Commander rapidement',
    'Infos livraison',
    '📦 Infos livraison',
    'En savoir plus sur le jeu',
    '💬 En savoir plus sur le jeu',
    'En savoir plus le jeu',
    '💬 En savoir plus le jeu',
    'Comment y jouer',
    '❓ Comment y jouer ?',
    'Comment ça fonctionne',
    'Parler à un conseiller',
    'Contacter le support',
    '📞 Contacter le support'
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

  // ✅ CORRECTION MAJEURE : Méthode principale avec types corrigés
  async processMessage(request: ExtendedChatRequest): Promise<AIResponse> {
    const { message, productId, currentStep = 'initial', orderData, sessionId, storeId } = request;
    
    try {
      console.log('🚀 [API] Processing message:', {
        message: message.substring(0, 50),
        productId,
        sessionId: sessionId.substring(0, 10) + '...',
        currentStep
      });

      // ✅ VALIDATION STRICTE
      if (!message || !productId || !sessionId) {
        console.error('❌ [API] Missing required fields:', { message: !!message, productId: !!productId, sessionId: !!sessionId });
        return createValidJSONResponse('Données manquantes. Veuillez recharger la page.');
      }

      // ✅ PRIORITÉ 1: Gestion des boutons standards (TOUJOURS en premier)
      if (this.isStandardButton(message)) {
        console.log('🔘 [API] Standard button detected:', message);
        
        try {
          const response = await this.handleStandardButton(message, productId, sessionId);
          console.log('✅ [API] Standard button processed successfully');
          return response;
        } catch (standardError) {
          console.error('❌ [API] Error processing standard button:', standardError);
          return createValidJSONResponse(
            '😔 Erreur lors du traitement du bouton. Veuillez réessayer.',
            ['🔄 Réessayer', '📞 Contacter le support'],
            'error_recovery' // ✅ CORRECTION: step valide
          );
        }
      }

      // ✅ PRIORITÉ 2: Redirections WhatsApp
      if (this.shouldRedirectToWhatsApp(message)) {
        console.log('📞 [API] WhatsApp redirect requested');
        return this.createWhatsAppRedirect();
      }

      // ✅ PRIORITÉ 3: Commandes express
      if (this.isExpressCommand(message) || currentStep?.includes('express')) {
        console.log('⚡ [API] Processing express command');
        return await this.handleExpressFlow(request);
      }

      // ✅ PRIORITÉ 4: Messages libres vers l'IA
      console.log('🤖 [API] Processing free text with AI');
      return await this.processWithAI(request);

    } catch (error) {
      console.error("❌ [API] Critical error in processMessage:", error);
      return createValidJSONResponse(
        'Une erreur technique est survenue. Notre équipe est notifiée.',
        ["🔄 Réessayer", "📞 Contacter le support"],
        'error_recovery' // ✅ CORRECTION: step valide
      );
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérification des boutons standards
  private isStandardButton(message: string): boolean {
    return this.allStandardButtons.some(btn => 
      message.includes(btn) || message.trim() === btn
    );
  }

  // ✅ NOUVELLE MÉTHODE : Gestion des boutons standards avec types corrects
  private async handleStandardButton(message: string, productId: string, sessionId: string): Promise<AIResponse> {
    console.log('🔘 [API] Handling standard button:', message);

    // ✅ Commander rapidement
    if (message.includes('Commander rapidement') || message.includes('⚡')) {
      try {
        const chatResponse = await this.optimizedChatService.startExpressPurchase(sessionId, productId);
        return this.convertChatMessageToAIResponse(chatResponse);
      } catch (error) {
        console.error('❌ Express purchase error:', error);
        return createValidJSONResponse(
          '😔 **Erreur lors du lancement de la commande express**\n\nUne erreur technique est survenue. Voulez-vous réessayer ?',
          ['🔄 Réessayer', '📞 Contacter le support'],
          'error_recovery' // ✅ CORRECTION: step valide
        );
      }
    }

    // ✅ Poser une question
    if (message.includes('Poser une question') || message.includes('❓')) {
      return createValidJSONResponse(
        `🤔 **Parfait ! Posez-moi toutes vos questions !**

Je peux vous expliquer :
- Comment ça fonctionne
- Pour qui c'est adapté  
- Les bénéfices pour vous
- Les témoignages clients

Qu'est-ce qui vous intéresse le plus ?`,
        [
          '❓ Comment y jouer ?',
          '👥 C\'est pour qui ?',
          '💝 Quels bénéfices ?',
          '⭐ Avis clients'
        ],
        'question_mode'
      );
    }

    // ✅ Infos livraison
    if (message.includes('Infos livraison') || message.includes('📦')) {
      return createValidJSONResponse(
        `🚚 **Informations de livraison**

📍 **Zones couvertes :**
• Dakar : Gratuit
• Autres villes Sénégal : 3 000 FCFA
• Abidjan : 2 500 FCFA

⏰ **Délais :**
• Livraison sous 24-48h

💰 **Paiement :**
• Wave
• Carte bancaire
• Paiement à la livraison

Voulez-vous commander maintenant ?`,
        [
          '⚡ Commander maintenant',
          '📞 Autres questions',
          '🏠 Ma zone de livraison'
        ],
        'delivery_info'
      );
    }

    // ✅ En savoir plus
    if (message.includes('En savoir plus') || message.includes('💬')) {
      // Récupérer les vraies données produit
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('name, description, price')
          .eq('id', productId)
          .single();

        if (error || !product) {
          throw new Error('Product not found');
        }

        return createValidJSONResponse(
          `💬 **En savoir plus sur le jeu ${product.name}**

${product.description || 'Ce jeu a été conçu pour renforcer les relations et améliorer la communication.'}

💰 **Prix :** ${product.price.toLocaleString()} FCFA
✅ **Garantie :** 30 jours satisfait ou remboursé

Voulez-vous savoir comment y jouer ou passer commande ?`,
          [
            '⚡ Commander maintenant',
            '❓ Comment y jouer ?',
            '⭐ Voir les avis clients'
          ],
          'product_info'
        );
      } catch (error) {
        console.error('Error fetching product info:', error);
        return createValidJSONResponse(
          'Informations sur le produit en cours de chargement...',
          ['⚡ Commander maintenant', '❓ Poser une question'],
          'generic_response'
        );
      }
    }

    // ✅ Comment y jouer
    if (message.includes('Comment y jouer') || message.includes('Comment ça fonctionne')) {
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('game_rules, name')
          .eq('id', productId)
          .single();

        let gameRules = '';
        if (error || !product || !product.game_rules) {
          gameRules = `❓ **Comment jouer :**

📋 **Préparation :**
• Installez-vous confortablement
• Mélangez les cartes et placez-les au centre
• Chacun tire une carte à tour de rôle

🎮 **Déroulement :**
• Lisez la question à voix haute
• Prenez le temps de réfléchir
• Écoutez attentivement les réponses
• Pas de jugement, seulement de la bienveillance

⏰ **Durée :** 30 à 60 minutes par session

🎯 **Prêt(e) à vivre cette expérience ?**`;
        } else {
          gameRules = `❓ **Comment jouer au jeu ${product.name} :**

${product.game_rules}

🎯 **Prêt(e) à vivre cette expérience ?**`;
        }

        return createValidJSONResponse(
          gameRules,
          [
            '⚡ Commander maintenant',
            '💝 Quels bénéfices ?',
            '⭐ Voir les avis',
            '📞 Contacter le support'
          ],
          'game_rules'
        );
      } catch (error) {
        console.error('Error fetching game rules:', error);
        return createValidJSONResponse(
          'Règles du jeu en cours de chargement...',
          ['⚡ Commander maintenant', '❓ Autre question'],
          'generic_response'
        );
      }
    }

    // ✅ Support/Contact
    if (message.includes('Contacter le support') || message.includes('Parler à un conseiller')) {
      return this.createWhatsAppRedirect();
    }

    // ✅ Par défaut
    return createValidJSONResponse(
      'Je suis là pour vous aider ! Comment puis-je vous assister ?',
      ['⚡ Commander rapidement', '❓ Poser une question', '📦 Infos livraison'],
      'generic_response'
    );
  }

  // ✅ Redirection WhatsApp
  private shouldRedirectToWhatsApp(message: string): boolean {
    const whatsappPatterns = [
      /parler à un humain/i,
      /parler à un conseiller/i,
      /conseiller humain/i,
      /agent humain/i,
      /support humain/i,
      /contacter le support/i,
      /whatsapp/i
    ];
    return whatsappPatterns.some(pattern => pattern.test(message));
  }

  private createWhatsAppRedirect(): AIResponse {
    return createValidJSONResponse(
      `📞 **Je vous connecte à notre équipe !**

Un conseiller humain va répondre à toutes vos questions sur WhatsApp.

👇 Cliquez pour continuer la conversation :`,
      ['📞 Continuer sur WhatsApp (+221 78 136 27 28)'],
      'whatsapp_redirect'
    );
  }

  // ✅ Commandes express
  private isExpressCommand(message: string): boolean {
    return /commander rapidement|⚡|express|rapide/i.test(message);
  }

  private async handleExpressFlow(request: ExtendedChatRequest): Promise<AIResponse> {
    try {
      const { sessionId, message, currentStep } = request;
      
      let chatResponse: ChatMessage;
      
      if (currentStep?.includes('express')) {
        chatResponse = await this.optimizedChatService.handleExpressStep(sessionId, message, currentStep);
      } else {
        chatResponse = await this.optimizedChatService.startExpressPurchase(sessionId, request.productId);
      }
      
      return this.convertChatMessageToAIResponse(chatResponse);
    } catch (error) {
      console.error('❌ Express flow error:', error);
      return createValidJSONResponse(
        'Erreur dans le processus express. Voulez-vous réessayer ?',
        ['🔄 Réessayer', '📞 Contacter le support'],
        'error_recovery'
      );
    }
  }

  // ✅ Traitement IA avec fallback corrigé
  private async processWithAI(request: ExtendedChatRequest): Promise<AIResponse> {
    try {
      console.log('🤖 [API] Processing with AI:', request.message);
      
      // Récupérer le contexte de conversation
      const context = {
        productId: request.productId,
        sessionId: request.sessionId,
        userMessage: request.message,
        conversationHistory: [],
        messageCount: 1,
        sessionStartTime: new Date().toISOString()
      };

      // Appeler l'IA professionnelle
      const result = await this.professionalSalesAI.processCustomerMessage(context);
      
      if (result.success && result.response) {
        return this.convertChatMessageToAIResponse(result.response);
      } else {
        throw new Error(result.error || 'AI processing failed');
      }
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      
      // ✅ CORRECTION: Fallback avec step valide
      return createValidJSONResponse(
        `💬 **Merci pour votre message !**

Je vois que vous vous intéressez à notre jeu. Excellent choix !

Comment puis-je vous aider ?`,
        [
          '❓ Comment ça marche ?',
          '💝 Quels bénéfices ?',
          '⭐ Témoignages clients',
          '⚡ Commander maintenant'
        ],
        'generic_response' // ✅ CORRECTION: step valide au lieu de 'ai_fallback'
      );
    }
  }

  // ✅ Conversion ChatMessage vers AIResponse avec types corrects
  private convertChatMessageToAIResponse(chatMessage: ChatMessage): AIResponse {
    return {
      content: chatMessage.content || "Je suis là pour vous aider !",
      type: 'assistant',
      choices: chatMessage.choices || ['⚡ Commander maintenant', '❓ Poser une question'],
      nextStep: (chatMessage.metadata?.nextStep as ConversationStep) || 'generic_response',
      buyingIntent: chatMessage.metadata?.buyingIntent,
      recommendations: chatMessage.metadata?.recommendations,
      error: chatMessage.metadata?.error,
      metadata: chatMessage.metadata
      // ✅ SUPPRESSION: timestamp pas dans AIResponse
    };
  }
}

// ✅ ROUTE HANDLERS
const chatAPI = EnhancedChatAPI.getInstance();

export async function POST(req: Request) {
  try {
    const requestData: ExtendedChatRequest = await req.json();
    
    console.log('📨 [API] Chat request received:', {
      message: requestData.message?.substring(0, 50),
      productId: requestData.productId,
      sessionId: requestData.sessionId?.substring(0, 10) + '...'
    });

    // ✅ VALIDATION STRICTE
    if (!requestData.message || !requestData.productId || !requestData.sessionId) {
      console.error('❌ [API] Invalid request data');
      return NextResponse.json(
        createValidJSONResponse('Données invalides. Veuillez recharger la page.'),
        { headers: corsHeaders }
      );
    }

    const response = await chatAPI.processMessage(requestData);
    
    console.log('✅ [API] Response generated:', {
      type: response.type,
      nextStep: response.nextStep,
      hasChoices: !!response.choices?.length,
      contentLength: response.content?.length || 0
    });

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ [API] Critical error:", error);
    
    // ✅ RÉPONSE D'ERREUR VALIDE
    const errorResponse = createValidJSONResponse(
      "Je rencontre un problème technique. Veuillez réessayer.",
      ["🔄 Réessayer", "📞 Contacter le support"],
      "error_recovery"
    );
    
    return NextResponse.json(errorResponse, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}