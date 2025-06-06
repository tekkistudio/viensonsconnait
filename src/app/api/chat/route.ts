// app/api/chat/route.ts - VERSION CORRIGÉE SANS ChatService
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

// Configuration OpenAI
let openaiClient: OpenAI | null = null;

if (!openaiClient && process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
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

class AIAssistant {
  private static instance: AIAssistant;
  private profileAnalyzer: ProfileAnalyzer;
  private promptManager: PromptManager;
  private optimizedChatService: OptimizedChatService;
  private aiResponseHandler: AIResponseHandler;

  // Étapes du flow express gérées par OptimizedChatService
  private readonly expressSteps: ConversationStep[] = [
    'express_contact',
    'express_name', 
    'express_address',
    'express_city',
    'express_quantity',
    'express_custom_quantity',
    'express_payment',
    'express_summary',
    'express_modify',
    'express_error'
  ];

  // Étapes guidées classiques (si besoin futur)
  private readonly guidedSteps: ConversationStep[] = [
    'collect_phone',
    'collect_name',
    'collect_has_email',
    'process_email_response',
    'collect_email',
    'collect_city',
    'collect_address',
    'collect_quantity',
    'add_other_products',
    'select_product',
    'additional_quantity',
    'add_product_choice',
    'add_notes',
    'order_summary',
    'payment_method',
    'payment_processing'
  ];

  private constructor() {
    this.profileAnalyzer = ProfileAnalyzer.getInstance();
    this.promptManager = PromptManager.getInstance();
    this.optimizedChatService = OptimizedChatService.getInstance();
    this.aiResponseHandler = AIResponseHandler.getInstance();
  }

  public static getInstance(): AIAssistant {
    if (!AIAssistant.instance) {
      AIAssistant.instance = new AIAssistant();
    }
    return AIAssistant.instance;
  }

  private isExpressStep(step: ConversationStep): boolean {
    return this.expressSteps.includes(step);
  }

  private isGuidedStep(step: ConversationStep): boolean {
    return this.guidedSteps.includes(step);
  }

  private async getRecommendations(
    productId: string,
    profileAnalysis: ProfileAnalysisResult
  ): Promise<ProductRecommendation[]> {
    try {
      const recommendations = await RecommendationService.getRecommendations({
        currentProductId: productId,
        buyingIntent: profileAnalysis.intent || 0,
        conversationContext: {
          mentionedTopics: profileAnalysis.topics || [],
          concerns: profileAnalysis.concerns || [],
          interests: profileAnalysis.interests || []
        }
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

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
      console.log('🚀 API Processing message:', {
        message: message.content.substring(0, 50),
        currentStep: context.currentStep,
        sessionId: context.sessionId
      });

      // Redirection vers WhatsApp si demandé
      if (message.content.toLowerCase().includes('parler à un humain')) {
        return {
          content: "Je vous redirige vers notre service client sur WhatsApp...",
          type: "assistant",
          choices: [],
          nextStep: context.currentStep
        };
      }

      // ✅ NOUVELLE LOGIQUE : Utiliser OptimizedChatService pour les flows
      
      // 1. Vérifier si c'est une commande express
      if (message.content.includes('Commander rapidement') || message.content.includes('⚡')) {
        console.log('🚀 Starting express purchase via API');
        
        const expressResponse = await this.optimizedChatService.startExpressPurchase(
          context.sessionId, 
          context.productId
        );
        
        return this.convertChatMessageToAIResponse(expressResponse, context.currentStep);
      }

      // 2. Vérifier si nous sommes dans un flow express
      if (this.isExpressStep(context.currentStep)) {
        console.log('🔄 Processing express step via API:', context.currentStep);
        
        const expressResponse = await this.optimizedChatService.handleExpressStep(
          context.sessionId,
          message.content,
          context.currentStep
        );
        
        return this.convertChatMessageToAIResponse(expressResponse, context.currentStep);
      }

      // 3. Vérifier si c'est un choix prédéfini
      const predefinedChoices = [
        'Je veux l\'acheter maintenant',
        'Je veux voir les témoignages',
        'Comment y jouer ?',
        'Je veux en savoir plus',
        'Voir la description du jeu',
        'Voir les témoignages',
        'Parler à un humain',
        'Poser une question',
        'Comment ça marche',
        'C\'est pour qui',
        'Quels bénéfices',
        'Avis clients',
        'Infos livraison',
        'En savoir plus'
      ];

      const isPredefinedChoice = predefinedChoices.some(choice => 
        message.content.includes(choice)
      );

      if (isPredefinedChoice) {
        console.log('🔘 Processing predefined choice via API');
        
        const choiceResponse = await this.optimizedChatService.handlePredefinedChoice(
          context.sessionId,
          message.content,
          context.productId
        );
        
        return this.convertChatMessageToAIResponse(choiceResponse, context.currentStep);
      }

      // 4. Message libre - utiliser l'IA avec contexte
      console.log('🤖 Processing free text message via API');
      
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
      console.error('❌ AI Response Error:', error);
      return {
        content: "Je suis désolée, je rencontre un problème technique. Puis-je vous aider autrement ?",
        type: "assistant",
        choices: ["Je veux l'acheter maintenant", "Je veux voir les témoignages", "Parler à un humain"],
        nextStep: context.currentStep
      };
    }
  }

  // ✅ MÉTHODE UTILITAIRE : Convertir ChatMessage en AIResponse
  private convertChatMessageToAIResponse(
    chatMessage: ChatMessage, 
    fallbackStep: ConversationStep
  ): AIResponse {
    // Gérer le type 'redirect' spécialement
    const responseType: 'assistant' | 'user' = 
      chatMessage.type === 'redirect' ? 'assistant' : 
      (chatMessage.type as 'assistant' | 'user');

    const aiResponse: AIResponse = {
      content: chatMessage.content,
      type: responseType,
      choices: chatMessage.choices || [],
      nextStep: chatMessage.metadata?.nextStep || fallbackStep
    };

    // Ajouter les propriétés optionnelles si elles existent
    if (chatMessage.metadata?.buyingIntent) {
      aiResponse.buyingIntent = chatMessage.metadata.buyingIntent;
    }

    if (chatMessage.metadata?.recommendations) {
      aiResponse.recommendations = chatMessage.metadata.recommendations;
    }

    if (chatMessage.metadata?.error) {
      aiResponse.error = chatMessage.metadata.error;
    }

    return aiResponse;
  }

  // ✅ MÉTHODE UTILITAIRE : Récupérer le nom du produit
  private async getProductName(productId: string): Promise<string> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return 'notre jeu';
      }

      return product.name;
    } catch (error) {
      console.error('Error fetching product name:', error);
      return 'notre jeu';
    }
  }

  private determineNextStep(
    currentStep: ConversationStep,
    buyingIntent: number
  ): ConversationStep {
    if (buyingIntent >= 0.8 && currentStep === 'initial') {
      return 'express_contact';
    }
    return currentStep;
  }
}

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

    console.log('📨 API Request received:', {
      message: message.substring(0, 50),
      productId,
      currentStep,
      sessionId
    });

    // Redirection directe vers WhatsApp si demandé
    if (message.toLowerCase().includes('parler à un humain')) {
      return NextResponse.json({
        content: "Je vous redirige vers notre service client sur WhatsApp...",
        type: "assistant",
        redirectUrl: WHATSAPP_LINK,
        choices: [],
        nextStep: currentStep
      }, { headers: corsHeaders });
    }

    // Traitement via AIAssistant
    const aiAssistant = AIAssistant.getInstance();
    const aiResponse = await aiAssistant.generateResponse(
      { content: message, type: 'user' },
      {
        productId,
        currentStep: currentStep as ConversationStep,
        orderData,
        sessionId: sessionId || Date.now().toString(),
        storeId: storeId || ''
      }
    );

    console.log('✅ API Response generated:', {
      type: aiResponse.type,
      nextStep: aiResponse.nextStep,
      hasChoices: !!aiResponse.choices?.length
    });

    return NextResponse.json(aiResponse, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      {
        content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"],
        nextStep: "error_recovery"
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}