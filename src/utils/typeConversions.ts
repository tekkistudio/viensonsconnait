// src/utils/typeConversions.ts

import type { OrderData, ChatOrderData, ConversationStep, OrderMetadata } from '@/types/chat';

/**
 * Convertit un OrderData en ChatOrderData en s'assurant que les types sont compatibles
 */
export function toChatOrderData(orderData: Partial<OrderData> | undefined): Partial<ChatOrderData> {
  if (!orderData) return {};
  
  // Extraction et conversion explicite du formStep
  const { formStep, ...rest } = orderData;
  
  // Conversion sécurisée
  return {
    ...rest,
    formStep: formStep as ConversationStep
  };
}

/**
 * S'assure que les metadata sont valides et complètes
 */
export function ensureValidMetadata(metadata: Partial<OrderMetadata> = {}): OrderMetadata {
  const timestamp = new Date().toISOString();
  
  return {
    source: metadata?.source || 'chatbot',
    storeId: metadata?.storeId || '',
    productId: metadata?.productId || '',
    conversationId: metadata?.conversationId || '',
    createdAt: metadata?.createdAt || timestamp,
    updatedAt: timestamp,
    conversationHistory: metadata?.conversationHistory || [],
    // Préserver les autres champs
    ...metadata,
    // Garantir que flags existe
    flags: {
      ...(metadata?.flags || {})
    }
  };
}

/**
 * Combine les flags de metadata
 */
export function combineFlags(existingFlags = {}, newFlags = {}): Record<string, any> {
  return {
    ...existingFlags,
    ...newFlags
  };
}

/**
 * Génère un ID unique pour les messages ou autres objets
 */
export function generateUniqueId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}