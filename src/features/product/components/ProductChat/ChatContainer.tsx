// src/features/product/components/ProductChat/ChatContainer.tsx - VERSION CORRIGÉE DESKTOP
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
  const [stripeModalData, setStripeModalData] = useState<{
    amount: number;
    orderId: string;
  } | null>(null);
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
  const [sessionManager] = useState(() => SessionManager.getInstance());
  
  // États pour éviter les doublons
  const [initializationLock, setInitializationLock] = useState(false);

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

  // ✅ INITIALISATION CORRIGÉE - HARMONISÉE AVEC MOBILE
  useEffect(() => {
    if (!product?.id || initializationLock) {
      return;
    }

    const initializeChat = async () => {
      try {
        console.log('🖥️ [DESKTOP] Starting chat initialization:', { 
          productId: product.id, 
          storeId, 
          messagesCount: messages.length
        });
        
        setInitializationLock(true);
        
        // ✅ CORRECTION: Vérifier les messages existants AVANT d'ajouter
        if (messages.length > 0) {
          console.log('📝 [DESKTOP] Messages already exist, skipping initialization');
          setIsInitialized(true);
          setWelcomeMessageAdded(true);
          return;
        }

        // ✅ Créer la session
        const newSessionId = `desktop_${product.id}_${Date.now()}`;
        console.log('🆕 [DESKTOP] Creating session:', newSessionId);

        // ✅ Initialiser le store
        if (initializeSession) {
          initializeSession(product.id, storeId, newSessionId);
          console.log('✅ [DESKTOP] Store initialized');
        }

        // ✅ AJOUTER LE MESSAGE D'ACCUEIL (desktop version SANS boutons)
        console.log('➕ [DESKTOP] Adding welcome message...');
        
        const welcomeMessage = welcomeService.generateDesktopWelcomeMessage(
          product.name,
          newSessionId,
          product.id,
          product.price,
          productData.reviewCount
        );
        
        addMessage(welcomeMessage);
        setWelcomeMessageAdded(true);
        setIsInitialized(true);
        
        console.log('✅ [DESKTOP] Welcome message added successfully');
        
        if (store.updateFlags) {
          store.updateFlags({ isInitialized: true });
        }
        
      } catch (err) {
        console.error('❌ [DESKTOP] Error initializing chat:', err);
        setIsInitialized(true);
        setWelcomeMessageAdded(true);
        setInitializationLock(false);
      }
    };

    initializeChat();
  }, [product.id, storeId, initializationLock, messages.length, welcomeService, addMessage, initializeSession, store]);

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

  // ✅ GESTION DES MESSAGES - CORRIGÉE POUR DESKTOP
  const sendMessage = useCallback(async (content: string) => {
    try {
      console.log('📤 [DESKTOP] Starting sendMessage:', {
        content: content.substring(0, 50),
        sessionId,
        currentStep,
        productId: product.id,
        productName: product.name
      });
      
      // ✅ GESTION DU MODAL STRIPE
      if (content.startsWith('STRIPE_MODAL_OPEN:')) {
        const amount = parseInt(content.split(':')[1]);
        const orderId = `STRIPE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        setStripeModalData({ amount, orderId });
        setStripeModalOpen(true);
        return;
      }
      
      // Vérifications de sécurité
      if (!product?.id || !product?.name || !sessionId) {
        throw new Error('Données manquantes pour l\'envoi du message');
      }
      
      // Ajouter le message utilisateur
      const userMessage: ChatMessageType = {
        type: 'user',
        content,
        timestamp: new Date().toISOString()
      };
      
      console.log('📝 [DESKTOP] Adding user message');
      addMessage(userMessage);
      
      // Délai pour UX
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('⚙️ [DESKTOP] Calling OptimizedChatService.processMessage');
      
      // ✅ UTILISER LE SERVICE CORRIGÉ
      const response = await optimizedService.processMessage(
        sessionId,
        content,
        currentStep || 'initial',
        product.id,
        product.name
      );
      
      console.log('✅ [DESKTOP] Response received from service');

      // Délai pour l'animation
      setTimeout(() => {
        console.log('✅ [DESKTOP] Adding response to chat');
        addMessage(response);
        
        // Mettre à jour l'état si nécessaire
        if (response.metadata?.nextStep) {
          console.log('🔄 [DESKTOP] Updating current step to:', response.metadata.nextStep);
          store.setCurrentStep?.(response.metadata.nextStep);
        }
        
        if (response.metadata?.orderData) {
          console.log('📦 [DESKTOP] Updating order data');
          updateOrderData(response.metadata.orderData);
        }
      }, 800);

    } catch (err) {
      console.error('❌ [DESKTOP] Error in sendMessage:', err);
      
      setTimeout(() => {
        const errorMessage: ChatMessageType = {
          type: 'assistant',
          content: `😔 **Une erreur s'est produite**

${err instanceof Error ? err.message : 'Erreur inconnue'}

Voulez-vous réessayer ?`,
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
  }, [sessionId, currentStep, product.id, product.name, optimizedService, addMessage, updateOrderData, store]);

  // GESTION DES CHOIX
  const handleChoiceSelect = useCallback(async (choice: string) => {
    if (isProcessing) {
      console.log('⏳ [DESKTOP] Processing in progress, ignoring choice');
      return;
    }

    console.log('🔘 [DESKTOP] Choice selected:', choice);
    setIsProcessing(true);
    updateTypingStatus(true);
    
    try {
      await sendMessage(choice);
    } catch (error) {
      console.error('❌ [DESKTOP] Error sending choice:', error);
    } finally {
      updateTypingStatus(false);
      setIsProcessing(false);
    }
  }, [isProcessing, updateTypingStatus, sendMessage]);

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
    
    console.log('📤 [DESKTOP] Submitting message:', content);
    
    setInputMessage('');
    setIsProcessing(true);
    updateTypingStatus(true);
    
    sendMessage(content)
      .catch((error) => {
        console.error('❌ [DESKTOP] Error sending message:', error);
      })
      .finally(() => {
        updateTypingStatus(false);
        setIsProcessing(false);
      });
  }, [inputMessage, isProcessing, updateTypingStatus, sendMessage]);

  // GESTION FERMETURE MODAL PAIEMENT
  const handleClosePaymentModal = useCallback(() => {
    setPaymentModal({ 
      isOpen: false, 
      iframeUrl: '', 
      provider: undefined 
    });
  }, [setPaymentModal]);

  // ✅ CORRECTION MAJEURE: Fonction pour détecter les boutons d'interface AMÉLIORÉE
  const shouldShowInterfaceButtons = useCallback((message: ChatMessageType, index: number): boolean => {
    // ✅ CORRECTION 1: Ne JAMAIS afficher si mobile
    if (isMobile) return false;
    
    // ✅ CORRECTION 2: Seulement pour le dernier message
    if (index !== messages.length - 1) return false;
    
    // ✅ CORRECTION 3: Seulement pour les messages assistant
    if (message.type !== 'assistant') return false;
    
    // ✅ CORRECTION 4: NE JAMAIS afficher si le message a déjà des choix
    if (message.choices && message.choices.length > 0) {
      console.log('🚫 [DESKTOP] Message has choices, NOT showing interface buttons');
      return false;
    }
    
    // ✅ CORRECTION 5: Seulement pour les messages d'accueil spécifiques SANS choix
    const isDesktopWelcome = Boolean(
      message.metadata?.flags?.isWelcome && 
      message.metadata?.flags?.desktopMode &&
      (!message.choices || message.choices.length === 0)
    );
    
    console.log('🔍 [DESKTOP] Interface buttons check:', {
      isWelcome: Boolean(message.metadata?.flags?.isWelcome),
      isDesktop: Boolean(message.metadata?.flags?.desktopMode),
      hasChoices: !!(message.choices && message.choices.length > 0),
      shouldShow: isDesktopWelcome
    });
    
    return isDesktopWelcome;
  }, [isMobile, messages.length]);

  // ✅ RENDU CONDITIONNEL pour éviter l'affichage prématuré
  if (!isInitialized && !initializationLock) {
    return (
      <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'rounded-lg border border-gray-200 shadow-lg'}`}>
        <div className="flex-shrink-0">
          <ChatHeader
            product={productData}
            isDesktop={!isMobile}
            cartItems={cartItems}
            showCart={cartItems.length > 0}
            onClose={onClose}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7E93] mx-auto mb-4" />
            <p className="text-gray-600">Initialisation du chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ RENDU PRINCIPAL AVEC BOUTONS D'INTERFACE DESKTOP CORRIGÉS
  const chatContent = (
    <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'rounded-lg border border-gray-200 shadow-lg'}`}>
      {/* HEADER */}
      <div className="flex-shrink-0">
        <ChatHeader
          product={productData}
          isDesktop={!isMobile}
          cartItems={cartItems}
          showCart={cartItems.length > 0}
          onClose={onClose}
        />
      </div>

      {/* ZONE MESSAGES */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        style={{ maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '500px' }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            // ✅ CORRECTION MAJEURE: Logique d'affichage des boutons CORRIGÉE
            const showInterfaceButtons = shouldShowInterfaceButtons(message, index);
            
            return (
              <motion.div
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ChatMessage 
                  message={message} 
                  onChoiceSelect={handleChoiceSelect}
                />
                
                {/* ✅ CORRECTION: Afficher les choix SEULEMENT si pas de boutons d'interface */}
                {message.choices && message.choices.length > 0 && !showInterfaceButtons && (
                  <div className="mt-3">
                    <ChatChoices
                      choices={message.choices}
                      onChoiceSelect={handleChoiceSelect}
                      disabled={isProcessing}
                    />
                  </div>
                )}
                
                {/* Sélecteur de quantité */}
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

                {/* ✅ CORRECTION MAJEURE: BOUTONS D'INTERFACE DESKTOP - AFFICHAGE CONDITIONNEL STRICT */}
                {showInterfaceButtons && (
                  <div className="mt-4 space-y-3">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 gap-3"
                    >
                      <button
                        onClick={() => handleChoiceSelect('Je veux l\'acheter maintenant')}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-gradient-to-r from-[#FF7E93] to-[#FF6B9D] text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Je veux l'acheter maintenant
                      </button>
                      
                      <button
                        onClick={() => handleChoiceSelect('J\'ai des questions à poser')}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 border-2 border-[#FF7E93] text-[#FF7E93] font-medium rounded-lg hover:bg-[#FF7E93] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        J'ai des questions à poser
                      </button>
                      
                      <button
                        onClick={() => handleChoiceSelect('Je veux en savoir plus')}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Je veux en savoir plus
                      </button>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            );
          })}

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
      
      {/* ✅ Modal Stripe intégré */}
      <StripePaymentModal
        isOpen={stripeModalOpen}
        onClose={() => {
          setStripeModalOpen(false);
          setStripeModalData(null);
        }}
        amount={stripeModalData?.amount}
        orderId={stripeModalData?.orderId}
        currency="fcfa"
        onSuccess={(paymentIntentId) => {
          console.log('✅ Stripe payment successful:', paymentIntentId);
          setStripeModalOpen(false);
          setStripeModalData(null);
        }}
        onError={(error) => {
          console.error('❌ Stripe payment error:', error);
        }}
      />
      
      {/* Legacy Stripe modal pour compatibilité */}
      {payment?.status === 'processing' && payment?.clientSecret && (
        <StripePaymentModal
          isOpen={true}
          onClose={() => setPaymentModal({ isOpen: false, iframeUrl: '', provider: undefined })}
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