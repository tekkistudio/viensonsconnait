import type { 
  CustomerMessage, 
  ChatMessage,
  ConversationStep,
  AIResponse
} from '../../features/product/types/chat';

export class AIService {
  static async getResponse(
    message: CustomerMessage,
    productId: string,
    currentStep: ConversationStep = 'initial',
    orderData = {}
  ): Promise<AIResponse> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.content,
          productId,
          currentStep,
          orderData
        }),
        // Ajouter ces options pour éviter les problèmes de cache
        cache: 'no-store',
        next: { revalidate: 0 }
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      
      // Vérifier si la réponse est du JSON
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Réponse non-JSON reçue:', await response.text());
        return this.getFallbackResponse('Erreur de format de réponse');
      }

      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        return this.getFallbackResponse('Erreur de parsing de la réponse');
      }

      if (!response.ok) {
        console.error('Erreur API:', responseData);
        return this.getFallbackResponse(`Erreur ${response.status}`);
      }

      // Validation de la structure de la réponse
      if (!responseData.content) {
        console.error('Réponse invalide:', responseData);
        return this.getFallbackResponse('Structure de réponse invalide');
      }

      return {
        content: responseData.content,
        type: responseData.type || 'assistant',
        choices: responseData.choices || [],
        nextStep: responseData.nextStep,
        recommendations: responseData.recommendations || [],
        buyingIntent: responseData.buyingIntent,
        error: responseData.error,
        paymentUrl: responseData.paymentUrl,
        total: responseData.total
      };

    } catch (error) {
      console.error('Erreur service:', error);
      return this.getFallbackResponse(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }

  private static getFallbackResponse(errorDetail: string = ''): AIResponse {
    return {
      content: `Je suis désolée, je rencontre un problème technique${
        errorDetail ? ` (${errorDetail})` : ''
      }. Comment puis-je vous aider autrement ?`,
      type: 'assistant',
      choices: ["Réessayer", "Parler à un humain"],
      error: 'FALLBACK_ERROR'
    };
  }
}