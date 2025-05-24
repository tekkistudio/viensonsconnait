// src/types/chat.ts
import { PRODUCTS_INFO } from "@/config/products";
import type { PaymentProvider, CustomerInfo } from '@/types/payment';
import type { 
  OrderData as BaseOrderData,
  OrderStatus as BaseOrderStatus,
  OrderMetadata as BaseOrderMetadata,
  OrderItem as BaseOrderItem,
  ProductRecommendation as BaseProductRecommendation,
  ProductRecommendation
} from './order';
import { ReactNode } from 'react';

// Product Types
export type ProductId = keyof typeof PRODUCTS_INFO;

export type ProductCategory = 
  | 'romance'
  | 'family'
  | 'friendship'
  | 'professional'
  | 'personal_growth';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
}

// Message Types
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

export interface PaymentMessage {
  type: 'payment-status' | 'payment-action' | 'payment-request';
  paymentData?: {
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number;
    currency: string;
    transactionId?: string;
    error?: string;
  };
  content?: string;
  metadata?: {
    orderId?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id?: string;
  type: MessageType;
  content: string | ReactNode | BaseMessageContent;
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

export interface SavedMessage {
  id: string;
  conversation_id: string;
  content: string;
  type: string;
  sender: 'customer' | 'assistant' | 'admin';
  metadata: {
    assistant?: {
      name: string;
      title: string;
      avatar?: string;
    };
    [key: string]: any;
  } | null;
  choices: string[];
  created_at: string;
}

export interface CustomerMessage {
  content: string;
  type: 'user';
  metadata?: Record<string, any>;
}

export interface MessageFlags {
  quantitySelectorDisplayed?: boolean;
  messageHandled?: boolean;
  emailHandled?: boolean;
  quantityHandled?: boolean;
}

export interface AIResponse {
  content: string;
  type: MessageType;
  choices?: string[];
  error?: string;
  buyingIntent?: number;
  shouldPersonalize?: boolean;
  recommendations?: ProductRecommendation[];
  nextStep?: ConversationStep;
  redirectUrl?: string;
  paymentUrl?: string;
  orderId?: string;
  total?: PaymentTotal;
  insights?: string[];
  actions?: string[];
  suggestions?: string[];
  metadata?: MessageMetadata;
}

// Conversation and Order Types
export type ConversationStep = 
  // Étapes initiales d'exploration
  | 'initial'
  | 'description' 
  | 'testimonials'
  | 'game_rules'
  
  // Étapes de collecte d'informations client
  | 'collect_quantity'
  | 'collect_name'
  | 'collect_phone'
  | 'check_existing'      // Ajouté pour vérifier si client existant
  | 'collect_city'
  | 'collect_address'
  | 'collect_email_opt'   // Ajouté pour demander si veut fournir email
  | 'collect_email'
  | 'collect_has_email'   // Compatible avec ancien flow
  | 'process_email_response'
  
  // Étapes de recommandation et ajout produits
  | 'recommend_products'  // Ajouté pour gérer recommandations
  | 'select_product'
  | 'additional_quantity'
  | 'add_product_choice'
  | 'add_other_products'
  | 'add_product'         // Ajouté pour résoudre l'erreur
  
  // Étapes notes et résumé
  | 'add_notes'
  | 'save_note'
  | 'order_summary'
  | 'modify_order'        // Ajouté pour résoudre l'erreur
  
  // Étapes de paiement
  | 'payment_method'
  | 'payment_processing'
  | 'payment_complete'
  | 'payment_error'
  
  // Étapes post-achat
  | 'create_account'      // Ajouté pour création compte
  | 'create_account_email'
  | 'create_account_password'
  | 'post_purchase'       // Ajouté pour étape finale
  
  // Étapes complémentaires pour la compatibilité
  | 'contact_info'
  | 'confirm_address'
  | 'update_address'
  | 'confirm_existing_info'
  | 'process_quantity'
  
  // Étapes du flow express
  | 'choose_flow'         // Choix entre mode express ou standard
  | 'express_name'        // Collecte du nom en mode express
  | 'express_phone'       // Collecte du téléphone en mode express
  | 'express_address'     // Collecte de l'adresse en mode express
  | 'express_city'        // Collecte de la ville en mode express
  | 'express_order' 
  | 'express_payment'     // Choix du mode de paiement en express
  | 'express_summary'     // Récapitulatif en mode express
  | 'express_modify'      // Modification commande en mode express
  | 'express_error';      // Gestion d'erreur en mode express

export interface StepValidation {
  isValid: boolean;
  nextStep: ConversationStep;
  error?: string;
  metadata?: {
    hasEmail?: boolean;
    [key: string]: any;
  };
}

export type EmailResponse = 'yes' | 'no';
export type PaymentStage = 'init' | 'method' | 'processing' | 'complete' | 'error';
export type PaymentMethodType = PaymentProvider;
export type OrderStatus = BaseOrderStatus;
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'success';

// Helper function pour getCurrentMessageMetadata
export interface MessageMetadataHelper {
  selectedProductId?: string;
  showQuantitySelector?: boolean;
  maxQuantity?: number;
  [key: string]: any;
}

// Interface pour createResponse
export interface CreateResponseOptions {
  products?: ProductRecommendation[];
  showProductSelector?: boolean;
  selectedProductId?: string;
  showQuantitySelector?: boolean;
  maxQuantity?: number;
  [key: string]: any;
}

export interface PaymentTotal {
  value: number;
  formatted: string;
  originalInFCFA: number;
}

export interface OrderItem extends BaseOrderItem {
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

export interface ProfileAnalysisResult {
  relationshipStatus: string[];
  interests: string[];
  topics: string[];
  concerns: string[];
  intent: number;
  recommendedProducts: string[]; 
  pricePreference: 'economic' | 'standard' | 'premium';
  mentionedTopics?: string[]; 
  productContext?: {
    lastViewed?: string[];
    favoriteCategories?: string[];
  };
}

// Order and Metadata Types
export interface OrderMetadata extends BaseOrderMetadata {
  conversationHistory: ChatMessage[];
  nextStep?: ConversationStep;
  buyingIntent?: number;
  recommendations?: string[];
}

export interface ChatOrderData extends Omit<BaseOrderData, 'subtotal'> {
  subtotal: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  formStep?: ConversationStep;
  currentItem?: OrderItem;
  items: OrderItem[];
  contactInfo?: string;
  paymentMethod?: PaymentMethodType;
  deliveryCost?: number;
  totalAmount?: number;
  buyingIntent?: number;
  quantity?: number;
  preferences?: UserPreferences;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
  recommendations?: BaseProductRecommendation[];
  summary?: OrderSummaryData;
  notes?: string;
  chatMetadata?: {
    lastMessageId?: string;
    lastInteraction?: string;
  };
}

// Et ajoutez cette ligne pour réexporter le type de base
export type OrderData = ChatOrderData;

export type PartialOrderUpdate = Partial<Omit<OrderData, 'metadata'>> & {
  metadata?: Partial<OrderMetadata>;
};

// State Types
export interface PaymentState {
  selectedMethod: PaymentMethodType | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  error: string | null;
  clientSecret: string | null;
}

export interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentMethodType;
}

export interface ChatState {
  messages: ChatMessage[];
  orderData: OrderData;
  sessionId: string;
  formStep: ConversationStep;
  isTyping: boolean;
  showCheckout: boolean;
  payment: PaymentState;
  paymentModal: PaymentModalState;
  // Nouveau champ pour le mode (express ou standard)
  mode: 'standard' | 'express';
}

export interface MessageFlags {
  inPurchaseFlow?: boolean;
  preventAIIntervention?: boolean;
  quantitySelectorDisplayed?: boolean;
  messageHandled?: boolean;
  emailHandled?: boolean;
  quantityHandled?: boolean;
  recommendationsShown?: boolean;
  recommendationsSkipped?: boolean;
  emailConfirmed?: boolean;
  addressConfirmed?: boolean;
  orderConfirmed?: boolean;
  paymentConfirmed?: boolean;
  accountCreationSkipped?: boolean;
  existingCustomerFound?: boolean;
  newCustomer?: boolean;
  accountCreated?: boolean;
  emailRequested?: boolean;
  surveyCompleted?: boolean;
  isButtonChoice?: boolean;
  isPurchaseInitiation?: boolean;
  isQuantitySelection?: boolean;
  choiceType?: string;
  // Flags pour le flow express
  expressMode?: boolean;
  standardMode?: boolean;
  flowChoice?: boolean;
  flowChosen?: boolean;
  nameCollected?: boolean;
  phoneCollected?: boolean;
  cityCollected?: boolean;
  addressCollected?: boolean;
  modificationRequested?: boolean;
  [key: string]: boolean | string | undefined; 
}

// Ajouter cette fonction utilitaire pour créer des métadonnées valides
export function createDefaultOrderMetadata(
  sessionId: string,
  productId: string,
  storeId: string,
  additionalData: Partial<OrderMetadata> = {}
): OrderMetadata {
  const timestamp = new Date().toISOString();
  
  return {
    source: 'chatbot',
    storeId: storeId || '',
    productId: productId || '',
    conversationId: sessionId,
    createdAt: additionalData.createdAt || timestamp,
    updatedAt: timestamp,
    conversationHistory: additionalData.conversationHistory || [],
    flags: additionalData.flags || {},
    ...additionalData
  };
}

// Metadata and Context Types
export interface MessageMetadata {
  // Propriétés existantes de base
  recommendations?: string[] | BaseProductRecommendation[];
  intent?: number;
  error?: string;
  productContext?: string;
  orderId?: string;
  isButtonAction?: boolean;
  actionType?: string;
  
  // Propriétés de paiement
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  paymentInfo?: PaymentInfo;
  paymentType?: PaymentProvider;
  paymentProvider?: PaymentProvider;
  paymentUrl?: string; // Ajouté pour résoudre l'erreur
  clientSecret?: string; // Ajouté pour résoudre l'erreur
  paymentData?: {
    provider: 'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'CASH';
    transactionId: string;
    amount?: number;
    currency: string;
  };
  amount?: number;
  
  // Propriétés de commande
  orderSummary?: OrderSummaryData;
  orderData?: Partial<ChatOrderData>;
  orderIndex?: number;
  summary?: OrderSummaryData;
  cartId?: string;
  
  // Propriétés de navigation et d'étapes
  messageHandled?: boolean;
  formStep?: ConversationStep;
  nextStep?: ConversationStep;
  action?: 'redirect' | 'payment' | 'confirmation';
  redirectUrl?: string;
  externalUrl?: {
    type: 'whatsapp' | 'email' | 'payment' | 'other';
    url: string;
    description?: string;
  };
  lastCheck?: string;
  flags?: MessageFlags;
  
  // Propriétés email
  hasEmail?: EmailResponse;
  emailCollected?: boolean;
  emailConfirmed?: boolean;
  
  // Propriétés de quantité et sélecteur
  showQuantitySelector?: boolean;
  maxQuantity?: number;
  quantity?: number;
  productId?: string;
  selectedProductId?: string;
  quantityHandled?: boolean;
  handleQuantityChange?: (qty: number) => Promise<ChatMessage | void>;
  handleQuantitySubmit?: (qty: number) => Promise<void>;
  
  // Propriétés de préférences et intentions
  userPreferences?: UserPreferences;
  buyingIntent?: number;
}

export interface UserPreferences {
  categories?: string[];
  priceRange?: [number, number];
  relationshipType?: string;
  groupSize?: number;
  interests?: string[];
  concerns?: string[];
}

export interface RecommendationContext {
  currentProductId: ProductId;
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
    productIds: ProductId[];
    totalSpent: number;
    lastPurchaseDate?: string;
  };
}

// Action Types
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
  | { type: 'UPDATE_USER_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_PAYMENT_STATUS'; payload: SetPaymentStatusPayload }
  | { type: 'SET_ORDER_SUMMARY'; payload: OrderSummaryData }
  | { type: 'RESET_PAYMENT' }
  | { type: 'SET_MODE'; payload: 'standard' | 'express' }
  | { type: 'INITIALIZE_CHAT'; payload: ChatState };

export interface SetPaymentStatusPayload {
  status: PaymentState['status'];
  transactionId?: string;
  error: string | null;
}

// Props Types
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

export interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  handleUserChoice: (choice: string) => Promise<void>;
  calculateOrderTotal: () => PaymentTotal;
  handleQuantityModification: (productId: string, quantity: number) => Promise<boolean>;
  handleMessage: (message: ChatMessage) => void;
  handlePaymentInitiation: (method: PaymentMethodType, customerInfo: CustomerInfo) => Promise<void>;
}

export interface ChatProviderProps {
  children: ReactNode;
  product: {
    id: string;
    name: string;
    price: number;
    [key: string]: any;
  };
}

// Utility Types
export interface MessageStructure {
  welcome: string;
  description: string;
  features: string;
  howToPlay: string;
  testimonials: string;
  pricing: (convertPrice: (price: number) => PaymentTotal) => string;
  sampleQuestions: string;
}

export type MessagesType = {
  [K in ProductId]: MessageStructure;
};