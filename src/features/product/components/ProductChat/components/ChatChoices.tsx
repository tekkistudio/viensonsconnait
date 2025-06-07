// src/features/product/components/ProductChat/components/ChatChoices.tsx 
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

interface ChatChoicesProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled?: boolean;
  externalUrl?: {
    type: 'whatsapp' | 'email' | 'payment' | 'other';
    url: string;
    description?: string;
  };
}

const ChatChoices: React.FC<ChatChoicesProps> = ({
  choices,
  onChoiceSelect,
  disabled = false,
  externalUrl
}) => {
  // ✅ Fonction pour détecter si c'est un bouton Wave avec HTML
  const isWaveButton = (choice: string): boolean => {
    return choice.includes('wave-payment-button') || 
           choice.includes('#4BD2FA') || 
           choice.includes('wave_2.svg');
  };

  // ✅ Fonction pour détecter les liens externes
  const isExternalLink = (choice: string): boolean => {
    return choice.includes('Voir tous nos jeux') || 
           choice.includes('🌐') ||
           choice.includes('WhatsApp') ||
           choice.includes('+221');
  };

  // ✅ Fonction pour gérer les clics sur liens externes
  const handleExternalClick = (choice: string) => {
    if (choice.includes('WhatsApp') || choice.includes('+221')) {
      window.open('https://wa.me/221781362728', '_blank');
    } else if (choice.includes('Voir tous nos jeux') || choice.includes('🌐')) {
      window.open('/nos-jeux', '_blank');
    } else if (externalUrl) {
      window.open(externalUrl.url, '_blank');
    }
    
    // Appeler aussi le handler normal pour le tracking
    onChoiceSelect(choice);
  };

  // ✅ Rendu des boutons avec gestion spéciale
  const renderChoice = (choice: string, index: number) => {
    const isWave = isWaveButton(choice);
    const isExternal = isExternalLink(choice);

    if (isWave) {
      return (
        <motion.button
          key={index}
          onClick={() => onChoiceSelect(choice)}
          disabled={disabled}
          className="wave-payment-button hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
          style={{
            backgroundColor: '#4BD2FA',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: '14px',
            minHeight: '48px'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={!disabled ? { scale: 1.02 } : undefined}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
        >
          <img 
            src="/images/payments/wave_2.svg" 
            alt="Wave" 
            style={{ 
              width: '20px', 
              height: '20px', 
              flexShrink: 0 
            }} 
          />
          <span>Payer avec Wave</span>
        </motion.button>
      );
    }

    if (isExternal) {
      return (
        <motion.button
          key={index}
          onClick={() => handleExternalClick(choice)}
          disabled={disabled}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={!disabled ? { scale: 1.02 } : undefined}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
        >
          <span className="text-sm">{choice}</span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </motion.button>
      );
    }

    // ✅ Bouton standard
    return (
      <motion.button
        key={index}
        onClick={() => onChoiceSelect(choice)}
        disabled={disabled}
        className="w-full px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-[#FF7E93] text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-left"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={!disabled ? { scale: 1.01, borderColor: '#FF7E93' } : undefined}
        whileTap={!disabled ? { scale: 0.99 } : undefined}
      >
        <span className="text-sm leading-relaxed">{choice}</span>
      </motion.button>
    );
  };

  if (!choices || choices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {choices.map((choice, index) => renderChoice(choice, index))}
      
      {/* ✅ Lien externe supplémentaire si défini */}
      {externalUrl && !choices.some(choice => isExternalLink(choice)) && (
        <motion.button
          onClick={() => window.open(externalUrl.url, '_blank')}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: choices.length * 0.1 }}
        >
          <span>{externalUrl.description || 'Lien externe'}</span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </motion.button>
      )}
    </div>
  );
};

export default ChatChoices;