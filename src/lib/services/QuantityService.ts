// src/lib/services/QuantityService.ts
import { ChatMessage, ChatOrderData } from "@/types/chat";
import { ChatFlowManager } from "./ChatFlowManager";
import { RecommendationService } from "./recommendation.service";

export class QuantityService {
  private static instance: QuantityService;
  private chatFlowManager: ChatFlowManager;

  private constructor() {
    this.chatFlowManager = ChatFlowManager.getInstance();
  }

  public static getInstance(): QuantityService {
    if (!this.instance) {
      this.instance = new QuantityService();
    }
    return this.instance;
  }

  private getBotInfo() {
    return {
      name: 'Rose',
      title: 'Assistante d\'achat',
      avatar: undefined
    };
  }
  
  async handleQuantityUpdate(
    sessionId: string,
    quantity: number,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    const updatedItems = orderData.items?.map(item => ({
      ...item,
      quantity,
      totalPrice: item.price * quantity
    }));

    const updatedOrderData: Partial<ChatOrderData> = {
      ...orderData,
      items: updatedItems,
      total_amount: (updatedItems?.[0]?.totalPrice || 0) + (orderData.delivery_cost || 0)
    };

    // Sauvegarder la progression avec le ChatFlowManager
    await this.chatFlowManager.saveProgress(sessionId, 'add_other_products', updatedOrderData);

    return {
      type: 'assistant',
      content: "Souhaitez-vous ajouter d'autres jeux à votre commande ?",
      choices: ['Oui, je veux bien', 'Non, juste celui-là'],
      assistant: this.getBotInfo(),
      metadata: {
        nextStep: 'add_other_products',
        orderData: updatedOrderData
      },
      timestamp: new Date().toISOString()
    };
  }

  async handleAddOtherProducts(
    sessionId: string,
    wantsMore: boolean,
    orderData: Partial<ChatOrderData>
  ): Promise<ChatMessage> {
    if (wantsMore) {
      // Obtenir les recommandations
      const recommendations = await RecommendationService.getRecommendations({
        currentProductId: orderData.items?.[0]?.productId || '',
        buyingIntent: 0.8,
        conversationContext: {
          mentionedTopics: [],
          concerns: [],
          interests: []
        }
      });

      const content = recommendations.length > 0 
        ? "Voici d'autres jeux qui pourraient vous intéresser : \n\n" + 
          recommendations.map((rec, i) => `${i + 1}. ${rec.name}\n${rec.reason}`).join('\n\n')
        : "Je suis désolée, je n'ai pas d'autres jeux à vous proposer pour le moment.";

      return {
        type: 'assistant',
        content,
        choices: recommendations.map(rec => rec.name),
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'select_product',
          recommendations,
          orderData
        },
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        type: 'assistant',
        content: "Souhaitez-vous ajouter une note spéciale pour votre commande ? Par exemple, des instructions particulières pour la livraison.",
        choices: ['Oui, je veux ajouter une note', 'Non, pas besoin'],
        assistant: this.getBotInfo(),
        metadata: {
          nextStep: 'add_notes',
          orderData
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}