// src/types/chat.ts - TYPES CORRIGÉS COMPLETS
import { ReactNode } from 'react';

// ==========================================
// TYPES DE BASE
// ==========================================

export type MessageType = 
  | 'assistant' 
  | 'user' 
  | 'user-choices'
  | 'system'
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

export type PaymentProvider = 
  | 'wave' 
  | 'orange_money' 
  | 'card' 
  | 'cash_on_delivery'
  | 'other';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'success';

export type OrderStatus = 
  | 'draft'
  | 'pending' 
  | 'confirmed' 
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

// ==========================================
// CONVERSATION STEPS - VERSION COMPLÈTE
// ==========================================

export type ConversationStep = 
  // ✅ ÉTAPES PRINCIPALES DU SYSTÈME
  | 'initial'
  | 'initial_engagement'
  | 'initial_contact'
  | 'mode_selection'
  | 'generic_response'
  | 'error_recovery'
  | 'fallback_response'
  | 'whatsapp_redirect'
  | 'intelligent_fallback'
  | 'basic_fallback'
  | 'enhanced_fallback'
  | 'standard_engagement'
  | 'critical_error'
  | 'contextual_response'
  | 'generic'
  
  // ✅ ÉTAPES DE DÉCOUVERTE ET INFORMATION
  | 'description'
  | 'product_info'
  | 'product_info_detailed'
  | 'product_info_persuasive'
  | 'product_usage'
  | 'product_benefits'
  | 'product_question'
  | 'product_engagement'
  | 'product_selection'
  | 'product_details'
  | 'target_audience'
  | 'game_rules'
  | 'game_rules_shown'
  | 'usage_explained'
  | 'benefits_presented'
  | 'benefits_engagement'
  | 'question_mode'
  | 'question_answered'
  | 'information_gathering'
  | 'detailed_inquiry'
  | 'post_inquiry'
  | 'post_rules_engagement'
  | 'knowledge_response'
  | 'brand_discovery'
  | 'delivery_inquiry'
  | 'clarification'
  
  // ✅ ÉTAPES DE TÉMOIGNAGES ET SOCIAL PROOF
  | 'testimonials'
  | 'testimonials_view'
  | 'testimonials_shown'
  | 'testimonials_request'
  | 'social_proof_shown'
  
  // ✅ ÉTAPES DE PRIX ET OBJECTIONS
  | 'price_question'
  | 'price_explained'
  | 'price_justification'
  | 'objection'
  | 'objection_handling'
  | 'objection_handled'
  | 'objection_addressed'
  | 'objection_general'
  | 'doubt_addressed'
  
  // ✅ ÉTAPES DE LIVRAISON
  | 'delivery_info'
  | 'delivery_info_shown'
  | 'delivery_question'
  | 'delivery_unavailable'
  
  // ✅ ÉTAPES DE PERSUASION ET CONVERSION
  | 'warm_welcome'
  | 'greeting'
  | 'greeting_response'
  | 'high_interest'
  | 'conversion_focus'
  | 'persuasion_attempt'
  | 'trust_building'
  | 'purchase_intent'
  | 'purchase_flow_choice'
  | 'pre_purchase_questions'
  
  // ✅ ÉTAPES FLOW EXPRESS
  | 'express_contact'
  | 'express_name'
  | 'express_phone'
  | 'express_city'
  | 'express_address'
  | 'express_quantity'
  | 'express_custom_quantity'
  | 'express_payment'
  | 'express_order'
  | 'express_summary'
  | 'express_modify'
  | 'express_error'
  | 'quantity_confirmed'
  | 'quantity_selected'
  | 'custom_quantity'
  
  // ✅ ÉTAPES DE COLLECTE D'INFORMATIONS STANDARD
  | 'collect_quantity'
  | 'collect_name'
  | 'collect_phone'
  | 'collect_city'
  | 'collect_address'
  | 'collect_email'
  | 'collect_email_opt'
  | 'collect_has_email'
  | 'process_email_response'
  | 'collect_note_text'
  | 'check_existing'
  | 'confirm_address'
  | 'update_address'
  | 'confirm_existing_info'
  | 'process_quantity'
  | 'contact_info'
  
  // ✅ ÉTAPES DE GESTION DU PANIER ET PRODUITS
  | 'cart_management'
  | 'empty_cart'
  | 'empty_cart_options'
  | 'cart_summary_actions'
  | 'product_navigation_choice'
  | 'recommend_products'
  | 'select_product'
  | 'select_additional_product'
  | 'additional_quantity'
  | 'add_product_choice'
  | 'add_other_products'
  | 'add_product'
  | 'add_product_to_order'
  | 'product_added'
  | 'product_unavailable'
  | 'choose_flow'
  
  // ✅ ÉTAPES DE NOTES ET FINALISATION
  | 'add_notes'
  | 'save_note'
  | 'order_summary'
  | 'show_order_summary'
  | 'confirm_order_summary'
  | 'modify_order'
  | 'finalize_order'
  | 'finalize_current_order'
  | 'fresh_start'
  
  // ✅ ÉTAPES DE PAIEMENT
  | 'payment_method'
  | 'payment_selection'
  | 'payment_processing'
  | 'payment_complete'
  | 'payment_error'
  | 'payment_confirmation'
  | 'wave_payment_process'
  | 'card_payment'
  | 'custom_payment'
  | 'modification_blocked'
  | 'modify_quantity'
  | 'modify_address'
  | 'select_modification'
  | 'modification_error'
  
  // ✅ ÉTAPES POST-ACHAT
  | 'order_complete'
  | 'order_details_shown'
  | 'order_confirmed'
  | 'order_created'
  | 'order_error'
  | 'order_management'
  | 'customer_orders'
  | 'order_search'
  | 'post_purchase'
  | 'post_purchase_options'
  | 'order_tracking'
  
  // ✅ ÉTAPES DE SUPPORT ET SERVICE CLIENT
  | 'customer_service'
  | 'customer_support'
  | 'general_support'
  | 'general_inquiry'
  | 'support_request'
  | 'support_routing'
  | 'contact_options'
  | 'address_change_request'
  | 'no_products'
  | 'mobile_app_interest'
  | 'main_menu'
  
  // ✅ ÉTAPES DE CRÉATION DE COMPTE
  | 'create_account'
  | 'create_account_email'
  | 'create_account_password'
  
  // ✅ ÉTAPES DE GESTION DES STOCKS
  | 'out_of_stock'
  | 'stock_unavailable'

  // ✅ ÉTAPES CONVERSATIONNELLES (NOUVELLES)
  | 'conversational_quantity'
  | 'conversational_questions'
  | 'conversational_contact'
  | 'conversational_mode'
  | 'conversational_flow'
  | 'session_recovered'
  | 'browse_products'
  | 'free_text_mode';

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================

