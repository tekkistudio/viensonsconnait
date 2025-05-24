// src/components/admin/orders/OrderFilters.tsx
'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Input } from "@/components/ui/input";
import type { OrderFilters, OrderStatus, PaymentMethod } from '@/types/orders';

interface OrderFiltersProps {
  filters: OrderFilters;
  onFilterChange: (filters: OrderFilters) => void;
}

const cities = [
  'Dakar',
  'Thiès',
  'Touba',
  'Saint-Louis',
  'Rufisque',
  'Kaolack',
  'Mbour',
  'Ziguinchor'
];

const statuses: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' }
];

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash_on_delivery', label: 'Paiement à la livraison' }
];

export function OrderFilters({ filters, onFilterChange }: OrderFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.paymentMethod) count++;
    if (filters.city) count++;
    if (filters.dateRange?.from) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    return count;
  };

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: OrderFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="h-10 gap-2">
          <Filter className="h-4 w-4" />
          Filtres
          {getActiveFiltersCount() > 0 && (
            <div className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">
              {getActiveFiltersCount()}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4 bg-white dark:bg-gray-800" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Filtres</h4>
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Statut
            </label>
            <Select
              value={localFilters.status}
              onValueChange={(value: OrderStatus) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Moyen de paiement */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paiement
            </label>
            <Select
              value={localFilters.paymentMethod}
              onValueChange={(value: PaymentMethod) => handleFilterChange('paymentMethod', value)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tous les moyens de paiement" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ville */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ville
            </label>
            <Select
              value={localFilters.city}
              onValueChange={(value) => handleFilterChange('city', value)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Période */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Période
            </label>
            <DatePickerWithRange
              date={localFilters.dateRange}
              onSelect={(dateRange) => handleFilterChange('dateRange', dateRange)}
              className="w-full"
            />
          </div>

          {/* Montant min et max */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant min
              </label>
              <Input
                type="number"
                value={localFilters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="bg-white dark:bg-gray-900"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant max
              </label>
              <Input
                type="number"
                value={localFilters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="bg-white dark:bg-gray-900"
                placeholder="999999"
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="text-gray-600 dark:text-gray-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white"
            >
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}