// src/features/product/components/ProductChat/components/TimeDisplay.tsx
import { useMemo } from 'react';

interface TimeDisplayProps {
  timestamp?: string;
  isUserMessage?: boolean;
}

const TimeDisplay = ({ timestamp, isUserMessage = false }: TimeDisplayProps) => {
  const formattedTime = useMemo(() => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  }, [timestamp]);

  if (!formattedTime) return null;

  return (
    <span className={`
      text-xs mt-1 block text-right
      ${isUserMessage ? 'text-white/70' : 'text-gray-500'}
    `}>
      {formattedTime}
    </span>
  );
};

export default TimeDisplay;