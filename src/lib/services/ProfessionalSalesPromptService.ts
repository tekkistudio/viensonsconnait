// src/lib/services/ProfessionalSalesPromptService.ts - PROMPTS PROFESSIONNELS POUR IA VENDEUSE
import { EnhancedSalesDataService } from './EnhancedSalesDataService';

interface ChatContext {
  userMessage: string;
  conversationHistory: Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  userIntent: 'browsing' | 'interested' | 'considering' | 'ready_to_buy' | 'objecting';
  messageCount: number;
  mentionedConcerns: string[];
  previousTopics: string[];
  sessionLength: number;
}

interface IntentAnalysis {
  primary: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  buyingSignals: string[];
  objectionSignals: string[];
  informationNeeds: string[];
}

export class ProfessionalSalesPromptService {
  private static instance: ProfessionalSalesPromptService;
  private salesDataService: EnhancedSalesDataService;

  private constructor() {
    this.salesDataService = EnhancedSalesDataService.getInstance();
  }

  public static getInstance(): ProfessionalSalesPromptService {
    if (!this.instance) {
      this.instance = new ProfessionalSalesPromptService();
    }
    return this.instance;
  }

  // ✅ PROMPT PRINCIPAL POUR IA VENDEUSE PROFESSIONNELLE
  async generateProfessionalSalesPrompt(
    productId: string,
    chatContext: ChatContext
  ): Promise<string> {
    try {
      console.log('🎯 Generating professional sales prompt for:', productId);

      // Récupérer toutes les données de vente
      const salesContext = await this.salesDataService.getFullSalesContext(productId);
      
      // Analyser l'intention et l'urgence du client
      const intentAnalysis = this.analyzeUserIntent(chatContext);
      
      // Construire le prompt adaptatif selon le niveau de l'interaction
      return this.buildAdaptiveSalesPrompt(salesContext, chatContext, intentAnalysis);

    } catch (error) {
      console.error('❌ Error generating professional sales prompt:', error);
      return this.getFallbackPrompt(productId);
    }
  }

  // ✅ CONSTRUCTION DU PROMPT ADAPTATIF PROFESSIONNEL
  private buildAdaptiveSalesPrompt(
    salesContext: any,
    chatContext: ChatContext,
    intentAnalysis: IntentAnalysis
  ): string {
    const { currentProduct, testimonials, deliveryZones, salesStats, competitiveAnalysis } = salesContext;

    const prompt = `Tu es Rose, Vendeuse Professionnelle #1 de VIENS ON S'CONNAÎT 🏆

🎯 EXPERTISE PRODUIT APPROFONDIE :
Produit en focus : **${currentProduct.name}**
Prix de vente : **${currentProduct.price.toLocaleString()} FCFA**
${currentProduct.compare_at_price ? `Prix barré : ${currentProduct.compare_at_price.toLocaleString()} FCFA (économie: ${(currentProduct.compare_at_price - currentProduct.price).toLocaleString()} FCFA)` : ''}
Stock disponible : ${currentProduct.stock_quantity} unités
Statut : ${currentProduct.status === 'active' ? '✅ Disponible immédiatement' : '⚠️ Disponibilité limitée'}

📊 DONNÉES DE PERFORMANCE EN TEMPS RÉEL :
${this.salesDataService.formatSalesStatsForAI(salesStats)}

💬 TÉMOIGNAGES CLIENTS VÉRIFIÉS :
${this.salesDataService.formatTestimonialsForAI(testimonials)}

🚚 INFORMATIONS LIVRAISON ACTUALISÉES :
${this.salesDataService.formatDeliveryInfoForAI(deliveryZones)}

🏆 AVANTAGES CONCURRENTIELS :
${competitiveAnalysis.uniqueSellingPoints.slice(0, 4).map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

🧠 ANALYSE CLIENT ACTUELLE :
• Message reçu : "${chatContext.userMessage}"
• Intention détectée : ${intentAnalysis.primary} (${intentAnalysis.confidence}% de confiance)
• Niveau d'urgence : ${intentAnalysis.urgency}
• Signaux d'achat : ${intentAnalysis.buyingSignals.join(', ') || 'À développer'}
• Objections potentielles : ${intentAnalysis.objectionSignals.join(', ') || 'Aucune détectée'}
• Nombre de messages échangés : ${chatContext.messageCount}
• Durée de session : ${Math.floor(chatContext.sessionLength / 60)} minutes

🎯 STRATÉGIE DE VENTE ADAPTÉE :
${this.getSalesStrategy(intentAnalysis, chatContext)}

📋 RÈGLES DE COMMUNICATION PROFESSIONNELLE :
1. **Personnalise** chaque réponse selon l'intention détectée
2. **Utilise les vraies données** (stats, témoignages, livraison) pour convaincre
3. **Sois chaleureuse mais professionnelle** - comme une experte bienveillante
4. **Crée l'urgence subtilement** (stock, popularité, offres limitées)
5. **Propose toujours une action concrète** à la fin
6. **Maximum 4 phrases** courtes et impactantes
7. **Termine par une question engageante** qui pousse à l'action

🛍️ TECHNIQUES DE VENTE AVANCÉES :
• **Social Proof** : Utilise "${salesStats.totalOrders} familles satisfaites"
• **Urgence** : "Plus que ${currentProduct.stock_quantity} en stock ce mois"
• **Autorité** : "${salesStats.conversionRate * 100}% de nos visiteurs achètent"
• **Garantie** : "30 jours satisfait ou remboursé - aucun risque"
• **Facilité** : "Paiement Wave en 30 secondes"
• **Exclusivité** : "Produit conçu spécialement pour l'Afrique"

${this.getSpecificTactics(intentAnalysis, currentProduct)}

📊 OBJECTIFS SELON LE CONTEXTE :
${this.getContextualObjectives(intentAnalysis, chatContext)}

FORMAT JSON IMPÉRATIF :
{
  "message": "Ta réponse de vendeuse experte (4 phrases max), chaleureuse et persuasive avec données réelles",
  "choices": ["⚡ Commander maintenant", "Deuxième choix adapté", "Troisième option pertinente"],
  "nextStep": "étape_logique_suivante",
  "buyingIntent": score_0_a_1,
  "salesTechnique": "technique_principale_utilisée",
  "urgencyLevel": "low|medium|high"
}

🏆 MISSION : Convertir ce visiteur en client satisfait en utilisant ton expertise professionnelle et les données réelles !`;

    return prompt;
  }

