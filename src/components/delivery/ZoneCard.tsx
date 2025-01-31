// src/components/delivery/DriverCard.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from 'lucide-react';

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

interface ZoneCardProps {
  zone: DeliveryZone;
  onUpdate: (zone: DeliveryZone) => void;
  onDelete: (id: string) => void;
}

export function ZoneCard({ zone, onUpdate, onDelete }: ZoneCardProps) {
  return (
    <div className="border dark:border-gray-800 rounded-lg p-4 space-y-4 bg-white dark:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Switch
            checked={zone.isActive}
            onCheckedChange={(checked) => {
              onUpdate({ ...zone, isActive: checked });
            }}
          />
          <div className="flex-1">
            <Input
              value={zone.name}
              onChange={(e) => onUpdate({ ...zone, name: e.target.value })}
              className="font-medium bg-transparent border-gray-200 dark:border-gray-800"
              placeholder="Nom de la zone"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(zone.id)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-700 dark:text-gray-300">Villes couvertes</Label>
          <Textarea
            value={zone.cities.join(", ")}
            onChange={(e) => {
              const cities = e.target.value.split(",").map(c => c.trim());
              onUpdate({ ...zone, cities });
            }}
            className="mt-1 bg-transparent border-gray-200 dark:border-gray-800 resize-none"
            placeholder="Entrez les villes séparées par des virgules"
          />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 dark:text-gray-300">Frais de base (FCFA)</Label>
            <Input
              type="number"
              value={zone.baseFee}
              onChange={(e) => onUpdate({ ...zone, baseFee: parseInt(e.target.value) })}
              className="mt-1 bg-transparent border-gray-200 dark:border-gray-800"
            />
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300">Frais additionnels (FCFA)</Label>
            <Input
              type="number"
              value={zone.additionalFee}
              onChange={(e) => onUpdate({ ...zone, additionalFee: parseInt(e.target.value) })}
              className="mt-1 bg-transparent border-gray-200 dark:border-gray-800"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Délai minimum</Label>
              <Input
                type="number"
                value={zone.estimatedTime.min}
                onChange={(e) => onUpdate({
                  ...zone,
                  estimatedTime: { ...zone.estimatedTime, min: parseInt(e.target.value) }
                })}
                className="mt-1 bg-transparent border-gray-200 dark:border-gray-800"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Délai maximum</Label>
              <Input
                type="number"
                value={zone.estimatedTime.max}
                onChange={(e) => onUpdate({
                  ...zone,
                  estimatedTime: { ...zone.estimatedTime, max: parseInt(e.target.value) }
                })}
                className="mt-1 bg-transparent border-gray-200 dark:border-gray-800"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300">Unité de temps</Label>
            <Select
              value={zone.estimatedTime.unit}
              onValueChange={(value: 'minutes' | 'hours' | 'days') => {
                onUpdate({
                  ...zone,
                  estimatedTime: { ...zone.estimatedTime, unit: value }
                });
              }}
            >
              <SelectTrigger className="mt-1 bg-transparent border-gray-200 dark:border-gray-800">
                <SelectValue placeholder="Sélectionner une unité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Heures</SelectItem>
                <SelectItem value="days">Jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}