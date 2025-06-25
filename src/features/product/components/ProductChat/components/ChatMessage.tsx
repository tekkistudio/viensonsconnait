// src/features/product/components/ProductChat/components/ChatMessage.tsx - VERSION FINALE SANS ERREURS
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Clock, 
  CreditCard, 
  Copy,
  AlertCircle
} from 'lucide-react';
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

// ✅ FONCTION: Gestion des paiements directs
const handleDirectPayment = async (
  choice: string, 
  metadata?: ChatMessageMetadata
): Promise<{ success: boolean; redirected?: boolean }> => {
  console.log('💳 Processing direct payment:', choice);
  
  try {
    // Extraire le montant de manière sécurisée
    let amount = 0;
    
    if (metadata?.paymentAmount && typeof metadata.paymentAmount === 'number') {
      amount = metadata.paymentAmount;
    } else if (metadata?.orderData && isValidOrderData(metadata.orderData)) {
      amount = extractTotalAmount(metadata.orderData);
    }
    
    if (amount <= 0) {
      console.warn('⚠️ No valid payment amount found');
      return { success: false };
    }
    
    // ✅ WAVE PAYMENT
    if (choice.toLowerCase().includes('wave') || choice.includes('🌊')) {
      const waveUrl = `https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn/?amount=${amount}`;
      
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = waveUrl;
      } else {
        window.open(waveUrl, '_blank', 'width=800,height=600');
      }
      
      return { success: true, redirected: true };
    }
    
    // ✅ STRIPE PAYMENT
    if (choice.toLowerCase().includes('carte') || choice.includes('💳')) {
      const orderId = String(
        metadata?.orderId || 
        (metadata?.orderData && isValidOrderData(metadata.orderData) ? 
          (metadata.orderData as any).id || (metadata.orderData as any).order_id : '') ||
        Date.now()
      );
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'eur',
          orderId,
          customerName: 'Client',
          successUrl: `${window.location.origin}/payment-success?order_id=${orderId}`,
          cancelUrl: `${window.location.origin}/payment-canceled?order_id=${orderId}`
        }),
      });

      if (response.ok) {
        const session = await response.json();
        if (session.url) {
          window.location.href = session.url;
          return { success: true, redirected: true };
        }
      }
    }
    
    return { success: false };
    
  } catch (error) {
    console.error('❌ Payment error:', error);
    return { success: false };
  }
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
  
  // ✅ ACCÈS SÉCURISÉ AUX MÉTADONNÉES - Plus d'erreurs TypeScript
  const metadata = message.metadata || {};
  
  // Utilisation des type guards pour éliminer les erreurs TypeScript
  const orderData = metadata.orderData;
  const hasValidOrderData = isValidOrderData(orderData);
  
  const recommendedProducts = metadata.recommendedProducts;
  const hasRecommendedProducts = isValidProductArray(recommendedProducts);
  
  const upsellProduct = metadata.upsellProduct;
  const hasUpsellProduct = isValidUpsellProduct(upsellProduct);

  // ✅ GESTION DES CLICS SUR LES BOUTONS
  const handleChoiceClick = async (choice: string): Promise<void> => {
    if (processingPayment) return;
    
    // Gérer les paiements directs
    if (isPaymentButton(choice)) {
      setProcessingPayment(choice);
      
      try {
        const result = await handleDirectPayment(choice, metadata);
        
        if (result.success) {
          console.log('✅ Payment processed successfully');
          if (!result.redirected && onChoiceSelect) {
            onChoiceSelect(`Paiement ${choice} traité`);
          }
          return;
        }
      } catch (error) {
        console.error('❌ Payment processing failed:', error);
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

            {/* ✅ BOUTONS DE CHOIX */}
            {message.choices && message.choices.length > 0 && (
              <div className="grid gap-2">
                {message.choices.map((choice, index) => {
                  const isPrimary = choice.includes('acheter') || choice.includes('⚡');
                  const isPayment = isPaymentButton(choice);
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
                        ${isPrimary || isPayment
                          ? 'bg-[#FF7E93] text-white shadow-md hover:bg-[#FF7E93]/90 hover:shadow-lg' 
                          : 'bg-white text-[#FF7E93] border border-[#FF7E93] hover:bg-[#FF7E93]/5 hover:shadow-md'
                        }
                        ${choice.toLowerCase().includes('wave') 
                          ? 'bg-[#4BD2FA] hover:bg-[#3BC9E8] text-white' : ''
                        }
                      `}
                    >
                      {isProcessingThis ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Traitement...</span>
                        </>
                      ) : (
                        <>
                          {isPayment && <CreditCard className="w-4 h-4" />}
                          <span>{choice}</span>
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