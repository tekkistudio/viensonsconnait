// src/lib/services/monitoring.ts

export interface ChatMetrics {
    userId?: string;
    productId: string;
    question: string;
    responseType: string;
    tokensUsed: number;
    cacheHit: boolean;
    responseTime: number;
    costInTokens: number;
  }
  
  export class MonitoringService {
    static async logChatInteraction(metrics: ChatMetrics) {
      try {
        // Pour l'instant, on log uniquement dans la console
        console.log('Chat Metrics:', {
          ...metrics,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error logging chat metrics:', error);
      }
    }
  
    static trackError(error: Error, context?: Record<string, any>) {
      console.error('Error tracked:', error, 'Context:', context);
    }
  }