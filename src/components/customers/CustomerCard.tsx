import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  MoreVertical,
  ExternalLink,
  Edit,
  Trash,
  MessageCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from '@/components/ui/card';

interface CustomerCardProps {
  customer: {
    id: string;
    full_name: string;
    city: string;
    phone: string;
    email: string | null;
    total_orders: number;
    total_spent: number;
    last_order_at: string | null;
    tags: string[];
  };
  onAction: (action: string, customerId: string) => void;
}

export function CustomerCard({ customer, onAction }: CustomerCardProps) {
  // Format WhatsApp link
  const whatsappLink = `https://wa.me/${customer.phone.replace(/\D/g, '')}`;
  
  return (
    <Card className="p-4 space-y-4 bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {customer.full_name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            {customer.city}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('view', customer.id)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('edit', customer.id)}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onAction('delete', customer.id)}
              className="text-red-600"
            >
              <Trash className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Commandes
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {customer.total_orders}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total dépensé
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {customer.total_spent.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button 
              variant="outline" 
              className="w-full gap-2 bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </a>
          <a href={`tel:${customer.phone}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Phone className="w-4 h-4" />
              Appeler
            </Button>
          </a>
        </div>
        
        {customer.email && (
          <a href={`mailto:${customer.email}`}>
            <Button variant="outline" className="w-full gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </a>
        )}
      </div>

      {customer.last_order_at && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Dernière commande: {new Date(customer.last_order_at).toLocaleDateString()}
        </div>
      )}

      {customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2">
          {customer.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}