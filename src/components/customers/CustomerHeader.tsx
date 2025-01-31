import React from 'react';
import { Download, List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface CustomerHeaderProps {
  onExport: () => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export function CustomerHeader({ 
  onExport, 
  viewMode, 
  onViewModeChange 
}: CustomerHeaderProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Clients
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gérez votre base clients et suivez leurs activités
        </p>
      </div>
      
      <div className="flex gap-2 items-center">
        {/* Bouton de vue uniquement sur desktop */}
        {!isMobile && (
          <div className="border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Button 
          onClick={onExport}
          variant="secondary"
          className="gap-2 bg-pink-500 hover:bg-pink-600 text-white"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exporter</span>
        </Button>
      </div>
    </div>
  );
}