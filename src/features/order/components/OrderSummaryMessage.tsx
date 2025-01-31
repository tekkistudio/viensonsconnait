// src/features/order/components/OrderSummaryMessage.tsx
import React from 'react';
import type { OrderSummaryMessageProps } from '../types/order';

const OrderSummaryMessage: React.FC<OrderSummaryMessageProps> = ({
  summary,
  onConfirm,
  onModify
}) => {
  const { items, customerInfo, subtotal, deliveryCost, total } = summary;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Récapitulatif de votre commande
          </h3>
        </div>

        {/* Articles commandés */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Articles :</h4>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">
                {item.totalPrice.toLocaleString()} FCFA
              </span>
            </div>
          ))}
        </div>

        {/* Coûts */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>Sous-total</span>
            <span>{subtotal.formatted}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Livraison</span>
            <span>{deliveryCost.value === 0 ? 'Gratuite' : deliveryCost.formatted}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>{total.formatted}</span>
          </div>
        </div>

        {/* Informations de livraison */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-medium text-gray-700">Livraison :</h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Nom :</span> {customerInfo.firstName} {customerInfo.lastName}
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

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#FF7E93] text-white rounded-full hover:bg-[#FF6B84] transition-colors"
          >
            Confirmer la commande
          </button>
          <button
            onClick={onModify}
            className="px-4 py-2 text-[#FF7E93] border border-[#FF7E93] rounded-full hover:bg-[#FF7E93] hover:text-white transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryMessage;