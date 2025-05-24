// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { ChatService } from "@/services/ChatService";
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
import { ChatFlowManager } from "@/lib/services/ChatFlowManager";

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
  private chatService: ChatService;

  // Étapes guidées où l'IA ne doit pas intervenir
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
    this.chatService = ChatService.create();
  }

  public static getInstance(): AIAssistant {
    if (!AIAssistant.instance) {
      AIAssistant.instance = new AIAssistant();
    }
    return AIAssistant.instance;
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
      // Redirection vers WhatsApp si demandé
      if (message.content.toLowerCase().includes('parler à un humain')) {
        return {
          content: "Je vous redirige vers notre service client sur WhatsApp...",
          type: "redirect",
          redirectUrl: WHATSAPP_LINK,
          choices: [],
          nextStep: context.currentStep
        };
      }
  
      // Vérifier si nous sommes dans une étape guidée
      if (this.isGuidedStep(context.currentStep) || 
          context.currentStep === 'collect_has_email' ||
          context.currentStep === 'process_email_response') {
        
        const chatResponse = await this.chatService.processOrderStep(
          context.sessionId,
          context.currentStep,
          message.content,
          context.productId 
        );
  
        if (chatResponse) {
          return {
            content: typeof chatResponse.content === 'string' 
              ? chatResponse.content 
              : String(chatResponse.content),
            type: chatResponse.type as MessageType,
            choices: chatResponse.choices || [],
            nextStep: chatResponse.metadata?.nextStep || context.currentStep,
            metadata: chatResponse.metadata
          };
        }
      }
  
      // Si ce n'est pas une étape guidée, utiliser l'IA
      if (!openaiClient) {
        throw new Error('OpenAI configuration missing');
      }
  
      const profileAnalysis: ProfileAnalysisResult = {
        relationshipStatus: [],
        interests: [],
        topics: [],
        concerns: [],
        intent: 0,
        recommendedProducts: [],
        pricePreference: 'standard'
      };
  
      const systemPrompt = await this.promptManager.generateProductPrompt(
        context.productId,
        profileAnalysis.intent,
        context.currentStep,
        []
      );
  
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.content }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
  
      if (!completion.choices[0]?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }
  
      const aiResponse = JSON.parse(completion.choices[0].message.content);
  
      return {
        content: aiResponse.message || '',
        type: 'assistant',
        choices: aiResponse.choices || [
          "Je veux l'acheter maintenant",
          "Je veux en savoir plus",
          "J'ai une autre question"
        ],
        nextStep: this.determineNextStep(context.currentStep, profileAnalysis.intent),
        buyingIntent: profileAnalysis.intent
      };
  
    } catch (error) {
      console.error('AI Response Error:', error);
      return {
        content: "Je suis désolée, je rencontre un problème technique. Puis-je vous aider autrement ?",
        type: "assistant",
        choices: ["Je veux l'acheter maintenant", "Je veux voir les témoignages", "Parler à un humain"]
      };
    }
  }

  private determineNextStep(
    currentStep: ConversationStep,
    buyingIntent: number
  ): ConversationStep {
    if (buyingIntent >= 0.8 && currentStep === 'initial') {
      return 'collect_phone';
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

    // Redirection vers WhatsApp si demandé
    if (message.toLowerCase().includes('parler à un humain')) {
      return NextResponse.json({
        content: "Je vous redirige vers notre service client sur WhatsApp...",
        type: "redirect",
        redirectUrl: WHATSAPP_LINK,
        choices: [],
        nextStep: currentStep
      }, { headers: corsHeaders });
    }

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

    return NextResponse.json(aiResponse, { headers: corsHeaders });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"]
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}