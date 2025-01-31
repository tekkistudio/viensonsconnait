// src/components/admin/conversations/ConversationFilters.tsx
import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ConversationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filter: 'all' | 'active' | 'pending' | 'closed';
  onFilterChange: (value: 'all' | 'active' | 'pending' | 'closed') => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher une conversation..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="active">Actives</SelectItem>
          <SelectItem value="pending">En attente</SelectItem>
          <SelectItem value="closed">Terminées</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Période
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <Select 
            value={dateRange} 
            onValueChange={onDateRangeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="yesterday">Hier</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>

      <Button variant="outline" className="gap-2">
        <Filter className="w-4 h-4" />
        Plus de filtres
      </Button>
    </div>
  );
};

export default ConversationFilters;