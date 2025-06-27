// src/features/product/components/ProductChat/components/ChatMessage.tsx - VERSION CORRIGÉE WAVE FLOW
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Clock, 
  CreditCard, 
  Copy,
  AlertCircle,
  ExternalLink
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
}

// ✅ TYPE GUARD: Vérifier si orderData existe et est valide
const isValidOrderData = (data: unknown): data is Record<string, any> => {
  return Boolean(
    data && 
    typeof data === 'object' && 
    data !== null
  );
};

// ✅ TYPE GUARD: Vérifier si un array de produits est valide
const isValidProductArray = (data: unknown): data is any[] => {
  return Boolean(
    Array.isArray(data) && 
    data.length > 0
  );
};

// ✅ TYPE GUARD: Vérifier si un produit d'upsell est valide
const isValidUpsellProduct = (data: unknown): data is Record<string, any> & { id: string | number } => {
  return Boolean(
    data && 
    typeof data === 'object' && 
    data !== null &&
    'id' in data
  );
};

// ✅ FONCTION: Conversion sécurisée des données de commande
const convertToOrderItems = (orderData: unknown) => {
  if (!isValidOrderData(orderData)) {
    return [];
  }
  
  const data = orderData as Record<string, any>;
  
  if (!Array.isArray(data.items)) {
    return [];
  }
  
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

// ✅ FONCTION: Extraction sécurisée du montant total
const extractTotalAmount = (orderData: unknown): number => {
  if (!isValidOrderData(orderData)) {
    return 0;
  }
  
  const data = orderData as Record<string, any>;
  return Math.max(0, Number(
    data.totalAmount || 
    data.total_amount || 
    data.amount ||
    0
  ));
};

// ✅ FONCTION: Détecter les boutons de paiement
const isPaymentButton = (choice: string): boolean => {
  const paymentKeywords = [
    'payer', 'wave', 'carte', 'livraison', 'bancaire', 
    '💳', '🌊', '📱', '🛵', '💵'
  ];
  
  return paymentKeywords.some(keyword => 
    choice.toLowerCase().includes(keyword.toLowerCase())
  );
};

// ✅ FONCTION CORRIGÉE: Gestion des paiements Wave avec auto-retour
const handleWavePayment = async (
  choice: string, 
  metadata?: ChatMessageMetadata,
  onChoiceSelect?: (choice: string) => void
): Promise<{ success: boolean; redirected?: boolean }> => {
  console.log('🌊 Processing Wave payment:', choice);
  
  try {
    // ✅ CORRECTION: Extraire le montant de manière sécurisée
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
    
    // ✅ CORRECTION: Construire l'URL Wave avec le montant
    const waveUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${amount}`;
    
    console.log('🔗 Opening Wave payment URL:', waveUrl);
    
    // ✅ Redirection selon le type d'appareil
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Mobile : Ouvrir dans la même fenêtre pour activer l'app Wave
      window.location.href = waveUrl;
    } else {
      // Desktop : Ouvrir dans un nouvel onglet
      const newWindow = window.open(waveUrl, '_blank', 'width=800,height=600');
      if (!newWindow) {
        // Si le popup est bloqué, essayer la même fenêtre
        window.location.href = waveUrl;
      }
    }
    
    // ✅ NOUVEAU: Après redirection, déclencher automatiquement le retour
    setTimeout(() => {
      if (onChoiceSelect) {
        console.log('🔄 Auto-triggering Wave payment return flow');
        onChoiceSelect('WAVE_PAYMENT_INITIATED');
      }
    }, 3000); // ✅ 3 secondes pour laisser le temps à l'utilisateur de voir la redirection
    
    return { success: true, redirected: true };
    
  } catch (error) {
    console.error('❌ Wave payment error:', error);
    return { success: false };
  }
};

// ✅ FONCTION: Gestion des paiements Stripe avec modal intégré
const handleStripePayment = async (
  choice: string, 
  metadata?: ChatMessageMetadata,
  onChoiceSelect?: (choice: string) => void
): Promise<{ success: boolean; redirected?: boolean }> => {
  console.log('💳 Processing Stripe payment with integrated modal:', choice);
  
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
    
    // ✅ NOUVEAU: Déclencher l'ouverture du modal Stripe intégré
    if (onChoiceSelect) {
      onChoiceSelect(`STRIPE_MODAL_OPEN:${amount}`);
    }
    
    return { success: true, redirected: false };
    
  } catch (error) {
    console.error('❌ Stripe modal opening error:', error);
    return { success: false };
  }
};

// ✅ NOUVEAU: Validation d'ID de transaction Wave
const validateWaveTransactionId = (transactionId: string): boolean => {
  // Les IDs Wave commencent par 'T' et font généralement 14-16 caractères
  const waveIdPattern = /^T[A-Z0-9]{10,15}$/i;
  return waveIdPattern.test(transactionId.trim().toUpperCase());
};

// ✅ COMPOSANT PRINCIPAL
export default function ChatMessage({ 
  message, 
  onChoiceSelect,
  onRetry 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const messageContent = ensureStringContent(message.content);
  
  // ✅ ACCÈS SÉCURISÉ AUX MÉTADONNÉES
  const metadata = message.metadata || {};
  
  // Utilisation des type guards pour éliminer les erreurs TypeScript
  const orderData = metadata.orderData;
  const hasValidOrderData = isValidOrderData(orderData);
  
  const recommendedProducts = metadata.recommendedProducts;
  const hasRecommendedProducts = isValidProductArray(recommendedProducts);
  
  const upsellProduct = metadata.upsellProduct;
  const hasUpsellProduct = isValidUpsellProduct(upsellProduct);

  // ✅ GESTION DES CLICS SUR LES BOUTONS CORRIGÉE
  const handleChoiceClick = async (choice: string): Promise<void> => {
    if (processingPayment) return;
    
    // ✅ CORRECTION: Gestion spécifique Wave avec auto-retour
    if (choice.toLowerCase().includes('wave')) {
      setProcessingPayment(choice);
      
      try {
        const result = await handleWavePayment(choice, metadata, onChoiceSelect);
        
        if (result.success) {
          console.log('✅ Wave payment process initiated with auto-return');
          // Le retour automatique est géré dans handleWavePayment
          return;
        }
      } catch (error) {
        console.error('❌ Wave payment processing failed:', error);
      } finally {
        setProcessingPayment(null);
      }
    }
    
    // ✅ Gestion Stripe
    else if (choice.toLowerCase().includes('carte')) {
      setProcessingPayment(choice);
      
      try {
        const result = await handleStripePayment(choice, metadata, onChoiceSelect);
        
        if (result.success) {
          console.log('✅ Stripe payment modal triggered');
          // Le modal sera géré par le composant parent
          return;
        }
      } catch (error) {
        console.error('❌ Stripe payment processing failed:', error);
      } finally {
        setProcessingPayment(null);
      }
    }
    
    // Appeler le handler normal pour les autres boutons
    if (onChoiceSelect) {
      onChoiceSelect(choice);
    }
  };

  // ✅ COPIE DU NUMÉRO DE COMMANDE
  const copyOrderId = async (): Promise<void> => {
    const orderId = metadata.orderId;
    if (orderId) {
      try {
        await navigator.clipboard.writeText(String(orderId));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Copy failed:', error);
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
                {message.assistant.title && (
                  <p className="text-xs text-gray-500">
                    {message.assistant.title}
                  </p>
                )}
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
          {metadata.orderId && (
            <button
              onClick={copyOrderId}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copier le numéro de commande"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </motion.div>

        {/* Actions et contenu supplémentaire */}
        {message.type === 'assistant' && (
          <div className="mt-3 space-y-3">
            
            {/* ✅ RÉSUMÉ DE COMMANDE - Type safe */}
            {hasValidOrderData && (
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
            )}

            {/* ✅ RECOMMANDATIONS - Type safe */}
            {hasRecommendedProducts && (
              <ChatProductList
                products={recommendedProducts as any[]}
                title="Vous pourriez aussi aimer :"
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
            )}

            {/* ✅ UPSELL - Type safe */}
            {hasUpsellProduct && (
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
            )}

            {/* ✅ BOUTONS DE CHOIX CORRIGÉS AVEC WAVE AUTO-RETOUR */}
            {message.choices && message.choices.length > 0 && (
              <div className="grid gap-2">
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
                      whileHover={!isProcessingThis ? { scale: 1.02 } : {}}
                      whileTap={!isProcessingThis ? { scale: 0.98 } : {}}
                      className={`
                        px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm
                        flex items-center justify-center gap-2 min-h-[48px] w-full
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isPrimary 
                          ? 'bg-[#FF7E93] text-white shadow-md hover:bg-[#FF7E93]/90 hover:shadow-lg' 
                          : isWave
                            ? 'bg-[#4BD2FA] hover:bg-[#3BC9E8] text-white shadow-md hover:shadow-lg'
                            : isStripe
                              ? 'bg-[#635BFF] hover:bg-[#5A52E8] text-white shadow-md hover:shadow-lg'
                              : 'bg-white text-[#FF7E93] border border-[#FF7E93] hover:bg-[#FF7E93]/5 hover:shadow-md'
                        }
                      `}
                    >
                      {isProcessingThis ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Redirection...</span>
                        </>
                      ) : (
                        <>
                          {/* ✅ CORRECTION: Icônes spécifiques selon le type de paiement */}
                          {isWave ? (
                            <Image 
                              src="/images/payments/wave_2.svg" 
                              alt="Wave" 
                              width={16} 
                              height={16} 
                              className="flex-shrink-0" 
                            />
                          ) : isStripe ? (
                            <CreditCard className="w-4 h-4" />
                          ) : choice.toLowerCase().includes('livraison') ? (
                            <span>💵</span>
                          ) : null}
                          <span>{choice}</span>
                          {(isWave || isStripe) && <ExternalLink className="w-3 h-3 opacity-75" />}
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bouton de retry en cas d'erreur */}
        {metadata.flags?.hasError && onRetry && (
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