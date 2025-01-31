// src/features/product/types/chat.ts
import { PRODUCTS_INFO } from "@/config/products";
import type { PaymentProvider, CustomerInfo } from '@/types/payment';
import { ReactNode } from "react";

export interface CustomerMessage {
  content: string;
  type: 'user';
}

export interface ProductRecommendation {
  productId: string;
  name: string;
  reason: string;
  recommendationType: 'product' | 'mobile-app' | string;
  category: string;
  priority: number;
}

// Type pour les IDs de produits
export type ProductId = keyof typeof PRODUCTS_INFO;

// Type pour les messages
export interface MessageStructure {
  welcome: string;
  description: string;
  features: string;
  howToPlay: string;
  testimonials: string;
  pricing: (convertPrice: (price: number) => { 
    value: number; 
    formatted: string; 
  }) => string;
  sampleQuestions: string;
}

export type MessagesType = {
  [K in ProductId]: MessageStructure;
};

export interface UseChatMessagesReturn {
  addBotResponse: (responses: ChatMessage[], delay?: number) => Promise<void>;
  handleFormStep: (step: ConversationStep, value: string, additionalData?: {
    total?: PaymentTotal;
    product?: { name: string; id: string };
  }) => Promise<void>;
  handleAIResponse: (userInput: string, context?: AIContext) => Promise<ChatMessage[]>;
  createSystemMessage: (content: string, choices?: string[], metadata?: Record<string, any>) => ChatMessage;
  handleOrderSummary: () => Promise<void>;
  handlePaymentMethod: (method: PaymentMethodType) => Promise<void>;
}

export interface UseChatMessagesProps {
  dispatch: React.Dispatch<ChatAction>;
  formStep: ConversationStep;
  productId: string;
  orderData: OrderData;
}

// Types de base pour les messages
export type MessageType = 
  | 'assistant' 
  | 'user' 
  | 'user-choices'
  | 'wave-button'
  | 'om-button'
  | 'cod-button'
  | 'payment-request'
  | 'payment-status'
  | 'payment-action'
  | 'mobile-money'
  | 'card'
  | 'cash'
  | 'redirect'
  | 'order-summary';

export type PaymentMethodMessageType = 
  | 'wave-button'
  | 'om-button'
  | 'cod-button'
  | 'mobile-money'
  | 'card'
  | 'cash';



export interface BaseMessageContent {
  text: string;
  choices?: string[];
}

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
  | 'order-summary'
  | 'summary'  
  | 'payment'
  | 'payment-method'
  | 'payment-processing'
  | 'payment-complete'
  | 'payment-error'
  | 'upsell';

export type PaymentStage = 'init' | 'method' | 'processing' | 'complete' | 'error';

export type PaymentMethodType = PaymentProvider;

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'paid'
  | 'cancelled'
  | 'delivered'
  | 'failed';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'success';

