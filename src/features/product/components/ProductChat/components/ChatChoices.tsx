// src/features/product/components/ProductChat/components/ChatChoices.tsx - VERSION SIMPLIFIÉE
'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

interface ChatChoicesProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled?: boolean;
  className?: string;
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
  className = '',
  externalUrl
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [processedChoices, setProcessedChoices] = useState<Set<string>>(new Set());

  // ✅ FONCTION POUR GÉRER LA SÉLECTION AVEC PROTECTION CONTRE LES DOUBLONS
  const handleChoiceClick = useCallback((choice: string) => {
    if (disabled || selectedChoice || processedChoices.has(choice)) {
      console.log('🚫 Choice ignored:', { disabled, selectedChoice, alreadyProcessed: processedChoices.has(choice) });
      return;
    }

    console.log('✅ Processing choice:', choice);

    // ✅ MARQUER LE CHOIX COMME SÉLECTIONNÉ ET TRAITÉ
    setSelectedChoice(choice);
    setProcessedChoices(prev => new Set(prev).add(choice));

    // ✅ DÉLAI AVANT TRAITEMENT POUR ÉVITER LES CLICS MULTIPLES
    setTimeout(() => {
      onChoiceSelect(choice);
    }, 100);
  }, [disabled, selectedChoice, processedChoices, onChoiceSelect]);

  // ✅ FONCTION POUR DÉTECTER LES BOUTONS SPÉCIAUX
  const isWaveButton = (choice: string): boolean => {
    return choice.includes('Wave') && choice.includes('Payer');
  };

  const isExternalLink = (choice: string): boolean => {
    return choice.includes('Voir tous nos jeux') || 
           choice.includes('🌐') ||
           choice.includes('WhatsApp') ||
           choice.includes('+221');
  };

  // ✅ FONCTION POUR GÉRER LES CLICS EXTERNES
  const handleExternalClick = useCallback((choice: string) => {
    if (choice.includes('WhatsApp') || choice.includes('+221')) {
      window.open('https://wa.me/221781362728', '_blank');
    } else if (choice.includes('Voir tous nos jeux') || choice.includes('🌐')) {
      window.open('/nos-jeux', '_blank');
    } else if (externalUrl) {
      window.open(externalUrl.url, '_blank');
    }
    
    // Appeler aussi le handler normal pour le tracking
    onChoiceSelect(choice);
  }, [externalUrl, onChoiceSelect]);

  // ✅ RESET DES ÉTATS APRÈS UN DÉLAI
  React.useEffect(() => {
    if (selectedChoice) {
      const timer = setTimeout(() => {
        setSelectedChoice(null);
        setProcessedChoices(new Set());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [selectedChoice]);

  // ✅ FILTRER LES CHOIX VIDES OU INVALIDES
  const validChoices = choices.filter(choice => choice && choice.trim().length > 0);

  if (!validChoices || validChoices.length === 0) {
    return null;
  }

  // ✅ RENDU DES BOUTONS
  const renderChoice = (choice: string, index: number) => {
    const isSelected = selectedChoice === choice;
    const isProcessed = processedChoices.has(choice);
    const isDisabled = disabled || isSelected || isProcessed;
    const isWave = isWaveButton(choice);
    const isExternal = isExternalLink(choice);

    // ✅ BOUTON WAVE SPÉCIAL
    if (isWave) {
      return (
        <motion.button
          key={`${choice}-${index}`}
          onClick={() => handleChoiceClick(choice)}
          disabled={isDisabled}
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
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: '14px',
            minHeight: '48px'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={!isDisabled ? { scale: 1.02 } : undefined}
          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
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

    // ✅ BOUTON LIEN EXTERNE
    if (isExternal) {
      return (
        <motion.button
          key={`${choice}-${index}`}
          onClick={() => handleExternalClick(choice)}
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={!isDisabled ? { scale: 1.02 } : undefined}
          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        >
          <span className="text-sm">{choice}</span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </motion.button>
      );
    }

    // ✅ BOUTON STANDARD
    return (
      <motion.button
        key={`${choice}-${index}`}
        onClick={() => handleChoiceClick(choice)}
        disabled={isDisabled}
        className={`
          w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 min-h-[48px]
          ${isSelected 
            ? 'border-pink-500 bg-pink-50 text-pink-700' 
            : isDisabled 
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
          }
          ${isProcessed ? 'opacity-50' : ''}
        `}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={!isDisabled ? { scale: 1.01 } : undefined}
        whileTap={!isDisabled ? { scale: 0.99 } : undefined}
        title={isDisabled ? 'Choix déjà sélectionné' : choice}
      >
        <span className="text-sm font-medium leading-relaxed">
          {choice}
        </span>
        {isSelected && (
          <span className="ml-2 text-xs text-pink-500">
            ✓ Sélectionné
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {validChoices.map((choice, index) => renderChoice(choice, index))}
      
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