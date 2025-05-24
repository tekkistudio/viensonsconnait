// src/components/PriceFormatter.tsx
import React from 'react';
import useCountryStore from '../core/hooks/useCountryStore';

interface PriceFormatterProps {
  amount: number;
  className?: string;
  showStrike?: boolean;
}

const PriceFormatter: React.FC<PriceFormatterProps> = ({ 
  amount, 
  className = '',
  showStrike = false 
}) => {
  const { convertPrice } = useCountryStore();
  const { formatted } = convertPrice(amount);
  
  if (showStrike) {
    return (
      <span className={`${className} line-through text-gray-500`}>
        {formatted}
      </span>
    );
  }

  return (
    <span className={className}>
      {formatted}
    </span>
  );
};

export default PriceFormatter;