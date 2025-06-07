// src/features/product/components/ProductChat/components/ChatMessage.tsx - VERSION TYPESCRIPT CORRIGÉE
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Clock, 
  Truck, 
  CreditCard, 
  MapPin, 
  User, 
  Phone,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { ensureStringContent } from '@/types/chat'; // ✅ Import de la fonction utilitaire

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
  onChoiceSelect?: (choice: string) => void;
  onRetry?: () => void;
}

// Composant pour les étapes de progression dans le mode express
const ProgressIndicator = ({ currentStep }: { currentStep: string }) => {
  const steps = [
    { id: 'contact', label: 'Contact', icon: User, description: 'Votre numéro' },
    { id: 'address', label: 'Livraison', icon: MapPin, description: 'Votre adresse' },
    { id: 'payment', label: 'Paiement', icon: CreditCard, description: 'Mode de paiement' },
    { id: 'confirmation', label: 'Confirmation', icon: Check, description: 'Commande validée' }
  ];

  const currentIndex = steps.findIndex(step => currentStep.includes(step.id));

  return (
    <div className="mb-6">
      <div className="flex justify-center mb-2">
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <React.Fragment key={step.id}>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                    ${isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-[#FF7E93] text-white' : 'bg-gray-200 text-gray-400'}
                    ${isCurrent ? 'ring-4 ring-[#FF7E93] ring-opacity-30' : ''}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Check className="w-6 h-6" />
                    </motion.div>
                  )}
                </motion.div>
                
                {index < steps.length - 1 && (
                  <div className={`
                    w-12 h-0.5 transition-all duration-500
                    ${isActive && index < currentIndex ? 'bg-green-500' : 
                      isActive ? 'bg-[#FF7E93]' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Étiquette de l'étape courante */}
      {currentIndex >= 0 && currentIndex < steps.length && (
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm font-medium text-[#FF7E93]">
            {steps[currentIndex].label}
          </p>
          <p className="text-xs text-gray-500">
            {steps[currentIndex].description}
          </p>
        </motion.div>
      )}
    </div>
  );
};

// Composant pour afficher les informations de commande
const OrderSummary = ({ orderData }: { orderData: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
        <Check className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-green-800 mb-2">Commande confirmée !</h4>
        {orderData.orderId && (
          <div className="space-y-1 text-sm text-green-700">
            <p><span className="font-medium">N° commande :</span> {orderData.orderId}</p>
            {orderData.total && (
              <p><span className="font-medium">Total :</span> {orderData.total.toLocaleString()} FCFA</p>
            )}
            {orderData.paymentMethod && (
              <p><span className="font-medium">Paiement :</span> {orderData.paymentMethod}</p>
            )}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

// ✅ COMPOSANT CORRIGÉ: Liens de paiement avec gestion d'erreur
const PaymentLink = ({ 
  url, 
  amount, 
  paymentMethod,
  onPaymentClick
}: { 
  url: string; 
  amount?: number; 
  paymentMethod?: string;
  onPaymentClick: (url: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('💳 Payment link clicked:', { url, paymentMethod, amount });
      onPaymentClick(url);
    } catch (error) {
      console.error('❌ Error opening payment link:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 2000); // Reset après 2s
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          w-full bg-gradient-to-r from-[#FF7E93] to-[#FF6B9D] text-white rounded-xl p-4 
          hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3
          ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:from-[#FF6B9D] hover:to-[#FF7E93]'}
        `}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold">Ouverture...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span className="font-semibold">
              Payer{amount ? ` ${amount.toLocaleString()} FCFA` : ''}{paymentMethod ? ` par ${paymentMethod}` : ''}
            </span>
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-2">
        {isLoading ? 'Redirection en cours...' : 'Vous serez redirigé vers votre app de paiement'}
      </p>
    </motion.div>
  );
};

// Composant principal du message
export default function ChatMessage({ 
  message, 
  isTyping, 
  onChoiceSelect,
  onRetry 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  // ✅ CORRECTION TYPESCRIPT: Conversion sécurisée du contenu
  const messageContent = ensureStringContent(message.content);

  // Détecter le mode express et l'étape courante
  const isExpressMode = message.metadata?.flags?.expressMode === true;
  const currentStep = message.metadata?.nextStep || '';
  const hasError = message.metadata?.flags?.hasError === true;
  const isOrderComplete = message.metadata?.flags?.orderCompleted === true;

  // ✅ AMÉLIORATION: Gestion du paiement avec callback
    const handlePaymentClick = (url: string) => {
      console.log('💳 Opening payment URL:', url);
      
      try {
        // ✅ CORRECTION SPÉCIALE POUR WAVE MOBILE
        if (url.includes('pay.wave.com')) {
          console.log('🌊 Wave payment detected');
          
          // Détecter si on est sur mobile
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          if (isMobile) {
            console.log('📱 Mobile detected, using Wave deep link');
            
            // ✅ CORRECTION: Redirection immédiate vers Wave
            window.location.href = url;
            
            // Fallback après 2 secondes si l'app ne s'ouvre pas
            setTimeout(() => {
              console.log('⚠️ Fallback: Opening Wave in browser');
              const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
              if (!newWindow) {
                // Si popup bloqué, rediriger dans le même onglet
                window.location.href = url;
              }
            }, 2000);
          } else {
            // Desktop : ouvrir dans nouvel onglet
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
              window.location.href = url;
            }
          }
        } else {
          // ✅ POUR STRIPE ET AUTRES PAIEMENTS
          const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
          
          if (!newWindow) {
            // Si le popup est bloqué, essayer avec location.href
            console.warn('⚠️ Popup blocked, redirecting in same tab');
            window.location.href = url;
          }
        }
      } catch (error) {
        console.error('❌ Error opening payment URL:', error);
        // Fallback: copier l'URL dans le presse-papier
        navigator.clipboard.writeText(url).then(() => {
          alert('Lien de paiement copié dans le presse-papier. Collez-le dans votre navigateur.');
        });
      }
    };

  // Copier le numéro de commande
  const copyOrderId = async () => {
    if (message.metadata?.orderId) {
      try {
        await navigator.clipboard.writeText(message.metadata.orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  // ✅ AMÉLIORATION: Fonction pour gérer les clics sur les choix
  const handleChoiceClick = (choice: string) => {
    console.log('🔘 Choice clicked:', choice);
    
    // Vérifier si c'est un bouton de paiement avec URL
    if (message.metadata?.paymentUrl && choice.includes('Payer')) {
      handlePaymentClick(message.metadata.paymentUrl);
      return;
    }
    
    // Sinon, appeler la fonction normale de sélection
    if (onChoiceSelect) {
      onChoiceSelect(choice);
    }
  };

  return (
    <div className={`flex w-full flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`${message.type === 'user' ? 'ml-8 md:ml-12' : 'mr-8 md:mr-12'} max-w-[90%] md:max-w-[85%]`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative p-4 ${
            message.type === 'user'
              ? 'bg-[#FF7E93] text-white rounded-[20px] rounded-tr-sm'
              : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm shadow-sm border border-gray-100'
          }`}
        >
          {/* Progression pour le mode express */}
          {message.type === 'assistant' && isExpressMode && currentStep && (
            <ProgressIndicator currentStep={currentStep} />
          )}

          {/* En-tête du bot */}
          {message.type === 'assistant' && message.assistant && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {message.assistant.name?.[0] || 'R'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-[#132D5D] text-sm">
                  {message.assistant.name}
                </span>
                <p className="text-xs text-gray-500">
                  {message.assistant.title}
                </p>
              </div>
            </div>
          )}

          {/* ✅ CORRECTION TYPESCRIPT: Contenu du message sécurisé */}
          <div className="text-[15px] leading-relaxed">
            <div 
              className="whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: messageContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>

          {/* Horodatage */}
          <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          {/* Bouton de copie pour les commandes */}
          {message.metadata?.orderId && (
            <button
              onClick={copyOrderId}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copier le numéro de commande"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </motion.div>

        {/* Actions et boutons de choix */}
        {message.type === 'assistant' && (
          <div className="mt-3 space-y-3">
            {/* ✅ CORRECTION PRINCIPALE: Boutons de choix avec gestion paiement */}
            {message.choices && message.choices.length > 0 && (
              <div className="grid gap-2">
                {message.choices.map((choice, index) => {
                  const isPrimary = choice.includes('Commander rapidement') || 
                                  choice.includes('⚡') ||
                                  choice.includes('acheter') || 
                                  choice.includes('Valider') ||
                                  choice.includes('Express') ||
                                  choice.includes('Payer');
                  
                  const isWaveButton = choice.includes('Wave') || choice.includes('🌊');
                  
                  // ✅ CORRECTION: Éviter les boutons Wave dupliqués
                  if (isWaveButton) {
                    // Vérifier si on a déjà un lien de paiement Wave
                    if (message.metadata?.paymentUrl && message.metadata.paymentUrl.includes('wave.com')) {
                      console.log('⚠️ Wave button skipped - payment link already available');
                      return null; // Skip ce bouton car on a déjà le lien Wave
                    }
                    
                    // Bouton Wave spécial avec logo et couleur
                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChoiceClick(choice)}
                        className="w-full text-white rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 font-semibold border-none cursor-pointer min-h-[48px]"
                        style={{
                          backgroundColor: '#4BD2FA',
                          background: 'linear-gradient(135deg, #4BD2FA 0%, #3BC9E8 100%)'
                        }}
                      >
                        <img 
                          src="/images/payments/wave_2.svg" 
                          alt="Wave" 
                          className="w-5 h-5 flex-shrink-0" 
                        />
                        <span>{choice.replace(/🌊|Wave/g, '').trim() || 'Payer avec Wave'}</span>
                      </motion.button>
                    );
                  }
                  
                  // ✅ BOUTONS NORMAUX
                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChoiceClick(choice)}
                      className={`
                        px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm
                        ${isPrimary 
                          ? 'bg-[#FF7E93] text-white shadow-md hover:bg-[#FF7E93]/90 hover:shadow-lg' 
                          : 'bg-white text-[#FF7E93] border border-[#FF7E93] hover:bg-[#FF7E93]/5 hover:shadow-md'
                        }
                        flex items-center justify-center gap-2 min-h-[48px] w-full
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <span>{choice}</span>
                    </motion.button>
                  );
                }).filter(Boolean)} {/* ✅ Filtrer les boutons null */}
              </div>
            )}

            {/* ✅ AMÉLIORATION: Lien de paiement séparé pour plus de visibilité */}
            {message.metadata?.paymentUrl && message.metadata?.paymentAmount && (
              <PaymentLink
                url={message.metadata.paymentUrl}
                amount={message.metadata.paymentAmount}
                paymentMethod={message.metadata?.paymentMethod}
                onPaymentClick={handlePaymentClick}
              />
            )}

            {/* Résumé de commande */}
            {isOrderComplete && message.metadata?.orderId && (
              <OrderSummary orderData={message.metadata} />
            )}
          </div>
        )}

        {/* Bouton de retry en cas d'erreur */}
        {hasError && onRetry && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onRetry}
            className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Réessayer</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}