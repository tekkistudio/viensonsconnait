// src/features/product/components/ProductChat/components/ChatMessage.tsx - VERSION AMÉLIORÉE

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Clock, 
  CreditCard, 
  Copy,
  AlertCircle,
  ExternalLink,
  Star,
  Users,
  TrendingUp,
  Heart,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import type { ChatMessage as ChatMessageType, ChatMessageMetadata } from '@/types/chat';
import { ensureStringContent } from '@/types/chat';
import { ChatProductCard, ChatProductList, ChatOrderSummary } from './ChatProductCards';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
  onChoiceSelect?: (choice: string) => void;
  onRetry?: () => void;
  showInterfaceButtons?: boolean; // ✅ NOUVEAU: Contrôle d'affichage des boutons d'interface
}

// ✅ TYPE GUARDS AMÉLIORÉS
const isValidOrderData = (data: unknown): data is Record<string, any> => {
  return Boolean(data && typeof data === 'object' && data !== null);
};

const isValidProductArray = (data: unknown): data is any[] => {
  return Boolean(Array.isArray(data) && data.length > 0);
};

const isValidUpsellProduct = (data: unknown): data is Record<string, any> & { id: string | number } => {
  return Boolean(data && typeof data === 'object' && data !== null && 'id' in data);
};

// ✅ FONCTIONS UTILITAIRES AMÉLIORÉES
const convertToOrderItems = (orderData: unknown) => {
  if (!isValidOrderData(orderData)) return [];
  
  const data = orderData as Record<string, any>;
  if (!Array.isArray(data.items)) return [];
  
  return data.items.map((item: any) => ({
    productId: String(item?.productId || item?.product_id || ''),
    name: String(item?.name || item?.productName || item?.product_name || 'Produit'),
    quantity: Math.max(1, Number(item?.quantity || 1)),
    price: Math.max(0, Number(item?.price || item?.unitPrice || item?.unit_price || 0)),
    image: (item?.image && typeof item.image === 'string' && item.image.trim()) 
      ? item.image 
      : undefined
  }));
};

const extractTotalAmount = (orderData: unknown): number => {
  if (!isValidOrderData(orderData)) return 0;
  
  const data = orderData as Record<string, any>;
  return Math.max(0, Number(
    data.totalAmount || 
    data.total_amount || 
    data.amount ||
    0
  ));
};

