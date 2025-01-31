// types/conversations.ts

export type ConversationStatus = 'active' | 'pending' | 'closed';
export type ConversationIntent = 'purchase' | 'support' | 'information';

export interface ConversationMetadata {
  device?: string;
  language?: string;
  viewed_products?: string[];
  customer_name?: string;
  intent?: ConversationIntent;
  has_order?: boolean;
  location?: string;
}

export interface Conversation {
  id: string;
  client_id: string | null;
  status: ConversationStatus;
  last_message: string | null;
  last_message_date: string | null;
  metadata: ConversationMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'customer' | 'assistant' | 'admin';
  created_at: string;
  metadata?: {
    intent?: string;
    sentiment?: number;
    product_id?: string;
  } | null;
}

export interface ConversationStats {
  total: number;
  active: number;
  pending: number;
  readyToOrder: number;
  aiPerformance: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}