// src/types/chatbot.ts
export type ChatbotIntent = 'purchase' | 'information' | 'support';
export type BuyingIntentLevel = 'high' | 'medium' | 'low';
export type ChatbotStatus = 'active' | 'completed' | 'abandoned';

export interface ChatbotMetrics {
  totalConversations: number;
  avgBuyingIntent: number;
  conversionRate: number;
  topQuestions: {
    question: string;
    frequency: number;
  }[];
  productInterest: {
    productId: string;
    productName: string;
    interestCount: number;
  }[];
}

export interface ChatbotConversation {
  id: string;
  status: ChatbotStatus;
  intent: ChatbotIntent;
  buyingIntent: number;
  messages: ChatbotMessage[];
  metadata: {
    customerName?: string;
    location?: string;
    device?: string;
    language?: string;
    viewedProducts?: string[];
  };
  analytics: {
    completionRate: number;
    satisfaction: number;
    durationInSeconds: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ChatbotMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    productReference?: string;
  };
}