// Base interfaces pour le paiement et les commandes
export interface PaymentTotal {
  value: number;
  formatted: string;
  originalInFCFA: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderSummaryData {
  items: OrderItem[];
  customerInfo: {
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    address: string;
    phone: string;
  };
  subtotal: PaymentTotal;
  deliveryCost: PaymentTotal;
  total: PaymentTotal;
}

export interface PaymentInfo {
  provider: PaymentMethodType;
  status: PaymentStatus;
  transactionId?: string;
  error?: string;
}

export interface MessageMetadata {
  recommendations?: string[] | ProductRecommendation[]; 
  intent?: number;
  error?: string;
  productContext?: string;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  paymentInfo?: PaymentInfo;
  orderSummary?: OrderSummaryData;
  amount?: number;
  nextStep?: ConversationStep;
  orderData?: Partial<OrderData>;
  quantity?: number;
  summary?: OrderSummaryData; 
  paymentType?: PaymentProvider;
  redirectUrl?: string;
  action?: 'redirect' | 'payment' | 'confirmation';
  externalUrl?: {
    type: 'whatsapp' | 'email' | 'payment' | 'other';
    url: string;
    description?: string;
  };
}

export interface ChatMessage {
  type: MessageType;
  content: string | React.ReactNode | BaseMessageContent;
  choices?: string[];
  assistant?: {
    name: string;
    title: string;
    avatar?: string;
  };
  metadata?: MessageMetadata;
  paymentUrl?: string;
  timestamp?: string;
}

export interface PaymentMessage {
  type: 'payment-status';
  content: string;
  paymentData?: {
    status: PaymentStatus;
    provider: string;
    amount: number;
    currency: string;
  };
}

export interface AIResponse {
  content: string;
  type: MessageType;
  choices?: string[];
  error?: string;
  buyingIntent?: number;
  recommendations?: string[];
  nextStep?: ConversationStep;
  redirectUrl?: string;
  paymentUrl?: string;
  orderId?: string;
  total?: PaymentTotal;
  insights?: string[];
  actions?: string[];
  suggestions?: string[];
}

export interface OrderMetadata {
  source: string;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChatMessage[];
  buyingIntentScore?: number;
  currency?: string;
  country?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface OrderData {
  items: OrderItem[];
  currentItem?: OrderItem;
  contactInfo: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  paymentMethod: string;
  orderDetails: string;
  orderId?: string;
  conversationHistory: ChatMessage[];
  totalAmount?: number;
  deliveryCost?: number;
  status?: OrderStatus;
  metadata?: OrderMetadata;
  customerName?: string;
  summary?: OrderSummaryData;
  formStep?: ConversationStep;
  quantity?: number;
}

export interface PaymentState {
  selectedMethod: PaymentMethodType | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  error?: string;
}

export interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentMethodType;
}

// Interface d'état global
export interface ChatState {
  messages: ChatMessage[];
  orderData: OrderData;
  formStep: ConversationStep;
  isTyping: boolean;
  showCheckout: boolean;
  payment: PaymentState;
  paymentModal: PaymentModalState;
  currentProductContext?: any;
}

// Types pour les actions
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
  | { type: 'SET_PAYMENT_MODAL'; payload: PaymentModalState }
  | { type: 'SELECT_PAYMENT_METHOD'; payload: PaymentMethodType }
  | { type: 'RESET_ORDER' } 
  | { type: 'SET_PAYMENT_STATUS'; payload: { 
      status: PaymentState['status']; 
      transactionId?: string; 
      error?: string; 
    }}
  | { type: 'SET_ORDER_SUMMARY'; payload: OrderSummaryData }
  | { type: 'RESET_PAYMENT' };

// Types pour les hooks
export interface UseOrderManagementProps {
  orderData: OrderData;
  dispatch: React.Dispatch<ChatAction>;
  addBotResponse: (messages: ChatMessage[]) => Promise<void>;
}

export interface UsePaymentFlowProps {
  orderData: OrderData;
  dispatch: React.Dispatch<ChatAction>;
  addBotResponse: (messages: ChatMessage[]) => Promise<void>;
  calculateOrderTotal: () => PaymentTotal;
}

export interface UseChatMessagesProps {
  dispatch: React.Dispatch<ChatAction>;
  formStep: ConversationStep;
  productId: string;
}

export interface AIContext {
  currentStep: ConversationStep;
  productContext?: string;
  orderData?: OrderData;
  total?: PaymentTotal;
  [key: string]: any;
}

export interface PaymentInitiationProps {
  method: PaymentMethodType;
  customerInfo: CustomerInfo;
}

// Types pour le contexte du chat
export interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  handleUserChoice: (choice: string) => Promise<void>;
  calculateOrderTotal: () => PaymentTotal;
  handleQuantityModification: (productId: string, quantity: number) => Promise<boolean>;
  handleMessage: (message: ChatMessage) => void;
  handlePaymentInitiation: (
    method: PaymentMethodType,
    customerInfo: CustomerInfo
  ) => Promise<void>;
}

export interface ChatProviderProps {
  children: React.ReactNode;
  product: {
    id: string;
    name: string;
    price: number;
    [key: string]: any;
  };
}

// Types pour le paiement conversationnel
export interface UseConversationalPaymentReturn {
  paymentStage: PaymentStage;
  initiatePaymentFlow: () => Promise<void>;
  handlePaymentMethod: (method: string) => Promise<void>;
}

export function calculateTotal(orderData: OrderData): PaymentTotal {
  const subtotal = orderData.items.reduce((total, item) => {
    return total + item.totalPrice;
  }, 0);

  const deliveryCost = orderData.deliveryCost ?? 0;
  const finalTotal = subtotal + deliveryCost;

  return {
    value: finalTotal,
    formatted: `${finalTotal.toLocaleString()} FCFA`,
    originalInFCFA: finalTotal
  };
}