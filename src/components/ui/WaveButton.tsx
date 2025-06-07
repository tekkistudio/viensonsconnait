// src/components/ui/WaveButton.tsx - NOUVEAU COMPOSANT WAVE
import React from 'react';
import Image from 'next/image';

interface WaveButtonProps {
  amount?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const WaveButton: React.FC<WaveButtonProps> = ({
  amount,
  onClick,
  disabled = false,
  className = '',
  children
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full bg-[#4BD2FA] hover:bg-[#3BC1E9] text-white rounded-xl p-4 
        hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3
        font-semibold border-none cursor-pointer
        ${disabled ? 'opacity-75 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        background: disabled ? '#9CA3AF' : 'linear-gradient(135deg, #4BD2FA 0%, #3BC9E8 100%)'
      }}
    >
      {/* ✅ Logo Wave */}
      <Image 
        src="/images/payments/wave_2.svg" 
        alt="Wave" 
        width={20} 
        height={20} 
        className="flex-shrink-0" 
      />
      
      <span>
        {children || (amount ? `Payer ${amount.toLocaleString()} FCFA avec Wave` : 'Payer avec Wave')}
      </span>
    </button>
  );
};

export default WaveButton;