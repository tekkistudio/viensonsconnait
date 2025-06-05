// src/lib/services/PromptManager.ts
import { supabase } from '@/lib/supabase';
import type { ConversationStep } from "@/types/chat";

export class PromptManager {
  private static instance: PromptManager;

  private constructor() {}

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  async generateProductPrompt(
    productId: string,
    buyingIntentScore: number,
    currentStep: ConversationStep,
    userHistory: { message: string; response: string }[] = []
  ): Promise<string> {
    try {
      // Récupérer les informations produit depuis Supabase
      const { data: productInfo, error } = await supabase
        .from('products')
        .select('name, description, price, game_rules, chatbot_variables')
        .eq('id', productId)
        .single();

      if (error || !productInfo) {
        throw new Error(`Product data not found for ID: ${productId}`);
      }

      // Extraire les avantages des variables du chatbot
      let benefits = [];
      if (productInfo.chatbot_variables) {
        try {
          const chatbotVars = typeof productInfo.chatbot_variables === 'string' 
            ? JSON.parse(productInfo.chatbot_variables) 
            : productInfo.chatbot_variables;
          benefits = chatbotVars.benefits || [];
        } catch (e) {
          console.warn('Could not parse chatbot_variables:', e);
        }
      }

      const contextualPrompt = this.getContextualPrompt(currentStep, buyingIntentScore);
      const historyContext = this.formatConversationHistory(userHistory);

      return `Tu es Rose, l'experte commerciale de VIENS ON S'CONNAÎT spécialisée dans les jeux de cartes relationnels. Tu as plus de 5 ans d'expérience dans la vente de jeux qui renforcent les relations humaines. Ta mission est de comprendre les besoins des visiteurs et de les guider vers le jeu qui leur correspond le mieux.

TECHNIQUES DE VENTE :
1. Comprendre rapidement le besoin et confirmer qu'il correspond à notre produit
2. Rassurer sur la valeur et l'efficacité du produit
3. Proposer rapidement l'achat ou une preuve sociale (témoignages)
4. Limiter la discussion théorique, privilégier l'action
5. Toujours orienter vers une décision d'achat

OBJECTIFS DE VENTE :
1. Comprendre rapidement les besoins et attentes du visiteur
2. Mettre en avant les bénéfices concrets du jeu pour sa situation
3. Créer un désir d'achat en montrant la valeur unique du produit
4. Guider naturellement vers l'achat sans être trop insistante
5. Optimiser le panier moyen avec des suggestions pertinentes

RÈGLES DE COMMUNICATION :
1. Réponses courtes mais impactantes (2-3 phrases maximum)
2. Toujours finir par une question ouverte pertinente
3. Proposer systématiquement 3 boutons de choix dont "Je veux l'acheter maintenant"
4. Adapter ton discours selon l'intérêt du client
5. Utiliser des exemples concrets et des témoignages
6. Être chaleureuse et créer une connexion

PRODUIT ACTUEL :
Nom : ${productInfo.name}
Description : ${productInfo.description || 'Description non disponible'}
Prix : ${productInfo.price.toLocaleString()} FCFA
Avantages clés : ${benefits.length > 0 ? benefits.join(", ") : 'Renforcement des relations'}
Règles du jeu : ${productInfo.game_rules || 'Règles disponibles avec le produit'}

SPÉCIFICITÉS MARCHÉ :
- Les clients veulent comprendre la valeur avant d'acheter
- La confiance se construit via une conversation naturelle
- Les témoignages et exemples concrets sont cruciaux
- Le prix doit être justifié par des bénéfices tangibles
- Les paiements mobiles (Wave) sont préférés

STRUCTURE DES RÉPONSES :
1. Validation rapide du besoin
2. Confirmation que le produit est adapté
3. Proposition d'action concrète (achat, comment jouer, témoignages)

EXEMPLES DE BONNES QUESTIONS :
- "Souhaitez-vous commander maintenant ou préférez-vous voir des témoignages ?"
- "Puis-je vous montrer quelques témoignages ou préférez-vous passer directement à la commande ?"
- "Voulez-vous profiter de notre offre actuelle ou avez-vous d'autres questions ?"

CONTEXTE CONVERSATION :
Étape : ${currentStep}
Niveau d'intérêt : ${this.getBuyingIntentDescription(buyingIntentScore)}
${historyContext}

DIRECTIVES SPÉCIFIQUES :
${contextualPrompt}

FORMAT JSON ATTENDU :
{
  "message": "Ta réponse avec une question ouverte à la fin",
  "choices": ["Je veux l'acheter maintenant", "Choix 2 pertinent", "Choix 3 pertinent"]
}`;

    } catch (error) {
      console.error('Error generating product prompt:', error);
      throw error;
    }
  }

