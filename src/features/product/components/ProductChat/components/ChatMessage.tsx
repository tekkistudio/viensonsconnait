// src/features/product/components/ProductChat/components/ChatMessage.tsx - VERSION CORRIGÉE
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
import { ensureStringContent } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
  onChoiceSelect?: (choice: string) => void;
  onRetry?: () => void;
}

// ✅ CORRECTION 1: Fonction améliorée pour détecter les boutons de paiement
const isDirectPaymentButton = (choice: string): boolean => {
  const paymentButtons = [
    'Payer avec Wave',
    'Wave',
    'Payer par Carte bancaire',
    'Carte bancaire',
    'Payer à la livraison',
    '🌊',
    '💳',
    '🛵'
  ];
  
  return paymentButtons.some(btn => 
    choice.toLowerCase().includes(btn.toLowerCase()) ||
    choice.includes(btn)
  );
};

// ✅ CORRECTION 2: Fonction de paiement améliorée avec debugging
const handleDirectPayment = async (choice: string, metadata?: any): Promise<boolean> => {
  console.log('💳 [PAYMENT DEBUG] Starting payment process:', { 
    choice, 
    metadata: metadata ? Object.keys(metadata) : 'undefined'
  });
  
  try {
    // ✅ CORRECTION 3: Récupération robuste des données de commande
    let paymentAmount = 0;
    let orderData: any = {};
    
    // Essayer différentes sources pour le montant
    if (metadata?.paymentAmount) {
      paymentAmount = metadata.paymentAmount;
      console.log('💰 [PAYMENT DEBUG] Amount from paymentAmount:', paymentAmount);
    } else if (metadata?.orderData?.total_amount) {
      paymentAmount = metadata.orderData.total_amount;
      console.log('💰 [PAYMENT DEBUG] Amount from orderData.total_amount:', paymentAmount);
    } else if (metadata?.orderData?.totalAmount) {
      paymentAmount = metadata.orderData.totalAmount;
      console.log('💰 [PAYMENT DEBUG] Amount from orderData.totalAmount:', paymentAmount);
    } else {
      // Extraire depuis le texte du bouton
      const amountMatch = choice.match(/(\d+(?:[\s,]\d{3})*)/);
      if (amountMatch) {
        paymentAmount = parseInt(amountMatch[1].replace(/[\s,]/g, ''));
        console.log('💰 [PAYMENT DEBUG] Amount extracted from button text:', paymentAmount);
      }
    }
    
    // Récupérer orderData
    if (metadata?.orderData) {
      orderData = metadata.orderData;
      console.log('📦 [PAYMENT DEBUG] Order data found:', Object.keys(orderData));
    }
    
    // ✅ VALIDATION CRITIQUE
    if (!paymentAmount || paymentAmount <= 0) {
      console.error('❌ [PAYMENT DEBUG] No valid payment amount found');
      alert('Erreur: Montant de paiement non trouvé. Veuillez recommencer votre commande.');
      return false;
    }
    
    console.log('✅ [PAYMENT DEBUG] Payment amount validated:', paymentAmount);
    
    // ✅ WAVE PAYMENT
    if (choice.toLowerCase().includes('wave') || choice.includes('🌊')) {
      console.log('🌊 [WAVE DEBUG] Processing Wave payment');
      
      let paymentUrl = '';
      
      if (metadata?.paymentUrl && metadata.paymentUrl.includes('wave.com')) {
        paymentUrl = metadata.paymentUrl;
      } else {
        paymentUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${paymentAmount}`;
      }
      
      console.log('🌊 [WAVE DEBUG] Payment URL:', paymentUrl);
      
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile: Essayer app Wave puis fallback
        const waveAppUrl = `wave://pay?amount=${paymentAmount}`;
        console.log('📱 [WAVE DEBUG] Trying Wave app:', waveAppUrl);
        
        try {
          const link = document.createElement('a');
          link.href = waveAppUrl;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => {
            console.log('🌐 [WAVE DEBUG] Fallback to web version');
            window.open(paymentUrl, '_blank') || (window.location.href = paymentUrl);
          }, 2000);
        } catch (error) {
          console.log('🌐 [WAVE DEBUG] Direct web redirect');
          window.open(paymentUrl, '_blank') || (window.location.href = paymentUrl);
        }
      } else {
        // Desktop: Direct web
        console.log('🖥️ [WAVE DEBUG] Desktop payment');
        const newWindow = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          window.location.href = paymentUrl;
        }
      }
      
      return true;
    }
    
    // ✅ CARTE BANCAIRE
    if (choice.toLowerCase().includes('carte bancaire') || choice.includes('💳')) {
      console.log('💳 [STRIPE DEBUG] Processing card payment');
      
      let orderId = '';
      let customerName = '';
      
      // Récupérer orderId
      if (metadata?.orderId) {
        orderId = metadata.orderId;
      } else if (metadata?.orderData?.id) {
        orderId = metadata.orderData.id;
      } else if (metadata?.orderData?.order_id) {
        orderId = metadata.orderData.order_id;
      } else if (metadata?.orderData?.session_id) {
        orderId = metadata.orderData.session_id;
      }
      
      // Récupérer customer name
      if (metadata?.customerName) {
        customerName = metadata.customerName;
      } else if (metadata?.orderData?.first_name && metadata?.orderData?.last_name) {
        customerName = `${metadata.orderData.first_name} ${metadata.orderData.last_name}`;
      } else if (metadata?.orderData?.name) {
        customerName = metadata.orderData.name;
      }
      
      console.log('💳 [STRIPE DEBUG] Order details:', { orderId, paymentAmount, customerName });
      
      if (!orderId) {
        console.error('❌ [STRIPE DEBUG] No order ID found');
        alert('Erreur: ID de commande manquant. Veuillez recommencer votre commande.');
        return false;
      }
      
      try {
        // Conversion FCFA → EUR
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(paymentAmount * 0.00153 * 100), // FCFA → EUR centimes
            currency: 'eur',
            orderId: orderId,
            customerName: customerName || 'Client',
            successUrl: `${window.location.origin}/chat/payment-success?order_id=${orderId}`,
            cancelUrl: `${window.location.origin}/chat/payment-canceled?order_id=${orderId}`
          }),
        });

        console.log('💳 [STRIPE DEBUG] API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Stripe API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        const session = await response.json();
        console.log('✅ [STRIPE DEBUG] Session created:', session.id);
        
        if (session.url) {
          window.location.href = session.url;
          return true;
        } else {
          throw new Error('No checkout URL received from Stripe');
        }
        
      } catch (stripeError) {
        console.error('❌ [STRIPE DEBUG] Error:', stripeError);
        alert(`Erreur lors de la création du paiement: ${stripeError instanceof Error ? stripeError.message : 'Erreur inconnue'}`);
        return false;
      }
    }
    
    // ✅ PAIEMENT À LA LIVRAISON
    if (choice.toLowerCase().includes('livraison') || choice.includes('🛵')) {
      console.log('🛵 [CASH DEBUG] Processing cash on delivery');
      
      if (metadata?.orderId || metadata?.orderData?.id || metadata?.orderData?.order_id) {
        try {
          const orderId = metadata.orderId || metadata.orderData.id || metadata.orderData.order_id;
          
          const response = await fetch('/api/orders/confirm-cash-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: orderId
            }),
          });
          
          if (response.ok) {
            console.log('✅ [CASH DEBUG] Payment confirmed');
            return true;
          } else {
            console.warn('⚠️ [CASH DEBUG] Confirmation failed, falling back to chat');
          }
        } catch (error) {
          console.error('❌ [CASH DEBUG] Error:', error);
        }
      }
      
      return false; // Laisser le chatbot gérer
    }
    
    console.log('⚠️ [PAYMENT DEBUG] Payment method not recognized:', choice);
    return false;
    
  } catch (error) {
    console.error('❌ [PAYMENT DEBUG] Critical error:', error);
    alert(`Erreur de paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return false;
  }
};

// Composant pour les étapes de progression
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

// Composant principal du message
export default function ChatMessage({ 
  message, 
  isTyping, 
  onChoiceSelect,
  onRetry 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const messageContent = ensureStringContent(message.content);

  // Détecter le mode express et l'étape courante
  const isExpressMode = message.metadata?.flags?.expressMode === true;
  const currentStep = message.metadata?.nextStep || '';
  const hasError = message.metadata?.flags?.hasError === true;
  const isOrderComplete = message.metadata?.flags?.orderCompleted === true;

  // ✅ CORRECTION 4: Gestion intelligente des clics
  const handleChoiceClick = async (choice: string) => {
    console.log('🔘 [CHOICE DEBUG] Choice clicked:', choice);
    
    if (processingPayment) {
      console.log('⏳ [CHOICE DEBUG] Payment already processing');
      return;
    }
    
    // ✅ TRAITEMENT DES PAIEMENTS DIRECTS
    if (isDirectPaymentButton(choice)) {
      console.log('💳 [CHOICE DEBUG] Payment button detected');
      setProcessingPayment(choice);
      
      try {
        const paymentHandled = await handleDirectPayment(choice, message.metadata);
        
        if (paymentHandled) {
          console.log('✅ [CHOICE DEBUG] Direct payment handled successfully');
          return; // Ne pas appeler onChoiceSelect
        } else {
          console.log('⚠️ [CHOICE DEBUG] Direct payment failed, falling back to chatbot');
        }
      } catch (error) {
        console.error('❌ [CHOICE DEBUG] Direct payment error:', error);
      } finally {
        setProcessingPayment(null);
      }
    }
    
    // ✅ POUR TOUS LES AUTRES BOUTONS
    if (onChoiceSelect) {
      console.log('🔄 [CHOICE DEBUG] Calling onChoiceSelect for:', choice);
      onChoiceSelect(choice);
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

          {/* Contenu du message */}
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
            {/* ✅ BOUTONS DE CHOIX AVEC DEBUG */}
            {message.choices && message.choices.length > 0 && (
              <div className="grid gap-2">
                {message.choices.map((choice, index) => {
                  const isPrimary = choice.includes('Commander rapidement') || 
                                  choice.includes('⚡') ||
                                  choice.includes('acheter') || 
                                  choice.includes('Valider') ||
                                  choice.includes('Express');
                  
                  const isPaymentButton = isDirectPaymentButton(choice);
                  const isWaveButton = choice.toLowerCase().includes('wave') || choice.includes('🌊');
                  const isProcessingThis = processingPayment === choice;
                  
                  // ✅ BOUTON WAVE SPÉCIAL
                  if (isWaveButton) {
                    return (
                      <motion.button
                        key={index}
                        whileHover={!isProcessingThis ? { scale: 1.02 } : {}}
                        whileTap={!isProcessingThis ? { scale: 0.98 } : {}}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={isProcessingThis}
                        className="w-full text-white rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 font-semibold border-none cursor-pointer min-h-[48px] disabled:opacity-75 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: '#4BD2FA',
                          background: 'linear-gradient(135deg, #4BD2FA 0%, #3BC9E8 100%)',
                          boxShadow: '0 4px 12px rgba(75, 210, 250, 0.3)'
                        }}
                      >
                        {isProcessingThis ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Ouverture...</span>
                          </>
                        ) : (
                          <>
                            <img 
                              src="/images/payments/wave_2.svg" 
                              alt="Wave" 
                              className="w-6 h-6 flex-shrink-0" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <span className="font-bold tracking-wide">
                              {choice.replace(/🌊|Wave/g, '').trim() || 'Payer avec Wave'}
                            </span>
                            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                              <span className="text-xs">→</span>
                            </div>
                          </>
                        )}
                      </motion.button>
                    );
                  }
                  
                  // ✅ AUTRES BOUTONS DE PAIEMENT
                  if (isPaymentButton) {
                    return (
                      <motion.button
                        key={index}
                        whileHover={!isProcessingThis ? { scale: 1.02 } : {}}
                        whileTap={!isProcessingThis ? { scale: 0.98 } : {}}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={isProcessingThis}
                        className="bg-[#FF7E93] text-white shadow-md hover:bg-[#FF7E93]/90 hover:shadow-lg px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm flex items-center justify-center gap-2 min-h-[48px] w-full disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {isProcessingThis ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Traitement...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>{choice}</span>
                          </>
                        )}
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
                })}
              </div>
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