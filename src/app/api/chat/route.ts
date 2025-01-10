// app/api/chat/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Prisma } from '@prisma/client';
import { PRODUCTS_INFO } from "../../../config/products";
import { PAYMENT_URLS } from "../../../config/payment";
import { 
  type OrderData,
  type ChatMessage,
  type AIResponse,
  type ConversationStep,
  type OrderStatus,
  type OrderMetadata
} from "../../../features/product/types/chat";
import { 
  GENERIC_CHOICES, 
  GENERIC_MESSAGES, 
  generateInitialMessages 
} from "../../../features/product/utils/chatMessages";

export { config } from './config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WHATSAPP_LINK = "https://wa.me/221781362728";

// Headers CORS communs
const corsHeaders = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

interface BuyingIntent {
  score: number;
  triggers: string[];
}

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

interface ProductRelation {
  id: keyof typeof PRODUCTS_INFO;
  priority: number;
}

const CROSS_SELLING: Record<keyof typeof PRODUCTS_INFO, ProductRelation[]> = {
    couples: [{ id: "stvalentin", priority: 1 }, { id: "maries", priority: 2 }],
    maries: [{ id: "stvalentin", priority: 1 }, { id: "couples", priority: 2 }],
    famille: [{ id: "amis", priority: 1 }, { id: "collegues", priority: 2 }],
    amis: [{ id: "famille", priority: 1 }, { id: "collegues", priority: 2 }],
    collegues: [{ id: "amis", priority: 1 }, { id: "famille", priority: 2 }],
    stvalentin: [{ id: "couples", priority: 1 }, { id: "maries", priority: 2 }],
  };
  
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
    productId: keyof typeof PRODUCTS_INFO,
    buyingIntentScore: number
  ): string[] {
    if (!CROSS_SELLING[productId]) {
      return [];
    }

    let recommendedProducts = CROSS_SELLING[productId]
      ?.sort((a, b) => a.priority - b.priority)
      .map((item) => {
        const product = PRODUCTS_INFO[item.id];
        return product ? product.name : null;
      })
      .filter((name): name is NonNullable<typeof name> => name !== null);

    const lowerMessage = message.toLowerCase();

    if (CONTEXT_KEYWORDS.intimite.some(keyword => lowerMessage.includes(keyword))) {
      recommendedProducts = ["stvalentin", "couples"]
        .map(id => PRODUCTS_INFO[id as keyof typeof PRODUCTS_INFO]?.name)
        .filter((name): name is NonNullable<typeof name> => name !== null);
    } else if (CONTEXT_KEYWORDS.communication.some(keyword => lowerMessage.includes(keyword))) {
      recommendedProducts = ["famille", "collegues"]
        .map(id => PRODUCTS_INFO[id as keyof typeof PRODUCTS_INFO]?.name)
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
    productId: keyof typeof PRODUCTS_INFO,
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

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: this.generateSystemPrompt(
              productInfo,
              productId,
              buyingIntentScore,
              recommendedProducts,
              currentStep
            )
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return {
        content: response.message,
        type: "assistant",
        choices: response.choices || GENERIC_CHOICES.initial,
        buyingIntent: buyingIntentScore,
        recommendations: recommendedProducts,
        nextStep: this.determineNextStep(currentStep, buyingIntentScore, message)
      };
    } catch (error) {
      console.error("AI Response Error:", error);
      return {
        content: "Je suis désolée, je rencontre un problème technique. Puis-je vous rediriger vers notre service client ?",
        type: "assistant",
        error: "AI_ERROR"
      };
    }
  }

  private static generateSystemPrompt(
    productInfo: typeof PRODUCTS_INFO[keyof typeof PRODUCTS_INFO],
    productId: keyof typeof PRODUCTS_INFO,
    buyingIntentScore: number,
    recommendedProducts: string[],
    currentStep: ConversationStep
  ): string {
    const convertPrice = (price: number) => ({
      value: price,
      formatted: `${price.toLocaleString()} FCFA`
    });
  
    const messages = generateInitialMessages(convertPrice);
    
    return `Tu es Rose, l'assistante commerciale experte de VIENS ON S'CONNAÎT.
  
  INFORMATIONS PRODUIT :
  Nom : ${productInfo.name}
  Description : ${productInfo.description}
  Comment jouer : ${messages[productId].howToPlay}
  Prix et packs : ${messages[productId].pricing(convertPrice)}
  Avantages clés : ${productInfo.benefits.join("\n")}
  
  CONTEXTE ACTUEL :
  Étape de conversation : ${currentStep}
  Score d'intention d'achat : ${buyingIntentScore}
  Produits recommandés : ${recommendedProducts.join(", ")}
  
  TÉMOIGNAGES ET EXEMPLES :
  ${messages[productId].testimonials}
  
  QUESTIONS TYPES :
  ${messages[productId].sampleQuestions}
  
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
    "choices": [
      // Toujours inclure au moins un de ces choix selon le contexte
      "Je veux l'acheter maintenant",
      "Commander plusieurs jeux",
      "Voir les témoignages",
      "Voir les exemples de questions"
    ],
    "metadata": {
      "recommendations": ["mobile-app"], // Si pertinent
      "productContext": "product_id"     // Si recommandation
    }
  }
  
  DÉCLENCHEURS SPÉCIAUX :
  1. Score > 0.7 : Focus sur la conversion
  2. Objection prix : Présenter les packs + app mobile
  3. Post-achat : Suggestions produits complémentaires
  4. Questions techniques : Redirection vers le service client
  
  IMPORTANT : 
  - Tous les choix doivent être orientés action et encourager l'achat
  - Toujours proposer l'option d'achat immédiat quand l'intérêt est détecté
  - Mentionner l'app mobile quand le prix est jugé élevé ou après un achat`;
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
  static async handleOrderStep(
    currentStep: ConversationStep,
    message: string,
    orderData: Partial<OrderData>,
    productInfo: typeof PRODUCTS_INFO[keyof typeof PRODUCTS_INFO]
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
              createdAt: new Date(),
              updatedAt: new Date()
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
              updatedAt: new Date()
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
              updatedAt: new Date()
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
              updatedAt: new Date()
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
    productInfo: typeof PRODUCTS_INFO[keyof typeof PRODUCTS_INFO]
  ) {
    try {
      const deliveryCost = orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
      const totalAmount = (orderData.totalAmount || 0) + deliveryCost;

      type OrderCreateInput = {
        status: OrderStatus;
        metadata: Prisma.JsonValue;
        [key: string]: any;
      };
      
      const orderInput: OrderCreateInput = {
        ...orderData,
        paymentMethod,
        totalAmount,
        deliveryCost,
        status: 'pending',
        metadata: {
          source: 'chatbot',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(orderData.metadata || {})
        } as unknown as Prisma.JsonValue
      };
      
      const order = await prisma.order.create({
        data: orderInput
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
    productInfo: typeof PRODUCTS_INFO[keyof typeof PRODUCTS_INFO]
  ): string {
    return `<strong>📋 Récapitulatif de votre commande</strong>

${order.orderDetails}

<strong>📍 Informations de livraison :</strong>
Nom complet : <strong>${order.firstName} ${order.lastName}</strong>
Ville : <strong>${order.city}</strong>
Adresse : <strong>${order.address}</strong>
Téléphone : <strong>${order.phone}</strong>
Frais de livraison : <strong>${order.deliveryCost.toLocaleString()} FCFA</strong>

💰 Total à payer : <strong>${order.totalAmount.toLocaleString()} FCFA</strong>`;
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

  static calculateDeliveryCost(city: string): number {
    return city.toLowerCase() === 'dakar' ? 0 : 3000;
  }

  static calculateTotalAmount(
    basePrice: number,
    quantity: number,
    deliveryCost: number
  ): number {
    let totalBeforeDelivery = basePrice;

    // Appliquer les réductions en fonction de la quantité
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

  static async saveOrderMetadata(
    orderId: string,
    metadata: Partial<OrderMetadata>
  ): Promise<void> {
    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { metadata: true }
      });
  
      await prisma.order.update({
        where: { id: orderId },
        data: {
          metadata: {
            ...(existingOrder?.metadata as OrderMetadata || {}),
            ...metadata,
            updatedAt: new Date()
          } as unknown as Prisma.JsonValue
        }
      });
    } catch (error) {
      console.error("Error saving order metadata:", error);
    }
  }

  static async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<OrderData>
  ): Promise<void> {
    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { metadata: true }
      });
  
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(additionalData || {}),
          metadata: {
            ...(existingOrder?.metadata as OrderMetadata || {}),
            ...(additionalData?.metadata || {}),
            updatedAt: new Date()
          } as unknown as Prisma.JsonValue
        }
      });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  }

  static formatPrice(amount: number): string {
    return `${amount.toLocaleString()} FCFA`;
  }
}

