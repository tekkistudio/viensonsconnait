// src/lib/services/ConversationAnalytics.ts - SYSTÈME D'ANALYTICS AVANCÉ

import { supabase } from '@/lib/supabase';
import type { ConversationStep } from '@/types/chat';

// ✅ INTERFACES POUR LES ANALYTICS
interface ConversationEvent {
  id?: string;
  session_id: string;
  product_id: string;
  event_type: 'message_sent' | 'choice_selected' | 'choices_displayed' | 'purchase_intent' | 'conversion' | 'abandonment';
  event_data: Record<string, any>;
  timestamp: number;
  user_agent?: string;
  ip_address?: string;
}

interface ConversationMetrics {
  sessionId: string;
  productId: string;
  startTime: number;
  endTime?: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  choicesDisplayed: number;
  choicesSelected: number;
  averageResponseTime: number;
  maxPurchaseIntentScore: number;
  finalStep: ConversationStep;
  conversionAchieved: boolean;
  abandonmentReason?: string;
}

interface ChoiceAnalytics {
  choice: string;
  choiceType: string;
  timeToClick: number;
  position: number;
  selected: boolean;
  purchaseIntentScore?: number;
}

interface PerformanceMetrics {
  averageSessionDuration: number;
  conversionRate: number;
  abandonmentRate: number;
  averageMessagesPerConversion: number;
  topPerformingChoices: Array<{
    choice: string;
    clickRate: number;
    conversionRate: number;
  }>;
  commonAbandonmentSteps: Array<{
    step: ConversationStep;
    abandonmentRate: number;
  }>;
}

export class ConversationAnalytics {
  private static instance: ConversationAnalytics;
  private eventQueue: ConversationEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private sessionMetrics: Map<string, ConversationMetrics> = new Map();
  private readonly FLUSH_INTERVAL = 5000; // 5 secondes
  private readonly MAX_QUEUE_SIZE = 50;

  private constructor() {
    this.initializeFlushInterval();
    console.log('📊 ConversationAnalytics initialized');
  }

  public static getInstance(): ConversationAnalytics {
    if (!this.instance) {
      this.instance = new ConversationAnalytics();
    }
    return this.instance;
  }

  // ✅ INITIALISATION ET GESTION DES SESSIONS

