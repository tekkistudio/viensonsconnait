// src/types/chat.ts - TYPES CORRIGÉS ET ÉTENDUS COMPLETS
import { ReactNode } from 'react';

// ==========================================
// TYPES DE BASE ÉTENDUS
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
  | 'CASH' 
  | 'cash_on_delivery'
  | 'stripe'
  | 'bictorys'
  | 'other';

export type PaymentStatus = 
  | 'idle'
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


// ✅ CORRECTION 2: Interface pour OrderService (si nécessaire)
export interface OrderCreationData {
  session_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  phone: string;
  first_name: string;
  last_name: string;
  city: string;
  address: string;
  payment_method: PaymentProvider;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// ==========================================
// CONVERSATION STEPS - VERSION COMPLÈTE CORRIGÉE
// ==========================================

export type ConversationStep = 
  // ✅ ÉTAPES PRINCIPALES
  | 'initial'
  | 'initial_engagement'
  | 'initial_contact'
  | 'mode_selection'
  | 'conversation'
  | 'browsing_mode'
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
  | 'family_interest'
  | 'price_discussed'
  
  // ✅ ÉTAPES DE DÉCOUVERTE ET INFO
  | 'product_info'
  | 'product_discovery'
  | 'product_explanation'
  | 'product_details'
  | 'rules_explanation'
  | 'testimonials_display'
  | 'benefits_explanation'
  | 'game_rules'
  | 'how_to_play'
  | 'target_audience'
  | 'usage_scenarios'
  | 'description'
  | 'product_info_shown'
  | 'product_info_detailed'
  | 'product_info_persuasive'
  | 'product_usage'
  | 'product_benefits'
  | 'product_question'
  | 'product_engagement'
  | 'product_selection'
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
  | 'delivery_info_shown'
  | 'clarification'
  | 'target_audience_shown'
  | 'benefits_shown'
  | 'friends_interest'
  
  // ✅ ÉTAPES D'ENGAGEMENT CLIENT
  | 'hesitation_handling'
  | 'objection_handling'
  | 'trust_building'
  | 'social_proof'
  | 'urgency_creation'
  | 'value_proposition'        // ✅ AJOUTÉ: pour corriger l'erreur RoseAIEngine
  | 'comparison_request'
  | 'alternative_suggestion'
  | 'warm_welcome'
  | 'greeting'
  | 'greeting_response'
  | 'high_interest'
  | 'conversion_focus'
  | 'persuasion_attempt'
  | 'purchase_intent'
  | 'purchase_flow_choice'
  | 'pre_purchase_questions'
  
  // ✅ ÉTAPES COMMANDE EXPRESS (CORRIGÉES)
  | 'express_quantity'           
  | 'express_phone'             
  | 'express_name'              
  | 'express_address'           
  | 'express_payment'           
  | 'express_confirmation'      
  | 'express_completed'
  | 'express_summary'
  | 'express_flow'
  | 'express_contact'
  | 'express_city'
  | 'express_custom_quantity'
  | 'express_order'
  | 'express_modify'
  | 'express_error'
  | 'quantity_confirmed'
  | 'quantity_selected'
  | 'custom_quantity'
  
  // ✅ ÉTAPES DE PAIEMENT
  | 'payment_method'
  | 'payment_processing'
  | 'payment_confirmation'
  | 'payment_failed'
  | 'payment_success'
  | 'payment_details'
  | 'wave_payment'
  | 'stripe_payment'
  | 'cod_payment'
  | 'payment_selection'
  | 'payment_complete'
  | 'payment_error'
  | 'wave_payment_process'
  | 'card_payment'
  | 'custom_payment'
  | 'modification_blocked'
  | 'modify_quantity'
  | 'modify_address'
  | 'select_modification'
  | 'modification_error'
  
