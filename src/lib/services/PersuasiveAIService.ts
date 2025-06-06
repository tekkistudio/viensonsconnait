// src/lib/services/PersuasiveAIService.ts - SERVICE IA PERSUASIVE
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ConversationStep } from '@/types/chat';

interface KnowledgeBaseEntry {
  id: string;
  category: string;
  trigger_keywords: string[];
  question?: string;
  answer: string;
  priority: number;
  tone: string;
  next_suggestions: string[];
}

interface PersuasionContext {
  userMessage: string;
  productId: string;
  productName: string;
  userIntent: 'browsing' | 'interested' | 'considering' | 'ready_to_buy';
  concerns: string[];
  interests: string[];
  messageCount: number;
  priceRange?: number;
}

export class PersuasiveAIService {
  private static instance: PersuasiveAIService;
  private knowledgeBase: KnowledgeBaseEntry[] = [];
  private lastFetched: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): PersuasiveAIService {
    if (!this.instance) {
      this.instance = new PersuasiveAIService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE: Générer une réponse persuasive
  async generatePersuasiveResponse(context: PersuasionContext): Promise<ChatMessage> {
    console.log('🎯 Generating persuasive response for:', context.userMessage);

    try {
      // 1. Charger la base de connaissances si nécessaire
      await this.loadKnowledgeBase();

      // 2. Analyser l'intention et trouver la meilleure réponse
      const bestMatch = this.findBestMatch(context);

      if (bestMatch) {
        console.log('✅ Found knowledge match:', bestMatch.category);
        return this.createResponseFromKnowledge(bestMatch, context);
      }

      // 3. Si pas de match exact, générer une réponse contextuelle
      return this.generateContextualResponse(context);

    } catch (error) {
      console.error('❌ Error in generatePersuasiveResponse:', error);
      return this.createFallbackResponse(context);
    }
  }

  // ✅ CHARGER LA BASE DE CONNAISSANCES
  private async loadKnowledgeBase(): Promise<void> {
    const now = Date.now();
    
    // Cache pour éviter les requêtes répétées
    if (now - this.lastFetched < this.CACHE_DURATION && this.knowledgeBase.length > 0) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading knowledge base:', error);
        return;
      }

      this.knowledgeBase = data || [];
      this.lastFetched = now;
      console.log(`📚 Loaded ${this.knowledgeBase.length} knowledge entries`);

    } catch (error) {
      console.error('❌ Error in loadKnowledgeBase:', error);
    }
  }

  // ✅ TROUVER LA MEILLEURE CORRESPONDANCE
  private findBestMatch(context: PersuasionContext): KnowledgeBaseEntry | null {
    const userMessage = context.userMessage.toLowerCase();
    let bestMatch: KnowledgeBaseEntry | null = null;
    let bestScore = 0;

    for (const entry of this.knowledgeBase) {
      let score = 0;
      
      // Calculer le score basé sur les mots-clés
      for (const keyword of entry.trigger_keywords) {
        if (userMessage.includes(keyword.toLowerCase())) {
          score += 10; // Score de base pour correspondance de mot-clé
          
          // Bonus pour les mots-clés en début de phrase (intention plus forte)
          if (userMessage.startsWith(keyword.toLowerCase())) {
            score += 5;
          }
        }
      }

      // Bonus selon la catégorie et le contexte utilisateur
      if (entry.category === 'objections' && context.concerns.length > 0) {
        score += 15; // Priorité aux objections si l'utilisateur a des préoccupations
      }

      if (entry.category === 'benefits' && context.userIntent === 'interested') {
        score += 10; // Présenter les bénéfices si l'utilisateur est intéressé
      }

      if (entry.category === 'testimonials' && context.userIntent === 'considering') {
        score += 12; // Témoignages pour convaincre ceux qui hésitent
      }

      // Bonus pour la priorité (plus la priorité est faible, plus le bonus est élevé)
      score += (4 - entry.priority) * 3;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    console.log(`🎯 Best match score: ${bestScore}`, bestMatch?.category);
    return bestScore >= 10 ? bestMatch : null; // Seuil minimum de pertinence
  }

  // ✅ CRÉER UNE RÉPONSE À PARTIR DE LA BASE DE CONNAISSANCES
  private createResponseFromKnowledge(
    knowledge: KnowledgeBaseEntry, 
    context: PersuasionContext
  ): ChatMessage {
    // Personnaliser la réponse avec le nom du produit
    let personalizedAnswer = knowledge.answer.replace(
      /notre jeu|le jeu/gi, 
      `le jeu **${context.productName}**`
    );

    // Adapter le ton selon le contexte
    if (context.messageCount > 5 && knowledge.tone === 'professional') {
      personalizedAnswer = this.makeMoreFriendly(personalizedAnswer);
    }

    return {
      type: 'assistant',
      content: personalizedAnswer,
      choices: knowledge.next_suggestions.length > 0 
        ? knowledge.next_suggestions 
        : this.getDefaultChoices(context),
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: this.determineNextStep(knowledge.category, context),
        flags: {
          persuasionMode: true,
          knowledgeCategory: knowledge.category,
          userIntent: context.userIntent
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ GÉNÉRER UNE RÉPONSE CONTEXTUELLE SANS MATCH EXACT
  private generateContextualResponse(context: PersuasionContext): ChatMessage {
    const { userMessage, productName, userIntent, messageCount } = context;

    // Analyser le sentiment et l'intention
    const isQuestion = userMessage.includes('?') || 
                      userMessage.toLowerCase().startsWith('comment') ||
                      userMessage.toLowerCase().startsWith('pourquoi');

    const showsInterest = userMessage.toLowerCase().includes('intéresse') ||
                         userMessage.toLowerCase().includes('bien') ||
                         userMessage.toLowerCase().includes('aime');

    let response = '';
    let choices: string[] = [];
    let nextStep: ConversationStep = 'generic_response';

    if (isQuestion) {
      response = `🤔 **Excellente question !** 

Je vois que vous vous intéressez à notre jeu **${productName}**. C'est un choix parfait pour transformer vos relations !

Pour mieux vous renseigner, voici ce que je peux vous expliquer :

✨ **Informations disponibles :**
• Comment utiliser le jeu concrètement
• Les bénéfices que vous allez obtenir  
• Les témoignages de nos clients satisfaits
• Les détails pratiques (livraison, garantie)

Qu'est-ce qui vous intéresse le plus ?`;

      choices = [
        '⚡ Oui, je commande maintenant',
        '📖 Montrez-moi comment ça marche',
        '⭐ Voir les témoignages clients',
        '💰 Infos sur la garantie'
      ];
      nextStep = 'high_interest';

    } else {
      // Réponse générale engageante
      response = `💬 **Merci pour votre message !**

Je vois que vous vous intéressez à notre jeu **${productName}**. C'est un choix intelligent !

🌟 **Pourquoi tant de familles nous font confiance :**
• **1 247 clients satisfaits** dans 12 pays africains
• **Développé par des psychologues** spécialisés
• **Résultats prouvés** en seulement 2 semaines
• **Garantie satisfait ou remboursé** 30 jours

${messageCount > 3 ? 
  '🤗 Je vois qu\'on discute depuis un moment. Voulez-vous que je vous aide à finaliser votre commande ?' : 
  'Que puis-je vous expliquer pour vous aider dans votre décision ?'}`;

      choices = messageCount > 3 ? [
        '⚡ Oui, aidez-moi à commander',
        '❓ J\'ai encore des questions',
        '⭐ Voir les témoignages',
        '💰 Détails sur la garantie'
      ] : [
        '❓ Comment ça fonctionne ?',
        '💝 Quels bénéfices ?',
        '⭐ Avis clients',
        '⚡ Commander maintenant'
      ];
      nextStep = messageCount > 3 ? 'conversion_focus' : 'information_gathering';
    }

    return {
      type: 'assistant',
      content: response,
      choices,
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep,
        flags: {
          persuasionMode: true,
          contextualResponse: true,
          userIntent: context.userIntent
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ RÉPONSE DE SECOURS
  private createFallbackResponse(context: PersuasionContext): ChatMessage {
    return {
      type: 'assistant',
      content: `😊 **Merci pour votre intérêt !**

Je suis Rose, votre assistante pour le **${context.productName}**. 

🎯 **Je peux vous aider à :**
• Comprendre comment le jeu fonctionne
• Découvrir tous les bénéfices
• Voir les témoignages clients
• Commander rapidement et en sécurité

Que souhaitez-vous savoir en premier ?`,
      choices: [
        '❓ Comment ça marche ?',
        '💝 Quels bénéfices ?',
        '⭐ Témoignages clients',
        '⚡ Commander maintenant'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'fallback_response' as ConversationStep,
        flags: { persuasionMode: true }
      },
      timestamp: new Date().toISOString()
    };
  }

  // ✅ UTILITAIRES
  private makeMoreFriendly(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '✨ **$1** ✨')
      .replace(/^💭/, '😊')
      .replace(/^🤔/, '😄')
      .replace(/Laissez-moi/, 'Permettez-moi de')
      .replace(/Voulez-vous/, 'Que diriez-vous de');
  }

  private getDefaultChoices(context: PersuasionContext): string[] {
    switch (context.userIntent) {
      case 'ready_to_buy':
        return ['⚡ Commander maintenant', '❓ Une dernière question', '💰 Détails paiement'];
      case 'considering':
        return ['⭐ Voir témoignages', '💰 Garantie satisfait/remboursé', '⚡ Commander'];
      case 'interested':
        return ['💝 Quels bénéfices ?', '❓ Comment ça marche ?', '⚡ Commander'];
      default:
        return ['❓ En savoir plus', '⭐ Témoignages', '⚡ Commander', '📞 Contact'];
    }
  }

  private determineNextStep(category: string, context: PersuasionContext): ConversationStep {
    switch (category) {
      case 'objections':
        return context.userIntent === 'considering' ? 'objection_handled' : 'objection_addressed';
      case 'benefits':
        return 'benefits_presented';
      case 'testimonials':
        return 'social_proof_shown';
      case 'business_info':
        return 'trust_building';
      default:
        return 'persuasion_attempt';
    }
  }

  // ✅ MÉTHODES PUBLIQUES POUR ANALYSE AVANCÉE
  async analyzeUserSentiment(message: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    concerns: string[];
    interests: string[];
  }> {
    const lowerMessage = message.toLowerCase();
    
    const positiveWords = ['bien', 'intéresse', 'parfait', 'excellent', 'super', 'génial', 'aime'];
    const negativeWords = ['cher', 'doute', 'sceptique', 'problème', 'difficile', 'compliqué'];
    const concernWords = ['prix', 'coût', 'budget', 'marche', 'efficace', 'vraiment'];
    const interestWords = ['comment', 'pourquoi', 'expliquer', 'montrer', 'détails'];

    let positiveScore = 0;
    let negativeScore = 0;
    const foundConcerns: string[] = [];
    const foundInterests: string[] = [];

    // Analyser les mots
    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) negativeScore++;
    });

    concernWords.forEach(word => {
      if (lowerMessage.includes(word)) foundConcerns.push(word);
    });

    interestWords.forEach(word => {
      if (lowerMessage.includes(word)) foundInterests.push(word);
    });

    // Déterminer le sentiment
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (positiveScore > negativeScore) sentiment = 'positive';
    else if (negativeScore > positiveScore) sentiment = 'negative';
    else sentiment = 'neutral';

    const confidence = Math.min(Math.abs(positiveScore - negativeScore) / 5, 1);

    return {
      sentiment,
      confidence,
      concerns: foundConcerns,
      interests: foundInterests
    };
  }

  async getRecommendedActions(context: PersuasionContext): Promise<string[]> {
    const { userIntent, concerns, messageCount } = context;
    
    const actions: string[] = [];

    // Actions basées sur l'intention
    if (userIntent === 'ready_to_buy') {
      actions.push('propose_express_checkout', 'highlight_guarantees', 'create_urgency');
    } else if (userIntent === 'considering') {
      actions.push('show_testimonials', 'address_concerns', 'offer_trial');
    } else if (userIntent === 'interested') {
      actions.push('explain_benefits', 'show_social_proof', 'demonstrate_value');
    }

    // Actions basées sur les préoccupations
    if (concerns.includes('price_concern')) {
      actions.push('justify_price', 'show_value_proposition', 'offer_guarantee');
    }

    // Actions basées sur la longueur de conversation
    if (messageCount > 5) {
      actions.push('conversion_focus', 'limited_time_offer', 'personal_assistance');
    }

    return actions;
  }

  // ✅ MÉTHODE POUR CRÉER DE L'URGENCE (sans être agressif)
  createUrgencyMessage(productName: string, reason: 'stock' | 'promotion' | 'popularity'): string {
    const urgencyMessages = {
      stock: `⚠️ **Information importante :** Il ne nous reste que quelques exemplaires du **${productName}** en stock ce mois-ci.

📈 **Pourquoi cette popularité ?**
• Recommandations bouche-à-oreille
• Résultats exceptionnels des clients
• Qualité premium reconnue

✅ **Réservez le vôtre maintenant** pour être sûr(e) de l'avoir avant rupture.`,

      promotion: `🎁 **Offre spéciale ce mois-ci :**
Livraison **GRATUITE** pour le **${productName}** (valeur 2500 FCFA)

⏰ **Valable jusqu'au 31 de ce mois**

C'est le moment parfait pour essayer sans frais supplémentaires !`,

      popularity: `🔥 **Tendance :** Le **${productName}** est notre produit #1 ce mois !

📊 **Cette semaine :**
• 47 familles l'ont commandé
• 12 témoignages 5 étoiles reçus
• 94% de taux de satisfaction

Rejoignez cette communauté grandissante !`
    };

    return urgencyMessages[reason];
  }
}

export default PersuasiveAIService;