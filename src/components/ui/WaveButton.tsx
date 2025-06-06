// src/components/ui/WaveButton.tsx

import React from 'react';
import Image from 'next/image';

interface WaveButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const WaveButton: React.FC<WaveButtonProps> = ({ 
  onClick, 
  children, 
  className = '' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-[#4BD2FA] hover:bg-[#3BC5E8] text-white rounded-lg font-medium transition-colors ${className}`}
    >
      <Image 
        src="/images/payments/wave_2.svg" 
        alt="Wave" 
        width={20} 
        height={20}
        className="text-white"
      />
      {children}
    </button>
  );
};