  // ✅ ÉTAPES DE COLLECTE D'INFORMATIONS
  | 'collect_quantity'
  | 'collect_phone'
  | 'collect_name'
  | 'collect_address'
  | 'collect_city'
  | 'collect_email'
  | 'collect_preferences'
  | 'address_validation'
  | 'phone_validation'
  | 'customer_info'
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
  
  // ✅ ÉTAPES DE RECOMMANDATIONS
  | 'recommendations_display'
  | 'upsell_suggestion'
  | 'cross_sell'
  | 'bundle_offer'
  | 'related_products'
  | 'alternative_products'
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
  
  // ✅ ÉTAPES DE SUPPORT
  | 'support_request'
  | 'technical_help'
  | 'delivery_info'
  | 'return_policy'
  | 'contact_human'
  | 'escalation'
  | 'customer_service'
  | 'customer_support'
  | 'general_support'
  | 'general_inquiry'
  | 'support_routing'
  | 'contact_options'
  | 'address_change_request'
  | 'no_products'
  | 'mobile_app_interest'
  | 'main_menu'
  
  // ✅ ÉTAPES DE FINALISATION
  | 'order_summary'
  | 'order_confirmation'
  | 'order_completed'
  | 'thank_you'
  | 'feedback_request'
  | 'follow_up'
  | 'post_purchase'
  | 'app_promotion'
  | 'community_invitation'
  | 'show_order_summary'
  | 'confirm_order_summary'
  | 'modify_order'
  | 'finalize_order'
  | 'finalize_current_order'
  | 'fresh_start'
  | 'order_complete'
  | 'order_details_shown'
  | 'order_confirmed'
  | 'order_created'
  | 'order_error'
  | 'order_management'
  | 'customer_orders'
  | 'order_search'
  | 'post_purchase_options'
  | 'order_tracking'
  
  // ✅ ÉTAPES DE GESTION DU PANIER
  | 'cart_management'
  | 'empty_cart'
  | 'empty_cart_options'
  | 'cart_summary_actions'
  | 'product_navigation_choice'
  
  // ✅ ÉTAPES DE NOTES ET PERSONALISATION
  | 'add_notes'
  | 'save_note'
  
  // ✅ ÉTAPES DE CRÉATION DE COMPTE
  | 'create_account'
  | 'create_account_email'
  | 'create_account_password'
  
  // ✅ ÉTAPES DE GESTION DES STOCKS
  | 'out_of_stock'
  | 'stock_unavailable'
  
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
  | 'objection_handled'
  | 'objection_addressed'
  | 'objection_general'
  | 'doubt_addressed'
  
  // ✅ ÉTAPES DE LIVRAISON
  | 'delivery_info'
  | 'delivery_question'
  | 'delivery_unavailable'
  
  // ✅ ÉTAPES CONVERSATIONNELLES
  | 'conversational_quantity'
  | 'conversational_questions'
  | 'conversational_contact'
  | 'conversational_mode'
  | 'conversational_flow'
  | 'session_recovered'
  | 'browse_products'
  | 'free_text_mode';

// ==========================================
// INTERFACES PRINCIPALES ÉTENDUES
// ==========================================

// ✅ INTERFACE TESTIMONIAL EXPORTÉE (correction erreur import)
export interface Testimonial {
  id: string;
  content: string;
  author: string;
  author_name?: string;           // ✅ AJOUTÉ: alias pour compatibilité
  author_location?: string;
  rating: number;
  product_id: string;
  created_at: string;
}

// ✅ INTERFACE PRODUCT STATS (correction erreur ProductStats)
export interface ProductStats {
  views_count: number;
  real_sales_count: number;
  avg_rating: number;
  testimonials_count: number;
  featured_testimonials?: Testimonial[];
  satisfaction?: number;
  
  // Alias pour compatibilité
  viewsCount?: number;
  salesCount?: number;
  reviewsCount?: number;
  sales_count?: number;
  reviews_count?: number;
}

// ✅ INTERFACE REAL TIME STATS (correction erreur RealTimeStats)
export interface RealTimeStats {
  viewsCount: number;
  salesCount: number;
  reviewsCount: number;
  avgRating?: number;
  satisfaction?: number;
  
