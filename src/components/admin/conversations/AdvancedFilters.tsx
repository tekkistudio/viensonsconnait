// components/conversations/AdvancedFilters.tsx
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter } from 'lucide-react';

interface FiltersState {
  intent?: string;
  hasOrder?: boolean;
  dateBefore?: Date;
  dateAfter?: Date;
}

interface AdvancedFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Plus de filtres
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Filtres avancés</h4>
          
          <div className="space-y-2">
            <Label>Intention</Label>
            <select
              value={filters.intent}
              onChange={(e) => onFiltersChange({ ...filters, intent: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Toutes</option>
              <option value="purchase">Achat</option>
              <option value="support">Support</option>
              <option value="information">Information</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="has-order" className="flex-1">A déjà commandé</Label>
            <Switch
              id="has-order"
              checked={filters.hasOrder}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, hasOrder: checked })}
            />
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <Label>Période</Label>
              <div className="rounded-md border">
                <Calendar
                  mode="range"
                  selected={{
                    from: filters.dateAfter,
                    to: filters.dateBefore
                  }}
                  onSelect={(range) => onFiltersChange({
                    ...filters,
                    dateAfter: range?.from,
                    dateBefore: range?.to
                  })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onFiltersChange({})}
              size="sm"
            >
              Réinitialiser
            </Button>
            <Button 
              size="sm" 
              onClick={() => onFiltersChange(filters)}
            >
              Appliquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}