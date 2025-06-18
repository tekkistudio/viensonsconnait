// src/utils/legacyMigration.ts - UTILITAIRES DE MIGRATION

import type { ChatOrderData, OrderData, ConversationStep } from '@/types/chat';

/**
 * Migre les données de l'ancien système vers le nouveau
 */
export function migrateLegacyOrderData(legacyData: any): ChatOrderData {
  return {
    // Données de base
    id: legacyData.id,
    session_id: legacyData.session_id || legacyData.sessionId,
    
    // Informations produit
    product_id: legacyData.product_id || legacyData.productId,
    product_name: legacyData.product_name || legacyData.productName,
    quantity: legacyData.quantity || 1,
    unit_price: legacyData.unit_price || legacyData.price,
    subtotal: legacyData.subtotal || legacyData.subtotal_amount,
    
    // Informations client
    customer_phone: legacyData.customer_phone || legacyData.phone,
    customer_name: legacyData.customer_name || legacyData.name,
    first_name: legacyData.first_name || legacyData.firstName,
    last_name: legacyData.last_name || legacyData.lastName,
    phone: legacyData.phone,
    email: legacyData.email,
    
    // Livraison
    delivery_address: legacyData.delivery_address || legacyData.address,
    delivery_city: legacyData.delivery_city || legacyData.city,
    delivery_fee: legacyData.delivery_fee || legacyData.deliveryCost,
    
    // Montants
    total_amount: legacyData.total_amount || legacyData.totalAmount,
    
    // Statuts
    status: legacyData.status || 'pending',
    payment_status: legacyData.payment_status || legacyData.paymentStatus,
    payment_method: legacyData.payment_method || legacyData.paymentMethod,
    
    // Propriétés étendues de l'ancien système
    formStep: ensureLegacyStep(legacyData.formStep),
    items: legacyData.items || [],
    totalAmount: legacyData.totalAmount || legacyData.total_amount,
    deliveryCost: legacyData.deliveryCost || legacyData.delivery_fee,
    contactInfo: legacyData.contactInfo || '',
    currentItem: legacyData.currentItem,
    buyingIntent: legacyData.buyingIntent || 0,
    preferences: legacyData.preferences,
    mentionedTopics: legacyData.mentionedTopics || [],
    concerns: legacyData.concerns || [],
    interests: legacyData.interests || [],
    recommendations: legacyData.recommendations || [],
    summary: legacyData.summary,
    notes: legacyData.notes || '',
    chatMetadata: legacyData.chatMetadata || {},
    
    // Métadonnées
    metadata: legacyData.metadata || {},
    created_at: legacyData.created_at,
    updated_at: legacyData.updated_at
  };
}

/**
 * Assure qu'un step legacy est compatible
 */
function ensureLegacyStep(step: any): ConversationStep {
  if (!step || typeof step !== 'string') {
    return 'initial_engagement';
  }

  // Mapping des anciens steps vers les nouveaux
  const stepMapping: Record<string, ConversationStep> = {
    'start': 'initial_engagement',
    'product_info': 'product_engagement',
    'quantity': 'collect_quantity',
    'customer_info': 'collect_name',
    'contact': 'collect_phone',
    'summary': 'order_summary',
    'payment': 'payment_method',
    'complete': 'order_confirmed',
    'error': 'error_recovery'
  };

  return stepMapping[step] || (step as ConversationStep) || 'initial_engagement';
}

/**
 * Vérifie si des données sont du format legacy
 */
export function isLegacyOrderData(data: any): boolean {
  return data && (
    data.hasOwnProperty('formStep') ||
    data.hasOwnProperty('totalAmount') ||
    data.hasOwnProperty('deliveryCost') ||
    data.hasOwnProperty('contactInfo')
  );
}

/**
 * Nettoie les propriétés undefined/null
 */
export function cleanOrderData(data: Partial<ChatOrderData>): Partial<ChatOrderData> {
  const cleaned: Partial<ChatOrderData> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      (cleaned as any)[key] = value;
    }
  });
  
  return cleaned;
}