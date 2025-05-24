// src/features/product/components/ProductChat/components/ChatChoices.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface ChatChoicesProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled?: boolean;
}

export default function ChatChoices({ 
  choices, 
  onChoiceSelect,
  disabled = false 
}: ChatChoicesProps) {
  // Animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Ordre prédéfini des choix
  const orderedChoices = [
    'Je veux en savoir plus',
    'Je veux l\'acheter maintenant',
    'Comment y jouer ?',
    'Je veux voir les témoignages'
  ];

  // Réorganiser les choix selon l'ordre prédéfini
  const sortedChoices = [...choices].sort((a, b) => {
    const indexA = orderedChoices.indexOf(a);
    const indexB = orderedChoices.indexOf(b);
    
    // Si un choix n'est pas dans la liste prédéfinie, le mettre à la fin
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });

  return (
    <motion.div 
      className="flex flex-col gap-2 mt-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {sortedChoices.map((choice, idx) => {
        const isPurchaseButton = choice.toLowerCase().includes('acheter') || 
                               choice.toLowerCase().includes('payer') ||
                               choice.toLowerCase().includes('oui, c\'est correct');
        
        return (
          <motion.button
            key={`${choice}-${idx}`}
            variants={item}
            onClick={() => !disabled && onChoiceSelect(choice)}
            disabled={disabled}
            className={`
              w-full px-4 py-3 text-left text-sm font-medium
              rounded-lg transition-all duration-200
              ${disabled 
                ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                : isPurchaseButton
                  ? 'bg-[#FF7E93] text-white hover:bg-[#FF7E93]/90'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              active:scale-[0.98]
            `}
          >
            {choice}
          </motion.button>
        );
      })}
    </motion.div>
  );
}