// src/components/delivery/DeliveryFilters.tsx
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Filter, X } from 'lucide-react';

interface DeliveryFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
    dateFilter: string;
    onDateChange: (value: string) => void;
    typeFilter: 'all' | 'driver' | 'company';
    onTypeChange: (value: 'all' | 'driver' | 'company') => void;
    onReset: () => void;
  }

const statuses = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'assigned', label: 'Assignées' },
  { value: 'picked_up', label: 'Récupérées' },
  { value: 'in_transit', label: 'En transit' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'failed', label: 'Échouées' },
  { value: 'cancelled', label: 'Annulées' }
];

const dates = [
  { value: 'all', label: 'Toutes les dates' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: '30 derniers jours' }
];

const types = [
  { value: 'all', label: 'Tous les types' },
  { value: 'driver', label: 'Livreur' },
  { value: 'company', label: 'Entreprise' }
];

export function DeliveryFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  typeFilter,
  onTypeChange,
  onReset
}: DeliveryFiltersProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const activeFiltersCount = [
    statusFilter !== 'all',
    dateFilter !== 'all',
    typeFilter !== 'all'
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Statut</label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Période</label>
        <Select value={dateFilter} onValueChange={onDateChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dates.map((date) => (
              <SelectItem key={date.value} value={date.value}>
                {date.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Type de livraison</label>
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <Button 
          variant="outline" 
          className="w-full mt-2" 
          onClick={onReset}
        >
          <X className="w-4 h-4 mr-2" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Barre de recherche */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher une livraison..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtres - Mobile */}
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge 
                  className="ml-2 bg-brand-blue text-white" 
                  variant="outline"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
              <SheetDescription>
                Affinez votre recherche de livraisons
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Filtres - Desktop */
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="relative whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge 
                  className="ml-2 bg-brand-blue text-white" 
                  variant="outline"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtres</DialogTitle>
              <DialogDescription>
                Affinez votre recherche de livraisons
              </DialogDescription>
            </DialogHeader>
            <FilterContent />
          </DialogContent>
        </Dialog>
      )}

      {/* Filtres rapides sur desktop */}
      {!isMobile && (
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}