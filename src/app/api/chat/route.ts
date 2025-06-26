// src/app/api/chat/route.ts - VERSION CORRIGÉE ET OPTIMISÉE
import { NextRequest, NextResponse } from "next/server";
import { OptimizedChatService } from "@/lib/services/OptimizedChatService";
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
  currentStep?: ConversationStep;
  orderData?: any;
  sessionId: string;
  storeId: string;
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

// ✅ GESTION OPTIONS (CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ✅ ENDPOINT PRINCIPAL CORRIGÉ ET OPTIMISÉ
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Chat API called - CORRECTED VERSION');
    
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
      currentStep: body.currentStep,
      sessionId: body.sessionId?.substring(0, 8) + '...'
    });

    const chatRequest: ChatRequest = {
      message: body.message || '',
      productId: body.productId || '',
      currentStep: (body.currentStep as ConversationStep) || 'initial',
      orderData: body.orderData || {},
      sessionId: body.sessionId || `session_${Date.now()}`,
      storeId: body.storeId || 'default'
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

    // ✅ TRAITEMENT AVEC LE SERVICE CORRIGÉ
    console.log('💬 Processing with CORRECTED OptimizedChatService...');
    
    const chatService = OptimizedChatService.getInstance();
    
    // ✅ RÉCUPÉRER LE NOM DU PRODUIT DEPUIS LA BASE avec gestion d'erreur
    let productName = 'Le Jeu Pour les Couples'; // Valeur par défaut
    
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
      // Continuer avec le nom par défaut
    }
    
    // ✅ APPEL DU SERVICE CORRIGÉ avec gestion d'erreur complète
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
• Essayez de rafraîchir la page
• Ou contactez-nous directement

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

    return NextResponse.json({
      message: 'VIENS ON S\'CONNAÎT Chat API is running! 🌹',
      version: '3.0.0 - CORRECTED',
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      endpoints: {
        POST: '/api/chat - Send chat message',
        OPTIONS: '/api/chat - CORS preflight',
        GET: '/api/chat - Health check'
      },
      features: [
        'Corrected Wave payment flow',
        'Fluent conversation experience',
        'Fixed desktop welcome message',
        'Mobile cart bar display',
        'Enhanced error recovery',
        'Real-time chat support'
      ],
      fixes: [
        'Fixed order_status -> status column mapping',
        'Enhanced conversation fluidity',
        'Corrected desktop initialization',
        'Fixed mobile cart detection',
        'Improved error handling',
        'Better session management'
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