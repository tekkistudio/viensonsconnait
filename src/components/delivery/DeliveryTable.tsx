// src/components/delivery/DeliveryTable.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users,
  Building2,
  MoreHorizontal,
  Map,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  Ban,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrackingMap } from './TrackingMap';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DeliveryStatus } from '@/types/delivery';

interface DeliveryTableProps {
    deliveries: Array<{
      id: string;
      order_id: string;
      status: DeliveryStatus;
      delivery_type: 'company' | 'driver';
      company_id: string | null;
      driver_id: string | null;
      customer_name: string;
      customer_phone: string;
      delivery_address: string;
      city: string;
      tracking_number: string | null;
      estimated_delivery_time: string | null;
      actual_delivery_time: string | null;
      created_at: string;
    }>;
    drivers: Array<{
      id: string;
      full_name: string;
    }>;
    companies: Array<{
      id: string;
      name: string;
    }>;
    onTrackingClick: (id: string) => void;
    onStatusChange: (deliveryId: string, newStatus: DeliveryStatus) => void;
    onAssignDriver: (deliveryId: string, driverId: string) => void;
    onAssignCompany: (deliveryId: string, companyId: string) => void;
    onCancel: (deliveryId: string) => void;
  }

export function DeliveryTable({
  deliveries,
  drivers,
  companies,
  onStatusChange,
  onAssignDriver,
  onAssignCompany,
  onCancel
}: DeliveryTableProps) {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [showTrackingMap, setShowTrackingMap] = useState(false);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      picked_up: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      in_transit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
      case 'cancelled':
        return <Ban className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const isDeliveryActionable = (status: string) => {
    return !['delivered', 'cancelled'].includes(status);
  };

  return (
    <>
      <div className="rounded-md border dark:border-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Livreur/Entreprise</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id} className="group">
                <TableCell className="font-medium">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    #{delivery.order_id}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(delivery.created_at), 'PPp', { locale: fr })}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {delivery.customer_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <a href={`tel:${delivery.customer_phone}`} className="hover:text-gray-700">
                      {delivery.customer_phone}
                    </a>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {delivery.delivery_address}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {delivery.city}
                  </div>
                </TableCell>
                
                <TableCell>
                  {delivery.delivery_type === 'driver' ? (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {drivers.find(d => d.id === delivery.driver_id)?.full_name || 'Non assigné'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {companies.find(c => c.id === delivery.company_id)?.name || 'Non assigné'}
                      </span>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  <Badge className={cn("gap-1", getStatusColor(delivery.status))}>
                    {getStatusIcon(delivery.status)}
                    <span>{delivery.status}</span>
                  </Badge>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedDelivery(delivery.id);
                        setShowTrackingMap(true);
                      }}
                    >
                      <Map className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={`tel:${delivery.customer_phone}`}>
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        {isDeliveryActionable(delivery.status) && (
                          <>
                            {delivery.status === 'pending' && (
                              <>
                                <DropdownMenuItem>
                                  Assigner un livreur
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Assigner une entreprise
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            {['assigned', 'picked_up'].includes(delivery.status) && (
                              <DropdownMenuItem 
                                onClick={() => onStatusChange(delivery.id, 'in_transit')}
                              >
                                Marquer en transit
                              </DropdownMenuItem>
                            )}
                            
                            {delivery.status === 'in_transit' && (
                              <DropdownMenuItem 
                                onClick={() => onStatusChange(delivery.id, 'delivered')}
                                className="text-green-600"
                              >
                                Marquer comme livrée
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => onCancel(delivery.id)}
                              className="text-red-600"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem>
                          Voir les détails
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showTrackingMap} onOpenChange={setShowTrackingMap}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Suivi de livraison</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <TrackingMap
              deliveryId={selectedDelivery}
              onLocationUpdate={(location) => {
                // Gérer la mise à jour de la localisation
                console.log('Location update:', location);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}