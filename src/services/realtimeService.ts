// src/services/realtimeService.ts

import { supabase } from '@/lib/supabase';
import { smsService } from './sms';
import { trackingService } from './tracking';
import { 
  StatusNotification, 
  DeliveryUpdate, 
  TrackingUpdate, 
  DeliveryLocation,
  DeliveryStatus
} from '@/types/delivery';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

class RealtimeService {
  private subscriptions: { [key: string]: () => void } = {};
  private statusNotifications: { [key: string]: StatusNotification } = {
    pending: {
      status: 'pending',
      title: 'Nouvelle livraison',
      message: 'Une nouvelle livraison est en attente d\'assignation',
      type: 'info'
    },
    assigned: {
      status: 'assigned',
      title: 'Livraison assignée',
      message: 'La livraison a été assignée à un livreur',
      type: 'info'
    },
    picked_up: {
      status: 'picked_up',
      title: 'Colis récupéré',
      message: 'Le livreur a récupéré le colis',
      type: 'info'
    },
    in_transit: {
      status: 'in_transit',
      title: 'En cours de livraison',
      message: 'Le colis est en cours de livraison',
      type: 'info'
    },
    delivered: {
      status: 'delivered',
      title: 'Livraison effectuée',
      message: 'Le colis a été livré avec succès',
      type: 'success'
    },
    failed: {
      status: 'failed',
      title: 'Échec de livraison',
      message: 'La livraison a échoué',
      type: 'error'
    }
  };

  subscribeToDeliveries(callback: (update: DeliveryUpdate | null) => void) {
    interface DeliveryPayload {
      id: string;
      status: string;
      location?: DeliveryLocation;
      driver_id?: string;
      notes?: string;
      customer_name?: string;
      customer_phone?: string;
      delivery_address?: string;
      city?: string;
      tracking_number?: string | null;
    }

    const deliveryChannel = supabase.channel('delivery-changes')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'deliveries'
      }, async (payload: RealtimePostgresChangesPayload<DeliveryPayload>) => {
        const update = payload.new as DeliveryPayload;
        const oldRecord = payload.old as DeliveryPayload | null;

        if (payload.eventType === 'UPDATE' && update && oldRecord && update.status !== oldRecord.status) {
          await this.handleStatusChange(update);
        }

        if (update && 'id' in update && 'status' in update) {
          const deliveryUpdate: DeliveryUpdate = {
            id: update.id,
            status: update.status as DeliveryStatus,
            timestamp: new Date().toISOString(),
            location: update.location,
            driver_id: update.driver_id,
            notes: update.notes,
            customer_name: update.customer_name,
            customer_phone: update.customer_phone,
            delivery_address: update.delivery_address,
            city: update.city,
            tracking_number: update.tracking_number
          };
          callback(deliveryUpdate);
        }
      })
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'delivery_drivers'
      }, () => callback(null))
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'delivery_companies'
      }, () => callback(null))
      .subscribe();

    return () => {
      deliveryChannel.unsubscribe();
    };
  }

  async handleStatusChange(delivery: any) {
    // Mettre à jour le tracking
    if (delivery.status === 'in_transit' || delivery.status === 'delivered') {
      const trackingUpdate: TrackingUpdate = {
        delivery_id: delivery.id,
        status: delivery.status,
        timestamp: new Date().toISOString(),
        location: delivery.location,
        driver_id: delivery.driver_id,
        notes: delivery.notes
      };
      
      await trackingService.updateDeliveryStatus(trackingUpdate);
    }

    // Envoyer des SMS si nécessaire
    if (delivery.status === 'assigned') {
      const { data: driver } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('id', delivery.driver_id)
        .single();

      if (driver) {
        await smsService.notifyDriver({
          id: delivery.id,
          customer_name: delivery.customer_name,
          customer_phone: delivery.customer_phone,
          delivery_address: delivery.delivery_address,
          city: delivery.city,
          delivery_notes: delivery.delivery_notes,
          tracking_number: delivery.tracking_number
        }, {
          id: driver.id,
          phone: driver.phone,
          full_name: driver.full_name
        });
      }
    }

    // Notifier le client final du statut
    if (['picked_up', 'in_transit', 'delivered'].includes(delivery.status)) {
      await smsService.sendDeliveryUpdate({
        id: delivery.id,
        customer_name: delivery.customer_name,
        customer_phone: delivery.customer_phone,
        delivery_address: delivery.delivery_address,
        city: delivery.city,
        tracking_number: delivery.tracking_number
      }, delivery.status);
    }

    // Mettre à jour les statistiques si nécessaire
    if (delivery.status === 'delivered' || delivery.status === 'failed') {
      await this.updateDeliveryStats(delivery);
    }
  }

  private async updateDeliveryStats(delivery: any) {
    const success = delivery.status === 'delivered';
    
    if (delivery.driver_id) {
      // Mettre à jour les stats du livreur
      await supabase.rpc('update_driver_stats', {
        driver_id: delivery.driver_id,
        success
      });
    }

    if (delivery.company_id) {
      // Mettre à jour les stats de l'entreprise
      await supabase.rpc('update_company_stats', {
        company_id: delivery.company_id,
        success
      });
    }
  }

  async getDashboardStats() {
    const [deliveries, drivers, companies] = await Promise.all([
      supabase
        .from('deliveries')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('delivery_drivers')
        .select('status')
        .eq('is_active', true),
      supabase
        .from('delivery_companies')
        .select('is_active')
    ]);

    return {
      today: {
        total: deliveries.data?.length || 0,
        delivered: deliveries.data?.filter(d => d.status === 'delivered').length || 0,
        pending: deliveries.data?.filter(d => d.status === 'pending').length || 0,
        failed: deliveries.data?.filter(d => d.status === 'failed').length || 0
      },
      drivers: {
        total: drivers.data?.length || 0,
        available: drivers.data?.filter(d => d.status === 'active').length || 0,
        busy: drivers.data?.filter(d => d.status === 'busy').length || 0
      },
      companies: {
        total: companies.data?.length || 0,
        active: companies.data?.filter(c => c.is_active).length || 0
      }
    };
  }
}

export const realtimeService = new RealtimeService();