// app/api/chat/route.ts - VERSION FINALE CORRIGÉE
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { AIResponseHandler } from "@/lib/services/AIResponseHandler";
import { RecommendationService } from "@/lib/services/recommendation.service";
import { ProfileAnalyzer } from "@/lib/services/ProfileAnalyzer";
import { PromptManager } from "@/lib/services/PromptManager";

import type {
  ConversationStep,
  ChatMessage,
  AIResponse,
  ProductId,
  ProfileAnalysisResult,
  MessageType,
  CustomerMessage,
  ChatOrderData
} from '@/types/chat';

import type { 
  OrderData,
  ProductRecommendation
} from '@/types/order';

// ✅ CORRECTION: Configuration OpenAI avec GPT-4o
let openaiClient: OpenAI | null = null;

if (!openaiClient && process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI client initialized with GPT-4o');
}

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

class EnhancedAIAssistant {
  private static instance: EnhancedAIAssistant;
  private profileAnalyzer: ProfileAnalyzer;
  private promptManager: PromptManager;
  private optimizedChatService: OptimizedChatService;
  private aiResponseHandler: AIResponseHandler;

  // Messages libres qui nécessitent l'IA
  private readonly freeTextPatterns = [
    /^[^⚡❓📦💬🔄📞].+/,  // Ne commence pas par des émojis de boutons
    /\?$/,                // Se termine par une question
    /comment/i,           // Contient "comment"
    /pourquoi/i,          // Contient "pourquoi"
    /est-ce que/i,        // Contient "est-ce que"
    /j'aimerais/i,        // Contient "j'aimerais"
    /je veux/i,           // Contient "je veux"
  ];

  private constructor() {
    this.profileAnalyzer = ProfileAnalyzer.getInstance();
    this.promptManager = PromptManager.getInstance();
    this.optimizedChatService = OptimizedChatService.getInstance();
    this.aiResponseHandler = AIResponseHandler.getInstance();
  }

