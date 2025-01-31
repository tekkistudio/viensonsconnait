// src/features/product/components/ProductChat/ChatContainer.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { Product } from '../../../../types/product';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import { useChatContext } from '../../context/ChatContext';
import ChatHeader from './components/ChatHeader';
import { default as ChatMessageComponent } from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { UnifiedPaymentModal } from '@/components/payment';

interface ChatContainerProps {
  product: Product;
  isMobile: boolean;
  isFullscreen: boolean;
}

type PaymentButtonType = 'wave-button' | 'om-button';

const isValidPaymentType = (type: string): type is PaymentButtonType => {
  return type === 'wave-button' || type === 'om-button';
};

const useMessageRedirect = (messages: ChatMessageType[]) => {
  useEffect(() => {
    const handleRedirect = (message: ChatMessageType) => {
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

function ChatContainerInner({ product, isMobile, isFullscreen }: ChatContainerProps) {
  const [inputMessage, setInputMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const { state, handleUserChoice, calculateOrderTotal, dispatch } = useChatContext();
  const { messages, isTyping } = state;

  useMessageRedirect(messages);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    handleUserChoice(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (message: ChatMessageType): React.ReactNode => {
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

  const renderChoices = (choices: string[]) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {choices.map((choice, idx) => (
        <button
          key={`${choice}-${idx}`}
          onClick={() => handleUserChoice(choice)}
          className="bg-white border border-[#FF7E93] text-[#FF7E93] rounded-full px-4 py-2 
            hover:bg-[#FF7E93] hover:text-white transition-colors text-sm"
        >
          {choice}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'} bg-white rounded-xl`}>
      <ChatHeader
        title={`Le Jeu ${product.name}`}
        rating={product.stats?.satisfaction || 5}
        price={`${product.price.toLocaleString()} FCFA`}
        oldPrice={product.compareAtPrice ? `${product.compareAtPrice.toLocaleString()} FCFA` : undefined}
        reviews={product.stats?.reviews || 0}
      />

      <div ref={chatRef} className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            const key = `${message.type}-${index}`;

            if (message.type === 'user-choices') {
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderChoices(message.choices || [])}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {message.content && (
                  <div className="space-y-4">
                    <ChatMessageComponent
                      message={renderMessageContent(message)}
                      timestamp={new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      isUser={message.type === 'user'}
                      assistant={message.type === 'assistant' ? {
                        name: 'Rose',
                        title: 'Assistante'
                      } : undefined}
                    />
                    {message.type === 'assistant' && message.choices && message.choices.length > 0 && (
                      renderChoices(message.choices)
                    )}
                  </div>
                )}

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
              </motion.div>
            );
          })}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex space-x-1 bg-white p-3 rounded-lg w-16"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -3, 0] }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.15,
                    repeat: Infinity
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border-t">
        <ChatInput
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onSend={handleSendMessage}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}

export default function ChatContainer(props: ChatContainerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full bg-gray-100 rounded-xl animate-pulse">
        <div className="h-16 bg-white border-b" />
      </div>
    );
  }

  return (
    <div className={`h-full rounded-xl ${!props.isFullscreen && 'ring-1 ring-gray-200'} overflow-hidden`}>
      <ChatContainerInner {...props} />
    </div>
  );
}