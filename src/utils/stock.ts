// src/utils/stock.ts
export type StockStatus = 'available' | 'low' | 'out_of_stock';

export interface StockInfo {
  status: StockStatus;
  message: string;
  color: string;
  icon: 'check' | 'warning' | 'x';
  quantity: number;
}

/**
 * Détermine le statut du stock basé sur la quantité
 * @param stockQuantity - Quantité en stock
 * @returns Information complète sur le statut du stock
 */
export function getStockInfo(stockQuantity: number | undefined | null): StockInfo {
  const quantity = stockQuantity || 0;

  if (quantity <= 0) {
    return {
      status: 'out_of_stock',
      message: 'Stock épuisé',
      color: 'text-red-500',
      icon: 'x',
      quantity
    };
  }

  if (quantity <= 5) {
    return {
      status: 'low',
      message: `Plus que ${quantity} en stock`,
      color: 'text-orange-500',
      icon: 'warning',
      quantity
    };
  }

  return {
    status: 'available',
    message: 'Stock disponible',
    color: 'text-green-500',
    icon: 'check',
    quantity
  };
}

/**
 * Vérifie si un produit est en stock
 * @param stockQuantity - Quantité en stock
 * @returns true si en stock, false sinon
 */
export function isInStock(stockQuantity: number | undefined | null): boolean {
  return (stockQuantity || 0) > 0;
}

/**
 * Détermine si le stock est critique (≤ 5 unités)
 * @param stockQuantity - Quantité en stock
 * @returns true si stock critique, false sinon
 */
export function isLowStock(stockQuantity: number | undefined | null): boolean {
  const quantity = stockQuantity || 0;
  return quantity > 0 && quantity <= 5;
}