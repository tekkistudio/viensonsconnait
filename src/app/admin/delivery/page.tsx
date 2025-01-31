// src/app/admin/delivery/page.tsx
'use client';

import { useState } from 'react';
import { useDelivery } from '@/hooks/useDelivery';
import { DeliveryStats } from '@/components/delivery/DeliveryStats';
import { DeliveryFilters } from '@/components/delivery/DeliveryFilters';
import { DeliveryTable } from '@/components/delivery/DeliveryTable';
import { TrackingMap } from '@/components/delivery/TrackingMap';
import { DriverCard } from '@/components/delivery/DriverCard';
import { CompanyCard } from '@/components/delivery/CompanyCard';
import { AddDriverForm, DriverFormData } from '@/components/delivery/AddDriverForm';
import { AddCompanyForm, CompanyFormData } from '@/components/delivery/AddCompanyForm';
import { DeliveryType, DeliveryStatus } from '@/types/delivery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DeliveryPage() {
  const { 
    deliveries,
    drivers,
    companies,
    isLoading,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setSelectedDate,
    assignDelivery,
    updateDeliveryStatus,
    refreshData,
    isMobile
  } = useDelivery();

  const [activeTab, setActiveTab] = useState('deliveries');
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType | 'all'>('all');
  const { toast } = useToast();

  const handleAddCompany = async (data: CompanyFormData) => {
    try {
      const { error } = await supabase
        .from('delivery_companies')
        .insert([{
          name: data.name,
          contact_name: data.contact_name,
          phone: data.phone,
          email: data.email,
          website: data.website,
          integration_type: data.integration_type,
          api_key: data.api_key,
          is_active: true,
          coverage_areas: data.coverage_areas,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "L'entreprise a été ajoutée avec succès"
      });
      setIsAddCompanyOpen(false);
      await refreshData();
    } catch (error) {
      console.error('Error adding company:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter l'entreprise"
      });
    }
  };

  const handleAddDriver = async (data: DriverFormData) => {
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .insert([{
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          vehicle_type: data.vehicle_type,
          current_zone: data.current_zone,
          availability_hours: data.availability_hours || null,
          notes: data.notes || null,
          status: 'active',
          is_available: true,
          total_deliveries: 0,
          rating: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le livreur a été ajouté avec succès"
      });
      setIsAddDriverOpen(false);
      await refreshData();
    } catch (error) {
      console.error('Error adding driver:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le livreur"
      });
    }
  };

  const handleDriverStatusChange = async (driverId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le statut du livreur a été mis à jour"
      });
      await refreshData();
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    }
  };

  const handleCompanyStatusChange = async (companyId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_companies')
        .update({
          is_active: active,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le statut de l'entreprise a été mis à jour"
      });
      await refreshData();
    } catch (error) {
      console.error('Error updating company status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    }
  };

  const handleDeliveryCancel = async (deliveryId: string) => {
    try {
      await updateDeliveryStatus(deliveryId, 'cancelled' as DeliveryStatus);
      toast({
        title: "Succès",
        description: "La livraison a été annulée"
      });
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la livraison"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="deliveries" className="relative">
              Livraisons
              {stats?.pending > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drivers">Livreurs</TabsTrigger>
            <TabsTrigger value="companies">Entreprises</TabsTrigger>
          </TabsList>

          {activeTab === 'drivers' && (
            <Button onClick={() => setIsAddDriverOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un livreur
            </Button>
          )}

          {activeTab === 'companies' && (
            <Button onClick={() => setIsAddCompanyOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une entreprise
            </Button>
          )}
        </div>

        <TabsContent value="deliveries" className="space-y-6">
          <DeliveryStats stats={stats} />
          
          <DeliveryFilters
            searchTerm={searchTerm || ''}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter || 'all'}
            onStatusChange={(status) => setStatusFilter(status as DeliveryStatus | 'all')}
            dateFilter={dateFilter || 'all'}
            onDateChange={setSelectedDate}
            typeFilter={deliveryType}
            onTypeChange={setDeliveryType}
            onReset={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSelectedDate('all');
              setDeliveryType('all');
            }}
          />

          <DeliveryTable
            deliveries={deliveries}
            drivers={drivers}
            companies={companies}
            onTrackingClick={(deliveryId) => {
              setSelectedDelivery(deliveryId);
              setShowTrackingMap(true);
            }}
            onStatusChange={updateDeliveryStatus}
            onAssignDriver={(deliveryId, driverId) => assignDelivery(deliveryId, driverId, 'driver')}
            onAssignCompany={(deliveryId, companyId) => assignDelivery(deliveryId, companyId, 'company')}
            onCancel={handleDeliveryCancel}
          />
        </TabsContent>

        <TabsContent value="drivers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onStatusChange={handleDriverStatusChange}
                onAssignDelivery={(id) => {
                  toast({
                    title: "Info",
                    description: "Fonctionnalité en développement"
                  });
                }}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="companies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onStatusChange={handleCompanyStatusChange}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de tracking */}
      <Dialog open={showTrackingMap} onOpenChange={setShowTrackingMap}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Suivi de livraison</DialogTitle>
            <DialogDescription>
              Suivez en temps réel l'avancement de la livraison
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <TrackingMap
              deliveryId={selectedDelivery}
              onLocationUpdate={(location) => {
                console.log('Location update:', location);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal d'ajout de livreur */}
      <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau livreur</DialogTitle>
            <DialogDescription>
              Le livreur sera notifié par SMS une fois ajouté
            </DialogDescription>
          </DialogHeader>
          <AddDriverForm
            onSubmit={handleAddDriver}
            onCancel={() => setIsAddDriverOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal d'ajout d'entreprise */}
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter une entreprise de livraison</DialogTitle>
            <DialogDescription>
              Configurez les paramètres de l'entreprise
            </DialogDescription>
          </DialogHeader>
          <AddCompanyForm
            onSubmit={handleAddCompany}
            onCancel={() => setIsAddCompanyOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}