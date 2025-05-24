// src/components/delivery/DriverCard.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  Mail,
  MapPin,
  Star,
  PackageCheck,
  MoreVertical,
  MessageCircle,
  Bike,
  History,
  AlertTriangle,
  Trash,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { smsService } from '@/services/sms';
import { useToast } from '@/components/ui/use-toast';

interface DriverCardProps {
  driver: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    status: 'active' | 'inactive' | 'busy';
    current_zone: string | null;
    vehicle_type: string | null;
    rating: number | null;
    total_deliveries: number;
    is_available: boolean;
    working_hours?: Record<string, string>;
  };
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onAssignDelivery?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  className?: string;
}

export function DriverCard({ 
  driver, 
  onStatusChange,
  onAssignDelivery,
  onDelete,
  className 
}: DriverCardProps) {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    try {
      setIsSendingMessage(true);
      await smsService.sendSMS({
        to: driver.phone,
        message: 'Message test de la plateforme de livraison'
      });
      toast({
        title: "Message envoyé",
        description: "Le livreur a été notifié"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message"
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      setIsUpdatingStatus(true);
      await onStatusChange?.(
        driver.id, 
        driver.is_available ? 'inactive' : 'active'
      );
      toast({
        title: "Statut mis à jour",
        description: `Le livreur a été ${driver.is_available ? 'désactivé' : 'activé'}`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete?.(driver.id);
      toast({
        title: "Succès",
        description: "Le livreur a été supprimé"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le livreur"
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const getStatusBadgeClass = (status: string, isAvailable: boolean) => {
    if (!isAvailable) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getVehicleLabel = (type: string) => {
    const types: Record<string, string> = {
      'motorcycle': 'Moto',
      'car': 'Voiture',
      'van': 'Camionnette',
      'bicycle': 'Vélo'
    };
    return types[type] || type;
  };

  return (
    <>
      <Card className={cn("p-4", className)}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {driver.full_name}
            </h3>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <a 
                  href={`tel:${driver.phone}`}
                  className="hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {driver.phone}
                </a>
              </div>
              {driver.email && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <a 
                    href={`mailto:${driver.email}`}
                    className="hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {driver.email}
                  </a>
                </div>
              )}
              {driver.current_zone && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {driver.current_zone}
                </div>
              )}
              {driver.vehicle_type && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Bike className="w-4 h-4" />
                  {getVehicleLabel(driver.vehicle_type)}
                </div>
              )}
              {driver.working_hours && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {Object.entries(driver.working_hours)
                    .filter(([_, hours]) => hours)
                    .map(([day, hours]) => `${day}: ${hours}`)
                    .join(', ')}
                </div>
              )}
            </div>
          </div>
          <Badge 
            className={cn(
              getStatusBadgeClass(driver.status, driver.is_available)
            )}
          >
            {driver.is_available ? (
              driver.status === 'busy' ? 'En livraison' : 'Disponible'
            ) : 'Indisponible'}
          </Badge>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Total livraisons</div>
              <div className="font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-1">
                  <PackageCheck className="w-4 h-4" />
                  {driver.total_deliveries}
                </div>
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Note moyenne</div>
              <div className="font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  {driver.rating ? `${driver.rating.toFixed(1)}/5` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleSendMessage}
            disabled={isSendingMessage || !driver.is_available}
          >
            <MessageCircle className="w-4 h-4" />
            {isSendingMessage ? 'Envoi...' : 'Message'}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              
              {driver.is_available && driver.status !== 'busy' && (
                <DropdownMenuItem 
                  onClick={() => onAssignDelivery?.(driver.id)}
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Assigner une livraison
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={handleStatusChange}
                disabled={isUpdatingStatus}
                className={driver.is_available ? 'text-amber-600' : 'text-green-600'}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {driver.is_available ? 'Désactiver' : 'Activer'}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
                <History className="w-4 h-4 mr-2" />
                Voir l'historique
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue d'historique des livraisons */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Historique des livraisons - {driver.full_name}</DialogTitle>
            <DialogDescription>
              Historique complet des livraisons effectuées
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Ici, on peut ajouter le composant d'historique des livraisons */}
            <p className="text-sm text-gray-500">
              Fonctionnalité en développement
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}