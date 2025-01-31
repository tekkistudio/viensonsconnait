// src/app/admin/hooks/useDashboardCounters.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DashboardCounters {
  pendingOrders: number;
  activeConversations: number;
  unreadMessages: number;
}

export function useDashboardCounters() {
  const [counters, setCounters] = useState<DashboardCounters>({
    pendingOrders: 0,
    activeConversations: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounters();
    subscribeToChanges();
  }, []);

  const fetchCounters = async () => {
    try {
      // Compteur des commandes en attente
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Compteur des conversations actives
      const { count: activeConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Compteur des messages non lus
      const { count: unreadMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('sender_type', 'customer');

      setCounters({
        pendingOrders: pendingOrders || 0,
        activeConversations: activeConversations || 0,
        unreadMessages: unreadMessages || 0
      });
    } catch (error) {
      console.error('Error fetching counters:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    // S'abonner aux changements des commandes
    const ordersSubscription = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    // S'abonner aux changements des conversations
    const conversationsSubscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    // S'abonner aux nouveaux messages
    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  };

  return { ...counters, loading };
}