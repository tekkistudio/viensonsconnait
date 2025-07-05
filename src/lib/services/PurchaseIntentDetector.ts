// src/lib/services/PurchaseIntentDetector.ts - DÉTECTION AUTOMATIQUE D'INTENTION D'ACHAT

export interface PurchaseIntent {
  score: number; // 0-100
  confidence: 'low' | 'medium' | 'high';
  signals: string[];
  recommendation: 'continue_conversation' | 'gentle_push' | 'trigger_purchase';
  suggestedResponse: string;
}

export class PurchaseIntentDetector {
  private static instance: PurchaseIntentDetector;

  public static getInstance(): PurchaseIntentDetector {
    if (!this.instance) {
      this.instance = new PurchaseIntentDetector();
    }
    return this.instance;
  }

  // ✅ SIGNAUX D'INTENTION D'ACHAT FORTS (Score: 80-100)
  private readonly strongPurchaseSignals = [
    // Signaux directs d'achat
    'je vais le prendre',
    'je le prends',
    'je vais l\'acheter',
    'je veux l\'acheter',
    'j\'achète',
    'je commande',
    'je le veux',
    'c\'est parfait',
    'ça me convient',
    'allons-y',
    'go',
    'banco',
    'top',
    'ok pour moi',
    'd\'accord',
    'vendu',
    'convaincu',
    'convaincue',
    
    // Signaux de décision prise
    'super choix',
    'excellent choix',
    'parfait pour nous',
    'exactement ce qu\'il nous faut',
    'c\'est ce que je cherchais',
    'ça correspond',
    'ça me plaît',
    'j\'adore',
    'je valide',
    'adoptè',
    
    // Signaux d'urgence
    'maintenant',
    'tout de suite',
    'rapidement',
    'vite',
    'sans attendre',
    'immédiatement',
    
    // Validation après objection levée
    'vous avez raison',
    'ça me rassure',
    'je suis rassuré',
    'je suis rassurée',
    'c\'est vrai',
    'effectivement',
    'en effet'
  ];

  // ✅ SIGNAUX D'INTENTION D'ACHAT MOYENS (Score: 50-79)
  private readonly mediumPurchaseSignals = [
    // Intérêt fort
    'très intéressant',
    'ça m\'intéresse',
    'j\'aime bien',
    'pas mal',
    'bien',
    'sympa',
    'cool',
    'génial',
    'super',
    'top',
    'excellent',
    
    // Validation du besoin
    'j\'en ai besoin',
    'c\'est utile',
    'ça peut aider',
    'ça pourrait marcher',
    'pourquoi pas',
    'on va essayer',
    'on peut tenter',
    
    // Questions sur l'achat
    'comment je peux l\'avoir',
    'comment faire pour l\'acheter',
    'disponible quand',
    'livraison',
    'paiement',
    'combien ça coûte',
    'quel est le prix',
    'tarif',
    
    // Validation avec proches
    'je vais en parler',
    'je vais demander',
    'il faut que j\'en parle',
    'mon/ma conjoint',
    'ma femme',
    'mon mari',
    'mes parents'
  ];

  // ✅ SIGNAUX D'INTENTION D'ACHAT FAIBLES (Score: 20-49)
  private readonly lowPurchaseSignals = [
    // Curiosité
    'intéressant',
    'pas mal',
    'sympa',
    'pourquoi pas',
    'on verra',
    'peut-être',
    'à voir',
    'je réfléchis',
    'je vais y penser',
    
    // Questions générales
    'comment ça marche',
    'ça consiste en quoi',
    'c\'est quoi exactement',
    'dites-moi en plus',
    'expliquez-moi',
    
    // Hésitation positive
    'ça pourrait être bien',
    'ça a l\'air pas mal',
    'j\'hésite',
    'je ne sais pas',
    'difficile à dire'
  ];

  // ✅ SIGNAUX BLOQUANTS (Score: -50 à 0)
  private readonly blockingSignals = [
    // Rejet direct
    'pas intéressé',
    'pas intéressée',
    'ça ne m\'intéresse pas',
    'non merci',
    'pas pour moi',
    'pas maintenant',
    'trop cher',
    'pas les moyens',
    'pas le budget',
    'pas le temps',
    
    // Objections fortes
    'ça ne marche pas',
    'je doute',
    'j\'ai des doutes',
    'sceptique',
    'pas convaincu',
    'pas convaincue',
    'pas sûr',
    'pas sûre',
    
    // Remise à plus tard
    'plus tard',
    'une autre fois',
    'pas aujourd\'hui',
    'je reviendrai',
    'à bientôt'
  ];

