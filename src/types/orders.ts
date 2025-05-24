// src/types/orders.ts
import { DateRange } from "react-day-picker";

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export type PaymentMethod = 
  | 'wave'
  | 'orange_money'
  | 'card'
  | 'cash_on_delivery';

export type TimeFilter = 
  | 'today' 
  | 'yesterday' 
  | '7days' 
  | '30days' 
  | '365days' 
  | 'all';

export interface Order {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  total_amount: number;
  delivery_cost?: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  order_details?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  city?: string;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  delivered: number;
  totalRevenue: number;
  averageOrderValue: number;
}