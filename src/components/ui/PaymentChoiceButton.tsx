// src/components/ui/PaymentChoiceButton.tsx

import React from 'react';
import Image from 'next/image';

interface PaymentChoiceButtonProps {
  choice: string;
  onClick: (choice: string) => void;
}

export const PaymentChoiceButton: React.FC<PaymentChoiceButtonProps> = ({ 
  choice, 
  onClick 
}) => {
  const handleClick = () => onClick(choice);

  // Si c'est Wave, afficher avec l'icône SVG
  if (choice === 'Wave') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-3 bg-[#4BD2FA] hover:bg-[#3BC5E8] text-white rounded-lg font-medium transition-colors w-full justify-center"
      >
        <Image 
          src="/images/payments/wave_2.svg" 
          alt="Wave" 
          width={20} 
          height={20}
          className="filter brightness-0 invert"
        />
        Wave
      </button>
    );
  }

  // Pour les autres choix, affichage normal
  return (
    <button
      onClick={handleClick}
      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors w-full"
    >
      {choice}
    </button>
  );
};