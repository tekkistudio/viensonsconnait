// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PRODUCTS_INFO } from "@/config/products";
import { PAYMENT_URLS } from "@/config/payment";
import { 
  type OrderData,
  type ChatMessage,
  type AIResponse,
  type ConversationStep,
  type OrderStatus,
  type OrderMetadata,
  type ProductId
} from "@/features/product/types/chat";
import { 
  GENERIC_CHOICES, 
  GENERIC_MESSAGES, 
  generateInitialMessages,
} from "../../../features/product/utils/chatMessages";
import { DashboardManager } from './DashboardManager';
import { AIManager } from '@/lib/services/AIManager';

export { config } from './config';

const WHATSAPP_LINK = "https://wa.me/221781362728";

// Headers CORS communs
const corsHeaders = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

type ChatContext = 'product' | 'dashboard';

interface ExtendedChatRequest {
  message: string;
  context: ChatContext;
  productId?: ProductId;
  currentStep?: ConversationStep;
  orderData?: Partial<OrderData>;
  dashboardContext?: {
    page: string;
    data: any;
  };
}

interface BuyingIntent {
  score: number;
  triggers: string[];
}

interface ProductRelation {
  id: ProductId;
  priority: number;
}

let openai: ReturnType<typeof AIManager.getInstance>;
try {
  openai = AIManager.getInstance();
} catch (error) {
  console.error('Error initializing OpenAI:', error);
}

// Configuration des intentions d'achat avec leurs scores et déclencheurs
const BUYING_INTENTS: BuyingIntent[] = [
  { 
    score: 1.0, 
    triggers: [
      "je veux l'acheter", "je veux commander", "je prends", 
      "je souhaite acheter", "j'achète", "je le veux", "je commande",
      "je vais le prendre", "vendez moi", "c'est d'accord", "je l'achète", 
      "je commande", "j'en veux un", "acheter", "ok, je le prends", "vendez-moi", 
      "comment l'acheter", "je le prends", "je le prend"
    ]
  },
  { 
    score: 0.9,
    triggers: [
      "c'est ce que je veux", "je suis convaincu", "ça me convient",
      "c'est exactement ce que je cherche", "vous m'avez convaincu",
      "il m'intéresse", "je vais peut-être le prendre"
    ]
  },
  { 
    score: 0.8, 
    triggers: [
      "acheter", "commander", "payer", "prix final",
      "procéder à l'achat", "passer commande"
    ]
  },
  { 
    score: 0.7,
    triggers: [
      "ça m'intéresse beaucoup", "très intéressant",
      "je pense que je vais prendre", "c'est un bon prix",
      "c'est ce que je cherchais", "j'en voulais un", "c'est intéressant"
    ]
  },
  { 
    score: 0.6, 
    triggers: [
      "prix", "tarif", "coût", "quel est le prix",
      "combien ça coûte", "moyens de paiement", "livraison",
      "ça coûte combien", "c'est combien", "il est à combien"
    ]
  },
  { 
    score: 0.4, 
    triggers: [
      "combien", "intéressé", "intéressée", "délai de livraison",
      "modes de paiement", "réfléchir", "wave", "orange money",
      "à la livraison", "paiement", "cash", "carte bancaire", "carte"
    ]
  }
];

// Configuration du cross-selling entre produits
const CROSS_SELLING: Record<ProductId, ProductRelation[]> = {
  couples: [{ id: "stvalentin", priority: 1 }, { id: "maries", priority: 2 }],
  maries: [{ id: "stvalentin", priority: 1 }, { id: "couples", priority: 2 }],
  famille: [{ id: "amis", priority: 1 }, { id: "collegues", priority: 2 }],
  amis: [{ id: "famille", priority: 1 }, { id: "collegues", priority: 2 }],
  collegues: [{ id: "amis", priority: 1 }, { id: "famille", priority: 2 }],
  stvalentin: [{ id: "couples", priority: 1 }, { id: "maries", priority: 2 }],
};

// Mots-clés pour l'analyse contextuelle
const CONTEXT_KEYWORDS = {
  intimite: [
    "intimité", "couple", "amour", "relation", "mariage",
    "fiançailles", "romance", "passion", "connexion"
  ],
  communication: [
    "communication", "dialogue", "parler", "échange",
    "discussion", "compréhension", "partage", "écoute"
  ],
  famille: [
    "famille", "parent", "enfant", "génération",
    "adolescent", "fratrie", "liens familiaux", "traditions"
  ],
  professionnel: [
    "travail", "bureau", "entreprise", "collègue",
    "professionnel", "équipe", "collaborateur", "ambiance"
  ],
  curiosite: [
    "comment", "pourquoi", "exemple", "expliquer",
    "comprendre", "découvrir", "savoir plus"
  ],
  doute: [
    "hésiter", "pas sûr", "réfléchir", "comparer",
    "différence", "avantages", "inconvénients"
  ]
} as const;

