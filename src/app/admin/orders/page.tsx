// src/app/admin/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Package, 
  Check, 
  X, 
  AlertCircle,
  Truck,
  Search,
  Phone,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NewOrderDialog } from '@/components/admin/orders/NewOrderDialog';
import { OrderFilters } from '@/components/admin/orders/OrderFilters';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { 
  Order, 
  OrderStatus, 
  OrderFilters as OrderFiltersType, 
  TimeFilter, 
  OrderStats 
} from '@/types/orders';

const initialStats: OrderStats = {
  total: 0,
  pending: 0,
  confirmed: 0,
  delivered: 0,
  totalRevenue: 0,
  averageOrderValue: 0
};

const ITEMS_PER_PAGE = 50;

const getDateForTimeFilter = (filter: TimeFilter): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'today':
      return {
        from: today,
        to: now
      };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: yesterday,
        to: today
      };
    }
    case '7days': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        from: sevenDaysAgo,
        to: now
      };
    }
    case '30days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        from: thirtyDaysAgo,
        to: now
      };
    }
    case '365days': {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return {
        from: yearAgo,
        to: now
      };
    }
    default:
      return {
        from: new Date(0),
        to: now
      };
  }
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<OrderFiltersType>({});
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7days');

  const { toast } = useToast();

  const handleOrderCreated = () => {
    fetchOrders();
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filters, timeFilter]);

  const calculateStats = (orders: Order[]) => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const averageOrderValue = total > 0 ? totalRevenue / total : 0;

    setStats({
      total,
      pending,
      confirmed,
      delivered,
      totalRevenue,
      averageOrderValue
    });
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select('*, payment_transactions(*)', { count: 'exact' });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.minAmount) {
        query = query.gte('total_amount', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte('total_amount', filters.maxAmount);
      }
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      } else {
        const dateRange = getDateForTimeFilter(timeFilter);
        if (timeFilter !== 'all') {
          query = query
            .gte('created_at', dateRange.from.toISOString())
            .lte('created_at', dateRange.to.toISOString());
        }
      }

      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      if (error) throw error;

      if (count) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
      
      setOrders(data || []);
      calculateStats(data || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Erreur lors du chargement des commandes');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le statut de la commande a été mis à jour"
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la commande"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'shipped':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(searchLower) ||
      `${order.first_name || ''} ${order.last_name || ''}`.toLowerCase().includes(searchLower) ||
      (order.city?.toLowerCase() || '').includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchOrders}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      {/* En-tête et statistiques */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              Commandes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez toutes vos commandes
            </p>
          </div>
          <NewOrderDialog onOrderCreated={handleOrderCreated} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total commandes */}
          <Card className="p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Total</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </Card>

          {/* Chiffre d'affaires */}
          <Card className="p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">CA</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(stats.totalRevenue).replace(' FCFA', '')}
                </p>
              </div>
            </div>
          </Card>

          {/* En attente */}
          <Card className="p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">En attente</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </Card>

          {/* Panier moyen */}
          <Card className="p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Panier moyen</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(stats.averageOrderValue).replace(' FCFA', '')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={timeFilter}
          onValueChange={(value: TimeFilter) => {
            setTimeFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="yesterday">Hier</SelectItem>
            <SelectItem value="7days">7 derniers jours</SelectItem>
            <SelectItem value="30days">30 derniers jours</SelectItem>
            <SelectItem value="365days">365 derniers jours</SelectItem>
            <SelectItem value="all">Toutes les commandes</SelectItem>
          </SelectContent>
        </Select>

        <OrderFilters 
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Liste des commandes */}
      <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        {/* Vue mobile */}
        <div className="block sm:hidden">
          {filteredOrders.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => window.location.href = `/admin/orders/${order.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        #{order.id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className={cn("", getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.first_name} {order.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.city}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(order.total_amount || 0)}
                      </div>
                      <div 
                        className="flex gap-2"
                        onClick={(e) => e.stopPropagation()} // Empêche la navigation lors du clic sur les boutons
                      >
                        {order.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => updateOrderStatus(order.id.toString(), 'confirmed')}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => updateOrderStatus(order.id.toString(), 'cancelled')}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id.toString(), 'shipped')}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'}
            </div>
          )}
        </div>

        {/* Vue desktop */}
        <div className="hidden sm:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Commande
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Client
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Montant
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Paiement
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => window.location.href = `/admin/orders/${order.id}`}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        #{order.id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {order.first_name} {order.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {order.city}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-gray-900 dark:text-white">
                      {formatPrice(order.total_amount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center gap-2">
                        {(order.payment_method === 'wave' || order.payment_method === 'orange_money') && (
                          <Phone className="w-4 h-4 text-brand-blue dark:text-blue-400" />
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {order.payment_method === 'wave' ? 'Wave' :
                          order.payment_method === 'orange_money' ? 'Orange Money' : 
                          order.payment_method === 'card' ? 'Carte bancaire' : 
                          'Paiement à la livraison'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge 
                        className={cn(getStatusColor(order.status))}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        className="flex justify-center gap-2"
                        onClick={(e) => e.stopPropagation()} // Empêche la navigation lors du clic sur les boutons
                      >
                        {order.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => updateOrderStatus(order.id.toString(), 'confirmed')}
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => updateOrderStatus(order.id.toString(), 'cancelled')}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id.toString(), 'shipped')}
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={6} 
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {searchTerm ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                Page {currentPage} sur {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}