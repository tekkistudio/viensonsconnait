// src/features/product/components/ProductChat/ChatContainer.tsx - VERSION FINALE CORRIGÉE
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { BictorysPaymentModal } from '@/components/payment/BictorysPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { ConversationProvider } from '@/hooks/useConversationContext';
import { OptimizedChatService } from '@/lib/services/OptimizedChatService';
import { WelcomeMessageService } from '@/lib/services/WelcomeMessageService';
import DynamicContentService from '@/lib/services/DynamicContentService';
import { SessionManager } from '@/lib/services/SessionManager';
import ChatMessage from './components/ChatMessage';
import ChatChoices from './components/ChatChoices';
import TypingIndicator from './components/TypingIndicator';
import ChatHeader from './components/ChatHeader';
import QuantitySelector from './components/QuantitySelector';
import type { PaymentProvider } from '@/types/order';
import type { Product } from '@/types/product';
import type { ProductData } from '@/types/chat';
import type { ChatMessage as ChatMessageType, ConversationStep } from '@/types/chat';
import { supabase } from '@/lib/supabase';
import { SpeechRecognition } from '@/types/speech';

interface ChatContainerProps {
  product: Product;
  storeId: string;
  isMobile?: boolean;
  isFullscreen?: boolean;
  onClose?: () => void;
}

// ✅ FONCTION UTILITAIRE: Convertir Product en ProductData
const convertProductToProductData = (product: Product): ProductData => {
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    status: product.status || 'active',
    stock_quantity: product.stock_quantity || 0,
    
    // Propriétés spécifiques avec vérification sécurisée
    game_rules: (product as any).game_rules || '',
    chatbot_variables: (product as any).chatbot_variables || {},
    metadata: (product as any).metadata || {},
    images: product.images || [],
    category: product.category || 'default',
    
    // Dates et métadonnées
    createdAt: (product as any).created_at || new Date().toISOString(),
    
    // Propriétés optionnelles
    target_audience: (product as any).target_audience,
    benefits: (product as any).benefits,
    rating: (product as any).rating || 5,
    reviewCount: (product as any).reviews_count || 15,
    originalPrice: (product as any).compare_at_price,
    sales_count: (product as any).sales_count,
    stats: (product as any).stats,
    testimonials: (product as any).testimonials,
    usage_scenarios: (product as any).usage_scenarios,
    slug: (product as any).slug,
    media: (product as any).media,
    topics: (product as any).topics,
    imageUrl: (product as any).imageUrl
  };
};

