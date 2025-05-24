// src/components/admin/conversations/ChatbotMetricsCard.tsx
import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChatbotMetricsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  colorClass: string;
  className?: string;
}

export function ChatbotMetricsCard({
  icon,
  title,
  value,
  colorClass,
  className
}: ChatbotMetricsCardProps) {
  return (
    <Card className={cn("p-4 bg-white dark:bg-gray-800", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 bg-opacity-10 rounded-lg", colorClass, colorClass.replace('text-', 'bg-'))}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}