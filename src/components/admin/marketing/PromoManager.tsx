// src/components/admin/marketing/PromoManager.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tag,
  PercentCircle,
  Gift
} from 'lucide-react';

interface PromoManagerProps {
  onCreatePromo: () => void;
}

export function PromoManager({ onCreatePromo }: PromoManagerProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Promotions et Codes Promo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos offres promotionnelles
          </p>
        </div>
        <Button onClick={onCreatePromo}>
          Nouvelle promotion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Codes actifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <PercentCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Utilisation moyenne</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24%</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Récompenses données</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">156</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Liste des promotions ici */}
      </div>
    </Card>
  );
}

