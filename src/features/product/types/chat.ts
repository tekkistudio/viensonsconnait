// src/features/product/types/chat.ts

/**
 * Types pour les paiements et la monnaie
 */
export interface PaymentTotal {
  value: number;
  formatted: string;
  originalInFCFA: number;
}

/**
 * Types utilitaire pour les mises à jour Prisma
 */
export interface PrismaOrderUpdateInput {
  where: { 
    id: string;
  };
  data: {
    status?: OrderStatus;
    metadata?: OrderMetadata;
    [key: string]: any;
  };
}

/**
 * Types pour la gestion des produits dans la commande
 */
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

/**
 * Types pour la conversation
 */
export type MessageType = 
  | 'assistant' 
  | 'user' 
  | 'user-choices' 
  | 'wave-button' 
  | 'om-button' 
  | 'cod-button';

export type ConversationStep = 
  | '' 
  | 'initial'
  | 'description'
  | 'pricing'
  | 'product-selection'
  | 'contact-info' 
  | 'city' 
  | 'address' 
  | 'phone' 
  | 'payment'
  | 'completed'
  | 'upsell';

export interface CustomerMessage {
  content: string;
  type: MessageType;
  timestamp?: string;
}

export interface ChatMessage {
  type: MessageType;
  content?: string;
  choices?: string[];
  timestamp?: string;
  paymentUrl?: string;
  total?: PaymentTotal;
  assistant?: {
    name: string;
    title: string;
    avatar?: string;
  };
  metadata?: {
    intent?: number;
    recommendations?: string[];
    error?: string;
    productContext?: string;
    upsellProduct?: string;
  };
}

/**
 * Types pour les commandes
 */
export interface OrderData {
  orderId?: string; 
  items: OrderItem[];
  currentItem?: OrderItem;
  contactInfo: string;
  firstName: string;
  lastName: string;
  city: string;
  address: string;
  phone: string;
  paymentMethod: string;
  orderDetails: string;
  status?: OrderStatus;
  totalAmount?: number;
  deliveryCost?: number;
  metadata?: OrderMetadata;
}

export interface OrderCreateInput extends Omit<OrderData, 'orderId'> {
  status: OrderStatus;
  metadata: OrderMetadata;
}

export type OrderStatus = 
  | 'pending' 
  | 'paid' 
  | 'processing' 
  | 'delivered' 
  | 'cancelled'
  | 'created'  
  | 'confirmed';  

  export interface OrderMetadata {
    source: string;
    createdAt: Date;
    updatedAt: Date;
    userAgent?: string;
    language?: string;
    deviceType?: string;
    country?: string;
    currency?: string;
    conversationHistory?: ChatMessage[];
    buyingIntentScore?: number;
    referrer?: string;
    lastProductViewed?: string;
    recommendedProducts?: string[];
    paymentId?: string;       
    paymentStatus?: string;   
    paymentProvider?: string; 
    transactionId?: string;   
    trackingNumber?: string;  
    [key: string]: any;       
  }

/**
 * Types pour les méthodes de paiement
 */
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  buttonComponent: 'wave-button' | 'om-button' | 'cod-button';
  enabled: boolean;
  supportedCountries: string[];
  minimumAmount?: number;
  maximumAmount?: number;
  fees?: {
    percentage: number;
    fixed: number;
  };
}

/**
 * Types pour l'état du chat
 */
export interface ChatState {
  messages: ChatMessage[];
  orderData: OrderData;
  formStep: ConversationStep;
  isTyping: boolean;
  showCheckout: boolean;
  currentProductContext?: string;
  error?: string;
  paymentModal: {
    isOpen: boolean;
    iframeUrl: string;
  };
}

/**
 * Types pour les actions du chat
 */
export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'UPDATE_ORDER_DATA'; payload: Partial<OrderData> }
  | { type: 'ADD_PRODUCT_TO_ORDER'; payload: OrderItem }
  | { type: 'REMOVE_PRODUCT_FROM_ORDER'; payload: string }
  | { type: 'UPDATE_PRODUCT_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_FORM_STEP'; payload: ConversationStep }
  | { type: 'SET_SHOW_CHECKOUT'; payload: boolean }
  | { type: 'SET_CURRENT_PRODUCT_CONTEXT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_PAYMENT_MODAL'; payload: { isOpen: boolean; iframeUrl: string } };

/**
 * Types pour les réponses de l'API
 */
export interface AIResponse {
  content: string;
  type: MessageType;
  choices?: string[];
  buyingIntent?: number;
  recommendations?: string[];
  nextStep?: ConversationStep;
  error?: string;
  paymentUrl?: string;
  total?: PaymentTotal;
  productContext?: string;
  suggestedProducts?: OrderItem[];
}