export interface ChatAssistant {
  name: string;
  title: string;
  avatar?: string;
}

export interface ChatOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  image?: string | null;
}

// ==========================================
// ✅ AJOUT: TYPES MANQUANTS POUR LES DONNÉES
// ==========================================

export interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category?: string;
  target_audience?: string[];
  game_rules?: string;
  benefits?: string[];
  rating?: number;
  reviews_count?: number;
  status: string;
  chatbot_variables?: any;
  metadata?: any;
}

export interface CustomerData {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryZoneData {
  id: string;
  name: string;
  cities: string[];
  base_price: number;
  free_delivery_threshold?: number;
  cash_on_delivery?: boolean;
}

export interface OrderData {
  id?: string;
  session_id?: string;
  
  // Informations produit
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  
  // Informations client
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  
  // Informations livraison
  delivery_address?: string;
  delivery_city?: string;
  delivery_fee?: number;
  delivery_cost?: number; // Alias pour delivery_fee
  
  // Montants
  total_amount?: number;
  
  // Statuts
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentProvider;
  
  // ✅ AJOUT: Propriétés pour compatibilité avec l'ancien système
  formStep?: ConversationStep;
  items?: ChatOrderItem[];
  totalAmount?: number; // Alias pour total_amount
  subtotal_amount?: number; // Alias pour subtotal
  paymentStatus?: PaymentStatus; // Alias pour payment_status
  paymentMethod?: PaymentProvider; // Alias pour payment_method
  deliveryCost?: number; // Alias pour delivery_cost
  contactInfo?: string;
  name?: string; // Nom complet
  city?: string; // Alias pour delivery_city
  address?: string; // Alias pour delivery_address
  
