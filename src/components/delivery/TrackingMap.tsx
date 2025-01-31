// src/components/delivery/TrackingMap.tsx
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  PackageCheck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackingService } from '@/services/tracking';
import { DeliveryLocation } from '@/types/delivery';
import { useMapbox } from '@/hooks/useMapbox';

// Types d'API et Interfaces
type Json = any;

interface ApiJsonResponse {
  delivery_address: string;
  city: string;
  destination_location: Json;
}

interface RawDeliveryLocationResponse {
  delivery_address: string;
  city: string;
  destination_location: {
    latitude: string | number;
    longitude: string | number;
  } | null;
}

interface DeliveryLocationResponse {
  delivery_address: string;
  city: string;
  destination_location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface DeliverySummaryResponse {
  status: string;
  current_location?: DeliveryLocation;
  estimated_arrival?: Date;
}

interface TrackingMapProps {
  deliveryId: string;
  className?: string;
  onLocationUpdate?: (location: DeliveryLocation) => void;
}

interface TrackingSummary {
  currentLocation?: DeliveryLocation;
  destinationLocation?: DeliveryLocation;
  eta?: Date;
  lastUpdate?: string;
  isDelayed: boolean;
  status: string;
}

const MAP_CONTAINER_ID = 'delivery-tracking-map';

// Fonction utilitaire pour parser la réponse de l'API
const parseLocationResponse = (apiResponse: ApiJsonResponse): RawDeliveryLocationResponse => {
  let parsedDestination = null;

  if (apiResponse.destination_location && typeof apiResponse.destination_location === 'object') {
    const jsonLocation = apiResponse.destination_location as any;
    if ('latitude' in jsonLocation && 'longitude' in jsonLocation) {
      parsedDestination = {
        latitude: jsonLocation.latitude,
        longitude: jsonLocation.longitude
      };
    }
  }

  return {
    delivery_address: apiResponse.delivery_address,
    city: apiResponse.city,
    destination_location: parsedDestination
  };
};

export function TrackingMap({ 
  deliveryId,
  className,
  onLocationUpdate 
}: TrackingMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingSummary>({
    isDelayed: false,
    status: 'pending'
  });

  const { error: mapError, updateCurrentLocation } = useMapbox({
    containerId: MAP_CONTAINER_ID,
    initialLocation: tracking.currentLocation,
    destinationLocation: tracking.destinationLocation
  });

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeTracking = async () => {
      try {
        setIsLoading(true);
        setError(null);
    
        // Récupérer les données de base de la livraison
        const summary: DeliverySummaryResponse = await trackingService.getDeliverySummary(deliveryId);
        
        // Récupérer et parser les informations de localisation
        const apiResponse = await trackingService.getDeliveryLocation(deliveryId) as ApiJsonResponse;
        const rawDestination = parseLocationResponse(apiResponse);
        
        // Convertir en format final
        const destination: DeliveryLocationResponse = {
          delivery_address: rawDestination.delivery_address,
          city: rawDestination.city,
          destination_location: rawDestination.destination_location ? {
            latitude: Number(rawDestination.destination_location.latitude),
            longitude: Number(rawDestination.destination_location.longitude)
          } : null
        };

        // Mise à jour de la position actuelle si disponible
        if (summary.current_location) {
          handleLocationUpdate(summary.current_location);
        }

        // Vérifier si la livraison est en retard
        const isDelayed = await trackingService.checkDeliveryDelay(deliveryId);

        // Construction de l'objet de destination sécurisé
        let destinationLocation = undefined;
        if (destination?.destination_location) {
          destinationLocation = {
            latitude: destination.destination_location.latitude,
            longitude: destination.destination_location.longitude,
            timestamp: new Date().toISOString()
          };
        }

        // Mise à jour du state avec toutes les données
        setTracking(prev => ({
          ...prev,
          isDelayed,
          status: summary.status,
          eta: summary.estimated_arrival,
          destinationLocation
        }));
    
        // Souscrire aux mises à jour
        unsubscribe = trackingService.subscribeToDelivery(
          deliveryId,
          handleDeliveryUpdate
        );
    
      } catch (err) {
        setError('Impossible de charger les données de suivi');
        console.error('Error initializing tracking:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTracking();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [deliveryId]);

  const handleLocationUpdate = (location: DeliveryLocation) => {
    setTracking(prev => ({
      ...prev,
      currentLocation: location,
      lastUpdate: new Date().toISOString()
    }));

    updateCurrentLocation(location);
    onLocationUpdate?.(location);

    // Mettre à jour l'ETA
    trackingService.calculateETA(deliveryId).then(eta => {
      if (eta) {
        setTracking(prev => ({ ...prev, eta }));
      }
    });
  };

  const handleDeliveryUpdate = async (update: any) => {
    if (!update) return;

    setTracking(prev => ({
      ...prev,
      status: update.status
    }));

    if (update.location) {
      handleLocationUpdate(update.location);
    }

    // Vérifier si la livraison est en retard
    const isDelayed = await trackingService.checkDeliveryDelay(deliveryId);
    setTracking(prev => ({ ...prev, isDelayed }));
  };

  if (error || mapError) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <p>{error || mapError}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Suivi en temps réel</h3>
          {tracking.lastUpdate && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              <span>
                Mis à jour {formatDistanceToNow(new Date(tracking.lastUpdate), { 
                  addSuffix: true,
                  locale: fr 
                })}
              </span>
            </Badge>
          )}
        </div>

        {/* Carte */}
        {isLoading ? (
          <Skeleton className="w-full h-[300px] rounded-lg" />
        ) : (
          <div 
            id={MAP_CONTAINER_ID}
            className="w-full h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg"
          />
        )}

        {/* Coordonnées */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Navigation className="w-4 h-4" />
              <span>Position actuelle</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : tracking.currentLocation ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {tracking.currentLocation.latitude.toFixed(6)}, {tracking.currentLocation.longitude.toFixed(6)}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Position non disponible
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Destination</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : tracking.destinationLocation ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {tracking.destinationLocation.latitude.toFixed(6)}, {tracking.destinationLocation.longitude.toFixed(6)}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Destination non disponible
              </div>
            )}
          </div>
        </div>

        {/* ETA et statut */}
        {tracking.eta && (
          <div className={cn(
            "p-3 rounded-lg flex items-center gap-3",
            tracking.isDelayed 
              ? "bg-yellow-50 dark:bg-yellow-900/20" 
              : "bg-blue-50 dark:bg-blue-900/20"
          )}>
            <PackageCheck className={cn(
              "w-5 h-5",
              tracking.isDelayed
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-blue-600 dark:text-blue-400"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                tracking.isDelayed
                  ? "text-yellow-900 dark:text-yellow-100"
                  : "text-blue-900 dark:text-blue-100"
              )}>
                {tracking.isDelayed ? 'Livraison retardée' : 'Livraison estimée'}
              </p>
              <p className={cn(
                "text-sm",
                tracking.isDelayed
                  ? "text-yellow-700 dark:text-yellow-300"
                  : "text-blue-700 dark:text-blue-300"
              )}>
                {format(tracking.eta, 'PPp', { locale: fr })}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}