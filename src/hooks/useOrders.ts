// src/hooks/useOrders.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function useOrders() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setCount(pendingCount || 0);
    };

    fetchCount();

    // Abonnement aux changements
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        fetchCount
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return count;
}