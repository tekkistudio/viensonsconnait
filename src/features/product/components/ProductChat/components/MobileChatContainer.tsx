// src/features/product/components/ProductChat/components/MobileChatContainer.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Star, Mic, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutContext } from '@/core/context/LayoutContext';
import { useChatStore } from '@/stores/chatStore';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { productStatsService } from '@/lib/services/product-stats.service';
import { testimonialsService } from '@/lib/services/testimonials.service';
import TypingIndicator from './TypingIndicator';
import ChatMessage from './ChatMessage';
import ChatChoices from './ChatChoices';
import QuantitySelector from './QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { RealTimeStats } from '@/types/product';
import { ChatService } from '@/services/ChatService';

interface MobileChatContainerProps {
  product: Product;
  storeId: string;
  onBackClick: () => void;
}

const MobileChatContainer: React.FC<MobileChatContainerProps> = ({
  product,
  storeId,
  onBackClick
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const { setHideHeaderGroup } = useLayoutContext();
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(product.stats?.satisfaction || 5);

  const {
    messages,
    orderData,
    sessionId,
    isTyping,
    payment,
    paymentModal,
    initialize,
    sendMessage,
    initiatePayment,
    addMessage,
    cleanup,
    setPaymentModal
  } = useChatStore();

  useEffect(() => {
    initialize(product.id, storeId).catch(console.error);
    return () => cleanup();
  }, [product.id, storeId, initialize, cleanup]);

  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, [setHideHeaderGroup]);

  useEffect(() => {
    let isSubscribed = true;

    const initializeStats = async () => {
      try {
        const [statsResult, reviewsCount, averageRating] = await Promise.all([
          productStatsService.getProductStats(product.id),
          testimonialsService.getTestimonialsCountByProduct(product.id),
          testimonialsService.getAverageRating(product.id)
        ]);

        if (!isSubscribed) return;

        setStats({
          viewsCount: statsResult.totalViews || 0,
          salesCount: statsResult.sold || 0,
          reviewsCount: reviewsCount || 0
        });

        if (averageRating > 0) {
          setRating(averageRating);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    if (product.id) {
      initializeStats();
      productStatsService.incrementViewCount(product.id);
    }

    return () => {
      isSubscribed = false;
    };
  }, [product.id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  const handleMessageSend = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  };

  const handleChoiceSelect = async (choice: string) => {
    if (isProcessing) return;
  
    // Marquer qu'on est en traitement
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      // Créer explicitement un message utilisateur avec des flags pour éviter l'intervention IA
      const userMessage: ChatMessageType = {
        type: 'user',
        content: choice,
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            inPurchaseFlow: true,
            preventAIIntervention: true,
            isButtonChoice: true // Nouveau flag pour indiquer que c'est un choix de bouton
          }
        }
      };
      
      // Ajouter le message manuellement
      useChatStore.getState().addMessage(userMessage);
      
      // Attendre un peu pour l'animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Si c'est un des choix spécifiques pour ajouter des produits, forcer le bon handler
      if (['Oui, je veux bien', 'Non, juste celui-là'].includes(choice)) {
        // Obtenir la session ID
        const sessionId = useChatStore.getState().sessionId;
        const currentStep = useChatStore.getState().formStep;
        
        // Appeler directement le service
        const chatService = ChatService.create();
        const response = await chatService.handleAdditionalProducts(
          sessionId,
          currentStep as string,
          choice
        );
        
        if (response) {
          // Ajouter la réponse au store
          useChatStore.getState().addMessage(response);
          setIsProcessing(false);
          setShowTyping(false);
          return;
        }
      }
      
      // Sinon, utiliser sendMessage standard
      await sendMessage(choice);
    } catch (error) {
      console.error('Error sending choice:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  };

  const chatContent = (
    <div className="fixed inset-0 bg-white z-50 flex flex-col touch-manipulation">
      <div className="sticky top-0 z-10 bg-white py-3 px-4 border-b flex items-center gap-4 shadow-sm">
        <button
          type="button"
          onClick={onBackClick}
          className="text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-[#132D5D]">Le Jeu {product.name}</h2>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < rating
                      ? 'fill-[#FF7E93] text-[#FF7E93]'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              ({stats.reviewsCount} avis)
            </span>
          </div>
        </div>
      </div>

      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4 overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.type}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChatMessage
                message={message}
                isTyping={false}
              />
              {message.metadata?.showQuantitySelector && !message.metadata?.quantityHandled && (
                <div className="mt-4">
                  <QuantitySelector
                    quantity={1}
                    onQuantityChange={(qty: number) => {
                      if (message.metadata?.handleQuantityChange) {
                        message.metadata.handleQuantityChange(qty);
                      }
                    }}
                    onConfirm={async (qty: number) => {
                      if (message.metadata?.handleQuantitySubmit) {
                        await message.metadata.handleQuantitySubmit(qty);
                        message.metadata.quantityHandled = true;
                      }
                      handleMessageSend();
                    }}
                    maxQuantity={message.metadata?.maxQuantity || 10}
                  />
                </div>
              )}
            </motion.div>
          ))}

          {showTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="typing-indicator"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none"
            disabled={isProcessing}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-400 cursor-not-allowed"
              disabled
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleMessageSend}
              disabled={!inputMessage.trim() || isProcessing}
              className={`p-2 ${
                inputMessage.trim() && !isProcessing
                  ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                  : 'text-gray-400'
              } transition-colors`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <BictorysPaymentModal
        isOpen={paymentModal.isOpen}
        onClose={handleClosePaymentModal}
        amount={orderData.totalAmount || 0}
        currency="XOF"
        orderId={parseInt(orderData.session_id || Date.now().toString())}
        customerInfo={{
          name: `${orderData.first_name} ${orderData.last_name}`,
          phone: orderData.phone,
          email: orderData.email,
          city: orderData.city
        }}
      />

      {payment.status === 'processing' && payment.clientSecret && (
        <StripePaymentModal
          isOpen={stripeModalOpen}
          onClose={() => setStripeModalOpen(false)}
          clientSecret={payment.clientSecret}
        />
      )}
    </div>
  );

  return (
    <ConversationProvider 
      value={{
        productId: product.id,
        sessionId: sessionId,
        storeId,
        customerInfo: {
          firstName: orderData.first_name,
          lastName: orderData.last_name,
          city: orderData.city,
          email: orderData.email
        }
      }}
    >
      {chatContent}
    </ConversationProvider>
  );
};

export default MobileChatContainer;