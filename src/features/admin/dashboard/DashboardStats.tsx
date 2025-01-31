// src/features/admin/dashboard/DashboardStats.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Types pour les commandes récentes
interface RecentOrder {
  id: string;
  customer_name: string;
  product_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// Types pour les données de vente
interface SalesDataPoint {
  time: string;
  value: number;
}

interface DashboardStats {
  dailySales: number;
  salesGrowth: number;
  orderCount: number;
  readyToOrder: number;
  activeConversations: number;
  conversationsGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  monthlyAverageConversion: number;
  totalSales: number;
  recentOrders: RecentOrder[];
  salesData: SalesDataPoint[];
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    dailySales: 0,
    salesGrowth: 0,
    orderCount: 0,
    readyToOrder: 0,
    activeConversations: 0,
    conversationsGrowth: 0,
    conversionRate: 0,
    conversionGrowth: 0,
    monthlyAverageConversion: 0,
    totalSales: 0,
    recentOrders: [],
    salesData: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = yesterday.toISOString();

      // Récupérer les ventes du jour
      const { data: todaySales } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', todayIso);

      // Récupérer les ventes d'hier
      const { data: yesterdaySales } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', yesterdayIso)
        .lt('created_at', todayIso);

      // Récupérer les commandes récentes
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      // Récupérer les conversations actives
      const { data: activeConvs } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active');

      // Récupérer les conversations prêtes à commander
      const { count: readyCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('intent', 'purchase');

      // Calculer les statistiques
      const todayTotal = todaySales?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const yesterdayTotal = yesterdaySales?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      const salesGrowth = yesterdayTotal ? 
        ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;

      // Organiser les données de vente par heure
      const hourlyData = processHourlySales(todaySales || []);

      setStats({
        dailySales: todayTotal,
        salesGrowth: Number(salesGrowth.toFixed(1)),
        orderCount: todaySales?.length || 0,
        readyToOrder: readyCount || 0,
        activeConversations: activeConvs?.length || 0,
        conversationsGrowth: 0,
        conversionRate: 45, // Temporaire, à calculer avec de vraies données
        conversionGrowth: 2.3, // Temporaire, à calculer avec de vraies données
        monthlyAverageConversion: 37, // Temporaire, à calculer avec de vraies données
        totalSales: todayTotal,
        recentOrders: recentOrders || [],
        salesData: hourlyData
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processHourlySales = (data: any[]): SalesDataPoint[] => {
    const hourlyMap = new Map<number, number>();
    let runningTotal = 0;

    // Initialiser toutes les heures de la journée
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0);
    }

    // Remplir avec les données réelles
    data.forEach((sale) => {
      const hour = new Date(sale.created_at).getHours();
      const amount = sale.total_amount || 0;
      runningTotal += amount;
      hourlyMap.set(hour, runningTotal);
    });

    return Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, value]) => ({
        time: `${hour.toString().padStart(2, '0')}:00`,
        value
      }));
  };

  useEffect(() => {
    fetchStats();

    // Souscrire aux mises à jour en temps réel
    const ordersSubscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => fetchStats()
      )
      .subscribe();

    const conversationsSubscription = supabase
      .channel('conversations_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
    };
  }, []);

  return { stats, isLoading };
}