export async function POST(req: Request) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 secondes timeout
    });
    
    const requestPromise = (async () => {
      try {
        const { 
          message, 
          productId, 
          currentStep = 'initial', 
          orderData = {} 
        } = await req.json();
  
        // Vérifier la demande de contact humain
        if (message.toLowerCase().includes('parler à un humain') || 
            message.toLowerCase().includes('contact humain') ||
            message.toLowerCase().includes('vrai personne') ||
            message.toLowerCase().includes('vraie personne')) {
          return NextResponse.json({
            content: "Je vous redirige vers notre service client sur WhatsApp... 📱",
            type: "redirect",
            redirectUrl: WHATSAPP_LINK,
            choices: []
          }, { headers: corsHeaders });
        }
  
        // Vérifier l'existence du produit
        const productInfo = PRODUCTS_INFO[productId as keyof typeof PRODUCTS_INFO];
        if (!productInfo) {
          return NextResponse.json(
            {
              content: "Je suis désolée, je ne trouve pas ce produit. Puis-je vous aider avec un autre jeu ? 🎮",
              type: "text",
              choices: ["Voir tous les jeux", "Parler à un humain"]
            }, 
            { status: 404, headers: corsHeaders }
          );
        }
  
        const buyingIntentScore = ConversationManager.calculateBuyingIntent(message);
  
        // Gérer le processus de commande
        if (currentStep !== 'initial' || buyingIntentScore >= 0.8) {
          const orderStep = await OrderManager.handleOrderStep(
            currentStep as ConversationStep,
            message,
            orderData,
            productInfo
          );
  
          if (orderStep) {
            return NextResponse.json(orderStep, { headers: corsHeaders });
          }
        }
  
        const aiResponse = await ConversationManager.getAIResponse(
          message,
          productId as keyof typeof PRODUCTS_INFO,
          buyingIntentScore,
          currentStep as ConversationStep,
          orderData
        );
  
        if (aiResponse.error) {
          return NextResponse.json({
            content: "Je suis désolée, je rencontre un problème technique 🤖. Puis-je vous rediriger vers notre service client ?",
            type: "text",
            choices: ["Réessayer", "Parler à un humain"]
          }, { headers: corsHeaders });
        }
  
        return NextResponse.json({
          content: aiResponse.content,
          type: aiResponse.type,
          choices: aiResponse.choices || GENERIC_CHOICES.initial,
          nextStep: aiResponse.nextStep,
          recommendations: aiResponse.recommendations,
          buyingIntent: buyingIntentScore
        }, { headers: corsHeaders });
  
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