  // Alias pour compatibilité DB
  views_count?: number;
  sales_count?: number;
  reviews_count?: number;
  avg_rating?: number;
}

// ✅ INTERFACE PRODUCT VIEW STATS (correction erreur ProductViewStats)
export interface ProductViewStats {
  // Propriétés principales avec underscore (format DB)
  views_count: number;
  sales_count: number;
  reviews_count: number;
  avg_rating?: number;
  
  // Alias pour compatibilité avec le frontend (format camelCase)
  viewsCount: number;
  salesCount: number;
  reviewsCount: number;
  avgRating?: number;
  
  // Propriétés optionnelles étendues
  satisfaction?: number;
  real_sales_count?: number;
  testimonials_count?: number;
}

// ✅ INTERFACE PRODUCTDATA CORRIGÉE ET ÉTENDUE
export interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category?: string;
  target_audience?: string[] | string;
  game_rules?: string;
  benefits?: string[] | string;
  rating?: number;
  reviews_count?: number;
  sales_count?: number;
  status: string;                
  chatbot_variables?: any;
  metadata?: any;
  stock_quantity?: number;
  compare_at_price?: number;
  
  // ✅ Propriétés stats COHÉRENTES
  stats?: ProductStats & ProductViewStats & {
    satisfaction?: number;
    viewsCount?: number;
    salesCount?: number;
    reviewsCount?: number;
  };
  
  // Propriétés pour l'ancien système
  testimonials?: Testimonial[];
  usage_scenarios?: string[];
  
  // ✅ PROPRIÉTÉS CORRIGÉES - utiliser createdAt au lieu de created_at
  slug?: string;
  media?: string[];
  topics?: string[];
  createdAt?: string;  // ✅ CORRIGÉ: utiliser createdAt
  imageUrl?: string;
  
  // ✅ AJOUT: Signature d'index pour accès dynamique sécurisé
  [key: string]: any;
}

// ✅ ALIAS POUR COMPATIBILITÉ
export interface Product extends ProductData {}

export interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salesCount: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  rating?: number;
  reviewsCount?: number;
  confidence?: number;
  discountPercentage?: number;
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
  preferences?: {
    communication_style?: string;
    buying_behavior?: string;
    [key: string]: any;
  };
}

export interface DeliveryZoneData {
  id: string;
  name: string;
  cities: string[];
  cost: number;
  base_price?: number;
  free_delivery_threshold?: number;
  cash_on_delivery?: boolean;
  is_active?: boolean;
}

export interface TestimonialData extends Testimonial {}

export interface SalesStatsData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    product_id: string;
    name: string;
    total_sold: number;
    revenue: number;
  }>;
  recentOrders: number;
  monthlyGrowth: number;
}

// ==========================================
// INTERFACES DE CHAT ET CONVERSATION
// ==========================================

export interface ChatAssistant {
  name: string;
  title?: string;                 // ✅ OPTIONNEL pour compatibilité
  avatar?: string;
  status?: 'online' | 'offline' | 'typing';
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
// FLAGS ET MÉTADONNÉES ÉTENDUES
// ==========================================

export interface MessageFlags {
  // Flags principaux
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
  
  // Flags IA
  professionalAIUsed?: boolean;
  aiConfidence?: number;
  fallbackUsed?: boolean;
  dataEnhanced?: boolean;
  basicFallback?: boolean;
  error?: boolean;
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
  showQuantitySelector?: boolean;
  showRecommendations?: boolean;
  triggerUpsell?: boolean;
  showOrderSummary?: boolean;
  
  // Flags de flow
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
  
  [key: string]: boolean | string | number | undefined;
}

// ==========================================
// MÉTADONNÉES ÉTENDUES
// ==========================================

export interface ChatMessageMetadata {
  // Propriétés principales
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
  
