// src/components/delivery/DeliveryZonesMap.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface DeliveryZonesMapProps {
  zones: DeliveryZone[];
  onZoneClick?: (zone: DeliveryZone) => void;
  selectedZoneId?: string;
  className?: string;
}

const DeliveryZonesMap = ({ 
  zones, 
  onZoneClick, 
  selectedZoneId,
  className 
}: DeliveryZonesMapProps) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {zones.map((zone) => (
        <Card
          key={zone.id}
          className={cn(
            "p-4 hover:shadow-md transition-shadow cursor-pointer",
            selectedZoneId === zone.id && "ring-2 ring-brand-blue",
            !zone.isActive && "opacity-60"
          )}
          onClick={() => onZoneClick?.(zone)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium">{zone.name}</h3>
            </div>
            <Badge variant={zone.isActive ? "success" : "error"}>
              {zone.isActive ? "Actif" : "Inactif"}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Truck className="w-4 h-4" />
              <span>{zone.baseFee.toLocaleString()} FCFA + {zone.additionalFee.toLocaleString()} FCFA/km</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {zone.estimatedTime.min}-{zone.estimatedTime.max} {zone.estimatedTime.unit}
              </span>
            </div>

            {zone.cities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {zone.cities.map((city) => (
                  <Badge key={city} variant="outline" className="text-xs">
                    {city}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DeliveryZonesMap;