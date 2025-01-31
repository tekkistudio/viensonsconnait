// src/components/admin/marketing/CampaignManager.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';

interface CampaignManagerProps {
  onCreateCampaign: () => void;
}

export function CampaignManager({ onCreateCampaign }: CampaignManagerProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Campagnes Marketing
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos campagnes WhatsApp, SMS et réseaux sociaux
          </p>
        </div>
        <Button onClick={onCreateCampaign} className="bg-brand-blue hover:bg-brand-blue/90">
          Nouvelle campagne
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Campagnes actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Planifiées</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Audience totale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2.4k</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-gray-500">Taux d'engagement</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12.5%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Liste des campagnes ici */}
      </div>
    </Card>
  );
}