  // Propriétés IA
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
  
  // Propriétés de recommandations
  recommendations?: string[] | any[];
  productRecommendations?: ProductRecommendation[];
  intent?: number;
  productContext?: string;
  isButtonAction?: boolean;
  actionType?: string;
  
  // Propriétés de paiement
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
  
  // Propriétés de commande
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
  
  // Propriétés de collecte d'informations
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
  
  // Propriétés utilisateur
  userPreferences?: UserPreferences;
  availableProducts?: ProductData[];
  currentOrder?: OrderData;
  existingCustomer?: boolean;
  newCustomer?: boolean;
  orderSummary?: any;
  availableMethods?: any[];
  freeDeliveryThreshold?: number;
  recommendedAction?: 'accelerate' | 'nurture' | 'convert';
  
  // ✅ CORRECTION PRINCIPALE: actions doit être MessageActions, pas string[]
  actions?: MessageActions; // ✅ CORRECTION: MessageActions au lieu de string[]
  originalMessage?: string;
  
  // Propriétés diverses
  [key: string]: any;
}

// ==========================================
// INTERFACES PRINCIPALES DE CHAT
// ==========================================

export interface ChatMessage {
  id?: string;
  type: MessageType;
  content: string | ReactNode;
  choices?: string[];
  assistant?: ChatAssistant;
  metadata?: ChatMessageMetadata;
  paymentUrl?: string;
  timestamp: string;
  
  // ✅ AJOUT: Nouvelles propriétés pour Rose AI
  productRecommendations?: ProductRecommendation[];
  upsellSuggestion?: ProductRecommendation;
  intent?: 'buy' | 'question' | 'info' | 'hesitant' | 'objection' | 'support';
  confidence?: number;
  actions?: {
    showCart?: boolean;
    showProduct?: boolean;
    triggerUpsell?: boolean;
    showTestimonials?: boolean;
    redirectWhatsApp?: boolean;
  };
}

export interface AIResponse {
  content: string;
  type: 'assistant' | 'user';
  choices?: string[];
  nextStep?: ConversationStep;
  recommendations?: any[];
  buyingIntent?: number;
  error?: string;
  metadata?: ChatMessageMetadata;
  
  // Propriétés IA étendues
  intent?: 'buy' | 'question' | 'info' | 'hesitant' | 'objection' | 'support';
  confidence?: number;
  productRecommendations?: ProductRecommendation[];
  upsellSuggestion?: ProductRecommendation;
  actions?: {
    showCart?: boolean;
    showProduct?: boolean;
    triggerUpsell?: boolean;
    showTestimonials?: boolean;
    redirectWhatsApp?: boolean;
  };
  
  // Propriétés de compatibilité
  insights?: string[];
  suggestions?: string[];
  shouldPersonalize?: boolean;
  message?: string;
  orderData?: any;
  flags?: MessageFlags;
}

// ==========================================
// DONNÉES DE COMMANDE ÉTENDUES
// ==========================================

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
  delivery_cost?: number;
  
  // Montants
  total_amount?: number;
  totalAmount?: number;
  subtotal_amount?: number;
  
  // Statuts
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentProvider;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentProvider;
  
  // Métadonnées
  metadata?: any;
  order_details?: string;
  created_at?: string;
  updated_at?: string;
  
  // Propriétés étendues
  formStep?: ConversationStep;
  items?: ChatOrderItem[];
  deliveryCost?: number;
  contactInfo?: string;
  name?: string;
  city?: string;
  address?: string;
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
    totalMessages?: number;
    sessionDuration?: number;
  };
  
  [key: string]: any;
}

// ✅ CORRECTIF 3: Interface ExpressOrderState corrigée
export interface ExpressOrderState {
  step: 'quantity' | 'phone' | 'name' | 'address' | 'payment' | 'confirmation';
  data: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    address?: string;
    paymentMethod?: PaymentProvider; // ✅ CORRECTION: PaymentProvider au lieu de string
  };
  flags: {
    isExistingCustomer: boolean;
    needsNameCollection: boolean;
    needsAddressCollection: boolean;
  };
}

