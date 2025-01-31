import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { DeliveryLocation } from '@/types/delivery';

// Token à remplacer par le vrai token Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface UseMapboxProps {
  containerId: string;
  initialLocation?: DeliveryLocation;
  destinationLocation?: DeliveryLocation;
}

export function useMapbox({
  containerId,
  initialLocation,
  destinationLocation,
}: UseMapboxProps) {
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{
    current?: mapboxgl.Marker;
    destination?: mapboxgl.Marker;
  }>({});
  const [error, setError] = useState<string | null>(null);

  // Initialiser la carte
  useEffect(() => {
    if (!mapboxgl.accessToken) {
      setError('Token Mapbox manquant');
      return;
    }

    try {
      // Centre par défaut sur Dakar si pas de position initiale
      const center = initialLocation 
        ? [initialLocation.longitude, initialLocation.latitude]
        : [-17.4676, 14.7167]; // Coordonnées de Dakar

      mapInstance.current = new mapboxgl.Map({
        container: containerId,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center as [number, number],
        zoom: 13
      });

      // Ajouter les contrôles
      mapInstance.current.addControl(new mapboxgl.NavigationControl());
      mapInstance.current.addControl(new mapboxgl.FullscreenControl());

      // Ajouter le marqueur initial
      if (initialLocation) {
        markersRef.current.current = new mapboxgl.Marker({ color: '#2563eb' })
          .setLngLat([initialLocation.longitude, initialLocation.latitude])
          .addTo(mapInstance.current);
      }

      // Ajouter le marqueur de destination
      if (destinationLocation) {
        markersRef.current.destination = new mapboxgl.Marker({ color: '#dc2626' })
          .setLngLat([destinationLocation.longitude, destinationLocation.latitude])
          .addTo(mapInstance.current);

        // Ajuster la vue pour montrer les deux points
        if (initialLocation) {
          const bounds = new mapboxgl.LngLatBounds()
            .extend([initialLocation.longitude, initialLocation.latitude])
            .extend([destinationLocation.longitude, destinationLocation.latitude]);

          mapInstance.current.fitBounds(bounds, {
            padding: 50
          });
        }
      }
    } catch (err) {
      setError('Erreur lors de l\'initialisation de la carte');
      console.error('Mapbox initialization error:', err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [containerId]);

  // Mettre à jour la position du livreur
  const updateCurrentLocation = (location: DeliveryLocation) => {
    if (!mapInstance.current) return;

    const lngLat: [number, number] = [location.longitude, location.latitude];

    if (markersRef.current.current) {
      markersRef.current.current.setLngLat(lngLat);
    } else {
      markersRef.current.current = new mapboxgl.Marker({ color: '#2563eb' })
        .setLngLat(lngLat)
        .addTo(mapInstance.current);
    }

    // Centrer la carte sur la nouvelle position
    mapInstance.current.easeTo({
      center: lngLat,
      duration: 1000
    });

    // Ajuster le zoom si on a une destination
    if (destinationLocation && markersRef.current.destination) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend(lngLat)
        .extend([destinationLocation.longitude, destinationLocation.latitude]);

      mapInstance.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000
      });
    }
  };

  return {
    map: mapInstance.current,
    error,
    updateCurrentLocation
  };
}