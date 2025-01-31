// src/app/admin/conversations/page.tsx
'use client';

import { useState } from 'react';
import { 
  MessageCircle, 
  CircleDot,
  Clock,
  Star,
  Search,
  Filter,
  MoreVertical,
  ChevronLeft
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from '@/components/ui/use-toast';
import { ConversationList } from '../../../components/admin/conversations/ConversationList';
import { ChatArea } from '../../../components/admin/conversations/ChatArea';
import { ConversationInfoPanel } from '../../../components/admin/conversations/ConversationInfoPanel';
import { useConversationsPage } from '@/hooks/useConversationsPage';

interface FiltersState {
  intent?: string;
  hasOrder?: boolean;
  dateBefore?: Date;
  dateAfter?: Date;
}

export default function ConversationsPage() {
  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isMobileListVisible, setIsMobileListVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});

  const handleAdvancedFiltersChange = (newFilters: FiltersState) => {
    setAdvancedFilters(newFilters);
  };


  // Custom hook pour la gestion des conversations
  const {
    conversations,
    selectedConversation,
    messages,
    stats,
    isLoading,
    error,
    setSelectedConversation,
    sendMessage
  } = useConversationsPage();

  const { toast } = useToast();

  // Filtrer les conversations
  const filteredConversations = conversations.filter(conversation => {
    // Filtre de statut
    if (statusFilter !== 'all' && conversation.status !== statusFilter) {
      return false;
    }

    // Filtre de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        conversation.metadata?.customer_name?.toLowerCase().includes(searchLower) ||
        conversation.last_message?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Gérer la sélection d'une conversation sur mobile
  const handleConversationSelect = (id: string) => {
    setSelectedConversation(id);
    setIsMobileListVisible(false);
  };

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-6 bg-white dark:bg-gray-900">
      {/* En-tête et statistiques */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              Conversations
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Gérez vos conversations clients
            </p>
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <CircleDot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Actives</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.active}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">En attente</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.pending}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prêts à commander
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.readyToOrder}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Interface principale */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm h-[calc(100vh-14rem)]">
        <div className="flex h-full">
          {/* Liste des conversations (desktop) */}
          <div className="hidden md:flex md:w-80 lg:w-96 flex-col border-r border-gray-200 dark:border-gray-700">
            {/* Filtres */}
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
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="closed">Terminés</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres
                </Button>
              </div>
            </div>

            {/* Liste */}
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
              isLoading={isLoading}
            />
          </div>

          {/* Liste des conversations (mobile) */}
          <Sheet open={isMobileListVisible} onOpenChange={setIsMobileListVisible}>
            <SheetContent side="left" className="w-full p-0">
              <SheetHeader className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4">
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
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actifs</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="closed">Terminés</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtres
                  </Button>
                </div>
              </div>
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversation}
                onSelect={handleConversationSelect}
                isLoading={isLoading}
              />
            </SheetContent>
          </Sheet>

          {/* Zone de chat */}
          <div className="flex-1 flex">
            {selectedConversationData ? (
              <div className="flex-1 flex">
                {/* Chat principal */}
                <div className="flex-1 flex flex-col">
                  {/* En-tête conversation */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setIsMobileListVisible(true)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {selectedConversationData.metadata?.customer_name || 'Client inconnu'}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <ChatArea
                    conversation={selectedConversationData}
                    messages={messages}
                    onSendMessage={sendMessage}
                  />
                </div>

                {/* Panel d'informations */}
                <div className="hidden lg:block w-80 border-l border-gray-200 dark:border-gray-700">
                  <ConversationInfoPanel conversation={selectedConversationData} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}