  /**
   * ✅ ANALYSE L'INTENTION D'ACHAT DANS UN MESSAGE
   */
  public analyzePurchaseIntent(
    message: string,
    conversationHistory: string[] = [],
    context: {
      messageCount?: number;
      timeSpent?: number;
      previousIntentScore?: number;
    } = {}
  ): PurchaseIntent {
    const normalizedMessage = message.toLowerCase().trim();
    const words = normalizedMessage.split(/\s+/);
    
    let score = 0;
    const detectedSignals: string[] = [];
    
    // ✅ ANALYSE DES SIGNAUX DIRECTS
    
    // Signaux forts (+80 à +100)
    this.strongPurchaseSignals.forEach(signal => {
      if (normalizedMessage.includes(signal)) {
        score += 85;
        detectedSignals.push(`Strong: "${signal}"`);
      }
    });
    
    // Signaux moyens (+50 à +79)
    this.mediumPurchaseSignals.forEach(signal => {
      if (normalizedMessage.includes(signal)) {
        score += 60;
        detectedSignals.push(`Medium: "${signal}"`);
      }
    });
    
    // Signaux faibles (+20 à +49)
    this.lowPurchaseSignals.forEach(signal => {
      if (normalizedMessage.includes(signal)) {
        score += 30;
        detectedSignals.push(`Low: "${signal}"`);
      }
    });
    
    // Signaux bloquants (-50 à 0)
    this.blockingSignals.forEach(signal => {
      if (normalizedMessage.includes(signal)) {
        score -= 40;
        detectedSignals.push(`Blocking: "${signal}"`);
      }
    });
    
    // ✅ ANALYSE CONTEXTUELLE
    
    // Bonus pour engagement dans la conversation
    if (context.messageCount && context.messageCount > 3) {
      score += Math.min(20, context.messageCount * 2);
      detectedSignals.push(`Engagement: ${context.messageCount} messages`);
    }
    
    // Bonus pour temps passé
    if (context.timeSpent && context.timeSpent > 120) { // 2 minutes
      score += Math.min(15, Math.floor(context.timeSpent / 60));
      detectedSignals.push(`Time spent: ${Math.floor(context.timeSpent / 60)}min`);
    }
    
    // Progression d'intention
    if (context.previousIntentScore && context.previousIntentScore > 40) {
      score += 10;
      detectedSignals.push(`Intent progression from ${context.previousIntentScore}`);
    }
    
    // ✅ ANALYSE LINGUISTIQUE AVANCÉE
    
    // Questions sur les détails pratiques = intention forte
    const practicalQuestions = [
      'livraison', 'paiement', 'délai', 'prix', 'coût', 'tarif',
      'comment l\'avoir', 'quand', 'où', 'disponible'
    ];
    
    const practicalCount = practicalQuestions.filter(q => 
      normalizedMessage.includes(q)
    ).length;
    
    if (practicalCount > 0) {
      score += practicalCount * 25;
      detectedSignals.push(`Practical questions: ${practicalCount}`);
    }
    
    // Émotions positives
    const positiveEmotions = ['adore', 'aime', 'plaît', 'génial', 'super', 'top', 'excellent'];
    const emotionCount = positiveEmotions.filter(e => 
      normalizedMessage.includes(e)
    ).length;
    
    if (emotionCount > 0) {
      score += emotionCount * 15;
      detectedSignals.push(`Positive emotions: ${emotionCount}`);
    }
    
    // ✅ DÉTECTION DE PATTERNS SPÉCIAUX
    
    // Validation après explication ("ah ok", "je vois", "d'accord")
    const validationPatterns = ['ah ok', 'je vois', 'd\'accord', 'compris', 'très bien'];
    if (validationPatterns.some(p => normalizedMessage.includes(p))) {
      score += 20;
      detectedSignals.push('Validation pattern');
    }
    
    // Questions sur personnalisation ("pour nous", "dans notre cas")
    if (normalizedMessage.includes('pour nous') || normalizedMessage.includes('dans notre cas')) {
      score += 30;
      detectedSignals.push('Personalization interest');
    }
    
    // Urgence temporelle ("maintenant", "aujourd'hui", "vite")
    const urgencyWords = ['maintenant', 'aujourd\'hui', 'vite', 'rapidement', 'tout de suite'];
    if (urgencyWords.some(u => normalizedMessage.includes(u))) {
      score += 25;
      detectedSignals.push('Urgency detected');
    }
    
    // ✅ CALCUL FINAL ET RECOMMANDATIONS
    
    // Normaliser le score entre 0 et 100
    score = Math.max(0, Math.min(100, score));
    
    // Déterminer la confiance
    let confidence: 'low' | 'medium' | 'high';
    let recommendation: 'continue_conversation' | 'gentle_push' | 'trigger_purchase';
    let suggestedResponse: string;
    
    if (score >= 75) {
      confidence = 'high';
      recommendation = 'trigger_purchase';
      suggestedResponse = "Excellent ! Vous semblez convaincu(e). Souhaitez-vous que nous procédions à votre commande maintenant ?";
    } else if (score >= 45) {
      confidence = 'medium';
      recommendation = 'gentle_push';
      suggestedResponse = "Je sens que ce jeu vous intéresse ! Avez-vous encore des questions ou êtes-vous prêt(e) à passer commande ?";
    } else {
      confidence = 'low';
      recommendation = 'continue_conversation';
      suggestedResponse = "Parfait ! Y a-t-il autre chose que vous aimeriez savoir sur ce jeu ?";
    }
    
    console.log('🎯 Purchase Intent Analysis:', {
      message: message.substring(0, 50),
      score,
      confidence,
      signals: detectedSignals,
      recommendation
    });
    
    return {
      score,
      confidence,
      signals: detectedSignals,
      recommendation,
      suggestedResponse
    };
  }

