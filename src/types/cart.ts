// src/types/cart.ts
import type { ConversationStep } from './chat';
import type { OrderData, OrderItem } from './order';

export interface CartOrderData {
  session_id: string;
  items: OrderItem[];
  total_amount: number;
  delivery_cost: number;
  metadata: {
    source: 'chatbot';
    storeId: string;
    productId: string;
    conversationId: string;
    createdAt: string;
    updatedAt: string;
    conversationHistory: any[];
  };
  formStep?: ConversationStep;
}

export interface AbandonedCartMetadata {
  orderData: CartOrderData;
  lastUpdate: string;
}

// Étendre l'interface existante pour inclure la nouvelle structure
export interface ExtendedAbandonedCart {
  id: string;
  product_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  city: string;
  address: string;
  cart_stage: ConversationStep;
  last_active_at: string;
  converted_to_order: boolean;
  metadata: AbandonedCartMetadata;
}