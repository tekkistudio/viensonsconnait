// src/lib/services/ConversationOptimizer.ts - OPTIMISATION INTELLIGENTE DES CONVERSATIONS

import type { ChatMessage, ConversationStep } from '@/types/chat';
import { PurchaseIntentDetector, type PurchaseIntent } from './PurchaseIntentDetector';

export interface ConversationMetrics {
  messageCount: number;
  averageResponseTime: number;
  intentProgression: number[];
  objectionCount: number;
  questionCount: number;
  engagementScore: number;
  conversionProbability: number;
  timeToDecision: number;
  dropOffRisk: 'low' | 'medium' | 'high';
}

export interface OptimizationSuggestion {
  type: 'response_tone' | 'next_question' | 'sales_technique' | 'urgency_creation' | 'objection_handling';
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  expectedImpact: string;
  implementation: string;
}

export interface ConversationStrategy {
  currentPhase: 'rapport_building' | 'need_discovery' | 'solution_presentation' | 'objection_handling' | 'closing';
  nextBestAction: string;
  recommendations: OptimizationSuggestion[];
  responseTemplate: string;
  choicesOptimization: string[];
}

export class ConversationOptimizer {
  private static instance: ConversationOptimizer;
  private intentDetector: PurchaseIntentDetector;

  // ✅ RÈGLES D'OPTIMISATION COMMERCIALE
  private readonly salesRules = {
    // Règles de timing pour passer à l'achat
    timingRules: {
      minMessagesBeforePush: 3,
      maxMessagesBeforeUrgency: 8,
      optimalConversationLength: 5,
      urgencyTriggerTime: 300 // 5 minutes
    },

    // Techniques de vente par phase
    salesTechniques: {
      rapport_building: ['question_ouverte', 'validation_emotionnelle', 'personnalisation'],
      need_discovery: ['questionnement_SPIN', 'amplification_probleme', 'consequence_exploration'],
      solution_presentation: ['benefices_personnalises', 'preuves_sociales', 'demonstration_valeur'],
      objection_handling: ['technique_feel_felt_found', 'reframe_positif', 'preuve_contraire'],
      closing: ['assumptive_close', 'urgence_limitee', 'alternative_choice']
    },

    // Triggers d'optimisation
    optimizationTriggers: {
      dropOffSignals: ['je vais réfléchir', 'plus tard', 'je reviendrai', 'pas maintenant'],
      hesitationSignals: ['je ne sais pas', 'hésitation', 'peut-être', 'difficile à dire'],
      priceObjections: ['cher', 'prix', 'coût', 'budget', 'moyens'],
      needValidation: ['ça marche vraiment', 'efficace', 'résultats', 'preuve']
    }
  };

  public static getInstance(): ConversationOptimizer {
    if (!this.instance) {
      this.instance = new ConversationOptimizer();
    }
    return this.instance;
  }

  private constructor() {
    this.intentDetector = PurchaseIntentDetector.getInstance();
  }

  /**
   * ✅ ANALYSE ET OPTIMISE UNE CONVERSATION EN TEMPS RÉEL
   */
  public optimizeConversation(
    conversationHistory: ChatMessage[],
    currentMessage: string,
    productName: string,
    sessionStartTime: number
  ): ConversationStrategy {
    
    console.log('🎯 Optimizing conversation for:', { 
      messageCount: conversationHistory.length,
      currentMessage: currentMessage.substring(0, 50),
      productName 
    });

    // ✅ CALCULER LES MÉTRIQUES DE CONVERSATION
    const metrics = this.calculateConversationMetrics(conversationHistory, sessionStartTime);
    
    // ✅ ANALYSER L'INTENTION D'ACHAT ACTUELLE
    const currentIntent = this.intentDetector.analyzePurchaseIntent(
      currentMessage,
      this.extractUserMessages(conversationHistory),
      {
        messageCount: metrics.messageCount,
        timeSpent: metrics.timeToDecision,
        previousIntentScore: metrics.intentProgression[metrics.intentProgression.length - 1] || 0
      }
    );

    // ✅ DÉTERMINER LA PHASE DE CONVERSATION
    const currentPhase = this.determineConversationPhase(metrics, currentIntent);
    
    // ✅ GÉNÉRER LES RECOMMANDATIONS D'OPTIMISATION
    const recommendations = this.generateOptimizationSuggestions(
      metrics, 
      currentIntent, 
      currentPhase, 
      currentMessage
    );

    // ✅ DÉFINIR LA STRATÉGIE OPTIMALE
    const strategy = this.defineOptimalStrategy(
      currentPhase, 
      currentIntent, 
      metrics, 
      productName,
      recommendations
    );

    return strategy;
  }