class ConversationManager {
  static calculateBuyingIntent(message: string): number {
    let maxScore = 0;
    const lowerMessage = message.toLowerCase();
    
    for (const intent of BUYING_INTENTS) {
      for (const trigger of intent.triggers) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          maxScore = Math.max(maxScore, intent.score);
        }
      }
    }

    if (lowerMessage.includes('livraison gratuite') || lowerMessage.includes('stock')) {
      maxScore = Math.min(maxScore + 0.1, 1);
    }

    const doubtKeywords = CONTEXT_KEYWORDS.doute;
    if (doubtKeywords.some(keyword => lowerMessage.includes(keyword))) {
      maxScore = Math.max(0, maxScore - 0.1);
    }

    return maxScore;
  }

  static getContextualRecommendations(
    message: string,
    productId: ProductId,
    buyingIntentScore: number
  ): string[] {
    if (!CROSS_SELLING[productId]) {
      return [];
    }

    let recommendedProducts = CROSS_SELLING[productId]
      .sort((a, b) => a.priority - b.priority)
      .map((item) => {
        const product = PRODUCTS_INFO[item.id];
        return product ? product.name : null;
      })
      .filter((name): name is NonNullable<typeof name> => name !== null);

    const lowerMessage = message.toLowerCase();

    if (CONTEXT_KEYWORDS.intimite.some(keyword => lowerMessage.includes(keyword))) {
      recommendedProducts = ["stvalentin", "couples"]
        .map(id => PRODUCTS_INFO[id as ProductId]?.name)
        .filter((name): name is NonNullable<typeof name> => name !== null);
    } else if (CONTEXT_KEYWORDS.communication.some(keyword => lowerMessage.includes(keyword))) {
      recommendedProducts = ["famille", "collegues"]
        .map(id => PRODUCTS_INFO[id as ProductId]?.name)
        .filter((name): name is NonNullable<typeof name> => name !== null);
    }

    if (buyingIntentScore > 0.7) {
      return recommendedProducts.slice(0, 1);
    } else if (buyingIntentScore > 0.4) {
      return recommendedProducts.slice(0, 2);
    }

    return recommendedProducts;
  }

  static async getAIResponse(
    message: string,
    productId: ProductId,
    buyingIntentScore: number,
    currentStep: ConversationStep,
    orderData: Partial<OrderData>
  ): Promise<AIResponse> {
    try {
      const productInfo = PRODUCTS_INFO[productId];
      const recommendedProducts = this.getContextualRecommendations(
        message, 
        productId, 
        buyingIntentScore
      );

      const aiManager = AIManager.getInstance();
      const response = await aiManager.handleProductChatbot(
        { content: message, type: 'user' },
        productId,
        currentStep,
        orderData
      );

      // Créer une copie modifiable du tableau readonly
      let defaultChoices: string[] = [...GENERIC_CHOICES.initial];
      if (buyingIntentScore > 0.6) {
        defaultChoices.push("Je veux l'acheter maintenant");
      }

      const finalChoices = Array.isArray(response.choices) ? response.choices : defaultChoices;

      const result: AIResponse = {
        content: response.content || "Je suis désolée, pouvez-vous reformuler ?",
        type: "assistant",
        choices: finalChoices,
        buyingIntent: buyingIntentScore,
        recommendations: recommendedProducts,
        nextStep: this.determineNextStep(currentStep, buyingIntentScore, message),
        error: response.error
      };

      if (response.paymentUrl) {
        result.paymentUrl = response.paymentUrl;
      }

      if (response.total) {
        result.total = response.total;
      }

      return result;

    } catch (error) {
      console.error("AI Response Error:", error);
      return {
        content: "Je suis désolée, je rencontre un problème technique. Puis-je vous rediriger vers notre service client ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"],
        error: "AI_ERROR"
      };
    }
  }

  private static generateSystemPrompt(
    productInfo: typeof PRODUCTS_INFO[ProductId],
    productId: ProductId,
    buyingIntentScore: number,
    recommendedProducts: string[],
    currentStep: ConversationStep
  ): string {
    const convertPrice = (price: number) => ({
      value: price,
      formatted: `${price.toLocaleString()} FCFA`
    });
  
    const messages = generateInitialMessages(convertPrice);
    const productMessages = messages[productId];
    
    return `Tu es Rose, l'assistante commerciale experte de VIENS ON S'CONNAÎT.
  
INFORMATIONS PRODUIT :
Nom : ${productInfo.name}
Description : ${productInfo.description}
Comment jouer : ${productMessages.howToPlay}
Prix et packs : ${productMessages.pricing(convertPrice)}
Avantages clés : ${productInfo.benefits.join("\\n")}

CONTEXTE ACTUEL :
Étape de conversation : ${currentStep}
Score d'intention d'achat : ${buyingIntentScore}
Produits recommandés : ${recommendedProducts.join(", ")}

TÉMOIGNAGES ET EXEMPLES :
${productMessages.testimonials}

QUESTIONS TYPES :
${productMessages.sampleQuestions}

OBJECTIFS PRINCIPAUX :
1. Convertir naturellement les visiteurs en clients
2. Maximiser la valeur du panier avec des recommandations pertinentes
3. Pousser l'application mobile aux moments opportuns

RÈGLES DE CONVERSATION :
1. Réponses courtes (2-3 phrases maximum)
2. Toujours finir par une question qui encourage l'achat
3. Inclure "Je veux l'acheter maintenant" dans les choix si score d'intention > 0.6
4. Si prix jugé élevé, suggérer les packs et l'app mobile

FORMAT DE RÉPONSE :
{
  "message": "Ta réponse formatée avec des sauts de ligne (\\n\\n)",
  "choices": ["Je veux l'acheter maintenant", "Commander plusieurs jeux", "Voir les témoignages", "Voir les exemples de questions"]
}`;
  }

  private static determineNextStep(
    currentStep: ConversationStep,
    buyingIntentScore: number,
    message: string
  ): ConversationStep {
    if (buyingIntentScore >= 0.8 && currentStep === 'initial') {
      return 'contact-info';
    }
    return currentStep;
  }
}

