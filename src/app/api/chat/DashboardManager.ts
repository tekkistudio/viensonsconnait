// app/api/chat/DashboardManager.ts
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

const initOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not configured in environment variables');
    throw new Error('OpenAI API key is not configured');
  }
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
      console.log('Processing request with context:', context);

      const formattedData = getContextSpecificMetrics(context.page, context.data);
      
      // Sécuriser l'extraction du montant des ventes
      let salesAmount = '0 FCFA';
      try {
        salesAmount = formattedData.dailySales || '0 FCFA';
      } catch (e) {
        console.error('Error extracting sales amount:', e);
      }

      // Obtenir la réponse de base en fonction du niveau des ventes
      const salesLevel = this.getSalesLevel(salesAmount);
      const baseResponse = this.getBaseResponse(salesLevel, salesAmount);

      const systemPrompt = `Tu es un Assistant Business IA spécialisé dans l'accompagnement des marchands africains qui se lancent dans l'e-commerce.
        
        CONTEXTE ACTUEL :
        Page : ${context?.page || 'Dashboard'}
        Données disponibles : ${JSON.stringify(formattedData || {}, null, 2)}
        
        RÉPONSE DE BASE :
        ${JSON.stringify(baseResponse, null, 2)}
          
          RÈGLES ESSENTIELLES :
          1. Utilise UNIQUEMENT le FCFA comme devise
          2. Parle simplement, comme à un ami qui débute
          3. Donne des exemples concrets adaptés au marché africain
          4. Explique les termes techniques comme "taux de conversion" simplement
          
          SPÉCIFICITÉS MARCHÉ :
          - Les clients préfèrent Wave et Orange Money
          - La confiance client est cruciale
          - Les photos de qualité rassurent les clients
          - Le bouche-à-oreille est important
          
          CONSEILS PRIORITAIRES :
          - Comment prendre de belles photos des produits
          - Comment gérer les commandes efficacement
          - Comment fidéliser les clients
          - Comment utiliser WhatsApp Business
          
          FORMAT DE RÉPONSE :
          {
            "message": "Ta réponse personnalisée et encourageante",
            "conseils": ["2-3 conseils pratiques et actionnables"],
            "actions": ["Actions prioritaires à faire maintenant"],
            "points_cles": ["Points importants à retenir"]
          }
          
          ADAPTE TON LANGAGE :
          - Parle comme un ami qui conseille
          - Évite le jargon technique
          - Sois encourageant et positif
          - Donne des exemples locaux
          
          RÉPONSE TOUJOURS EN FRANÇAIS`;
  
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
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
            response_format: { type: "json_object" }
          });
    
          const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");
          
          // Combiner la réponse de base avec la réponse de l'IA
          const finalResponse = {
            content: aiResponse.message || baseResponse.message,
            type: 'assistant',
            insights: aiResponse.points_cles || baseResponse.insights,
            actions: aiResponse.actions || baseResponse.actions,
            suggestions: aiResponse.conseils || [
              "Comment améliorer mes photos produits ?",
              "Comment utiliser WhatsApp Business ?",
              "Comment fidéliser mes clients ?"
            ]
          };
    
          // Sauvegarder l'interaction
          try {
            await supabase.from('chat_messages').insert([{
              content: message,
              response: JSON.stringify(finalResponse),
              type: 'dashboard',
              context: context,
              created_at: new Date().toISOString()
            }]);
          } catch (error) {
            console.error('Error saving chat message:', error);
          }
    
          return NextResponse.json(finalResponse);
    
        } catch (error) {
          console.error('Dashboard AI Error:', error);
          // Retourner une réponse plus détaillée en cas d'erreur
          return NextResponse.json({
            content: "Je suis désolé de ce problème technique. Voici ce que je peux vous dire avec les informations disponibles.",
            type: 'assistant',
            insights: [
              "Il est important de vérifier régulièrement vos performances",
              "N'hésitez pas à utiliser les outils à votre disposition"
            ],
            suggestions: ["Réessayer", "Parler à un conseiller"],
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: error instanceof Error && error.message.includes('OpenAI API key') ? 500 : 200 });
        }
      }
    
      private static getSalesLevel(salesString: string): 'noSales' | 'lowSales' | 'goodSales' {
        try {
          const amount = parseInt(salesString.replace(/[^\d]/g, ''));
          if (isNaN(amount) || amount === 0) return 'noSales';
          if (amount < 50000) return 'lowSales';
          return 'goodSales';
        } catch (e) {
          console.error('Error in getSalesLevel:', e);
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
          console.error('Error in getBaseResponse:', e);
          return RESPONSE_TEMPLATES.noSales;
        }
      }
    }
    