  /**
   * ✅ CALCULE LES MÉTRIQUES DE PERFORMANCE DE LA CONVERSATION
   */
  private calculateConversationMetrics(
    history: ChatMessage[], 
    sessionStartTime: number
  ): ConversationMetrics {
    
    const userMessages = history.filter(msg => msg.type === 'user');
    const assistantMessages = history.filter(msg => msg.type === 'assistant');
    
    // Calculer la progression d'intention
    const intentProgression = userMessages.map(msg => 
      this.intentDetector.analyzePurchaseIntent(msg.content as string).score
    );

    // Compter les objections et questions
    const objectionCount = this.countObjections(userMessages);
    const questionCount = this.countQuestions(userMessages);

    // Calculer l'engagement
    const engagementScore = this.calculateEngagementScore(history);

    // Temps de décision
    const timeToDecision = Date.now() - sessionStartTime;

    // Probabilité de conversion basée sur les métriques
    const conversionProbability = this.calculateConversionProbability(
      intentProgression,
      engagementScore,
      timeToDecision,
      objectionCount
    );

    // Risque d'abandon
    const dropOffRisk = this.assessDropOffRisk(
      intentProgression,
      timeToDecision,
      userMessages
    );

    return {
      messageCount: userMessages.length,
      averageResponseTime: this.calculateAverageResponseTime(history),
      intentProgression,
      objectionCount,
      questionCount,
      engagementScore,
      conversionProbability,
      timeToDecision: Math.floor(timeToDecision / 1000),
      dropOffRisk
    };
  }

  /**
   * ✅ DÉTERMINE LA PHASE ACTUELLE DE LA CONVERSATION
   */
  private determineConversationPhase(
    metrics: ConversationMetrics, 
    intent: PurchaseIntent
  ): ConversationStrategy['currentPhase'] {
    
    // Phase de clôture : intention forte
    if (intent.score >= 70 || intent.recommendation === 'trigger_purchase') {
      return 'closing';
    }

    // Phase de gestion d'objections : objections détectées
    if (metrics.objectionCount > 0 || intent.signals.some(s => s.includes('Blocking'))) {
      return 'objection_handling';
    }

    // Phase de présentation : engagement moyen à fort
    if (metrics.engagementScore >= 60 && intent.score >= 30) {
      return 'solution_presentation';
    }

    // Phase de découverte des besoins : questions posées
    if (metrics.questionCount > 0 && metrics.messageCount >= 2) {
      return 'need_discovery';
    }

    // Phase de rapport : début de conversation
    return 'rapport_building';
  }

