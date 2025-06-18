// src/components/ui/StockIndicator.tsx
import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { getStockInfo } from '@/utils/stock';

interface StockIndicatorProps {
  stockQuantity: number | undefined | null;
  className?: string;
  showQuantity?: boolean;
}

const StockIndicator: React.FC<StockIndicatorProps> = ({ 
  stockQuantity, 
  className = "",
  showQuantity = false 
}) => {
  const stockInfo = getStockInfo(stockQuantity);

  const IconComponent = {
    check: CheckCircle,
    warning: AlertTriangle,
    x: XCircle
  }[stockInfo.icon];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <IconComponent className={`w-3 h-3 ${stockInfo.color}`} />
      <span className={`text-xs ${stockInfo.color}`}>
        {showQuantity && stockInfo.quantity > 0 
          ? `${stockInfo.message} (${stockInfo.quantity})`
          : stockInfo.message
        }
      </span>
    </div>
  );
};

export default StockIndicator;