// src/lib/services/delivery.service.ts
import { supabase } from '@/lib/supabase';

export interface DeliveryZone {
  id: string;
  name: string;
  cities: string[];
  baseFee: number;
  additionalFee: number;
  estimatedTime: {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  isActive: boolean;
}

export interface DeliverySettings {
  id: string;
  user_id: string;
  zones: DeliveryZone[];
  partners: {
    id: string;
    name: string;
    type: string;
    zones: string[];
    isActive: boolean;
  }[];
  free_delivery_rules: {
    id: string;
    condition: {
      type: string;
      value: number | string | string[];
    };
    isActive: boolean;
  }[];
  default_settings: {
    allowMultipleCarriers: boolean;
    requireSignature: boolean;
    allowContactlessDelivery: boolean;
    allowScheduledDelivery: boolean;
    allowExpressDelivery: boolean;
    expressDeliveryFee: number;
    maxDeliveryAttempts: number;
    autoAssignDriver: boolean;
  };
  created_at: string;
  updated_at: string;
}

export class DeliveryService {
  private async getDeliverySettings(): Promise<DeliverySettings | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching delivery settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDeliverySettings:', error);
      return null;
    }
  }

  public async getDeliveryCost(city: string): Promise<number> {
    try {
      const settings = await this.getDeliverySettings();
      
      if (!settings) {
        console.log('No delivery settings found, using free delivery');
        return 0;
      }

      // Normaliser la ville pour la comparaison
      const normalizedCity = city.trim().toLowerCase();

      // Trouver la zone qui contient la ville
      const zone = settings.zones.find(zone =>
        zone.cities.some(zoneCity => zoneCity.toLowerCase() === normalizedCity)
      );

      if (zone) {
        return zone.baseFee;
      }

      // Retourner 0 si aucune zone n'est trouvée
      return 0;
    } catch (error) {
      console.error('Error getting delivery cost:', error);
      return 0;
    }
  }

  public async createDelivery(data: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    city: string;
  }) {
    try {
      const deliveryCost = await this.getDeliveryCost(data.city);
      const settings = await this.getDeliverySettings();
      
      const zone = settings?.zones.find(zone => 
        zone.cities.some(zoneCity => zoneCity.toLowerCase() === data.city.toLowerCase())
      );

      const estimatedTime = zone?.estimatedTime || {
        min: 1,
        max: 2,
        unit: 'days'
      };

      const { data: delivery, error } = await supabase
        .from('deliveries')
        .insert([{
          order_id: data.orderId,
          status: 'pending',
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          delivery_address: data.deliveryAddress,
          city: data.city,
          estimated_delivery: new Date(Date.now() + 
            (estimatedTime.unit === 'minutes' ? estimatedTime.max * 60000 :
             estimatedTime.unit === 'hours' ? estimatedTime.max * 3600000 :
             estimatedTime.max * 86400000)),
          delivery_cost: deliveryCost,
          metadata: {
            settings_version: settings?.id,
            created_at: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create delivery record: ${error.message}`);
      }

      return delivery;
    } catch (error) {
      console.error('Error in createDelivery:', error);
      throw error;
    }
  }
}