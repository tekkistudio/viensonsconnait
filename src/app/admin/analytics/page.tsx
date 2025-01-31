'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  MapPin,
  Loader2,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface LocationData {
  name: string;
  revenue: number;
  orders: number;
}

interface AnalyticsData {
  revenue: {
    total: number;
    growth: number;
    chartData: any[];
  };
  orders: {
    total: number;
    completed: number;
    average: number;
  };
  performance: {
    conversionRate: number;
    averageOrderValue: number;
    visitorCount: number;
    topLocations: LocationData[];
  };
}

const initialData: AnalyticsData = {
    revenue: {
      total: 0,
      growth: 0,
      chartData: []
    },
    orders: {
      total: 0,
      completed: 0,
      average: 0
    },
    performance: {
      conversionRate: 0,
      averageOrderValue: 0,
      visitorCount: 0,
      topLocations: []
    }
  };
  
  export default function AnalyticsPage() {
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData>(initialData);
    const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const getTimeframeDate = useCallback(() => {
    const now = new Date();
    let date: Date;
    
    switch (timeframe) {
      case 'week':
        date = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        date = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        date = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        date = new Date(now.setDate(now.getDate() - 7));
    }
    
    return date;
  }, [timeframe]);

  const processLocationData = (orders: any[]): LocationData[] => {
    const locations = orders.reduce((acc, order) => {
      const city = order.city || 'Non spécifié';
      if (!acc[city]) {
        acc[city] = {
          name: city,
          revenue: 0,
          orders: 0
        };
      }
      acc[city].revenue += Number(order.total_amount) || 0;
      acc[city].orders += 1;
      return acc;
    }, {} as Record<string, LocationData>);
  
    return (Object.values(locations) as LocationData[])
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const startDate = getTimeframeDate().toISOString();
      
      console.log('Fetching data from:', startDate);
  
      // Récupération des statistiques mensuelles
      const { data: monthlyStats, error: monthlyError } = await supabase
        .from('monthly_stats')
        .select('*')
        .gte('month', startDate)
        .order('month', { ascending: false });
  
      console.log('Monthly stats response:', monthlyStats);
      console.log('Monthly stats error:', monthlyError);
  
      if (monthlyError) {
        throw new Error(`Error fetching monthly stats: ${monthlyError.message}`);
      }
  
      // Récupération des commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, city, total_amount, status')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(50);
  
      console.log('Orders response:', orders);
      console.log('Orders error:', ordersError);
  
      if (ordersError) {
        throw new Error(`Error fetching orders: ${ordersError.message}`);
      }
  
      if (!monthlyStats?.length) {
        console.log('No monthly stats found');
        setData(initialData);
        return;
      }
  
      const currentPeriod = monthlyStats[0];
      const previousPeriod = monthlyStats[1];
  
      const totalRevenue = monthlyStats.reduce((sum, stat) => 
        sum + (Number(stat.total_sales) || 0), 0);
  
      const growth = previousPeriod
        ? ((Number(currentPeriod.total_sales) / Number(previousPeriod.total_sales)) - 1) * 100
        : 0;
  
      const processedData = {
        revenue: {
          total: totalRevenue,
          growth,
          chartData: monthlyStats.map(stat => ({
            date: new Date(stat.month).toLocaleDateString('fr-FR', {
              month: 'short',
              day: 'numeric'
            }),
            value: Number(stat.total_sales) || 0,
            orders: Number(stat.orders_count) || 0
          }))
        },
        orders: {
          total: orders?.length || 0,
          completed: (orders || []).filter(order => order.status === 'completed').length,
          average: Number(currentPeriod.average_order_value) || 0
        },
        performance: {
          conversionRate: Number(currentPeriod.conversion_rate) || 0,
          averageOrderValue: Number(currentPeriod.average_order_value) || 0,
          visitorCount: Number(currentPeriod.visitors_count) || 0,
          topLocations: processLocationData(orders || [])
        }
      };
  
      console.log('Processed data:', processedData);
      setData(processedData);
  
    } catch (error) {
      console.error('Detailed error in fetchAnalytics:', error);
      toast({
        variant: "error",
        title: "Erreur de chargement",
        description: error instanceof Error ? error.message : "Impossible de charger les statistiques"
      });
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, toast, getTimeframeDate, processLocationData]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white dark:bg-gray-900">
      {/* En-tête avec filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Analysez les performances de votre boutique
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select 
            value={timeframe} 
            onValueChange={(value: 'week' | 'month' | 'year') => setTimeframe(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
              <SelectItem value="year">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">CA Total</p>
              <div className="flex items-center gap-2 truncate">
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatCurrency(data.revenue.total)}
                </p>
                <div className={`hidden md:flex items-center text-sm ${
                  data.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.revenue.growth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(data.revenue.growth).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Commandes</p>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {data.orders.total}
                </p>
                <span className="hidden md:inline text-sm text-gray-500">
                  ({data.orders.completed} terminées)
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Visiteurs</p>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {data.performance.visitorCount}
                </p>
                <div className="hidden md:flex items-center text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  {data.performance.conversionRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Panier moyen</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(data.performance.averageOrderValue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques et analyses détaillées */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Évolution du CA */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Évolution du chiffre d'affaires
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenue.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Chiffre d'affaires"
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '0.5rem'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: "#2563eb" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top villes */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Top villes
            </h3>
          </div>

          <div className="space-y-4">
            {data.performance.topLocations.map((location, index) => (
              <div key={location.name} className="flex items-center">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                  {index + 1}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {location.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({location.orders} commandes)
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {formatCurrency(location.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${(location.revenue / data.revenue.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {data.performance.topLocations.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </Card>

        {/* Performance des ventes */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Performance des ventes
            </h3>
          </div>

          <div className="space-y-4">
            {/* Taux de conversion */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Taux de conversion</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.performance.conversionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${data.performance.conversionRate}%` }}
                />
              </div>
            </div>

            {/* Taux de complétion des commandes */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Commandes complétées</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.orders.total > 0 
                    ? ((data.orders.completed / data.orders.total) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ 
                    width: data.orders.total > 0 
                      ? `${(data.orders.completed / data.orders.total) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>

            {/* Panier moyen */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Panier moyen</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(data.performance.averageOrderValue)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.min((data.performance.averageOrderValue / 15000) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Évolution du nombre de commandes */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Évolution du nombre de commandes
          </h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.revenue.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: any) => [`${value} commandes`, "Commandes"]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.5rem'
                }}
              />
              <Bar 
                dataKey="orders" 
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}