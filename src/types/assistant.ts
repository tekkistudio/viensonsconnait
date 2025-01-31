// src/features/product/types/assistant.ts
export interface PageContext {
    page: string;
    data?: {
      dailySales?: number;
      salesCount?: number;
      activeConversations?: number;
      recentOrders?: any[];
      orderStatuses?: { [key: string]: number };
      totalProducts?: number;
      lowStockAlert?: number;
      [key: string]: any;
    };
  }
  
  export interface Message {
    id: number;
    content: string;
    type: 'assistant' | 'user';
    timestamp: Date;
    context?: PageContext;
  }
  
  export interface ChatMessage {
    content: string;
    type: 'assistant' | 'user';
    context?: PageContext;
    created_at?: string;
  }
  
  export interface AIResponse {
    content: string;
    type: 'assistant' | 'user';
    suggestions?: string[];
    actions?: string[];
    insights?: string[];
  }