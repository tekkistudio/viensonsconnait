// hooks/useConversationsPage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import type { Conversation, ConversationStats, Message } from '@/types/conversations';

const initialStats: ConversationStats = {
  total: 0,
  active: 0,
  pending: 0,
  readyToOrder: 0,
  aiPerformance: 85,
  averageResponseTime: 3,
  customerSatisfaction: 90
};

export function useConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setConversations(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Erreur lors du chargement des conversations');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateStats = useCallback((conversations: Conversation[]) => {
    const total = conversations.length;
    const active = conversations.filter(c => c.status === 'active').length;
    const pending = conversations.filter(c => c.status === 'pending').length;
    const readyToOrder = conversations.filter(
      c => c.metadata?.intent === 'purchase' && !c.metadata?.has_order
    ).length;

    setStats({
      ...initialStats,
      total,
      active,
      pending,
      readyToOrder
    });
  }, []);

  const sendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return;

    try {
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation,
          content: content.trim(),
          sender_type: 'admin',
          metadata: {
            timestamp: new Date().toISOString()
          }
        });

      if (messageError) throw messageError;

      await fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message"
      });
    }
  };

  useEffect(() => {
    fetchConversations();

    const subscription = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchConversations]);

  return {
    conversations,
    selectedConversation,
    messages,
    stats,
    isLoading,
    error,
    setSelectedConversation,
    sendMessage,
    refreshConversations: fetchConversations
  };
}