// ✅ DÉTECTION D'APPAREIL AMÉLIORÉE
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ✅ GESTION WAVE AVEC LIENS PROFONDS AMÉLIORÉE
const handleWavePayment = async (
  choice: string, 
  metadata?: ChatMessageMetadata,
  onChoiceSelect?: (choice: string) => void
): Promise<{ success: boolean; redirected?: boolean }> => {
  console.log('🌊 Processing enhanced Wave payment:', choice);
  
  try {
    let amount = 0;
    
    if (metadata?.paymentAmount && typeof metadata.paymentAmount === 'number') {
      amount = metadata.paymentAmount;
    } else if (metadata?.orderData && isValidOrderData(metadata.orderData)) {
      amount = extractTotalAmount(metadata.orderData);
    }
    
    if (amount <= 0) {
      console.warn('⚠️ No valid payment amount found for Wave');
      return { success: false };
    }
    
    const isMobile = isMobileDevice();
    const merchantId = 'M_OfAgT8X_IT6P';
    
    let waveUrl: string;
    
    if (isMobile) {
      // ✅ AMÉLIORATION: Liens profonds Wave optimisés
      waveUrl = `wave://pay?amount=${amount}&merchant=${merchantId}&reference=VOSC_${Date.now()}`;
      
      console.log('📱 Enhanced mobile Wave deep link:', waveUrl);
      
      // ✅ Tentative d'ouverture de l'app
      const deepLinkAttempt = document.createElement('a');
      deepLinkAttempt.href = waveUrl;
      deepLinkAttempt.style.display = 'none';
      document.body.appendChild(deepLinkAttempt);
      deepLinkAttempt.click();
      document.body.removeChild(deepLinkAttempt);
      
      // ✅ Fallback web amélioré
      setTimeout(() => {
        const webUrl = `https://pay.wave.com/m/${merchantId}/c/sn/?amount=${amount}&reference=VOSC_${Date.now()}`;
        window.open(webUrl, '_blank');
      }, 2500);
      
    } else {
      // ✅ Desktop: URL web optimisée
      waveUrl = `https://pay.wave.com/m/${merchantId}/c/sn/?amount=${amount}&reference=VOSC_${Date.now()}`;
      
      const newWindow = window.open(waveUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      if (!newWindow) {
        window.location.href = waveUrl;
      }
    }
    
    // ✅ RETOUR AUTOMATIQUE AMÉLIORÉ
    setTimeout(() => {
      if (onChoiceSelect) {
        console.log('🔄 Auto-triggering enhanced Wave return flow');
        onChoiceSelect('WAVE_PAYMENT_INITIATED');
      }
    }, isMobile ? 6000 : 4000);
    
    return { success: true, redirected: true };
    
  } catch (error) {
    console.error('❌ Enhanced Wave payment error:', error);
    return { success: false };
  }
};

// ✅ GESTION STRIPE AMÉLIORÉE
const handleStripePayment = async (
  choice: string, 
  metadata?: ChatMessageMetadata,
  onChoiceSelect?: (choice: string) => void
): Promise<{ success: boolean; redirected?: boolean }> => {
  console.log('💳 Processing enhanced Stripe payment:', choice);
  
  try {
    let amount = 0;
    
    if (metadata?.paymentAmount && typeof metadata.paymentAmount === 'number') {
      amount = metadata.paymentAmount;
    } else if (metadata?.orderData && isValidOrderData(metadata.orderData)) {
      amount = extractTotalAmount(metadata.orderData);
    }
    
    if (amount <= 0) {
      console.warn('⚠️ No valid payment amount found for Stripe');
      return { success: false };
    }
    
    // ✅ DÉCLENCHEMENT MODAL STRIPE AMÉLIORÉ
    if (onChoiceSelect) {
      onChoiceSelect(`STRIPE_MODAL_OPEN:${amount}`);
    }
    
    return { success: true, redirected: false };
    
  } catch (error) {
    console.error('❌ Enhanced Stripe payment error:', error);
    return { success: false };
  }
};

// ✅ COMPOSANT PRINCIPAL AMÉLIORÉ
export default function ChatMessage({ 
  message, 
  onChoiceSelect,
  onRetry,
  showInterfaceButtons = false
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const messageContent = ensureStringContent(message.content);
  const metadata = message.metadata || {};
  
  // ✅ ACCÈS SÉCURISÉ AUX MÉTADONNÉES AVEC TYPE GUARDS
  const orderData = metadata.orderData;
  const hasValidOrderData = isValidOrderData(orderData);
  
  const recommendedProducts = metadata.recommendedProducts;
  const hasRecommendedProducts = isValidProductArray(recommendedProducts);
  
  const upsellProduct = metadata.upsellProduct;
  const hasUpsellProduct = isValidUpsellProduct(upsellProduct);

  // ✅ ANIMATION D'ENTRÉE
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ GESTION DES CLICS AMÉLIORÉE AVEC INTELLIGENCE COMMERCIALE
  const handleChoiceClick = async (choice: string): Promise<void> => {
    if (processingPayment) return;
    
    console.log('🎯 Enhanced choice processing:', choice);
    
    // ✅ INTELLIGENCE COMMERCIALE: Détecter l'intention d'achat
    const isPurchaseIntent = choice.toLowerCase().includes('acheter') || 
                           choice.toLowerCase().includes('commander') ||
                           choice.toLowerCase().includes('prendre');
    
    if (isPurchaseIntent) {
      // ✅ TRACKING DE CONVERSION
      console.log('🛒 Purchase intent detected, tracking conversion');
      
      // Analytics de conversion (à implémenter)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'begin_checkout', {
          currency: 'XOF',
          value: extractTotalAmount(orderData)
        });
      }
    }
    
    // ✅ GESTION WAVE AMÉLIORÉE
    if (choice.toLowerCase().includes('wave')) {
      setProcessingPayment(choice);
      
      try {
        const result = await handleWavePayment(choice, metadata, onChoiceSelect);
        
        if (result.success) {
          console.log('✅ Enhanced Wave payment process initiated');
          return;
        }
      } catch (error) {
        console.error('❌ Enhanced Wave payment failed:', error);
      } finally {
        setProcessingPayment(null);
      }
    }
    
    // ✅ GESTION STRIPE AMÉLIORÉE
    else if (choice.toLowerCase().includes('carte')) {
      setProcessingPayment(choice);
      
      try {
        const result = await handleStripePayment(choice, metadata, onChoiceSelect);
        
        if (result.success) {
          console.log('✅ Enhanced Stripe payment modal triggered');
          return;
        }
      } catch (error) {
        console.error('❌ Enhanced Stripe payment failed:', error);
      } finally {
        setProcessingPayment(null);
      }
    }
    
    // ✅ APPEL NORMAL POUR LES AUTRES BOUTONS
    if (onChoiceSelect) {
      onChoiceSelect(choice);
    }
  };

  // ✅ COPIE DU NUMÉRO DE COMMANDE AMÉLIORÉE
  const copyOrderId = async (): Promise<void> => {
    const orderId = metadata.orderId;
    if (orderId) {
      try {
        await navigator.clipboard.writeText(String(orderId));
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        
        // ✅ FEEDBACK VISUEL AMÉLIORÉ
        console.log('📋 Order ID copied to clipboard');
      } catch (error) {
        console.error('❌ Copy failed:', error);
        // ✅ Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = String(orderId);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  // ✅ DÉTECTION DU TYPE DE MESSAGE POUR PERSONNALISATION
  const getMessageVariant = (): 'welcome' | 'info' | 'sales' | 'urgent' | 'success' | 'error' => {
    if (metadata.flags?.isWelcome) return 'welcome';
    if (metadata.flags?.hasError) return 'error';
    if (metadata.flags?.orderCompleted) return 'success';
    if (metadata.flags?.createUrgency) return 'urgent';
    if (metadata.flags?.conversionOriented) return 'sales';
    return 'info';
  };

  const messageVariant = getMessageVariant();

  // ✅ STYLES PERSONNALISÉS SELON LE VARIANT
  const getMessageStyles = () => {
    const baseStyles = message.type === 'user'
      ? 'bg-[#FF7E93] text-white rounded-[20px] rounded-tr-sm'
      : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm shadow-sm border border-gray-100';

    if (message.type === 'assistant') {
      switch (messageVariant) {
        case 'welcome':
          return `${baseStyles} border-l-4 border-l-[#FF7E93]`;
        case 'sales':
          return `${baseStyles} border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white`;
        case 'urgent':
          return `${baseStyles} border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white`;
        case 'success':
          return `${baseStyles} border-l-4 border-l-green-600 bg-gradient-to-r from-green-100 to-white`;
        case 'error':
          return `${baseStyles} border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white`;
        default:
          return baseStyles;
      }
    }
    
    return baseStyles;
  };

  // ✅ ICÔNE SELON LE VARIANT
  const getVariantIcon = () => {
    switch (messageVariant) {
      case 'welcome': return <Heart className="w-4 h-4 text-[#FF7E93]" />;
      case 'sales': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'urgent': return <Zap className="w-4 h-4 text-orange-600" />;
      case 'success': return <Check className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className={`flex w-full flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`${message.type === 'user' ? 'ml-8 md:ml-12' : 'mr-8 md:mr-12'} max-w-[90%] md:max-w-[85%]`}>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`relative p-4 ${getMessageStyles()}`}
        >
          {/* ✅ EN-TÊTE AMÉLIORÉ AVEC VARIANT ICON */}
          {message.type === 'assistant' && message.assistant && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] rounded-full flex items-center justify-center relative">
                <span className="text-white text-sm font-bold">
                  {message.assistant.name?.[0] || 'R'}
                </span>
                {/* ✅ INDICATEUR DE STATUT */}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#132D5D] text-sm">
                    {message.assistant.name}
                  </span>
                  {getVariantIcon()}
                </div>
                {message.assistant.title && (
                  <p className="text-xs text-gray-500">
                    {message.assistant.title}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ✅ CONTENU DU MESSAGE AMÉLIORÉ */}
          <div className="text-[15px] leading-relaxed">
            <div 
              className="whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: messageContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#132D5D]">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
              }}
            />
          </div>

          {/* ✅ HORODATAGE AMÉLIORÉ */}
          <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            {/* ✅ INDICATEUR DE TECHNIQUE DE VENTE */}
            {metadata.salesTechnique && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs ml-2">
                {metadata.salesTechnique}
              </span>
            )}
          </div>

          {/* ✅ BOUTON DE COPIE AMÉLIORÉ */}
          {metadata.orderId && (
            <button
              onClick={copyOrderId}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors group"
              title="Copier le numéro de commande"
            >
              {copied ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-500">Copié!</span>
                </motion.div>
              ) : (
                <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>
          )}
        </motion.div>

        {/* ✅ CONTENU ÉTENDU AMÉLIORÉ */}
        {message.type === 'assistant' && (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-3"
            >
              
              {/* ✅ RÉSUMÉ DE COMMANDE AMÉLIORÉ */}
              {hasValidOrderData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <ChatOrderSummary
                    orderItems={convertToOrderItems(orderData)}
                    totalAmount={extractTotalAmount(orderData)}
                    onQuantityChange={(productId: string, newQuantity: number) => {
                      if (onChoiceSelect) {
                        onChoiceSelect(`Modifier quantité ${productId} à ${newQuantity}`);
                      }
                    }}
                    onRemoveItem={(productId: string) => {
                      if (onChoiceSelect) {
                        onChoiceSelect(`Retirer ${productId} du panier`);
                      }
                    }}
                    onProceedToCheckout={() => {
                      if (onChoiceSelect) {
                        onChoiceSelect('Finaliser ma commande');
                      }
                    }}
                  />
                </motion.div>
              )}

              {/* ✅ RECOMMANDATIONS AMÉLIORÉES */}
              {hasRecommendedProducts && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <ChatProductList
                    products={recommendedProducts as any[]}
                    title="Nos clients ont aussi aimé :"
                    variant="recommendation"
                    onAddToCart={(productId: string) => {
                      if (onChoiceSelect) {
                        onChoiceSelect(`Ajouter ${productId} au panier`);
                      }
                    }}
                    onViewDetails={(productId: string) => {
                      if (onChoiceSelect) {
                        onChoiceSelect(`Voir détails ${productId}`);
                      }
                    }}
                  />
                </motion.div>
              )}

              {/* ✅ UPSELL AMÉLIORÉ */}
              {hasUpsellProduct && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <ChatProductCard
                    product={upsellProduct as any}
                    variant="upsell"
                    onAccept={() => {
                      if (onChoiceSelect && isValidUpsellProduct(upsellProduct)) {
                        onChoiceSelect(`Accepter upsell ${upsellProduct.id}`);
                      }
                    }}
                    onDecline={() => {
                      if (onChoiceSelect) {
                        onChoiceSelect('Refuser upsell');
                      }
                    }}
                  />
                </motion.div>
              )}

              {/* ✅ BOUTONS DE CHOIX AMÉLIORÉS */}
              {message.choices && message.choices.length > 0 && !showInterfaceButtons && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="grid gap-2"
                >
                  {message.choices.map((choice, index) => {
                    const isPrimary = choice.includes('acheter') || choice.includes('⚡');
                    const isWave = choice.toLowerCase().includes('wave');
                    const isStripe = choice.toLowerCase().includes('carte');
                    const isProcessingThis = processingPayment === choice;
                    
                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={isProcessingThis}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + (index * 0.1) }}
                        whileHover={!isProcessingThis ? { scale: 1.02, y: -2 } : {}}
                        whileTap={!isProcessingThis ? { scale: 0.98 } : {}}
                        className={`
                          px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm
                          flex items-center justify-center gap-2 min-h-[48px] w-full
                          disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden
                          ${isPrimary 
                            ? 'bg-gradient-to-r from-[#FF7E93] to-[#FF6B9D] text-white shadow-lg hover:shadow-xl hover:from-[#FF6B9D] hover:to-[#FF7E93]' 
                            : isWave
                              ? 'bg-gradient-to-r from-[#4BD2FA] to-[#3BC9E8] text-white shadow-lg hover:shadow-xl'
                              : isStripe
                                ? 'bg-gradient-to-r from-[#635BFF] to-[#5A52E8] text-white shadow-lg hover:shadow-xl'
                                : 'bg-white text-[#FF7E93] border-2 border-[#FF7E93] hover:bg-[#FF7E93] hover:text-white hover:shadow-lg'
                          }
                        `}
                      >
                        {/* ✅ ANIMATION DE LOADING */}
                        {isProcessingThis && (
                          <motion.div
                            className="absolute inset-0 bg-black bg-opacity-20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                        
                        {isProcessingThis ? (
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>
                              {isMobileDevice() && isWave ? 'Ouverture Wave...' : 'Redirection...'}
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {/* ✅ ICÔNES AMÉLIORÉES */}
                            {isWave ? (
                              <Image 
                                src="/images/payments/wave_2.svg" 
                                alt="Wave" 
                                width={18} 
                                height={18} 
                                className="flex-shrink-0" 
                              />
                            ) : isStripe ? (
                              <CreditCard className="w-4 h-4" />
                            ) : isPrimary ? (
                              <Zap className="w-4 h-4" />
                            ) : choice.toLowerCase().includes('livraison') ? (
                              <span>💵</span>
                            ) : null}
                            <span>{choice}</span>
                            {(isWave || isStripe) && (
                              <ExternalLink className="w-3 h-3 opacity-75" />
                            )}
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ✅ BOUTON DE RETRY AMÉLIORÉ */}
        {metadata.flags?.hasError && onRetry && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onRetry}
            className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors group"
          >
            <AlertCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Réessayer</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}