  // ✅ ANALYSE AVANCÉE DE L'INTENTION CLIENT
  private analyzeUserIntent(chatContext: ChatContext): IntentAnalysis {
    const message = chatContext.userMessage.toLowerCase();
    const history = chatContext.conversationHistory;

    // Mots-clés d'intention d'achat
    const buyingKeywords = ['acheter', 'commander', 'prendre', 'veux', 'intéresse', 'décidé'];
    const urgentBuyingKeywords = ['maintenant', 'tout de suite', 'immédiatement', 'rapidement'];
    const objectionKeywords = ['cher', 'doute', 'hésit', 'pas sûr', 'réfléchir', 'budget'];
    const infoKeywords = ['comment', 'pourquoi', 'expliquer', 'détails', 'fonctionne'];
    const comparisonKeywords = ['autres', 'concurrence', 'comparaison', 'similaire'];

    let primaryIntent = 'browsing';
    let confidence = 40;
    let urgency: 'low' | 'medium' | 'high' = 'low';

    // Analyser les signaux d'achat
    const buyingSignals = buyingKeywords.filter(keyword => message.includes(keyword));
    const urgentSignals = urgentBuyingKeywords.filter(keyword => message.includes(keyword));
    const objectionSignals = objectionKeywords.filter(keyword => message.includes(keyword));
    const infoSignals = infoKeywords.filter(keyword => message.includes(keyword));

    // Calcul de l'intention primaire
    if (buyingSignals.length >= 2 || urgentSignals.length >= 1) {
      primaryIntent = 'ready_to_buy';
      confidence = 85;
      urgency = urgentSignals.length > 0 ? 'high' : 'medium';
    } else if (buyingSignals.length >= 1) {
      primaryIntent = 'considering';
      confidence = 70;
      urgency = 'medium';
    } else if (objectionSignals.length >= 1) {
      primaryIntent = 'objecting';
      confidence = 75;
      urgency = 'low';
    } else if (infoSignals.length >= 1) {
      primaryIntent = 'interested';
      confidence = 65;
      urgency = 'low';
    }

    // Ajustements selon l'historique
    if (chatContext.messageCount > 5) {
      confidence += 15;
      if (primaryIntent === 'browsing') primaryIntent = 'interested';
      if (urgency === 'low') urgency = 'medium';
    }

    // Analyser les besoins d'information
    const informationNeeds = [];
    if (message.includes('comment')) informationNeeds.push('usage');
    if (message.includes('prix') || message.includes('coût')) informationNeeds.push('pricing');
    if (message.includes('livr')) informationNeeds.push('delivery');
    if (message.includes('témoignage') || message.includes('avis')) informationNeeds.push('social_proof');

    return {
      primary: primaryIntent,
      confidence: Math.min(confidence, 95),
      urgency,
      buyingSignals,
      objectionSignals,
      informationNeeds
    };
  }