// ✅ CORRECTIF 4: Interface MessageActions corrigée
export interface MessageActions {
  showCart?: boolean;
  showProduct?: boolean;
  triggerUpsell?: boolean;
  showTestimonials?: boolean;
  redirectWhatsApp?: boolean;
  showPayment?: boolean; 
  showQuantitySelector?: boolean;
  showDeliveryOptions?: boolean;
  showSummary?: boolean;
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
  provider?: PaymentProvider | undefined; 
}

// ✅ INTERFACE CHAT STATE ÉTENDUE (correction erreur sendMessage)
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
  
  // ✅ AJOUT: Méthodes manquantes pour corriger les erreurs
  sendMessage?: (content: string) => Promise<void>;
  addMessage?: (message: ChatMessage) => void;
  updateOrderData?: (data: Partial<OrderData>) => void;
  initializeSession?: (productId: string, storeId: string) => void;
  updateTypingStatus?: (typing: boolean) => void;
  setPaymentModal?: (modal: PaymentModalState) => void;
  cleanup?: () => void;
  
  // Propriétés additionnelles
  currentStep?: ConversationStep | null;
  flags?: MessageFlags;
  isExpressMode?: boolean;
  setExpressMode?: (mode: boolean) => void;
}

// ==========================================
// INTERFACES UTILITAIRES
// ==========================================

export interface UserPreferences {
  language?: 'fr' | 'en' | 'wo';
  communicationStyle?: 'formal' | 'casual' | 'friendly';
  interests?: string[];
  concerns?: string[];
  buyingSignals?: string[];
  objections?: string[];
  preferredPaymentMethod?: PaymentProvider;
  priceRange?: {
    min?: number;
    max?: number;
  };
  categories?: string[];
  relationshipType?: string;
  groupSize?: number;
}

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
// INTERFACES POUR LES COMPOSANTS
// ==========================================

export interface MobileChatContainerProps {
  product: ProductData;
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  onBackClick?: () => void;
}

export interface ChatContainerProps {
  product: ProductData;
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  mode?: 'standard' | 'express';
}

export interface QuantitySelectorProps {
  onQuantitySelect: (quantity: number) => void;
  maxQuantity?: number;
  className?: string;
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  onConfirm?: (qty: number) => Promise<void>;
}

export interface ChatProductCardsProps {
  recommendations: ProductRecommendation[];
  onProductSelect: (productId: string, productName: string) => void;
  onAddToCart: (productId: string) => void;
  className?: string;
}

export interface ChatUpsellCardProps {
  product: ProductRecommendation;
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
}

export interface ChatOrderSummaryProps {
  orderItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  totalAmount: number;
  onQuantityChange: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  className?: string;
}

export interface TypingIndicatorProps {
  className?: string;
  assistantName?: string;
}

// ==========================================
// INTERFACES POUR LES HOOKS
// ==========================================

