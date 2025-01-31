// components/conversations/ConversationList.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Star, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types/conversations';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  className,
  isLoading = false
}: ConversationListProps) {
  const getStatusColor = (status: Conversation['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'closed':
        return 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const getIntentBadge = (intent?: string) => {
    switch (intent) {
      case 'purchase':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            <Star className="w-3 h-3" />
            Achat
          </span>
        );
      case 'support':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
            Support
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex space-x-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[calc(100vh-15rem)]", className)}>
      <div className="space-y-px">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "w-full p-4 text-left transition-colors",
              "hover:bg-gray-50 dark:hover:bg-gray-800/50",
              "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue",
              selectedId === conversation.id ? "bg-gray-50 dark:bg-gray-800/50" : "",
              "relative"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    {conversation.metadata?.customer_name?.[0] || '?'}
                  </span>
                </div>
                {conversation.status === 'active' && (
                  <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {conversation.metadata?.customer_name || 'Client inconnu'}
                  </span>
                  <div className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conversation.updated_at), 'HH:mm')}
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                  {conversation.last_message || 'Nouvelle conversation'}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                <Badge 
                    variant="outline" 
                    className={cn(getStatusColor(conversation.status))}
                    >
                    {conversation.status}
                </Badge>
                  
                  {getIntentBadge(conversation.metadata?.intent)}

                  {conversation.metadata?.location && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {conversation.metadata.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}