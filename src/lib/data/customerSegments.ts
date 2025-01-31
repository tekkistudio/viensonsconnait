import { CustomerSegment, Customer } from '@/types/customer';

// Durée en millisecondes
const INACTIVE_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 jours
const NEW_CUSTOMER_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 jours

export const customerSegments: CustomerSegment[] = [
  {
    id: 'all',
    name: 'Tous les clients',
    description: 'Tous les clients sans distinction'
  },
  {
    id: 'vip',
    name: 'VIP',
    description: 'Clients ayant dépensé plus de 100 000 FCFA',
    condition: (customer: Customer) => customer.total_spent >= 100000
  },
  {
    id: 'regular',
    name: 'Réguliers',
    description: 'Clients ayant passé au moins 3 commandes',
    condition: (customer: Customer) => customer.total_orders >= 3
  },
  {
    id: 'inactive',
    name: 'Inactifs',
    description: 'Clients sans activité depuis plus de 90 jours',
    condition: (customer: Customer) => {
      const lastOrder = customer.last_order_at ? new Date(customer.last_order_at) : null;
      return lastOrder ? (new Date().getTime() - lastOrder.getTime()) > INACTIVE_THRESHOLD : true;
    }
  },
  {
    id: 'new',
    name: 'Nouveaux',
    description: 'Clients inscrits depuis moins de 30 jours',
    condition: (customer: Customer) => {
      const created = new Date(customer.created_at);
      return (new Date().getTime() - created.getTime()) <= NEW_CUSTOMER_THRESHOLD;
    }
  }
];