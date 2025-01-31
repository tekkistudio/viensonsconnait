import { supabase } from '@/lib/supabase';
import { smsService } from './sms';
import { DeliveryLocation } from '@/types/delivery';

export interface TrackingUpdate {
  delivery_id: string;
  status: string;
  location?: DeliveryLocation;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  driver_id?: string;
}

interface DeliveryTracking {
  id: string;
  delivery_id: string;
  status: string;
  location?: DeliveryLocation;
  created_at: string;
  driver_id?: string;
  notes?: string;
}

class TrackingService {
  // Subscription pour les mises à jour en temps réel
  subscribeToDelivery(deliveryId: string, callback: (update: any) => void) {
    const subscription = supabase
      .channel(`delivery-${deliveryId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `delivery_id=eq.${deliveryId}`
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Mettre à jour le statut d'une livraison
  async updateDeliveryStatus(update: TrackingUpdate) {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .insert([{
          delivery_id: update.delivery_id,
          status: update.status,
          location: update.location,
          driver_id: update.driver_id,
          notes: update.notes,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Si le statut est "delivered", mettre à jour la table des livraisons
      if (update.status === 'delivered') {
        await this.updateDeliveryCompletion(update.delivery_id);
      }

      return data;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  // Mettre à jour le statut final de la livraison
  private async updateDeliveryCompletion(deliveryId: string) {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'delivered',
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating delivery completion:', error);
      throw error;
    }
  }

  // Récupérer l'historique des positions d'une livraison
  async getDeliveryLocations(deliveryId: string): Promise<DeliveryTracking[]> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Récupérer la dernière position connue d'une livraison
  async getLastLocation(deliveryId: string): Promise<DeliveryTracking | null> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  // Récupérer les informations de localisation d'une livraison
  async getDeliveryLocation(deliveryId: string) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          delivery_address,
          city,
          metadata->destination_location
        `)
        .eq('id', deliveryId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching delivery location:', error);
      throw error;
    }
  }

  // Calculer le temps estimé d'arrivée
  async calculateETA(deliveryId: string): Promise<Date | null> {
    try {
      const lastLocation = await this.getLastLocation(deliveryId);
      if (!lastLocation) return null;

      const { data: delivery } = await supabase
        .from('deliveries')
        .select('delivery_address, city')
        .eq('id', deliveryId)
        .single();

      if (!delivery) return null;

      // On récupère les dernières positions pour calculer la vitesse moyenne
      const locations = await this.getDeliveryLocations(deliveryId);
      if (locations.length < 2) return null;

      // Calculer la vitesse moyenne des 5 derniers déplacements
      const recentLocations = locations.slice(-5);
      let totalSpeed = 0;
      let count = 0;

      for (let i = 1; i < recentLocations.length; i++) {
        const prev = recentLocations[i - 1];
        const curr = recentLocations[i];
        
        if (prev.location && curr.location) {
          const speed = this.calculateSpeed(
            prev.location.latitude,
            prev.location.longitude,
            curr.location.latitude,
            curr.location.longitude,
            prev.created_at,
            curr.created_at
          );
          if (speed > 0) {
            totalSpeed += speed;
            count++;
          }
        }
      }

      const averageSpeed = count > 0 ? totalSpeed / count : 0;
      if (averageSpeed === 0) return null;

      // Pour l'instant, on utilise une estimation basique
      // TODO: Intégrer un service de calcul d'itinéraire réel
      const now = new Date();
      return new Date(now.getTime() + 30 * 60000); // +30 minutes
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  // Obtenir un résumé du tracking d'une livraison
  async getDeliverySummary(deliveryId: string) {
    try {
      const [delivery, tracking, lastLocation] = await Promise.all([
        supabase
          .from('deliveries')
          .select('*')
          .eq('id', deliveryId)
          .single(),
        this.getDeliveryLocations(deliveryId),
        this.getLastLocation(deliveryId)
      ]);

      const eta = await this.calculateETA(deliveryId);

      return {
        ...delivery.data,
        tracking_history: tracking,
        current_location: lastLocation,
        estimated_arrival: eta
      };
    } catch (error) {
      console.error('Error getting delivery summary:', error);
      throw error;
    }
  }

  // Vérifier si une livraison est en retard
  async checkDeliveryDelay(deliveryId: string): Promise<boolean> {
    try {
      const { data: delivery } = await supabase
        .from('deliveries')
        .select('created_at, estimated_delivery_time, status')
        .eq('id', deliveryId)
        .single();

      if (!delivery || !delivery.estimated_delivery_time) return false;

      // Si la livraison est déjà terminée, pas de retard
      if (['delivered', 'cancelled', 'failed'].includes(delivery.status)) {
        return false;
      }

      const now = new Date();
      const estimatedTime = new Date(delivery.estimated_delivery_time);

      return now > estimatedTime;
    } catch (error) {
      console.error('Error checking delivery delay:', error);
      return false;
    }
  }

  // Calculer la distance entre deux points en km
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculer la vitesse moyenne entre deux points
  private calculateSpeed(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number,
    time1: string,
    time2: string
  ): number {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    const timeDiff = (new Date(time2).getTime() - new Date(time1).getTime()) / 1000 / 3600; // en heures
    return timeDiff > 0 ? distance / timeDiff : 0; // km/h
  }
}

export const trackingService = new TrackingService();