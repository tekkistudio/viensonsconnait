// src/app/api/chat/route.ts 
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { AIResponseHandler } from "@/lib/services/AIResponseHandler";
import type { ConversationStep, ChatMessage, CustomerMessage } from '@/types/chat';

// ✅ CORRECTION: Configuration OpenAI avec vérifications
let openaiClient: OpenAI | null = null;

function initializeOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not configured');
    return null;
  }
  
  if (apiKey.length < 20) {
    console.error('❌ OPENAI_API_KEY appears to be invalid (too short)');
    return null;
  }
  
  console.log('✅ Initializing OpenAI with key:', apiKey.substring(0, 20) + '...');
  
  try {
    return new OpenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('❌ Error initializing OpenAI:', error);
    return null;
  }
}

// Initialiser à l'import
if (!openaiClient) {
  openaiClient = initializeOpenAI();
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
  productId: string;
  currentStep?: ConversationStep;
  orderData?: any;
  sessionId: string;
  storeId: string;
}

export async function POST(req: Request) {
  try {
    console.log('📨 Chat API: Request received');
    
    const requestData: ExtendedChatRequest = await req.json();
    const { 
      message, 
      productId, 
      currentStep = 'initial', 
      orderData, 
      sessionId,
      storeId 
    } = requestData;

    console.log('📨 Chat API: Processing request:', {
      message: message?.substring(0, 50) + '...',
      productId: productId?.substring(0, 20) + '...',
      currentStep,
      sessionId: sessionId?.substring(0, 20) + '...',
      hasStoreId: !!storeId
    });

    // ✅ VALIDATION AMÉLIORÉE
    if (!message || !productId || !sessionId) {
      console.error('❌ Missing required fields:', { message: !!message, productId: !!productId, sessionId: !!sessionId });
      return NextResponse.json({
        error: "Champs obligatoires manquants",
        content: "Erreur de validation des données",
        type: "assistant",
        choices: ["🔄 Réessayer", "📞 Contacter le support"],
        nextStep: "error_recovery"
      }, { status: 400, headers: corsHeaders });
    }

    // ✅ VALIDATION DU PRODUCT ID (format UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(productId)) {
      console.error('❌ Invalid productId format:', productId);
      return NextResponse.json({
        error: "ID produit invalide",
        content: "Erreur: ID produit non valide",
        type: "assistant",
        choices: ["🔄 Réessayer", "📞 Contacter le support"],
        nextStep: "error_recovery"
      }, { status: 400, headers: corsHeaders });
    }

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

    // ✅ VÉRIFICATION DE L'OPENAI CLIENT
    if (!openaiClient) {
      console.error('❌ OpenAI client not initialized');
      openaiClient = initializeOpenAI();
      
      if (!openaiClient) {
        return NextResponse.json({
          content: "Désolée, notre IA rencontre un problème technique. Voulez-vous contacter notre équipe ?",
          type: "assistant",
          choices: ["📞 Contacter le support", "🔄 Réessayer"],
          nextStep: "ai_error"
        }, { status: 503, headers: corsHeaders });
      }
    }

    // ✅ TRAITEMENT VIA OPTIMIZEDCHATSERVICE
    console.log('🚀 Using OptimizedChatService for processing...');
    
    const optimizedService = OptimizedChatService.getInstance();
    let response: ChatMessage;

    try {
      // Vérifier si c'est une commande express
      if (message.includes('Commander rapidement') || message.includes('⚡')) {
        console.log('⚡ Starting express purchase');
        response = await optimizedService.startExpressPurchase(sessionId, productId);
      }
      // Vérifier si c'est une étape express
      else if (currentStep?.includes('express')) {
        console.log('🔄 Processing express step');
        response = await optimizedService.handleExpressStep(sessionId, message, currentStep);
      }
      // Vérifier si c'est un choix prédéfini
      else if (isPredefinedChoice(message)) {
        console.log('🔘 Processing predefined choice');
        response = await optimizedService.handlePredefinedChoice(sessionId, message, productId);
      }
      // Message libre - utiliser l'IA
      else {
        console.log('🤖 Processing free text with AI');
        response = await optimizedService.processUserInput(sessionId, message, currentStep);
      }

    } catch (serviceError) {
      console.error('❌ OptimizedChatService error:', serviceError);
      
      // Fallback: essayer avec l'AIResponseHandler directement
      console.log('🔄 Trying AIResponseHandler as fallback...');
      
      try {
        const aiHandler = AIResponseHandler.getInstance();
        const aiContext = {
          productId,
          productName: await getProductName(productId),
          sessionId,
          isExpressMode: false,
          currentStep,
          userMessage: message,
          conversationHistory: []
        };
        
        response = await aiHandler.handleFreeTextMessage(aiContext);
      } catch (aiError) {
        console.error('❌ AIResponseHandler fallback failed:', aiError);
        throw serviceError; // Rethrow l'erreur originale
      }
    }

    console.log('✅ Response generated successfully:', {
      type: response.type,
      hasContent: !!response.content,
      choicesCount: response.choices?.length || 0,
      nextStep: response.metadata?.nextStep
    });

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Chat API Error:", error);
    
    return NextResponse.json({
      content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ou contacter notre équipe ?",
      type: "assistant",
      choices: ["🔄 Réessayer", "📞 Contacter le support"],
      nextStep: "error_recovery"
    }, { status: 500, headers: corsHeaders });
  }
}

// ✅ MÉTHODES UTILITAIRES
function isPredefinedChoice(message: string): boolean {
  const predefinedChoices = [
    'Je veux l\'acheter maintenant',
    'Je veux voir les témoignages', 
    'Comment y jouer ?',
    'Je veux en savoir plus',
    'Voir la description du jeu',
    'Voir les témoignages',
    'Parler à un humain',
    'Poser une question',
    'En savoir plus',
    'Infos livraison'
  ];

  return predefinedChoices.some(choice => message.includes(choice));
}

async function getProductName(productId: string): Promise<string> {
  try {
    const { data: product } = await supabase
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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}