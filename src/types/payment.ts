// src/types/payment.ts
import { ReactNode } from 'react';

// Types de base pour les providers
export type BictorysProvider = 'wave_money' | 'orange_money' | 'card';
export type PaymentProvider = 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'CASH';
export type PaymentMethodType = PaymentProvider;
export type PaymentMode = 'test' | 'live';

// Types pour les configurations
export interface StripeConfig {
  publicKey: string | undefined;
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  apiVersion: string;
}

export interface BictorysConfig {
  publicKey: string | undefined;
  webhookSecret: string | undefined;
  apiUrl: string | undefined;
  jsUrl: string | undefined;
}

export interface PaymentUrls {
  success: string;
  cancel: string;
  webhook: string;
}

// Types pour les statuts
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'success'
  | 'expired';

// Interface pour les informations client
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  city: string;
  country?: string;
}

// Interface de base pour les paramètres de paiement
interface BasePaymentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

// Types pour les transactions et résultats
export interface PaymentTransaction {
  id: string;
  order_id: number;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  reference: string;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentResult {
  success: boolean;
  error?: string;
  sessionId?: string;
  checkoutUrl?: string;
  transactionId?: string;
  reference?: string;
  qrCode?: string;
}

// Types pour les sessions de paiement
export interface BictorysPaymentSession {
  iframeUrl: string;
  transactionId: string;
  checkoutUrl?: string;
  qrCode?: string;
  opToken?: string;   
}

export interface StripeSession {
  id: string;
  url: string;
}

// Types pour l'initiation des paiements
export interface PaymentInitiationParams extends BasePaymentParams {
  provider: PaymentProvider;
  customerInfo: CustomerInfo;
  orderId: number;
  metadata?: Record<string, any>;
}

// Mise à jour de BictorysPaymentParams
export interface BictorysPaymentParams extends BasePaymentParams {
  provider?: BictorysProvider;
  merchantReference: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  callbackUrl: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    country: string;
  };
}

export interface BictorysInitiatePaymentParams extends BasePaymentParams {
  provider: BictorysProvider;
  customerInfo: CustomerInfo;
  orderId: number;
}

export interface StripePaymentParams extends BasePaymentParams {
  orderId: string;
  customerEmail?: string;
  customerName?: string;
  success_url?: string;
  cancel_url?: string;
}

// Types pour les réponses API
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  sessionId?: string;
  paymentUrl?: string;
  link?: string;  
  checkoutUrl?: string;
  reference?: string;
  qrCode?: string;
}

export interface BictorysPaymentResponse {
  success?: boolean;
  chargeId: string;       
  opToken: string;       
  link: string;           // URL de redirection Bictorys
  id?: string;
  transactionId?: string;
  status?: string;
  qrCode?: string;
  merchantReference?: string;
  type?: string;
  message?: string;
  state?: string;
}

// Types pour les webhooks
export interface BictorysWebhookPayload {
  id: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending' | 'processing' | 'reversed' | 'authorized';
  amount: number;
  currency: string;
  merchantReference: string;
  paymentMeans: string;
  pspName: string;
  orderType?: string;
  orderId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  type?: string;
}

// Interfaces pour les services
export interface IBictorysService {
  createPaymentSession(params: BictorysPaymentParams): Promise<BictorysPaymentSession>;
  handleWebhook(payload: BictorysWebhookPayload, signature: string): Promise<{ 
    success: boolean; 
    transaction: PaymentTransaction;
  }>;
}

export interface IStripeService {
  createCheckoutSession(options: StripePaymentParams): Promise<StripeSession>;
  getSessionStatus(sessionId: string): Promise<'complete' | 'expired' | 'pending'>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<boolean>;
}

// Types pour l'UI des paiements
export interface PaymentMethod {
  id: PaymentMethodType;
  name: string;
  icon: ReactNode;
  description: string;
  enabled: boolean;
  fees?: {
    type: 'fixed' | 'percentage';
    value: number;
  };
  requiredFields?: Array<keyof CustomerInfo>;
}

export interface PaymentProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  orderId: string;
  customerInfo: CustomerInfo;
  provider?: PaymentProvider;
  onPaymentComplete?: (result: {
    success: boolean;
    transactionId?: string;
    reference?: string;
    error?: string;
  }) => void;
}

export interface PaymentUIConfig {
  provider: PaymentProvider;
  mode: PaymentMode;
  publicKey: string;
  modalTitle?: string;
  modalDescription?: string;
}

// Types pour les états de paiement dans l'UI
export interface PaymentState {
  selectedMethod: PaymentMethodType | null;
  status: PaymentStatus;
  transactionId?: string;
  error?: string;
  iframeUrl?: string;
  qrCode?: string;
  clientSecret?: string | null;
}

export interface PaymentModalState {
  isOpen: boolean;
  iframeUrl?: string;
  qrCode?: string;
  provider?: PaymentProvider;
  error?: string;
}

// Types pour les messages de paiement dans le chat
export interface PaymentMessageData {
  amount: number;
  currency: string;
  orderId: number;
  type: 'payment-request';
  paymentType?: PaymentMethodType;
  customerInfo: CustomerInfo;
}

// Configuration globale du système de paiement
export interface PaymentSystemConfig {
  stripe: StripeConfig;
  bictorys: BictorysConfig;
  mode: PaymentMode;
  defaultCurrency: string;
  callbackUrls: PaymentUrls;
  providers: {
    [key in PaymentProvider]: {
      enabled: boolean;
      fees?: {
        type: 'fixed' | 'percentage';
        value: number;
      };
    };
  };
  supportedCurrencies: string[];
}

// Extensions de types pour la persistance
export interface PaymentConfigRecord {
  id: string;
  provider: PaymentProvider;
  mode: PaymentMode;
  publicKey: string;
  secretKey?: string;
  webhookSecret?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethodRecord {
  id: PaymentMethodType;
  name: string;
  description: string;
  enabled: boolean;
  country_availability: string[];
  minimum_amount?: number;
  maximum_amount?: number;
  fees: {
    type: 'fixed' | 'percentage';
    value: number;
  };
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Résultat de la vérification d'un paiement
 */
export interface PaymentVerificationResult {
  isValid: boolean;
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  transactionId?: string;
  error?: string;
}