// src/features/product/components/ProductChat/components/TypingIndicator.tsx
import React from 'react';

interface TypingIndicatorProps {
  assistantName?: string;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  assistantName = 'Rose',
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Animation des points de frappe */}
      <div className="flex space-x-1">
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '100ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '200ms', animationDuration: '1s' }}
        />
      </div>
      
      {/* Texte "écrit..." */}
      <span className="text-xs text-gray-500 ml-2">
        {assistantName} écrit...
      </span>
    </div>
  );
};

export default TypingIndicator;