  public static getInstance(): EnhancedAIAssistant {
    if (!EnhancedAIAssistant.instance) {
      EnhancedAIAssistant.instance = new EnhancedAIAssistant();
    }
    return EnhancedAIAssistant.instance;
  }

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE
  async generateResponse(
    message: CustomerMessage,
    context: {
      productId: ProductId;
      currentStep: ConversationStep;
      orderData?: Partial<ChatOrderData>;
      sessionId: string;
      storeId: string;
    }
  ): Promise<AIResponse> {
    try {
      console.log('🚀 Enhanced AI Processing:', {
        message: message.content.substring(0, 50),
        currentStep: context.currentStep,
        sessionId: context.sessionId
      });

      // ✅ CORRECTION 1: Redirection immédiate WhatsApp
      if (message.content.toLowerCase().includes('parler à un humain')) {
        return {
          content: "Je vous redirige vers notre service client sur WhatsApp...",
          type: "assistant",
          choices: ['📞 WhatsApp (+221 78 136 27 28)'],
          nextStep: context.currentStep,
          // Pas de redirectUrl dans AIResponse
        };
      }

      // ✅ CORRECTION 2: Détecter si c'est un bouton ou un message libre
      const isFreeText = this.isFreeTextMessage(message.content);
      console.log('🤖 Message type:', isFreeText ? 'FREE_TEXT' : 'BUTTON_CHOICE');

      // ✅ CORRECTION 3: Gestion des commandes express
      if (message.content.includes('Commander rapidement') || message.content.includes('⚡')) {
        console.log('🚀 Starting express purchase via Enhanced AI');
        const expressResponse = await this.optimizedChatService.startExpressPurchase(
          context.sessionId, 
          context.productId
        );
        return this.convertChatMessageToAIResponse(expressResponse, context.currentStep);
      }

      // ✅ CORRECTION 4: Gestion des étapes express
      if (context.currentStep?.includes('express')) {
        console.log('🔄 Processing express step via Enhanced AI:', context.currentStep);
        const expressResponse = await this.optimizedChatService.handleExpressStep(
          context.sessionId,
          message.content,
          context.currentStep
        );
        return this.convertChatMessageToAIResponse(expressResponse, context.currentStep);
      }

      // ✅ CORRECTION 5: Messages libres → IA GPT-4o
      if (isFreeText) {
        console.log('🤖 Processing free text with GPT-4o:', message.content);
        return await this.handleFreeTextWithAI(message, context);
      }

      // ✅ CORRECTION 6: Boutons prédéfinis
      const aiContext = {
        productId: context.productId,
        productName: await this.getProductName(context.productId),
        sessionId: context.sessionId,
        isExpressMode: false,
        currentStep: context.currentStep,
        userMessage: message.content,
        conversationHistory: []
      };

      const aiResponse = await this.aiResponseHandler.handleFreeTextMessage(aiContext);
      return this.convertChatMessageToAIResponse(aiResponse, context.currentStep);

    } catch (error) {
      console.error('❌ Enhanced AI Error:', error);
      return this.createErrorResponse(error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Détecter les messages libres
  private isFreeTextMessage(content: string): boolean {
    const predefinedChoices = [
      'Commander rapidement', 'Poser une question', 'Infos livraison',
      'En savoir plus', 'Comment y jouer', 'Quels bénéfices', 'Avis clients',
      'Voir les témoignages', 'Parler à un humain', 'C\'est pour qui'
    ];

    // Si c'est un choix prédéfini, ce n'est pas du texte libre
    if (predefinedChoices.some(choice => content.includes(choice))) {
      return false;
    }

    // Vérifier les patterns de texte libre
    return this.freeTextPatterns.some(pattern => pattern.test(content));
  }

  // ✅ NOUVELLE MÉTHODE: Traitement IA GPT-4o pour texte libre
  private async handleFreeTextWithAI(
    message: CustomerMessage,
    context: {
      productId: ProductId;
      currentStep: ConversationStep;
      orderData?: Partial<ChatOrderData>;
      sessionId: string;
      storeId: string;
    }
  ): Promise<AIResponse> {
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      // Récupérer les infos produit
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, description, game_rules, chatbot_variables')
        .eq('id', context.productId)
        .single();

      if (error || !product) {
        throw new Error(`Product ${context.productId} not found`);
      }

      // ✅ PROMPT AMÉLIORÉ POUR GPT-4o
      const systemPrompt = `Tu es Rose, l'assistante commerciale IA de VIENS ON S'CONNAÎT, experte en jeux de cartes relationnels.

PRODUIT ACTUEL :
- Nom : ${product.name}
- Prix : ${product.price.toLocaleString()} FCFA
- Description : ${product.description || 'Jeu de cartes pour renforcer les relations'}

TON RÔLE :
1. Répondre naturellement aux questions sur le jeu
2. Guider vers l'achat de manière bienveillante
3. Rassurer sur la qualité et l'efficacité
4. Créer l'envie et l'urgence d'acheter

RÈGLES DE RÉPONSE :
- Maximum 3-4 phrases courtes
- Toujours finir par une question ouverte
- Proposer 3 boutons dont "⚡ Commander maintenant"
- Être chaleureuse et persuasive
- Utiliser des émojis avec modération

CONTEXTE CONVERSATION :
- Étape : ${context.currentStep}
- Message client : "${message.content}"

FORMAT JSON REQUIS :
{
  "message": "Ta réponse naturelle et engageante",
  "choices": ["⚡ Commander maintenant", "Autre choix pertinent", "Troisième option"],
  "nextStep": "étape_suivante",
  "buyingIntent": 0.8
}`;

      console.log('🤖 Sending to GPT-4o...');

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.content }
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      console.log('✅ GPT-4o response received:', aiResponse);

      return {
        content: aiResponse.message || "Je suis là pour vous aider ! Que puis-je vous expliquer sur notre jeu ?",
        type: "assistant",
        choices: aiResponse.choices || ["⚡ Commander maintenant", "❓ Poser une question", "📞 Parler à un humain"],
        nextStep: aiResponse.nextStep || context.currentStep,
        buyingIntent: aiResponse.buyingIntent || 0.5
      };

    } catch (error) {
      console.error('❌ GPT-4o processing error:', error);
      
      // Fallback intelligent
      return {
        content: `Merci pour votre question ! Je vois que vous vous intéressez à notre jeu **${await this.getProductName(context.productId)}**. C'est un excellent choix ! Que puis-je vous expliquer en détail ?`,
        type: "assistant",
        choices: [
          "⚡ Commander maintenant",
          "❓ Comment ça marche ?",
          "⭐ Voir les avis clients"
        ],
        nextStep: context.currentStep,
        buyingIntent: 0.6
      };
    }
  }

  // ✅ MÉTHODES UTILITAIRES AMÉLIORÉES
  private convertChatMessageToAIResponse(
    chatMessage: ChatMessage, 
    fallbackStep: ConversationStep
  ): AIResponse {
    const responseType: 'assistant' | 'user' = 
      chatMessage.type === 'redirect' ? 'assistant' : 
      (chatMessage.type as 'assistant' | 'user');

    return {
      content: chatMessage.content,
      type: responseType,
      choices: chatMessage.choices || [],
      nextStep: chatMessage.metadata?.nextStep || fallbackStep,
      buyingIntent: chatMessage.metadata?.buyingIntent,
      recommendations: chatMessage.metadata?.recommendations,
      error: chatMessage.metadata?.error
    };
  }

  private async getProductName(productId: string): Promise<string> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      return product?.name || 'notre jeu';
    } catch (error) {
      console.error('Error fetching product name:', error);
      return 'notre jeu';
    }
  }

  private createErrorResponse(error: any): AIResponse {
    console.error('Creating error response for:', error);
    
    return {
      content: "Je rencontre un petit problème technique. Voulez-vous réessayer ou parler à un conseiller ?",
      type: 'assistant',
      choices: ["🔄 Réessayer", "📞 Contacter le support", "⚡ Commander quand même"],
      nextStep: 'error_recovery' as ConversationStep,
      error: 'AI_ERROR'
    };
  }
}

