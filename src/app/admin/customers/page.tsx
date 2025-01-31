// src/app/admin/customers/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';

// Import des composants locaux
import { CustomerStats } from '@/components/customers/CustomerStats';
import { CustomerHeader } from '@/components/customers/CustomerHeader';
import { CustomerFilters } from '@/components/customers/CustomerFilters';
import { CustomerTable } from '@/components/customers/CustomerTable';
import { CustomerCard } from '@/components/customers/CustomerCard';

// Types et données statiques
import { Customer, CustomerSegment, CustomerStats as StatsType } from '@/types/customer';
import { customerSegments } from '@/lib/data/customerSegments';

export default function CustomersPage() {
  // États
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [stats, setStats] = useState<StatsType>({
    totalCustomers: 0,
    activeCustomers: 0,
    averageOrderValue: 0,
    topCity: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc' as 'asc' | 'desc'
  });

  // Hooks
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Effets
  useEffect(() => {
    fetchCustomers();
  }, [selectedCountry, sortConfig]);

  useEffect(() => {
    // Définir automatiquement la vue en grille sur mobile
    if (isMobile) setViewMode('grid');
  }, [isMobile]);

  // Fonctions
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('customers')
        .select('*')
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      if (selectedCountry !== 'all') {
        query = query.eq('country_code', selectedCountry);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCustomers(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les clients"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (customersData: Customer[]) => {
    const activeCustomers = customersData.filter(c => c.status === 'active').length;
    const totalSpent = customersData.reduce((sum, c) => sum + c.total_spent, 0);
    const totalOrders = customersData.reduce((sum, c) => sum + c.total_orders, 0);
    
    const cityCounts = customersData.reduce((acc, c) => {
      acc[c.city] = (acc[c.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCity = Object.entries(cityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    setStats({
      totalCustomers: customersData.length,
      activeCustomers,
      averageOrderValue: totalOrders ? totalSpent / totalOrders : 0,
      topCity
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportCustomers = () => {
    const exportData = customers.map(customer => ({
      'Nom complet': customer.full_name,
      'Ville': customer.city,
      'Pays': customer.country_name,
      'Téléphone': customer.phone,
      'Email': customer.email || '',
      'Total commandes': customer.total_orders,
      'Montant total': customer.total_spent,
      'Dernière commande': customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : '',
      'Statut': customer.status,
      'Tags': customer.tags.join(', '),
      'Date création': new Date(customer.created_at).toLocaleDateString()
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_vosc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCustomerAction = async (action: string, customerId: string) => {
    switch (action) {
      case 'view':
        // Implémenter la vue détaillée
        break;
      case 'edit':
        // Implémenter l'édition
        break;
      case 'delete':
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
          try {
            const { error } = await supabase
              .from('customers')
              .delete()
              .eq('id', customerId);

            if (error) throw error;

            toast({
              title: "Client supprimé",
              description: "Le client a été supprimé avec succès"
            });

            fetchCustomers();
          } catch (error) {
            console.error('Error deleting customer:', error);
            toast({
              variant: "destructive",
              title: "Erreur",
              description: "Impossible de supprimer le client"
            });
          }
        }
        break;
    }
  };

  // Filtrage des clients
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Filtre de recherche
      const matchesSearch = !searchTerm ? true : (
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      );

      // Filtre de segment
      const segment = customerSegments.find(s => s.id === activeSegment);
      const matchesSegment = !segment?.condition || segment.condition(customer);

      return matchesSearch && matchesSegment;
    });
  }, [customers, searchTerm, activeSegment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  // Calcul des filtres actifs
  const activeFiltersCount = [
    activeSegment !== 'all',
    selectedCountry !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* En-tête */}
      <CustomerHeader
        onExport={exportCustomers}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Statistiques */}
      <CustomerStats stats={stats} />

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-full sm:w-auto order-2 sm:order-1">
          <div className="relative">
            <Input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[300px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 sm:ml-auto">
          <CustomerFilters
            activeSegment={activeSegment}
            selectedCountry={selectedCountry}
            onSegmentChange={setActiveSegment}
            onCountryChange={setSelectedCountry}
            segments={customerSegments}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </div>

      {/* Liste des clients */}
      {filteredCustomers.length > 0 ? (
        <div>
          {/* Vue mobile (cartes) */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'hidden'}>
            {filteredCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onAction={handleCustomerAction}
              />
            ))}
          </div>

          {/* Vue desktop (tableau) */}
          {viewMode === 'list' && (
            <CustomerTable
              customers={filteredCustomers}
              onSort={handleSort}
              onAction={handleCustomerAction}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Aucun client trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "Aucun client ne correspond à votre recherche"
                : "Il n'y a aucun client dans ce segment"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}