// src/types/customer.ts
export interface Customer {
    country_name: any;
    id: string;
    full_name: string;
    city: string;
    address: string;
    phone: string;
    email: string | null;
    country_code: string;
    status: 'active' | 'inactive';
    total_orders: number;
    total_spent: number;
    last_order_at: string | null;
    metadata: {
      preferences?: string[];
      favorite_products?: string[];
      notes?: string;
    } | null;
    tags: string[];
    created_at: string;
    updated_at: string;
  }
  
  export interface CustomerStats {
    totalCustomers: number;
    activeCustomers: number;
    averageOrderValue: number;
    topCity: string;
  }
  
  export interface CustomerSegment {
    id: string;
    name: string;
    condition?: (customer: Customer) => boolean;
    description?: string;
  }