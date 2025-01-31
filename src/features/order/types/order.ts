// src/features/order/types/order.ts
import type { Product } from '@/types/product';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
}

export interface PaymentAmount {
  value: number;
  formatted: string;
  originalInFCFA: number;
}

export interface OrderSummary {
  items: OrderItem[];
  customerInfo: CustomerInfo;
  subtotal: PaymentAmount;
  deliveryCost: PaymentAmount;
  total: PaymentAmount;
  formatted: string;
}

// Extension des types de message existants
export interface OrderSummaryMessage {
  type: 'order-summary';
  content: string;
  metadata: {
    orderSummary: OrderSummary;
  };
  choices?: string[];
}

export interface OrderSummaryProps {
  items: OrderItem[];
  customerInfo: CustomerInfo;
  deliveryCost: number;
  currency: string;
}

export interface OrderSummaryMessageProps {
  summary: OrderSummary;
  onConfirm: () => void;
  onModify: () => void;
}

export type OrderStep = 
  | 'contact-info'
  | 'city'
  | 'address'
  | 'phone'
  | 'summary'
  | 'payment-method'
  | 'payment'
  | 'complete';

export interface OrderState {
  step: OrderStep;
  items: OrderItem[];
  customerInfo: Partial<CustomerInfo>;
  summary?: OrderSummary;
  paymentMethod?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}