export interface UseProductRecommendationsReturn {
  recommendations: ProductRecommendation[];
  isLoading: boolean;
  fetchRecommendations: (productId: string, context?: any) => Promise<void>;
  clearRecommendations: () => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isProcessing: boolean;
  orderData: OrderData;
  updateOrderData: (data: Partial<OrderData>) => void;
  clearChat: () => void;
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
// TYPES POUR LES SERVICES ET CONFIGURATIONS
// ==========================================

export interface ChatServiceConfig {
  openaiApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultStoreId: string;
}

export interface EnhancedRoseAIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface OptimizedChatServiceConfig {
  enableFallback: boolean;
  enableLogging: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// ==========================================
// CONTEXTES D'IA ET CONVERSATION
// ==========================================

export interface AIContext {
  productId?: string;
  sessionId: string;
  conversationHistory: ChatMessage[];
  customerData?: Partial<CustomerData>;
  currentStep?: ConversationStep;
  metadata?: Record<string, any>;
}

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

export interface CompetitiveAnalysis {
  averagePrice: number;
  ourPosition: 'cheaper' | 'comparable' | 'premium';
  uniqueSellingPoints: string[];
  marketAdvantages: string[];
}

// ==========================================
// TYPES POUR LES RECOMMANDATIONS
// ==========================================

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

export interface ProfileAnalysisResult {
  relationshipStatus: string[];
  interests: string[];
  topics: string[];
  concerns: string[];
  intent: number;
  recommendedProducts: string[];
  pricePreference: 'standard' | 'economic' | 'premium';
}

// ==========================================
// TYPES D'ERREUR
// ==========================================

export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PHONE_INVALID: 'PHONE_INVALID', 
  CITY_UNAVAILABLE: 'CITY_UNAVAILABLE',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  AI_ERROR: 'AI_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE'
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

// ==========================================
// ACTIONS DU CHAT
// ==========================================

export interface SetPaymentStatusPayload {
  status: PaymentState['status'];
  transactionId?: string;
  error: string | null;
}

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

// ==========================================
// TYPES POUR LES ÉVÉNEMENTS
// ==========================================

export interface ChatEvent {
  type: 'message_sent' | 'message_received' | 'order_updated' | 'payment_initiated' | 'error_occurred';
  timestamp: string;
  data?: any;
  sessionId: string;
}

export interface OrderEvent {
  type: 'created' | 'updated' | 'completed' | 'cancelled';
  orderId: string;
  timestamp: string;
  data: Partial<OrderData>;
}

export interface PaymentEvent {
  type: 'initiated' | 'completed' | 'failed' | 'cancelled';
  paymentId: string;
  amount: number;
  provider: PaymentProvider;
  timestamp: string;
  orderId?: string;
}

// ==========================================
// TYPES POUR LA PERSISTANCE
// ==========================================

export interface ChatSession {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  customer_id?: string;
  messages: ChatMessage[];
  order_data: OrderData;
  metadata: {
    source: string;
    user_agent?: string;
    ip_address?: string;
    [key: string]: any;
  };
}

export interface ConversationStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  session_duration_ms: number;
  conversion_achieved: boolean;
  final_step: ConversationStep;
  ai_confidence_avg: number;
}

// ==========================================
// TYPES POUR L'ANALYSE ET REPORTING
// ==========================================

export interface ChatAnalytics {
  session_id: string;
  product_id: string;
  customer_id?: string;
  messages_count: number;
  session_duration: number;
  conversion_achieved: boolean;
  final_order_value?: number;
  abandonment_step?: ConversationStep;
  user_satisfaction?: number;
  ai_performance_score: number;
  created_at: string;
}

export interface ConversationInsights {
  user_intent_progression: Array<{
    step: ConversationStep;
    intent_score: number;
    timestamp: string;
  }>;
  objections_raised: string[];
  questions_asked: string[];
  products_mentioned: string[];
  key_decision_points: string[];
}

// ==========================================
// TYPES POUR LES WEBHOOKS ET INTÉGRATIONS
// ==========================================

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  source: string;
  session_id?: string;
}

export interface ExternalIntegration {
  name: string;
  endpoint: string;
  headers?: Record<string, string>;
  enabled: boolean;
  events: string[];
}

// ==========================================
// TYPES POUR LA CONFIGURATION
// ==========================================

export interface ChatConfiguration {
  features: {
    enableAI: boolean;
    enableRecommendations: boolean;
    enableUpselling: boolean;
    enableVoiceInput: boolean;
    enableFileUpload: boolean;
  };
  limits: {
    maxMessagesPerSession: number;
    maxSessionDuration: number;
    maxOrderValue: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    enableAnimations: boolean;
    showTypingIndicator: boolean;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    fallbackEnabled: boolean;
  };
}