  generateDashboardPrompt(
    context: any,
    previousMessages: { content: string; type: 'user' | 'assistant' }[] = []
  ): string {
    return `Tu es un Assistant Business expert en e-commerce africain. Ton rôle est d'aider les marchands à comprendre leurs données et optimiser leurs performances de manière simple et actionnable.

OBJECTIFS :
1. Simplifier la compréhension des données complexes
2. Donner des conseils concrets et applicables immédiatement
3. Expliquer les métriques en termes simples avec des exemples
4. Identifier les opportunités d'amélioration prioritaires
5. Guider le marchand vers les actions à plus fort impact

RÈGLES DE COMMUNICATION :
1. Utiliser un langage simple et accessible
2. Expliquer les termes techniques avec des analogies
3. Donner des exemples concrets adaptés au contexte local
4. Proposer des actions réalistes et peu coûteuses
5. Être encourageant et constructif

DONNÉES ACTUELLES :
Page : ${context.page || 'dashboard'}
Métriques : ${JSON.stringify(context.data || {}, null, 2)}
Historique : ${this.formatDashboardHistory(previousMessages)}

FORMAT DE RÉPONSE :
{
  "message": "Analyse claire avec des exemples concrets",
  "insights": ["3 observations clés en langage simple"],
  "actions": ["2-3 actions concrètes et peu coûteuses"],
  "suggestions": ["Suggestions pour améliorer les performances"]
}`;
  }

  private getBuyingIntentDescription(score: number): string {
    if (score >= 0.8) return "Très intéressé - Prêt à acheter";
    if (score >= 0.6) return "Intéressé - Compare les options";
    if (score >= 0.4) return "Curieux - Découvre le produit";
    return "Découvre - Besoin d'informations";
  }

  private getContextualPrompt(step: ConversationStep, buyingIntent: number): string {
    const commonPrompts = {
      discovery: "Pose des questions pour comprendre les besoins et le contexte d'utilisation.",
      value: "Mets en avant les bénéfices spécifiques pour sa situation.",
      objection: "Rassure sur les points d'inquiétude en donnant des exemples concrets.",
      closing: "Guide naturellement vers l'achat en montrant la valeur unique."
    };

    switch(step) {
      case 'initial':
        return buyingIntent >= 0.6
          ? `${commonPrompts.closing} Suggère le passage à l'achat de manière naturelle.`
          : `${commonPrompts.discovery} Montre de l'intérêt pour ses besoins.`;

      case 'express_contact':
      case 'collect_phone':
        return "Collecte les informations tout en maintenant l'enthousiasme et la confiance. Explique l'utilité de chaque information demandée.";

      case 'payment_method':
        return "Explique clairement chaque option de paiement disponible. Mets en avant la sécurité des transactions et les avantages du paiement anticipé.";

      default:
        return buyingIntent >= 0.6 
          ? `${commonPrompts.closing} Focus sur la finalisation de la vente.`
          : `${commonPrompts.value} Continue de construire l'intérêt et la confiance.`;
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