  /**
   * ✅ GÉNÈRE UNE RÉPONSE ADAPTÉE À L'INTENTION D'ACHAT
   */
  public generateIntentBasedResponse(
    intent: PurchaseIntent,
    productName: string,
    message: string
  ): {
    shouldTriggerPurchase: boolean;
    response: string;
    choices: string[];
  } {
    
    if (intent.recommendation === 'trigger_purchase') {
      // ✅ DÉCLENCHER LE FLOW D'ACHAT AUTOMATIQUEMENT
      return {
        shouldTriggerPurchase: true,
        response: `🎉 **Parfait ! Je vois que vous êtes convaincu(e).**

Procédons à votre commande du **jeu ${productName}** maintenant !

**Récapitulatif :**
✅ Le jeu ${productName} - 14,000 FCFA
✅ Livraison gratuite à Dakar
✅ Satisfait ou remboursé

**Démarrons votre commande ?**`,
        choices: [
          '✅ Oui, je veux l\'acheter maintenant',
          'J\'ai encore une question',
          'Voir les options de livraison'
        ]
      };
    }
    
    if (intent.recommendation === 'gentle_push') {
      // ✅ POUSSER DOUCEMENT VERS L'ACHAT
      return {
        shouldTriggerPurchase: false,
        response: `😊 **Je sens que le jeu ${productName} vous intéresse !**

Vous avez raison, c'est exactement le type de jeu qui peut transformer vos relations. Nos clients nous disent souvent qu'ils regrettent de ne pas l'avoir acheté plus tôt.

**Qu'est-ce qui vous ferait pencher définitivement pour ce jeu ?**`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Combien coûte la livraison ?',
          'Comment y jouer exactement ?',
          'J\'ai d\'autres questions'
        ]
      };
    }
    