// ==========================================
// TYPES POUR LA PAGE ET LE CONTEXTE
// ==========================================

export interface PageContext {
  page: string;
  data: any;
  user?: {
    id: string;
    role: string;
  };
}

// ==========================================
// INTERFACES DE COMPATIBILITÉ LEGACY
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

// ==========================================
// TYPES DE PRODUIT ET CATÉGORIES
// ==========================================

export type ProductId = string;

export type ProductCategory = 
  | 'romance'
  | 'family'
  | 'friendship'
  | 'professional'
  | 'personal_growth';

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

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
    flow: additionalData.flow,
    sessionId,
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

// ✅ AJOUT: Fonction pour assurer la compatibilité Product/ProductData
export function ensureProductData(product: any): ProductData {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    images: product.images || (product.imageUrl ? [product.imageUrl] : []),
    category: product.category,
    target_audience: product.target_audience,
    game_rules: product.game_rules,
    benefits: product.benefits,
    rating: product.rating,
    reviews_count: product.reviews_count,
    sales_count: product.sales_count,
    status: product.status || 'active',      // ✅ VALEUR PAR DÉFAUT
    chatbot_variables: product.chatbot_variables,
    metadata: product.metadata,
    stock_quantity: product.stock_quantity,
    compare_at_price: product.compare_at_price,
    stats: product.stats,
    testimonials: product.testimonials,
    usage_scenarios: product.usage_scenarios,
    // Propriétés de compatibilité
    slug: product.slug,
    media: product.media,
    topics: product.topics,
    createdAt: product.createdAt,
    imageUrl: product.imageUrl || product.images?.[0]
  };
}

// ✅ AJOUT: Fonction pour créer un ProductData avec status requis
export function createProductDataArray(products: any[]): ProductData[] {
  return products.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    images: product.images || [],
    status: product.status || 'active',      // ✅ VALEUR PAR DÉFAUT REQUISE
    category: product.category,
    target_audience: product.target_audience,
    game_rules: product.game_rules,
    benefits: product.benefits,
    rating: product.rating,
    reviews_count: product.reviews_count,
    sales_count: product.sales_count,
    chatbot_variables: product.chatbot_variables,
    metadata: product.metadata,
    stock_quantity: product.stock_quantity,
    compare_at_price: product.compare_at_price
  }));
}

// ==========================================
// INTERFACES SUPPLÉMENTAIRES POUR COMPATIBILITÉ
// ==========================================

export interface EnhancedChatContainerProps {
  product: ProductData;
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  sessionId?: string;
  initialMessage?: string;
}

// ==========================================
// CONSTANTES ET ENUMS
// ==========================================

export const CHAT_MODES = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  CONVERSATIONAL: 'conversational'
} as const;

export const CONVERSATION_PHASES = {
  DISCOVERY: 'discovery',
  CONSIDERATION: 'consideration',
  PURCHASE: 'purchase',
  POST_PURCHASE: 'post_purchase'
} as const;

export const AI_CONFIDENCE_LEVELS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.9
} as const;

// ==========================================
// EXPORTS FINAUX POUR COMPATIBILITÉ
// ==========================================

// Ré-exports pour compatibilité avec l'ancien système
export type { MessageFlags as ChatFlags };
export type { ConversationStep as ChatStep };
export type { PaymentProvider as PaymentMethod };
export type { OrderStatus as ChatOrderStatus };
export type { ChatMessageMetadata as MessageMetadata };
export type { ChatMessageMetadata as ChatMetadata };
export type { OrderData as ChatOrderData };

// Constantes utiles
export const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CHOICE_OPTIONS = 6;
export const DEFAULT_PAGINATION_LIMIT = 20;

// Types pour le typage strict
export type StrictConversationStep = ConversationStep;
export type StrictMessageType = MessageType;
export type StrictPaymentProvider = PaymentProvider;
export type StrictOrderStatus = OrderStatus;
export type ProductType = ProductData;