class OrderManager {
  static async createOrder(orderData: Partial<OrderData>) {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        status: orderData.status || 'pending',
        total_amount: orderData.totalAmount,
        customer_name: `${orderData.firstName} ${orderData.lastName}`,
        first_name: orderData.firstName,
        last_name: orderData.lastName,
        city: orderData.city,
        address: orderData.address,
        phone: orderData.phone,
        payment_method: orderData.paymentMethod,
        order_details: orderData.orderDetails,
        delivery_cost: orderData.deliveryCost || 0,
        metadata: {
          source: 'chatbot',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(orderData.metadata || {})
        },
        order_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return order;
  }

  static async handleOrderStep(
    currentStep: ConversationStep,
    message: string,
    orderData: Partial<OrderData>,
    productInfo: typeof PRODUCTS_INFO[ProductId]
  ) {
    switch (currentStep) {
      case "contact-info": {
        const names = message.split(" ");
        if (names.length < 2) {
          return {
            content: "Pourriez-vous me donner votre nom complet (prénom et nom) s'il vous plaît ? 🙂",
            type: "assistant" as const,
            currentStep: "contact-info",
            choices: [],
            orderData
          };
        }

        const [firstName, ...lastNameParts] = names;
        const lastName = lastNameParts.join(" ");

        return {
          content: `Merci ${firstName} ! Dans quelle ville habitez-vous ?`,
          type: "assistant" as const,
          currentStep: "city",
          choices: [],
          orderData: {
            ...orderData,
            customerName: message,
            firstName,
            lastName,
            orderDetails: `Commande du jeu "${productInfo.name}"`,
            status: 'pending' as OrderStatus,
            metadata: {
              source: 'chatbot',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      case "city":
        return {
          content: `Parfait ! Quelle est votre adresse exacte à ${message} ?`,
          type: "assistant" as const,
          currentStep: "address",
          choices: [],
          orderData: { 
            ...orderData, 
            city: message,
            metadata: {
              ...orderData.metadata,
              updatedAt: new Date().toISOString()
            }
          }
        };

      case "address":
        return {
          content: "Super ! Quel est votre numéro de téléphone 📱 pour la livraison ?",
          type: "assistant" as const,
          currentStep: "phone",
          choices: [],
          orderData: { 
            ...orderData, 
            address: message,
            metadata: {
              ...orderData.metadata,
              updatedAt: new Date().toISOString()
            }
          }
        };

      case "phone":
        return {
          content: "Excellent ! Par quel moyen souhaitez-vous payer ?",
          type: "assistant" as const,
          currentStep: "payment",
          choices: GENERIC_CHOICES.paymentMethods,
          orderData: { 
            ...orderData, 
            phone: message,
            metadata: {
              ...orderData.metadata,
              updatedAt: new Date().toISOString()
            }
          }
        };

      case "payment":
        return await this.finalizeOrder(message, orderData, productInfo);

      default:
        return null;
    }
  }

  private static async finalizeOrder(
    paymentMethod: string,
    orderData: Partial<OrderData>,
    productInfo: typeof PRODUCTS_INFO[ProductId]
  ) {
    try {
      const deliveryCost = orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
      const totalAmount = (orderData.totalAmount || 0) + deliveryCost;

      const order = await this.createOrder({
        ...orderData,
        paymentMethod,
        totalAmount,
        deliveryCost,
        metadata: {
          source: 'chatbot',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          conversationHistory: orderData.metadata?.conversationHistory || [],
          ...(orderData.metadata || {})
        } as OrderMetadata 
      });

      const summary = this.generateOrderSummary(order, productInfo);

      return {
        content: summary,
        type: paymentMethod.toLowerCase() === 'wave' ? 'wave-button' as const : 
              paymentMethod.toLowerCase().includes('orange') ? 'om-button' as const : 
              'cod-button' as const,
        paymentUrl: PAYMENT_URLS[paymentMethod.toLowerCase() as keyof typeof PAYMENT_URLS],
        currentStep: "completed" as const,
        orderId: order.id,
        total: {
          value: totalAmount,
          formatted: `${totalAmount.toLocaleString()} FCFA`,
          originalInFCFA: totalAmount
        }
      };
    } catch (error) {
      console.error("Order Creation Error:", error);
      return {
        content: "Je suis désolée, nous rencontrons un problème technique avec votre commande. Voulez-vous réessayer ou parler à un conseiller ?",
        type: "assistant" as const,
        choices: ["Réessayer", "Parler à un humain"]
      };
    }
  }

  private static generateOrderSummary(
    order: any,
    productInfo: typeof PRODUCTS_INFO[ProductId]
  ): string {
    return `<strong>📋 Récapitulatif de votre commande</strong>

${order.order_details}

<strong>📍 Informations de livraison :</strong>
Nom complet : <strong>${order.first_name} ${order.last_name}</strong>
Ville : <strong>${order.city}</strong>
Adresse : <strong>${order.address}</strong>
Téléphone : <strong>${order.phone}</strong>
Frais de livraison : <strong>${order.delivery_cost.toLocaleString()} FCFA</strong>

💰 Total à payer : <strong>${order.total_amount.toLocaleString()} FCFA</strong>`;
  }

  static validateOrderData(orderData: Partial<OrderData>): string | null {
    if (!orderData.firstName || !orderData.lastName) {
      return "Nom incomplet";
    }
    if (!orderData.city) {
      return "Ville manquante";
    }
    if (!orderData.address) {
      return "Adresse manquante";
    }
    if (!orderData.phone) {
      return "Numéro de téléphone manquant";
    }
    return null;
  }

  static calculateTotalAmount(
    basePrice: number,
    quantity: number,
    deliveryCost: number
  ): number {
    let totalBeforeDelivery = basePrice;

    if (quantity >= 4) {
      totalBeforeDelivery = totalBeforeDelivery * quantity * 0.8; // -20%
    } else if (quantity === 3) {
      totalBeforeDelivery = 35700; // Pack Trio
    } else if (quantity === 2) {
      totalBeforeDelivery = 25200; // Pack Duo
    } else {
      totalBeforeDelivery = basePrice * quantity;
    }

    return totalBeforeDelivery + deliveryCost;
  }

  static async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
    additionalData?: Partial<OrderData>
  ) {
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return order;
  }
}

export async function POST(req: Request) {
  const aiManager = AIManager.getInstance();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 30000);
  });
  
