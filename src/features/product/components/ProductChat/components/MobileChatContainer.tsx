// src/features/product/components/ProductChat/components/MobileChatContainer.tsx - VERSION CORRIGÉE ANTI-BOUCLE
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
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import type { RealTimeStats } from '@/types/product';
import { supabase } from '@/lib/supabase';

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
  
  // ✅ CORRECTION CRITIQUE: États locaux simplifiés pour éviter les boucles
  const [initializationStarted, setInitializationStarted] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  
  const [stats, setStats] = useState<RealTimeStats>({
    viewsCount: 0,
    salesCount: 0,
    reviewsCount: 0
  });
  const [rating, setRating] = useState(product.stats?.satisfaction || 5);

  // ✅ CORRECTION: Utilisation sélective du store pour éviter les re-renders
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
    updateOrderData,
    currentStep = null,
    flags = {
      hasError: false,
      stockReserved: false,
      orderCompleted: false,
      paymentInitiated: false,
      isInitialized: false
    }
  } = store;

  // ✅ CORRECTION CRITIQUE: Initialisation avec protection contre les boucles
  useEffect(() => {
    if (!product?.id || initializationStarted || welcomeMessageSent) {
      return;
    }

    const initializeChat = async () => {
      try {
        console.log('📱 Initializing mobile chat session:', { 
          productId: product.id, 
          storeId,
          initializationStarted,
          welcomeMessageSent,
          existingMessages: messages.length
        });
        
        setInitializationStarted(true);

        // Vérifier si des messages existent déjà
        if (messages.length > 0) {
          console.log('📝 Mobile chat already has messages, skipping initialization');
          setWelcomeMessageSent(true);
          return;
        }

        // Initialiser la session
        if (initializeSession) {
          const newSessionId = sessionId || `mobile_${product.id}_${Date.now()}`;
          initializeSession(product.id, storeId, newSessionId);
        }
        
        // Attendre un délai plus long pour éviter les conditions de course
        setTimeout(() => {
          // Vérifier encore une fois qu'aucun message n'a été ajouté
          const currentState = useChatStore.getState();
          
          if (currentState.messages.length === 0 && !welcomeMessageSent) {
            const welcomeMessage: ChatMessageType = {
              type: 'assistant',
              content: `👋 Bonjour ! Je suis **Rose**, votre assistante d'achat.

Je vois que vous vous intéressez à notre jeu **${product.name}** !

✨ Je peux vous aider à :
- **Commander rapidement** (moins de 60 secondes)
- **Répondre à vos questions**
- **Vous conseiller** sur l'utilisation

Que souhaitez-vous faire ?`,
              choices: [
                '⚡ Commander rapidement',
                '❓ Poser une question',
                '📦 Infos livraison',
                '💬 En savoir plus sur le jeu'
              ],
              assistant: {
                name: 'Rose',
                title: 'Assistante d\'achat',
                avatar: undefined
              },
              metadata: {
                nextStep: 'initial_engagement' as ConversationStep,
                productId: product.id,
                sessionId: sessionId,
                flags: { 
                  isWelcome: true,
                  preventAIIntervention: true
                }
              },
              timestamp: new Date().toISOString()
            };
            
            console.log('📝 Adding welcome message to mobile chat');
            addMessage(welcomeMessage);
            setWelcomeMessageSent(true);
          } else {
            console.log('⚠️ Mobile: Welcome message skipped - messages exist or already sent');
            setWelcomeMessageSent(true);
          }
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error initializing mobile chat:', error);
        setInitializationStarted(true);
        setWelcomeMessageSent(true);
      }
    };

    initializeChat();
  }, [product.id, storeId, initializationStarted, welcomeMessageSent]); // ✅ Dépendances limitées

  // ✅ CORRECTION: Header management sans dépendances problématiques
  useEffect(() => {
    setHideHeaderGroup(true);
    return () => setHideHeaderGroup(false);
  }, []); // ✅ Pas de dépendances

  // ✅ CORRECTION: Stats loading avec cleanup
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
  }, [product.id]); // ✅ Seulement product.id

  // ✅ CORRECTION: Auto-scroll optimisé
  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      // Délai plus court pour éviter les re-renders multiples
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, showTyping]); // ✅ Dépendances optimisées

  // ✅ FONCTION: Gestion des messages standards avec cache
  const handleStandardMessages = useCallback(async (content: string): Promise<ChatMessageType> => {
    if (content.includes('Poser une question') || content.includes('❓')) {
      return {
        type: 'assistant',
        content: `🤔 **Parfait !** Posez-moi toutes vos questions sur le jeu **${product.name}**.

Je peux vous expliquer :
- Comment ça fonctionne
- Pour qui c'est adapté
- Les bénéfices pour vous
- Les témoignages clients

Qu'est-ce qui vous intéresse le plus ?`,
        choices: [
          '❓ Comment y jouer ?',
          '👥 C\'est pour qui ?',
          '💝 Quels bénéfices ?',
          '⭐ Avis clients'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'question_mode' as ConversationStep,
          flags: { questionMode: true }
        },
        timestamp: new Date().toISOString()
      };
    }

    if (content.includes('Comment y jouer') || content.includes('Comment ça fonctionne')) {
      console.log('🎮 Mobile: Récupération des règles du jeu depuis la base de données');
      
      let gameRules = '';
      
      try {
        const { data: productData, error } = await supabase
          .from('products')
          .select('game_rules, name')
          .eq('id', product.id)
          .maybeSingle();

        if (error || !productData) {
          console.error('❌ Mobile - Erreur récupération produit:', error);
          gameRules = `❓ **Comment jouer au jeu ${product.name} :**

Une erreur est survenue lors du chargement des règles. 

📞 **Contactez-nous pour plus d'informations :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

Nous vous enverrons les règles détaillées !`;
        } else if (productData.game_rules && productData.game_rules.trim()) {
          console.log('✅ Mobile - Règles du jeu trouvées');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

${productData.game_rules}

🎯 **Prêt(e) à vivre cette expérience ?**`;
        } else {
          console.log('⚠️ Mobile - Pas de règles définies pour ce produit');
          gameRules = `❓ **Comment jouer au jeu ${productData.name} :**

📝 **Les règles détaillées de ce jeu seront ajoutées prochainement.**

En attendant, voici ce que vous devez savoir :
• Ce jeu est conçu pour renforcer les relations
• Il se joue en groupe (2 personnes minimum)
• Chaque partie dure environ 30-60 minutes
• Aucune préparation spéciale requise

📞 **Pour les règles complètes, contactez-nous :**
• WhatsApp : +221 78 136 27 28
• Email : contact@viensonseconnait.com

Nous vous enverrons un guide détaillé !`;
        }
      } catch (dbError) {
        console.error('❌ Mobile - Erreur base de données:', dbError);
        gameRules = `❓ **Comment jouer au jeu ${product.name} :**

😔 **Problème technique temporaire**

Nous ne pouvons pas charger les règles du jeu en ce moment.

📞 **Solution immédiate :**
• WhatsApp : +221 78 136 27 28
• Nous vous enverrons les règles par message

🔄 **Ou réessayez dans quelques minutes**`;
      }

      return {
        type: 'assistant',
        content: gameRules,
        choices: [
          '⚡ Commander maintenant',
          '💝 Quels bénéfices ?',
          '⭐ Voir les avis',
          '📞 Contacter le support'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'game_rules_shown' as ConversationStep,
          flags: {
            gameRulesShown: true
          }
        },
        timestamp: new Date().toISOString()
      };
    }

    // Réponse par défaut
    return {
      type: 'assistant',
      content: `Merci pour votre message ! Comment puis-je vous aider davantage avec le jeu **${product.name}** ?`,
      choices: [
        '⚡ Commander rapidement',
        '❓ Poser une question',
        '📦 Infos livraison'
      ],
      assistant: {
        name: 'Rose',
        title: 'Assistante d\'achat'
      },
      metadata: {
        nextStep: 'initial_engagement' as ConversationStep
      },
      timestamp: new Date().toISOString()
    };
  }, [product.id, product.name]);

  // ✅ FONCTION: Créer un message d'erreur
  const createErrorResponse = useCallback((errorText: string): ChatMessageType => ({
    type: 'assistant',
    content: `😔 **${errorText}**

Voulez-vous réessayer ou contacter notre support ?`,
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
  }), []);

  // ✅ FONCTION: Envoi de message avec protection
  const sendMessage = useCallback(async (content: string) => {
    if (isProcessing) {
      console.log('⏳ Already processing a message, ignoring');
      return;
    }

    try {
      console.log('📱 Processing mobile message:', { content: content.substring(0, 50) });
      
      // Ajouter le message utilisateur immédiatement
      const userMessage: ChatMessageType = {
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          flags: {
            isButtonChoice: true,
            preventAIIntervention: true
          }
        }
      };
      
      addMessage(userMessage);

      let response: ChatMessageType;
      
      try {
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            productId: product.id,
            currentStep: currentStep || 'initial',
            orderData: orderData || {},
            sessionId: sessionId || `${product.id}_${Date.now()}`,
            storeId: storeId || 'default'
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`Mobile API error ${apiResponse.status}`);
        }

        const aiResponse = await apiResponse.json();
        console.log('✅ Mobile: Enhanced API response received');

        response = {
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

      } catch (apiError) {
        console.error('❌ Mobile: API call failed:', apiError);
        
        const isStandardButton = [
          'Poser une question', 'Comment y jouer', 'C\'est pour qui',
          'Quels bénéfices', 'Avis clients', 'Infos livraison', 'En savoir plus'
        ].some(btn => content.includes(btn));
        
        if (isStandardButton) {
          response = await handleStandardMessages(content);
        } else {
          response = createErrorResponse(`Problème de connexion: ${apiError instanceof Error ? apiError.message : 'Erreur inconnue'}`);
        }
      }
      
      // Délai pour l'animation
      setTimeout(() => {
        console.log('✅ Mobile: Response generated');
        addMessage(response);
        
        if (response.metadata?.orderData) {
          updateOrderData(response.metadata.orderData);
        }
      }, 800);

    } catch (err) {
      console.error('❌ Mobile: Error in sendMessage:', err);
      
      setTimeout(() => {
        const errorMessage = createErrorResponse(`Une erreur est survenue: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        addMessage(errorMessage);
      }, 500);
    }
  }, [isProcessing, product.id, currentStep, orderData, sessionId, storeId, addMessage, updateOrderData, handleStandardMessages, createErrorResponse]);

  // ✅ FONCTION: Gestion des choix avec protection
  const handleChoiceSelect = useCallback(async (choice: string) => {
    if (isProcessing) {
      console.log('⏳ Processing in progress, ignoring choice');
      return;
    }

    console.log('🔘 Mobile choice selected:', choice);
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      await sendMessage(choice);
    } catch (error) {
      console.error('❌ Error sending choice:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  }, [isProcessing, sendMessage]);

  // ✅ FONCTION: Envoi de message depuis input
  const handleMessageSend = useCallback(async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    setShowTyping(true);
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setShowTyping(false);
      setIsProcessing(false);
    }
  }, [inputMessage, isProcessing, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  }, [handleMessageSend]);

  const handleClosePaymentModal = useCallback(() => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  }, [setPaymentModal]);

  // ✅ RENDU CONDITIONNEL SIMPLIFIÉ
  if (!initializationStarted) {
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
        {/* Header mobile avec stats */}
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

          {/* Barre de commande mobile */}
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
              className="w-full px-4 py-2 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                title={isProcessing ? 'Traitement en cours...' : 'Envoyer le message'}
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