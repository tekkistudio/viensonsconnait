// src/components/admin/conversations/ConversationMetadata.tsx
import React from 'react';
import {
  Tag,
  Map,
  Clock,
  ShoppingCart,
  Smartphone,
  Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Conversation {
  id: string;
  status: string;
  created_at: string;
  metadata?: {
    device?: string;
    language?: string;
    viewed_products?: string[];
    location?: string;
    intent?: 'purchase' | 'inquiry' | 'support';
    has_order?: boolean;
  } | null;
}

interface ConversationMetadataProps {
  conversation: Conversation;
}

const formatDuration = (startTime: string): string => {
  const duration = new Date().getTime() - new Date(startTime).getTime();
  const minutes = Math.floor(duration / 1000 / 60);
  
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const ConversationMetadata: React.FC<ConversationMetadataProps> = ({ conversation }) => {
  const getIntentColor = (intent?: 'purchase' | 'inquiry' | 'support') => {
    switch (intent) {
      case 'purchase':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inquiry':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'support':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Informations conversation
        </h4>
        <Badge variant="outline" className="text-xs">
          {conversation.status}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Tag className="w-4 h-4" />
          <span className="flex-1">Intent</span>
          <Badge className={getIntentColor(conversation.metadata?.intent)}>
            {conversation.metadata?.intent || 'Non spécifié'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Map className="w-4 h-4" />
          <span className="flex-1">Localisation</span>
          <span>{conversation.metadata?.location || 'Non spécifié'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="flex-1">Durée</span>
          <span>{formatDuration(conversation.created_at)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <ShoppingCart className="w-4 h-4" />
          <span className="flex-1">Produits consultés</span>
          <span>{conversation.metadata?.viewed_products?.length || 0}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Smartphone className="w-4 h-4" />
          <span className="flex-1">Appareil</span>
          <span>{conversation.metadata?.device || 'Non détecté'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Globe className="w-4 h-4" />
          <span className="flex-1">Langue</span>
          <span>{conversation.metadata?.language || 'FR'}</span>
        </div>
      </div>
    </Card>
  );
};

export default ConversationMetadata;