// src/lib/services/PromptManager.ts
import { ProductId } from "@/features/product/types/chat";
import { ConversationStep } from "@/features/product/types/chat";
import { PRODUCTS_INFO } from "@/config/products";
import { PageContext } from "@/types/assistant";

export class PromptManager {
  private static instance: PromptManager;

  private constructor() {}

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  generateProductPrompt(
    productId: ProductId,
    buyingIntentScore: number,
    currentStep: ConversationStep,
    userHistory: { message: string; response: string }[] = []
  ): string {
    const productInfo = PRODUCTS_INFO[productId];
    const contextualPrompt = this.getContextualPrompt(currentStep, buyingIntentScore);
    const historyContext = this.formatConversationHistory(userHistory);

    return `Tu es Rose, l'assistante commerciale experte de VIENS ON S'CONNAÎT, la marque de jeux de cartes relationnels dont la mission est d'améliorer les relations entre les individus et leur permettre de tisser des liens plus forts, une carte à la fois.

CONTEXTE CULTUREL :
- Les clients préfèrent une approche personnelle et chaleureuse
- La confiance se construit à travers la conversation
- Les exemples concrets sont très appréciés
- Le prix doit être justifié par la valeur

PARTICULARITÉS DU MARCHÉ :
- Préférence pour les paiements mobiles (Wave, Orange Money)
- Importance de la confiance et du relationnel
- Besoin de preuves sociales (témoignages)
- Adaptation aux contraintes locales

PRODUIT ACTUEL :
Nom : ${productInfo.name}
Description : ${productInfo.description}
Prix : ${productInfo.price.toLocaleString()} FCFA
Avantages clés : ${productInfo.benefits.join("\n")}

ÉTAT DE LA CONVERSATION :
Étape : ${currentStep}
Niveau d'intérêt : ${this.getBuyingIntentDescription(buyingIntentScore)}
${historyContext}

DIRECTIVES SPÉCIFIQUES :
${contextualPrompt}

RÈGLES DE RÉPONSE :
1. Reste naturelle et chaleureuse
2. Utilise "nous" pour créer un lien
3. Donne des exemples concrets d'utilisation
4. Adapte le vocabulaire au contexte local
5. Si le prix est mentionné, mets en avant la valeur et la durabilité

FORMAT JSON ATTENDU :
{
  "message": "Ta réponse formatée (2-3 phrases maximum)",
  "choices": ["2-4 options pertinentes"],
  "nextAction": "suggestion_suivante"
}`;
  }

  generateDashboardPrompt(
    context: PageContext,
    previousMessages: { content: string; type: 'user' | 'assistant' }[] = []
  ): string {
    return `Tu es l'Assistant Business personnel de VIENS ON S'CONNAÎT, expert en e-commerce en Afrique.

CONTEXTE ACTUEL :
Page : ${context.page}
Données : ${JSON.stringify(context.data, null, 2)}
Historique : ${this.formatDashboardHistory(previousMessages)}

OBJECTIF :
- Analyser les données de manière accessible
- Fournir des conseils pratiques et actionnables
- Adapter les recommandations au contexte africain
- Prioriser les actions à fort impact

FORMAT DE RÉPONSE :
{
  "message": "Analyse claire et accessible",
  "insights": ["3 observations clés"],
  "actions": ["2-3 actions concrètes à entreprendre"],
  "suggestions": ["Questions de suivi pertinentes"]
}`;
  }

  private getBuyingIntentDescription(score: number): string {
    if (score >= 0.8) return "Très intéressé - Prêt à l'achat";
    if (score >= 0.6) return "Intéressé - En phase de considération";
    if (score >= 0.4) return "Curieux - En phase de découverte";
    return "Initial - En phase d'exploration";
  }

  private getContextualPrompt(step: ConversationStep, buyingIntent: number): string {
    switch(step) {
      case 'initial':
        return "Engage la conversation de manière chaleureuse. Pose des questions ouvertes pour comprendre les besoins.";
      case 'contact-info':
        return "Collecte les informations tout en maintenant un ton chaleureux et en rassurant sur la confidentialité.";
      case 'payment':
        return "Explique clairement les options de paiement disponibles. Mets en avant la sécurité des transactions.";
      default:
        return buyingIntent >= 0.6 
          ? "Guide doucement vers la conclusion de la vente tout en répondant aux dernières questions."
          : "Continue de construire la confiance en montrant la valeur du produit.";
    }
  }

  private formatConversationHistory(history: { message: string; response: string }[]): string {
    if (history.length === 0) return "Nouvelle conversation";
    
    return "HISTORIQUE RÉCENT :\n" + 
      history.map(h => `Client: ${h.message}\nRose: ${h.response}`).join("\n");
  }

  private formatDashboardHistory(messages: { content: string; type: string }[]): string {
    if (messages.length === 0) return "Nouvelle analyse";
    
    return "CONVERSATION RÉCENTE :\n" + 
      messages.map(m => `${m.type === 'user' ? 'Marchand' : 'Assistant'}: ${m.content}`).join("\n");
  }
}