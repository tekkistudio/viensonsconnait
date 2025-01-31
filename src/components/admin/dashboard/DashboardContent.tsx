// src/components/admin/dashboard/DashboardContent.tsx
'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { 
  ShoppingBag, 
  MessageSquare, 
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useStorageCleanup } from '@/hooks/useStorageCleanup';
import StoreSelector from '@/components/admin/StoreSelector';
import { toast } from '@/components/ui/use-toast';

// Types
interface User {
  firstName: string;
  email: string;
}

interface DashboardStats {
  dailySales: number;
  salesGrowth: number;
  orderCount: number;
  activeConversations: number;
  conversationsGrowth: number;
  readyToOrder: number;
  conversionRate: number;
  conversionGrowth: number;
  monthlyAverageConversion: number;
  totalSales: number;
  salesData: Array<{ time: string; value: number }>;
  recentOrders: Array<{
    id: string;
    customer_name: string;
    total_amount: number;
    status: string;
    updated_at: string;
  }>;
}

// Composants réutilisables
const StatCard = ({ 
  icon: Icon, 
  title, 
  value, 
  growth, 
  subtitle, 
  href 
}: { 
  icon: any;
  title: string;
  value: string | number;
  growth: number;
  subtitle: string;
  href: string;
}) => (
  <Card className="bg-white dark:bg-gray-800 shadow-sm h-full">
    <div className="p-4 md:p-6 flex flex-col h-full">
      <div className="flex items-center gap-2">
        <div className={cn(
          "p-2 rounded-lg",
          title.includes("Ventes") ? "bg-emerald-50 dark:bg-emerald-500/10" :
          title.includes("Conversations") ? "bg-blue-50 dark:bg-blue-500/10" :
          "bg-purple-50 dark:bg-purple-500/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            title.includes("Ventes") ? "text-emerald-600 dark:text-emerald-400" :
            title.includes("Conversations") ? "text-blue-600 dark:text-blue-400" :
            "text-purple-600 dark:text-purple-400"
          )} />
        </div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex-1">{title}</h3>
        {growth > 0 && (
          <div className="flex items-center text-sm text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-4 h-4" />
            +{growth}%
          </div>
        )}
      </div>
      
      <div className="flex-1 mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{subtitle}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <Link href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
            Voir détails
          </Link>
        </div>
      </div>
    </div>
  </Card>
);

const OrderItem = ({ order }: { order: DashboardStats['recentOrders'][0] }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
      case 'processing': return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
      default: return 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg gap-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/80">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {order.total_amount?.toLocaleString()} FCFA
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-xs font-medium",
          getStatusColor(order.status)
        )}>
          {order.status}
        </span>
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          {new Date(order.updated_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default function DashboardContent() {
  console.log('DashboardContent mounting');
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useStorageCleanup();

  const fetchData = useCallback(async () => {
    console.log('Fetching dashboard data...');
    let isSubscribed = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log('Session found, fetching user data...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      if (userData && isSubscribed) {
        console.log('User data fetched successfully');
        setUser({
          firstName: userData.name.split(' ')[0],
          email: userData.email
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log('Fetching dashboard stats...');
      const [ordersResponse, chatsResponse, recentOrdersResponse] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, updated_at, status')
          .gte('updated_at', today.toISOString()),
        supabase
          .from('conversations')
          .select('id, status')
          .eq('status', 'active'),
        supabase
          .from('orders')
          .select('id, customer_name, total_amount, status, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (chatsResponse.error) throw chatsResponse.error;
      if (recentOrdersResponse.error) throw recentOrdersResponse.error;

      console.log('All data fetched successfully');

      const todayOrders = ordersResponse.data || [];
      const activeChats = chatsResponse.data || [];
      const recentOrders = recentOrdersResponse.data || [];

      const dailySales = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const orderCount = todayOrders.length;

      const salesByHour = new Array(24).fill(0);
      todayOrders.forEach(order => {
        const hour = new Date(order.updated_at).getHours();
        salesByHour[hour] += order.total_amount || 0;
      });

      const salesData = salesByHour.map((value, index) => ({
        time: `${index.toString().padStart(2, '0')}:00`,
        value
      }));

      if (isSubscribed) {
        console.log('Setting dashboard stats...');
        setStats({
          dailySales,
          salesGrowth: 5,
          orderCount,
          activeConversations: activeChats.length,
          conversationsGrowth: 2,
          readyToOrder: activeChats.filter(chat => chat.status === 'ready_to_order').length,
          conversionRate: 45,
          conversionGrowth: 2.3,
          monthlyAverageConversion: 37,
          totalSales: dailySales,
          salesData,
          recentOrders
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (isSubscribed) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les données du tableau de bord"
        });
      }
    } finally {
      if (isSubscribed) {
        console.log('Fetch complete, setting loading to false');
        setIsLoading(false);
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    console.log('Setting up dashboard data fetching...');
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 secondes
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    console.log('Dashboard is loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (error) {
    console.log('Dashboard encountered an error:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Impossible de charger les données
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats || !user) {
    console.log('No stats or user data available');
    return null;
  }

  console.log('Rendering dashboard content...');
  return (
    <div className="space-y-6 p-4 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header avec sélecteur de boutique */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return "Bonjour";
              if (hour >= 12 && hour < 18) return "Bon après-midi";
              return "Bonsoir";
            })()}, {user.firstName ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase() : ''} 👋🏽
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Voici un aperçu de votre business aujourd'hui
          </p>
        </div>
        <StoreSelector />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          icon={ShoppingBag}
          title="Ventes du jour"
          value={`${stats.dailySales.toLocaleString()} FCFA`}
          growth={stats.salesGrowth}
          subtitle={`${stats.orderCount} commandes`}
          href="/admin/orders"
        />
        <StatCard
          icon={MessageSquare}
          title="Conversations actives"
          value={stats.activeConversations}
          growth={stats.conversationsGrowth}
          subtitle={`${stats.readyToOrder} prêts à commander`}
          href="/admin/conversations"
        />
        <StatCard
          icon={TrendingUp}
          title="Taux de conversion"
          value={`${stats.conversionRate}%`}
          growth={stats.conversionGrowth}
          subtitle={`Moyenne du mois: ${stats.monthlyAverageConversion}%`}
          href="/admin/analytics"
        />
      </div>

      {/* Graphique et Commandes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
        {/* Graphique des ventes */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white">Ventes aujourd'hui</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {stats.totalSales.toLocaleString()} FCFA
              </p>
            </div>
            
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={stats.salesData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(time) => time.split(':')[0] + 'h'}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length || !payload[0]?.value) {
                        return null;
                      }
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            {label}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {`${Number(payload[0].value).toLocaleString()} FCFA`}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      fill: "#2563eb",
                      stroke: "#fff",
                      strokeWidth: 2
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Commandes récentes */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white">Commandes récentes</h3>
              <Link 
                href="/admin/orders" 
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Voir toutes
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {stats.recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <OrderItem key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucune commande récente
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    Les commandes récentes apparaîtront ici dès que vous en recevrez.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}