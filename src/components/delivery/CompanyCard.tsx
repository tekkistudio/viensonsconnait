// src/components/delivery/CompanyCard.tsx
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  MoreVertical,
  Settings,
  BarChart2,
  Building,
  Truck,
  AlertTriangle,
  Trash,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    is_active: boolean;
    coverage_areas: string[];
    integration_type: 'api' | 'manual' | 'sms';
    delivery_count?: number;
    success_rate?: number;
  };
  onStatusChange?: (id: string, active: boolean) => Promise<void>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onViewStats?: (id: string) => void;
  className?: string;
}

export function CompanyCard({
  company,
  onStatusChange,
  onEdit,
  onDelete,
  onViewStats,
  className
}: CompanyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async () => {
    try {
      setIsUpdatingStatus(true);
      await onStatusChange?.(company.id, !company.is_active);
      toast({
        title: "Statut mis à jour",
        description: `L'entreprise a été ${company.is_active ? 'désactivée' : 'activée'}`
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
      await onDelete?.(company.id);
      toast({
        title: "Succès",
        description: "L'entreprise a été supprimée"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise"
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const getIntegrationType = (type: string) => {
    const types = {
      api: {
        label: 'API',
        class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      },
      manual: {
        label: 'Manuel',
        class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      },
      sms: {
        label: 'SMS',
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      }
    };
    return types[type as keyof typeof types];
  };

  const integrationInfo = getIntegrationType(company.integration_type);

  return (
    <>
      <Card className={cn("p-6", className)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {company.name}
              </h3>
              <Badge 
                variant={company.is_active ? "success" : "default"}
                className={cn(
                  "transition-colors",
                  company.is_active 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                )}
              >
                {company.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <Badge className={cn("mt-2", integrationInfo.class)}>
              {integrationInfo.label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit?.(company.id)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStatsDialog(true)}>
                <BarChart2 className="w-4 h-4 mr-2" />
                Statistiques
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleStatusChange}
                disabled={isUpdatingStatus}
                className={company.is_active ? 'text-amber-600' : 'text-green-600'}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {company.is_active ? 'Désactiver' : 'Activer'}
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

        <div className="mt-4 space-y-2">
          {company.contact_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              {company.contact_name}
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="w-4 h-4" />
              <a 
                href={`tel:${company.phone}`}
                className="hover:text-gray-900 dark:hover:text-gray-200"
              >
                {company.phone}
              </a>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              <a 
                href={`mailto:${company.email}`}
                className="hover:text-gray-900 dark:hover:text-gray-200"
              >
                {company.email}
              </a>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Globe className="w-4 h-4" />
              <a 
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-200"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>

        {company.coverage_areas?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Zones couvertes
            </h4>
            <div className="flex flex-wrap gap-2">
              {company.coverage_areas.map((area) => (
                <Badge key={area} variant="outline">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(company.delivery_count !== undefined || company.success_rate !== undefined) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              {company.delivery_count !== undefined && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Livraisons totales
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {company.delivery_count}
                  </p>
                </div>
              )}
              {company.success_rate !== undefined && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Taux de succès
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {company.success_rate}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onEdit?.(company.id)}
          >
            <Building className="w-4 h-4" />
            Gérer
          </Button>
        </div>
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.
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

      {/* Dialogue des statistiques */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Statistiques - {company.name}</DialogTitle>
            <DialogDescription>
              Statistiques détaillées des livraisons
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Ici, vous pouvez ajouter le composant de statistiques détaillées */}
            <p className="text-sm text-gray-500">
              Fonctionnalité en développement
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}