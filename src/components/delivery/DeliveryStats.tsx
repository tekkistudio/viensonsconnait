// src/components/delivery/DeliveryStats.tsx
import { Card } from '@/components/ui/card';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DeliveryStats {
  total: number;
  pending: number;
  in_progress: number;
  delivered: number;
  failed: number;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
  showSkeleton?: boolean;
}

const StatCard = ({ icon: Icon, label, value, colorClass, showSkeleton }: StatCardProps) => (
  <Card className={cn(
    "p-4 transition-all duration-200 hover:shadow-md",
    showSkeleton && "animate-pulse"
  )}>
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg", colorClass)}>
        {showSkeleton ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {showSkeleton ? '-' : value.toLocaleString()}
        </p>
      </div>
    </div>
  </Card>
);

interface DeliveryStatsProps {
  stats: DeliveryStats;
  isLoading?: boolean;
  className?: string;
}

export function DeliveryStats({ stats, isLoading, className }: DeliveryStatsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const statItems = [
    {
      icon: Package,
      label: 'Total',
      value: stats.total,
      colorClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      tooltip: 'Nombre total de livraisons'
    },
    {
      icon: Clock,
      label: 'En attente',
      value: stats.pending,
      colorClass: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      tooltip: 'Livraisons en attente d\'assignation'
    },
    {
      icon: Truck,
      label: 'En cours',
      value: stats.in_progress,
      colorClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      tooltip: 'Livraisons en cours'
    },
    {
      icon: CheckCircle2,
      label: 'Livrées',
      value: stats.delivered,
      colorClass: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      tooltip: 'Livraisons complétées'
    },
    {
      icon: AlertTriangle,
      label: 'Échouées',
      value: stats.failed,
      colorClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      tooltip: 'Livraisons échouées ou annulées'
    }
  ];

  // Sur mobile, afficher uniquement les stats importantes
  const displayedStats = isMobile 
    ? statItems.slice(0, 3)
    : statItems;

  return (
    <div className={cn(
      "grid gap-4 transition-all",
      isMobile ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-5",
      className
    )}>
      {displayedStats.map((stat) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          colorClass={stat.colorClass}
          showSkeleton={isLoading}
        />
      ))}
    </div>
  );
}