  // Métadonnées
  metadata?: any;
  order_details?: string;
  created_at?: string;
  updated_at?: string;
  
  // ✅ AJOUT: Propriétés étendues pour l'ancien système
  currentItem?: ChatOrderItem;
  buyingIntent?: number;
  preferences?: UserPreferences;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
  recommendations?: any[];
  summary?: any;
  notes?: string;
  chatMetadata?: {
    lastMessageId?: string;
    lastInteraction?: string;
  };
}

// Alias pour compatibilité
export type ChatOrderData = OrderData;

// ==========================================
// FLAGS ET MÉTADONNÉES
// ==========================================

export interface MessageFlags {
  // Flags du nouveau système
  expressMode?: boolean;
  preventAIIntervention?: boolean;
  customerExists?: boolean;
  addressValidated?: boolean;
  stockReserved?: boolean;
  paymentInitiated?: boolean;
  orderCompleted?: boolean;
  hasError?: boolean;
  outOfStock?: boolean;
  isWelcome?: boolean;
  cityPreselected?: string;
  quantitySelection?: boolean;
  quantityModified?: boolean;
  phoneValidationError?: boolean;
  phoneValidated?: boolean;
  newCustomer?: boolean;
  allowAddressChange?: boolean;
  cartCleared?: boolean;
  productUnavailable?: boolean;
  wavePayment?: boolean;
  paymentValidated?: boolean;
  
  // ✅ AJOUT: Nouveaux flags pour l'IA professionnelle
  professionalAIUsed?: boolean;
  aiConfidence?: number;
  fallbackUsed?: boolean;
  dataEnhanced?: boolean;
  basicFallback?: boolean;
  error?: boolean;
  
  // Flags de l'ancien système
  inPurchaseFlow?: boolean;
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
  accountCreated?: boolean;
  emailRequested?: boolean;
  surveyCompleted?: boolean;
  isButtonChoice?: boolean;
  isPurchaseInitiation?: boolean;
  isQuantitySelection?: boolean;
  choiceType?: string;
  standardMode?: boolean;
  flowChoice?: boolean;
  flowChosen?: boolean;
  nameCollected?: boolean;
  phoneCollected?: boolean;
  cityCollected?: boolean;
  addressCollected?: boolean;
  modificationRequested?: boolean;
  
  // ✅ AJOUT: Nouveaux flags pour l'IA
  contextualResponse?: boolean;
  persuasionMode?: boolean;
  knowledgeCategory?: string;
  userIntent?: string;
  gameRulesShown?: boolean;
  socialProofShown?: boolean;
  objectionRaised?: boolean;
  usageExplained?: boolean;
  priceExplained?: boolean;
  questionMode?: boolean;
  supportMode?: boolean;
  freeTextEnabled?: boolean;
  standardResponse?: boolean;
  welcomeMessage?: boolean;
  personalizedResponse?: boolean;
  showSocialProof?: boolean;
  
  [key: string]: boolean | string | number | undefined;
}

// ==========================================
// MÉTADONNÉES POUR LES COMMANDES
// ==========================================

export interface OrderMetadata {
  source: string;
  storeId?: string;
  productId?: string;
  conversationId?: string;
  createdAt: string;
  updatedAt?: string;
  conversationHistory?: any[];
  flags?: MessageFlags;
  flow?: string;
  sessionId?: string;
  [key: string]: any;
}

// ==========================================
// MÉTADONNÉES DES MESSAGES
// ==========================================

export interface ChatMessageMetadata {
  // Propriétés du nouveau système
  nextStep?: ConversationStep;
  orderData?: Partial<OrderData>;
  paymentUrl?: string;
  orderId?: string;
  productId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  flags?: MessageFlags;
  analytics?: {
    stepStartTime?: string;
    userIntent?: string;
    confidence?: number;
  };
  