const ChatContainer = ({ 
  product,
  storeId,
  isMobile = false, 
  isFullscreen = false,
  onClose
}: ChatContainerProps) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomeMessageAdded, setWelcomeMessageAdded] = useState(false);
  
  // États pour la reconnaissance vocale
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // Services initialisés
  const [optimizedService] = useState(() => OptimizedChatService.getInstance());
  const [welcomeService] = useState(() => WelcomeMessageService.getInstance());
  const [dynamicContentService] = useState(() => DynamicContentService.getInstance());
  const [sessionManager] = useState(() => SessionManager.getInstance());
  
  // État global pour éviter les doublons
  const [globalInitialized, setGlobalInitialized] = useState(false);

  // CONVERSION: Product vers ProductData
  const productData = convertProductToProductData(product);

  // Utilisation sécurisée du store
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

  // État du panier dérivé de orderData
  const [cartItems, setCartItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>>([]);

  // Mettre à jour cartItems quand orderData change
  useEffect(() => {
    if (orderData.quantity && orderData.quantity > 0) {
      const newCartItems = [{
        productId: product.id,
        productName: product.name,
        quantity: orderData.quantity,
        unitPrice: product.price,
        totalPrice: orderData.quantity * product.price
      }];
      setCartItems(newCartItems);
    } else {
      setCartItems([]);
    }
  }, [orderData.quantity, product.id, product.name, product.price]);

  // INITIALISATION DE LA RECONNAISSANCE VOCALE
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

  // FONCTION RECONNAISSANCE VOCALE
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

  // INITIALISATION CORRIGÉE du chat avec message d'accueil
  useEffect(() => {
    if (!product?.id || welcomeMessageAdded || globalInitialized) return;

    const initializeChat = async () => {
      try {
        console.log('🚀 Initializing chat session:', { productId: product.id, storeId, isDesktop: !isMobile });
        
        // Vérifier si déjà des messages
        const globalState = useChatStore.getState();
        const currentMessages = globalState.messages || [];
        
        if (currentMessages.length > 0 || globalState.flags?.isInitialized) {
          console.log('📝 Chat already has messages or is initialized, skipping');
          setIsInitialized(true);
          setWelcomeMessageAdded(true);
          setGlobalInitialized(true);
          return;
        }

        // Créer session
        const newSessionId = await sessionManager.getOrCreateSession(product.id, storeId);
        console.log('🆕 Session created:', newSessionId);

        if (initializeSession) {
          initializeSession(product.id, storeId, newSessionId);
          setIsInitialized(true);
          
          // Délai pour éviter les conditions de course
          setTimeout(() => {
            const finalState = useChatStore.getState();
            
            if (finalState.messages?.length === 0 && !welcomeMessageAdded && !finalState.flags?.isInitialized) {
              // UTILISER LE SERVICE DE MESSAGE D'ACCUEIL
              const welcomeMessage = !isMobile 
                ? welcomeService.generateDesktopWelcomeMessage(
                    product.name,
                    newSessionId,
                    product.id,
                    product.price,
                    productData.reviewCount
                  )
                : welcomeService.generateWelcomeMessage(
                    product.name,
                    newSessionId,
                    product.id
                  );
              
              console.log('📝 Adding welcome message to chat');
              addMessage(welcomeMessage);
              setWelcomeMessageAdded(true);
              setGlobalInitialized(true);
              
              if (store.updateFlags) {
                store.updateFlags({ isInitialized: true });
              }
              
              localStorage.setItem('vosc-chat-initialized', 'true');
            } else {
              console.log('⚠️ Welcome message skipped - messages exist or already initialized');
              setWelcomeMessageAdded(true);
              setGlobalInitialized(true);
            }
          }, 800);
        }
        
      } catch (err) {
        console.error('❌ Error initializing chat:', err);
        setIsInitialized(true);
        setWelcomeMessageAdded(true);
      }
    };

    initializeChat();
  }, [product.id, storeId, welcomeMessageAdded, globalInitialized, isMobile, sessionManager, initializeSession, addMessage, store, welcomeService, productData.reviewCount]);

  // Auto-scroll optimisé
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

  // GESTION DES MESSAGES avec le service optimisé
  const sendMessage = async (content: string) => {
    try {
      console.log('📤 Processing message:', { content, sessionId, currentStep });
      
      // Ajouter le message utilisateur
      const userMessage: ChatMessageType = {
        type: 'user',
        content,
        timestamp: new Date().toISOString()
      };
      
      addMessage(userMessage);
      await new Promise(resolve => setTimeout(resolve, 500));

      let response: ChatMessageType;
      
      // VÉRIFIER SI C'EST UNE RÉPONSE AU MESSAGE D'ACCUEIL
      if (welcomeService.isWelcomeResponse(content)) {
        console.log('🌹 Handling welcome response');
        response = welcomeService.handleWelcomeButtonResponse(
          content,
          product.id,
          product.name
        );
      } else {
        // UTILISER LE SERVICE OPTIMISÉ
        console.log('⚙️ Using OptimizedChatService');
        response = await optimizedService.processMessage(
          sessionId,
          content,
          currentStep || 'initial',
          product.id,
          product.name
        );
      }

      // Délai pour l'animation
      setTimeout(() => {
        console.log('✅ Response generated');
        addMessage(response);
        
        // Mettre à jour l'état
        if (response.metadata?.nextStep) {
          store.setCurrentStep?.(response.metadata.nextStep);
        }
        
        if (response.metadata?.orderData) {
          updateOrderData(response.metadata.orderData);
        }

        // ✅ CORRECTION: Gérer les actions spéciales avec vérification de type
        if (response.metadata?.actions && typeof response.metadata.actions === 'object') {
          const actions = response.metadata.actions;
          
          // Vérifier si showPayment existe et est true
          if ('showPayment' in actions && actions.showPayment === true) {
            const paymentProvider: PaymentProvider = response.metadata.paymentProvider || 'bictorys';
            setPaymentModal({ 
              isOpen: true, 
              iframeUrl: '', 
              provider: paymentProvider // ✅ CORRECTION: Utiliser PaymentProvider typé
            });
          }
        }
      }, 800);

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
      
      setTimeout(() => {
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Une erreur est survenue**\n\nVoulez-vous réessayer ou contacter notre support ?`,
          choices: ['🔄 Réessayer', '📞 Contacter le support'],
          assistant: { name: 'Rose', title: 'Assistante d\'achat' },
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

  // GESTION DES CHOIX
  const handleChoiceSelect = useCallback(async (choice: string) => {
    if (isProcessing) {
      console.log('⏳ Processing in progress, ignoring choice');
      return;
    }

    console.log('🔘 Choice selected:', choice);
    setIsProcessing(true);
    updateTypingStatus(true);
    
    try {
      await sendMessage(choice);
    } catch (error) {
      console.error('❌ Error sending choice:', error);
    } finally {
      updateTypingStatus(false);
      setIsProcessing(false);
    }
  }, [isProcessing, updateTypingStatus]);

  // GESTION ÉVÉNEMENTS CLAVIER
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [inputMessage, isProcessing]);

  // SOUMISSION DE FORMULAIRE
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

  // GESTION FERMETURE MODAL PAIEMENT
  const handleClosePaymentModal = useCallback(() => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  }, [setPaymentModal]);

  // GESTION PANIER
  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    updateOrderData({ quantity: newQuantity });
  }, [updateOrderData]);

  const handleProceedToCheckout = useCallback(() => {
    sendMessage('Je veux finaliser ma commande');
  }, []);

  // FONCTION onClose par défaut
  const handleClose = onClose || (() => {
    console.log('Close chat requested');
  });

  // RENDU PRINCIPAL
  const chatContent = (
    <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'rounded-lg border border-gray-200 shadow-lg'}`}>
      {/* HEADER AVEC NOUVEAU FORMAT */}
      <div className="flex-shrink-0">
        <ChatHeader
          product={productData}
          onClose={handleClose}
          isDesktop={!isMobile}
          cartItems={cartItems}
          showCart={cartItems.length > 0}
          onQuantityChange={handleQuantityChange}
          onProceedToCheckout={handleProceedToCheckout}
        />
      </div>

      {/* ZONE MESSAGES */}
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

      {/* ZONE SAISIE avec reconnaissance vocale */}
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
            {/* BOUTON MICRO */}
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
            
            {/* BOUTON ENVOYER */}
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

      {/* MODALS DE PAIEMENT */}
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