// src/types/order.ts
export interface OrderMetadata {
    createdAt: Date;
    updatedAt: Date;
    paymentId?: string;
    paymentProvider?: 'wave' | 'orange' | 'stripe';
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
    deliveryStatus: 'pending' | 'processing' | 'shipped' | 'delivered';
    trackingNumber?: string;
  }
  
  export interface CustomerInfo {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    postalCode?: string;
  }
  
  export interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountApplied?: number;
  }
  
  export interface Order {
    id: string;
    items: OrderItem[];
    customer: CustomerInfo;
    subtotal: number;
    deliveryCost: number;
    totalAmount: number;
    paymentMethod: string;
    metadata: OrderMetadata;
    conversationContext?: string;
  }
  
  // src/features/payment/types.ts
  export interface BictorysPaymentRequest {
    amount: number;
    currency: 'XOF';
    provider: 'wave' | 'orange';
    phoneNumber: string;
    orderId: string;
    metadata?: Record<string, any>;
  }
  
  export interface BictorysPaymentResponse {
    status: 'pending' | 'success' | 'failed';
    transactionId: string;
    message: string;
  }