// src/app/api/chat/route.ts - VERSION ENTIÈREMENT CORRIGÉE AVEC PRIORITÉ IA GPT-4o

import { NextRequest, NextResponse } from "next/server";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { AIManager } from "@/lib/services/AIManager";
import OpenAI from "openai";
import type { ConversationStep } from '@/types/chat';

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
  productName?: string;
  currentStep?: ConversationStep;
  orderData?: any;
  sessionId: string;
  storeId: string;
  forceAI?: boolean;
}

interface ChatResponse {
  success: boolean;
  message: string;
  choices: string[];
  nextStep: ConversationStep;
  type: 'assistant';
  orderData?: any;
  flags?: any;
  error?: string;
}

// ✅ INITIALISATION OPENAI
let openai: OpenAI | null = null;

function initializeOpenAI() {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI initialized with GPT-4o for direct API calls');
  } else {
    console.warn('⚠️ OPENAI_API_KEY not found in environment');
  }
}

// Initialiser OpenAI au démarrage
initializeOpenAI();

// ✅ GESTION OPTIONS (CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ✅ ENDPOINT PRINCIPAL CORRIGÉ AVEC PRIORITÉ IA GPT-4o
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Chat API called - PRIORITY AI GPT-4o VERSION');
    
    // Parser la requête avec gestion d'erreur
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Format de requête invalide',
        choices: ['🔄 Réessayer'],
        nextStep: 'parse_error' as ConversationStep,
        type: 'assistant',
        error: 'Invalid JSON format'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    console.log('📥 Request body parsed:', {
      message: body.message?.substring(0, 50),
      productId: body.productId,
      productName: body.productName,
      currentStep: body.currentStep,
      sessionId: body.sessionId?.substring(0, 8) + '...',
      forceAI: body.forceAI
    });

    const chatRequest: ChatRequest = {
      message: body.message || '',
      productId: body.productId || '',
      productName: body.productName || '',
      currentStep: (body.currentStep as ConversationStep) || 'initial',
      orderData: body.orderData || {},
      sessionId: body.sessionId || `session_${Date.now()}`,
      storeId: body.storeId || 'default',
      forceAI: body.forceAI || false
    };

    // ✅ VÉRIFICATIONS RENFORCÉES
    if (!chatRequest.message.trim()) {
      return NextResponse.json({
        success: false,
        message: '🤔 **Que souhaitez-vous me dire ?**\n\nJe suis là pour vous aider !',
        choices: [
          'Je veux acheter un jeu',
          'J\'ai des questions',
          'Découvrir vos jeux'
        ],
        nextStep: 'empty_message' as ConversationStep,
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
        message: '😅 **Oups ! Petite erreur technique**\n\nVeuillez rafraîchir la page et réessayer.',
        choices: [
          '🔄 Rafraîchir la page',
          '🏠 Retour à l\'accueil'
        ],
        nextStep: 'missing_product' as ConversationStep,
        type: 'assistant',
        error: 'Missing product ID'
      }, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // ✅ PRIORITÉ 1: FORCER L'IA GPT-4o DIRECTEMENT
    if (chatRequest.forceAI) {
      console.log('🤖 AI response FORCED by client request - using GPT-4o DIRECTLY');
      
      try {
        // ✅ Récupérer le nom du produit depuis la base si nécessaire
        let productName = chatRequest.productName || 'Le Jeu Pour les Couples';
        
        if (!chatRequest.productName) {
          const { supabase } = await import('@/lib/supabase');
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name')
            .eq('id', chatRequest.productId)
            .single();
          
          if (!productError && product?.name) {
            productName = product.name;
          }
        }

        // ✅ APPEL DIRECT GPT-4o AVEC PROMPT OPTIMISÉ
        const gptResponse = await getDirectGPT4oResponse(
          chatRequest.message,
          chatRequest.productId,
          productName,
          chatRequest.sessionId
        );

        if (gptResponse) {
          const forcedResponse: ChatResponse = {
            success: true,
            message: gptResponse,
            choices: [
              'Je veux l\'acheter maintenant',
              'J\'ai d\'autres questions',
              'Comment y jouer ?',
              'Voir les témoignages'
            ],
            nextStep: 'ai_response' as ConversationStep,
            type: 'assistant',
            flags: { 
              aiForced: true,
              aiUsed: true,
              gptModel: 'gpt-4o',
              confidence: 0.9
            }
          };

          console.log('✅ Direct GPT-4o response generated successfully');
          return NextResponse.json(forcedResponse, { headers: corsHeaders });
        }

      } catch (aiError) {
        console.error('❌ Direct GPT-4o error:', aiError);
        
        // Fallback intelligent
        return NextResponse.json({
          success: true,
          message: `Je comprends votre question sur le **jeu ${chatRequest.productName || 'VIENS ON S\'CONNAÎT'}**.

Nos jeux de cartes sont conçus pour créer des conversations authentiques et renforcer les liens entre les individus. Chaque jeu contient 150 cartes de questions soigneusement pensées et sélectionnées.

Que souhaitez-vous savoir précisément ?`,
          choices: [
            'Comment y jouer ?',
            'C\'est pour qui ?',
            'Je veux l\'acheter maintenant',
            'J\'ai d\'autres questions'
          ],
          nextStep: 'ai_fallback' as ConversationStep,
          type: 'assistant',
          flags: { aiFallback: true }
        }, { headers: corsHeaders });
      }
    }

    // ✅ PRIORITÉ 2: TRAITEMENT NORMAL AVEC LE SERVICE OPTIMISÉ
    console.log('💬 Processing with OptimizedChatService (AI PRIORITY enabled)...');
    
    const chatService = OptimizedChatService.getInstance();
    
    // ✅ RÉCUPÉRER LE NOM DU PRODUIT DEPUIS LA BASE avec gestion d'erreur
    let productName = chatRequest.productName || 'Le Jeu Pour les Couples';
    
    if (!chatRequest.productName) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('name')
          .eq('id', chatRequest.productId)
          .single();
        
        if (!productError && product?.name) {
          productName = product.name;
          console.log('✅ Product name retrieved:', productName);
        } else {
          console.log('⚠️ Using default product name, error:', productError?.message);
        }
      } catch (dbError) {
        console.error('❌ Database error retrieving product:', dbError);
      }
    }
    
    // ✅ APPEL DU SERVICE OPTIMISÉ avec gestion d'erreur complète
    let response;
    try {
      response = await chatService.processMessage(
        chatRequest.sessionId,
        chatRequest.message,
        chatRequest.currentStep as ConversationStep,
        chatRequest.productId,
        productName
      );
      
      console.log('✅ Service response received successfully:', {
        type: response.type,
        hasChoices: (response.choices?.length || 0) > 0,
        nextStep: response.metadata?.nextStep,
        hasFlags: !!response.metadata?.flags
      });
      
    } catch (serviceError) {
      console.error('❌ OptimizedChatService error:', serviceError);
      
      // Créer une réponse de fallback
      response = {
        type: 'assistant' as const,
        content: `😔 **Une petite erreur s'est produite**

Ne vous inquiétez pas, essayons autrement !

**Erreur :** ${serviceError instanceof Error ? serviceError.message : 'Erreur inconnue'}`,
        choices: [
          '🔄 Réessayer',
          '📞 Contacter le support',
          '🏠 Retour à l\'accueil'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'service_error' as ConversationStep,
          flags: { hasError: true, serviceError: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CONVERTIR LA RÉPONSE AU FORMAT ATTENDU
    const chatResponse: ChatResponse = {
      success: true,
      message: typeof response.content === 'string' ? response.content : String(response.content),
      choices: response.choices || [],
      nextStep: (response.metadata?.nextStep as ConversationStep) || chatRequest.currentStep,
      type: 'assistant',
      orderData: response.metadata?.orderData,
      flags: response.metadata?.flags
    };

    console.log('✅ Chat response generated successfully');
    return NextResponse.json(chatResponse, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ CRITICAL Chat API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: `🔧 **Maintenance en cours**

Nous rencontrons un petit problème technique. Nos équipes travaillent à le résoudre.

**En attendant :**
- Essayez de rafraîchir la page
- Ou contactez-nous directement

**WhatsApp :** +221 78 136 27 28`,
      choices: [
        '🔄 Rafraîchir la page',
        '📱 WhatsApp Support',
        '🔙 Recommencer'
      ],
      nextStep: 'critical_error' as ConversationStep,
      type: 'assistant',
      error: error instanceof Error ? error.message : 'Critical system error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ✅ NOUVELLE FONCTION: Appel direct GPT-4o optimisé
async function getDirectGPT4oResponse(
  message: string,
  productId: string,
  productName: string,
  sessionId: string
): Promise<string | null> {
  try {
    if (!openai) {
      initializeOpenAI();
      if (!openai) {
        throw new Error('OpenAI not initialized');
      }
    }

    console.log('🤖 Making direct GPT-4o call for:', message.substring(0, 50));

    // ✅ RÉCUPÉRER INFOS PRODUIT POUR CONTEXTE
    let productInfo: any = {};
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('products')
        .select('description, price, target_audience, game_rules, benefits')
        .eq('id', productId)
        .single();

      if (!error && data) {
        productInfo = data;
      }
    } catch (dbError) {
      console.warn('⚠️ Could not fetch product info:', dbError);
    }

    // ✅ PROMPT SYSTÈME OPTIMISÉ POUR VIENS ON S'CONNAÎT
    const systemPrompt = `Tu es Rose, l'assistante commerciale IA de VIENS ON S'CONNAÎT, une marque africaine spécialisée dans les jeux de cartes relationnels.

CONTEXTE MARQUE:
VIENS ON S'CONNAÎT est une marque de jeux de cartes (physiques + numériques) qui facilitent des conversations authentiques pour renforcer les liens entre les individus : couples, amis, familles, collègues.

PRODUIT ACTUEL:
- Nom: le jeu ${productName}
- Prix: ${productInfo.price || '14,000'} FCFA
- Description: ${productInfo.description || 'Jeu de 150 cartes pour renforcer les relations'}
- Cible: ${productInfo.target_audience || 'Adultes 18+'}

CARACTÉRISTIQUES COMMUNES:
- 150 cartes de questions à se poser
- Favorise les échanges authentiques
- Disponible en version physique et numérique
- Format premium, impression locale responsable
- Durée: Indéterminée, pas de limite de temps
- Règles simples, accessibles à tous
- Inclusif, adapté à tous les types de relations
- Livraison gratuite à Dakar, à partir de 2500 FCFA dans les autres villes du Sénégal

MISSION: Répondre aux questions avec chaleur, expertise et orientation commerciale.
STYLE: Amicale, professionnelle, orientée conversion. 
TON: Adapté au contexte sénégalais, chaleureux et engageant. TOUJOURS UTILISER LE VOUVOIEMENT.
OBJECTIF: Convertir les visiteurs en clients en mettant en avant les bénéfices relationnels des jeux.
RÈGLES DE RÉPONSE: Toujours terminer par une question pour inciter à l'achat ou à poser une autre question.
EXEMPLE DE RÉPONSE: Ce jeu est parfait pour les couples mariés qui à approfondir leur connexion et renforcer leur complicité. Il vous permettra de découvrir des facettes insoupçonnées de votre partenaire et de tisser des liens plus forts. Voulez-vous l'acheter maintenant ou avez-vous une autre question ?
STRUCTURE: Réponse claire + question d'engagement.

RÈGLES IMPORTANTES:
1. Toujours mentionner "le jeu" avant le nom du produit
2. Mettre l'accent sur les bénéfices relationnels
3. Adapter le ton au contexte africain
4. Finir par une question pour inciter à l'action ou à poser une autre question
5. Proposer l'achat ou le téléchargement de l'app mobile quand pertinent
6. Maximum 3 phrases + question pertinente d'engagement
7. Utiliser des émojis appropriés mais avec parcimonie

Réponds directement en texte (pas JSON), de manière naturelle et engageante.`;

    // ✅ APPEL GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response && response.trim()) {
      console.log('✅ Direct GPT-4o response generated successfully');
      return response.trim();
    }

    throw new Error('Empty GPT-4o response');

  } catch (error) {
    console.error('❌ Direct GPT-4o error:', error);
    return null;
  }
}

// ✅ MÉTHODE GET POUR VÉRIFIER L'ÉTAT DE L'API
export async function GET() {
  try {
    // Test rapide de la base de données
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .single();

    const dbStatus = error ? 'disconnected' : 'connected';

    // Test OpenAI
    const openaiStatus = process.env.OPENAI_API_KEY ? 'configured' : 'not_configured';

    return NextResponse.json({
      message: 'VIENS ON S\'CONNAÎT Chat API is running! 🌹',
      version: '5.0.0 - PRIORITY AI GPT-4o VERSION',
      status: 'healthy',
      database: dbStatus,
      openai: openaiStatus,
      timestamp: new Date().toISOString(),
      endpoints: {
        POST: '/api/chat - Send chat message (with AI PRIORITY support)',
        OPTIONS: '/api/chat - CORS preflight',
        GET: '/api/chat - Health check'
      },
      features: [
        'PRIORITY AI GPT-4o for free text responses',
        'Direct GPT-4o calls with optimized prompts',
        'Enhanced conversation experience',
        'Real-time product data integration',
        'Fixed welcome message handling',
        'Corrected upsell recommendations with real data',
        'Mobile cart bar display',
        'Enhanced error recovery',
        'Real-time chat support'
      ],
      fixes: [
        'AI PRIORITY: GPT-4o responses for all free text',
        'Direct OpenAI integration with optimized prompts',
        'Enhanced AI Manager integration',
        'Fixed forceAI parameter support',
        'Improved fallback responses',
        'Better error handling for AI requests',
        'Fixed "le jeu" prefix for all product names',
        'Corrected upsell data from Supabase',
        'Enhanced conversation fluidity'
      ]
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    return NextResponse.json({
      message: 'API Health Check Failed',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}