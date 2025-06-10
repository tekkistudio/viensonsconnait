// src/types/chat.ts - TYPES CORRIGÉS POUR ÉVITER LES ERREURS
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
  | 'WAVE' 
  | 'ORANGE_MONEY' 
  | 'STRIPE' 
  | 'CASH';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'success';

// ==========================================
// CONVERSATION STEPS - VERSION COMPLÈTE
// ==========================================

export type ConversationStep = 
  // ✅ ÉTAPES PRINCIPALES DU SYSTÈME
  | 'initial'
  | 'initial_engagement'
  | 'mode_selection'
  | 'generic_response'
  | 'error_recovery'
  | 'fallback_response'
  | 'whatsapp_redirect' // ✅ AJOUTÉ
  | 'intelligent_fallback' // ✅ AJOUTÉ
  | 'basic_fallback' // ✅ AJOUTÉ
  | 'enhanced_fallback' // ✅ AJOUTÉ
  | 'standard_engagement' // ✅ AJOUTÉ
  | 'critical_error' // ✅ AJOUTÉ
  
  // ✅ ÉTAPES DE DÉCOUVERTE ET INFORMATION
  | 'description'
  | 'product_info'
  | 'product_info_detailed'
  | 'product_info_persuasive'
  | 'product_usage'
  | 'product_benefits'
  | 'product_question'
  | 'target_audience'
  | 'game_rules'
  | 'game_rules_shown'
  | 'usage_explained'
  | 'benefits_presented'
  | 'question_mode'
  | 'question_answered'
  | 'information_gathering'
  
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
  
  // ✅ ÉTAPES DE PERSUASION ET CONVERSION
  | 'warm_welcome'
  | 'greeting'
  | 'greeting_response'
  | 'high_interest'
  | 'conversion_focus'
  | 'persuasion_attempt'
  | 'trust_building'
  | 'purchase_intent'
  
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
  | 'product_selection'
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
  | 'payment_processing'
  | 'payment_complete'
  | 'payment_error'
  | 'wave_payment_process'
  
  // ✅ ÉTAPES POST-ACHAT
  | 'order_complete'
  | 'order_details_shown'
  | 'post_purchase'
  | 'post_purchase_options'
  | 'order_tracking'
  
  // ✅ ÉTAPES DE SUPPORT ET SERVICE CLIENT
  | 'customer_service'
  | 'customer_support'
  | 'general_support'
  | 'support_request'
  | 'contact_options'
  | 'address_change_request'
  
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
  | 'mode_selection'
  | 'session_recovered'
  | 'add_product_to_order'
  | 'finalize_order'
  | 'browse_products'
  | 'free_text_mode'
  
  // ✅ ÉTAPES GÉNÉRIQUES ET UTILITAIRES
  | 'generic';


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
  aiConfidence?: number; // ✅ CORRIGÉ: number au lieu de string
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
  
  [key: string]: boolean | string | number | undefined; // ✅ CORRIGÉ: Ajouté number
}

// ==========================================
// MÉTADONNÉES POUR LES COMMANDES
// ==========================================

export interface OrderMetadata {
  source: string;
  storeId: string;
  productId: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  conversationHistory: any[];
  flags?: MessageFlags;
  [key: string]: any;
}

// ==========================================
// DONNÉES DE COMMANDE UNIFIÉES
// ==========================================

export interface ChatOrderData {
  // ✅ IDENTIFIANTS
  session_id: string;
  id?: string; // Identifiant de commande
  order_id?: string; // Autre format d'identifiant
  
  // ✅ PRODUIT
  product_id?: string;
  
  // ✅ INFORMATIONS CLIENT
  first_name: string;
  last_name: string;
  name?: string; // Nom complet (prénom + nom)
  phone: string;
  city: string;
  address: string;
  email?: string;
  
  // ✅ PAIEMENT
  payment_method?: PaymentProvider;
  
  // ✅ MONTANTS
  subtotal?: number;
  subtotal_amount?: number; // Compatibilité ancien système
  delivery_cost?: number;
  total_amount?: number;
  totalAmount?: number; // Compatibilité ancien système
  
  // ✅ STATUTS
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status?: PaymentStatus;
  paymentStatus?: PaymentStatus; // Compatibilité ancien système
  
  // ✅ ARTICLES
  items: ChatOrderItem[];
  
  // ✅ MÉTADONNÉES
  metadata?: OrderMetadata;
  
  // ✅ Propriétés de l'ancien système (compatibilité)
  formStep?: ConversationStep;
  currentItem?: ChatOrderItem;
  contactInfo?: string;
  paymentMethod?: PaymentProvider;
  deliveryCost?: number;
  buyingIntent?: number;
  quantity?: number;
  preferences?: UserPreferences;
  mentionedTopics?: string[];
  concerns?: string[];
  interests?: string[];
  recommendations?: any[];
  summary?: any;
  notes?: string;
  order_details?: string;
  chatMetadata?: {
    lastMessageId?: string;
    lastInteraction?: string;
  };
}

// Alias pour compatibilité
export type OrderData = ChatOrderData;

// ==========================================
// MÉTADONNÉES DES MESSAGES
// ==========================================

export interface ChatMessageMetadata {
  // Propriétés du nouveau système
  nextStep?: ConversationStep;
  orderData?: Partial<ChatOrderData>;
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
  
  // Propriétés de l'ancien système
  recommendations?: string[] | any[];
  intent?: number;
  error?: string;
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
  orderSummary?: any;
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
  redirectType?: string; // ✅ AJOUTÉ
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
  
  // ✅ AJOUT: Propriétés manquantes
  originalMessage?: string;
  [key: string]: any; // Pour permettre d'autres propriétés dynamiques
}

// Alias pour compatibilité
export type MessageMetadata = ChatMessageMetadata;

// ==========================================
// MESSAGE PRINCIPAL - ✅ CORRECTION DU TYPE CONTENT
// ==========================================

export interface ChatMessage {
  id?: string;
  type: MessageType;
  content: string; // ✅ CHANGÉ: Seulement string au lieu de ReactNode
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
  orderData: ChatOrderData;
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
// RÉPONSES IA - ✅ CORRIGÉE AVEC metadata
// ==========================================

export interface AIResponse {
  content: string;
  type: 'assistant' | 'user';
  choices?: string[];
  nextStep?: ConversationStep;
  recommendations?: any[];
  buyingIntent?: number;
  error?: string;
  metadata?: ChatMessageMetadata; // ✅ AJOUTÉ: Support pour metadata
  
  // ✅ AJOUT: Types pour le dashboard
  insights?: string[];
  actions?: string[];
  suggestions?: string[];
  shouldPersonalize?: boolean;
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
// ACTIONS DU CHAT
// ==========================================

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'UPDATE_ORDER_DATA'; payload: Partial<ChatOrderData> }
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

// ==========================================
// FONCTION UTILITAIRE
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

// ==========================================
// FONCTIONS UTILITAIRES POUR VALIDATION DE TYPE
// ==========================================

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

// ✅ AJOUT: Types manquants pour les services
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