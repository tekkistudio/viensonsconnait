// src/components/delivery/DriverCard.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Mail,
  MapPin,
  Star,
  PackageCheck,
  MoreVertical,
  MessageCircle,
  Bike
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
  };
  onStatusChange?: (id: string, status: string) => void;
  onAssignDelivery?: (id: string) => void;
  className?: string;
}

export function DriverCard({ 
  driver, 
  onStatusChange,
  onAssignDelivery,
  className 
}: DriverCardProps) {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
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

  // Obtenir la couleur du badge en fonction du statut
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

  return (
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
                {driver.vehicle_type}
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
                Assigner une livraison
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
              onClick={() => onStatusChange?.(
                driver.id, 
                driver.is_available ? 'inactive' : 'active'
              )}
            >
              {driver.is_available ? 'Désactiver' : 'Activer'}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem>
              Voir l'historique
            </DropdownMenuItem>
            
            <DropdownMenuItem className="text-red-600">
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}