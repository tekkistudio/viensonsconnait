// src/features/product/components/ProductChat/ChatContainer.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { ConversationProvider } from '@/hooks/useConversationContext';
import ChatMessage from './components/ChatMessage';
import ChatChoices from './components/ChatChoices';
import TypingIndicator from './components/TypingIndicator';
import ChatHeader from './components/ChatHeader';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import QuantitySelector from './components/QuantitySelector';
import { ChatService } from '@/services/ChatService';

interface ChatContainerProps {
  product: Product;
  storeId: string;
  isMobile?: boolean;
  isFullscreen?: boolean;
}

const ChatContainer = ({ 
  product,
  storeId,
  isMobile = false, 
  isFullscreen = false 
}: ChatContainerProps) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  const handleSubmit = async (contentOrEvent: string | React.MouseEvent<HTMLButtonElement>) => {
    const content = typeof contentOrEvent === 'string' 
      ? contentOrEvent 
      : inputMessage.trim();
  
    if (!content) return;
    
    setInputMessage('');
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = inputMessage.trim();
      if (content) {
        handleSubmit(content);
      }
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
    <div className={`flex flex-col ${
      isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'
    } bg-white rounded-xl overflow-hidden`}>
      <ChatHeader
        productId={product.id}
        title={`Le Jeu ${product.name}`}
        rating={product.stats?.satisfaction || 5}
        price={`${product.price.toLocaleString()} FCFA`}
        oldPrice={product.compareAtPrice ? `${product.compareAtPrice.toLocaleString()} FCFA` : undefined}
      />

      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4"
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
                      handleSubmit(qty.toString());
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

      <div className="bg-white border-t px-4 py-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
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
              onClick={handleSubmit}
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

export default ChatContainer;