// src/hooks/useChatbotConversations.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import type { 
  ChatbotConversation, 
  ChatbotMetrics, 
  ChatbotIntent,
  ChatbotStatus,
  BuyingIntentLevel 
} from '@/types/chatbot';

interface ChatbotFilters {
  intent?: ChatbotIntent;
  buyingIntent?: BuyingIntentLevel;
  status?: ChatbotStatus;
  timeFrame?: '24h' | '7days' | '30days' | 'all';
  hasViewedProducts?: boolean;
  searchTerm?: string;
}

const initialMetrics: ChatbotMetrics = {
  totalConversations: 0,
  avgBuyingIntent: 0,
  conversionRate: 0,
  topQuestions: [],
  productInterest: []
};

export function useChatbotConversations() {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatbotConversation | null>(null);
  const [metrics, setMetrics] = useState<ChatbotMetrics>(initialMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChatbotFilters>({
    timeFrame: '7days'
  });

  const calculateMetrics = useCallback((data: ChatbotConversation[]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setMetrics(initialMetrics);
      return;
    }

    const totalConversations = data.length;

    // Calcul de la moyenne d'intention d'achat
    const totalBuyingIntent = data.reduce((sum, conv) => {
      return sum + (conv.buyingIntent || 0);
    }, 0);
    const avgBuyingIntent = totalBuyingIntent / totalConversations;

    // Calcul du taux de conversion
    const completedConversations = data.filter(conv => conv.status === 'completed').length;
    const conversionRate = (completedConversations / totalConversations) * 100;

    // Analyse des questions fréquentes
    const questions = data.reduce((acc, conv) => {
      if (!conv.messages || !Array.isArray(conv.messages)) return acc;
      
      const userMessages = conv.messages
        .filter(msg => msg?.sender === 'user' && msg?.content)
        .map(msg => msg.content);
      
      return [...acc, ...userMessages];
    }, [] as string[]);

    const questionFrequency = questions.reduce((acc, q) => {
      if (!q) return acc;
      acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyse de l'intérêt pour les produits
    const productViews = data.reduce((acc, conv) => {
      const products = conv.metadata?.viewedProducts || [];
      return [...acc, ...products];
    }, [] as string[]);

    const productInterest = Object.entries(
      productViews.reduce((acc, productId) => {
        if (!productId) return acc;
        acc[productId] = (acc[productId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([productId, count]) => ({
      productId,
      productName: 'Produit ' + productId,
      interestCount: count
    }));

    setMetrics({
      totalConversations,
      avgBuyingIntent,
      conversionRate,
      topQuestions: Object.entries(questionFrequency)
        .map(([question, frequency]) => ({ question, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5),
      productInterest: productInterest
        .sort((a, b) => b.interestCount - a.interestCount)
        .slice(0, 5)
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('conversations')
        .select(`
          *,
          conversation_analytics (*)
        `)
        .eq('type', 'chatbot');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.intent) {
        query = query.eq('intent', filters.intent);
      }
      if (filters?.buyingIntent) {
        const intentRanges = {
          high: [0.7, 1],
          medium: [0.4, 0.7],
          low: [0, 0.4]
        };
        const range = intentRanges[filters.buyingIntent];
        query = query
          .gte('buying_intent', range[0])
          .lt('buying_intent', range[1]);
      }
      if (filters?.timeFrame && filters?.timeFrame !== 'all') {
        const now = new Date();
        let fromDate = new Date();
        switch (filters.timeFrame) {
          case '24h':
            fromDate.setDate(now.getDate() - 1);
            break;
          case '7days':
            fromDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            fromDate.setDate(now.getDate() - 30);
            break;
        }
        query = query.gte('created_at', fromDate.toISOString());
      }

      const { data, error: fetchError } = await query
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Normalisation des données
      const validData = (data || []).map(conv => ({
        ...conv,
        messages: conv.messages || [],
        metadata: conv.metadata || {},
        analytics: conv.analytics || {
          completionRate: 0,
          satisfaction: 0,
          durationInSeconds: 0
        },
        buyingIntent: conv.buying_intent || 0
      })) as ChatbotConversation[];

      setConversations(validData);
      calculateMetrics(validData);

    } catch (err) {
      console.error('Error fetching chatbot conversations:', err);
      setError('Impossible de charger les conversations');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations"
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, calculateMetrics]);

  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find(c => c.id === id);
    setSelectedConversation(conversation || null);
  }, [conversations]);

  useEffect(() => {
    fetchConversations();

    const subscription = supabase
      .channel('chatbot_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: 'type=eq.chatbot'
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
    metrics,
    isLoading,
    error,
    filters,
    setFilters,
    selectConversation,
    refreshConversations: fetchConversations
  };
}