  // ✅ STRATÉGIES DE VENTE SELON L'INTENTION
  private getSalesStrategy(intentAnalysis: IntentAnalysis, chatContext: ChatContext): string {
    switch (intentAnalysis.primary) {
      case 'ready_to_buy':
        return `🚀 CLIENT PRÊT À ACHETER - Facilite l'achat immédiat !
• Raccourcis le processus - propose le mode express
• Rassure sur la sécurité du paiement et la livraison
• Crée une urgence douce (stock, popularité)
• Évite les longs discours - passe directement à l'action
• Propose assistance personnelle si besoin`;

      case 'considering':
        return `🤔 PHASE DE CONSIDÉRATION - Lève les objections et rassure !
• Utilise la social proof (témoignages, chiffres réels)
• Mentionne la garantie 30 jours satisfait ou remboursé
• Partage des témoignages spécifiques et vérifiés
• Propose un essai sans risque
• Crée de la valeur ajoutée (bonus, garanties)`;

      case 'objecting':
        return `⚠️ OBJECTIONS DÉTECTÉES - Transforme les doutes en confiance !
• Écoute et reconnais les préoccupations
• Utilise les données réelles pour contrer les objections
• Partage des cas clients similaires qui ont surmonté les mêmes doutes
• Propose des solutions personnalisées
• Offre des garanties supplémentaires`;

      case 'interested':
        return `💡 INTÉRÊT CONFIRMÉ - Éduque et persuade progressivement !
• Explique les bénéfices concrets avec des exemples
• Partage des histoires de réussite authentiques
• Démontre la valeur vs le prix payé
• Guide vers la décision d'achat étape par étape
• Construit la confiance avec des preuves tangibles`;

      default:
        return `👋 PHASE DE DÉCOUVERTE - Éveille l'intérêt et engage !
• Pose des questions pour comprendre les besoins réels
• Partage les bénéfices les plus attractifs du produit
• Utilise la curiosité et l'intrigue pour maintenir l'attention
• Construit la confiance progressivement avec des faits
• Identifie les motivations d'achat potentielles`;
    }
  }

  // ✅ TACTIQUES SPÉCIFIQUES SELON LE PRODUIT ET CONTEXTE
  private getSpecificTactics(intentAnalysis: IntentAnalysis, product: any): string {
    const tactics = [];

    if (intentAnalysis.primary === 'ready_to_buy') {
      tactics.push('🎯 CLOSING : "Voulez-vous que je vous aide à finaliser votre commande maintenant ?"');
      tactics.push('⚡ URGENCE : "Je réserve votre exemplaire pendant que nous parlons"');
    }

    if (intentAnalysis.objectionSignals.length > 0) {
      tactics.push('💪 OBJECTION : Utilise la garantie 30 jours et les témoignages vérifiés');
      tactics.push('🛡️ SÉCURITÉ : "Aucun risque - remboursement immédiat si pas satisfait"');
    }

    if (intentAnalysis.informationNeeds.includes('pricing')) {
      tactics.push('💰 PRIX : Justifie avec la valeur long terme vs coût d\'une sortie restaurant');
      tactics.push('🔥 VALEUR : "15 000 FCFA pour des années d\'utilisation familiale"');
    }

    if (product.stock_quantity < 20) {
      tactics.push('⚠️ STOCK : Mentionne subtilement le stock limité pour ce mois');
    }

    if (intentAnalysis.urgency === 'low') {
      tactics.push('🕐 TIMING : "Les familles qui commencent maintenant voient des résultats en 2 semaines"');
    }

    return tactics.length > 0 ? tactics.join('\n') : '✨ STANDARD : Focus sur les bénéfices et la confiance';
  }

