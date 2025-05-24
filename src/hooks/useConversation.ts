// hooks/useConversations.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function useConversations() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: activeCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      setCount(activeCount || 0);
    };

    fetchCount();

    // Abonnement aux changements
    const subscription = supabase
      .channel('conversations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        fetchCount
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return count;
}