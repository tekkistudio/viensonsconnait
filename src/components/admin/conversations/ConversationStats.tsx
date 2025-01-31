// src/components/admin/conversations/ConversationStats.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare,
  CircleDot,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';

interface ConversationStatsProps {
  stats: {
    activeConversations: number;
    totalConversations: number;
    pendingConversations: number;
    readyToOrder: number;
    averageResponseTime: number;
    conversionRate: number;
  };
}

const ConversationStats: React.FC<ConversationStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total conversations
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalConversations}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <CircleDot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Conversations actives
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.activeConversations}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Temps de réponse moyen
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.averageResponseTime}m
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Taux de conversion
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.conversionRate}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConversationStats;