// src/components/ui/FormattedText.tsx
import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Convertir les sauts de ligne en éléments <p>
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  return (
    <div className={`space-y-4 ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}