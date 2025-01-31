// src/types/orders.ts

import { DateRange } from "react-day-picker";

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export type TimeFilter = 'today' | 'yesterday' | '7days' | '30days' | '365days' | 'all';

export interface Order {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  total_amount: number;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: string;
  city?: string;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
}