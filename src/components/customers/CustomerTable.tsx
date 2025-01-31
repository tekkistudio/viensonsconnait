import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
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

interface CustomerTableProps {
  customers: Array<{
    id: string;
    full_name: string;
    city: string;
    phone: string;
    email: string | null;
    total_orders: number;
    total_spent: number;
    last_order_at: string | null;
    tags: string[];
  }>;
  onSort: (key: string) => void;
  onAction: (action: string, customerId: string) => void;
}

export function CustomerTable({ customers, onSort, onAction }: CustomerTableProps) {
  return (
    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => onSort('full_name')}
                >
                  Client
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => onSort('total_orders')}
                >
                  Commandes
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button 
                  className="flex items-center gap-1"
                  onClick={() => onSort('total_spent')}
                >
                  Montant total
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map((customer) => (
              <tr 
                key={customer.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {customer.city}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <a 
                      href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 text-gray-900 dark:text-white hover:text-brand-blue"
                    >
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </a>
                    {customer.email && (
                      <a 
                        href={`mailto:${customer.email}`}
                        className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-blue"
                      >
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {customer.total_orders} commandes
                  </div>
                  {customer.last_order_at && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(customer.last_order_at).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {customer.total_spent.toLocaleString()} FCFA
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(customer.total_spent / customer.total_orders).toLocaleString()} FCFA/commande
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onAction('view', customer.id)}>
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('edit', customer.id)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onAction('delete', customer.id)}
                        className="text-red-600"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}