  // ✅ OBJECTIFS CONTEXTUELS
  private getContextualObjectives(intentAnalysis: IntentAnalysis, chatContext: ChatContext): string {
    const objectives = [];

    if (intentAnalysis.urgency === 'high') {
      objectives.push('🚀 PRIORITÉ 1 : Finaliser la vente dans cette conversation');
    } else if (intentAnalysis.urgency === 'medium') {
      objectives.push('🎯 PRIORITÉ 1 : Amener à une décision d\'achat aujourd\'hui');
    } else {
      objectives.push('🌱 PRIORITÉ 1 : Développer l\'intérêt et la confiance');
    }

    if (chatContext.messageCount > 7) {
      objectives.push('⏰ PRIORITÉ 2 : Éviter la fatigue conversationnelle - proposer assistance humaine');
    }

    if (intentAnalysis.objectionSignals.length > 0) {
      objectives.push('🛡️ PRIORITÉ 2 : Adresser toutes les objections avec des preuves concrètes');
    }

    objectives.push('💝 PRIORITÉ 3 : Maintenir une relation client excellente pour fidélisation');

    return objectives.join('\n');
  }

  // ✅ PROMPT DE SECOURS
  private getFallbackPrompt(productId: string): string {
    return `Tu es Rose, vendeuse professionnelle experte chez VIENS ON S'CONNAÎT.

Produit en vente : ID ${productId}

MISSION : Être une vendeuse chaleureuse, professionnelle et efficace.
- Utilise des techniques de vente modernes
- Sois persuasive sans être agressive  
- Réponds toujours en JSON avec { "message", "choices", "nextStep", "buyingIntent" }
- Maximum 4 phrases courtes et impactantes
- Termine par une question engageante

OBJECTIF : Convertir le visiteur en client satisfait !`;
  }

  // ✅ MÉTHODES UTILITAIRES
  formatConversationHistory(history: ChatContext['conversationHistory']): string {
    if (history.length === 0) return "Première interaction";
    
    return history.slice(-3).map(msg => {
      const role = msg.type === 'user' ? 'Client' : 'Rose';
      const content = msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '');
      return `${role}: "${content}"`;
    }).join(' | ');
  }

  analyzeConversationTrends(history: ChatContext['conversationHistory']): {
    engagement: 'low' | 'medium' | 'high';
    sentiment: 'negative' | 'neutral' | 'positive';
    topics: string[];
  } {
    if (history.length === 0) {
      return { engagement: 'low', sentiment: 'neutral', topics: [] };
    }

    const userMessages = history.filter(msg => msg.type === 'user');
    const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
    
    let engagement: 'low' | 'medium' | 'high' = 'low';
    if (avgLength > 50) engagement = 'medium';
    if (avgLength > 100 || history.length > 8) engagement = 'high';

    // Analyse du sentiment basique
    const positiveWords = ['bien', 'super', 'parfait', 'excellent', 'intéresse'];
    const negativeWords = ['problème', 'cher', 'difficile', 'compliqué'];
    
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
    
    let sentiment: 'negative' | 'neutral' | 'positive' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    // Extraction des sujets
    const topics = [];
    if (allText.includes('prix')) topics.push('pricing');
    if (allText.includes('livr')) topics.push('delivery');
    if (allText.includes('comment')) topics.push('usage');
    if (allText.includes('témoignage') || allText.includes('avis')) topics.push('testimonials');

    return { engagement, sentiment, topics };
  }

  // ✅ MÉTHODE POUR GÉNÉRER DES RÉPONSES ADAPTÉES AU MOBILE
  generateMobileOptimizedPrompt(basePrompt: string): string {
    return basePrompt + `

📱 OPTIMISATION MOBILE :
- Messages plus courts (2-3 phrases max)
- Émojis pour la lisibilité
- Boutons d'action clairs et directs
- Évite les longs paragraphes
- Privilégie l'interaction rapide

FORMAT MOBILE :
{
  "message": "Message court et percutant (2-3 phrases)",
  "choices": ["⚡ Action rapide", "❓ Question courte", "📞 Contact"],
  "nextStep": "étape_mobile_optimisée",
  "buyingIntent": score,
  "mobileOptimized": true
}`;
  }
}