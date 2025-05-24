// src/lib/services/PromptManager.ts
import { supabase } from '@/lib/supabase';
import { ProductId } from "@/types/chat";
import { ConversationStep } from "@/types/chat";
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

  private analyzeTrend(chartData: any[]): string {
    try {
      if (!chartData || chartData.length < 2) return 'Pas assez de données';

      const values = chartData.map(d => d.value);
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const growth = ((lastValue - firstValue) / firstValue) * 100;

      // Calculer la tendance linéaire
      const trend = values.reduce((sum, value) => sum + value, 0) / values.length;
      const recentAvg = values.slice(-3).reduce((sum, value) => sum + value, 0) / 3;

      if (growth > 20) return 'Forte croissance';
      if (growth > 5) return 'Croissance modérée';
      if (growth < -20) return 'Forte baisse';
      if (growth < -5) return 'Baisse modérée';
      return 'Stable';
    } catch (error) {
      console.error('Error analyzing trend:', error);
      return 'Analyse impossible';
    }
  }

  private detectSeasonality(chartData: any[]): string[] {
    try {
      if (!chartData || chartData.length < 7) return ['Pas assez de données'];

      const patterns: string[] = [];
      const values = chartData.map(d => d.value);
      
      // Détecter les pics de vente
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const peakDays = values
        .map((val, idx) => ({ val, idx }))
        .filter(({val}) => val > avg * 1.5)
        .map(({idx}) => chartData[idx].date);

      if (peakDays.length > 0) {
        patterns.push(`Pics de vente : ${peakDays.join(', ')}`);
      }

      // Détecter les tendances hebdomadaires
      const weekdayAvg = new Array(7).fill(0);
      const weekdayCounts = new Array(7).fill(0);
      
      chartData.forEach(day => {
        const date = new Date(day.date);
        const weekday = date.getDay();
        weekdayAvg[weekday] += day.value;
        weekdayCounts[weekday]++;
      });

      const bestDay = weekdayAvg.reduce((max, val, idx) => 
        val/weekdayCounts[idx] > max.val ? {val: val/weekdayCounts[idx], day: idx} : max,
        {val: 0, day: 0}
      );

      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      patterns.push(`Meilleur jour : ${days[bestDay.day]}`);

      return patterns;
    } catch (error) {
      console.error('Error detecting seasonality:', error);
      return ['Analyse impossible'];
    }
  }

  private generateInsights(data: any): string[] {
    try {
      const insights: string[] = [];

      // Analyse des ventes
      if (data.revenue) {
        if (data.revenue.growth > 0) {
          insights.push(`Croissance des ventes de ${data.revenue.growth.toFixed(1)}% par rapport à la période précédente`);
        } else {
          insights.push('Baisse des ventes - Actions recommandées');
        }
      }

      // Analyse des conversions
      if (data.performance?.conversionRate) {
        const convRate = data.performance.conversionRate;
        if (convRate < 2) {
          insights.push('Taux de conversion faible - Optimisation nécessaire');
        } else if (convRate > 5) {
          insights.push('Excellent taux de conversion - Maintenir les bonnes pratiques');
        }
      }

      // Analyse géographique
      if (data.performance?.topLocations?.length) {
        const topCity = data.performance.topLocations[0];
        insights.push(`${topCity.name} est votre meilleure ville avec ${topCity.orders} commandes`);
      }

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return ['Erreur lors de la génération des insights'];
    }
  }

  async generateProductPrompt(
    productId: ProductId,
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
      const benefits = productInfo.chatbot_variables?.benefits || [];

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
Description : ${productInfo.description}
Prix : ${productInfo.price.toLocaleString()} FCFA
Avantages clés : ${benefits.join("\n")}
Règles du jeu : ${productInfo.game_rules || 'Non spécifiées'}

SPÉCIFICITÉS MARCHÉ :
- Les clients veulent comprendre la valeur avant d'acheter
- La confiance se construit via une conversation naturelle
- Les témoignages et exemples concrets sont cruciaux
- Le prix doit être justifié par des bénéfices tangibles
- Les paiements mobiles (Wave, Orange Money) sont préférés

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
    context: PageContext,
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
Page : ${context.page}
Métriques : ${JSON.stringify(context.data, null, 2)}
Historique : ${this.formatDashboardHistory(previousMessages)}

SPÉCIFICITÉS MARCHÉ :
- Budget marketing souvent limité
- Importance des réseaux sociaux et WhatsApp
- Préférence pour les solutions gratuites ou peu coûteuses
- Besoin d'actions simples et rapides à mettre en place
- Focus sur le mobile et les paiements locaux

FORMAT DE RÉPONSE :
{
  "message": "Analyse claire avec des exemples concrets",
  "insights": ["3 observations clés en langage simple"],
  "actions": ["2-3 actions concrètes et peu coûteuses"],
  "metrics_explained": "Explication simple des métriques importantes",
  "next_steps": "Suggestion de focus pour la semaine à venir"
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

      case 'contact_info':
        return "Collecte les informations tout en maintenant l'enthousiasme et la confiance. Explique l'utilité de chaque information demandée.";

      case 'payment_method':
        return "Explique clairement chaque option de paiement disponible. Mets en avant la sécurité des transactions et les avantages du paiement anticipé.";

      default:
        return buyingIntent >= 0.6 
          ? `${commonPrompts.closing} Focus sur la finalisation de la vente.`
          : `${commonPrompts.value} Continue de construire l'intérêt et la confiance.`;
    }
  }

  generateEnhancedContext(data: any) {
    return {
      currentPerformance: {
        sales: data.revenue.total,
        growth: data.revenue.growth,
        conversion: data.performance.conversionRate
      },
      historicalTrends: {
        salesTrend: this.analyzeTrend(data.revenue.chartData),
        seasonalPatterns: this.detectSeasonality(data.revenue.chartData)
      },
      marketContext: {
        topProducts: data.performance.topProducts,
        customerSegments: data.performance.customerSegments,
        geographicInsights: data.performance.topLocations
      },
      actionableInsights: this.generateInsights(data)
    };
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