  /**
   * ✅ GÉNÈRE DES SUGGESTIONS D'OPTIMISATION INTELLIGENTES
   */
  private generateOptimizationSuggestions(
    metrics: ConversationMetrics,
    intent: PurchaseIntent,
    phase: ConversationStrategy['currentPhase'],
    currentMessage: string
  ): OptimizationSuggestion[] {
    
    const suggestions: OptimizationSuggestion[] = [];

    // ✅ SUGGESTIONS BASÉES SUR L'INTENTION D'ACHAT
    if (intent.score >= 60 && phase !== 'closing') {
      suggestions.push({
        type: 'sales_technique',
        priority: 'critical',
        suggestion: 'Déclencher immédiatement le processus d\'achat',
        expectedImpact: 'Conversion immédiate possible',
        implementation: 'Utiliser assumptive close et proposer la commande directement'
      });
    }

    // ✅ SUGGESTIONS POUR GÉRER L'HÉSITATION
    if (this.detectsHesitation(currentMessage)) {
      suggestions.push({
        type: 'objection_handling',
        priority: 'high',
        suggestion: 'Appliquer la technique Feel-Felt-Found',
        expectedImpact: 'Lever les doutes et rassurer le prospect',
        implementation: 'Valider l\'émotion, partager expérience similaire, prouver bénéfice'
      });
    }

    // ✅ SUGGESTIONS POUR OPTIMISER LE TIMING
    if (metrics.messageCount >= this.salesRules.timingRules.maxMessagesBeforeUrgency) {
      suggestions.push({
        type: 'urgency_creation',
        priority: 'high',
        suggestion: 'Créer un sentiment d\'urgence approprié',
        expectedImpact: 'Accélérer la prise de décision',
        implementation: 'Mentionner stock limité ou offre temporaire'
      });
    }

    // ✅ SUGGESTIONS POUR AMÉLIORER L'ENGAGEMENT
    if (metrics.engagementScore < 50) {
      suggestions.push({
        type: 'response_tone',
        priority: 'medium',
        suggestion: 'Personnaliser davantage la conversation',
        expectedImpact: 'Augmenter l\'engagement et la connexion',
        implementation: 'Utiliser des questions sur la situation personnelle'
      });
    }

    // ✅ SUGGESTIONS POUR PRÉVENIR L'ABANDON
    if (metrics.dropOffRisk === 'high') {
      suggestions.push({
        type: 'urgency_creation',
        priority: 'critical',
        suggestion: 'Appliquer une technique de récupération d\'urgence',
        expectedImpact: 'Prévenir l\'abandon de la conversation',
        implementation: 'Offrir bonus exclusif ou réduction limitée dans le temps'
      });
    }

    return suggestions;
  }

  /**
   * ✅ DÉFINIT LA STRATÉGIE OPTIMALE POUR LA SUITE
   */
  private defineOptimalStrategy(
    phase: ConversationStrategy['currentPhase'],
    intent: PurchaseIntent,
    metrics: ConversationMetrics,
    productName: string,
    recommendations: OptimizationSuggestion[]
  ): ConversationStrategy {
    
    let nextBestAction: string;
    let responseTemplate: string;
    let choicesOptimization: string[];

    switch (phase) {
      case 'closing':
        nextBestAction = 'Proposer la commande avec technique assumptive close';
        responseTemplate = `Parfait ! Je vois que le jeu ${productName} correspond exactement à ce que vous recherchez. Procédons à votre commande maintenant - souhaitez-vous [OPTION1] ou [OPTION2] ?`;
        choicesOptimization = [
          'Je veux l\'acheter maintenant',
          'Voir les options de livraison',
          'Une dernière question avant de commander'
        ];
        break;

      case 'objection_handling':
        nextBestAction = 'Appliquer Feel-Felt-Found pour lever l\'objection';
        responseTemplate = `Je comprends parfaitement votre [PRÉOCCUPATION]. Beaucoup de nos clients ont ressenti la même chose au début. Ce qu\'ils ont découvert, c\'est que [BÉNÉFICE_SPÉCIFIQUE]. Qu\'est-ce qui vous rassurerait le plus ?`;
        choicesOptimization = [
          'Voir les témoignages clients',
          'En savoir plus sur la garantie',
          'Comment ça marche exactement ?',
          'Je veux quand même l\'acheter'
        ];
        break;

      case 'solution_presentation':
        nextBestAction = 'Présenter les bénéfices personnalisés avec preuves sociales';
        responseTemplate = `Excellent ! Le jeu ${productName} est parfait pour votre situation. Nos clients dans des situations similaires nous disent que [BÉNÉFICE_PERSONNALISÉ]. Souhaitez-vous que nous procédions à votre commande ?`;
        choicesOptimization = [
          'Je veux l\'acheter maintenant',
          'Comment y jouer exactement ?',
          'Voir les témoignages',
          'J\'ai encore des questions'
        ];
        break;

      case 'need_discovery':
        nextBestAction = 'Utiliser questionnement SPIN pour identifier les besoins';
        responseTemplate = `Pour vous conseiller au mieux sur le jeu ${productName}, pouvez-vous me parler de [SITUATION_SPÉCIFIQUE] ? Cela m\'aidera à vous expliquer comment ce jeu peut vous aider.`;
        choicesOptimization = [
          'C\'est pour mon couple',
          'C\'est pour ma famille',
          'C\'est pour des amis',
          'Je veux d\'abord en savoir plus'
        ];
        break;

      case 'rapport_building':
      default:
        nextBestAction = 'Construire la confiance avec questions ouvertes';
        responseTemplate = `Parfait ! Je vois que vous vous intéressez au jeu ${productName}. Pour vous accompagner au mieux, qu\'est-ce qui vous a donné envie de découvrir ce jeu ?`;
        choicesOptimization = [
          'Je cherche à améliorer ma relation',
          'Je veux créer plus de complicité',
          'J\'ai entendu parler de vos jeux',
          'Je veux d\'abord en savoir plus'
        ];
        break;
    }

    return {
      currentPhase: phase,
      nextBestAction,
      recommendations,
      responseTemplate,
      choicesOptimization
    };
  }

