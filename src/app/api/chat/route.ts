// app/api/chat/route.ts - VERSION CORRIGÉE AVEC MEILLEURE GESTION OPENAI
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { AIResponseHandler } from "@/lib/services/AIResponseHandler";

import type {
  ConversationStep,
  ChatMessage,
  AIResponse,
  ProductId,
  MessageType,
  CustomerMessage,
  ChatOrderData
} from '@/types/chat';

// ✅ CORRECTION: Gestion d'erreur OpenAI améliorée
let openaiClient: OpenAI | null = null;

function initializeOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not configured');
    return null;
  }

  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 30000, // 30 secondes
    });
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error);
    return null;
  }
}

// Initialiser OpenAI au démarrage
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
  productId: ProductId;
  currentStep?: ConversationStep;
  orderData?: Partial<ChatOrderData>;  
  sessionId: string;
  storeId: string;
}

// ✅ FONCTION UTILITAIRE: Créer une réponse d'erreur standardisée
function createErrorResponse(
  message: string = "Je rencontre un problème technique. Voulez-vous réessayer ?",
  choices: string[] = ["🔄 Réessayer", "📞 Contacter le support"]
): AIResponse {
  return {
    content: `😔 **Problème temporaire**

${message}

Notre équipe technique travaille à résoudre cela. Vous pouvez :`,
    type: "assistant",
    choices,
    nextStep: 'error_recovery' as ConversationStep,
    error: 'technical_error'
  };
}

// ✅ FONCTION: Valider la requête
function validateChatRequest(requestData: any): { isValid: boolean; error?: string } {
  if (!requestData.message || typeof requestData.message !== 'string') {
    return { isValid: false, error: 'Message requis' };
  }

  if (!requestData.productId || typeof requestData.productId !== 'string') {
    return { isValid: false, error: 'ProductId requis' };
  }

  if (!requestData.sessionId || typeof requestData.sessionId !== 'string') {
    return { isValid: false, error: 'SessionId requis' };
  }

  return { isValid: true };
}

// ✅ FONCTION PRINCIPALE CORRIGÉE
export async function POST(req: Request) {
  try {
    console.log('📨 API Chat: Nouvelle requête reçue');

    // Parse et validation de la requête
    let requestData: ExtendedChatRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return NextResponse.json(
        createErrorResponse("Format de requête invalide"),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validation des données
    const validation = validateChatRequest(requestData);
    if (!validation.isValid) {
      console.error('❌ Validation échouée:', validation.error);
      return NextResponse.json(
        createErrorResponse(validation.error || "Données invalides"),
        { status: 400, headers: corsHeaders }
      );
    }

    const { 
      message, 
      productId, 
      currentStep = 'initial', 
      orderData, 
      sessionId,
      storeId 
    } = requestData;

    console.log('📝 Données validées:', {
      message: message.substring(0, 50) + '...',
      productId,
      currentStep,
      sessionId
    });

    // ✅ CORRECTION: Vérification OpenAI avant utilisation
    if (!openaiClient) {
      console.error('❌ OpenAI client not available');
      return NextResponse.json(
        createErrorResponse(
          "Service IA temporairement indisponible. Veuillez réessayer dans quelques instants.",
          ["🔄 Réessayer", "📞 Contacter le support", "💬 Parler à un humain"]
        ),
        { status: 503, headers: corsHeaders }
      );
    }

    // Redirection directe vers WhatsApp si demandé
    if (message.toLowerCase().includes('parler à un humain') || 
        message.toLowerCase().includes('contacter le support')) {
      return NextResponse.json({
        content: "Je vous redirige vers notre service client sur WhatsApp...",
        type: "assistant",
        redirectUrl: WHATSAPP_LINK,
        choices: [],
        nextStep: currentStep
      }, { headers: corsHeaders });
    }

    // ✅ CORRECTION: Traitement via OptimizedChatService avec gestion d'erreur
    try {
      const optimizedService = OptimizedChatService.getInstance();
      
      // Vérifier si c'est une commande express
      if (message.includes('Commander rapidement') || message.includes('⚡')) {
        console.log('🚀 Démarrage commande express');
        
        const expressResponse = await optimizedService.startExpressPurchase(
          sessionId, 
          productId
        );
        
        console.log('✅ Réponse express générée');
        return NextResponse.json(expressResponse, { headers: corsHeaders });
      }

      // Vérifier si nous sommes dans un flow express
      if (currentStep?.includes('express')) {
        console.log('🔄 Traitement étape express:', currentStep);
        
        const expressResponse = await optimizedService.handleExpressStep(
          sessionId,
          message,
          currentStep
        );
        
        console.log('✅ Étape express traitée');
        return NextResponse.json(expressResponse, { headers: corsHeaders });
      }

      // ✅ CORRECTION MAJEURE: Traitement des messages libres avec IA
      console.log('🤖 Traitement message libre avec IA');
      
      // Vérifier si le message contient des choix prédéfinis
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
        message.includes(choice)
      );

      if (isPredefinedChoice) {
        console.log('🔘 Traitement choix prédéfini');
        
        const choiceResponse = await optimizedService.handlePredefinedChoice(
          sessionId,
          message,
          productId
        );
        
        console.log('✅ Choix prédéfini traité');
        return NextResponse.json(choiceResponse, { headers: corsHeaders });
      }

      // ✅ NOUVEAU: Message libre - utiliser l'IA
      console.log('🧠 Traitement message libre avec IA avancée');
      
      try {
        const aiResponse = await optimizedService.processUserInput(
          sessionId,
          message,
          currentStep
        );
        
        console.log('✅ IA: Réponse générée avec succès');
        return NextResponse.json(aiResponse, { headers: corsHeaders });
        
      } catch (aiError) {
        console.error('❌ Erreur IA:', aiError);
        
        // ✅ GESTION SPÉCIFIQUE DES ERREURS OPENAI
        let errorMessage = "Erreur de traitement du message";
        let errorChoices = ["🔄 Réessayer", "📞 Contacter le support"];
        
        if (aiError instanceof Error) {
          if (aiError.message.includes('429')) {
            errorMessage = "Trop de demandes simultanées. Veuillez patienter quelques secondes.";
            errorChoices = ["⏰ Attendre et réessayer", "📞 Contacter le support"];
          } else if (aiError.message.includes('quota')) {
            errorMessage = "Service IA temporairement surchargé. Essayez dans quelques minutes.";
            errorChoices = ["⏰ Réessayer plus tard", "📞 Contacter le support"];
          } else if (aiError.message.includes('timeout')) {
            errorMessage = "Délai d'attente dépassé. Veuillez réessayer.";
          }
        }
        
        return NextResponse.json(
          createErrorResponse(errorMessage, errorChoices),
          { status: 503, headers: corsHeaders }
        );
      }

    } catch (serviceError) {
      console.error('❌ Erreur OptimizedChatService:', serviceError);
      
      return NextResponse.json(
        createErrorResponse(
          "Erreur lors du traitement de votre demande. Nos équipes sont notifiées.",
          ["🔄 Réessayer", "📞 Contacter le support", "💬 Parler à un humain"]
        ),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("❌ Erreur API générale:", error);
    
    // Log détaillé pour debug
    console.error("Détails de l'erreur:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      createErrorResponse(
        "Erreur système. Nos équipes techniques sont notifiées.",
        ["🔄 Réessayer", "📞 Contacter le support", "💬 WhatsApp"]
      ),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}