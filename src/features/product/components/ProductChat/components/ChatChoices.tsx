// src/features/product/components/ProductChat/components/ChatChoices.tsx

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ShoppingCart, MessageCircle, Info, Zap } from 'lucide-react';
import { PurchaseIntentDetector } from '@/lib/services/PurchaseIntentDetector';
import { ConversationAnalytics } from '@/lib/services/ConversationAnalytics';

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
  // ✅ NOUVELLES PROPS POUR L'OPTIMISATION
  messageContext?: {
    messageId: string;
    productId: string;
    sessionId: string;
    conversationStep: string;
  };
  analytics?: {
    trackChoiceClick: (choice: string, context: any) => void;
    trackChoiceDisplay: (choices: string[], context: any) => void;
  };
}

interface ChoiceButtonProps {
  choice: string;
  index: number;
  onClick: () => void;
  disabled: boolean;
  isSelected: boolean;
  isProcessed: boolean;
  buttonType: 'primary' | 'secondary' | 'external' | 'wave' | 'stripe' | 'action';
  priority: 'high' | 'medium' | 'low';
}

const ChatChoices: React.FC<ChatChoicesProps> = ({ 
  choices, 
  onChoiceSelect, 
  disabled = false,
  className = '',
  externalUrl,
  messageContext,
  analytics
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [processedChoices, setProcessedChoices] = useState<Set<string>>(new Set());
  const [displayStartTime] = useState<number>(Date.now());
  
  // ✅ SERVICES POUR L'ANALYSE INTELLIGENTE
  const intentDetector = useMemo(() => PurchaseIntentDetector.getInstance(), []);
  const conversationAnalytics = useMemo(() => ConversationAnalytics.getInstance(), []);

  // ✅ ANALYSE ET CLASSIFICATION INTELLIGENTE DES CHOIX
  const analyzedChoices = useMemo(() => {
    return choices.map((choice, index) => {
      // Détecter le type de bouton
      let buttonType: ChoiceButtonProps['buttonType'] = 'secondary';
      let priority: ChoiceButtonProps['priority'] = 'medium';
      
      const choiceLower = choice.toLowerCase();
      
      // Classification par type
      if (choiceLower.includes('acheter maintenant') || choiceLower.includes('commander')) {
        buttonType = 'primary';
        priority = 'high';
      } else if (choiceLower.includes('wave')) {
        buttonType = 'wave';
        priority = 'high';
      } else if (choiceLower.includes('carte') || choiceLower.includes('stripe')) {
        buttonType = 'stripe';
        priority = 'high';
      } else if (choiceLower.includes('questions') || choiceLower.includes('savoir plus')) {
        buttonType = 'action';
        priority = 'medium';
      } else if (isExternalLink(choice)) {
        buttonType = 'external';
        priority = 'low';
      }
      
      return {
        choice,
        index,
        buttonType,
        priority,
        isImmediate: intentDetector.isImmediatePurchaseDecision(choice)
      };
    });
  }, [choices, intentDetector]);

  // ✅ TRACK L'AFFICHAGE DES CHOIX
  useEffect(() => {
    if (analytics && messageContext) {
      const context = {
        ...messageContext,
        choicesCount: choices.length,
        displayTime: new Date().toISOString(),
        analyzedChoices: analyzedChoices.map(ac => ({
          choice: ac.choice,
          type: ac.buttonType,
          priority: ac.priority
        }))
      };
      
      analytics.trackChoiceDisplay(choices, context);
      
      // Analytics internes
      conversationAnalytics.trackChoicesDisplayed({
        sessionId: messageContext.sessionId,
        productId: messageContext.productId,
        choices: choices,
        choicesMetadata: analyzedChoices,
        timestamp: Date.now()
      });
    }
  }, [choices, analytics, messageContext, analyzedChoices, conversationAnalytics]);

  // ✅ GESTION OPTIMISÉE DES CLICS
  const handleChoiceClick = useCallback((choice: string, metadata: any) => {
    if (disabled || selectedChoice || processedChoices.has(choice)) {
      console.log('🚫 Choice ignored:', { 
        disabled, 
        selectedChoice, 
        alreadyProcessed: processedChoices.has(choice),
        choice: choice.substring(0, 30)
      });
      return;
    }

    console.log('✅ Processing choice with analytics:', choice.substring(0, 30));

    // ✅ ANALYSER L'INTENTION D'ACHAT
    const purchaseIntent = intentDetector.analyzePurchaseIntent(choice);
    
    // ✅ MARQUER LE CHOIX COMME SÉLECTIONNÉ ET TRAITÉ
    setSelectedChoice(choice);
    setProcessedChoices(prev => new Set(prev).add(choice));

    // ✅ ANALYTICS DÉTAILLÉES
    const timeToClick = Date.now() - displayStartTime;
    
    if (analytics && messageContext) {
      const analyticsContext = {
        ...messageContext,
        choice,
        timeToClick,
        buttonType: metadata.buttonType,
        priority: metadata.priority,
        purchaseIntent: {
          score: purchaseIntent.score,
          confidence: purchaseIntent.confidence,
          recommendation: purchaseIntent.recommendation
        },
        clickTime: new Date().toISOString()
      };
      
      analytics.trackChoiceClick(choice, analyticsContext);
    }

    // ✅ ANALYTICS INTERNES
    conversationAnalytics.trackChoiceSelected({
      sessionId: messageContext?.sessionId || 'unknown',
      productId: messageContext?.productId || 'unknown',
      choice,
      choiceMetadata: metadata,
      purchaseIntent,
      timeToClick,
      timestamp: Date.now()
    });

    // ✅ DÉLAI AVANT TRAITEMENT POUR ÉVITER LES CLICS MULTIPLES
    setTimeout(() => {
      onChoiceSelect(choice);
    }, 100);
  }, [disabled, selectedChoice, processedChoices, onChoiceSelect, intentDetector, displayStartTime, analytics, messageContext, conversationAnalytics]);

  // ✅ GESTION DES LIENS EXTERNES OPTIMISÉE
  const handleExternalClick = useCallback((choice: string) => {
    const url = getExternalUrl(choice, externalUrl);
    if (url) {
      window.open(url, '_blank');
      
      // Analytics pour liens externes
      if (analytics && messageContext) {
        analytics.trackChoiceClick(choice, {
          ...messageContext,
          type: 'external_link',
          url,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Appeler aussi le handler normal pour le tracking
    onChoiceSelect(choice);
  }, [externalUrl, onChoiceSelect, analytics, messageContext]);

  // ✅ RESET DES ÉTATS APRÈS UN DÉLAI
  useEffect(() => {
    if (selectedChoice) {
      const timer = setTimeout(() => {
        setSelectedChoice(null);
        setProcessedChoices(new Set());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [selectedChoice]);

  // ✅ FILTRER LES CHOIX VIDES OU INVALIDES
  const validChoices = useMemo(() => {
    return analyzedChoices.filter(ac => ac.choice && ac.choice.trim().length > 0);
  }, [analyzedChoices]);

  if (!validChoices || validChoices.length === 0) {
    return null;
  }

  // ✅ RENDU DU BOUTON OPTIMISÉ AVEC ANALYTICS
  const renderChoiceButton = (analysedChoice: typeof analyzedChoices[0]): React.ReactNode => {
    const { choice, index, buttonType, priority, isImmediate } = analysedChoice;
    
    const isSelected = selectedChoice === choice;
    const isProcessed = processedChoices.has(choice);
    const isDisabled = disabled || isSelected || isProcessed;

    const buttonProps: ChoiceButtonProps = {
      choice,
      index,
      onClick: () => handleChoiceClick(choice, analysedChoice),
      disabled: isDisabled,
      isSelected,
      isProcessed,
      buttonType,
      priority
    };

    // ✅ BOUTON WAVE SPÉCIAL OPTIMISÉ
    if (buttonType === 'wave') {
      return (
        <WavePaymentButton
          key={`${choice}-${index}`}
          {...buttonProps}
          onExternalClick={() => handleExternalClick(choice)}
        />
      );
    }

    // ✅ BOUTON STRIPE SPÉCIAL
    if (buttonType === 'stripe') {
      return (
        <StripePaymentButton
          key={`${choice}-${index}`}
          {...buttonProps}
        />
      );
    }

    // ✅ BOUTON LIEN EXTERNE
    if (buttonType === 'external') {
      return (
        <ExternalLinkButton
          key={`${choice}-${index}`}
          {...buttonProps}
          onExternalClick={() => handleExternalClick(choice)}
        />
      );
    }

    // ✅ BOUTON PRINCIPAL (ACHAT)
    if (buttonType === 'primary') {
      return (
        <PrimaryActionButton
          key={`${choice}-${index}`}
          {...buttonProps}
          isImmediate={isImmediate}
        />
      );
    }

    // ✅ BOUTON ACTION (QUESTIONS, INFO)
    if (buttonType === 'action') {
      return (
        <ActionButton
          key={`${choice}-${index}`}
          {...buttonProps}
        />
      );
    }

    // ✅ BOUTON SECONDAIRE STANDARD
    return (
      <SecondaryButton
        key={`${choice}-${index}`}
        {...buttonProps}
      />
    );
  };

  return (
  <div className={`flex flex-wrap gap-2 ${className}`}>
      {validChoices.map((analysedChoice) => renderChoiceButton(analysedChoice))}
      
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

// ✅ COMPOSANTS SPÉCIALISÉS POUR CHAQUE TYPE DE BOUTON

const WavePaymentButton: React.FC<ChoiceButtonProps & { onExternalClick: () => void }> = ({
  choice, index, onClick, disabled, isSelected, isProcessed, onExternalClick
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className="w-full justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    style={{
      backgroundColor: '#4BD2FA',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease-in-out',
      fontSize: '14px',
      minHeight: '48px',
      boxShadow: '0 4px 12px rgba(75, 210, 250, 0.3)'
    }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={!disabled ? { scale: 1.02, boxShadow: '0 6px 20px rgba(75, 210, 250, 0.4)' } : undefined}
    whileTap={!disabled ? { scale: 0.98 } : undefined}
  >
    <img 
      src="/images/payments/wave_2.svg" 
      alt="Wave" 
      style={{ width: '20px', height: '20px', flexShrink: 0 }} 
    />
    <span>Payer avec Wave</span>
    <ExternalLink className="w-4 h-4 opacity-75" />
    {isSelected && <span className="ml-2 text-xs">✓</span>}
  </motion.button>
);

const StripePaymentButton: React.FC<ChoiceButtonProps> = ({
  choice, index, onClick, disabled, isSelected
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className="w-full px-4 py-3 bg-[#635BFF] hover:bg-[#5A52E8] text-white rounded-lg font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={!disabled ? { scale: 1.02 } : undefined}
    whileTap={!disabled ? { scale: 0.98 } : undefined}
  >
    <ShoppingCart className="w-4 h-4" />
    <span>Payer par carte</span>
    {isSelected && <span className="ml-2 text-xs">✓</span>}
  </motion.button>
);

const PrimaryActionButton: React.FC<ChoiceButtonProps & { isImmediate?: boolean }> = ({
  choice, index, onClick, disabled, isSelected, isImmediate
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed ${
      isImmediate 
        ? 'bg-gradient-to-r from-[#FF7E93] to-[#FF6B9D] text-white shadow-lg hover:shadow-xl animate-pulse'
        : 'bg-[#FF7E93] text-white shadow-md hover:bg-[#FF7E93]/90 hover:shadow-lg'
    }`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={!disabled ? { scale: 1.02 } : undefined}
    whileTap={!disabled ? { scale: 0.98 } : undefined}
  >
    {isImmediate && <Zap className="w-4 h-4" />}
    <span>{choice}</span>
    {isSelected && <span className="ml-2 text-xs">✓</span>}
  </motion.button>
);

const ActionButton: React.FC<ChoiceButtonProps> = ({
  choice, index, onClick, disabled, isSelected
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className="w-full px-4 py-3 border-2 border-[#FF7E93] text-[#FF7E93] font-medium rounded-lg hover:bg-[#FF7E93] hover:text-white transition-all duration-200 text-sm flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={!disabled ? { scale: 1.01 } : undefined}
    whileTap={!disabled ? { scale: 0.99 } : undefined}
  >
    {choice.toLowerCase().includes('question') && <MessageCircle className="w-4 h-4" />}
    {choice.toLowerCase().includes('savoir') && <Info className="w-4 h-4" />}
    <span>{choice}</span>
    {isSelected && <span className="ml-2 text-xs text-current">✓</span>}
  </motion.button>
);

const SecondaryButton: React.FC<ChoiceButtonProps> = ({
  choice, index, onClick, disabled, isSelected, isProcessed
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className={`
      inline-block px-4 py-2 mx-1 mb-2 rounded-lg border transition-all duration-200 text-sm
      ${isSelected 
        ? 'border-pink-500 bg-pink-50 text-pink-700' 
        : disabled 
          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          : 'border-gray-300 bg-white text-gray-700 hover:border-pink-300 hover:bg-pink-50 cursor-pointer shadow-sm hover:shadow-md'
      }
      ${isProcessed ? 'opacity-50' : ''}
    `}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={!disabled ? { scale: 1.02 } : undefined}
    whileTap={!disabled ? { scale: 0.98 } : undefined}
    title={disabled ? 'Choix déjà sélectionné' : choice}
  >
    <span className="text-sm font-medium leading-relaxed">
      {choice}
    </span>
    {isSelected && (
      <span className="ml-2 text-xs text-pink-500">
        ✓
      </span>
    )}
  </motion.button>
);

const ExternalLinkButton: React.FC<ChoiceButtonProps & { onExternalClick: () => void }> = ({
  choice, index, onClick, disabled, onExternalClick
}) => (
  <motion.button
    onClick={onExternalClick}
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

// ✅ FONCTIONS UTILITAIRES

function isExternalLink(choice: string): boolean {
  return choice.includes('Voir tous nos jeux') || 
         choice.includes('🌐') ||
         choice.includes('WhatsApp') ||
         choice.includes('+221');
}

function getExternalUrl(choice: string, externalUrl?: ChatChoicesProps['externalUrl']): string | null {
  if (choice.includes('WhatsApp') || choice.includes('+221')) {
    return 'https://wa.me/221781362728';
  }
  if (choice.includes('Voir tous nos jeux') || choice.includes('🌐')) {
    return '/nos-jeux';
  }
  if (externalUrl) {
    return externalUrl.url;
  }
  return null;
}

export default ChatChoices;