  // ✅ AJOUT: Propriétés pour l'IA professionnelle
  salesTechnique?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  buyingIntent?: number;
  aiConfidence?: number;
  fallbackUsed?: boolean;
  sessionId?: string;
  flow?: string;
  expectingPhone?: boolean;
  expectingName?: boolean;
  expectingAddress?: boolean;
  expectingNumber?: boolean;
  error?: string;
  
  // Propriétés de l'ancien système
  recommendations?: string[] | any[];
  intent?: number;
  productContext?: string;
  isButtonAction?: boolean;
  actionType?: string;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  paymentInfo?: any;
  paymentType?: PaymentProvider;
  paymentProvider?: PaymentProvider;
  clientSecret?: string;
  paymentData?: {
    provider: PaymentProvider;
    transactionId: string;
    amount?: number;
    currency: string;
  };
  amount?: number;
  orderIndex?: number;
  summary?: any;
  cartId?: string;
  messageHandled?: boolean;
  formStep?: ConversationStep;
  action?: 'redirect' | 'payment' | 'confirmation';
  redirectUrl?: string;
  externalUrl?: {
    type: 'whatsapp' | 'email' | 'payment' | 'other';
    url: string;
    description?: string;
  };
  externalLinks?: {
    whatsappUrl?: string;
    appStore?: string;
    playStore?: string;
  };
  whatsappUrl?: string;
  redirectType?: string;
  lastCheck?: string;
  hasEmail?: 'yes' | 'no';
  emailCollected?: boolean;
  emailConfirmed?: boolean;
  showQuantitySelector?: boolean;
  maxQuantity?: number;
  quantity?: number;
  selectedProductId?: string;
  quantityHandled?: boolean;
  handleQuantityChange?: (qty: number) => Promise<ChatMessage | void>;
  handleQuantitySubmit?: (qty: number) => Promise<void>;
  userPreferences?: UserPreferences;
  availableProducts?: ProductData[];
  currentOrder?: OrderData;
  existingCustomer?: boolean;
  newCustomer?: boolean;
  orderSummary?: any; // ✅ GARDER CETTE VERSION (plus flexible)
  availableMethods?: any[];
  freeDeliveryThreshold?: number;
  
