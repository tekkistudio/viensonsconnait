// src/types/payment.ts
import { ReactNode } from 'react';

// Types de base pour les providers
export type BictorysProvider = 'wave_money' | 'orange_money' | 'card';
export type PaymentProvider = 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'CASH';
export type PaymentMethodType = PaymentProvider;

// Types pour les statuts
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'success';

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

export interface BictorysPaymentParams extends BasePaymentParams {
  provider: BictorysProvider;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  customerCity?: string;
  customerCountry: string;
  orderId: number;
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

// Types pour les messages de paiement dans le chat
export interface PaymentMessageData {
  amount: number;
  currency: string;
  orderId: number;
  type: 'payment-request';
  paymentType?: PaymentMethodType;
  customerInfo: CustomerInfo;
}

// Types pour les réponses API
export interface BictorysPaymentResponse {
  success?: boolean;
  paymentUrl?: string;
  id?: string;
  transactionId?: string;
  status?: string;
  link?: string;
  qrCode?: string;
  '3ds'?: any;
  '3ds2'?: any;
  redirectUrl?: string;
  merchantReference?: string | null;
  type?: string;
  message?: string | null;
  state?: string | null;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  sessionId?: string;
  paymentUrl?: string;
  checkoutUrl?: string;
  reference?: string;
  qrCode?: string;
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
  mode: 'test' | 'live';
  publicKey: string;
  modalTitle?: string;
  modalDescription?: string;
}

// Types pour les états de paiement dans l'UI
export interface PaymentState {
  selectedMethod: PaymentMethodType | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  error?: string;
}

export interface PaymentModalState {
  isOpen: boolean;
  iframeUrl: string;
  provider?: PaymentProvider;
}

// Types pour les résultats
export interface BictorysResult {
  success: boolean;
  error?: string;
  checkoutUrl?: string;
  transactionId?: string;
  reference?: string;
  qrCode?: string;
}

// Types pour les configurations de paiement
export interface PaymentConfig {
  enabled: boolean;
  mode: 'test' | 'live';
  providers: {
    stripe?: {
      publicKey: string;
      webhookSecret: string;
    };
    bictorys?: {
      publicKey: string;
      webhookSecret: string;
    };
  };
  defaultCurrency: string;
  supportedCurrencies: string[];
}