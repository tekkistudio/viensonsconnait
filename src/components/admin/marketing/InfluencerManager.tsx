// src/components/admin/marketing/InfluencerManager.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Star,
  TrendingUp,
  ShoppingBag
} from 'lucide-react';

interface InfluencerManagerProps {
  onAddInfluencer: () => void;
}

export function InfluencerManager({ onAddInfluencer }: InfluencerManagerProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Marketing d'Influence
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos partenariats avec les influenceurs
          </p>
        </div>
        <Button onClick={onAddInfluencer}>
          Ajouter un influenceur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Influenceurs actifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">15</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-500">Performance moyenne</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Taux de conversion</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">3.2%</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Ventes générées</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">324</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Liste des influenceurs ici */}
      </div>
    </Card>
  );
}