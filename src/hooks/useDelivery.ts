// src/hooks/useDelivery.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { realtimeService } from '@/services/realtimeService';
import { trackingService } from '@/services/tracking';
import { smsService } from '@/services/sms';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { 
  Delivery, 
  Driver, 
  Company, 
  DeliveryStats, 
  DeliveryStatus,
  DeliveryType,
  TrackingUpdate 
} from '@/types/delivery';

interface UseDeliveryFilters {
  searchTerm?: string;
  statusFilter?: DeliveryStatus | 'all';
  dateFilter?: string;
  typeFilter?: DeliveryType | 'all';
}

interface UseDeliveryState {
  deliveries: Delivery[];
  drivers: Driver[];
  companies: Company[];
  isLoading: boolean;
  error: string | null;
  stats: DeliveryStats;
  filters: UseDeliveryFilters;
}

const DEFAULT_STATS: DeliveryStats = {
  total: 0,
  pending: 0,
  in_progress: 0,
  delivered: 0,
  failed: 0
};

const calculateStats = (deliveries: Delivery[]): DeliveryStats => ({
  total: deliveries.length,
  pending: deliveries.filter(d => d.status === 'pending').length,
  in_progress: deliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
  delivered: deliveries.filter(d => d.status === 'delivered').length,
  failed: deliveries.filter(d => ['failed', 'cancelled'].includes(d.status)).length
});

const buildDeliveriesQuery = (filters: UseDeliveryFilters) => {
  let query = supabase
    .from('deliveries')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.statusFilter && filters.statusFilter !== 'all') {
    query = query.eq('status', filters.statusFilter);
  }

  if (filters.dateFilter && filters.dateFilter !== 'all') {
    const date = new Date();
    if (filters.dateFilter === 'today') {
      date.setHours(0, 0, 0, 0);
      query = query.gte('created_at', date.toISOString());
    } else if (filters.dateFilter === 'week') {
      date.setDate(date.getDate() - 7);
      query = query.gte('created_at', date.toISOString());
    }
  }

  return query;
};

export function useDelivery() {
  const [state, setState] = useState<UseDeliveryState>({
    deliveries: [],
    drivers: [],
    companies: [],
    isLoading: true,
    error: null,
    stats: DEFAULT_STATS,
    filters: {
      searchTerm: '',
      statusFilter: 'all',
      dateFilter: 'all',
      typeFilter: 'all'
    }
  });

  const isMobile = useMediaQuery('(max-width: 768px)');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [deliveriesResponse, driversResponse, companiesResponse] = await Promise.all([
        buildDeliveriesQuery(state.filters),
        supabase.from('delivery_drivers').select('*'),
        supabase.from('delivery_companies').select('*')
      ]);

      if (deliveriesResponse.error) throw deliveriesResponse.error;
      if (driversResponse.error) throw driversResponse.error;
      if (companiesResponse.error) throw companiesResponse.error;

      const newState = {
        deliveries: deliveriesResponse.data || [],
        drivers: driversResponse.data || [],
        companies: companiesResponse.data || [],
        isLoading: false,
        error: null,
        stats: calculateStats(deliveriesResponse.data || []),
        filters: state.filters
      };

      setState(newState);
    } catch (error) {
      console.error('Error fetching delivery data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      }));
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données"
      });
    }
  }, [state.filters, toast]);

  const updateFilters = useCallback((newFilters: Partial<UseDeliveryFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const assignDelivery = async (
    deliveryId: string, 
    assigneeId: string, 
    type: DeliveryType
  ) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          [type === 'driver' ? 'driver_id' : 'company_id']: assigneeId,
          delivery_type: type,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      if (type === 'driver') {
        const driver = state.drivers.find(d => d.id === assigneeId);
        if (driver) {
          const delivery = state.deliveries.find(d => d.id === deliveryId);
          if (delivery) {
            await smsService.notifyDriver(
              {
                id: deliveryId,
                customer_name: delivery.customer_name,
                customer_phone: delivery.customer_phone,
                delivery_address: delivery.delivery_address,
                city: delivery.city,
                tracking_number: delivery.tracking_number
              },
              {
                id: driver.id,
                phone: driver.phone,
                full_name: driver.full_name
              }
            );
          }
        }
      }

      toast({
        title: "Succès",
        description: "La livraison a été assignée avec succès"
      });

      await fetchData();
    } catch (error) {
      console.error('Error assigning delivery:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'assigner la livraison"
      });
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: DeliveryStatus) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      if (['in_transit', 'delivered'].includes(status)) {
        const trackingUpdate: TrackingUpdate = {
          delivery_id: deliveryId,
          status,
          timestamp: new Date().toISOString()
        };

        await trackingService.updateDeliveryStatus(trackingUpdate);
      }

      const delivery = state.deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        await smsService.sendDeliveryUpdate(
          {
            id: delivery.id,
            customer_name: delivery.customer_name,
            customer_phone: delivery.customer_phone,
            delivery_address: delivery.delivery_address,
            city: delivery.city,
            tracking_number: delivery.tracking_number
          },
          status
        );
      }

      toast({
        title: "Succès",
        description: "Le statut a été mis à jour avec succès"
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    }
  };

  // Souscription aux mises à jour en temps réel
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToDeliveries((update) => {
      if (update) {
        setState(prev => {
          // Mise à jour optimiste des données
          const deliveries = prev.deliveries.map(d => 
            d.id === update.id ? { ...d, ...update } : d
          );
          
          return {
            ...prev,
            deliveries,
            stats: calculateStats(deliveries)
          };
        });
      }
      // Rafraîchir les données complètement en cas de changement majeur
      fetchData();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Chargement initial des données
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrage des livraisons
  const filteredDeliveries = state.deliveries.filter(delivery => {
    if (!state.filters.searchTerm) return true;
    
    const searchLower = state.filters.searchTerm.toLowerCase();
    return (
      delivery.customer_name?.toLowerCase().includes(searchLower) ||
      delivery.delivery_address?.toLowerCase().includes(searchLower) ||
      delivery.customer_phone?.includes(state.filters.searchTerm) ||
      delivery.tracking_number?.toLowerCase().includes(searchLower)
    );
  });

  return {
    deliveries: filteredDeliveries,
    drivers: state.drivers,
    companies: state.companies,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,
    searchTerm: state.filters.searchTerm,
    statusFilter: state.filters.statusFilter,
    dateFilter: state.filters.dateFilter,
    isMobile,
    setSearchTerm: (term: string) => updateFilters({ searchTerm: term }),
    setStatusFilter: (status: DeliveryStatus | 'all') => updateFilters({ statusFilter: status }),
    setSelectedDate: (date: string) => updateFilters({ dateFilter: date }),
    assignDelivery,
    updateDeliveryStatus,
    refreshData: fetchData
  };
}