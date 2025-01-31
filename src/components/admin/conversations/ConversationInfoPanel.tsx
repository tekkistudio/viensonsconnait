// components/conversations/ConversationInfoPanel.tsx
'use client';

import { Star, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types/conversations';

interface ConversationInfoPanelProps {
  conversation: Conversation;
  className?: string;
}

export function ConversationInfoPanel({
  conversation,
  className
}: ConversationInfoPanelProps) {
  return (
    <ScrollArea className={className}>
      <div className="space-y-6 p-4">
        {/* Informations client */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Informations client
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              Location: {conversation.metadata?.location || 'Non spécifié'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Appareil: {conversation.metadata?.device || 'Non détecté'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Langue: {conversation.metadata?.language || 'FR'}
            </p>
          </div>
        </div>

        {/* Métriques IA */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Performance IA
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Pertinence</span>
                <span className="text-gray-900 dark:text-white">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: '85%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">
                  Satisfaction client
                </span>
                <span className="text-gray-900 dark:text-white">90%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: '90%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Actions
          </h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-sm">
              <Star className="w-4 h-4 mr-2" />
              Marquer comme important
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Transférer la conversation
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}