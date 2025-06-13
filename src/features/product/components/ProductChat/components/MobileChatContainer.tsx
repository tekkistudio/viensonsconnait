// src/features/product/components/ProductChat/components/MobileChatContainer.tsx - VERSION SIMPLIFIÉE ET CORRIGÉE
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Star, Mic, Send, ShoppingBag } from 'lucide-react';
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
import QuantitySelector from './QuantitySelector';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import type { RealTimeStats } from '@/types/product';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(product.stats?.satisfaction || 5);

  // ✅ SIMPLIFICATION: Utilisation directe du store
  const store = useChatStore();
  const {
    messages = [],
    orderData = {},
    sessionId = '',
    isTyping = false,
    payment = {
      status: 'idle' as const,
      error: null,
      clientSecret: null
    },
    paymentModal = {
      isOpen: false,
      iframeUrl: '',
      provider: undefined
    },
    initializeSession,
    addMessage,
    updateTypingStatus,
    setPaymentModal = () => {},
    cleanup,
    currentStep = null,
    flags = {}
  } = store;

  // ✅ SIMPLIFICATION: Initialisation unique et simple
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!product?.id || !mounted) return;

      try {
        console.log('📱 Initializing mobile chat for product:', product.id);
        
        // Si déjà des messages, ne pas réinitialiser
        if (messages.length > 0) {
          console.log('📱 Messages already exist, skipping initialization');
          setIsInitialized(true);
          return;
        }

        // Créer session simple
        const newSessionId = `${product.id}_${Date.now()}`;
        
        if (initializeSession && mounted) {
          initializeSession(product.id, storeId, newSessionId);
          setIsInitialized(true);
          
          // Ajouter message de bienvenue après un délai
          setTimeout(() => {
            if (!mounted) return;
            
            const welcomeMessage: ChatMessageType = {
              type: 'assistant',
              content: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.

Je vois que vous vous intéressez à notre jeu **${product.name}** !

✨ Je peux vous aider à :
- **Commander rapidement** (moins de 60 secondes)
- **Répondre à vos questions**
- **Vous présenter le jeu**

Que souhaitez-vous faire ?`,
              choices: [
                '⚡ Commander rapidement',
                '❓ Poser une question',
                '💬 En savoir plus sur le jeu'
              ],
              assistant: {
                name: 'Rose',
                title: 'Assistante d\'achat'
              },
              metadata: {
                nextStep: 'initial_engagement' as ConversationStep,
                productId: product.id,
                sessionId: newSessionId,
                flags: { 
                  isWelcome: true,
                  preventAIIntervention: true
                }
              },
              timestamp: new Date().toISOString()
            };
            
            console.log('📱 Adding welcome message');
            addMessage(welcomeMessage);
          }, 500);
        }
        
      } catch (error) {
        console.error('❌ Mobile initialization error:', error);
        setIsInitialized(true);
      }
    };

    initialize();
    
    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [product.id, storeId, initializeSession, addMessage, cleanup, messages.length]);

  // Masquer le header groupe
  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, [setHideHeaderGroup]);

  // Chargement des statistiques
  useEffect(() => {
    let isSubscribed = true;

    const loadStats = async () => {
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
      loadStats();
      productStatsService.incrementViewCount(product.id);
    }

    return () => {
      isSubscribed = false;
    };
  }, [product.id]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isTyping]);

  // ✅ SIMPLIFICATION: Envoi de message unifié
  const sendMessage = async (content: string) => {
    try {
      console.log('📱 Sending message:', content);
      
      // Ajouter message utilisateur
      const userMessage: ChatMessageType = {
        type: 'user',
        content,
        timestamp: new Date().toISOString()
      };
      addMessage(userMessage);

      // Appel API simplifié
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          productId: product.id,
          currentStep: currentStep || 'initial',
          orderData: orderData || {},
          sessionId: sessionId || `${product.id}_${Date.now()}`,
          storeId: storeId
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      
      const assistantMessage: ChatMessageType = {
        type: 'assistant',
        content: aiResponse.content || "Je suis là pour vous aider !",
        choices: aiResponse.choices || ["⚡ Commander maintenant", "❓ Poser une question"],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: aiResponse.nextStep || currentStep,
          orderData: aiResponse.orderData,
          flags: aiResponse.flags || {}
        },
        timestamp: new Date().toISOString()
      };

      setTimeout(() => {
        addMessage(assistantMessage);
      }, 800);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage: ChatMessageType = {
        type: 'assistant',
        content: `😔 **Erreur temporaire**

Une erreur est survenue. Voulez-vous réessayer ?`,
        choices: ['🔄 Réessayer', '📞 Contacter le support'],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'error_recovery' as ConversationStep,
          flags: { hasError: true }
        },
        timestamp: new Date().toISOString()
      };
      
      setTimeout(() => addMessage(errorMessage), 500);
    }
  };

  const handleMessageSend = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    updateTypingStatus(true);
    
    try {
      await sendMessage(message);
    } finally {
      updateTypingStatus(false);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  };

  // ✅ SIMPLIFICATION: Gestion des choix
  const handleChoiceSelect = async (choice: string) => {
    if (isProcessing) return;

    console.log('🔘 Mobile choice selected:', choice);
    setIsProcessing(true);
    updateTypingStatus(true);
    
    try {
      // Gestion spéciale WhatsApp
      if (choice.includes('Continuer sur WhatsApp') || 
          choice.includes('Contacter le support')) {
        
        const userMessage: ChatMessageType = {
          type: 'user',
          content: choice,
          timestamp: new Date().toISOString()
        };
        addMessage(userMessage);
        
        // Ouvrir WhatsApp
        const whatsappUrl = 'https://wa.me/221781362728';
        const whatsappText = encodeURIComponent(`Bonjour, je vous contacte depuis votre site pour le jeu ${product.name}`);
        const whatsappDeepLink = `whatsapp://send?phone=221781362728&text=${whatsappText}`;
        
        try {
          window.location.href = whatsappDeepLink;
          setTimeout(() => {
            window.open(whatsappUrl, '_blank') || (window.location.href = whatsappUrl);
          }, 2000);
        } catch {
          window.open(whatsappUrl, '_blank') || (window.location.href = whatsappUrl);
        }
        
        setTimeout(() => {
          const confirmMessage: ChatMessageType = {
            type: 'assistant',
            content: `✅ **Redirection vers WhatsApp**

Si WhatsApp ne s'est pas ouvert automatiquement, cliquez sur le lien :
👉 https://wa.me/221781362728

Notre équipe vous répondra rapidement !`,
            choices: [],
            assistant: {
              name: 'Rose',
              title: 'Assistante d\'achat'
            },
            metadata: {
              nextStep: 'whatsapp_opened' as ConversationStep,
              flags: { whatsappRedirect: true }
            },
            timestamp: new Date().toISOString()
          };
          addMessage(confirmMessage);
        }, 1000);
        
        return;
      }
      
      // Pour tous les autres choix
      await sendMessage(choice);
      
    } catch (error) {
      console.error('❌ Error handling choice:', error);
    } finally {
      updateTypingStatus(false);
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

  // Rendu conditionnel si pas initialisé
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
          <p className="text-gray-600">Initialisation du chat...</p>
        </div>
      </div>
    );
  }

  return (
    <ConversationProvider 
      value={{
        productId: product.id,
        sessionId: sessionId,
        storeId,
        customerInfo: {
          firstName: orderData?.first_name || '',
          lastName: orderData?.last_name || '',
          city: orderData?.city || '',
          email: orderData?.email || ''
        }
      }}
    >
      <div className="fixed inset-0 bg-white z-50 flex flex-col touch-manipulation">
        {/* Header mobile */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="py-3 px-4 flex items-center gap-4">
            <button
              type="button"
              onClick={onBackClick}
              className="text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gray-100">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FF7E93] to-[#FF6B9D] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="font-semibold text-[#132D5D] text-sm">Le Jeu {product.name}</h2>
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
                <span className="text-xs text-gray-600">
                  ({stats.reviewsCount} avis)
                </span>
              </div>
            </div>
          </div>

          {/* Barre de commande si items en cours */}
          {orderData?.items && orderData.items.length > 0 && (
            <div className="bg-gradient-to-r from-[#FF7E93]/10 to-[#FF6B9D]/10 border-t border-[#FF7E93]/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-[#FF7E93] rounded-full">
                    <ShoppingBag className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#132D5D]">
                      Ma commande ({(orderData.items || []).reduce((sum, item) => sum + item.quantity, 0)} article{((orderData.items || []).reduce((sum, item) => sum + item.quantity, 0)) > 1 ? 's' : ''})
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]">
                      {(orderData.items || []).map(item => `${item.name} x${item.quantity}`).join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-bold text-[#FF7E93]">
                    {(orderData.total_amount || 0).toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zone des messages */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4 overscroll-y-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {messages && messages.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.type}-${index}-${message.timestamp}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatMessage
                    message={message}
                    isTyping={false}
                    onChoiceSelect={handleChoiceSelect}
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
                            if (message.metadata) {
                              message.metadata.quantityHandled = true;
                            }
                          }
                          handleChoiceSelect(qty.toString());
                        }}
                        maxQuantity={message.metadata?.maxQuantity || 10}
                      />
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E93] mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Chargement du chat...</p>
              </div>
            </div>
          )}
        </div>

        {/* Zone de saisie */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez votre message..."
              className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none disabled:opacity-50"
              disabled={isProcessing}
              maxLength={500}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                className="p-2 text-gray-400 cursor-not-allowed"
                disabled
                title="Reconnaissance vocale (bientôt disponible)"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleMessageSend}
                disabled={!inputMessage.trim() || isProcessing}
                className={`p-2 transition-colors ${
                  inputMessage.trim() && !isProcessing
                    ? 'text-[#FF7E93] hover:text-[#132D5D]' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF7E93] rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modals de paiement */}
        <BictorysPaymentModal
          isOpen={paymentModal?.isOpen || false}
          onClose={handleClosePaymentModal}
          amount={orderData?.totalAmount || 0}
          currency="XOF"
          orderId={parseInt(orderData?.session_id || Date.now().toString())}
          customerInfo={{
            name: `${orderData?.first_name || ''} ${orderData?.last_name || ''}`.trim() || 'Client',
            phone: orderData?.phone || '',
            email: orderData?.email || '',
            city: orderData?.city || ''
          }}
        />

        {payment?.status === 'processing' && payment?.clientSecret && (
          <StripePaymentModal
            isOpen={stripeModalOpen}
            onClose={() => setStripeModalOpen(false)}
            clientSecret={payment.clientSecret}
          />
        )}
      </div>
    </ConversationProvider>
  );
};

export default MobileChatContainer;