// src/features/order/components/OrderSummary.tsx
import React from 'react';
import { formatPrice } from '@/lib/utils/currency';
import type { OrderSummaryProps } from '../types/order';

const OrderSummary: React.FC<OrderSummaryProps> = ({ 
  items, 
  customerInfo, 
  deliveryCost, 
  currency = 'XOF' 
}) => {
  // Calculer le sous-total
  const subtotal = items.reduce((acc: number, item) => 
    acc + (item.price * item.quantity), 0);
  
  // Calculer le total final
  const total = subtotal + deliveryCost;

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-sm">
      <div className="p-6 space-y-4">
        {/* En-tête */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Récapitulatif de votre commande
          </h3>
        </div>

        {/* Détails de la commande */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Jeux commandés :</h4>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">
                {formatPrice(item.totalPrice, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Coûts */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Sous-total</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Frais de livraison</span>
            <span>
              {deliveryCost === 0 ? 'Gratuit' : formatPrice(deliveryCost, currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>

        {/* Informations de livraison */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium text-gray-700">Informations de livraison :</h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Nom complet :</span> {customerInfo.firstName} {customerInfo.lastName}
            </p>
            <p>
              <span className="font-medium">Pays :</span> {customerInfo.country}
            </p>
            <p>
              <span className="font-medium">Ville :</span> {customerInfo.city}
            </p>
            <p>
              <span className="font-medium">Adresse :</span> {customerInfo.address}
            </p>
            <p>
              <span className="font-medium">Téléphone :</span> {customerInfo.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;