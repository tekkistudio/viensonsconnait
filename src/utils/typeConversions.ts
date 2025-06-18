// src/utils/typeConversions.ts - VERSION CORRIGÉE

import type { OrderData, ChatOrderData, ConversationStep, OrderMetadata } from '@/types/chat';

/**
 * Convertit un OrderData en ChatOrderData en s'assurant que les types sont compatibles
 */
export function toChatOrderData(orderData: Partial<OrderData> | undefined): Partial<ChatOrderData> {
  if (!orderData) return {};

  // Extraction et conversion explicite du formStep et autres propriétés
  const { 
    formStep, 
    items = [], 
    totalAmount,
    subtotal_amount,
    delivery_cost,
    paymentStatus,
    paymentMethod,
    deliveryCost,
    contactInfo,
    currentItem,
    buyingIntent,
    preferences,
    mentionedTopics,
    concerns,
    interests,
    recommendations,
    summary,
    notes,
    chatMetadata,
    ...rest 
  } = orderData;

  // Conversion sécurisée
  return {
    ...rest,
    formStep: formStep as ConversationStep,
    items: items || [],
    totalAmount: totalAmount || rest.total_amount,
    subtotal_amount: subtotal_amount || rest.subtotal,
    delivery_cost: delivery_cost || rest.delivery_fee,
    paymentStatus: paymentStatus || rest.payment_status,
    paymentMethod: paymentMethod || rest.payment_method,
    deliveryCost: deliveryCost || rest.delivery_fee,
    contactInfo: contactInfo || '',
    currentItem,
    buyingIntent: buyingIntent || 0,
    preferences,
    mentionedTopics: mentionedTopics || [],
    concerns: concerns || [],
    interests: interests || [],
    recommendations: recommendations || [],
    summary,
    notes: notes || '',
    chatMetadata: chatMetadata || {}
  };
}

/**
 * ✅ NOUVELLE FONCTION: Conversion sécurisée des steps
 */
export function ensureConversationStep(step: any): ConversationStep {
  // Liste des steps valides (extraite de votre type)
  const validSteps: ConversationStep[] = [
    'initial', 'initial_engagement', 'product_engagement', 'collect_quantity',
    'collect_name', 'collect_phone', 'order_summary', 'payment_method',
    'order_confirmed', 'error_recovery'
    // Ajoutez d'autres selon vos besoins
  ];

  if (typeof step === 'string' && validSteps.includes(step as ConversationStep)) {
    return step as ConversationStep;
  }

  // Valeur par défaut sécurisée
  return 'initial_engagement';
}

/**
 * ✅ NOUVELLE FONCTION: Créer des métadonnées par défaut
 */
export function createDefaultMetadata(sessionId: string, productId?: string): OrderMetadata {
  return {
    source: 'chatbot',
    storeId: process.env.NEXT_PUBLIC_VOSC_STORE_ID || '',
    productId: productId || '',
    conversationId: sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    flags: {}
  };
}

/**
 * ✅ NOUVELLE FONCTION: Validation et nettoyage des données de commande
 */
export function sanitizeOrderData(data: any): Partial<OrderData> {
  return {
    id: data.id,
    session_id: data.session_id || data.sessionId,
    product_id: data.product_id || data.productId,
    product_name: data.product_name || data.productName,
    quantity: typeof data.quantity === 'number' ? data.quantity : 1,
    unit_price: typeof data.unit_price === 'number' ? data.unit_price : data.price,
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
    customer_phone: data.customer_phone || data.phone,
    customer_name: data.customer_name || data.name,
    first_name: data.first_name || data.firstName,
    last_name: data.last_name || data.lastName,
    phone: data.phone,
    email: data.email,
    delivery_address: data.delivery_address || data.address,
    delivery_city: data.delivery_city || data.city,
    delivery_fee: typeof data.delivery_fee === 'number' ? data.delivery_fee : 0,
    total_amount: typeof data.total_amount === 'number' ? data.total_amount : 0,
    status: data.status || 'pending',
    payment_status: data.payment_status || 'pending',
    payment_method: data.payment_method,
    metadata: data.metadata || {},
    formStep: ensureConversationStep(data.formStep),
    items: Array.isArray(data.items) ? data.items : [],
    // Ajout des alias pour compatibilité
    totalAmount: data.totalAmount || data.total_amount,
    deliveryCost: data.deliveryCost || data.delivery_fee,
    contactInfo: data.contactInfo || '',
    city: data.city || data.delivery_city,
    address: data.address || data.delivery_address,
    name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim()
  };
}