  /**
   * ✅ MÉTHODES UTILITAIRES DE CALCUL
   */
  
  private extractUserMessages(history: ChatMessage[]): string[] {
    return history
      .filter(msg => msg.type === 'user')
      .map(msg => msg.content as string);
  }

  private countObjections(userMessages: ChatMessage[]): number {
    const objectionWords = ['mais', 'cependant', 'toutefois', 'sauf que', 'problème', 'cher', 'doute'];
    return userMessages.reduce((count, msg) => {
      const content = (msg.content as string).toLowerCase();
      return count + objectionWords.filter(word => content.includes(word)).length;
    }, 0);
  }

  private countQuestions(userMessages: ChatMessage[]): number {
    return userMessages.reduce((count, msg) => {
      const content = msg.content as string;
      return count + (content.includes('?') ? 1 : 0);
    }, 0);
  }

  private calculateEngagementScore(history: ChatMessage[]): number {
    const userMessages = history.filter(msg => msg.type === 'user');
    if (userMessages.length === 0) return 0;

    let score = 0;
    
    // Longueur des messages (plus c'est long, plus c'est engagé)
    const avgLength = userMessages.reduce((sum, msg) => 
      sum + (msg.content as string).length, 0) / userMessages.length;
    score += Math.min(30, avgLength / 2);

    // Fréquence des messages
    score += Math.min(40, userMessages.length * 5);

    // Questions posées (engagement actif)
    const questionCount = this.countQuestions(userMessages);
    score += questionCount * 15;

    // Émotions exprimées
    const emotionWords = ['adore', 'aime', 'intéresse', 'plaît', 'super', 'génial'];
    const emotionCount = userMessages.reduce((count, msg) => {
      const content = (msg.content as string).toLowerCase();
      return count + emotionWords.filter(word => content.includes(word)).length;
    }, 0);
    score += emotionCount * 10;

    return Math.min(100, score);
  }

