import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from 'lucide-react';
import { countries } from '@/lib/data/countries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterContentProps {
  activeSegment: string;
  selectedCountry: string;
  onSegmentChange: (segment: string) => void;
  onCountryChange: (country: string) => void;
  segments: Array<{ id: string; name: string }>;
  onClose?: () => void;
}

function FilterContent({ 
  activeSegment,
  selectedCountry,
  onSegmentChange,
  onCountryChange,
  segments,
  onClose
}: FilterContentProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Segments
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {segments.map((segment) => (
            <Button
              key={segment.id}
              variant={activeSegment === segment.id ? "default" : "outline"}
              onClick={() => {
                onSegmentChange(segment.id);
                onClose?.();
              }}
              className="w-full"
            >
              {segment.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Pays
        </h3>
        <Select 
          value={selectedCountry} 
          onValueChange={(value) => {
            onCountryChange(value);
            onClose?.();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <div className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(activeSegment !== 'all' || selectedCountry !== 'all') && (
        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              onSegmentChange('all');
              onCountryChange('all');
              onClose?.();
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}

interface CustomerFiltersProps extends FilterContentProps {
  activeFiltersCount: number;
}

export function CustomerFilters(props: CustomerFiltersProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = React.useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {props.activeFiltersCount > 0 && (
              <Badge 
                className="ml-2 bg-brand-blue text-white" 
                variant="outline"
              >
                {props.activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <FilterContent {...props} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtres
          {props.activeFiltersCount > 0 && (
            <Badge 
              className="ml-2 bg-brand-blue text-white" 
              variant="outline"
            >
              {props.activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filtres</DialogTitle>
        </DialogHeader>
        <FilterContent {...props} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}