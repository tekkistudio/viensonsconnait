// src/features/product/components/ProductChat/ChatContainer.tsx - CORRECTION old_price
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import DynamicContentService from '@/lib/services/DynamicContentService';
import { SessionManager } from '@/lib/services/SessionManager';
import ChatMessage from './components/ChatMessage';
import ChatChoices from './components/ChatChoices';
import TypingIndicator from './components/TypingIndicator';
import ChatHeader from './components/ChatHeader';
import QuantitySelector from './components/QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import { supabase } from '@/lib/supabase';
import { SpeechRecognition } from '@/types/speech';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomeMessageAdded, setWelcomeMessageAdded] = useState(false);
  
  // ✅ NOUVEAU: États pour la reconnaissance vocale
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // ✅ Initialisation des services dans le composant
  const [optimizedService] = useState(() => OptimizedChatService.getInstance());
  const [dynamicContentService] = useState(() => DynamicContentService.getInstance());
  const [sessionManager] = useState(() => SessionManager.getInstance());
  
  // ✅ État global pour éviter les doublons
  const [globalInitialized, setGlobalInitialized] = useState(false);

  // ✅ Utilisation sécurisée du store
  const store = useChatStore();
  const {
    messages = [],
    orderData = {},
    sessionId = '',
    isTyping = false,
    payment = {
      status: 'idle' as const,
      error: null,
      clientSecret: null,
      selectedMethod: null
    },
    paymentModal = {
      isOpen: false,
      iframeUrl: '',
      provider: undefined
    },
    addMessage,
    initializeSession,
    updateTypingStatus,
    setExpressMode,
    updateOrderData,
    setPaymentModal,
    isExpressMode = false,
    currentStep = null,
    flags = {
      hasError: false,
      stockReserved: false,
      orderCompleted: false,
      paymentInitiated: false,
      isInitialized: false
    }
  } = store;

  // ✅ NOUVEAU: Initialisation de la reconnaissance vocale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsVoiceSupported(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'fr-FR';
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  // ✅ NOUVEAU: Fonction pour gérer la reconnaissance vocale
  const toggleVoiceInput = useCallback(() => {
    if (!isVoiceSupported || !recognition || isProcessing) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
    }
  }, [isVoiceSupported, recognition, isListening, isProcessing]);

  // ✅ Service de contenu dynamique avec type 'target'
  const getProductInfoFromDatabase = useCallback(async (infoType: 'description' | 'benefits' | 'usage' | 'testimonials' | 'target') => {
    try {
      return await dynamicContentService.getProductInfo(product.id, infoType);
    } catch (error) {
      console.error('Error fetching product info:', error);
      return `Informations sur le **${product.name}** (données par défaut)`;
    }
  }, [product.id, product.name, dynamicContentService]);

  // ✅ Récupérer les infos de livraison
  const getDeliveryInfoFromDatabase = useCallback(async () => {
    try {
      return await dynamicContentService.getDeliveryInfo();
    } catch (error) {
      console.error('Error fetching delivery info:', error);
      return null;
    }
  }, [dynamicContentService]);

  // ✅ INITIALISATION CORRIGÉE avec gestion des doublons
  useEffect(() => {
    if (!product?.id || welcomeMessageAdded || globalInitialized) return;

    const initializeChat = async () => {
      try {
        console.log('🖥️ Initializing desktop chat session:', { productId: product.id, storeId });
        
        // ✅ VÉRIFICATION: État global d'abord
        const globalState = useChatStore.getState();
        const currentMessages = globalState.messages || [];
        
        // Si des messages existent déjà ou si déjà initialisé, ne rien faire
        if (currentMessages.length > 0 || globalState.flags?.isInitialized) {
          console.log('📝 Desktop chat already has messages or is initialized, skipping');
          setIsInitialized(true);
          setWelcomeMessageAdded(true);
          setGlobalInitialized(true);
          return;
        }

        // ✅ UTILISER SessionManager pour éviter les doublons
        const newSessionId = await sessionManager.getOrCreateSession(product.id, storeId);
        console.log('🆕 Desktop session created with SessionManager:', newSessionId);

        // ✅ VÉRIFIER ENCORE UNE FOIS avant d'initialiser
        const latestState = useChatStore.getState();
        if (latestState.messages?.length > 0) {
          console.log('⚠️ Messages detected during initialization, aborting welcome');
          setIsInitialized(true);
          setWelcomeMessageAdded(true);
          setGlobalInitialized(true);
          return;
        }

        if (initializeSession) {
          initializeSession(product.id, storeId, newSessionId);
          setIsInitialized(true);
          
          // ✅ DÉLAI PLUS LONG pour éviter les conditions de course
          setTimeout(() => {
            const finalState = useChatStore.getState();
            
            // ✅ TRIPLE VÉRIFICATION avant d'ajouter le message
            if (finalState.messages?.length === 0 && !welcomeMessageAdded && !finalState.flags?.isInitialized) {
              const welcomeMessage: ChatMessageType = {
                type: 'assistant',
                content: `👋 Bonjour ! Je suis **Rose**, votre Assistante d'achat.

Je vois que vous vous intéressez à notre jeu **${product.name}**. C'est excellent ✨

Comment puis-je vous aider ?`,
                choices: [
                  'Je veux l\'acheter maintenant',
                  'J\'ai des questions à poser',
                  'Je veux en savoir plus'
                ],
                assistant: {
                  name: 'Rose',
                  title: 'Assistante d\'achat',
                  avatar: undefined
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
              
              console.log('📝 Adding welcome message to desktop chat');
              addMessage(welcomeMessage);
              setWelcomeMessageAdded(true);
              setGlobalInitialized(true);
              
              // ✅ MARQUER COMME INITIALISÉ dans le store
              if (store.updateFlags) {
                store.updateFlags({ isInitialized: true });
              }
              
              // ✅ MARQUER L'INITIALISATION GLOBALEMENT
              localStorage.setItem('vosc-chat-initialized', 'true');
            } else {
              console.log('⚠️ Desktop: Welcome message skipped - messages exist or already initialized');
              setWelcomeMessageAdded(true);
              setGlobalInitialized(true);
            }
          }, 800); // Délai augmenté à 800ms
        }
        
      } catch (err) {
        console.error('❌ Error initializing desktop chat:', err);
        setIsInitialized(true);
        setWelcomeMessageAdded(true);
      }
    };

    initializeChat();
  }, [product.id, storeId, welcomeMessageAdded, globalInitialized, sessionManager, initializeSession, addMessage, store]);

  // ✅ SURVEILLANCE DES CHANGEMENTS D'ÉTAT GLOBAL
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vosc-chat-initialized' && e.newValue === 'true') {
        console.log('🔄 Chat initialized by another instance');
        setGlobalInitialized(true);
        setIsInitialized(true);
        setWelcomeMessageAdded(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ Auto-scroll optimisé
  useEffect(() => {
    if (chatRef.current) {
      const scrollToBottom = () => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, showTyping]);

  // ✅ GESTION DES MESSAGES STANDARDS avec données dynamiques
  const handleStandardMessages = async (content: string): Promise<ChatMessageType> => {
    if (content.includes('J\'ai des questions à poser') || content.includes('questions')) {
      return {
        type: 'assistant',
        content: `Parfait ! Posez-moi toutes vos questions sur le jeu **${product.name}**.

Je peux vous expliquer :
* Comment y jouer
* Pour qui ce jeu est adapté
* Les bénéfices que vous pouvez en tirer
* Ce qu'en disent nos clients

Que voulez-vous savoir ?`,
        choices: [
          'Comment y jouer ?',
          'C\'est pour qui ?',
          'Quels sont les bénéfices ?',
          'Quels sont les avis clients ?'
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

    // ✅ Gestion "Comment y jouer ?"
    if (content.includes('Comment y jouer') || content.includes('comment jouer')) {
      const gameRules = await getProductInfoFromDatabase('usage');
      return {
        type: 'assistant',
        content: `🎯 **Comment jouer à ${product.name} ?**

${gameRules}

Avez-vous d'autres questions ou souhaitez-vous passer commande ?`,
        choices: [
          'Je veux l\'acheter maintenant',
          'C\'est pour qui ?',
          'Quels sont les bénéfices ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'post_rules_engagement' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Gestion "C'est pour qui ?"
    if (content.includes('C\'est pour qui') || content.includes('pour qui')) {
      const targetInfo = await getProductInfoFromDatabase('target');
      return {
        type: 'assistant',
        content: `👥 **Pour qui est fait ${product.name} ?**

${targetInfo}

Ce jeu vous intéresse-t-il pour votre situation ?`,
        choices: [
          'Oui, parfait pour moi !',
          'Je veux l\'acheter maintenant',
          'Quels sont les bénéfices ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'target_audience_shown' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Gestion "Quels sont les bénéfices ?"
    if (content.includes('bénéfices') || content.includes('avantages')) {
      const benefits = await getProductInfoFromDatabase('benefits');
      return {
        type: 'assistant',
        content: `💝 **Les bénéfices de ${product.name} :**

${benefits}

Ces bénéfices vous motivent-ils à essayer le jeu ?`,
        choices: [
          'Oui, je le veux !',
          'Je veux l\'acheter maintenant',
          'Quels sont les avis clients ?'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'benefits_shown' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Gestion "Avis clients"
    if (content.includes('avis') || content.includes('témoignages')) {
      const testimonials = await getProductInfoFromDatabase('testimonials');
      return {
        type: 'assistant',
        content: `⭐ **Ce que disent nos clients sur ${product.name} :**

${testimonials}

Prêt(e) à rejoindre nos clients satisfaits ?`,
        choices: [
          'Je veux l\'acheter maintenant',
          'J\'ai d\'autres questions',
          'Je veux en savoir plus'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'social_proof_shown' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // ✅ Gestion "Je veux en savoir plus"
    if (content.includes('en savoir plus') || content.includes('savoir plus')) {
      const description = await getProductInfoFromDatabase('description');
      return {
        type: 'assistant',
        content: `💡 **Tout savoir sur ${product.name} :**

${description}

Que souhaitez-vous faire maintenant ?`,
        choices: [
          'Je veux l\'acheter maintenant',
          'Comment y jouer ?',
          'J\'ai des questions'
        ],
        assistant: {
          name: 'Rose',
          title: 'Assistante d\'achat'
        },
        metadata: {
          nextStep: 'product_info_shown' as ConversationStep
        },
        timestamp: new Date().toISOString()
      };
    }

    // Réponse par défaut
    return {
      type: 'assistant',
      content: `Merci pour votre message ! Comment puis-je vous aider davantage avec le jeu **${product.name}** ?`,
      choices: [
        'Je veux l\'acheter maintenant',
        'J\'ai des questions à poser',
        'Je veux en savoir plus'
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
  };

  // ✅ Gestion des choix avec protection
  const handleChoiceSelect = useCallback(async (choice: string) => {
    if (isProcessing) {
      console.log('⏳ Processing in progress, ignoring choice');
      return;
    }

    console.log('🔘 Desktop choice selected:', choice);
    await sendMessage(choice);
  }, [isProcessing]);

  // ✅ Gestion des événements clavier
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [inputMessage, isProcessing]);

  // ✅ CORRECTION: Soumission de formulaire avec typage fixé
  const handleSubmit = useCallback(() => {
    const content = inputMessage.trim();
  
    if (!content || isProcessing) return;
    
    console.log('📤 Submitting message:', content);
    
    setInputMessage('');
    setIsProcessing(true);
    updateTypingStatus(true);
    
    sendMessage(content)
      .catch((error) => {
        console.error('❌ Error sending message:', error);
      })
      .finally(() => {
        updateTypingStatus(false);
        setIsProcessing(false);
      });
  }, [inputMessage, isProcessing, updateTypingStatus]);

  // ✅ FONCTION PRINCIPALE: sendMessage pour desktop
  const sendMessage = async (content: string) => {
    try {
      console.log('🖥️ Processing desktop message:', { content, sessionId, isExpressMode, currentStep });
      
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

      // Petite pause pour l'animation
      await new Promise(resolve => setTimeout(resolve, 500));

      let response: ChatMessageType;
      
      // ✅ UTILISER TOUJOURS L'API POUR L'IA
      console.log('🚀 Sending to enhanced chat API...');
      
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
            sessionId: sessionId || Date.now().toString(),
            storeId: storeId || 'default'
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`API error: ${apiResponse.status}`);
        }

        const aiResponse = await apiResponse.json();
        console.log('✅ Enhanced API response:', aiResponse);

        response = {
          type: 'assistant',
          content: aiResponse.message || "Je suis là pour vous aider !",
          choices: aiResponse.choices || [],
          assistant: {
            name: 'Rose',
            title: 'Assistante d\'achat'
          },
          metadata: {
            nextStep: aiResponse.nextStep || 'generic_response',
            orderData: aiResponse.orderData,
            flags: {}
          },
          timestamp: new Date().toISOString()
        };

      } catch (apiError) {
        console.error('❌ API call failed, using fallback:', apiError);
        response = await handleStandardMessages(content);
      }
      
      // Délai pour l'animation
      setTimeout(() => {
        console.log('✅ Desktop: Response generated');
        addMessage(response);
        
        if (response.metadata?.orderData) {
          updateOrderData(response.metadata.orderData);
        }
      }, 800);

    } catch (err) {
      console.error('❌ Desktop: Error in sendMessage:', err);
      
      setTimeout(() => {
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Une erreur est survenue**

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
        };
        addMessage(errorMessage);
      }, 500);
    }
  };

  const handleClosePaymentModal = useCallback(() => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  }, [setPaymentModal]);

  // ✅ RENDU PRINCIPAL
  const chatContent = (
    <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'rounded-lg border border-gray-200 shadow-lg'}`}>
      {/* ✅ HEADER avec PROPS CORRIGÉES - CORRECTION FINALE pour old_price */}
      <div className="flex-shrink-0 border-b-2 border-gray-100">
        <ChatHeader 
          productId={product.id}
          title={product.name}
          rating={product.stats?.satisfaction || 5}
          price={product.price?.toString() || '0'}
          oldPrice={
            // ✅ CORRECTION: Gestion sécurisée de old_price qui n'existe pas dans Product
            product.price && product.price > 0 
              ? undefined // Pas d'ancien prix pour l'instant
              : undefined
          }
        />
      </div>

      {/* ✅ ZONE MESSAGES */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        style={{ maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '500px' }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message.timestamp}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChatMessage message={message} />
              
              {message.choices && message.choices.length > 0 && (
                <div className="mt-3">
                  <ChatChoices
                    choices={message.choices}
                    onChoiceSelect={handleChoiceSelect}
                    disabled={isProcessing}
                  />
                </div>
              )}
              
              {message.metadata?.showQuantitySelector && !message.metadata?.quantityHandled && (
                <div className="mt-3">
                  <QuantitySelector
                    onQuantitySelect={async (qty) => {
                      if (message.metadata) {
                        message.metadata.quantityHandled = true;
                      }
                      handleChoiceSelect(qty.toString());
                    }}
                    maxQuantity={message.metadata?.maxQuantity || 10}
                  />
                </div>
              )}
            </motion.div>
          ))}

          {(showTyping || isTyping) && (
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

      {/* ✅ ZONE SAISIE avec bordures améliorées et micro activé */}
      <div className="flex-shrink-0 border-t-2 border-gray-100 px-4 py-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Tapez votre message..."
            className="w-full px-4 py-3 bg-[#F0F2F5] text-gray-800 rounded-full pr-24 focus:outline-none focus:ring-2 focus:ring-[#FF7E93] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
            disabled={isProcessing}
            maxLength={500}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* ✅ BOUTON MICRO ACTIVÉ */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isProcessing}
              className={`p-2 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : isVoiceSupported && !isProcessing
                    ? 'text-gray-500 hover:text-[#FF7E93] hover:bg-gray-50'
                    : 'text-gray-400 cursor-not-allowed'
              }`}
              title={
                !isVoiceSupported 
                  ? 'Reconnaissance vocale non supportée' 
                  : isListening 
                    ? 'Arrêter l\'écoute'
                    : 'Reconnaissance vocale'
              }
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!inputMessage.trim() || isProcessing}
              className={`p-2 rounded-full transition-colors ${
                inputMessage.trim() && !isProcessing
                  ? 'text-[#FF7E93] hover:text-[#132D5D] hover:bg-gray-50' 
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

      {/* Modals de paiement avec toutes les props obligatoires */}
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
  );

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
      {chatContent}
    </ConversationProvider>
  );
};

export default ChatContainer;