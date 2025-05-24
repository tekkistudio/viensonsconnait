// src/types/order.ts

import { z } from 'zod';

import type { ChatMessage, ConversationStep, MessageFlags } from '@/types/chat';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'CASH';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'success';
export type DeliveryStatus = 'pending' | 'processing' | 'shipped' | 'delivered';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'processing' | 'paid' | 'cancelled' | 'delivered' | 'failed';
export type PaymentMethod = 'wave' | 'orange_money' | 'card' | 'cash_on_delivery';

export interface OrderMetadata {
  source: string;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChatMessage[];
  buyingIntentScore?: number;
  currency?: string;
  country?: string;
  userAgent?: string;
  storeId: string;
  productId: string;
  conversationId: string;
  paymentId?: string;
  paymentProvider?: PaymentProvider;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  trackingNumber?: string;
  formStep?: ConversationStep;
  flags?: MessageFlags;
  hasEmail?: boolean;
  [key: string]: any;
}

export interface CustomerInfo {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  discountApplied?: number;
  image?: string | null;
}

export interface OrderFormValues {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  payment_method: PaymentMethod;
  delivery_cost: number;
  items: OrderItem[];
  notes?: string;
}

export interface OrderData {
  id?: string;
  session_id: string;
  items: OrderItem[];
  first_name: string;
  last_name: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  payment_method?: PaymentProvider;
  order_details: string;
  notes?: string;
  status: OrderStatus;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  total_amount: number;
  delivery_cost: number;
  metadata: OrderMetadata & {
    notes?: string;
  };
  // Champs optionnels pour le chat
  currentItem?: OrderItem;
  formStep?: string;
  quantity?: number;
  buyingIntent?: number;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
}

export const orderItemSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  quantity: z.number().min(1),
  price: z.number(),
  image: z.string().nullable().optional(),
  total_price: z.number().optional()
});

export const orderFormSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string(),
  email: z.string().email().optional(),
  city: z.string(),
  address: z.string(),
  payment_method: z.enum(['wave', 'orange_money', 'card', 'cash_on_delivery']),
  delivery_cost: z.number(),
  items: z.array(orderItemSchema),
  notes: z.string().optional()
});


export interface ExtendedOrderMetadata extends OrderMetadata {
  customerInfo?: {
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string;
  };
  shippingInfo?: {
    city?: string;
    address?: string;
    deliveryCost?: number;
  };
  orderInfo?: {
    quantity?: number;
    totalPrice?: number;
  };
  currentStep?: ConversationStep;
  nextStep?: ConversationStep;
}

export interface AbandonedCartMetadata {
  orderData: Partial<OrderData>;
  lastUpdate: string;
  source: string;
  storeId: string;
  productId: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChatMessage[];
  
  // Ajouter cette propriété
  progressHistory?: Array<{
    step: string;
    timestamp: string;
  }>;
}

export interface BaseOrderData {
  id?: string;
  session_id: string;
  items: OrderItem[];
  first_name: string;
  last_name: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  payment_method?: PaymentProvider;
  order_details: string;
  total_amount: number;
  delivery_cost: number;
  metadata: ExtendedOrderMetadata;
  subtotal: number;
}

export interface OrderData extends BaseOrderData {
  status: OrderStatus;
  subtotal: number;
  currentItem?: OrderItem;
  quantity?: number;
  buyingIntent?: number;
  conversationContext?: string;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
}

// Interface pour la vue des commandes
export interface OrderView {
  // Données de base de la commande
  readonly order: OrderData;
  
  // Propriétés calculées/dérivées
  readonly customer: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email?: string;
    readonly phone: string;
    readonly address: string;
    readonly city: string;
    readonly postalCode?: string;
  };
  
  readonly subtotal: number;
  readonly deliveryStatus: DeliveryStatus;
  readonly paymentStatus: PaymentStatus;
  readonly paymentMethod: PaymentProvider | undefined;
  readonly totalAmount: number;
  readonly deliveryCost: number;
}

// Fonction utilitaire pour créer une vue de commande
export function createOrderView(order: OrderData): OrderView {
  return {
    order,
    customer: {
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      postalCode: order.metadata?.postalCode
    },
    subtotal: order.total_amount - order.delivery_cost,
    deliveryStatus: order.metadata?.deliveryStatus || 'pending',
    paymentStatus: order.metadata?.paymentStatus || 'pending',
    paymentMethod: order.payment_method,
    totalAmount: order.total_amount,
    deliveryCost: order.delivery_cost
  };
}

// Update OrderData interface to use ExtendedOrderMetadata
export interface OrderData extends BaseOrderData {
  status: OrderStatus;
  currentItem?: OrderItem;
  quantity?: number;
  buyingIntent?: number;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
}

// Add AbandonedCart interface
export interface AbandonedCart {
  id: string;
  product_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  city: string;
  address: string;
  cart_stage: string;
  last_active_at: string;
  converted_to_order: boolean;
  metadata: AbandonedCartMetadata;
}

export interface OrderSummary {
  id: string;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderFilters {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  city?: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  revenue: number;
  averageOrderValue: number;
}

// Type pour les mises à jour partielles de commande
export type PartialOrderUpdate = Partial<Omit<OrderData, 'metadata'>> & {
  metadata?: Partial<OrderMetadata>;
};

// Types pour les paiements
export interface BictorysPaymentRequest {
  amount: number;
  currency: 'XOF';
  provider: Extract<PaymentProvider, 'WAVE' | 'ORANGE_MONEY'>;
  phoneNumber: string;
  orderId: string;
  metadata?: Record<string, any>;
}

export interface BictorysPaymentResponse {
  status: 'pending' | 'success' | 'failed';
  transactionId: string;
  message: string;
}

export interface PaymentData {
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  clientSecret?: string;
  error?: string;
}

export interface PaymentState {
  selectedMethod: PaymentProvider | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  error: string | null;
  clientSecret: string | null;  
}

export interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentProvider;
}

export interface PaymentTotal {
  value: number;
  formatted: string;
  originalInFCFA: number;
}

export interface ProductRecommendation {
  productId: string;
  name: string;
  reason: string;
  recommendationType: 'product' | 'mobile-app' | string;
  category: string;
  priority: number;
  relevanceScore?: number;
  price?: number;
  priceAdvantage?: string;
  testimonial?: string;
  imageUrl?: string;
  productUrl?: string;
  profileMatch?: number;
}

export interface RecommendationContext {
  currentProductId: string;
  buyingIntent: number;
  userPreferences?: {
    categories?: string[];
    priceRange?: [number, number];
    relationshipType?: string;
    groupSize?: number;
  };
  conversationContext?: {
    mentionedTopics: string[];
    concerns: string[];
    interests: string[];
  };
  orderHistory?: {
    productIds: string[];
    totalSpent: number;
    lastPurchaseDate?: string;
  };
}