  private calculateAverageResponseTime(history: ChatMessage[]): number {
    if (history.length < 2) return 0;
    
    const times = [];
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i-1].timestamp).getTime();
      const curr = new Date(history[i].timestamp).getTime();
      times.push(curr - prev);
    }
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private calculateConversionProbability(
    intentProgression: number[],
    engagementScore: number,
    timeToDecision: number,
    objectionCount: number
  ): number {
    
    if (intentProgression.length === 0) return 0;

    // Score d'intention actuel
    const currentIntent = intentProgression[intentProgression.length - 1] || 0;
    let probability = currentIntent;

    // Bonus pour progression positive
    if (intentProgression.length > 1) {
      const trend = intentProgression[intentProgression.length - 1] - intentProgression[0];
      probability += Math.max(0, trend) * 0.5;
    }

    // Facteur d'engagement
    probability += engagementScore * 0.2;

    // Pénalité pour objections
    probability -= objectionCount * 5;

    // Facteur temps (sweet spot autour de 3-7 minutes)
    const timeMinutes = timeToDecision / 60000;
    if (timeMinutes >= 3 && timeMinutes <= 7) {
      probability += 10;
    } else if (timeMinutes > 10) {
      probability -= 5;
    }

    return Math.max(0, Math.min(100, probability));
  }

  private assessDropOffRisk(
    intentProgression: number[],
    timeToDecision: number,
    userMessages: ChatMessage[]
  ): 'low' | 'medium' | 'high' {
    
    // Vérifier les signaux d'abandon
    const lastMessage = userMessages[userMessages.length - 1];
    if (lastMessage) {
      const content = (lastMessage.content as string).toLowerCase();
      if (this.salesRules.optimizationTriggers.dropOffSignals.some(signal => 
        content.includes(signal))) {
        return 'high';
      }
    }

    // Vérifier la tendance d'intention
    if (intentProgression.length >= 2) {
      const recent = intentProgression.slice(-2);
      if (recent[1] < recent[0] - 10) {
        return 'medium';
      }
    }

    // Vérifier le temps passé
    const timeMinutes = timeToDecision / 60000;
    if (timeMinutes > 15) {
      return 'high';
    } else if (timeMinutes > 8) {
      return 'medium';
    }

    return 'low';
  }

  private detectsHesitation(message: string): boolean {
    const hesitationSignals = this.salesRules.optimizationTriggers.hesitationSignals;
    const lowerMessage = message.toLowerCase();
    return hesitationSignals.some(signal => lowerMessage.includes(signal));
  }

  /**
   * ✅ GÉNÈRE DES RECOMMANDATIONS POUR AMÉLIORER LE TAUX DE CONVERSION
   */
  public generateConversionOptimizations(
    sessionMetrics: ConversationMetrics,
    productName: string
  ): {
    immediateActions: string[];
    strategicChanges: string[];
    performanceImpact: string;
  } {
    
    const immediateActions: string[] = [];
    const strategicChanges: string[] = [];

    // Actions immédiates basées sur les métriques
    if (sessionMetrics.conversionProbability > 70) {
      immediateActions.push('Proposer immédiatement l\'achat avec urgence douce');
      immediateActions.push('Utiliser assumptive close');
    }

    if (sessionMetrics.dropOffRisk === 'high') {
      immediateActions.push('Appliquer technique de récupération d\'urgence');
      immediateActions.push('Offrir bonus exclusif temporaire');
    }

    if (sessionMetrics.objectionCount > 2) {
      immediateActions.push('Changer d\'approche - utiliser storytelling');
      immediateActions.push('Présenter preuve sociale forte');
    }

    // Changements stratégiques
    if (sessionMetrics.engagementScore < 50) {
      strategicChanges.push('Améliorer personnalisation des réponses');
      strategicChanges.push('Intégrer plus de questions ouvertes');
    }

    if (sessionMetrics.averageResponseTime > 30000) {
      strategicChanges.push('Optimiser vitesse de réponse IA');
      strategicChanges.push('Simplifier processus de conversation');
    }

    const performanceImpact = `Probabilité de conversion actuelle : ${sessionMetrics.conversionProbability}%. Impact estimé des optimisations : +${Math.round(sessionMetrics.conversionProbability * 0.3)}%`;

    return {
      immediateActions,
      strategicChanges,
      performanceImpact
    };
  }
}