  const requestPromise = (async () => {
    try {
      const requestData: ExtendedChatRequest = await req.json();
      const { context, message } = requestData;

      if (message.toLowerCase().includes('parler à un humain') || 
          message.toLowerCase().includes('contact humain')) {
        return NextResponse.json({
          content: "Je vous redirige vers notre service client sur WhatsApp... 📱",
          type: "redirect",
          redirectUrl: WHATSAPP_LINK,
          choices: []
        }, { headers: corsHeaders });
      }

      if (context === 'dashboard') {
        const response = await aiManager.handleDashboardAssistant(
          message, 
          requestData.dashboardContext!
        );
        return NextResponse.json(response, { headers: corsHeaders });
      }

      const { productId, currentStep = 'initial', orderData = {} } = requestData;
      if (!productId) {
        throw new Error('Product ID is required');
      }

      if (currentStep && currentStep !== 'initial') {
        const orderResponse = await OrderManager.handleOrderStep(
          currentStep,
          message,
          orderData,
          PRODUCTS_INFO[productId]
        );

        if (orderResponse) {
          return NextResponse.json(orderResponse, { headers: corsHeaders });
        }
      }

      const aiResponse = await aiManager.handleProductChatbot(
        { content: message, type: 'user' },
        productId,
        currentStep,
        orderData
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
  })();

  try {
    const response = await Promise.race([requestPromise, timeoutPromise]);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        content: "Je suis désolée, la réponse prend plus de temps que prévu. Pourriez-vous reformuler votre question ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"]
      },
      { status: 408, headers: corsHeaders }
    );
  }
}