// src/components/admin/marketing/AdAccountManager.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Facebook,
  Instagram,
  Search as Google,
  Music as TikTok
} from 'lucide-react';

interface AdAccountManagerProps {
  onConnect: (platform: string) => void;
}

export function AdAccountManager({ onConnect }: AdAccountManagerProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comptes Publicitaires
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connectez et gérez vos comptes publicitaires
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-dashed">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <Facebook className="w-6 h-6 text-blue-600" />
              <Instagram className="w-6 h-6 text-pink-600" />
            </div>
            <h4 className="font-medium">Meta Ads</h4>
            <Button
              variant="outline"
              onClick={() => onConnect('meta')}
              className="w-full"
            >
              Connecter
            </Button>
          </div>
        </Card>

        <Card className="p-4 border-2 border-dashed">
          <div className="flex flex-col items-center gap-4">
            <Google className="w-6 h-6 text-yellow-600" />
            <h4 className="font-medium">Google Ads</h4>
            <Button
              variant="outline"
              onClick={() => onConnect('google')}
              className="w-full"
            >
              Connecter
            </Button>
          </div>
        </Card>

        <Card className="p-4 border-2 border-dashed">
          <div className="flex flex-col items-center gap-4">
            <TikTok className="w-6 h-6 text-black dark:text-white" />
            <h4 className="font-medium">TikTok Ads</h4>
            <Button
              variant="outline"
              onClick={() => onConnect('tiktok')}
              className="w-full"
            >
              Connecter
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-500 text-center">
              Plus d'intégrations à venir...
            </p>
          </div>
        </Card>
      </div>
    </Card>
  );
}