  public initializeSession(sessionId: string, productId: string): void {
    const metrics: ConversationMetrics = {
      sessionId,
      productId,
      startTime: Date.now(),
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      choicesDisplayed: 0,
      choicesSelected: 0,
      averageResponseTime: 0,
      maxPurchaseIntentScore: 0,
      finalStep: 'initial',
      conversionAchieved: false
    };

    this.sessionMetrics.set(sessionId, metrics);
    
    // Événement d'initialisation
    this.trackEvent({
      session_id: sessionId,
      product_id: productId,
      event_type: 'message_sent',
      event_data: {
        type: 'session_start',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    console.log('📊 Session analytics initialized:', sessionId.substring(0, 8));
  }

  // ✅ TRACKING DES ÉVÉNEMENTS PRINCIPAUX

  public trackMessageSent(data: {
    sessionId: string;
    productId: string;
    messageType: 'user' | 'assistant';
    messageContent: string;
    messageLength: number;
    responseTime?: number;
    step?: ConversationStep;
  }): void {
    const metrics = this.sessionMetrics.get(data.sessionId);
    if (metrics) {
      metrics.totalMessages++;
      if (data.messageType === 'user') {
        metrics.userMessages++;
      } else {
        metrics.assistantMessages++;
      }
      
      if (data.responseTime) {
        metrics.averageResponseTime = (metrics.averageResponseTime + data.responseTime) / 2;
      }
      
      if (data.step) {
        metrics.finalStep = data.step;
      }
    }

    this.trackEvent({
      session_id: data.sessionId,
      product_id: data.productId,
      event_type: 'message_sent',
      event_data: {
        messageType: data.messageType,
        messageLength: data.messageLength,
        responseTime: data.responseTime,
        step: data.step,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  }

  public trackChoicesDisplayed(data: {
    sessionId: string;
    productId: string;
    choices: string[];
    choicesMetadata: any[];
    timestamp: number;
  }): void {
    const metrics = this.sessionMetrics.get(data.sessionId);
    if (metrics) {
      metrics.choicesDisplayed += data.choices.length;
    }

    this.trackEvent({
      session_id: data.sessionId,
      product_id: data.productId,
      event_type: 'choices_displayed',
      event_data: {
        choices: data.choices,
        choicesCount: data.choices.length,
        choicesMetadata: data.choicesMetadata,
        displayTime: data.timestamp
      },
      timestamp: data.timestamp
    });
  }

  public trackChoiceSelected(data: {
    sessionId: string;
    productId: string;
    choice: string;
    choiceMetadata: any;
    purchaseIntent?: any;
    timeToClick: number;
    timestamp: number;
  }): void {
    const metrics = this.sessionMetrics.get(data.sessionId);
    if (metrics) {
      metrics.choicesSelected++;
      
      if (data.purchaseIntent && data.purchaseIntent.score > metrics.maxPurchaseIntentScore) {
        metrics.maxPurchaseIntentScore = data.purchaseIntent.score;
      }
    }

    this.trackEvent({
      session_id: data.sessionId,
      product_id: data.productId,
      event_type: 'choice_selected',
      event_data: {
        choice: data.choice,
        choiceMetadata: data.choiceMetadata,
        purchaseIntent: data.purchaseIntent,
        timeToClick: data.timeToClick,
        clickTime: data.timestamp
      },
      timestamp: data.timestamp
    });

    // Détecter la conversion
    if (data.choice.includes('acheter maintenant') || data.choice.includes('commander')) {
      this.trackConversion(data.sessionId, data.productId, {
        trigger: 'choice_selection',
        choice: data.choice,
        purchaseIntentScore: data.purchaseIntent?.score
      });
    }
  }

  public trackPurchaseIntent(data: {
    sessionId: string;
    productId: string;
    userMessage: string;
    intentAnalysis: any;
    timestamp: number;
  }): void {
    const metrics = this.sessionMetrics.get(data.sessionId);
    if (metrics && data.intentAnalysis.score > metrics.maxPurchaseIntentScore) {
      metrics.maxPurchaseIntentScore = data.intentAnalysis.score;
    }

    this.trackEvent({
      session_id: data.sessionId,
      product_id: data.productId,
      event_type: 'purchase_intent',
      event_data: {
        userMessage: data.userMessage.substring(0, 100), // Limiter la taille
        intentScore: data.intentAnalysis.score,
        intentConfidence: data.intentAnalysis.confidence,
        intentSignals: data.intentAnalysis.signals,
        recommendation: data.intentAnalysis.recommendation
      },
      timestamp: data.timestamp
    });
  }

  public trackConversion(sessionId: string, productId: string, conversionData: any): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (metrics) {
      metrics.conversionAchieved = true;
      metrics.endTime = Date.now();
    }

    this.trackEvent({
      session_id: sessionId,
      product_id: productId,
      event_type: 'conversion',
      event_data: {
        ...conversionData,
        sessionDuration: metrics ? Date.now() - metrics.startTime : 0,
        totalMessages: metrics?.totalMessages || 0,
        maxIntentScore: metrics?.maxPurchaseIntentScore || 0
      },
      timestamp: Date.now()
    });

    console.log('🎉 Conversion tracked for session:', sessionId.substring(0, 8));
  }

  public trackAbandonment(sessionId: string, productId: string, reason: string, step: ConversationStep): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.abandonmentReason = reason;
    }

    this.trackEvent({
      session_id: sessionId,
      product_id: productId,
      event_type: 'abandonment',
      event_data: {
        reason,
        step,
        sessionDuration: metrics ? Date.now() - metrics.startTime : 0,
        totalMessages: metrics?.totalMessages || 0,
        maxIntentScore: metrics?.maxPurchaseIntentScore || 0,
        lastActivity: Date.now()
      },
      timestamp: Date.now()
    });

    console.log('📤 Abandonment tracked:', { sessionId: sessionId.substring(0, 8), reason, step });
  }

  // ✅ GESTION DES ÉVÉNEMENTS

  private trackEvent(event: ConversationEvent): void {
    // Ajouter métadonnées du navigateur si disponible
    if (typeof window !== 'undefined') {
      event.user_agent = navigator.userAgent;
    }

    this.eventQueue.push(event);

    // Flush immédiat si la queue est pleine
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushEvents();
    }
  }

  private initializeFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Enregistrer en base de données
      const { error } = await supabase
        .from('conversation_events')
        .insert(eventsToFlush.map(event => ({
          session_id: event.session_id,
          product_id: event.product_id,
          event_type: event.event_type,
          event_data: event.event_data,
          timestamp: new Date(event.timestamp).toISOString(),
          user_agent: event.user_agent,
          ip_address: event.ip_address
        })));

      if (error) {
        console.error('❌ Failed to flush analytics events:', error);
        // Remettre les événements dans la queue en cas d'erreur
        this.eventQueue.unshift(...eventsToFlush);
      } else {
        console.log(`📊 Flushed ${eventsToFlush.length} analytics events`);
      }
    } catch (error) {
      console.error('❌ Analytics flush error:', error);
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  // ✅ MÉTRIQUES ET ANALYSES

  public async getSessionMetrics(sessionId: string): Promise<ConversationMetrics | null> {
    // Retourner les métriques en mémoire si disponibles
    const memoryMetrics = this.sessionMetrics.get(sessionId);
    if (memoryMetrics) {
      return memoryMetrics;
    }

    // Sinon, recalculer depuis la base de données
    try {
      const { data: events, error } = await supabase
        .from('conversation_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error || !events) {
        console.error('❌ Failed to fetch session events:', error);
        return null;
      }

      return this.calculateMetricsFromEvents(events, sessionId);
    } catch (error) {
      console.error('❌ Error calculating session metrics:', error);
      return null;
    }
  }

  private calculateMetricsFromEvents(events: any[], sessionId: string): ConversationMetrics {
    const metrics: ConversationMetrics = {
      sessionId,
      productId: events[0]?.product_id || 'unknown',
      startTime: new Date(events[0]?.timestamp).getTime(),
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      choicesDisplayed: 0,
      choicesSelected: 0,
      averageResponseTime: 0,
      maxPurchaseIntentScore: 0,
      finalStep: 'initial',
      conversionAchieved: false
    };

    let responseTimes: number[] = [];
    let intentScores: number[] = [];

    events.forEach(event => {
      switch (event.event_type) {
        case 'message_sent':
          metrics.totalMessages++;
          if (event.event_data.messageType === 'user') {
            metrics.userMessages++;
          } else {
            metrics.assistantMessages++;
          }
          if (event.event_data.responseTime) {
            responseTimes.push(event.event_data.responseTime);
          }
          if (event.event_data.step) {
            metrics.finalStep = event.event_data.step;
          }
          break;

        case 'choices_displayed':
          metrics.choicesDisplayed += event.event_data.choicesCount || 0;
          break;

        case 'choice_selected':
          metrics.choicesSelected++;
          break;

        case 'purchase_intent':
          if (event.event_data.intentScore) {
            intentScores.push(event.event_data.intentScore);
          }
          break;

        case 'conversion':
          metrics.conversionAchieved = true;
          metrics.endTime = new Date(event.timestamp).getTime();
          break;

        case 'abandonment':
          metrics.endTime = new Date(event.timestamp).getTime();
          metrics.abandonmentReason = event.event_data.reason;
          break;
      }
    });

    // Calculer les moyennes
    if (responseTimes.length > 0) {
      metrics.averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    }

    if (intentScores.length > 0) {
      metrics.maxPurchaseIntentScore = Math.max(...intentScores);
    }

    return metrics;
  }

  public async getPerformanceMetrics(
    productId?: string,
    timeframe: { start: Date; end: Date } = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
      end: new Date()
    }
  ): Promise<PerformanceMetrics> {
    try {
      let query = supabase
        .from('conversation_events')
        .select('*')
        .gte('timestamp', timeframe.start.toISOString())
        .lte('timestamp', timeframe.end.toISOString());

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data: events, error } = await query;

      if (error || !events) {
        console.error('❌ Failed to fetch performance data:', error);
        return this.getDefaultPerformanceMetrics();
      }

      return this.calculatePerformanceMetrics(events);
    } catch (error) {
      console.error('❌ Error calculating performance metrics:', error);
      return this.getDefaultPerformanceMetrics();
    }
  }

