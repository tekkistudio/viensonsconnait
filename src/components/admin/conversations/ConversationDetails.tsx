// src/components/admin/conversations/ConversationDetails.tsx
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bot, 
  User, 
  Star, 
  Map,
  Globe,
  Smartphone,
  Brain,
  ShoppingCart
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChatbotConversation } from '@/types/chatbot';

interface ConversationDetailsProps {
  conversation: ChatbotConversation;
}

export function ConversationDetails({ conversation }: ConversationDetailsProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const getIntentColor = (intent: string, score: number) => {
    if (intent === 'purchase' && score > 0.7) {
      return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
    }
    switch (intent) {
      case 'purchase':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'information':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      case 'support':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Conversation avec {conversation.metadata?.customerName || 'Visiteur'}
          </h2>
          <Badge 
            className={cn(
              getIntentColor(conversation.intent, conversation.buyingIntent)
            )}
          >
            {conversation.intent === 'purchase' && conversation.buyingIntent > 0.7 && (
              <Star className="w-3 h-3 mr-1" />
            )}
            {conversation.intent === 'purchase' ? 'Intention d\'achat' : 
             conversation.intent === 'information' ? 'Recherche d\'information' : 
             'Support'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Map className="w-4 h-4" />
            {conversation.metadata?.location || 'Non spécifié'}
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            {conversation.metadata?.language || 'FR'}
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="w-4 h-4" />
            {conversation.metadata?.device || 'Non détecté'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.sender === 'user' ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3",
                  message.sender === 'user'
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Bot className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {message.sender === 'user' ? 'Visiteur' : 'Assistant IA'}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {message.content}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {format(new Date(message.timestamp), 'HH:mm')}
                  </span>
                  {message.metadata?.intent && (
                    <Badge variant="outline" className="text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      {message.metadata.intent}
                    </Badge>
                  )}
                  {message.metadata?.productReference && (
                    <Badge variant="outline" className="text-xs">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Ref: {message.metadata.productReference}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Métriques de la conversation */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Taux de complétion
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {Math.round(conversation.analytics.completionRate * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Satisfaction
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {Math.round(conversation.analytics.satisfaction * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Durée
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {Math.round(conversation.analytics.durationInSeconds / 60)}min
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}