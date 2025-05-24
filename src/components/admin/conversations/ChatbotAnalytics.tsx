// src/components/admin/conversations/ChatbotAnalytics.tsx
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, ShoppingBag } from 'lucide-react';
import type { ChatbotMetrics } from '@/types/chatbot';

interface ChatbotAnalyticsProps {
  metrics: ChatbotMetrics;
  className?: string;
}

export function ChatbotAnalytics({ metrics, className }: ChatbotAnalyticsProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Questions fréquentes */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Questions fréquentes
            </h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {metrics.topQuestions.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start justify-between"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 pr-4">
                    {item.question}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.frequency}x
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Intérêt produits */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Produits populaires
            </h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {metrics.productInterest.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start justify-between"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 pr-4">
                    {item.productName}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.interestCount} vues
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}