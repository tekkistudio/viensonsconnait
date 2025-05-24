// src/app/admin/conversations/page.tsx
'use client';

import { useState } from 'react';
import { 
  MessageCircle, 
  CircleDot,
  Clock,
  Star,
  Search,
  BarChart3
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChatbotConversations } from '@/hooks/useChatbotConversations';
import { ChatbotMetricsCard } from '@/components/admin/conversations/ChatbotMetricsCard';
import { ConversationList } from '@/components/admin/conversations/ConversationList';
import { ConversationDetails } from '@/components/admin/conversations/ConversationDetails';
import { ChatbotAnalytics } from '@/components/admin/conversations/ChatbotAnalytics';
import type { ChatbotIntent, BuyingIntentLevel, ChatbotStatus } from '@/types/chatbot';

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const {
    conversations,
    selectedConversation,
    metrics,
    isLoading,
    filters,
    setFilters,
    selectConversation
  } = useChatbotConversations();

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.metadata?.customerName?.toLowerCase().includes(searchLower) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-6 bg-white dark:bg-gray-900">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              Conversations Chatbot
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Analysez les interactions de vos visiteurs avec le chatbot
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="w-4 h-4" />
            {showAnalytics ? 'Masquer les analyses' : 'Voir les analyses'}
          </Button>
        </div>
      </div>

      {/* Métriques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <ChatbotMetricsCard
          icon={<MessageCircle className="w-4 h-4" />}
          title="Total conversations"
          value={metrics.totalConversations}
          colorClass="text-blue-600"
        />
        <ChatbotMetricsCard
          icon={<Star className="w-4 h-4" />}
          title="Intention d'achat moyenne"
          value={`${Math.round(metrics.avgBuyingIntent * 100)}%`}
          colorClass="text-yellow-600"
        />
        <ChatbotMetricsCard
          icon={<CircleDot className="w-4 h-4" />}
          title="Taux de conversion"
          value={`${Math.round(metrics.conversionRate)}%`}
          colorClass="text-green-600"
        />
        <ChatbotMetricsCard
          icon={<Clock className="w-4 h-4" />}
          title="En attente"
          value={conversations.filter(c => c.status === 'active').length}
          colorClass="text-purple-600"
        />
      </div>

      {/* Section analytique */}
      {showAnalytics && (
        <ChatbotAnalytics metrics={metrics} className="mb-6" />
      )}

      {/* Interface principale */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm h-[calc(100vh-17rem)]">
        <div className="flex h-full">
          {/* Filtres et liste */}
          <div className="w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={filters.intent}
                  onValueChange={(value) => setFilters({ ...filters, intent: value as ChatbotIntent })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Intention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="purchase">Achat</SelectItem>
                    <SelectItem value="information">Information</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value as ChatbotStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">En cours</SelectItem>
                    <SelectItem value="completed">Terminées</SelectItem>
                    <SelectItem value="abandoned">Abandonnées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id || null} 
              onSelect={selectConversation}
              isLoading={isLoading}
            />
          </div>

          {/* Zone de détails */}
          <div className="flex-1">
            {selectedConversation ? (
              <ConversationDetails conversation={selectedConversation} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}