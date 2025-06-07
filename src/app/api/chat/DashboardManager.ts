// app/api/chat/DashboardManager.ts - VERSION AMÉLIORÉE AVEC GPT-4o
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const RESPONSE_TEMPLATES = {
  noSales: {
    message: "Je vois qu'il n'y a pas encore eu de ventes aujourd'hui. Ne vous inquiétez pas, c'est normal au début de l'e-commerce. Analysons ensemble comment améliorer votre visibilité et attirer plus de clients.",
    insights: [
      "La vente en ligne demande souvent un temps d'adaptation",
      "La qualité des photos est cruciale pour attirer les clients",
      "La confiance se construit progressivement en ligne"
    ],
    actions: [
      "Prenez de nouvelles photos de vos produits sous différents angles",
      "Ajoutez des témoignages de clients satisfaits",
      "Partagez votre histoire et votre expertise sur votre page"
    ]
  },
  lowSales: (amount: string) => ({
    message: `Avec ${amount} de ventes aujourd'hui, nous pouvons encore faire mieux ! Voulez-vous que nous regardions ensemble comment augmenter vos ventes ?`,
    insights: [
      "Vos clients apprécient la qualité de vos produits",
      "Le paiement mobile (Wave, Orange Money) rassure vos clients",
      "Les avis clients positifs augmentent la confiance"
    ],
    actions: [
      "Proposez une petite promotion pour les premiers acheteurs",
      "Contactez vos clients fidèles pour leur présenter votre boutique",
      "Mettez en avant vos produits les plus populaires"
    ]
  }),
  goodSales: (amount: string) => ({
    message: `Félicitations ! Vos ventes de ${amount} aujourd'hui sont très encourageantes. Continuons sur cette lancée !`,
    insights: [
      "Vos efforts de présentation portent leurs fruits",
      "La confiance de vos clients en ligne grandit",
      "Votre réputation se développe progressivement"
    ],
    actions: [
      "Pensez à réapprovisionner vos stocks populaires",
      "Demandez des avis à vos clients satisfaits",
      "Élargissez votre gamme de produits populaires"
    ]
  })
};

// ✅ AMÉLIORATION: Initialisation OpenAI sécurisée
const initOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not configured in environment variables');
    throw new Error('OpenAI API key is not configured');
  }
  
  console.log('✅ OpenAI initialized for Dashboard with GPT-4o');
  return new OpenAI({ apiKey });
};

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

const getContextSpecificMetrics = (page: string, data: any) => {
  const baseMetrics = {
    ...data,
    dailySales: formatCurrency(data?.dailySales || 0)
  };

  switch (page.toLowerCase()) {
    case 'dashboard':
      return {
        ...baseMetrics,
        conversionRate: `${(data?.conversionRate || 0).toFixed(2)}%`,
        previousPeriodComparison: data?.previousPeriod ? {
          sales: formatCurrency(data?.previousPeriod?.sales || 0),
          growth: `${((data?.dailySales - data?.previousPeriod?.sales) / data?.previousPeriod?.sales * 100).toFixed(2)}%`
        } : null
      };
    case 'orders':
      return {
        ...baseMetrics,
        pendingOrders: data?.orderStatuses?.pending || 0,
        processingOrders: data?.orderStatuses?.processing || 0,
        averageOrderValue: formatCurrency(data?.averageOrderValue || 0)
      };
    case 'products':
      return {
        ...baseMetrics,
        lowStock: data?.lowStockProducts || [],
        popularProducts: data?.popularProducts || [],
        stockValue: formatCurrency(data?.stockValue || 0)
      };
    default:
      return baseMetrics;
  }
};

export class DashboardManager {
  static async handleChatRequest(message: string, context: any) {
    try {
      const openai = initOpenAI();
      console.log('🔄 Processing dashboard request with context:', context?.page);

      const formattedData = getContextSpecificMetrics(context?.page || 'dashboard', context?.data || {});
      
      // ✅ AMÉLIORATION: Extraction sécurisée du montant des ventes
      let salesAmount = '0 FCFA';
      try {
        salesAmount = formattedData.dailySales || '0 FCFA';
      } catch (e) {
        console.error('❌ Error extracting sales amount:', e);
        salesAmount = '0 FCFA';
      }

      // ✅ AMÉLIORATION: Obtenir la réponse de base
      const salesLevel = this.getSalesLevel(salesAmount);
      const baseResponse = this.getBaseResponse(salesLevel, salesAmount);

      // ✅ PROMPT AMÉLIORÉ POUR GPT-4o
      const systemPrompt = `Tu es un Assistant Business IA expert en e-commerce africain. Tu accompagnes les marchands dans leur transition numérique.

CONTEXTE MARCHAND :
Page actuelle : ${context?.page || 'Dashboard'}
Données de performance : ${JSON.stringify(formattedData, null, 2)}

RÉPONSE DE BASE À ENRICHIR :
${JSON.stringify(baseResponse, null, 2)}

TON EXPERTISE :
- E-commerce en Afrique francophone
- Paiements mobiles (Wave, Orange Money, MTN)
- WhatsApp Business et réseaux sociaux
- Photos produits et présentation
- Fidélisation client africaine

RÈGLES DE COMMUNICATION :
1. Parle comme un ami qui connaît bien le business
2. Utilise UNIQUEMENT le FCFA comme devise
3. Donne des exemples concrets et locaux
4. Sois encourageant et pratique
5. Évite le jargon technique

CONSEILS PRIORITAIRES :
- Comment améliorer les photos produits avec un smartphone
- Stratégies WhatsApp Business efficaces
- Gestion des avis clients et bouche-à-oreille
- Optimisation pour les paiements mobiles

RÉPONSE REQUISE (JSON) :
{
  "message": "Réponse personnalisée, chaleureuse et actionnable",
  "conseils": ["2-3 conseils pratiques spécifiques"],
  "actions": ["Actions prioritaires à faire maintenant"],
  "points_cles": ["Points importants à retenir"],
  "suggestions_questions": ["Questions de suivi pertinentes"]
}

MESSAGE DU MARCHAND : "${message}"

Adapte ta réponse selon leur niveau et sois toujours positif !`;

      console.log('🤖 Sending to GPT-4o for dashboard analysis...');

      // ✅ AMÉLIORATION: Utilisation de GPT-4o
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      console.log('✅ GPT-4o dashboard response generated');

      // ✅ AMÉLIORATION: Combinaison intelligente des réponses
      const finalResponse = {
        content: aiResponse.message || baseResponse.message,
        type: 'assistant',
        insights: aiResponse.points_cles || baseResponse.insights,
        actions: aiResponse.actions || baseResponse.actions,
        suggestions: aiResponse.suggestions_questions || [
          "Comment améliorer mes photos produits ?",
          "Comment utiliser WhatsApp Business efficacement ?",
          "Comment fidéliser mes clients en ligne ?"
        ]
      };

      // ✅ AMÉLIORATION: Sauvegarde améliorée
      try {
        await supabase.from('chat_messages').insert([{
          content: message,
          response: JSON.stringify(finalResponse),
          type: 'dashboard',
          context: {
            page: context?.page,
            salesLevel: salesLevel,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        }]);
        console.log('✅ Dashboard interaction saved');
      } catch (error) {
        console.error('⚠️ Error saving chat message:', error);
      }

      return NextResponse.json(finalResponse);

    } catch (error) {
      console.error('❌ Dashboard AI Error:', error);
      
      // ✅ AMÉLIORATION: Gestion d'erreur plus robuste
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isConfigError = errorMessage.includes('OpenAI API key');
      
      return NextResponse.json({
        content: isConfigError 
          ? "Configuration technique en cours. Voici mes conseils basés sur votre situation :"
          : "Problème technique temporaire. Laissez-moi vous donner quelques conseils pratiques :",
        type: 'assistant',
        insights: [
          "Vérifiez régulièrement vos performances de vente",
          "Les photos de qualité augmentent les ventes de 40%",
          "WhatsApp Business est essentiel en Afrique"
        ],
        actions: [
          "Prenez de meilleures photos de vos produits",
          "Activez WhatsApp Business",
          "Demandez des avis à vos clients"
        ],
        suggestions: [
          "Comment prendre de meilleures photos ?",
          "Configurer WhatsApp Business",
          "Réessayer l'assistant IA"
        ],
        error: isConfigError ? 'CONFIG_ERROR' : 'TEMPORARY_ERROR'
      }, { 
        status: isConfigError ? 500 : 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }
  }

  // ✅ AMÉLIORATION: Méthodes privates plus robustes
  private static getSalesLevel(salesString: string): 'noSales' | 'lowSales' | 'goodSales' {
    try {
      const amount = parseInt(salesString.replace(/[^\d]/g, ''));
      if (isNaN(amount) || amount === 0) return 'noSales';
      if (amount < 50000) return 'lowSales';
      return 'goodSales';
    } catch (e) {
      console.error('❌ Error in getSalesLevel:', e);
      return 'noSales';
    }
  }

  private static getBaseResponse(salesLevel: 'noSales' | 'lowSales' | 'goodSales', salesAmount: string) {
    try {
      switch (salesLevel) {
        case 'noSales':
          return RESPONSE_TEMPLATES.noSales;
        case 'lowSales':
          return RESPONSE_TEMPLATES.lowSales(salesAmount);
        case 'goodSales':
          return RESPONSE_TEMPLATES.goodSales(salesAmount);
        default:
          return RESPONSE_TEMPLATES.noSales;
      }
    } catch (e) {
      console.error('❌ Error in getBaseResponse:', e);
      return RESPONSE_TEMPLATES.noSales;
    }
  }
}