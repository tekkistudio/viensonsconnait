// src/hooks/useDeliveryZones.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';

interface DeliveryZone {
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

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const fetchZones = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { data: settings, error } = await supabase
        .from('delivery_settings')
        .select('zones')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (settings?.zones) {
        setZones(settings.zones);
      }
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les zones de livraison",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    
    // Souscrire aux changements
    const channel = supabase
      .channel('delivery_settings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_settings'
      }, () => {
        fetchZones();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    zones,
    isLoading,
    selectedZone,
    setSelectedZone,
    refreshZones: fetchZones
  };
};