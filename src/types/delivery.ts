// src/types/delivery.ts

export interface Delivery {
  id: string;
  order_id: string;
  status: DeliveryStatus;
  delivery_type: 'company' | 'driver';
  company_id: string | null;
  driver_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  tracking_number: string | null;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  status: 'active' | 'inactive' | 'busy';
  current_zone: string | null;
  vehicle_type: string | null;
  rating: number | null;
  total_deliveries: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  api_key: string | null;
  is_active: boolean;
  coverage_areas: string[];
  integration_type: 'api' | 'manual' | 'sms';
  created_at: string;
  updated_at: string;
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
}

export interface TrackingUpdate {
  delivery_id: string;
  status: DeliveryStatus;
  location?: DeliveryLocation;
  timestamp: string;
  driver_id?: string;
  notes?: string;
}

export interface DeliveryUpdate {
  id: string;
  status: DeliveryStatus;
  location?: DeliveryLocation;
  timestamp: string;
  driver_id?: string;
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  city?: string;
  tracking_number?: string | null;
}

export interface StatusNotification {
  status: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface DeliveryStats {
  total: number;
  pending: number;
  in_progress: number;
  delivered: number;
  failed: number;
}

export type DeliveryStatus = 
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DeliveryType = 'driver' | 'company';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export interface TrackingUpdate {
  delivery_id: string;
  status: DeliveryStatus;
  timestamp: string;
  location?: DeliveryLocation;  
  notes?: string;
}

export interface DeliveryNotification {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  delivery_notes?: string;
  tracking_number: string | null;
}

export interface DriverNotification {
  id: string;
  phone: string;
  full_name: string;
}

interface DeliverySummaryResponse {
  status: string;
  current_location?: DeliveryLocation;
  estimated_arrival?: Date;
}

interface DeliveryLocationResponse {
  delivery_address: string;
  city: string;
  destination_location: {
    latitude: number;
    longitude: number;
  } | null;
}