  private calculatePerformanceMetrics(events: any[]): PerformanceMetrics {
    const sessionGroups = new Map<string, any[]>();
    
    // Grouper les événements par session
    events.forEach(event => {
      const sessionId = event.session_id;
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, []);
      }
      sessionGroups.get(sessionId)!.push(event);
    });

    let totalDuration = 0;
    let conversions = 0;
    let abandonments = 0;
    const choiceStats = new Map<string, { total: number; conversions: number }>();
    const stepAbandonments = new Map<string, number>();
    let totalSessionsWithMessages = 0;
    let totalMessages = 0;

    sessionGroups.forEach((sessionEvents, sessionId) => {
      const sortedEvents = sessionEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const startTime = new Date(sortedEvents[0].timestamp).getTime();
      const endTime = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
      const duration = endTime - startTime;

      if (duration > 0) {
        totalDuration += duration;
      }

      let sessionConverted = false;
      let sessionMessages = 0;

      sortedEvents.forEach(event => {
        if (event.event_type === 'message_sent') {
          sessionMessages++;
        }
        
        if (event.event_type === 'choice_selected') {
          const choice = event.event_data.choice;
          if (!choiceStats.has(choice)) {
            choiceStats.set(choice, { total: 0, conversions: 0 });
          }
          choiceStats.get(choice)!.total++;
        }
        
        if (event.event_type === 'conversion') {
          sessionConverted = true;
          conversions++;
          
          // Marquer tous les choix de cette session comme ayant mené à une conversion
          sortedEvents.forEach(e => {
            if (e.event_type === 'choice_selected') {
              const choice = e.event_data.choice;
              if (choiceStats.has(choice)) {
                choiceStats.get(choice)!.conversions++;
              }
            }
          });
        }
        
        if (event.event_type === 'abandonment') {
          abandonments++;
          const step = event.event_data.step;
          stepAbandonments.set(step, (stepAbandonments.get(step) || 0) + 1);
        }
      });

      if (sessionMessages > 0) {
        totalSessionsWithMessages++;
        totalMessages += sessionMessages;
      }
    });

    const totalSessions = sessionGroups.size;
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;
    const abandonmentRate = totalSessions > 0 ? (abandonments / totalSessions) * 100 : 0;
    const averageMessagesPerConversion = conversions > 0 ? totalMessages / conversions : 0;

    // Calculer les meilleurs choix
    const topPerformingChoices = Array.from(choiceStats.entries())
      .map(([choice, stats]) => ({
        choice,
        clickRate: (stats.total / totalSessions) * 100,
        conversionRate: stats.total > 0 ? (stats.conversions / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);

    // Calculer les étapes d'abandon les plus communes
    const commonAbandonmentSteps = Array.from(stepAbandonments.entries())
      .map(([step, count]) => ({
        step: step as ConversationStep,
        abandonmentRate: (count / totalSessions) * 100
      }))
      .sort((a, b) => b.abandonmentRate - a.abandonmentRate)
      .slice(0, 5);

    return {
      averageSessionDuration,
      conversionRate,
      abandonmentRate,
      averageMessagesPerConversion,
      topPerformingChoices,
      commonAbandonmentSteps
    };
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      averageSessionDuration: 0,
      conversionRate: 0,
      abandonmentRate: 0,
      averageMessagesPerConversion: 0,
      topPerformingChoices: [],
      commonAbandonmentSteps: []
    };
  }

  // ✅ MÉTHODES DE NETTOYAGE

  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush final des événements en attente
    this.flushEvents();
    
    // Nettoyer les métriques en mémoire (garder seulement les 10 dernières sessions)
    if (this.sessionMetrics.size > 10) {
      const entries = Array.from(this.sessionMetrics.entries());
      const toKeep = entries.slice(-10);
      this.sessionMetrics.clear();
      toKeep.forEach(([key, value]) => this.sessionMetrics.set(key, value));
    }
  }

  // ✅ UTILITAIRES D'EXPORT

  public async exportSessionData(sessionId: string): Promise<any> {
    try {
      const { data: events, error } = await supabase
        .from('conversation_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Failed to export session data:', error);
        return null;
      }

      const metrics = this.calculateMetricsFromEvents(events || [], sessionId);

      return {
        sessionId,
        metrics,
        events,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error exporting session data:', error);
      return null;
    }
  }

  // ✅ DÉTECTION AUTOMATIQUE D'ABANDON

  public startAbandonmentDetection(sessionId: string): void {
    const ABANDON_TIMEOUT = 5 * 60 * 1000; // 5 minutes d'inactivité

    setTimeout(() => {
      const metrics = this.sessionMetrics.get(sessionId);
      if (metrics && !metrics.conversionAchieved && !metrics.endTime) {
        this.trackAbandonment(
          sessionId, 
          metrics.productId, 
          'timeout_inactivity', 
          metrics.finalStep
        );
      }
    }, ABANDON_TIMEOUT);
  }
}