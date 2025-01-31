import React from 'react';
import { Card } from '@/components/ui/card';
import { Users, ShoppingBag, MapPin, AlertTriangle } from 'lucide-react';

interface CustomerStatsProps {
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    averageOrderValue: number;
    topCity: string;
  };
}

type StatItemType = {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
};

export function CustomerStats({ stats }: CustomerStatsProps) {
  const statItems: StatItemType[] = [
    {
      label: 'Total clients',
      value: stats.totalCustomers.toString(),
      icon: Users,
      colorClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Panier moyen',
      value: `${Math.round(stats.averageOrderValue).toLocaleString()} FCFA`,
      icon: ShoppingBag,
      colorClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
    },
    {
      label: 'Ville principale',
      value: stats.topCity,
      icon: MapPin,
      colorClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Inactifs',
      value: (stats.totalCustomers - stats.activeCustomers).toString(),
      icon: AlertTriangle,
      colorClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card 
            key={item.label} 
            className="p-4 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}