// ✅ FONCTION POST PRINCIPALE
export async function POST(req: Request) {
  try {
    const requestData: ExtendedChatRequest = await req.json();
    const { 
      message, 
      productId, 
      currentStep = 'initial', 
      orderData, 
      sessionId,
      storeId 
    } = requestData;

    console.log('📨 Enhanced API Request:', {
      message: message.substring(0, 50),
      productId,
      currentStep,
      sessionId: sessionId.substring(0, 10) + '...'
    });

    // ✅ VALIDATION STRICTE
    if (!message || !productId || !sessionId) {
      return NextResponse.json({
        content: "Paramètres manquants dans la requête",
        type: "assistant",
        choices: ["🔄 Réessayer"],
        nextStep: "error_recovery",
        error: "MISSING_PARAMETERS"
      }, { status: 400, headers: corsHeaders });
    }

    // ✅ TRAITEMENT VIA ENHANCED AI
    const enhancedAI = EnhancedAIAssistant.getInstance();
    const aiResponse = await enhancedAI.generateResponse(
      { content: message, type: 'user' },
      {
        productId,
        currentStep: currentStep as ConversationStep,
        orderData,
        sessionId,
        storeId: storeId || ''
      }
    );

    console.log('✅ Enhanced API Response:', {
      type: aiResponse.type,
      nextStep: aiResponse.nextStep,
      hasChoices: !!aiResponse.choices?.length,
      contentLength: aiResponse.content.length
    });

    return NextResponse.json(aiResponse, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Enhanced API Error:", error);
    
    return NextResponse.json({
      content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ?",
      type: "assistant",
      choices: ["🔄 Réessayer", "📞 Contacter le support"],
      nextStep: "error_recovery",
      error: "SERVER_ERROR"
    }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}