    // ✅ CONTINUER LA CONVERSATION NORMALEMENT
    return {
      shouldTriggerPurchase: false,
      response: `👍 **Merci pour votre question !**

Je vois que vous vous renseignez sur le **jeu ${productName}**. C'est parfait, prenez le temps qu'il vous faut.

**Que puis-je vous expliquer d'autre ?**`,
      choices: [
        'Comment y jouer ?',
        'C\'est pour qui exactement ?',
        'Combien ça coûte ?',
        'Je veux l\'acheter maintenant'
      ]
    };
  }

  /**
   * ✅ ANALYSE L'HISTORIQUE DE CONVERSATION POUR L'ÉVOLUTION D'INTENTION
   */
  public analyzeConversationEvolution(
    conversationHistory: Array<{message: string, timestamp: string, type: 'user' | 'assistant'}>
  ): {
    overallIntentScore: number;
    intentProgression: number[];
    conversationPhase: 'discovery' | 'consideration' | 'decision' | 'purchase';
    recommendation: 'nurture' | 'accelerate' | 'close';
  } {
    
    const userMessages = conversationHistory
      .filter(h => h.type === 'user')
      .map(h => h.message);
    
    const intentScores = userMessages.map((msg, index) => {
      const context = {
        messageCount: index + 1,
        timeSpent: this.calculateTimeSpent(conversationHistory, index),
        previousIntentScore: index > 0 ? this.analyzePurchaseIntent(userMessages[index - 1]).score : 0
      };
      
      return this.analyzePurchaseIntent(msg, userMessages.slice(0, index), context).score;
    });
    
    const overallIntentScore = intentScores.length > 0 
      ? intentScores.reduce((sum, score) => sum + score, 0) / intentScores.length
      : 0;
    
    // Déterminer la phase de conversation
    let conversationPhase: 'discovery' | 'consideration' | 'decision' | 'purchase';
    if (overallIntentScore >= 70) conversationPhase = 'purchase';
    else if (overallIntentScore >= 45) conversationPhase = 'decision';
    else if (overallIntentScore >= 25) conversationPhase = 'consideration';
    else conversationPhase = 'discovery';
    
    // Recommandation stratégique
    let recommendation: 'nurture' | 'accelerate' | 'close';
    if (conversationPhase === 'purchase') recommendation = 'close';
    else if (conversationPhase === 'decision') recommendation = 'accelerate';
    else recommendation = 'nurture';
    
    return {
      overallIntentScore,
      intentProgression: intentScores,
      conversationPhase,
      recommendation
    };
  }

  /**
   * ✅ CALCULE LE TEMPS PASSÉ DANS LA CONVERSATION
   */
  private calculateTimeSpent(
    history: Array<{timestamp: string}>, 
    currentIndex: number
  ): number {
    if (currentIndex === 0 || history.length === 0) return 0;
    
    const startTime = new Date(history[0].timestamp).getTime();
    const currentTime = new Date(history[currentIndex].timestamp).getTime();
    
    return Math.floor((currentTime - startTime) / 1000); // en secondes
  }

  /**
   * ✅ DÉTECTE SI UN MESSAGE INDIQUE UNE DÉCISION D'ACHAT IMMÉDIATE
   */
  public isImmediatePurchaseDecision(message: string): boolean {
    const immediateSignals = [
      'je le prends',
      'je vais le prendre',
      'je veux l\'acheter maintenant',
      'allons-y',
      'c\'est parti',
      'go',
      'vendu',
      'ok pour moi',
      'd\'accord pour acheter',
      'je commande',
      'adoptè'
    ];
    
    const normalizedMessage = message.toLowerCase().trim();
    return immediateSignals.some(signal => 
      normalizedMessage.includes(signal)
    );
  }

  /**
   * ✅ SUGGÈRE LA PROCHAINE ACTION COMMERCIALE
   */
  public suggestNextCommercialAction(
    intent: PurchaseIntent,
    conversationLength: number
  ): {
    action: 'present_product' | 'handle_objections' | 'create_urgency' | 'close_sale' | 'provide_social_proof';
    reason: string;
    priority: 'low' | 'medium' | 'high';
  } {
    
    if (intent.score >= 75) {
      return {
        action: 'close_sale',
        reason: 'High purchase intent detected',
        priority: 'high'
      };
    }
    
    if (intent.score >= 45 && conversationLength > 5) {
      return {
        action: 'create_urgency',
        reason: 'Medium intent with long conversation',
        priority: 'high'
      };
    }
    
    if (intent.score >= 30) {
      return {
        action: 'provide_social_proof',
        reason: 'Growing interest needs validation',
        priority: 'medium'
      };
    }
    
    if (intent.signals.some(s => s.includes('Blocking'))) {
      return {
        action: 'handle_objections',
        reason: 'Blocking signals detected',
        priority: 'high'
      };
    }
    
    return {
      action: 'present_product',
      reason: 'Low intent, needs more information',
      priority: 'medium'
    };
  }
}