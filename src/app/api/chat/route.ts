// src/app/api/chat/route.ts - VERSION COMMERCIALE ORIENTÉE VENTE AVEC VOUVOIEMENT

import { NextRequest, NextResponse } from "next/server";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
import { AIManager } from "@/lib/services/AIManager";
import { PurchaseIntentDetector } from "@/lib/services/PurchaseIntentDetector";
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
  intentAnalysis?: any; // Nouvelle propriété pour l'analyse d'intention
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
  intentScore?: number; // Nouveau: score d'intention
}

// ✅ INITIALISATION OPENAI
let openai: OpenAI | null = null;

function initializeOpenAI() {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI initialized with GPT-4o for COMMERCIAL RESPONSES');
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

// ✅ ENDPOINT PRINCIPAL COMMERCIAL ORIENTÉ VENTE
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Commercial Chat API called - SALES ORIENTED VERSION');
    
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
      forceAI: body.forceAI || false,
      intentAnalysis: body.intentAnalysis
    };

    // ✅ VÉRIFICATIONS RENFORCÉES
    if (!chatRequest.message.trim()) {
      return NextResponse.json({
        success: false,
        message: '🤔 **Que souhaitez-vous me dire ?**\n\nJe suis là pour vous aider avec nos jeux !',
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

    // ✅ ANALYSE D'INTENTION D'ACHAT EN PRIORITÉ
    const intentDetector = PurchaseIntentDetector.getInstance();
    let intentAnalysis;
    
    if (!chatRequest.intentAnalysis) {
      console.log('🎯 Analyzing purchase intent...');
      intentAnalysis = intentDetector.analyzePurchaseIntent(chatRequest.message);
      console.log('📊 Intent analysis result:', {
        score: intentAnalysis.score,
        confidence: intentAnalysis.confidence,
        recommendation: intentAnalysis.recommendation
      });
    } else {
      intentAnalysis = chatRequest.intentAnalysis;
    }

    // ✅ PRIORITÉ 1: FORCER L'IA COMMERCIALE DIRECTEMENT
    if (chatRequest.forceAI || intentAnalysis.score > 0) {
      console.log('🤖 Commercial AI response FORCED or Intent detected - using GPT-4o DIRECTLY');
      
      try {
        // ✅ Récupérer le nom du produit depuis la base si nécessaire
        let productName = chatRequest.productName || 'Le Jeu Pour les Couples';
        
        if (!chatRequest.productName) {
          const { supabase } = await import('@/lib/supabase');
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, description, price, target_audience, game_rules, benefits')
            .eq('id', chatRequest.productId)
            .single();
          
          if (!productError && product?.name) {
            productName = product.name;
            
            // ✅ APPEL DIRECT GPT-4o AVEC PROMPT COMMERCIAL AVANCÉ
            const commercialResponse = await getCommercialGPT4oResponse(
              chatRequest.message,
              chatRequest.productId,
              productName,
              chatRequest.sessionId,
              intentAnalysis,
              product // Données produit complètes
            );

            if (commercialResponse) {
              const response: ChatResponse = {
                success: true,
                message: commercialResponse.content,
                choices: commercialResponse.choices,
                nextStep: commercialResponse.nextStep,
                type: 'assistant',
                intentScore: intentAnalysis.score,
                flags: { 
                  commercialAI: true,
                  aiUsed: true,
                  gptModel: 'gpt-4o',
                  confidence: 0.9,
                  vouvoiement: true,
                  salesOriented: true,
                  intentAnalyzed: true,
                  intentScore: intentAnalysis.score
                }
              };

              console.log('✅ Commercial GPT-4o response generated successfully');
              return NextResponse.json(response, { headers: corsHeaders });
            }
          }
        }

      } catch (aiError) {
        console.error('❌ Commercial GPT-4o error:', aiError);
      }
    }

    // ✅ PRIORITÉ 2: TRAITEMENT AVEC LE SERVICE OPTIMISÉ COMMERCIAL
    console.log('💬 Processing with Commercial OptimizedChatService...');
    
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
    
    // ✅ APPEL DU SERVICE OPTIMISÉ COMMERCIAL
    let response;
    try {
      response = await chatService.processMessage(
        chatRequest.sessionId,
        chatRequest.message,
        chatRequest.currentStep as ConversationStep,
        chatRequest.productId,
        productName
      );
      
      console.log('✅ Commercial service response received successfully:', {
        type: response.type,
        hasChoices: (response.choices?.length || 0) > 0,
        nextStep: response.metadata?.nextStep,
        hasFlags: !!response.metadata?.flags
      });
      
    } catch (serviceError) {
      console.error('❌ Commercial OptimizedChatService error:', serviceError);
      
      // Créer une réponse de fallback commerciale
      response = {
        type: 'assistant' as const,
        content: `😔 **Une petite erreur s'est produite**

Ne vous inquiétez pas, essayons autrement !

En attendant, sachez que le **jeu ${productName}** a déjà aidé de nombreux couples et familles au Sénégal à renforcer leurs liens.

**Comment puis-je vous aider à découvrir ce jeu ?**`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'C\'est pour qui ?',
          '📞 Contacter le support'
        ],
        assistant: { name: 'Rose', title: 'Assistante d\'achat' },
        metadata: {
          nextStep: 'service_error' as ConversationStep,
          flags: { hasError: true, serviceError: true, vouvoiement: true, commercialFallback: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ CONVERTIR LA RÉPONSE AU FORMAT COMMERCIAL
    const chatResponse: ChatResponse = {
      success: true,
      message: typeof response.content === 'string' ? response.content : String(response.content),
      choices: response.choices || [],
      nextStep: (response.metadata?.nextStep as ConversationStep) || chatRequest.currentStep,
      type: 'assistant',
      orderData: response.metadata?.orderData,
      flags: {
        ...response.metadata?.flags,
        vouvoiement: true,
        commercialOriented: true
      },
      intentScore: intentAnalysis.score
    };

    console.log('✅ Commercial chat response generated successfully');
    return NextResponse.json(chatResponse, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ CRITICAL Commercial Chat API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: `🔧 **Service temporairement indisponible**

Nous rencontrons un petit problème technique. Nos équipes travaillent à le résoudre.

**En attendant, contactez-nous directement :**
- **WhatsApp :** +221 78 136 27 28
- **Email :** contact@viensonsconnait.com

**Merci pour votre patience !**`,
      choices: [
        '📱 WhatsApp Support',
        '🔄 Réessayer',
        '🏠 Retour accueil'
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

// ✅ NOUVELLE FONCTION: Appel direct GPT-4o commercial optimisé
async function getCommercialGPT4oResponse(
  message: string,
  productId: string,
  productName: string,
  sessionId: string,
  intentAnalysis: any,
  productData?: any
): Promise<{
  content: string;
  choices: string[];
  nextStep: ConversationStep;
} | null> {
  try {
    if (!openai) {
      initializeOpenAI();
      if (!openai) {
        throw new Error('OpenAI not initialized');
      }
    }

    console.log('🤖 Making COMMERCIAL GPT-4o call for:', message.substring(0, 50));

    // ✅ PROMPT SYSTÈME COMMERCIAL ULTRA-OPTIMISÉ
    const commercialSystemPrompt = buildAdvancedCommercialPrompt(
      productData, 
      productName, 
      intentAnalysis
    );

    // ✅ MESSAGE UTILISATEUR AVEC CONTEXTE
    const userPrompt = `MESSAGE CLIENT: "${message}"

ANALYSE D'INTENTION:
- Score d'achat: ${intentAnalysis.score}/100
- Confiance: ${intentAnalysis.confidence}
- Recommandation: ${intentAnalysis.recommendation}
- Signaux détectés: ${intentAnalysis.signals.join(', ')}

INSTRUCTION: Réponds selon les directives commerciales avec VOUVOIEMENT STRICT.`;

    // ✅ APPEL GPT-4o AVEC PROMPT COMMERCIAL
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: commercialSystemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    
    if (result && result.trim()) {
      try {
        const parsed = JSON.parse(result);
        
        // ✅ VALIDATION ET CORRECTION DU VOUVOIEMENT
        const correctedMessage = ensureVouvoiement(parsed.message || parsed.response || "");
        const correctedChoices = (parsed.choices || []).map((choice: string) => ensureVouvoiement(choice));
        
        console.log('✅ Commercial GPT-4o response parsed successfully');
        
        return {
          content: correctedMessage,
          choices: correctedChoices.length > 0 ? correctedChoices : generateDefaultCommercialChoices(intentAnalysis),
          nextStep: parsed.nextStep || determineCommercialNextStep(intentAnalysis)
        };
        
      } catch (parseError) {
        console.error('❌ Failed to parse GPT-4o JSON response:', parseError);
        // Fallback: traiter comme texte simple
        const correctedText = ensureVouvoiement(result);
        return {
          content: correctedText,
          choices: generateDefaultCommercialChoices(intentAnalysis),
          nextStep: determineCommercialNextStep(intentAnalysis)
        };
      }
    }

    throw new Error('Empty GPT-4o response');

  } catch (error) {
    console.error('❌ Commercial GPT-4o error:', error);
    return null;
  }
}

// ✅ PROMPT SYSTÈME COMMERCIAL AVANCÉ
function buildAdvancedCommercialPrompt(
  productData: any,
  productName: string,
  intentAnalysis: any
): string {
  const intentGuidance = intentAnalysis.score > 70 
    ? "URGENCE COMMERCIALE: Le client est prêt à acheter. Focalise sur la FINALISATION de la vente."
    : intentAnalysis.score > 40
      ? "OPPORTUNITÉ COMMERCIALE: Le client hésite. Lève les OBJECTIONS et crée de l'URGENCE douce."
      : "PHASE DÉCOUVERTE: Le client s'informe. Crée de l'INTÉRÊT et qualifie le BESOIN.";

  return `Tu es Rose, l'assistante commerciale EXPERTE de VIENS ON S'CONNAÎT, la marque N°1 de jeux de cartes relationnels au Sénégal et en Afrique.

🎯 MISSION COMMERCIALE: Convertir le visiteur en CLIENT SATISFAIT.

CONTEXTE MARQUE:
VIENS ON S'CONNAÎT est la marque de référence pour renforcer les relations humaines à travers des jeux de cartes innovants. Créée au Sénégal, elle conquiert l'Afrique avec des produits de qualité premium.

PRODUIT FOCUS:
- Nom: le jeu ${productName}
- Prix: ${productData?.price || '14,000'} FCFA (Livraison GRATUITE à Dakar)
- Description: ${productData?.description || 'Jeu révolutionnaire de 150 cartes pour transformer vos relations'}
- Public: ${productData?.target_audience || 'Couples, familles, amis soucieux de leurs relations'}
- Bénéfices clés: ${productData?.benefits || 'Conversations authentiques, liens renforcés, complicité retrouvée'}
- Règles: ${productData?.game_rules ? productData.game_rules.substring(0, 200) : 'Simple à jouer, puissant dans ses effets'}

${intentGuidance}

🔥 TECHNIQUES DE VENTE À APPLIQUER:

SELON L'INTENTION DÉTECTÉE (Score: ${intentAnalysis.score}/100):

${intentAnalysis.score > 70 ? `
✅ CLOSING TECHNIQUE (Score ${intentAnalysis.score}/100):
- Renforcer la décision prise
- Créer urgence: "Forte demande aujourd'hui"
- Rassurer: "Choix parfait pour votre situation"
- Question finale: "Souhaitez-vous finaliser votre commande maintenant ?"
- Éviter de donner d'autres options qui distraient
` : intentAnalysis.score > 40 ? `
⚡ PERSUASION TECHNIQUE (Score ${intentAnalysis.score}/100):
- Lever les dernières hésitations
- Utiliser la preuve sociale: "Nos clients au Sénégal adorent"
- Créer FOMO: "Beaucoup de commandes cette semaine"
- Rassurer sur qualité et livraison
- Question finale: "Qu'est-ce qui vous ferait pencher définitivement ?"
` : `
💡 DÉCOUVERTE TECHNIQUE (Score ${intentAnalysis.score}/100):
- Qualifier le besoin précis
- Montrer bénéfices émotionnels
- Créer connexion personnelle: "Dans votre cas..."
- Éduquer sur l'unicité du produit
- Question finale: inclure option achat + découverte
`}

RÈGLES DE COMMUNICATION STRICTES:
1. 🗣️ VOUVOIEMENT OBLIGATOIRE: vous, votre, êtes, avez (JAMAIS tu, ton, es, as)
2. 📱 ANCRAGE LOCAL: "au Sénégal", "chez nous en Afrique", "livraison gratuite à Dakar"
3. ⭐ PREUVE SOCIALE: "nos clients", "beaucoup de familles", "très demandé"
4. 💰 VALEUR: "investissement dans vos relations", "rapport qualité-prix exceptionnel"
5. ⏰ URGENCE DOUCE: "forte demande", "stock limité", "offre actuelle"
6. 🎯 PERSONNALISATION: "dans votre cas", "pour votre situation", "selon vos besoins"

STRUCTURE RÉPONSE OPTIMALE:
1. Phrase d'accueil chaleureuse (1 ligne)
2. Réponse à la question/préoccupation (2-3 lignes max)
3. Bénéfice émotionnel spécifique (1 ligne)
4. Élément de réassurance/preuve sociale (1 ligne)
5. Question d'engagement orientée achat (1 ligne)

EXEMPLES DE PHRASES POWER:
- "Vous avez raison de vous poser cette question..."
- "C'est exactement pourquoi nos clients au Sénégal adorent ce jeu..."
- "Dans votre situation, ce jeu va transformer..."
- "Beaucoup de couples nous disent qu'ils regrettent de ne pas l'avoir acheté plus tôt..."
- "Avec la forte demande cette semaine..."

ÉMOJIS: Maximum 2 par réponse, choisis stratégiquement.

FORMAT RÉPONSE: JSON strict
{
  "message": "Votre réponse commerciale avec VOUVOIEMENT",
  "choices": [
    "Je veux l'acheter maintenant",
    "Choix orienté commercial 2",
    "Choix orienté commercial 3",
    "J'ai d'autres questions"
  ],
  "nextStep": "étape_commerciale_appropriée"
}

⚠️ INTERDIT: Tutoiement, phrases trop longues, choix qui distraient de l'achat, hésitation dans le ton.

OBJECTIF: Transformer ce visiteur en CLIENT HEUREUX qui recommandera à ses proches.`;
}

// ✅ FONCTION: Assurer le vouvoiement strict
function ensureVouvoiement(text: string): string {
  if (!text) return text;
  
  let correctedText = text;

  // Corrections automatiques COMPLÈTES
  const corrections = [
    // Pronoms personnels
    { from: /\btu\b/gi, to: 'vous' },
    { from: /\btoi\b/gi, to: 'vous' },
    
    // Déterminants possessifs
    { from: /\bton\b/gi, to: 'votre' },
    { from: /\bta\b/gi, to: 'votre' },
    { from: /\btes\b/gi, to: 'vos' },
    
    // Verbes courants
    { from: /\btu es\b/gi, to: 'vous êtes' },
    { from: /\btu as\b/gi, to: 'vous avez' },
    { from: /\btu peux\b/gi, to: 'vous pouvez' },
    { from: /\btu veux\b/gi, to: 'vous voulez' },
    { from: /\btu fais\b/gi, to: 'vous faites' },
    { from: /\btu dis\b/gi, to: 'vous dites' },
    { from: /\btu sais\b/gi, to: 'vous savez' },
    { from: /\btu vois\b/gi, to: 'vous voyez' },
    { from: /\btu cherches\b/gi, to: 'vous cherchez' },
    { from: /\btu achètes\b/gi, to: 'vous achetez' },
    { from: /\btu commandes\b/gi, to: 'vous commandez' },
    
    // Formes contractées
    { from: /\bt'es\b/gi, to: 'vous êtes' },
    { from: /\bt'as\b/gi, to: 'vous avez' },
    
    // Impératifs (plus complexe, quelques cas courants)
    { from: /\bprends\b/gi, to: 'prenez' },
    { from: /\bfais\b/gi, to: 'faites' },
    { from: /\bviens\b/gi, to: 'venez' },
    { from: /\bdis-moi\b/gi, to: 'dites-moi' },
    { from: /\bregarde\b/gi, to: 'regardez' },
    { from: /\bécoute\b/gi, to: 'écoutez' }
  ];

  corrections.forEach(correction => {
    correctedText = correctedText.replace(correction.from, correction.to);
  });

  return correctedText;
}

// ✅ FONCTION: Générer choix commerciaux par défaut
function generateDefaultCommercialChoices(intentAnalysis: any): string[] {
  if (intentAnalysis.score >= 70) {
    return [
      'Je veux l\'acheter maintenant',
      'Combien coûte la livraison ?',
      'Quand sera-t-il livré ?',
      'J\'ai une dernière question'
    ];
  }
  
  if (intentAnalysis.score >= 40) {
    return [
      'Je veux l\'acheter maintenant',
      'Comment y jouer exactement ?',
      'C\'est pour qui précisément ?',
      'Voir les témoignages'
    ];
  }
  
  return [
    'Comment y jouer ?',
    'C\'est pour qui ?',
    'Combien ça coûte ?',
    'Je veux l\'acheter maintenant'
  ];
}

// ✅ FONCTION: Déterminer l'étape commerciale suivante
function determineCommercialNextStep(intentAnalysis: any): ConversationStep {
  if (intentAnalysis.score >= 70) {
    return 'high_purchase_intent';
  }
  
  if (intentAnalysis.score >= 40) {
    return 'medium_purchase_intent';
  }
  
  return 'commercial_discovery';
}

// ✅ MÉTHODE GET POUR VÉRIFIER L'ÉTAT DE L'API COMMERCIALE
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
      message: 'VIENS ON S\'CONNAÎT Commercial Chat API is running! 🌹💼',
      version: '6.0.0 - COMMERCIAL SALES-ORIENTED VERSION',
      status: 'healthy',
      database: dbStatus,
      openai: openaiStatus,
      timestamp: new Date().toISOString(),
      endpoints: {
        POST: '/api/chat - Send commercial chat message (SALES ORIENTED)',
        OPTIONS: '/api/chat - CORS preflight',
        GET: '/api/chat - Health check'
      },
      features: [
        'COMMERCIAL AI GPT-4o with sales psychology',
        'Purchase intent detection and analysis',
        'Vouvoiement enforcement system',
        'Advanced commercial prompts',
        'Sales-oriented conversation flow',
        'Senegalese market adaptation',
        'Real-time product data integration',
        'Commercial fallback responses',
        'Intent-based choice generation',
        'Revenue optimization focus'
      ],
      salesFeatures: [
        'Purchase intent scoring (0-100)',
        'Commercial conversation phases',
        'Objection handling automation',
        'Urgency creation techniques',
        'Social proof integration',
        'Local market positioning',
        'Value proposition emphasis',
        'Closing technique automation',
        'Customer journey optimization',
        'Conversion rate maximization'
      ],
      improvements: [
        'Systematic vouvoiement for African market',
        'Intent-driven response generation',
        'Commercial psychology application',
        'Sales funnel automation',
        'Customer qualification process',
        'Revenue-focused interactions',
        'Conversion optimization',
        'Professional sales approach'
      ]
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Commercial API Health Check Failed',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}