  // ✅ AJOUT: Propriétés manquantes
  originalMessage?: string;
  actions?: string[];
  [key: string]: any;
}

// Alias pour compatibilité
export type MessageMetadata = ChatMessageMetadata;

// ==========================================
// MESSAGE PRINCIPAL
// ==========================================

export interface ChatMessage {
  id?: string;
  type: MessageType;
  content: string;
  choices?: string[];
  assistant?: ChatAssistant;
  metadata?: ChatMessageMetadata;
  paymentUrl?: string;
  timestamp: string;
}

// ==========================================
// ÉTATS ET CONTEXTES
// ==========================================

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

export interface ChatState {
  messages: ChatMessage[];
  orderData: OrderData;
  sessionId: string;
  formStep: ConversationStep;
  isTyping: boolean;
  showCheckout: boolean;
  payment: PaymentState;
  paymentModal: PaymentModalState;
  mode: 'standard' | 'express';
}

// ==========================================
// VALIDATION ET SERVICES
// ==========================================

export interface StepValidation {
  isValid: boolean;
  nextStep?: ConversationStep;
  error?: string;
  metadata?: any;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FormattedPhone {
  formatted: string;
  international: string;
  local: string;
  country?: string; 
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

// ==========================================
// RÉPONSES IA
// ==========================================

export interface AIResponse {
  content: string;
  type: 'assistant' | 'user';
  choices?: string[];
  nextStep?: ConversationStep;
  recommendations?: any[];
  buyingIntent?: number;
  error?: string;
  metadata?: ChatMessageMetadata;
  
  // ✅ AJOUT: Types pour le dashboard
  insights?: string[];
  actions?: string[];
  suggestions?: string[];
  shouldPersonalize?: boolean;
  message?: string; // Pour compatibilité
}

// ==========================================
// TYPES UTILITAIRES
// ==========================================

export interface UserPreferences {
  categories?: string[];
  priceRange?: [number, number];
  relationshipType?: string;
  groupSize?: number;
  interests?: string[];
  concerns?: string[];
}

// ==========================================
// CONTEXTES D'IA
// ==========================================

export interface AIContext {
  productId?: string;
  sessionId: string;
  conversationHistory: ChatMessage[];
  customerData?: Partial<CustomerData>;
  currentStep?: ConversationStep;
  metadata?: Record<string, any>;
}

export interface CompetitiveAnalysis {
  averagePrice: number;
  ourPosition: 'cheaper' | 'comparable' | 'premium';
  uniqueSellingPoints: string[];
  marketAdvantages: string[];
}

// ==========================================
// ACTIONS DU CHAT
// ==========================================

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'UPDATE_ORDER_DATA'; payload: Partial<OrderData> }
  | { type: 'ADD_PRODUCT_TO_ORDER'; payload: ChatOrderItem }
  | { type: 'REMOVE_PRODUCT_FROM_ORDER'; payload: string }
  | { type: 'UPDATE_PRODUCT_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_FORM_STEP'; payload: ConversationStep }
  | { type: 'SET_SHOW_CHECKOUT'; payload: boolean }
  | { type: 'SET_CURRENT_PRODUCT_CONTEXT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_PAYMENT_MODAL'; payload: PaymentModalState }
  | { type: 'SELECT_PAYMENT_METHOD'; payload: PaymentProvider }
  | { type: 'RESET_ORDER' }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_PAYMENT_STATUS'; payload: SetPaymentStatusPayload }
  | { type: 'SET_ORDER_SUMMARY'; payload: any }
  | { type: 'RESET_PAYMENT' }
  | { type: 'SET_MODE'; payload: 'standard' | 'express' }
  | { type: 'INITIALIZE_CHAT'; payload: ChatState };

export interface SetPaymentStatusPayload {
  status: PaymentState['status'];
  transactionId?: string;
  error: string | null;
}

// ==========================================
// EXPORTS COMPATIBILITÉ (Types de l'ancien système)
// ==========================================

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

// Types de produit et catégories
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

// ==========================================
// ✅ AJOUT: Types pour les contextes de conversation
// ==========================================

export interface ConversationHistory {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ProcessingResult {
  success: boolean;
  response?: ChatMessage;
  error?: string;
  fallbackUsed?: boolean;
}

export interface ConversationContext {
  productId: string;
  sessionId: string;
  userMessage: string;
  conversationHistory: ConversationHistory[];
  currentStep?: ConversationStep;
  messageCount: number;
  sessionStartTime: string;
}

// Types de produit et identifiants
export type ProductId = string;

// Types pour les recommandations
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

export interface ProductRecommendation {
  id: string;
  name: string;
  price: number;
  confidence: number;
  reason: string;
  imageUrl?: string;
  description?: string;
}

// Interface pour l'analyse de profil
export interface ProfileAnalysisResult {
  relationshipStatus: string[];
  interests: string[];
  topics: string[];
  concerns: string[];
  intent: number;
  recommendedProducts: string[];
  pricePreference: 'standard' | 'economic' | 'premium';
}

// Types pour l'assistant de page
export interface PageContext {
  page: string;
  data: any;
  user?: {
    id: string;
    role: string;
  };
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

export function createDefaultOrderMetadata(
  sessionId: string,
  productId: string,
  storeId: string,
  additionalData: Partial<any> = {}
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

export function isStringContent(content: any): content is string {
  return typeof content === 'string';
}

export function ensureStringContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  if (content === null || content === undefined) {
    return '';
  }
  return String(content);
}