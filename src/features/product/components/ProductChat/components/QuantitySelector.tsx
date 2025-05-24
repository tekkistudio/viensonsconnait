// src/features/product/components/ProductChat/components/QuantitySelector.tsx
import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onConfirm: (quantity: number) => Promise<void>;
  maxQuantity?: number;
}

export default function QuantitySelector({
  quantity: initialQuantity,
  onQuantityChange,
  onConfirm,
  maxQuantity = 10
}: QuantitySelectorProps) {
  // État local pour suivre la quantité
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  // État pour suivre si une confirmation est en cours (éviter les doubles clics)
  const [isConfirming, setIsConfirming] = useState(false);
  // État pour suivre si le composant est monté (éviter les mises à jour après démontage)
  const [isMounted, setIsMounted] = useState(true);

  // Effet pour mettre à jour l'état local si la prop change
  useEffect(() => {
    if (initialQuantity !== quantity) {
      setQuantity(initialQuantity || 1);
    }
  }, [initialQuantity]);

  // Effet de nettoyage
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
      onQuantityChange(newQuantity);
    }
  };

  // Fonction pour gérer la confirmation
  const handleConfirm = async () => {
    if (isConfirming) return; // Éviter les doubles clics
    
    try {
      setIsConfirming(true);
      await onConfirm(quantity);
    } catch (error) {
      console.error('Error confirming quantity:', error);
    } finally {
      // Seulement mettre à jour l'état si le composant est toujours monté
      if (isMounted) {
        setIsConfirming(false);
      }
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
        <span className="text-sm text-gray-600">Quantité :</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="p-1 rounded-full border border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={quantity <= 1 || isConfirming}
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <span className="w-8 text-center font-medium">{quantity}</span>
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="p-1 rounded-full border border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={quantity >= maxQuantity || isConfirming}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={isConfirming}
        className="w-full px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/90 
          transition-colors font-medium disabled:opacity-70"
      >
        {isConfirming ? 'Confirmation en cours...' : 'Confirmer la quantité'}
      </button>
    </div>
  );
}