// src/types/bictorys.d.ts

// Types de base
export type PaymentProvider = 'wave_money' | 'orange_money' | 'card';
export type PaymentStatus = 'succeeded' | 'failed' | 'cancelled' | 'pending' | 'processing' | 'reversed' | 'authorized';
export type BictorysEnvironment = 'test' | 'live';

// Interface pour les informations client
export interface BictorysCustomer {
  name: string;
  phone: string;
  email?: string;
  city: string;
  country?: string;
  locale?: string;
}

// Interface pour les items de commande
export interface BictorysOrderItem {
  name: string;
  price: number;
  quantity: number;
  taxRate?: number;
}

// Interface pour la réponse de l'API Bictorys
export interface BictorysPaymentResponse {
  id: string;
  type: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  merchantReference: string | null;
  transactionId: string;
  link?: string;
  paymentUrl?: string;
  qrCode?: string;
  message: string | null;
  state: string | null;
  "3ds": null | any;
  "3ds2": null | any;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Interface pour les données de webhook
export interface BictorysWebhookPayload {
  id: string;
  merchantId: string;
  type: 'payment';
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentReference: string;
  merchantReference: string;
  paymentMeans: PaymentProvider;
  pspName: string;
  paymentChannel?: string;
  customerId?: string;
  customerObject?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    country: string;
    locale?: string;
    createdAt: string;
    updatedAt: string;
  };
  merchantFees?: number;
  customerFees?: number;
  transactionFeeAmountHT?: number;
  transactionFeeAmountTax?: number;
  orderType: string;
  orderId: string;
  deviceId?: string;
  originIp?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Configuration pour l'initialisation d'un paiement
export interface BictorysPaymentConfig {
  amount: number;
  currency: string;
  payment_type?: PaymentProvider;
  paymentReference: string;
  merchantReference?: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  callbackUrl: string;
  country: string;
  customer: BictorysCustomer;
  orderDetails?: BictorysOrderItem[];
  metadata?: Record<string, any>;
  allowUpdateCustomer?: boolean;
}

// Configuration pour l'intégration côté client
export interface BictorysConfig {
  merchantReference: string;
  amount: number;
  currency: string;
  customerObject: BictorysCustomer;
  webhookUrl: string;
  callbackUrl: string;
  metadata?: {
    customerName?: string;
    customerPhone?: string;
    country?: string;
    currency?: string;
    [key: string]: any;
  };
  onSuccess: (response: { transactionId: string }) => void;
  onError: (error: { message: string }) => void;
}

// Interface pour les erreurs Bictorys
export interface BictorysErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Extension de l'interface Window pour le SDK Bictorys
declare global {
  interface Window {
    Bictorys?: {
      Charges: {
        init: (config: BictorysConfig) => Promise<void>;
      };
    };
    Stripe?: any;
  }
}