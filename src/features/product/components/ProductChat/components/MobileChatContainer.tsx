// src/features/product/components/ProductChat/components/MobileChatContainer.tsx
'use client';

import React, { useEffect } from 'react';
import { ArrowLeft, Star, Mic, Send, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatContext } from '../../../context/ChatContext';
import { useLayoutContext } from '@/core/context/LayoutContext';
import type { Product } from '../../../../../types/product';
import type { ChatMessage } from '../../../types/chat';
import { UnifiedPaymentModal } from '@/components/payment';

interface MobileChatContainerProps {
  onBackClick: () => void;
  chatRef: React.RefObject<HTMLDivElement>;
  product: Product;
}

type PaymentButtonType = 'wave-button' | 'om-button';

const isValidPaymentType = (type: string): type is PaymentButtonType => {
  return type === 'wave-button' || type === 'om-button';
};

const useMessageRedirect = (messages: ChatMessage[]) => {
  useEffect(() => {
    const handleRedirect = (message: ChatMessage) => {
      if (message.metadata?.action === 'redirect' && message.metadata.externalUrl) {
        const { url, type } = message.metadata.externalUrl;
        if (type === 'whatsapp' || type === 'email') {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = url;
        }
      }
    };

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      handleRedirect(lastMessage);
    }
  }, [messages]);
};

const RedirectIndicator = ({ type }: { type: string }) => (
  <div className="flex items-center gap-2 text-sm text-blue-600">
    <ExternalLink className="w-4 h-4" />
    <span>
      {type === 'whatsapp' ? "Ouverture de WhatsApp..." : 
       type === 'email' ? "Ouverture de votre messagerie..." :
       "Redirection en cours..."}
    </span>
  </div>
);

const renderMessageContent = (message: ChatMessage): React.ReactNode => {
  const content = typeof message.content === 'string' ? message.content : String(message.content);
  
  if (message.metadata?.externalUrl) {
    return (
      <div className="flex flex-col gap-2">
        <div dangerouslySetInnerHTML={{ __html: content }} />
        <RedirectIndicator type={message.metadata.externalUrl.type} />
      </div>
    );
  }

  if (content.includes('<strong>')) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return <>{content}</>;
};

const useScrollToBottom = (
  ref: React.RefObject<HTMLDivElement>,
  dependencies: any[]
) => {
  useEffect(() => {
    if (ref.current) {
      const scrollOptions: ScrollToOptions = {
        top: ref.current.scrollHeight,
        behavior: 'smooth'
      };
      ref.current.scrollTo(scrollOptions);
    }
  }, dependencies);
};

const MobileChatContainer: React.FC<MobileChatContainerProps> = ({
  onBackClick,
  chatRef,
  product
}) => {
  const { state, handleUserChoice, calculateOrderTotal, dispatch } = useChatContext();
  const { setHideHeaderGroup } = useLayoutContext();
  const { messages, isTyping } = state;
  const [inputMessage, setInputMessage] = React.useState('');

  useMessageRedirect(messages);
  
  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, [setHideHeaderGroup]);

  useScrollToBottom(chatRef, [messages, isTyping]);

  const handleMessageSend = () => {
    if (inputMessage.trim()) {
      handleUserChoice(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  };

  const renderChoices = (choices: string[]) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {choices.map((choice, idx) => (
        <button
          key={`${choice}-${idx}`}
          type="button"
          onClick={() => handleUserChoice(choice)}
          className="bg-white border border-[#FF7E93] text-[#FF7E93] rounded-full px-4 py-2 
            hover:bg-[#FF7E93] hover:text-white active:bg-[#FF7E93] active:text-white 
            transition-colors text-sm touch-manipulation"
        >
          {choice}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col touch-manipulation">
      <div className="sticky top-0 z-10 bg-white py-3 px-4 border-b flex items-center gap-4">
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
                    i < (product.stats?.satisfaction || 5)
                      ? 'fill-[#FF7E93] text-[#FF7E93]'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              ({product.stats?.reviews || 0} avis)
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
              key={`message-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {message.type === 'user-choices' ? (
                renderChoices(message.choices || [])
              ) : (
                <>
                  {message.content && (
                    <div
                      className={`p-3 ${
                        message.type === 'user'
                          ? 'bg-[#FF7E93] text-white ml-auto rounded-[20px] rounded-tr-sm max-w-[70%]'
                          : 'bg-white text-gray-800 mr-auto rounded-[20px] rounded-tl-sm max-w-[85%]'
                      }`}
                    >
                      {message.type === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Rose</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Assistante
                          </span>
                        </div>
                      )}
                      <div className="mb-1 whitespace-pre-line">
                        {renderMessageContent(message)}
                      </div>
                      <div className="text-[11px] opacity-60 text-right mt-1">
                        {new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}

                  {message.type === 'assistant' && message.choices && message.choices.length > 0 && (
                    renderChoices(message.choices)
                  )}

                  {/* Actions de paiement */}
                  {isValidPaymentType(message.type) && (
                    <div className="flex justify-center mt-4">
                      <UnifiedPaymentModal
                        isOpen={state.paymentModal.isOpen}
                        onClose={() => {
                          dispatch({
                            type: 'SET_PAYMENT_MODAL',
                            payload: {
                              isOpen: false,
                              iframeUrl: ''
                            }
                          });
                        }}
                        amount={calculateOrderTotal().value}
                        currency="XOF"
                        customerInfo={{
                          name: `${state.orderData.firstName} ${state.orderData.lastName}`,
                          phone: state.orderData.phone,
                          city: state.orderData.city
                        }}
                        orderId={parseInt(state.orderData.orderId || Date.now().toString())}
                        onPaymentComplete={(result) => {
                          if (result.success) {
                            dispatch({
                              type: 'SET_PAYMENT_STATUS',
                              payload: {
                                status: 'completed',
                                transactionId: result.transactionId
                              }
                            });
                          } else {
                            dispatch({
                              type: 'SET_PAYMENT_STATUS',
                              payload: {
                                status: 'failed',
                                error: result.error
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex space-x-1 bg-white p-3 rounded-lg w-16"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -3, 0] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.15
                  }}
                />
              ))}
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
              disabled={!inputMessage.trim()}
              className={`p-2 ${
                inputMessage.trim() 
                  ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                  : 'text-gray-400'
              } transition-colors`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileChatContainer;