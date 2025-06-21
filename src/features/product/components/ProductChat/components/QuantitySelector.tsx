// src/features/product/components/ProductChat/components/QuantitySelector.tsx - CORRIGÉ
import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

// ✅ INTERFACE CORRIGÉE pour supporter les deux usages
interface QuantitySelectorProps {
  // Nouveau style (pour le nouveau chat)
  onQuantitySelect?: (quantity: number) => void;
  maxQuantity?: number;
  className?: string;
  
  // Ancien style (pour compatibilité)
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  onConfirm?: (qty: number) => Promise<void>;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  onQuantitySelect,
  maxQuantity = 10,
  className = '',
  // Props de l'ancien système
  quantity: initialQuantity = 1,
  onQuantityChange,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
      // Appeler l'ancien callback si fourni
      if (onQuantityChange) {
        onQuantityChange(newQuantity);
      }
    }
  };

  const handleConfirm = async () => {
    if (isConfirming) return;
    
    try {
      setIsConfirming(true);
      
      // Nouveau style (priorité)
      if (onQuantitySelect) {
        onQuantitySelect(quantity);
      }
      // Ancien style (compatibilité)
      else if (onConfirm) {
        await onConfirm(quantity);
      }
    } catch (error) {
      console.error('Error confirming quantity:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className={`space-y-4 w-full ${className}`}>
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <span className="text-sm text-gray-600">Quantité souhaitée :</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="p-2 rounded-full border border-[#FF7E93] text-[#FF7E93] hover:bg-[#FF7E93] hover:text-white
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={quantity <= 1 || isConfirming}
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <span className="w-8 text-center font-medium text-lg">{quantity}</span>
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="p-2 rounded-full border border-[#FF7E93] text-[#FF7E93] hover:bg-[#FF7E93] hover:text-white
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
        className="w-full px-4 py-3 bg-[#FF7E93] text-white rounded-lg hover:bg-[#132D5D] 
          transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isConfirming ? 'Ajout en cours...' : `Ajouter ${quantity} jeu${quantity > 1 ? 'x' : ''} au panier`}
      </button>
    </div>
  );
};

export default QuantitySelector;